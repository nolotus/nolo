import { isAbsolute, join, resolve as resolvePath } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { toErrorMessage } from "core/errorMessage";
import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeMessageContent,
  AgentRuntimeProvider,
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
  LocalAgentTurnResult,
} from "agent-runtime";
import type { LocalAgentToolEvent } from "agent-runtime/localLoop";
import {
  CHROME_CONNECTOR_TOOL_NAMES,
  type ChromeConnectorToolName,
} from "ai/tools/chromeConnectorTools";
import {
  buildLoadSkillExecutor,
  buildNoloWorkspaceCliToolExecutors,
  buildNoloWorkspaceOpenAiTools,
  createHybridRecordStore,
  executeLocalToolWithPolicy,
  filterNoloWorkspaceToolNames,
  NOLO_WORKSPACE_TOOL_NAMES,
  parseSyncServersEnv,
  resolveCurrentRunRuntimeToolPolicy,
  resolveLocalRuntimeEnvFromPolicy,
  resolveLocalWorkspaceExecutorOptionsFromPolicy,
  resolveRequestedRuntimeToolNames,
  runLocalAgentTurn,
} from "agent-runtime";
import {
  buildCodeWorkSkillPrompt,
  CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
  CODE_PLANNER_WEB_CAPABILITY_PACK_IDS,
} from "ai/skills/codePlannerSkills";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { NOLO_CLUSTER_SERVERS } from "database/config";
import { createUserKey } from "database/keys";
import {
  buildLocalWorkspaceOpenAiTools,
  buildLocalWorkspacePolicyToolNames,
  buildLocalWorkspaceToolset,
  createLocalWorkspaceToolExecutors,
} from "agent-runtime/localWorkspaceTools";
import {
  buildExternalOpenAiTools,
  buildExternalToolExecutors,
  filterExternalToolNames,
} from "agent-runtime/externalTools";
import { resolveDesktopRuntimeEntrypoint } from "agent-runtime/desktopRuntimeEntrypoint";
import type {
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import {
  createDesktopAgentRuntimeAdapter,
  createDesktopAgentRuntimeRecordStoreActions,
  createDesktopAgentRuntimeRequestScopedActions,
  resolveDesktopConfiguredProvider,
  resolveDesktopAgentRuntimeUserId,
  DESKTOP_REMOTE_REQUEST_TIMEOUT_MS,
  type DesktopAgentRuntimeActions,
  type DesktopAgentRuntimeRecordStore,
} from "./desktopAgentRuntimeAdapter";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostFacts";
import { readXPostFunc, readXPostFunctionSchema } from "ai/tools/readXPostTool";
import { readXhsProfileFunc, readXhsProfileFunctionSchema } from "ai/tools/readXhsProfileTool";
import { TOOL_PACKS, FORCED_TOOLS, applyDisabledTools, expandEnabledPacks, resolveEffectiveEnabledPacks, applySystemBuiltinSkillFilter } from "ai/tools/toolPacks";
import { resolveAgentRequiredPackIds } from "ai/tools/agentSkillConfig";
import { prepareTools } from "ai/tools/prepareTools";
import { inferCaptureIntent } from "ai/policy/runtimePolicy";
import { parseNoloWorkspaceToolArguments } from "agent-runtime/noloWorkspaceTools";

/**
 * Memory overlay is a per-turn enhancement, so it gets a much tighter budget
 * than DESKTOP_REMOTE_REQUEST_TIMEOUT_MS (which covers long provider calls).
 * The turn must not stall on a slow memory service.
 */
const DESKTOP_MEMORY_OVERLAY_TIMEOUT_MS = 5_000;
import {
  buildSpaceContextLayer,
  buildUserGlobalPromptLayer,
  buildMemoryOverlayLayer,
  buildDialogSummaryLayer,
  buildWorkspaceContextLayer,
  buildSkillDiscoveryLayer,
  buildAgentsMdLayer,
  partitionScopedBlocks,
  renderTurnContextBlocksWithScope,
  buildMemoryUseGuidanceLayer,
  spaceRecordKey,
} from "agent-runtime/turnContext";
import { discoverSkills } from "agent-runtime/skillDiscovery";
import {
  createChromeConnectorClient,
  createVerifiedChromeConnectorClient,
  executeChromeConnectorTool,
  type ChromeConnectorClient,
} from "desktop-chrome-connector/chromeConnector";
import {
  collectAgentIdentityValues,
  isQuickChatTierAgent,
  applyCodeWorkSkillPromptToTierAgentConfig,
  wrapDesktopActionsWithCodeWorkSkillPack,
  extractDesktopTurnInputText,
  isBuiltinNoloDesktopAgent,
  hasBrowserOperationIntent,
  hasNonBrowserDesktopIntent,
  narrowDesktopNoloToolsForTurn,
  addDefaultLightWebToolsForConfiguredAgents,
  resolveDesktopAgentRuntimeServerUrl,
  resolveDesktopAgentRuntimeAuthToken,
  createDesktopAgentRuntimeDialogId,
  filterDesktopServerWebToolNames,
  hasDesktopStartAgentRunTool,
  buildDesktopDelegatedAgentInput,
  withDesktopDialogId,
  buildDesktopServerWebToolBody,
  buildDesktopServerPlatformOpenAiTools,
  buildDesktopOpenAiTools,
  buildDesktopLocalWorkspaceToolset,
  buildDesktopLocalPolicyToolNames,
  filterDesktopChromeConnectorToolNames,
  buildDesktopChromeConnectorOpenAiTools,
  stripActivityMetadataFromTool,
  buildDesktopChromeConnectorPolicyToolNames,
  buildDesktopChromeConnectorToolExecutors,
  buildDesktopServerPlatformToolExecutors,
  type DesktopServerPlatformToolContext,
  type DesktopStartAgentRunChildRunner,
  type DesktopStartAgentRunWorkspaceAuthority,
  DESKTOP_SERVER_TABLE_TOOL_NAMES,
  DESKTOP_SERVER_TABLE_TOOL_NAME_SET,
  DESKTOP_SERVER_WEB_TOOL_NAMES,
  DESKTOP_SERVER_WEB_TOOL_NAME_SET,
  DESKTOP_SERVER_START_AGENT_RUN_TOOL_NAME,
  DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET,
  BUILTIN_NOLO_AGENT_ID,
} from "./desktopAgentRuntimeToolBuilders";

type DesktopAgentRuntimeBaseTurnInput = {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  agentRef: string;
  input: AgentRuntimeMessageContent;
  runtimeContext?: Record<string, any> | null;
  continueDialogId?: string;
  /**
   * Exact parent dialog dbKey from the caller (HTTP client or internal
   * startAgentRun child run). Required for dialog-record resolution: must start
   * with `dialog-` and end with `-${continueDialogId}`. Without a valid key
   * the turn runs without space/workspace context (no env re-derivation).
   */
  dialogKey?: string;
  cwd?: string;
  spaceId?: string;
  restrictShellToWorkspace?: boolean;
  /**
   * quick-chat 通用档意图提示：本轮应注入只读工作区工具。
   * 仅对三个通用档内置 agent 生效，其他 agent 忽略。
   */
  workspaceToolsHint?: boolean;
  /**
   * Request-scoped authoritative agent config from the webview (IndexedDB).
   * Prefer over empty host LevelDB for logged-out local agents. Never written
   * to host store. Must not include raw apiKey/secrets (credentialRef only).
   */
  agentConfigSnapshot?: DesktopAgentRuntimeAgentConfigSnapshot | null;
  /**
   * Optional sanitized dialog history from the client when host store has no
   * messages for logged-out local dialogs.
   */
  dialogHistorySnapshot?: DesktopAgentRuntimeDialogHistorySnapshot | null;
  now?: () => number;
  createId?: () => string;
  fetchImpl?: typeof fetch;
  /**
   * Dedicated fetch seam for the memory overlay query (`POST {server}/api/memory/query`).
   * Defaults to `fetchImpl ?? fetch`. Kept separate so tests can stub the
   * memory call without consuming provider-call sequence positions in the
   * shared `fetchImpl` mock. The host itself always passes the same fetch for
   * both; this is purely a test seam.
   */
  memoryOverlayFetchImpl?: typeof fetch;
  readXPost?: typeof readXPostFunc;
  readXhsProfile?: typeof readXhsProfileFunc;
  onTextDelta?: (chunk: string) => void;
  onToolEvent?: (event: LocalAgentToolEvent) => void;
  /**
   * 桌面端 reasoning 增量透传（Task B1）。provider 收到 reasoning 增量时回调，
   * 与 onTextDelta 同模式。service 层把它转发给 runLocalAgentTurn，handler 层
   * 据此发 SSE {type:"thinking"} 事件，并在 turn 完成时把累计 reasoning 合并进
   * result.reasoning_content 以供客户端持久化为 thinkContent。
   */
  onReasoningDelta?: (chunk: string) => void;
  /**
   * Internal lineage marker for child dialogs created by agent tools such as
   * startAgentRun. Not exposed through the public HTTP turn handler.
   */
  parentDialogId?: string;
  /**
   * Optional test seam for `startAgentRun` local child delegation. When omitted,
   * `runDesktopAgentRuntimeTurn` is used.
   */
  runChildDesktopTurn?: DesktopStartAgentRunChildRunner;
};

export type DesktopTextOnlyAgentRuntimeTurnInput = DesktopAgentRuntimeBaseTurnInput;

export type DesktopAgentRuntimeTurnInput = DesktopAgentRuntimeBaseTurnInput;

export type DesktopAgentRuntimeLevelDbLike = {
  get(key: string): Promise<unknown>;
  put?(key: string, value: unknown): Promise<unknown>;
  del?(key: string): Promise<unknown>;
  batch(
    ops: Array<
      | { type: "put"; key: string; value: Record<string, unknown> }
      | { type: "del"; key: string }
    >,
  ): Promise<unknown>;
  iterator(options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number }): AsyncIterable<[string, unknown]>;
};

type DesktopAgentRuntimeHybridRecordStoreArgs = {
  db: DesktopAgentRuntimeLevelDbLike;
  env: DesktopAgentRuntimeEnv;
  fetchImpl?: typeof fetch;
};

/**
 * Resolve the CLI entrypoint for desktop runtime tool executors.
 *
 * Uses the shared `resolveDesktopRuntimeEntrypoint()` helper which checks
 * `NOLO_DESKTOP_APP_ENTRY` first, then falls back to the CLI index path.
 */
const resolveDesktopCliEntrypoint = resolveDesktopRuntimeEntrypoint;

async function persistDesktopPendingChildDialog(args: {
  store: Pick<DesktopAgentRuntimeRecordStore, "batch">;
  userId: string;
  dialogId: string;
  agentKey: string;
  title: string;
  spaceId?: string;
  parentDialogId?: string;
  rootDialogId?: string;
  workspaceAuthority: DesktopStartAgentRunWorkspaceAuthority;
  background: boolean;
  now: number;
}) {
  const nowIso = new Date(args.now).toISOString();
  const dialogKey = `dialog-${args.userId}-${args.dialogId}`;
  const runtimeMetadata: Record<string, unknown> = {};
  if (args.workspaceAuthority.kind === "authorized") {
    runtimeMetadata.worktreePath = args.workspaceAuthority.root;
    runtimeMetadata.workspaceKind = "current";
    runtimeMetadata.workspaceAccess = "inherited";
  }
  const record: Record<string, unknown> = {
    id: args.dialogId,
    dbKey: dialogKey,
    type: "dialog",
    userId: args.userId,
    cybots: [args.agentKey],
    primaryAgentKey: args.agentKey,
    title: args.title.slice(0, 80),
    status: "pending",
    triggerType: "desktop-local",
    executionMode: args.background ? "background" : "foreground",
    createdAt: nowIso,
    updatedAt: nowIso,
    ...(args.spaceId ? { spaceId: args.spaceId } : {}),
    ...(args.parentDialogId ? { parentDialogId: args.parentDialogId } : {}),
    ...(args.rootDialogId ? { rootDialogId: args.rootDialogId } : {}),
    localRuntime: {
      host: "desktop",
      ...runtimeMetadata,
    },
  };
  if (!args.store.batch) {
    throw new Error("Desktop agent runtime record store cannot save pending child dialogs without batch support.");
  }
  await args.store.batch([{ type: "put", key: dialogKey, value: record }]);
}

async function persistDesktopFailedChildDialog(args: {
  store: DesktopAgentRuntimeRecordStore;
  userId: string;
  dialogId: string;
  errorMessage: string;
  now: number;
}) {
  const dialogKey = `dialog-${args.userId}-${args.dialogId}`;
  const existing = await args.store.read(dialogKey, { remote: false });
  const existingRecord =
    existing && typeof existing === "object"
      ? existing as Record<string, unknown>
      : {};
  if (typeof args.store.batch !== "function") {
    throw new Error("desktop record store does not support batch writes");
  }
  await args.store.batch([{
    type: "put",
    key: dialogKey,
    value: {
      ...existingRecord,
      id: args.dialogId,
      dbKey: dialogKey,
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: new Date(args.now).toISOString(),
      finishedAt: args.now,
    },
  }]);
}

function buildDesktopStartAgentRunToolExecutor(args: {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  fetchImpl: typeof fetch;
  workspaceAuthority: DesktopStartAgentRunWorkspaceAuthority;
  dialogId?: string;
  spaceId?: string;
  runtimeContext?: Record<string, any> | null;
  parentAgentRef?: string;
  now?: () => number;
  createId?: () => string;
  runChildDesktopTurn?: DesktopStartAgentRunChildRunner;
}): (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult> {
  const runChildDesktopTurn = args.runChildDesktopTurn ?? runDesktopAgentRuntimeTurn;
  const now = args.now ?? Date.now;
  const createId = args.createId ?? createDesktopAgentRuntimeDialogId;
  const userId = resolveDesktopAgentRuntimeUserId(args.env);

  return async (call: AgentRuntimeToolCallInput) => {
    const parsed = parseNoloWorkspaceToolArguments(call.arguments);
    const agentKey = asTrimmedString(parsed.agentKey);
    const task = asTrimmedString(parsed.task);

    if (!agentKey) {
      return {
        content: JSON.stringify({ error: "startAgentRun: agentKey is required" }),
        metadata: { serverPlatformTool: true, startAgentRun: true },
      };
    }
    if (!task) {
      return {
        content: JSON.stringify({ error: "startAgentRun: task is required" }),
        metadata: { serverPlatformTool: true, startAgentRun: true },
      };
    }

    const allowedChildAgentKeys = asTrimmedNonEmptyStringArray(
      args.runtimeContext?.allowedChildAgentKeys,
    );
    if (allowedChildAgentKeys.length > 0 && !allowedChildAgentKeys.includes(agentKey)) {
      return {
        content: JSON.stringify({
          error: "startAgentRun: agentKey is not allowed by parent runtimeContext.allowedChildAgentKeys",
          agentKey,
          allowedChildAgentKeys,
        }),
        metadata: { serverPlatformTool: true, startAgentRun: true },
      };
    }

    // 统一派发语义：wait:true 同步（inline_result，返回 content）；wait 缺省/
    // false 异步（background_handoff，立即返回 runId 用 controlAgentRun 观察）。
    const wait = parsed.wait === true;
    const background = !wait;
    // batchId 始终返回（未传时现铸一个），与 startAgentRun 工具契约一致。
    const effectiveBatchId =
      typeof parsed.batchId === "string" && parsed.batchId.trim()
        ? parsed.batchId.trim()
        : `batch-${new Date(now()).toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
    const parentDialogId = asOptionalTrimmedString(args.dialogId);
    const parentThreadId = parentDialogId ?? asOptionalTrimmedString(args.runtimeContext?.parentThreadId);
    const rootThreadId =
      asOptionalTrimmedString(args.runtimeContext?.rootThreadId) ??
      asOptionalTrimmedString(args.runtimeContext?.parentThreadId) ??
      parentThreadId;
    const presentationIntent = background ? "background_handoff" : "inline_result";
    const threadKind = background ? "background" : "inline";

    const childRuntimeContext = {
      ...(args.runtimeContext ?? {}),
      surface: "desktop",
      entrypoint: "agent-tool:startAgentRun",
      threadKind,
      presentationIntent,
      ...(parentThreadId ? { parentThreadId } : {}),
      ...(rootThreadId ? { rootThreadId } : {}),
      ...(args.workspaceAuthority.kind === "authorized"
        ? {
            workspaceRoot: args.workspaceAuthority.root,
            workspaceKind: "current",
            workspaceAccess: "inherited",
          }
        : {}),
    };

    if (args.workspaceAuthority.kind === "authorized") {
      const workspaceRoot = args.workspaceAuthority.root;
      const childDialogId = createId();
      await persistDesktopPendingChildDialog({
        store: args.store,
        userId,
        dialogId: childDialogId,
        agentKey,
        title: task,
        spaceId: args.spaceId,
        parentDialogId,
        rootDialogId: rootThreadId,
        workspaceAuthority: args.workspaceAuthority,
        background,
        now: now(),
      });
      const childInputBase: DesktopAgentRuntimeTurnInput = {
        env: args.env,
        store: args.store,
        agentRef: agentKey,
        input: buildDesktopDelegatedAgentInput(task, parsed.input),
        runtimeContext: childRuntimeContext,
        spaceId: args.spaceId,
        cwd: workspaceRoot,
        restrictShellToWorkspace: true,
        continueDialogId: childDialogId,
        dialogKey: `dialog-${userId}-${childDialogId}`,
        parentDialogId,
        now,
        createId,
        fetchImpl: args.fetchImpl,
      };

      if (background) {
        // Start the child run asynchronously without awaiting; the pending
        // dialog is already persisted so callers can observe progress.
        void runChildDesktopTurn(childInputBase).catch(async (error) => {
          const errorMessage = toErrorMessage(error);
          try {
            await persistDesktopFailedChildDialog({
              store: args.store,
              userId,
              dialogId: childDialogId,
              errorMessage,
              now: now(),
            });
          } catch (persistError) {
            console.warn("[desktop-runtime] failed to persist background child failure:", persistError);
          }
          console.warn("[desktop-runtime] background child run failed:", errorMessage);
        });

        return {
          content: JSON.stringify({
            success: true,
            status: "pending",
            agentKey,
            childDialogId,
            runId: childDialogId,
            batchId: effectiveBatchId,
            ...(parentDialogId ? { parentDialogId } : {}),
          }),
          metadata: { startAgentRun: true, background: true, localRuntime: true },
        };
      }

      try {
        const childResult = await runChildDesktopTurn(childInputBase);
        return {
          content: JSON.stringify({
            success: true,
            agentKey,
            dialogId: childDialogId,
            runId: childDialogId,
            batchId: effectiveBatchId,
            model: childResult.model ?? null,
            provider: childResult.provider ?? null,
            content: childResult.content ?? "",
            usage: childResult.usage ?? null,
            finish_reason: childResult.finish_reason ?? null,
          }),
          metadata: { startAgentRun: true, background: false, localRuntime: true },
        };
      } catch (error) {
        const errorMessage = toErrorMessage(error);
        try {
          await persistDesktopFailedChildDialog({
            store: args.store,
            userId,
            dialogId: childDialogId,
            errorMessage,
            now: now(),
          });
        } catch (persistError) {
          console.warn("[desktop-runtime] failed to persist foreground child failure:", persistError);
        }
        return {
          content: JSON.stringify({
            success: false,
            agentKey,
            dialogId: childDialogId,
            runId: childDialogId,
            batchId: effectiveBatchId,
            error: errorMessage,
          }),
          metadata: { startAgentRun: true, background: false, localRuntime: true, error: true },
        };
      }
    }

    // No authorized workspace: retain the existing server bridge path.
    const serverUrl = resolveDesktopAgentRuntimeServerUrl(args.env);
    const authToken = resolveDesktopAgentRuntimeAuthToken(args.env);
    if (!serverUrl) {
      return {
        content: JSON.stringify({ error: "startAgentRun: NOLO_SERVER or BASE_URL is required" }),
        metadata: { serverPlatformTool: true, startAgentRun: true },
      };
    }
    if (!authToken) {
      return {
        content: JSON.stringify({ error: "startAgentRun: AUTH_TOKEN is required" }),
        metadata: { serverPlatformTool: true, startAgentRun: true },
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
    const parentAgentKey = asOptionalTrimmedString(args.parentAgentRef);
    if (parentAgentKey) {
      headers["X-Nolo-Agent-Key"] = parentAgentKey;
    }

    const requestBody: Record<string, unknown> = {
      agentKey,
      userInput: buildDesktopDelegatedAgentInput(task, parsed.input),
      stream: false,
      ...(args.spaceId ? { spaceId: args.spaceId } : {}),
      runtimeContext: childRuntimeContext,
    };
    if (background) {
      requestBody.background = true;
      if (parentDialogId) requestBody.parentDialogId = parentDialogId;
    }

    const response = await args.fetchImpl(`${serverUrl}/api/agent/run`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    const responseText = await response.text().catch(() => "");
    if (!response.ok) {
      return {
        content: JSON.stringify({
          error: `startAgentRun: HTTP ${response.status}`,
          detail: responseText.slice(0, 500),
        }),
        metadata: { serverPlatformTool: true, startAgentRun: true, httpStatus: response.status },
      };
    }

    let payload: any = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = { content: responseText };
    }

    if (background) {
      const childDialogId = asOptionalTrimmedString(payload?.dialogId) ?? "";
      return {
        content: JSON.stringify({
          success: true,
          status: payload?.status ?? "pending",
          agentKey,
          childDialogId: childDialogId || null,
          runId: childDialogId || null,
          batchId: effectiveBatchId,
          ...(parentDialogId ? { parentDialogId } : {}),
        }),
        metadata: { serverPlatformTool: true, startAgentRun: true, background: true },
      };
    }

    return {
      content: JSON.stringify({
        success: true,
        agentKey,
        dialogId: payload?.dialogId ?? null,
        runId: payload?.dialogId ?? null,
        batchId: effectiveBatchId,
        model: payload?.model ?? null,
        provider: payload?.provider ?? null,
        content: typeof payload?.content === "string" ? payload.content : "",
        usage: payload?.usage ?? null,
        finish_reason: payload?.finish_reason ?? null,
        artifacts: payload?.artifacts ?? null,
      }),
      metadata: { serverPlatformTool: true, startAgentRun: true, background: false },
    };
  };
}

function buildDesktopLocalToolExecutors(args: {
  toolNames?: string[];
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  workspaceRoot: string;
  workspaceAuthority: DesktopStartAgentRunWorkspaceAuthority;
  fetchImpl: typeof fetch;
  readXPost?: typeof readXPostFunc;
  readXhsProfile?: typeof readXhsProfileFunc;
  commandTimeoutMs?: number;
  commandOutputLimit?: number;
  restrictShellToWorkspace?: boolean;
  dialogId?: string;
  spaceId?: string;
  runtimeContext?: Record<string, any> | null;
  parentAgentRef?: string;
  now?: () => number;
  createId?: () => string;
  runChildDesktopTurn?: DesktopStartAgentRunChildRunner;
}) {
  return {
    ...createLocalWorkspaceToolExecutors({
      workspaceRoot: args.workspaceRoot,
      commandTimeoutMs: args.commandTimeoutMs,
      commandOutputLimit: args.commandOutputLimit,
      restrictShellToWorkspace: args.restrictShellToWorkspace,
    }),
    ...buildDesktopChromeConnectorToolExecutors(),
    ...buildDesktopServerPlatformToolExecutors({
      env: args.env,
      fetchImpl: args.fetchImpl,
      dialogId: args.dialogId,
      spaceId: args.spaceId,
      runtimeContext: args.runtimeContext,
      parentAgentRef: args.parentAgentRef,
    }),
    ...buildDesktopNoloWorkspaceToolExecutors({
      env: args.env,
      store: args.store,
    }),
    // loadSkill is a local-fs tool (resolves SKILL.md from the agent's bound
    // workspace), wired here with the workspace root rather than inside the
    // CLI-bridge executor map.
    loadSkill: buildLoadSkillExecutor({ cwd: args.workspaceRoot }),
    [DESKTOP_SERVER_START_AGENT_RUN_TOOL_NAME]: buildDesktopStartAgentRunToolExecutor({
      env: args.env,
      store: args.store,
      fetchImpl: args.fetchImpl,
      workspaceAuthority: args.workspaceAuthority,
      dialogId: args.dialogId,
      spaceId: args.spaceId,
      runtimeContext: args.runtimeContext,
      parentAgentRef: args.parentAgentRef,
      now: args.now,
      createId: args.createId,
      runChildDesktopTurn: args.runChildDesktopTurn,
    }),
    ...buildExternalToolExecutors({
      toolNames: args.toolNames ?? [],
      authenticatedBillingContext: {
        onPreflight: async (toolName) => {
          if (!process.env.SERPAPI_API_KEY) {
            throw new Error("Local environment missing SERPAPI_API_KEY for paid external tool.");
          }
        },
        onCharge: async (toolName) => {
          // Self-hosted key means user pays the provider directly, no Nolo ledger charge needed.
        }
      }
    }),
    read_x_post: async (call: any) => {
      const parsedArgs = (() => {
        try { return JSON.parse(call.arguments || "{}"); } catch { return {}; }
      })();
      const result = await (args.readXPost ?? readXPostFunc)(parsedArgs, undefined);
      return {
        content: JSON.stringify(result.rawData),
        metadata: {
          xPostDesktopBridge: true,
          displayData: result.displayData,
        },
      };
    },
    read_xhs_profile: async (call: any) => {
      const parsedArgs = (() => {
        try { return JSON.parse(call.arguments || "{}"); } catch { return {}; }
      })();
      const result = await (args.readXhsProfile ?? readXhsProfileFunc)(parsedArgs, undefined);
      return {
        content: JSON.stringify(result.rawData),
        metadata: {
          xhsDesktopBridge: true,
          displayData: result.displayData,
        },
      };
    },
  };
}

export const buildDesktopChromeConnectorOpenAiToolsForTest = buildDesktopChromeConnectorOpenAiTools;
export const buildDesktopChromeConnectorPolicyToolNamesForTest = buildDesktopChromeConnectorPolicyToolNames;
export const buildDesktopChromeConnectorToolExecutorsForTest = buildDesktopChromeConnectorToolExecutors;

function buildDesktopNoloWorkspaceToolExecutors(args: {
  env: DesktopAgentRuntimeEnv;
  cliEntrypoint?: string;
  store?: DesktopAgentRuntimeRecordStore;
}) {
  return buildNoloWorkspaceCliToolExecutors({
    cliEntrypoint: args.cliEntrypoint ?? resolveDesktopCliEntrypoint(),
    env: args.env,
    metadataKind: "noloWorkspaceTool",
    store: args.store,
  }) as Record<string, (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>>;
}

export function isDesktopAgentRuntimeRecordNotFound(error: unknown) {
  const text = `${(error as any)?.code ?? ""} ${(error as any)?.notFound ?? ""} ${(error as any)?.message ?? error}`;
  return /LEVEL_NOT_FOUND|NotFound|not found/i.test(text);
}

export function createDesktopAgentRuntimeRecordStoreFromDb(
  db: DesktopAgentRuntimeLevelDbLike
): DesktopAgentRuntimeRecordStore {
  return {
    read: async (key) => {
      try {
        return await db.get(key);
      } catch (error) {
        if (isDesktopAgentRuntimeRecordNotFound(error)) return null;
        throw error;
      }
    },
    batch: (ops) => db.batch(ops),
    iterator: (options) => db.iterator(options),
  };
}

export function createDesktopAgentRuntimeHybridRecordStoreFromDb(
  args: DesktopAgentRuntimeHybridRecordStoreArgs
): DesktopAgentRuntimeRecordStore {
  const defaultServer = resolveDesktopAgentRuntimeServerUrl(args.env);
  return createHybridRecordStore({
    db: {
      get: args.db.get.bind(args.db),
      put: async (key, value) => {
        if (!args.db.put) {
          await args.db.batch([
            { type: "put", key, value: value as Record<string, unknown> },
          ]);
          return;
        }
        await args.db.put.call(args.db, key, value);
      },
      del: async (key: string) => {
        if (typeof args.db.del === "function") {
          await args.db.del(key);
          return;
        }
        await args.db.batch([{ type: "del", key }]);
      },
      batch: async (ops) =>
        args.db.batch(
          ops.map((op) => ({
            type: "put" as const,
            key: op.key,
            value: op.value as Record<string, unknown>,
          })),
        ),
      iterator: args.db.iterator.bind(args.db),
    },
    defaultServer,
    fallbackServers: [
      ...parseSyncServersEnv(args.env),
      ...NOLO_CLUSTER_SERVERS,
    ].filter(
      (server): server is string =>
        typeof server === "string" &&
        server.trim().length > 0 &&
        normalizeServerOrigin(server) !== defaultServer
    ),
    authToken: resolveDesktopAgentRuntimeAuthToken(args.env),
    fetchImpl: args.fetchImpl,
    requestTimeoutMs: DESKTOP_REMOTE_REQUEST_TIMEOUT_MS,
  });
}

export async function rejectDesktopTextOnlyAgentRuntimeToolCall(
  call: AgentRuntimeToolCallInput
): Promise<AgentRuntimeToolResult> {
  throw new Error(`Desktop text-only agent runtime cannot execute tool calls: ${call.name}`);
}

/**
 * Read AGENTS.md from the workspace root. Falls back to CLAUDE.md if
 * AGENTS.md is absent (common in repos that predate the standard).
 * Returns null when neither file exists.
 */
function readAgentsMd(workspaceRoot: string): string | null {
  const candidates = [
    join(workspaceRoot, "AGENTS.md"),
    join(workspaceRoot, "CLAUDE.md"),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    try {
      let content = readFileSync(filePath, "utf8").trim();
      if (!content) continue;
      if (Buffer.byteLength(content, "utf8") > 8192) {
        content = Buffer.from(content, "utf8").subarray(0, 8192).toString("utf8") + "\n\n<!-- AGENTS.md truncated -->";
      }
      return content;
    } catch { /* skip unreadable */ }
  }
  return null;
}


export async function resolveDesktopTextOnlyAgentRuntimeProvider(args: {
  env: DesktopAgentRuntimeEnv;
  agentConfig: AgentRuntimeAgentConfig;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
}): Promise<AgentRuntimeProvider> {
  return resolveDesktopConfiguredProvider({
    env: args.env,
    agentConfig: args.agentConfig,
    fetchImpl: args.fetchImpl,
    ...(args.requestTimeoutMs ? { requestTimeoutMs: args.requestTimeoutMs } : {}),
  });
}

export function createDesktopTextOnlyAgentRuntimeActions(args: {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  now: () => number;
  createId: () => string;
  fetchImpl?: typeof fetch;
}): DesktopAgentRuntimeActions {
  return createDesktopAgentRuntimeRecordStoreActions({
    env: args.env,
    store: args.store,
    now: args.now,
    createId: args.createId,
    resolveProvider: (agentConfig) => Promise.resolve(resolveDesktopTextOnlyAgentRuntimeProvider({
      env: args.env,
      agentConfig,
      fetchImpl: args.fetchImpl,
      requestTimeoutMs: DESKTOP_REMOTE_REQUEST_TIMEOUT_MS,
    })),
    executeTool: rejectDesktopTextOnlyAgentRuntimeToolCall,
  });
}

/**
 * 桌面端能力包解析：共享 resolveEffectiveEnabledPacks，本端只声明差异。
 *
 * - ALWAYS_ON_PACK_IDS（long-term-memory / skills）由共享层
 *   幂等补齐，三端一致；关闭通道走 disabledTools。
 * - code 走 hostPacks 且由 workspaceAuthorized 门控：桌面端的代码能力依赖已授权的
 *   绑定文件夹，没授权就补不出可执行的工具。与 CLI 的 emptyFallbackPacks 语义不同
 *   （CLI 无 workspace 授权概念）。
 * - agent-orchestration 在桌面端**有意不默认挂载**：desktop runtime 已有
 *   startAgentRun 执行器（buildDesktopStartAgentRunToolExecutor，挂载于
 *   buildDesktopLocalToolExecutors），但 controlAgentRun 执行器尚未落地
 *   （CLI/web 的默认挂载由共享层 addDefaultSystemCapabilityTools 在工具面
 *   解析处完成）。挂上无法执行的工具只会产生坏调用；待 controlAgentRun
 *   执行器落地后再纳入默认挂载。
 *
 * 纯函数，单独可测。
 */
export function resolveDesktopEffectiveEnabledPacks(args: {
  enabledPacks?: string[] | null;
  /** 新三态字段；存在时以它为准，缺失则回落 enabledPacks。 */
  skills?: Record<string, unknown> | null;
  workspaceAuthorized: boolean;
}): string[] {
  return resolveEffectiveEnabledPacks({
    enabledPacks: resolveAgentRequiredPackIds(args),
    hostPacks: args.workspaceAuthorized ? ["code"] : [],
  });
}

export function createDesktopAgentRuntimeActions(args: {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  now: () => number;
  createId: () => string;
  fetchImpl?: typeof fetch;
  cwd?: string;
  /** True only when cwd came from explicit turn input or Space boundFolder. */
  authorizedWorkspace?: boolean;
  input?: AgentRuntimeMessageContent;
  readXPost?: typeof readXPostFunc;
  readXhsProfile?: typeof readXhsProfileFunc;
  restrictShellToWorkspace?: boolean;
  workspaceToolsHint?: boolean;
  /** Parent turn dialog id (continueDialogId) for web/startAgentRun bridges. */
  dialogId?: string;
  /** Parent dialog spaceId (resolved once even when cwd is explicit). */
  spaceId?: string;
  runtimeContext?: Record<string, any> | null;
  parentAgentRef?: string;
  runChildDesktopTurn?: DesktopStartAgentRunChildRunner;
}): DesktopAgentRuntimeActions {
  let activeAgentToolNames: string[] = [];
  let activeEnv = args.env;
  const workspaceRoot = args.cwd ? resolvePath(args.cwd) : process.cwd();
  const fetchImpl = args.fetchImpl ?? fetch;
  const workspaceAuthority: DesktopStartAgentRunWorkspaceAuthority = args.authorizedWorkspace && args.cwd
    ? { kind: "authorized", root: workspaceRoot }
    : { kind: "none" };
  const platformToolContext = {
    dialogId: args.dialogId,
    spaceId: args.spaceId,
    runtimeContext: args.runtimeContext,
    parentAgentRef: args.parentAgentRef,
  };
  let executors = buildDesktopLocalToolExecutors({
    env: activeEnv,
    store: args.store,
    workspaceRoot,
    workspaceAuthority,
    fetchImpl,
    readXPost: args.readXPost,
    readXhsProfile: args.readXhsProfile,
    restrictShellToWorkspace: args.restrictShellToWorkspace,
    ...platformToolContext,
    now: args.now,
    createId: args.createId,
    runChildDesktopTurn: args.runChildDesktopTurn,
  });
  return createDesktopAgentRuntimeRecordStoreActions({
    env: args.env,
    store: args.store,
    now: args.now,
    createId: args.createId,
    getWorkspaceRoot: () => workspaceRoot,
    getWorkspaceAuthorized: () => workspaceAuthority.kind === "authorized",
    resolveProvider: async (agentConfig) => {
      const currentRunPolicy = resolveCurrentRunRuntimeToolPolicy(agentConfig);
      activeEnv = resolveLocalRuntimeEnvFromPolicy(args.env, currentRunPolicy);

      // quick-chat 通用档内置 agent：默认不注入工作区工具；仅当
      // workspaceToolsHint=true 时挂载完整 code-planning skill 工具面。其他 agent 走原逻辑。
      const isTierAgent = isQuickChatTierAgent(agentConfig);
      // 桌面端空间绑定文件夹并已授权时，自动开 code + agent-orchestration 能力包
      // ——让绑文件夹的 agent 显式拿到代码工具与多 agent 编排（含 listAgents 发现）。
      // 兜底仍保留，不改变存量 agent 行为；这里只是让 enabledPacks 声明更准确。
      const effectiveEnabledPacks = resolveDesktopEffectiveEnabledPacks({
        enabledPacks: (agentConfig as any)?.enabledPacks,
        skills: (agentConfig as any)?.skills,
        workspaceAuthorized: workspaceAuthority.kind === "authorized",
      });
      const resolvedDeclaredToolNames = narrowDesktopNoloToolsForTurn({
        agentConfig,
        toolNames: expandEnabledPacks(
          effectiveEnabledPacks,
          resolveRequestedRuntimeToolNames({ agentConfig }),
        ),
        input: args.input,
      });
      let requestedToolNames: string[];
      let useDeclaredToolNamesOnly = false;
      if (isTierAgent) {
        if (args.workspaceToolsHint === true) {
          // 挂载 code-planning skill 自有工具面（工作区读写/shell + startAgentRun），
          // 联网部分不由 skill 私藏，改从系统能力包展开——这样下面的
          // applySystemBuiltinSkillFilter 才能真正按用户的全局开关摘掉它们。
          requestedToolNames = [
            ...CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
            ...expandEnabledPacks(CODE_PLANNER_WEB_CAPABILITY_PACK_IDS),
          ];
          useDeclaredToolNamesOnly = true;
        } else {
          // 无 hint：通用档不带任何工作区工具。
          requestedToolNames = [];
          useDeclaredToolNamesOnly = true;
        }
      } else {
        // 普通非 specialist：维持旧行为，web-capable 时补 LIGHT_WEB。
        requestedToolNames = addDefaultLightWebToolsForConfiguredAgents(
          resolvedDeclaredToolNames,
          agentConfig,
        );
      }

      // 强制工具层（ask_user 等）跨所有环境、所有模式注入，包括
      // declared-only / tier agent 默认空工具的分支。这是平台交互底线。
      requestedToolNames = [...new Set([...requestedToolNames, ...FORCED_TOOLS])];
      // 系统内置 Skill 全局开关：用户在设置页关闭「联网搜索」等内置 skill 后，
      // 从工具面过滤掉对应 pack 的工具。桌面端从本地 settings record 读
      // systemBuiltinSkills，与 Web/CLI 端行为统一。best-effort，读失败默认全开。
      try {
        const userId = resolveDesktopAgentRuntimeUserId(args.env);
        const settingsRecord = await args.store.read(
          createUserKey.settings(userId),
          { remote: false },
        );
        const systemBuiltinSkills =
          settingsRecord && typeof settingsRecord === "object"
            ? (settingsRecord as any).systemBuiltinSkills ?? null
            : null;
        requestedToolNames = applySystemBuiltinSkillFilter(
          requestedToolNames,
          systemBuiltinSkills,
        );
      } catch {
        // 本地 settings record 读取失败 → 默认全开，不过滤。
      }
      // Apply creator's disabledTools (FORCED_TOOLS survive even if disabled).
      requestedToolNames = applyDisabledTools(
        requestedToolNames,
        (agentConfig as any)?.disabledTools,
      );

      activeAgentToolNames = buildDesktopLocalPolicyToolNames({
        toolNames: requestedToolNames,
        env: activeEnv,
        useDeclaredToolNamesOnly,
      });
      const executionLimits = resolveLocalWorkspaceExecutorOptionsFromPolicy(currentRunPolicy);
      executors = buildDesktopLocalToolExecutors({
        toolNames: requestedToolNames,
        env: activeEnv,
        store: args.store,
        workspaceRoot,
        workspaceAuthority,
        fetchImpl,
        readXPost: args.readXPost,
        readXhsProfile: args.readXhsProfile,
        restrictShellToWorkspace: args.restrictShellToWorkspace,
        ...platformToolContext,
        ...executionLimits,
        now: args.now,
        createId: args.createId,
        runChildDesktopTurn: args.runChildDesktopTurn,
      });
      return resolveDesktopConfiguredProvider({
        env: args.env,
        agentConfig,
        fetchImpl: args.fetchImpl,
        requestTimeoutMs: DESKTOP_REMOTE_REQUEST_TIMEOUT_MS,
        tools: buildDesktopOpenAiTools({
          toolNames: requestedToolNames,
          env: activeEnv,
          useDeclaredToolNamesOnly,
        }),
        // Cursor drives its own inline exec loop, so hand it the same tool
        // executor the host adapter uses. Other providers ignore this field.
        executeTool: (call) => executeLocalToolWithPolicy({
          blockDestructiveWithoutConfirmation: true,
          env: activeEnv,
          agentToolNames: activeAgentToolNames,
          call,
          executors,
        }),
      });
    },
    executeTool: (call) => executeLocalToolWithPolicy({
      // 用户面前的运行时：确认通道没接上不等于用户默许破坏性命令。
      blockDestructiveWithoutConfirmation: true,
      env: activeEnv,
      agentToolNames: activeAgentToolNames,
      call,
      executors,
    }),
  });
}

function wrapDesktopActionsWithRequestSnapshots(
  base: DesktopAgentRuntimeActions,
  input: DesktopAgentRuntimeBaseTurnInput,
): DesktopAgentRuntimeActions {
  if (!input.agentConfigSnapshot && !input.dialogHistorySnapshot) {
    return base;
  }
  return createDesktopAgentRuntimeRequestScopedActions({
    base,
    env: input.env,
    store: input.store,
    turnAgentRef: input.agentRef,
    agentConfigSnapshot: input.agentConfigSnapshot,
    dialogHistorySnapshot: input.dialogHistorySnapshot,
    createId: input.createId ?? createDesktopAgentRuntimeDialogId,
  });
}

export async function runDesktopTextOnlyAgentRuntimeTurn(
  input: DesktopTextOnlyAgentRuntimeTurnInput
): Promise<LocalAgentTurnResult> {
  const baseActions = createDesktopTextOnlyAgentRuntimeActions({
    env: input.env,
    store: input.store,
    now: input.now ?? Date.now,
    createId: input.createId ?? createDesktopAgentRuntimeDialogId,
    fetchImpl: input.fetchImpl,
  });
  const actions = wrapDesktopActionsWithRequestSnapshots(baseActions, input);
  const adapter = createDesktopAgentRuntimeAdapter({
    env: input.env,
    actions,
  });

  return runLocalAgentTurn({
    adapter,
    agentRef: input.agentRef,
    input: input.input,
    runtimeContext: input.runtimeContext,
    continueDialogId: input.continueDialogId,
    onTextDelta: input.onTextDelta,
    onToolEvent: input.onToolEvent,
    onReasoningDelta: input.onReasoningDelta,
  });
}
/**
 * Parent dialog dbKey for this turn. Only the caller-provided key is trusted:
 * the HTTP client and internal startAgentRun child runs both know the exact key.
 * Env-derived `dialog-${userId}-${dialogId}` re-derivation was removed
 * (owner-approved 2026-07-18) — it silently read the wrong user's records
 * when host env ids diverged from the logged-in user. A turn without a valid
 * dialogKey simply skips dialog-record resolution (no space/workspace layers).
 */
function resolveDesktopTurnDialogKey(input: {
  continueDialogId?: string;
  dialogKey?: string;
}): string | null {
  const dialogId = asOptionalTrimmedString(input.continueDialogId);
  if (!dialogId) return null;
  const explicit = asOptionalTrimmedString(input.dialogKey);
  if (explicit && explicit.startsWith("dialog-") && explicit.endsWith(`-${dialogId}`)) {
    return explicit;
  }
  console.warn(
    "[desktop-runtime] turn has continueDialogId but no valid dialogKey; skipping dialog-record resolution:",
    explicit || "(absent)",
  );
  return null;
}

export async function runDesktopAgentRuntimeTurn(
  input: DesktopAgentRuntimeTurnInput
): Promise<LocalAgentTurnResult> {
  // Resolve parent dialog spaceId whenever continueDialogId is set (even if cwd
  // is explicit), so startAgentRun can pass spaceId and the turn context layers can
  // tell the model which Space/workspace this dialog belongs to. The space
  // record is read once and reused for boundFolder + the space context layer.
  let cwd = input.cwd ? resolvePath(input.cwd) : undefined;
  let resolvedCwdFromBoundFolder = false;
  let parentSpaceId: string | undefined;
  let boundFolder: string | undefined;
  let workspaceResolutionError: string | undefined;
  let cachedSpaceRecord: Record<string, unknown> | null | undefined;

  const readRemoteRecord = async (dbKey: string) =>
    (await input.store.read(dbKey, { remote: true })) as
      | Record<string, unknown>
      | null;

  // Captured once from the dialog record (T12/T13 truth sources).
  let dialogRecord: Record<string, unknown> | null = null;
  let dialogSummary: string | null = null;
  // userId MUST come from the dialog record (or its key), never from host env.
  // The env user can diverge from the logged-in user whose preferences apply —
  // using env here is the exact D1 trap that was removed (see plan D1/D2).
  let dialogRecordUserId: string | null = null;

  if (input.continueDialogId) {
    try {
      const dialogKey = resolveDesktopTurnDialogKey(input);
      dialogRecord = dialogKey ? await readRemoteRecord(dialogKey) : null;
      parentSpaceId = asOptionalTrimmedString(dialogRecord?.spaceId);
      dialogSummary = asOptionalTrimmedString(dialogRecord?.summary) ?? null;
      dialogRecordUserId =
        asOptionalTrimmedString(dialogRecord?.userId) ?? null;
      // Fall back to parsing the dialog key only when the record lacks userId.
      // dialog key shape: dialog-{userId}-{dialogId}. The dialogId is known
      // (continueDialogId), so userId is the segment between the `dialog-`
      // prefix and the `-{dialogId}` suffix — robust to hyphenated dialogIds.
      if (!dialogRecordUserId && dialogKey && input.continueDialogId) {
        const prefix = "dialog-";
        const suffix = `-${input.continueDialogId}`;
        if (dialogKey.startsWith(prefix) && dialogKey.endsWith(suffix)) {
          const parsed = dialogKey.slice(
            prefix.length,
            dialogKey.length - suffix.length,
          );
          if (parsed) dialogRecordUserId = parsed;
        }
      }
      const effectiveSpaceId = input.spaceId ?? parentSpaceId;
      if (effectiveSpaceId) {
        cachedSpaceRecord = await readRemoteRecord(spaceRecordKey(effectiveSpaceId));
        const trimmedPath = asOptionalTrimmedString(cachedSpaceRecord?.boundFolder);
        if (trimmedPath) {
          if (!isAbsolute(trimmedPath)) {
            workspaceResolutionError = `boundFolder 不是绝对路径：${trimmedPath}`;
            console.warn("[desktop-runtime] boundFolder is not absolute, falling back to cwd:", trimmedPath);
          } else {
            boundFolder = resolvePath(trimmedPath);
            // 绑定文件夹优先：桌面端若空间绑定了文件夹，无论调用方是否传了
            // cwd，都以绑定的文件夹作为 workspace root（用户预期：绑定即根）。
            // 传入的 cwd 仅作为“本轮实际工作目录”信息在 context 层展示。
            cwd = boundFolder;
            resolvedCwdFromBoundFolder = true;
          }
        }
      }
    } catch (resolveError) {
      workspaceResolutionError =
        resolveError instanceof Error ? resolveError.message : String(resolveError);
      console.warn("[desktop-runtime] boundFolder resolution failed:", resolveError);
    }
  }

  const turnSpaceId = input.spaceId ?? parentSpaceId;
  const turnContextReadSource = {
    readRecord: async (dbKey: string) =>
      cachedSpaceRecord !== undefined &&
      turnSpaceId &&
      dbKey === spaceRecordKey(turnSpaceId)
        ? cachedSpaceRecord
        : readRemoteRecord(dbKey),
  };
  const spaceContextLayer = await buildSpaceContextLayer({
    source: turnContextReadSource,
    spaceId: turnSpaceId,
  });
  const workspaceContextLayer = buildWorkspaceContextLayer({
    spaceId: turnSpaceId,
    boundFolder,
    cwd,
    resolutionError: workspaceResolutionError,
  });

  // P2: discover SKILL.md files in the bound folder's conventional skill
  // directories. The agent sees a list of available skills and can read them
  // on-demand via readFile — no auto-injection into the prompt.
  let skillDiscoveryLayer = null;
  let agentsMdLayer = null;
  if (boundFolder) {
    try {
      const discoveredSkills = discoverSkills(boundFolder);
      skillDiscoveryLayer = buildSkillDiscoveryLayer(discoveredSkills, boundFolder);
    } catch (scanError) {
      console.warn("[desktop-runtime] skill discovery scan failed:", scanError);
    }
    // AGENTS.md project context (session-scope for cache stability)
    const agentsMdContent = readAgentsMd(boundFolder);
    agentsMdLayer = agentsMdContent ? buildAgentsMdLayer(agentsMdContent) : null;
  }

  // T13 — user global prompt. userId comes from the dialog record only; when
  // there is no dialog record (no continueDialogId / no valid dialogKey) we
  // skip this layer rather than guessing the user from env.
  const userGlobalPromptLayer = dialogRecord
    ? await buildUserGlobalPromptLayer({
        source: turnContextReadSource,
        userId: dialogRecordUserId,
      })
    : null;

  // T14 — memory overlay. The host performs the network call to
  // {server}/api/memory/query (auth + server config live in env, which
  // agent-runtime must not depend on) and hands the fetched promptBlock to
  // the shared builder. Network failure is visible-but-non-fatal: we warn and
  // omit the layer rather than failing the whole turn. We do NOT emit an
  // explicit "memory unavailable" block because, unlike a space-read failure,
  // a missing memory layer does not make the model claim a false fact — the
  // model simply has no memory to honor; a spurious "memory failed" block
  // would risk the model over-explaining a personalization enhancement that
  // was never guaranteed. The warn keeps the failure visible to the operator.
  let memoryPromptBlock: string | null = null;
  const memoryFetchImpl = input.memoryOverlayFetchImpl ?? input.fetchImpl ?? fetch;
  const memoryServerUrl = resolveDesktopAgentRuntimeServerUrl(input.env);
  const memoryAuthToken = resolveDesktopAgentRuntimeAuthToken(input.env);
  if (memoryServerUrl && memoryAuthToken && asOptionalTrimmedString(input.agentRef)) {
    try {
      const userInputText = extractDesktopTurnInputText(input.input);
      const memoryResponse = await memoryFetchImpl(
        `${memoryServerUrl}/api/memory/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${memoryAuthToken}`,
          },
          body: JSON.stringify({
            agentKey: asOptionalTrimmedString(input.agentRef),
            userInput: userInputText,
            ...(turnSpaceId ? { spaceId: turnSpaceId } : {}),
          }),
          // Memory is an enhancement, not a prerequisite: an unresponsive
          // memory service must never hold the turn open. Without this the
          // user presses send and waits forever on a stalled socket.
          signal: AbortSignal.timeout(DESKTOP_MEMORY_OVERLAY_TIMEOUT_MS),
        },
      );
      if (memoryResponse.ok) {
        const memoryPayload = (await memoryResponse.json().catch(() => null)) as
          | { promptBlock?: unknown }
          | null;
        memoryPromptBlock = asOptionalTrimmedString(memoryPayload?.promptBlock) ?? null;
      } else {
        console.warn(
          "[desktop-runtime] memory overlay fetch returned non-ok status:",
          memoryResponse.status,
        );
      }
    } catch (memoryError) {
      console.warn(
        "[desktop-runtime] memory overlay fetch failed, omitting memory layer:",
        memoryError,
      );
    }
  }
  const memoryOverlayLayer = buildMemoryOverlayLayer({
    promptBlock: memoryPromptBlock,
  });
  const memoryUseGuidanceLayer = buildMemoryUseGuidanceLayer({
    promptBlock: memoryPromptBlock,
  });

  // T12 — dialog summary (wrapped in stale-replay guard by the builder).
  const dialogSummaryLayer = buildDialogSummaryLayer({
    summary: dialogSummary,
  });

  // Listed in authoring order; partitionScopedBlocks then puts every
  // session-scope layer ahead of every turn-scope one so the cacheable prefix
  // stays contiguous. Ordering by hand is what let the session-scope skill
  // index sit behind turn-scope workspace context and silently truncate the
  // prefix — each layer's own cacheScope is the single source of truth.
  const contextBlockScopes = partitionScopedBlocks(
    renderTurnContextBlocksWithScope([
      agentsMdLayer,
      userGlobalPromptLayer,
      spaceContextLayer,
      memoryUseGuidanceLayer,
      workspaceContextLayer,
      skillDiscoveryLayer,
      memoryOverlayLayer,
      dialogSummaryLayer,
    ]),
  );

  // A workspace is user-authorized only when the turn received an explicit cwd
  // or resolved one from the parent Space boundFolder. process.cwd() fallback
  // is not treated as authorized workspace authority.
  const authorizedWorkspace = Boolean(cwd);

  const baseActions = createDesktopAgentRuntimeActions({
    env: input.env,
    store: input.store,
    now: input.now ?? Date.now,
    createId: input.createId ?? createDesktopAgentRuntimeDialogId,
    fetchImpl: input.fetchImpl,
    cwd,
    authorizedWorkspace,
    input: input.input,
    readXPost: input.readXPost,
    readXhsProfile: input.readXhsProfile,
    restrictShellToWorkspace: input.restrictShellToWorkspace === true || resolvedCwdFromBoundFolder,
    workspaceToolsHint: input.workspaceToolsHint === true,
    dialogId: asOptionalTrimmedString(input.continueDialogId),
    spaceId: turnSpaceId,
    runtimeContext: input.runtimeContext,
    parentAgentRef: input.agentRef,
    runChildDesktopTurn: input.runChildDesktopTurn,
  });
  const actions = wrapDesktopActionsWithCodeWorkSkillPack(
    wrapDesktopActionsWithRequestSnapshots(baseActions, input),
    input.workspaceToolsHint === true,
  );
  const adapter = createDesktopAgentRuntimeAdapter({
    env: input.env,
    actions,
    capabilities: ["local-tools"],
  });

  // 累计 reasoning 增量：provider 经 onReasoningDelta 回调逐块吐出。
  // runLocalAgentTurn 返回的 result.reasoning_content 只含最后一轮 provider
  // 调用的 reasoning，多轮工具循环下会丢失前几轮；这里在 service 层把全轮
  // 增量拼起来，turn 完成时覆盖回 result.reasoning_content，让客户端拿到完整
  // 思维链用于持久化 thinkContent（客户端在 turn 完成写库时读取本字段）。
  let accumulatedReasoning = "";
  const onReasoningDelta = (chunk: string) => {
    if (typeof chunk === "string" && chunk.length > 0) {
      accumulatedReasoning += chunk;
    }
    input.onReasoningDelta?.(chunk);
  };

  const result = await runLocalAgentTurn({
    adapter,
    agentRef: input.agentRef,
    input: input.input,
    runtimeContext: input.runtimeContext,
    continueDialogId: input.continueDialogId,
    spaceId: turnSpaceId,
    contextBlockScopes,
    parentDialogId: input.parentDialogId,
    onTextDelta: input.onTextDelta,
    onToolEvent: input.onToolEvent,
    onReasoningDelta,
  });

  // 多轮循环下 provider 末轮的 reasoning_content 可能不全；用累计值补齐。
  if (accumulatedReasoning) {
    return {
      ...result,
      reasoning_content:
        (typeof result.reasoning_content === "string" && result.reasoning_content)
          ? result.reasoning_content
          : accumulatedReasoning,
    };
  }
  return result;
}
