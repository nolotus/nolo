import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { DataType } from "create/types";
import {
  toSafeAgentSummary,
  sortSafeAgentSummaries,
  toCompactAgentSummary,
  toUnavailableAgentSummary,
  omitNullishAgentSummaryFields,
  type SafeAgentSummary,
} from "../agent/safeAgentSummary";
import {
  buildAgentDiscoveryResult,
  resolveDiscoveryScope,
  type DiscoveryScope,
} from "../agent/agentDiscovery";
import { fetchPublicAgentsForDiscovery } from "../agent/publicAgentDiscovery";
import { isAgentUnavailableNow } from "../agent/agentAvailabilityShared";
import { createSpaceKey } from "create/space/spaceKeys";
import { toErrorMessage } from "core/errorMessage";
import {
  DRAIN_EXHAUSTED_USER_MESSAGE,
  isDrainExhaustedResponse,
} from "core/drainReason";
import { fetchWithTransientRetry } from "core/fetchWithTransientRetry";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";
import { redactAgentRecordForWorkspaceTool } from "../../agent-runtime/runtimeToolSurface";
import { buildAgentRuntimeAgentLookupKeys } from "../../agent-runtime/agentRecordKeys";
import {
  clampNoloPositiveInteger,
  buildNoloSubjectRefQueryTarget,
  filterNoloDialogSubjectRefEvidence,
  getNoloComparableUpdatedAt,
  getNoloDialogIdFromKey,
  NOLO_WORKSPACE_TOOL_NAMES,
  normalizeNoloExcludeDialogIds,
  normalizeNoloSpaceInput,
  resolveNoloDialogInput,
  verifyNoloDialogSubjectRefQuery,
} from "../../agent-runtime/noloWorkspaceTools";
import {
  buildDeleteDialogsPreview,
  filterDialogDeletionCandidates,
  resolveConfirmedDialogDeletionTargets,
  type DeleteDialogsMatchMode,
} from "./deleteDialogsToolModel";

type ToolResult = {
  rawData: unknown;
  displayData?: string;
};

const jsonPreview = (value: unknown, maxLength = 1800) => {
  const text = JSON.stringify(value, null, 2);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...(truncated)`;
};

const getRuntime = (thunkApi: any) => {
  const state = thunkApi?.getState?.();
  return state ? selectRuntimeSnapshot(state) : null;
};

const authHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};

/**
 * drain 长预算耗尽的显式错误。读 helpers 的兜底 catch（`() => null` /
 * `() => []` / `catch { return {} }`）必须放行它：耗尽意味着「服务正在重启」，
 * 吞成 not found / 空结果会把基础设施故障伪装成业务事实，误导 agent 与用户。
 */
class DrainExhaustedError extends Error {
  constructor() {
    super(DRAIN_EXHAUSTED_USER_MESSAGE);
    this.name = "DrainExhaustedError";
  }
}

function isDrainExhaustedError(error: unknown): error is DrainExhaustedError {
  return error instanceof DrainExhaustedError;
}

/**
 * 共享重试层在 `503 core_draining` 长预算耗尽后返回 503，raw JSON body 已被
 * 替换为 `DRAIN_EXHAUSTED_USER_MESSAGE`（text/plain，经 core/drainReason 的
 * isDrainExhaustedResponse 识别，检测与产出同源不漂移）。读到耗尽响应即抛
 * 显式错误，交由调用方透传友好文案；其余 503 保持原行为（静默 null/空）。
 */
async function throwIfDrainExhausted(response: Response): Promise<void> {
  if (await isDrainExhaustedResponse(response)) {
    throw new DrainExhaustedError();
  }
}

async function readRemoteRecord(args: {
  serverBase?: string;
  token?: string;
  dbKey: string;
  includeDeleted?: boolean;
}) {
  const serverBase = normalizeServerOrigin(args.serverBase);
  if (!serverBase || !args.token) return null;
  const query = args.includeDeleted ? "?includeDeleted=true" : "";
  // GET 读操作，天然幂等：保持共享层默认 retryNetworkErrors: true（重放安全），
  // 部署 drain 窗口内的 503 core_draining 由此自动重试。
  const response = await fetchWithTransientRetry(
    fetch,
    `${serverBase}/api/v1/db/read/${encodeURIComponent(args.dbKey)}${query}`,
    { headers: authHeaders(args.token) } as RequestInit
  );
  if (!response.ok) {
    // drain 长预算耗尽：抛显式错误向上透传友好文案，绝不能落到下面的
    // `return null`——否则 readAgent/readSpace/readSkillDoc 会把「服务正在
    // 重启」报成误导性的「not found」。其余 503 维持旧行为。
    await throwIfDrainExhausted(response);
    return null;
  }
  const payload = await response.json().catch(() => null);
  return payload?.data ?? payload;
}

async function queryRemoteUserRecords(args: {
  serverBase?: string;
  token?: string;
  userId?: string;
  type: string | string[];
  limit: number;
  subjectRef?: object;
}) {
  const serverBase = normalizeServerOrigin(args.serverBase);
  if (!serverBase || !args.token || !args.userId) return [];
  // 读操作：/api/v1/db/query 虽是 POST，但语义为按条件查询记录，无副作用，
  // 重放安全 → 保持共享层默认 retryNetworkErrors: true。
  const response = await fetchWithTransientRetry(
    fetch,
    `${serverBase}/api/v1/db/query/${encodeURIComponent(args.userId)}?limit=${args.limit}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(args.token),
      },
      body: JSON.stringify({
        type: args.type,
        ...(args.subjectRef ? { subjectRef: args.subjectRef } : {}),
      }),
    } as RequestInit
  );
  if (!response.ok) {
    // drain 长预算耗尽：抛显式错误而不是吞成空列表（同 readRemoteRecord）。
    await throwIfDrainExhausted(response);
    return [];
  }
  const payload = await response.json().catch(() => null);
  return Array.isArray(payload?.data?.data)
    ? payload.data.data
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

async function queryBestRecords(
  thunkApi: any,
  type: string | string[],
  limit: number
) {
  const runtime = getRuntime(thunkApi);
  const remoteRecords = await queryRemoteUserRecords({
    serverBase: runtime?.currentServer,
    token: runtime?.currentToken,
    userId: runtime?.currentUserId,
    type,
    limit,
  }).catch((error) => {
    // 兜底 .catch 只吞普通失败；drain 耗尽必须继续向上抛（listDialogs/listAgents
    // 不能把「服务正在重启」展示成空列表）。
    if (isDrainExhaustedError(error)) throw error;
    return [];
  });
  return remoteRecords;
}

async function readBestRecord(thunkApi: any, dbKey: string, includeDeleted = false) {
  const runtime = getRuntime(thunkApi);
  return readRemoteRecord({
    serverBase: runtime?.currentServer,
    token: runtime?.currentToken,
    dbKey,
    includeDeleted,
  }).catch((error) => {
    // 兜底 .catch 只吞普通失败；drain 耗尽必须继续向上抛（见 DrainExhaustedError）。
    if (isDrainExhaustedError(error)) throw error;
    return null;
  });
}

export const listDialogsFunctionSchema = {
  name: "listDialogs",
  description: "List the current user's Nolo dialogs. Use before readDialog when the target dialog is unclear.",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "Maximum dialogs to return. Default 100, max 500." },
      space: { type: "string", description: "Optional space id or URL." },
      includeScheduled: { type: "boolean", description: "Include scheduled/background run dialogs." },
    },
  },
} as const;

export async function listDialogsFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const limit = clampNoloPositiveInteger(args?.limit, 100, 500);
  const includeScheduled = args?.includeScheduled === true;
  const records = await queryBestRecords(thunkApi, DataType.DIALOG, limit * 3);
  const dialogs = records
    .filter((record: any) =>
      includeScheduled
        ? true
        : record?.triggerType !== "scheduled_run" &&
          record?.triggerType !== "automation_run" &&
          !record?.parentTaskKey &&
          !record?.parentAutomationKey
    )
    .sort((left: any, right: any) => getNoloComparableUpdatedAt(right) - getNoloComparableUpdatedAt(left))
    .slice(0, limit)
    .map((record: any) => ({
      id: typeof record?.id === "string" ? record.id : getNoloDialogIdFromKey(String(record?.dbKey ?? "")),
      dbKey: record?.dbKey ?? null,
      title: record?.title ?? record?.taskLabel ?? "(untitled)",
      status: record?.status ?? null,
      updatedAt: record?.updatedAt ?? record?.updated_at ?? null,
      createdAt: record?.createdAt ?? record?.created ?? null,
      spaceId: record?.spaceId ?? null,
      triggerType: record?.triggerType ?? null,
      primaryAgentKey: record?.primaryAgentKey ?? null,
    }));
  return {
    rawData: { success: true, total: dialogs.length, dialogs },
    displayData: jsonPreview({ total: dialogs.length, dialogs }),
  };
}

export const readDialogFunctionSchema = {
  name: "readDialog",
  description: [
    "Read one persisted Nolo dialog, including metadata and recent messages.",
    "Prefer the full dialog dbKey (dialog-<userId>-<id>) or a dialog URL; a bare id only resolves for the currently logged-in user and cannot reliably read other users' or cross-server dialogs. Use listDialogs first when the target dialog is unclear.",
    "If a read fails, first confirm the dbKey via listDialogs; the returned meta includes runtime checkpoint/status info for agent-run dialogs; a local run's dialog lives in the local environment/local server and must be read there.",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      dialog: {
        type: "string",
        description:
          "Dialog dbKey (dialog-<userId>-<id>), dialog URL, or bare id (current user only).",
      },
      limit: { type: "integer", description: "Message limit. Default 120, max 1000." },
    },
    required: ["dialog"],
  },
} as const;

export const queryDialogsBySubjectRefFunctionSchema = {
  name: "queryDialogsBySubjectRef",
  description:
    "Query persisted Nolo dialog evidence by generic dialog.subjectRefs. Read-only; use readDialog for full message traces.",
  parameters: {
    type: "object",
    properties: {
      rowDbKey: { type: "string", description: "Convenience target for a table-row task subject ref." },
      subjectKind: { type: "string", description: "Generic subject ref kind, such as table-row, page, file, commit, or artifact." },
      subjectId: { type: "string", description: "Generic subject ref id." },
      subjectRole: { type: "string", description: "Optional subject ref role." },
      limit: { type: "integer", description: "Maximum matching dialog summaries to return. Default 20, max 100." },
      status: { type: "string", description: "Optional dialog status filter." },
      checkpointStatus: { type: "string", description: "Optional runtimeCheckpoint.status filter." },
      hasArtifacts: { type: "boolean", description: "When true, only return dialogs with artifacts." },
      excludeDialogId: { type: "string", description: "Optional dialog id or dbKey to exclude from evidence results, typically the current caller dialog." },
    },
  },
} as const;

export const deleteDialogsFunctionSchema = {
  name: "deleteDialogs",
  description: [
    "Find and delete the current user's Nolo dialogs by title, id, or dbKey.",
    "Dangerous operation: first preview matching dialogs and wait for user confirmation, then delete.",
    "Only dialogs owned by the current user are deletable. The current running dialog is skipped by default.",
  ].join("\n"),
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Dialog title/id/dbKey search text, for example 中医评测 or a dialog id.",
      },
      matchMode: {
        type: "string",
        enum: ["contains", "exact", "prefix", "dialogId"],
        description:
          "Matching mode. contains=title/id/dbKey contains query, exact=exact title/id/dbKey, prefix=title/id prefix, dialogId=exact dialog id/dbKey. Default contains.",
        default: "contains",
      },
      confirmedDialogIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Dialog IDs or dbKeys supplied by the UI confirmation step. The tool will not delete anything unless these IDs are present.",
      },
    },
    required: ["query"],
  },
} as const;

export async function queryDialogsBySubjectRefFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const target = buildNoloSubjectRefQueryTarget(args ?? {});
  if (!target) throw new Error("queryDialogsBySubjectRef requires rowDbKey or subjectKind plus subjectId.");
  const queryLimit = clampNoloPositiveInteger(args?.queryLimit, 500, 500);
  const outputLimit = clampNoloPositiveInteger(args?.limit, 20, 100);
  const dialogs = await queryRemoteUserRecords({
    serverBase: runtime?.currentServer,
    token: runtime?.currentToken,
    userId: runtime?.currentUserId,
    type: DataType.DIALOG,
    limit: queryLimit,
    subjectRef: target,
  });
  const status = asOptionalTrimmedString(args?.status) ?? null;
  const checkpointStatus = asOptionalTrimmedString(args?.checkpointStatus) ?? null;
  const hasArtifacts = typeof args?.hasArtifacts === "boolean" ? args.hasArtifacts : null;
  const excludeDialogIds = normalizeNoloExcludeDialogIds([
    args?.excludeDialogId,
    args?.excludeDialog,
    ...(Array.isArray(args?.excludeDialogIds) ? args.excludeDialogIds : []),
  ]);
  const result = {
    success: true,
    source: "db.query.subjectRef",
    readOnly: true,
    target,
    ...(excludeDialogIds.length ? { excludedDialogIds: excludeDialogIds } : {}),
    strict: verifyNoloDialogSubjectRefQuery(dialogs, target, { excludeDialogIds }),
    total: 0,
    dialogs: filterNoloDialogSubjectRefEvidence({
      dialogs,
      target,
      limit: outputLimit,
      status,
      checkpointStatus,
      hasArtifacts,
      excludeDialogIds,
    }),
  };
  result.total = result.dialogs.length;
  return {
    rawData: result,
    displayData: jsonPreview(result),
  };
}

export async function readDialogFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const userId = runtime?.currentUserId;
  if (!userId) throw new Error("readDialog requires a signed-in user.");
  const rawDialog =
    asTrimmedString(args?.dialog) ||
    asTrimmedString(args?.dialogId) ||
    asTrimmedString(args?.id);
  if (!rawDialog) throw new Error("readDialog requires dialog.");
  const resolved = resolveNoloDialogInput(rawDialog, userId);
  const limit = clampNoloPositiveInteger(args?.limit, 120, 1000);
  const meta = await readBestRecord(thunkApi, resolved.dbKey, true);

  let messages: any[] = [];
  const serverBase = normalizeServerOrigin(runtime?.currentServer);
  if (serverBase && runtime?.currentToken) {
    // 读操作：/rpc/getConvMsgs 虽是 POST，但语义为查询历史消息，无副作用，
    // 重放安全 → 保持共享层默认 retryNetworkErrors: true。
    const response = await fetchWithTransientRetry(fetch, `${serverBase}/rpc/getConvMsgs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(runtime.currentToken),
      },
      body: JSON.stringify({ dialogId: resolved.dialogId, limit }),
    } as RequestInit).catch(() => null);
    if (response?.ok) {
      const payload = await response.json().catch(() => []);
      messages = Array.isArray(payload) ? payload : [];
    } else if (response) {
      // drain 长预算耗尽：把共享层注入的友好文案透传为显式错误，不让读失败
      // 伪装成「0 条消息」；其余 503 维持旧行为（静默空消息）。
      await throwIfDrainExhausted(response);
    }
  }

  return {
    rawData: {
      success: true,
      dialogKey: resolved.dbKey,
      dialogId: resolved.dialogId,
      meta,
      messages,
    },
    displayData: jsonPreview({
      dialogKey: resolved.dbKey,
      title: meta?.title,
      messageCount: messages.length,
      messages,
    }),
  };
}

const formatDeleteDialogsPreview = (preview: ReturnType<typeof buildDeleteDialogsPreview>) => {
  if (preview.deletable.length === 0 && preview.skipped.length === 0) {
    return "没有找到匹配的对话。";
  }
  const lines = [
    `找到 ${preview.deletable.length} 个可删除对话，${preview.skipped.length} 个跳过。`,
    "",
  ];
  if (preview.deletable.length > 0) {
    lines.push("是否删除这些对话？");
    for (const item of preview.deletable) {
      lines.push(`- ${item.title} (${item.dialogId})`);
    }
    lines.push("");
    lines.push("需要确认后才会删除。");
  }
  if (preview.skipped.length > 0) {
    lines.push("跳过：");
    for (const item of preview.skipped) {
      lines.push(`- ${item.title || item.dialogId || item.dbKey}：${item.reason}`);
    }
  }
  return lines.join("\n");
};

const loadDeleteDialogsPreview = async (args: any, thunkApi: any) => {
  const runtime = getRuntime(thunkApi);
  const userId = runtime?.currentUserId;
  if (!userId) throw new Error("deleteDialogs requires a signed-in user.");
  const query = asTrimmedString(args?.query);
  if (!query) throw new Error("deleteDialogs requires query.");
  const records = await queryRemoteUserRecords({
    serverBase: runtime?.currentServer,
    token: runtime?.currentToken,
    userId,
    type: DataType.DIALOG,
    limit: 500,
  });
  const candidates = filterDialogDeletionCandidates(records, {
    query,
    matchMode: args?.matchMode as DeleteDialogsMatchMode | undefined,
  });
  const currentDialogId =
    asOptionalTrimmedString(args?.currentDialogId) ??
    (() => {
      const currentDialogKey = thunkApi?.getState?.()?.dialog?.currentDialogKey;
      return typeof currentDialogKey === "string"
        ? getNoloDialogIdFromKey(currentDialogKey)
        : null;
    })();
  return buildDeleteDialogsPreview({
    currentUserId: userId,
    candidates,
    currentDialogId,
  });
};

export async function deleteDialogsPreviewFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const preview = await loadDeleteDialogsPreview(args, thunkApi);
  return {
    rawData: {
      requiresConfirmation: true,
      ...preview,
    },
    displayData: formatDeleteDialogsPreview(preview),
  };
}

export async function deleteDialogsFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const preview = await loadDeleteDialogsPreview(args, thunkApi);
  const confirmedIds =
    Array.isArray(args?.confirmedDialogIds) && args.confirmedDialogIds.length > 0
      ? args.confirmedDialogIds
      : [];
  if (confirmedIds.length === 0) {
    throw new Error("deleteDialogs requires confirmedDialogIds from the preview confirmation UI.");
  }
  const { targets, missingConfirmedDialogIds } =
    resolveConfirmedDialogDeletionTargets(preview, confirmedIds);
  const deletedDialogIds: string[] = [];
  const deletedDialogKeys: string[] = [];
  const failures: Array<{ dbKey: string; detail: string }> = [];
  const { deleteDialog } = await import("chat/dialog/dialogSlice");

  for (const target of targets) {
    try {
      await thunkApi.dispatch(deleteDialog(target.dbKey)).unwrap();
    } catch (error: any) {
      failures.push({
        dbKey: target.dbKey,
        detail: toErrorMessage(error),
      });
      continue;
    }
    deletedDialogIds.push(target.dialogId);
    deletedDialogKeys.push(target.dbKey);
  }

  return {
    rawData: {
      deletedDialogIds,
      deletedDialogKeys,
      missingConfirmedDialogIds,
      skipped: preview.skipped,
      failures,
    },
    displayData:
      deletedDialogIds.length > 0
        ? `已删除 ${deletedDialogIds.length} 个对话：${deletedDialogIds.join(", ")}。`
        : "没有删除任何对话。",
  };
}

async function fetchUserFavoriteAgentMap(thunkApi: any): Promise<Record<string, number>> {
  const runtime = getRuntime(thunkApi);
  if (!runtime?.currentServer || !runtime?.currentToken) return {};

  try {
    const serverBase = normalizeServerOrigin(runtime.currentServer);
    if (!serverBase) return {};
    // 读操作：查询当前用户收藏映射，无副作用 → 保持共享层默认重试网络错误；
    // 耗尽后的 503 经 !ok 分支的 throwIfDrainExhausted 显式上抛（见 catch 放行）。
    const response = await fetchWithTransientRetry(fetch, `${serverBase}/rpc/listFavorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(runtime.currentToken),
      },
      body: JSON.stringify({ targetType: "agent" }),
    } as RequestInit).catch(() => null);
    if (!response || !response.ok) {
      // drain 长预算耗尽：抛显式错误而不是吞成空 map——空 map 会让 listAgents
      // 把「服务正在重启」展示成「没有任何收藏」。
      if (response) await throwIfDrainExhausted(response);
      return {};
    }

    const data: any = await response.json().catch(() => ({}));
    const favoritedAtByKey: Record<string, number> = {};
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const item of items) {
      const id = typeof item?.id === "string" ? item.id : "";
      if (!id) continue;
      const at = Number(item?.favoritedAt) || 0;
      favoritedAtByKey[id] = Math.max(favoritedAtByKey[id] ?? 0, at || Date.now());
    }
    const ids = Array.isArray(data?.ids) ? data.ids : [];
    for (const id of ids) {
      if (typeof id === "string" && id && !(id in favoritedAtByKey)) {
        favoritedAtByKey[id] = 1;
      }
    }
    return favoritedAtByKey;
  } catch (error) {
    // 兜底 catch 只吞普通失败；drain 耗尽必须继续向上抛。
    if (isDrainExhaustedError(error)) throw error;
    return {};
  }
}

export interface SafeAgentSummaryForCard {
  name?: string | null;
  model?: string | null;
  provider?: string | null;
  apiSource?: string | null;
  cliProvider?: string | null;
  isFavorite?: boolean;
  /** True when the agent belongs to the current user (self-owned). */
  isOwned?: boolean;
  /** Exact runnable key returned by listAgents. */
  agentKey?: string | null;
  publicKey?: string | null;
  id?: string | null;
}

export function formatAgentListCard(agents: SafeAgentSummaryForCard[], maxDisplay = 8): string {
  const total = agents.length;
  const lines: string[] = [`Agents (${total})`];
  const visible = agents.slice(0, maxDisplay);
  for (const agent of visible) {
    const star = agent.isFavorite ? "★" : " ";
    const own = agent.isOwned ? "◎" : " ";
    const name = agent.name || "(unnamed)";
    const model = agent.model || "—";
    const source = agent.apiSource || agent.provider || agent.cliProvider || "—";
    const key = agent.agentKey || "(agentKey unavailable)";
    lines.push(`${star}${own} ${name}  ${model}  ${source}  ${key}`);
  }
  if (total > maxDisplay) {
    lines.push(`… +${total - maxDisplay} more`);
  }
  return lines.join("\n");
}

export const listAgentsFunctionSchema = {
  name: "listAgents",
  description:
    "List Nolo agents available for delegation as safe summaries. By default (scope='preferred'), returns the user's preferred agents (favorites, self-owned, OAuth subscriptions, custom API, and local agents). Note: favorited public agents stay in preferred and may still consume platform credits - check each agent's billingSource before dispatching. If no suitable preferred candidate is found or the user explicitly asks to explore public/shared agents, call with scope='public' (public agents may consume platform credits). scope='all' returns the deduplicated union for troubleshooting/management. listAgents does not automatically fallback to public agents. The `agents` array carries a compact agent-selection projection per agent: runnable `agentKey` (agent-<userId>-<id> owned, agent-pub-<id> public), name, model, provider, apiSource, billingSource ('user_subscription' | 'user_api' | 'platform_credits' | 'local'), tools, isFavorite, isOAuth, isOwned, isPublic. Copy `agentKey` verbatim into startAgentRun. Rate-limited agents (429, nextAvailableAt in the future) are hidden by default; unavailableCount and unavailableAgents carry their nextAvailableAt recovery timestamps; pass `showUnavailable: true` to include them. Set `verbose: true` for full safe summary details.",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "Maximum agents to return. Default 100, max 500." },
      scope: {
        type: "string",
        enum: ["preferred", "public", "all"],
        description:
          "Discovery scope. 'preferred' (default): user's favorites, owned, OAuth, custom API, and local agents. 'public': shared/marketplace agents not in preferred (may use platform credits). 'all': deduplicated union for inspection.",
      },
      publicOnly: { type: "boolean", description: "Deprecated compatibility alias for scope='public'." },
      showUnavailable: { type: "boolean", description: "Include agents currently rate-limited (429). Default false." },
      verbose: { type: "boolean", description: "Return the full safe-summary field set (prices, introduction, modelAbility, timestamps) for troubleshooting. Default false returns the compact agent-selection projection." },
    },
  },
} as const;

export async function listAgentsFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const limit = clampNoloPositiveInteger(args?.limit, 100, 500);
  const userRecords = await queryBestRecords(thunkApi, DataType.AGENT, limit);
  const favoritesMap = await fetchUserFavoriteAgentMap(thunkApi);
  const runtime = getRuntime(thunkApi);
  const scope = resolveDiscoveryScope({ scope: args?.scope, publicOnly: args?.publicOnly });
  const publicRecords = scope === "preferred"
    ? []
    : await fetchPublicAgentsForDiscovery({
        serverBase: runtime?.currentServer ?? "",
        token: runtime?.currentToken,
        limit,
      });

  const recordsMap = new Map<string, any>();
  for (const record of userRecords) {
    const key = record?.dbKey || record?.id || record?.publicKey;
    if (key) recordsMap.set(key, record);
  }

  for (const favKey of Object.keys(favoritesMap)) {
    const isAlreadyPresent = Array.from(recordsMap.values()).some((record) =>
      record?.dbKey === favKey ||
      record?.id === favKey ||
      record?.publicKey === favKey ||
      `agent-pub-${record?.id}` === favKey
    );
    if (!isAlreadyPresent) {
      const favRecord = await readBestRecord(thunkApi, favKey).catch((error) => {
        // 收藏富化读失败可容忍，但 drain 耗尽必须向上抛（同 readBestRecord）。
        if (isDrainExhaustedError(error)) throw error;
        return null;
      });
      if (favRecord) {
        // 收藏水化读成功 = favKey 真实可解析的直接证明（与 server 端
        // noloWorkspaceServerTools 的 readDbRecord 路径同一证明标准）。把这份
        // 证明传导给 toSafeAgentSummary：直接钉住这个已验证的 key 本身，不依赖
        // record.id 重新派生；绝不从 isPublic 推导未经验证的 key——那会破坏
        // 「isPublic 标志 ≠ public record 存在证明」的既有 invariant。
        if (favKey.startsWith("agent-pub-")) {
          favRecord.publicRecordExists = true;
          favRecord.publicKey = favKey;
        }
        const key = favRecord?.dbKey || favRecord?.id || favKey;
        recordsMap.set(key, favRecord);
      }
    }
  }

  const userId = runtime?.currentUserId ?? undefined;
  // NOTE: We intentionally do NOT pass publicRecordExists for plain records.
  // record.isPublic is a flag on the private record; it does NOT prove the
  // agent-pub-<id> record actually exists (real data has isPublic=true with no
  // readable public record). The ONE exception is the favorite hydration read
  // above: a successful readBestRecord(favKey) is direct existence proof, and
  // that verified favKey is pinned as publicKey there. Per the safe-summary
  // contract: omit publicKey rather than emit one that cannot resolve. Explicit
  // record.publicKey (if present) is still trusted by toSafeAgentSummary.
  const agents = [...Array.from(recordsMap.values()), ...publicRecords].map((record) =>
    toSafeAgentSummary(record, {
      favoritesMap,
      userId,
      publicRecordExists: publicRecords.includes(record) ? true : undefined,
    })
  );

  const discovery = buildAgentDiscoveryResult({
    agents,
    scope: args?.scope,
    publicOnly: args?.publicOnly,
    showUnavailable: args?.showUnavailable,
    verbose: args?.verbose,
  });

  return {
    rawData: {
      success: true,
      total: discovery.total,
      unavailableCount: discovery.unavailableCount,
      unavailableAgents: discovery.unavailableAgents,
      agents: discovery.agents,
    },
    displayData: formatAgentListCard(discovery.agents as any),
  };
}

export const readAgentFunctionSchema = {
  name: "readAgent",
  description:
    "Read one agent's full config from the Nolo workspace. Pass the exact agentKey from listAgents (agent-<userId>-<id> for owned agents or agent-pub-<id> for public agents); do not pass the display name shown in the compact list. A plain id or agent URL is also accepted when needed. Returns the resolved runnable agentKey and a redacted record with model, provider, apiSource, tools, prompt, prices, and isPublic.",
  parameters: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        description: "Exact agentKey from listAgents (preferred; copy verbatim), agent id, or agent URL. Do not use the display name.",
      },
    },
    required: ["agent"],
  },
} as const;

export async function readAgentFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const userId = runtime?.currentUserId;
  if (!userId) throw new Error("readAgent requires a signed-in user.");
  const rawAgent =
    asTrimmedString(args?.agent) ||
    asTrimmedString(args?.agentKey) ||
    asTrimmedString(args?.id);
  if (!rawAgent) throw new Error("readAgent requires agent.");
  const raw = rawAgent.startsWith("http://") || rawAgent.startsWith("https://")
    ? new URL(rawAgent).pathname.split("/").filter(Boolean).at(-1) ?? rawAgent
    : rawAgent;
  const candidates = buildAgentRuntimeAgentLookupKeys({ agentRef: raw, userId });
  for (const candidate of candidates) {
    const record = await readBestRecord(thunkApi, candidate, true);
    if (record) {
      return {
        rawData: {
          success: true,
          agentKey: candidate,
          record: redactAgentRecordForWorkspaceTool(record),
        },
        displayData: jsonPreview({
          agentKey: candidate,
          record: redactAgentRecordForWorkspaceTool(record),
        }),
      };
    }
  }
  throw new Error(`readAgent not found: ${rawAgent}`);
}

export const listSpacesFunctionSchema = {
  name: "listSpaces",
  description: "List joined Nolo spaces.",
  parameters: {
    type: "object",
    properties: {},
  },
} as const;

export async function listSpacesFunc(_args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const serverBase = normalizeServerOrigin(runtime?.currentServer);
  if (serverBase && runtime?.currentToken && runtime?.currentUserId) {
    // 读操作：查询当前用户加入的空间列表，无副作用 → 保持共享层默认重试网络错误。
    const response = await fetchWithTransientRetry(fetch, `${serverBase}/rpc/getUserSpaceMemberships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(runtime.currentToken),
      },
      body: JSON.stringify({ userId: runtime.currentUserId }),
    } as RequestInit).catch(() => null);
    if (response?.ok) {
      const memberships = await response.json().catch(() => []);
      if (Array.isArray(memberships)) {
        const spaces = memberships.map((membership: any) => ({
          spaceId: membership?.spaceId ?? null,
          spaceKey: membership?.spaceId ? createSpaceKey.space(String(membership.spaceId)) : null,
          name: membership?.spaceName ?? membership?.name ?? membership?.spaceId ?? null,
          role: membership?.role ?? null,
          ownerId: membership?.ownerId ?? null,
          visibility: membership?.visibility ?? null,
        }));
        return {
          rawData: { success: true, total: spaces.length, spaces },
          displayData: jsonPreview({ total: spaces.length, spaces }),
        };
      }
    }
    if (response) {
      // drain 长预算耗尽：透传共享层注入的友好文案为显式错误，避免落进下方
      // 误导性的「未登录/不可达」提示；其余 503 维持旧行为。
      await throwIfDrainExhausted(response);
    }
  }
  throw new Error("listSpaces requires a signed-in user and reachable Nolo server.");
}

export const readSpaceFunctionSchema = {
  name: "readSpace",
  description: "Read one Nolo space and optionally list its contents.",
  parameters: {
    type: "object",
    properties: {
      space: { type: "string", description: "Space id or URL." },
      contentKey: { type: "string", description: "Optional content key inside the space." },
      brief: { type: "boolean", description: "Return brief content entries." },
    },
    required: ["space"],
  },
} as const;

export async function readSpaceFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const rawSpace =
    asTrimmedString(args?.space) ||
    asTrimmedString(args?.spaceId) ||
    asTrimmedString(args?.id);
  if (!rawSpace) throw new Error("readSpace requires space.");
  const spaceId = normalizeNoloSpaceInput(rawSpace);
  const spaceKey = createSpaceKey.space(spaceId);
  const space = await readBestRecord(thunkApi, spaceKey, true);
  if (!space) throw new Error(`readSpace not found: ${rawSpace}`);
  const contentKeyFilter = asTrimmedString(args?.contentKey);
  const allContents = Object.entries(space?.contents ?? {})
    .filter(([, value]) => isRecord(value))
    .map(([entryKey, value]) => ({ entryKey, ...(value as Record<string, any>) }));
  const contents = contentKeyFilter
    ? allContents.filter((item: any) => {
        const contentKey = asOptionalTrimmedString(item.contentKey) ?? item.entryKey;
        return item.entryKey === contentKeyFilter || contentKey === contentKeyFilter;
      })
    : allContents;
  const result = {
    success: true,
    spaceId,
    spaceKey,
    name: space?.name ?? null,
    description: space?.description ?? null,
    ownerId: space?.ownerId ?? null,
    visibility: space?.visibility ?? null,
    contentCount: allContents.length,
    contents: args?.brief === true
      ? contents.map((item: any) => ({
          entryKey: item.entryKey,
          contentKey: item.contentKey ?? item.entryKey,
          type: item.type ?? null,
          title: item.title ?? null,
          categoryId: item.categoryId ?? null,
        }))
      : contents,
    ...(contentKeyFilter ? { contentKeyFilter, matchedCount: contents.length } : {}),
  };
  return {
    rawData: result,
    displayData: jsonPreview(result),
  };
}

export const readSkillDocFunctionSchema = {
  name: "readSkillDoc",
  description: "Read one Nolo skill doc/page by page dbKey.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "Skill doc page dbKey, for example page-xxx." },
      doc: { type: "string", description: "Alias for id." },
    },
    required: ["id"],
  },
} as const;

export async function readSkillDocFunc(args: any, thunkApi: any): Promise<ToolResult> {
  const { buildReadDocResult } = await import("./readDocTool");
  const id = args?.id ?? args?.doc ?? args?.docKey ?? args?.pageKey;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("readSkillDoc requires id or doc.");
  }
  const page = await readBestRecord(thunkApi, id.trim(), true);
  if (!page) throw new Error(`readSkillDoc not found: ${id}`);
  const result = buildReadDocResult(page);
  return { rawData: result.rawData, displayData: result.displayData };
}

export const cliWhoamiFunctionSchema = {
  name: "cliWhoami",
  description: "Show the current Nolo runtime identity. In Web/RN this reports browser runtime identity.",
  parameters: { type: "object", properties: {} },
} as const;

export async function cliWhoamiFunc(_args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const result = {
    success: true,
    runtime: "browser",
    serverBase: runtime?.currentServer ?? null,
    userId: runtime?.currentUserId ?? null,
    authenticated: !!runtime?.currentToken,
  };
  return { rawData: result, displayData: jsonPreview(result) };
}

export const cliDoctorFunctionSchema = {
  name: "cliDoctor",
  description: "Show Nolo runtime diagnostics. In Web/RN this reports browser tool diagnostics.",
  parameters: { type: "object", properties: {} },
} as const;

export async function cliDoctorFunc(_args: any, thunkApi: any): Promise<ToolResult> {
  const runtime = getRuntime(thunkApi);
  const result = {
    success: true,
    runtime: "browser",
    serverBase: runtime?.currentServer ?? null,
    authenticated: !!runtime?.currentToken,
    userId: runtime?.currentUserId ?? null,
    diagnosticScope: "nolo_workspace_subset",
    message:
      "workspaceTools is a subset for Nolo workspace inspection, not necessarily the complete current run tool surface.",
    noloWorkspaceToolSubset: [...NOLO_WORKSPACE_TOOL_NAMES],
    workspaceTools: [...NOLO_WORKSPACE_TOOL_NAMES],
    workspaceToolsAreSubset: true,
  };
  return { rawData: result, displayData: jsonPreview(result) };
}
