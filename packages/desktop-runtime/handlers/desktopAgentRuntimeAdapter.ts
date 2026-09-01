import { isSystemBuiltinTrustedAgentKey } from "core/builtinAgents";
import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeChatMessage,
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
  AgentRuntimeSaveTurnInput,
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "agent-runtime";
import {
  agentRuntimeConfigFromDesktopSnapshot,
  buildAgentRuntimeDialogWritePlan,
  buildAgentRuntimeAgentLookupKeys,
  createDesktopHostCredentialBroker,
  dialogMessageRecordToAgentRuntimeMessage,
  executeOpenAiCompatibleChatCompletion,
  executePlatformChatCompletionWithFallback,
  resolveAgentRuntimeConfigFromRecord,
  resolveOpenAiCompatibleProviderConfig,
  resolvePlatformChatProviderConfig,
  resolveRuntimeToolSurfaceForAgent,
  shouldUsePlatformChatProvider,
  type CredentialBroker,
} from "agent-runtime";
import { resolveAgentCallPlan } from "agent-runtime/agentCallPlan";
import { fetchAntigravityCloudCodeCompletion } from "agent-runtime/antigravityCloudCodeProvider";
import { fetchAnthropicMessagesCompletion } from "agent-runtime/anthropicMessagesProvider";
import { fetchCodexResponsesCompletion } from "agent-runtime/codexResponsesProvider";
import type { ApiKeyRefResolver } from "agent-runtime/providerResolution";
import { pickAgentRuntimeInferenceOptions } from "agent-runtime/agentConfigOptions";
import { createOAuthTokenStore, type OAuthTokenStore } from "agent-runtime/oauthTokenStore";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import {
  resolveBuiltinPlatformAgentConfig as resolveSharedBuiltinPlatformAgentConfig,
} from "agent-runtime/builtinPlatformAgentConfigs";
import { NOLO_CLUSTER_SERVERS } from "database/config";
import {
  describeDesktopAgentRuntimeHostFacts,
  type DesktopAgentRuntimeEnv,
} from "./desktopAgentRuntimeHostFacts";
import { CHROME_CONNECTOR_TOOL_NAMES } from "ai/tools/chromeConnectorTools";
import { appendEnabledPackPromptPatches } from "ai/tools/toolPacks";
import { createTokenKey, createTokenStatsKey, createUserKey, dialogMessageRange } from "database/keys";
import { prepareTokenUsageData } from "ai/token/prepareTokenUsageData";
import { applyTokenUsageToDayStats } from "ai/token/applyTokenUsageToDayStats";
import { format } from "date-fns";
import { recordAgentAvailabilityFromResponse } from "./desktopAgentAvailability";

export type DesktopAgentRuntimeActions = {
  loadAgentConfig(agentRef: string): Promise<AgentRuntimeAgentConfig | null>;
  loadDialogHistory(dialogId: string): Promise<AgentRuntimeChatMessage[]>;
  saveTurn(input: AgentRuntimeSaveTurnInput): Promise<{ dialogId: string; title?: string }>;
  resolveProvider(agentConfig: AgentRuntimeAgentConfig): Promise<AgentRuntimeProvider>;
  executeTool(call: AgentRuntimeToolCallInput): Promise<AgentRuntimeToolResult>;
};

export type DesktopAgentRuntimeRecordStore = {
  read(dbKey: string, options?: { remote?: boolean }): Promise<unknown>;
  batch?(ops: Array<{ type: "put"; key: string; value: Record<string, unknown> }>): Promise<unknown>;
  iterator?(options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number }): AsyncIterable<[string, unknown]>;
};

export function resolveDesktopAgentRuntimeUserId(env: DesktopAgentRuntimeEnv) {
  return env.NOLO_LOCAL_USER_ID || env.NOLO_USER_ID || "local";
}

const DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET = new Set<string>(CHROME_CONNECTOR_TOOL_NAMES);

/**
 * Built-in public platform agents are now defined in the shared module
 * `packages/agent-runtime/builtinPlatformAgentConfigs.ts` so CLI local
 * runtime and desktop use the same config map. Re-export the resolver here
 * for existing call sites (including tests).
 *
 * Keep the shared mapping in sync with the quick-chat tier defaults in
 * `packages/app/settings/quickChatTierDefaults.ts`.
 */
export function resolveBuiltinPlatformAgentConfig(
  agentRef: string
): AgentRuntimeAgentConfig | null {
  return resolveSharedBuiltinPlatformAgentConfig(agentRef);
}

const DESKTOP_CHROME_CONNECTOR_AGENT_PROMPT = [
  "Nolo Desktop Chrome connector instructions:",
  "- Chrome Connector 是一个全局桌面能力包。只有用户在设置页打开 Enable Chrome Connector for agents 后，desktop local agents 才能使用 chrome_* 工具。",
  "- 用户要求访问、读取、点击、输入、截图或调试 Chrome 页面时，优先使用 chrome_* 工具；不要为了网页操作改用 shell/curl，除非 Chrome connector 不可用。",
  "- chrome_* 工具操作的是用户当前 Chrome。可以利用用户已登录状态读取当前页面，但不要读取 cookies、密码库、profile 数据库或导出 session secret。",
  "- 提交表单、发消息、上传文件、删除、付款、改权限、改密码最终提交等外部副作用动作，必须在执行前让用户确认。",
  "- 不绕过 CAPTCHA、paywall、安全 interstitial，也不要代替用户完成改密码最终提交。",
].join("\n");

function uniqueToolNames(values: unknown) {
  return [...new Set(asTrimmedNonEmptyStringArray(values))];
}

function stripDesktopChromeConnectorToolNames(values?: unknown) {
  return uniqueToolNames(values).filter(
    (toolName) => !DESKTOP_CHROME_CONNECTOR_TOOL_NAME_SET.has(toolName),
  );
}

function appendPrompt(base: unknown, addition: string) {
  const basePrompt = asTrimmedString(base);
  if (!basePrompt) return addition;
  if (basePrompt.includes(addition)) return basePrompt;
  return `${basePrompt}\n\n${addition}`;
}

function stripChromeToolsFromPolicy(policy: unknown): unknown {
  if (!isRecord(policy)) return policy;
  const runtimeTools = Array.isArray(policy.runtimeTools)
    ? stripDesktopChromeConnectorToolNames(policy.runtimeTools)
    : undefined;
  return {
    ...policy,
    ...(runtimeTools ? { runtimeTools } : {}),
  };
}

function stripChromeToolsFromRuntimeBinding(binding: unknown): unknown {
  if (!isRecord(binding)) return binding;
  return {
    ...binding,
    ...(binding.runtimeToolPolicy
      ? { runtimeToolPolicy: stripChromeToolsFromPolicy(binding.runtimeToolPolicy) }
      : {}),
    ...(binding.runtimeToolPolicySnapshot
      ? { runtimeToolPolicySnapshot: stripChromeToolsFromPolicy(binding.runtimeToolPolicySnapshot) }
      : {}),
  };
}

export async function loadDesktopChromeConnectorEnabledFromRecordStore(args: {
  store: Pick<DesktopAgentRuntimeRecordStore, "read">;
  userId: string;
  env: DesktopAgentRuntimeEnv;
}): Promise<boolean> {
  if (args.env.NOLO_DESKTOP !== "1") return false;
  const record = await args.store
    .read(createUserKey.settings(args.userId), { remote: false })
    .catch(() => null);
  return Boolean(
    record &&
      typeof record === "object" &&
      (record as Record<string, unknown>).desktopChromeConnectorEnabled === true,
  );
}

function applyDesktopChromeConnectorCapabilityPack(args: {
  agentConfig: AgentRuntimeAgentConfig;
  toolNames: string[];
  enabled: boolean;
}) {
  const baseToolNames = stripDesktopChromeConnectorToolNames(args.toolNames);
  const toolNames = args.enabled
    ? uniqueToolNames([...baseToolNames, ...CHROME_CONNECTOR_TOOL_NAMES])
    : baseToolNames;
  const runtimeToolPolicy = stripChromeToolsFromPolicy(args.agentConfig.runtimeToolPolicy);
  const runtimeBinding = stripChromeToolsFromRuntimeBinding(args.agentConfig.runtimeBinding);
  const prompt = args.enabled
    ? appendPrompt(args.agentConfig.prompt, DESKTOP_CHROME_CONNECTOR_AGENT_PROMPT)
    : args.agentConfig.prompt;

  return {
    ...args.agentConfig,
    toolNames,
    ...(prompt ? { prompt } : {}),
    ...(runtimeToolPolicy ? { runtimeToolPolicy } : {}),
    ...(runtimeBinding ? { runtimeBinding } : {}),
  };
}

export async function loadDesktopAgentRuntimeAgentConfigFromRecordStore(args: {
  store: DesktopAgentRuntimeRecordStore;
  agentRef: string;
  userId: string;
  env?: DesktopAgentRuntimeEnv;
}): Promise<AgentRuntimeAgentConfig | null> {
  // Local-first: hybrid store defaults use the local cache when present and
  // fall back to remote servers (caching the fetched record) on local miss.
  for (const key of buildAgentRuntimeAgentLookupKeys(args)) {
    const record = await args.store.read(key);
    if (!record || typeof record !== "object") continue;
    const agentConfig = resolveAgentRuntimeConfigFromRecord(
      key,
      {
        ...(record as Record<string, unknown>),
        dbKey: (record as Record<string, unknown>).dbKey ?? key,
      } as Record<string, unknown>,
    );
    if (!args.env) return agentConfig as AgentRuntimeAgentConfig;
    const enabled = await loadDesktopChromeConnectorEnabledFromRecordStore({
      store: args.store,
      userId: args.userId,
      env: args.env,
    });
    return applyDesktopChromeConnectorCapabilityPack({
      agentConfig,
      toolNames: agentConfig.toolNames ?? [],
      enabled,
    }) as AgentRuntimeAgentConfig;
  }
  // Fallback: if the record store has no entry for a known quick-chat tier
  // agent key, synthesize the platform config so desktop clients route to
  // the correct provider/model instead of falling back to `nolo`.
  return resolveBuiltinPlatformAgentConfig(args.agentRef) as AgentRuntimeAgentConfig | null;
}

export async function loadDesktopAgentRuntimeDialogHistoryFromRecordStore(args: {
  store: Pick<DesktopAgentRuntimeRecordStore, "iterator">;
  dialogId: string;
}): Promise<AgentRuntimeChatMessage[]> {
  if (!args.store.iterator) return [];
  const messages: AgentRuntimeChatMessage[] = [];
  const { start, end } = dialogMessageRange(args.dialogId);
  for await (const [, value] of args.store.iterator({ gte: start, lte: end })) {
    const message = dialogMessageRecordToAgentRuntimeMessage(value as Record<string, unknown>);
    if (message) messages.push(message);
  }
  return messages;
}

/**
 * Apply desktop tool-surface gating + optional Chrome connector pack after a
 * config is loaded from the record store or a request-scoped snapshot.
 */
export async function finalizeDesktopAgentRuntimeLoadedConfig(args: {
  agentConfig: AgentRuntimeAgentConfig;
  store: Pick<DesktopAgentRuntimeRecordStore, "read">;
  userId: string;
  env: DesktopAgentRuntimeEnv;
}): Promise<AgentRuntimeAgentConfig> {
  const rawRecord = (args.agentConfig as any).rawRecord ?? {};
  const ownerId = asOptionalTrimmedString(rawRecord.userId) ?? null;
  const agentKey = rawRecord.dbKey ?? args.agentConfig.key;
  const toolSurface = resolveRuntimeToolSurfaceForAgent({
    explicitToolNames: args.agentConfig.toolNames,
    currentUserId: args.userId,
    agentOwnerId: ownerId,
    agentKey,
    isPublic: rawRecord.isPublic === true,
    sharingLevel: typeof rawRecord.sharingLevel === "string" ? rawRecord.sharingLevel : null,
    trustedPrivateInvocation: isSystemBuiltinTrustedAgentKey(agentKey),
    runtimeHost: "desktop",
  });
  const chromeEnabled = await loadDesktopChromeConnectorEnabledFromRecordStore({
    store: args.store,
    userId: args.userId,
    env: args.env,
  });
  const gatedConfig = applyDesktopChromeConnectorCapabilityPack({
    agentConfig: args.agentConfig,
    toolNames: toolSurface.finalToolNames,
    enabled: chromeEnabled,
  });
  const finalToolNames = gatedConfig.toolNames ?? [];
  // 两条加载路径（record store / request-scoped snapshot）都汇入本函数：
  // 把 rawRecord 里被 resolveAgentRuntimeConfigFromRecord 丢弃的 enabledPacks 补回
  // config（工具展开读 agentConfig.enabledPacks），并把启用能力包的 promptPatch
  // 纪律追加进 prompt（桌面端 system prompt 直用 agentConfig.prompt，不经
  // buildSystemPrompt 的 skill-guidance 层）——与 web 端 skillPromptPatches 注入对齐。
  const enabledPacks =
    (gatedConfig as unknown as { enabledPacks?: string[] }).enabledPacks ??
    (rawRecord.enabledPacks as string[] | undefined);
  const prompt = appendEnabledPackPromptPatches(
    (gatedConfig as { prompt?: string }).prompt,
    enabledPacks,
  );
  return {
    ...gatedConfig,
    toolNames: finalToolNames,
    toolSurface: {
      ...toolSurface,
      finalToolNames,
      injectedToolNames: chromeEnabled
        ? uniqueToolNames([
            ...toolSurface.injectedToolNames,
            ...CHROME_CONNECTOR_TOOL_NAMES,
          ])
        : stripDesktopChromeConnectorToolNames(toolSurface.injectedToolNames),
    },
    ...(enabledPacks?.length ? { enabledPacks } : {}),
    ...(prompt ? { prompt } : {}),
  } as AgentRuntimeAgentConfig;
}

export function createDesktopAgentRuntimeRecordStoreReadActions(args: {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
}): Pick<DesktopAgentRuntimeActions, "loadAgentConfig" | "loadDialogHistory"> {
  const userId = resolveDesktopAgentRuntimeUserId(args.env);
  return {
    loadAgentConfig: async (agentRef) => {
      const agentConfig = await loadDesktopAgentRuntimeAgentConfigFromRecordStore({
        store: args.store,
        agentRef,
        userId,
        env: args.env,
      });
      if (!agentConfig) return agentConfig;
      return finalizeDesktopAgentRuntimeLoadedConfig({
        agentConfig,
        store: args.store,
        userId,
        env: args.env,
      });
    },
    loadDialogHistory: (dialogId) => loadDesktopAgentRuntimeDialogHistoryFromRecordStore({
      store: args.store,
      dialogId,
    }),
  };
}

/**
 * Wrap host actions with request-scoped snapshot overrides for this turn only.
 * - Matching agentRef → snapshot-derived config (never written to LevelDB).
 * - Matching dialogId → snapshot history (sanitized client known context).
 * - Other refs/dialogs still use the host store.
 * - When an agent snapshot is active for this turn, saveTurn is a no-op so the
 *   host LevelDB does not become a second message/agent truth (client owns persistence).
 */
export function createDesktopAgentRuntimeRequestScopedActions(args: {
  base: DesktopAgentRuntimeActions;
  env: DesktopAgentRuntimeEnv;
  store: Pick<DesktopAgentRuntimeRecordStore, "read">;
  turnAgentRef: string;
  agentConfigSnapshot?: DesktopAgentRuntimeAgentConfigSnapshot | null;
  dialogHistorySnapshot?: DesktopAgentRuntimeDialogHistorySnapshot | null;
  createId?: () => string;
}): DesktopAgentRuntimeActions {
  const userId = resolveDesktopAgentRuntimeUserId(args.env);
  const turnAgentRef = args.turnAgentRef.trim();
  const agentSnapshot =
    args.agentConfigSnapshot &&
    args.agentConfigSnapshot.dbKey === turnAgentRef
      ? args.agentConfigSnapshot
      : null;
  const historySnapshot = args.dialogHistorySnapshot ?? null;
  const createId = args.createId ?? (() => `ephemeral-${Date.now()}`);

  return {
    loadAgentConfig: async (agentRef) => {
      if (agentSnapshot && agentRef === turnAgentRef) {
        const fromSnapshot = agentRuntimeConfigFromDesktopSnapshot(agentSnapshot);
        return finalizeDesktopAgentRuntimeLoadedConfig({
          agentConfig: fromSnapshot,
          store: args.store,
          userId,
          env: args.env,
        });
      }
      return args.base.loadAgentConfig(agentRef);
    },
    loadDialogHistory: async (dialogId) => {
      if (historySnapshot && historySnapshot.dialogId === dialogId) {
        return historySnapshot.messages;
      }
      return args.base.loadDialogHistory(dialogId);
    },
    saveTurn: async (input) => {
      // Request-snapshot local agents: client owns browser IndexedDB persistence.
      // Host save would create a second truth in LevelDB — disable for this turn.
      if (agentSnapshot) {
        const continueId =
          asOptionalTrimmedString(input.continueDialogId) ?? createId();
        return { dialogId: continueId };
      }
      return args.base.saveTurn(input);
    },
    resolveProvider: (agentConfig) => args.base.resolveProvider(agentConfig),
    executeTool: (call) => args.base.executeTool(call),
  };
}

export async function saveDesktopAgentRuntimeTurnToRecordStore(args: {
  store: Pick<DesktopAgentRuntimeRecordStore, "read" | "batch">;
  input: AgentRuntimeSaveTurnInput;
  userId: string;
  now: () => number;
  createId: () => string;
  workspaceRoot?: string;
  workspaceAuthorized?: boolean;
}) {
  let existingDialog: Record<string, unknown> | null = null;
  if (args.input.continueDialogId) {
    const dialogKey = `dialog-${args.userId}-${args.input.continueDialogId}`;
    const record = await args.store.read(dialogKey, { remote: false });
    existingDialog = record && typeof record === "object" ? record as Record<string, unknown> : null;
  }

  const plan = buildAgentRuntimeDialogWritePlan({
    input: args.input,
    userId: args.userId,
    now: args.now(),
    createId: args.createId,
    existingDialog,
    runtimeHost: "desktop",
    runtimeMetadata: {
      ...(args.workspaceRoot ? { worktreePath: args.workspaceRoot } : {}),
      ...(args.workspaceRoot && args.workspaceAuthorized
        ? {
            workspaceKind:
              asOptionalTrimmedString(args.input.runtimeContext?.workspaceKind) ?? "current",
            workspaceAccess:
              asOptionalTrimmedString(args.input.runtimeContext?.workspaceAccess) ?? "authorized",
          }
        : {}),
    },
  });
  if (!args.store.batch) {
    throw new Error("Desktop agent runtime record store cannot save turns without batch support.");
  }
  const tokenOps: Array<{ type: "put"; key: string; value: Record<string, unknown> }> = [];
  let stats: any = null;
  const usageRecords = args.input.usageRecords ?? [];
  for (const item of usageRecords) {
    const timestamp = args.now();
    const prepared = prepareTokenUsageData({
      rawUsage: item.usage,
      agentConfig: args.input.billingConfig ?? {
        model: item.model,
        provider: item.provider,
      },
      userId: args.userId,
      agentId: args.input.agentKey,
      dialogId: plan.dialogId,
      timestamp,
      entry_path: "desktop-local",
    });
    const tokenKey = createTokenKey.recordForStableCall(args.userId, item.callId);
    const existingToken = await args.store.read(tokenKey, { remote: false }).catch(() => null);
    if (existingToken) continue;
    tokenOps.push({
      type: "put",
      key: tokenKey,
      value: {
        id: args.createId(),
        type: "token",
        ...prepared.tokenData,
      },
    });
    const dateKey = format(timestamp, "yyyy-MM-dd");
    const statsKey = createTokenStatsKey(args.userId, dateKey);
    if (stats === null) {
      stats = await args.store.read(statsKey, { remote: false }).catch(() => null);
    }
    stats = applyTokenUsageToDayStats(stats, {
      userId: args.userId,
      timeKey: dateKey,
      model: prepared.billedModel,
      provider: prepared.recordProvider,
      input_tokens: prepared.usage.input_tokens,
      output_tokens: prepared.usage.output_tokens,
      cost: prepared.tokenData.cost,
      cache_read_input_tokens: prepared.usage.cache_read_input_tokens,
      cache_creation_input_tokens: prepared.usage.cache_creation_input_tokens,
      agentId: prepared.tokenData.agentId ?? prepared.tokenData.cybotId,
      entry_path: prepared.tokenData.entry_path,
      billingCategory: (prepared.tokenData.billable ?? false) ? "platform" : "subscription",
    });
    const existingStatsIndex = tokenOps.findIndex((op) => op.key === statsKey);
    const statsOp = {
      type: "put" as const,
      key: statsKey,
      value: { ...stats, id: statsKey, type: "token" },
    };
    if (existingStatsIndex >= 0) tokenOps[existingStatsIndex] = statsOp;
    else tokenOps.push(statsOp);
  }
  await args.store.batch([...plan.ops, ...tokenOps]);
  return { dialogId: plan.dialogId, title: plan.title };
}

export function createDesktopAgentRuntimeRecordStoreActions(args: {
  env: DesktopAgentRuntimeEnv;
  store: DesktopAgentRuntimeRecordStore;
  now: () => number;
  createId: () => string;
  workspaceRoot?: string;
  workspaceAuthorized?: boolean;
  getWorkspaceRoot?: () => string | undefined;
  getWorkspaceAuthorized?: () => boolean;
  resolveProvider: DesktopAgentRuntimeActions["resolveProvider"];
  executeTool: DesktopAgentRuntimeActions["executeTool"];
}): DesktopAgentRuntimeActions {
  const userId = resolveDesktopAgentRuntimeUserId(args.env);
  return {
    ...createDesktopAgentRuntimeRecordStoreReadActions({
      env: args.env,
      store: args.store,
    }),
    saveTurn: (input) => saveDesktopAgentRuntimeTurnToRecordStore({
      store: args.store,
      input,
      userId,
      now: args.now,
      createId: args.createId,
      workspaceRoot: args.getWorkspaceRoot?.() ?? args.workspaceRoot,
      workspaceAuthorized: args.getWorkspaceAuthorized?.() ?? args.workspaceAuthorized,
    }),
    resolveProvider: args.resolveProvider,
    executeTool: args.executeTool,
  };
}

/**
 * 桌面端访问远端（集群服务器）的「响应开始」超时（等首包，不是整段 stream）。
 * 只用于平台代理路径；OpenAI 兼容直连（可能是本地慢模型）不套用此默认值。
 *
 * 10s 对 glm 等慢首包 / 大 context 多轮会误杀（见 dialog 日志
 * `platform chat request timed out after 10000ms before response start`）。
 * 与 server agentRun 默认 LLM 请求超时对齐为 5min。
 */
export const DESKTOP_REMOTE_REQUEST_TIMEOUT_MS = 300_000;

/** 从集群列表里去掉主站，得到按序尝试的 fallback 服务器（仅主站失败后才使用）。 */
export function resolveDesktopAgentRuntimeServerFallbacks(args: {
  primaryServer: string;
}): string[] {
  const primary = normalizeServerOrigin(args.primaryServer);
  return NOLO_CLUSTER_SERVERS
    .map((s) => normalizeServerOrigin(s))
    .filter((s) => s && s !== primary);
}

export async function resolveDesktopOpenAiCompatibleProvider(args: {
  env: DesktopAgentRuntimeEnv;
  agentConfig: AgentRuntimeAgentConfig;
  fetchImpl?: typeof fetch;
  tools?: Record<string, unknown>[];
  /** Host credential broker; defaults to createDesktopHostCredentialBroker(). */
  credentialBroker?: CredentialBroker;
}): Promise<AgentRuntimeProvider> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const credentialBroker =
    args.credentialBroker ?? createDesktopHostCredentialBroker();
  const providerConfig = await resolveOpenAiCompatibleProviderConfig({
    agentConfig: args.agentConfig,
    env: args.env,
    credentialBroker,
  });
  return {
    model: providerConfig.model,
    complete: async (messages, options) =>
      executeOpenAiCompatibleChatCompletion({
        providerConfig,
        messages,
        tools: args.tools as any,
        fetchImpl,
        // 透传 onReasoningDelta（与 platformChatProvider 双回调条件对齐）：
        // 实时 thinking SSE 在生产链路才会触发。
        stream: Boolean(options?.onTextDelta || options?.onReasoningDelta),
        ...(options?.onTextDelta ? { onTextDelta: options.onTextDelta } : {}),
        ...(options?.onReasoningDelta
          ? { onReasoningDelta: options.onReasoningDelta }
          : {}),
      }),
  };
}

export async function resolveDesktopPlatformChatProvider(args: {
  env: DesktopAgentRuntimeEnv;
  agentConfig: AgentRuntimeAgentConfig;
  fetchImpl?: typeof fetch;
  tools?: Record<string, unknown>[];
  fallbackServers?: string[];
  requestTimeoutMs?: number;
  /** Host credential broker; defaults to createDesktopHostCredentialBroker(). */
  credentialBroker?: CredentialBroker;
}): Promise<AgentRuntimeProvider> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const credentialBroker =
    args.credentialBroker ?? createDesktopHostCredentialBroker();
  const providerConfig = await resolvePlatformChatProviderConfig({
    agentConfig: args.agentConfig,
    env: args.env,
    credentialBroker,
  });
  const fallbackServers =
    args.fallbackServers ??
    resolveDesktopAgentRuntimeServerFallbacks({
      primaryServer: providerConfig.serverUrl,
    });
  return {
    model: providerConfig.model,
    complete: async (messages, options) =>
      executePlatformChatCompletionWithFallback({
        providerConfig,
        messages,
        tools: args.tools as any,
        fetchImpl,
        serverUrls: [providerConfig.serverUrl, ...fallbackServers],
        ...(options?.dialogId ? { dialogId: options.dialogId } : {}),
        ...(args.requestTimeoutMs ? { requestTimeoutMs: args.requestTimeoutMs } : {}),
        // 双回调条件对齐 platformChatProvider：onReasoningDelta 也要触发流式。
        stream: Boolean(options?.onTextDelta || options?.onReasoningDelta),
        ...(options?.onTextDelta ? { onTextDelta: options.onTextDelta } : {}),
        ...(options?.onReasoningDelta
          ? { onReasoningDelta: options.onReasoningDelta }
          : {}),
      }),
  };
}

export async function resolveDesktopConfiguredProvider(args: {
  env: DesktopAgentRuntimeEnv;
  agentConfig: AgentRuntimeAgentConfig;
  fetchImpl?: typeof fetch;
  tools?: Record<string, unknown>[];
  requestTimeoutMs?: number;
  credentialBroker?: CredentialBroker;
  apiKeyRefResolver?: ApiKeyRefResolver;
  oauthTokenStore?: OAuthTokenStore;
  /** Optional tool executor — passed through to the cursor provider so its
   * inline exec channel can bridge to nolo tools. Other providers ignore it. */
  executeTool?: (call: AgentRuntimeToolCallInput) => Promise<AgentRuntimeToolResult>;
}): Promise<AgentRuntimeProvider> {
  const callPlan = resolveAgentCallPlan(args.agentConfig, args.env);
  if (callPlan.authMethod.kind === "oauth") {
    const ref = callPlan.authMethod.ref;
    const resolver = args.apiKeyRefResolver ?? (await import(
      "../../cli/oauth/apiKeyRefResolver"
    )).createOAuthApiKeyRefResolver();
    const accessToken = await resolver(ref);
    if (!accessToken) {
      throw new Error(`OAuth credential for "${ref}" not found locally. Run \`nolo auth ${ref}\`.`);
    }
    const fetchImpl = args.fetchImpl ?? fetch;
    const tools = args.tools ?? [];
    const model = args.agentConfig.model || "";
    const completeFromOpenAiShape = (
      body: Record<string, any>,
      messages: AgentRuntimeChatMessage[],
      onTextDelta?: (chunk: string) => void,
    ) => {
      const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
      const message = choice?.message ?? {};
      const content = typeof message.content === "string" ? message.content : "";
      if (content && onTextDelta) onTextDelta(content);
      return {
        content,
        model: String(body.model || model),
        provider: args.agentConfig.provider || ref,
        ...(Array.isArray(message.tool_calls) ? { tool_calls: message.tool_calls } : {}),
        // 透传收尾元数据：finish_reason 让消费方区分「正常说完/撞长度/要调工具」，
        // stream_complete 证明聚合后的 body 已完整（desktop 空轮同样有误报截断风险）。
        finish_reason: typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined,
        stream_complete: true,
        ...(body.usage ? { usage: body.usage } : {}),
        trace: messages,
      };
    };
    const openAiBody = (messages: AgentRuntimeChatMessage[]) => ({
      model,
      messages,
      stream: false,
      ...(tools.length > 0 ? { tools } : {}),
    });

    if (ref === "claude") {
      return {
        model,
        complete: async (messages, options) => {
          const result = await fetchAnthropicMessagesCompletion({
            agentConfig: args.agentConfig,
            accessToken,
            openAiBody: openAiBody(messages),
            fetchImpl,
          });
          if (result.status !== 200) {
            await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
            throw new Error(`local Claude OAuth provider failed: HTTP ${result.status} ${JSON.stringify(result.body)}`);
          }
          await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
          return completeFromOpenAiShape(result.body, messages, options?.onTextDelta);
        },
      };
    }

    if (ref === "chatgpt") {
      const credential = (args.oauthTokenStore ?? createOAuthTokenStore()).read("chatgpt");
      return {
        model,
        complete: async (messages, options) => {
          const result = await fetchCodexResponsesCompletion({
            agentConfig: args.agentConfig,
            accessToken,
            accountId: credential?.accountId,
            openAiBody: openAiBody(messages),
            fetchImpl,
          });
          if (result.status !== 200) {
            await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
            throw new Error(`local ChatGPT OAuth provider failed: HTTP ${result.status} ${JSON.stringify(result.body)}`);
          }
          await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
          return completeFromOpenAiShape(result.body, messages, options?.onTextDelta);
        },
      };
    }

    if (ref === "antigravity") {
      const credential = (args.oauthTokenStore ?? createOAuthTokenStore()).read("antigravity");
      return {
        model,
        complete: async (messages, options) => {
          const result = await fetchAntigravityCloudCodeCompletion({
            agentConfig: args.agentConfig,
            accessToken,
            metadata: credential?.metadata ?? null,
            openAiBody: openAiBody(messages),
            onTextDelta: options?.onTextDelta,
            onReasoningDelta: options?.onReasoningDelta,
            fetchImpl,
          });
          if (result.status !== 200) {
            await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
            throw new Error(`local Antigravity OAuth provider failed: HTTP ${result.status} ${JSON.stringify(result.body)}`);
          }
          await recordAgentAvailabilityFromResponse({ agent: args.agentConfig as any, status: result.status, body: result.body });
          return completeFromOpenAiShape(result.body, messages);
        },
      };
    }

    // Cursor uses a private ConnectRPC + protobuf protocol (HTTP/2), not
    // OpenAI-compatible REST. Route through the dedicated cursorProvider.
    if (ref === "cursor") {
      const { createCursorProvider } = await import(
        "../../agent-runtime/cursor/cursorProvider"
      );
      const cursorProvider = createCursorProvider({
        accessToken,
        model,
        systemPrompt: args.agentConfig.prompt?.trim() || undefined,
        ...(tools.length > 0 ? { tools: tools as any } : {}),
        ...(args.executeTool ? { executeTool: args.executeTool } : {}),
      });
      return {
        model,
        complete: async (messages, options) => {
          const result = await cursorProvider.complete(messages, options);
          return result;
        },
      };
    }

    return {
      model,
      complete: (messages, options) => executeOpenAiCompatibleChatCompletion({
        providerConfig: {
          model,
          endpoint: callPlan.endpoint,
          apiKey: accessToken,
          provider: args.agentConfig.provider || "xai",
          requestOptions: pickAgentRuntimeInferenceOptions(args.agentConfig),
        },
        messages,
        tools: tools as any,
        fetchImpl,
        // 透传 onReasoningDelta，保持与上面两处 complete 包装器一致。
        stream: Boolean(options?.onTextDelta || options?.onReasoningDelta),
        ...(options?.onTextDelta ? { onTextDelta: options.onTextDelta } : {}),
        ...(options?.onReasoningDelta
          ? { onReasoningDelta: options.onReasoningDelta }
          : {}),
      }),
    };
  }

  const { requestTimeoutMs, ...rest } = args;
  if (shouldUsePlatformChatProvider(args.env, args.agentConfig)) {
    return resolveDesktopPlatformChatProvider({
      ...rest,
      ...(requestTimeoutMs ? { requestTimeoutMs } : {}),
    });
  }
  // OpenAI 兼容直连不套用集群超时默认值（可能是本地慢模型），仅平台路径限时。
  return resolveDesktopOpenAiCompatibleProvider(rest);
}

export async function loadDesktopAgentRuntimeAgentConfig(args: {
  actions: Pick<DesktopAgentRuntimeActions, "loadAgentConfig">;
  agentRef: string;
}) {
  return args.actions.loadAgentConfig(args.agentRef);
}

export async function loadDesktopAgentRuntimeDialogHistory(args: {
  actions: Pick<DesktopAgentRuntimeActions, "loadDialogHistory">;
  dialogId: string;
}) {
  return args.actions.loadDialogHistory(args.dialogId);
}

export async function saveDesktopAgentRuntimeTurn(args: {
  actions: Pick<DesktopAgentRuntimeActions, "saveTurn">;
  input: AgentRuntimeSaveTurnInput;
}) {
  return args.actions.saveTurn(args.input);
}

export async function resolveDesktopAgentRuntimeProvider(args: {
  actions: Pick<DesktopAgentRuntimeActions, "resolveProvider">;
  agentConfig: AgentRuntimeAgentConfig;
}) {
  return args.actions.resolveProvider(args.agentConfig);
}

export async function executeDesktopAgentRuntimeToolCall(args: {
  actions: Pick<DesktopAgentRuntimeActions, "executeTool">;
  call: AgentRuntimeToolCallInput;
}) {
  return args.actions.executeTool(args.call);
}

export function createDesktopAgentRuntimeAdapter(args: {
  env: DesktopAgentRuntimeEnv;
  actions: DesktopAgentRuntimeActions;
  capabilities?: string[];
}): AgentRuntimeHostAdapter {
  const facts = describeDesktopAgentRuntimeHostFacts(args.env);

  return {
    host: "desktop",
    capabilities: [...new Set([...facts.capabilities, ...(args.capabilities ?? [])])],
    loadAgentConfig: (agentRef) => loadDesktopAgentRuntimeAgentConfig({
      actions: args.actions,
      agentRef,
    }),
    loadDialogHistory: (dialogId) => loadDesktopAgentRuntimeDialogHistory({
      actions: args.actions,
      dialogId,
    }),
    saveTurn: (input) => saveDesktopAgentRuntimeTurn({
      actions: args.actions,
      input,
    }),
    resolveProvider: (agentConfig) => resolveDesktopAgentRuntimeProvider({
      actions: args.actions,
      agentConfig,
    }),
    executeTool: (call) => executeDesktopAgentRuntimeToolCall({
      actions: args.actions,
      call,
    }),
  };
}
