import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeHostAdapter,
  AgentRuntimeSaveTurnInput,
} from "../agentRuntimeLocal";
import { resolveLocalProvider } from "./providerResolution/resolveLocalProvider";
import type { ProviderResolutionContext } from "./providerResolution/providerResolutionContext";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeProvider,
  AgentRuntimeResult,
  AgentRuntimeToolCall,
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
} from "../../agent-runtime";
import type { PermissionRequest } from "../../agent-runtime/actionGate";

/**
 * Interactive choice request surfaced by the local `ask_user` executor.
 * When a `requestUserChoice` callback is wired (interactive TUI), the executor
 * calls it to show an arrow-key select dialog docked above the composer; the
 * resolved userMessage becomes the next user turn. When absent (headless / CI /
 * non-TTY), the executor falls back to returning the raw JSON payload and the
 * toolOutput renderer prints a numbered text menu.
 */
import {
  readDialogFromLocalDb,
  type LocalDialogReadResult,
} from "../../agent-runtime/localDialogRead";
import type {
  LocalAgentTurnInput,
  LocalAgentTurnResult,
} from "../../agent-runtime/localLoop";
import type { CliKvDb, HybridRecordStore } from "./hybridRecordStore";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";
import { createTokenKey, createUserKey, dialogMessageRange } from "../../database/keys";
import { prepareTokenUsageData } from "../../ai/token/prepareTokenUsageData";
import { inlineImageUrlsForCustomProvider } from "../../ai/chat/inlineImageUrlsForCustomProvider";
import {
  LOCAL_CODEX_AGENT_ID,
  LOCAL_CODEX_AGENT_KEY,
  NOLO_DEFAULT_AGENT_ID,
  NOLO_DEFAULT_AGENT_KEY,
} from "../agentAliases";
import { isCompiledBinary } from "../cliEnvHelpers";
import type { CliFetchImpl } from "../cliFetch";
import { clipCompactText } from "core/clipCompactText";
import type { CollapsedPasteStore } from "core/collapsedPaste";
import { normalizeAgentHandle } from "core/agentHandle";
import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import { summarizeEndpoint } from "core/summarizeEndpoint";

/**
 * Heavy agent-runtime / AI / local-DB modules are top-level static imports.
 *
 * Rationale: the publish pipeline (buildPublish.ts) bundles index.ts into a
 * single-file index.js via esbuild. esbuild cannot statically analyze
 * createRequire() dynamic paths, so any `require("...ts")` residual survives
 * in the bundle verbatim; the published package ships only index.js + README
 * (no .ts files), so at runtime the require resolves to a path outside the
 * package and throws MODULE_NOT_FOUND on first local-runtime use. Static
 * imports let esbuild inline every dependency into the single-file bundle.
 *
 * Paths below must remain present as import specifiers (without .ts
 * extension) for source-contract tests (e.g. fileCredentialBroker wiring).
 */

export type CliExecuteResult = {
  text: string;
  raw?: string;
  elapsed?: number;
};
export type CliImageInput = { source: string };
import type { ReadToolFn } from "./cliLocalToolExecutors";
import {
  isBusyProviderStreamError,
  withProviderStreamRetry,
} from "./providerStreamRetry";

import {
  resolveRuntimeServerUrl as _resolveRuntimeServerUrl,
  resolveRuntimeAuthToken as _resolveRuntimeAuthToken,
  remoteDialogSyncTimeout as _remoteDialogSyncTimeout,
  setRemoteDialogSyncTimeoutForTest as _setRemoteDialogSyncTimeoutForTest,
  type EnvLike,
} from "./localRuntimeHelpers";
// Re-export for test compatibility (existing imports from localRuntimeAdapter).
export { setRemoteDialogSyncTimeoutForTest } from "./localRuntimeHelpers";
import {
  postRemoteRecord,
  syncLocalDialogEvidenceToRemote,
  prepareRemoteDialogEvidenceRecord,
} from "./cliRemoteDialogSync";
// Re-export for test/external compatibility (agentRun.ts imports from localRuntimeAdapter).
export {
  postRemoteRecord,
  syncLocalDialogEvidenceToRemote,
  prepareRemoteDialogEvidenceRecord,
} from "./cliRemoteDialogSync";
// Resolve at call-site level — the helpers module owns the canonical implementations.
const resolveRuntimeServerUrl = _resolveRuntimeServerUrl;
const resolveRuntimeAuthToken = _resolveRuntimeAuthToken;
const remoteDialogSyncTimeout = _remoteDialogSyncTimeout;

// Fetch retry + loopback bypass extracted to localRuntimeFetchRetry.ts.
// Re-exported here (barrel) so existing `from "./localRuntimeAdapter"` imports
// keep working. isLoopbackUrl now reuses core/localOrigins for single-source
// loopback detection (previously duplicated here).
export {
  fetchWithTransientRetry,
  isLoopbackUrl,
  defaultLoopbackRequest,
  type FetchInput,
  type FetchInit,
} from "./localRuntimeFetchRetry";
import {
  fetchWithTransientRetry,
  defaultLoopbackRequest,
  type FetchInput,
  type FetchInit,
} from "./localRuntimeFetchRetry";

// The server can explicitly reject new platform-chat admissions with
// `503 core_draining` for the duration of a single-origin PM2 deploy. These
// responses are safe to retry because the provider call was not started.
// Keep 502/504 terminal: they are ambiguous without durable turn idempotency.
// The long drain budget is now handled inside `fetchWithTransientRetry`
// (core_draining responses only), so no platform-specific constant is needed.
import {
  parseLocalToolBudgets,
  resolveExecShellDetachMs,
  assertWithinLocalToolBudget,
} from "./cliLocalToolBudget";
import {
  resolveBuiltinLocalCliAgentConfig,
  readAgentFromStore,
  readDialogMessages,
} from "./cliLocalAgentRecordReader";
import {
  shouldUseDeclaredOnlyLocalWorkspaceTools,
} from "./cliWorkspaceToolVariants";
import {
  parseJsonObject,
  isCliProviderAgent,
  resolveCliProviderName,
  stringifyRuntimeMessageContent,
  buildPromptForCliProvider,
  collectCliProviderImageInputs,
  buildDelegatedTaskContent,
} from "./cliProviderHelpers";
export {
  BUILTIN_NOLO_AGENT_KEY,
  isBuiltinNoloAgentRef,
  isBuiltinNoloAgentConfig,
  withResolvedRuntimeToolSurface,
  resolveLocalUserId,
  extractLastUserText,
  localTurnHasSubjectRefs,
} from "./cliAgentConfigHelpers";
import {
  BUILTIN_NOLO_AGENT_KEY,
  isBuiltinNoloAgentRef,
  isBuiltinNoloAgentConfig,
  withResolvedRuntimeToolSurface,
  resolveLocalUserId,
  extractLastUserText,
  localTurnHasSubjectRefs,
} from "./cliAgentConfigHelpers";
export {
  LOCAL_SERVER_TABLE_TOOL_NAMES,
  LOCAL_SERVER_TABLE_TOOL_NAME_SET,
  LOCAL_SERVER_WEB_TOOL_NAMES,
  LOCAL_SERVER_WEB_TOOL_NAME_SET,
  REGISTRY_INJECTED_TOOL_NAMES,
} from "./cliToolClassification";
import {
  LOCAL_SERVER_TABLE_TOOL_NAMES,
  LOCAL_SERVER_TABLE_TOOL_NAME_SET,
  LOCAL_SERVER_WEB_TOOL_NAMES,
  LOCAL_SERVER_WEB_TOOL_NAME_SET,
} from "./cliToolClassification";
import { buildServerPlatformToolExecutors } from "./cliServerPlatformToolExecutors";
export type {
  UserChoiceOption,
  UserChoiceRequest,
  UserChoiceResult,
  CliLocalRuntimeDb,
} from "./localRuntimeAdapterTypes";
import type {
  UserChoiceOption,
  UserChoiceRequest,
  UserChoiceResult,
  CliLocalRuntimeDb,
} from "./localRuntimeAdapterTypes";
import {
  buildLocalToolExecutors,
  buildCliWorkspaceToolExecutors,
} from "./cliLocalToolExecutors";
// Direct static imports replace the former lazy ensureHeavyCliLocalRuntimeModules
// indirection — see the rationale block at the top of this file.
import {
  buildLocalWorkspaceToolset,
  buildLocalWorkspaceOpenAiTools,
  executeOpenAiCompatibleChatCompletion,
  readOpenAiCompatibleSseCompletion,
  readPlatformChatSseCompletion,
  buildPlatformChatCompletionRequest,
  createLocalWorkspaceToolExecutors,
  parsePlatformChatCompletionData,
  parsePlatformChatCompletionResponse,
  resolvePlatformChatProviderConfig,
  resolveCurrentRunRuntimeToolPolicy,
  resolveLocalWorkspaceExecutorOptionsFromPolicy,
  resolveRequestedRuntimeToolNames,
  resolveRuntimeToolSurfaceForAgent,
  shouldUsePlatformChatProvider,
  canUsePlatformChatProvider,
} from "../agentRuntimeLocal";
import { fetchAntigravityCloudCodeCompletion } from "../../agent-runtime/antigravityCloudCodeProvider";
import { isAntigravityOAuthAgent } from "../../agent-runtime/antigravityOAuth";
import { isOAuthApiKeyRef } from "../../agent-runtime/serverProxyPolicy";
import {
  OWNER_ORIGIN_EXECUTION_VERSION,
  projectToolExecutionLocation,
  type OwnerOriginExecution,
} from "../../agent-runtime/ownerOriginExecution";
import {
  extractShellCommandPreview,
  requiresShellSessionGrant,
} from "./originShellGrant";
import {
  accumulateGeminiChunks,
  buildGeminiGenerateContentRequest,
  isGemini3Model,
  shouldUseGeminiNativeToolRoute,
} from "../../agent-runtime/geminiNativeShared";
import { readSseDataValues } from "../../agent-runtime/sseFrames";
import { parseSseDataLineJson } from "../../agent-runtime/sseDataLine";
import {
  fetchAnthropicMessagesCompletion,
  isAnthropicOAuthAgent,
} from "../../agent-runtime/anthropicMessagesProvider";
import {
  mergeAvailabilityDeadline,
  resolveAvailabilityAction,
  resolveCooldownGate,
} from "ai/agent/agentAvailabilityShared";
import { deriveCredentialGroup, deriveCustomProviderCredentialGroup } from "ai/agent/safeAgentSummary";
import {
  clearCredentialAvailability,
  markCredentialUnavailable,
  readCredentialAvailability,
  readCredentialEntry,
  recordCredentialProbe,
  resolveCredentialKeyWithFallback,
} from "../credentialAvailability";
import {
  fetchCodexResponsesCompletion,
  isCodexOAuthAgent,
} from "../../agent-runtime/codexResponsesProvider";
import { readOAuthCredential } from "../../agent-runtime/oauthTokenStore";
import { getDefaultCliLocalRuntimeDb } from "../localRuntimeDb";
import { resolveAgentRuntimeConfigFromRecord } from "./agentConfigResolver";
import { resolveCliOpenAiProviderConfig } from "./localProviderResolver";
import { createFileCredentialBroker } from "../../agent-runtime/fileCredentialBroker";
import { fetchServerSyncedCredential } from "../../ai/chat/agentCredentialSyncClient";
import { getServerProviderSecret } from "../../ai/agent/providerSecrets";
import { createOAuthApiKeyRefResolver } from "../oauth/apiKeyRefResolver";
import {
  buildLocalDialogWritePlan,
  localDialogMessageRecordToRuntimeMessage,
} from "./localDialogRecords";
import { buildLocalAgentLookupKeys } from "./localAgentRecords";
import { createCliHybridRecordStore } from "./hybridRecordStore";
import { executeLocalToolWithPolicy, resolveLocalToolPolicy } from "./localToolPolicy";
import { normalizeLocalToolName } from "../../agent-runtime/localToolPolicy";
import { getAgentRuntimeToolParametersIndex } from "../agentRuntimeLocal";
import { inferCaptureIntent } from "../../ai/policy/runtimePolicy";
import {
  TOOL_PACKS,
  applyDisabledTools,
  expandEnabledPacks,
  resolveEffectiveEnabledPacks,
  applySystemBuiltinSkillFilter,
  appendEnabledPackPromptPatches,
  addDefaultLightWebToolsForConfiguredAgents,
} from "../../ai/tools/toolPacks";
import { prepareTools } from "../../ai/tools/prepareTools";
import { canonicalizeToolNames } from "../../ai/tools/toolNameAliases";
import {
  buildNoloWorkspaceOpenAiTools,
  parseNoloWorkspaceToolArguments,
} from "../../agent-runtime/noloWorkspaceTools";
import {
  buildNoloWorkspaceCliToolExecutors,
} from "../../agent-runtime/noloWorkspaceTools.node";
import {
  executeCli as defaultExecuteCli,
  CliProviderQuotaError,
} from "../../ai/agent/cliExecutor";
import { buildCliPrompt } from "../../ai/agent/cliPrompt";
import {
  readXhsProfileFunc,
  readXhsProfileFunctionSchema,
} from "../../ai/tools/readXhsProfileTool";
import {
  readXPostFunc,
  readXPostFunctionSchema,
} from "../../ai/tools/readXPostTool";
// Schema-only import: the executor lives in cliServerPlatformToolExecutors
// (bridges to /api/memory/remember). Importing rememberMemoryTool itself would
// pull Redux into the CLI bundle.
import { rememberMemoryFunctionSchema } from "../../ai/tools/rememberMemoryToolSchema";
import { ulid } from "ulid";

export type LocalCliExecutor = (
  provider: string,
  prompt: string,
  options: {
    model?: string;
    timeout?: number;
    cwd?: string;
    yolo?: boolean;
    env?: Record<string, string | undefined>;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh" | "max";
    imageInputs?: CliImageInput[];
  },
) => Promise<CliExecuteResult>;

// Max wait for remote dialog-evidence sync fetches (POST write / GET read)
// before aborting, so an unreachable/hung server cannot stall a turn.
const currentMetaFile = fileURLToPath(import.meta.url);
const isJsBundle = extname(currentMetaFile) === ".js";
const SOURCE_CLI_DIR = isJsBundle
  ? dirname(currentMetaFile)
  : dirname(dirname(currentMetaFile));
const CLI_DIR = isCompiledBinary() ? dirname(process.execPath) : SOURCE_CLI_DIR;
// Mirror the source/compiled extension so workspace tools can re-launch the
// same CLI entrypoint in both repo development (bun + .ts) and published
// packages (node + .js). Using a hardcoded .ts breaks installed packages.
const CLI_ENTRYPOINT = isCompiledBinary()
  ? process.execPath
  : isJsBundle
    ? currentMetaFile
    : join(SOURCE_CLI_DIR, "index.ts");

export {
  normalizeRuntimeCacheCwd,
  buildPreparedAgentCacheKey,
  clearCliLocalRuntimePreparedAgentCache,
  defaultLocalRuntimeDb,
  createFallbackId,
  logLocalRuntimeDiagnostic,
  summarizeOpenAiToolNames,
  preparedAgentRuntimeCache,
  hybridStoreCache,
  type CliLocalRuntimeAdapterDeps,
  type PreparedAgentRuntime,
} from "./localRuntimeDiagnostics";
import {
  normalizeRuntimeCacheCwd,
  buildPreparedAgentCacheKey,
  defaultLocalRuntimeDb,
  createFallbackId,
  logLocalRuntimeDiagnostic,
  summarizeOpenAiToolNames,
  preparedAgentRuntimeCache,
  hybridStoreCache,
  type CliLocalRuntimeAdapterDeps,
} from "./localRuntimeDiagnostics";

export {
  buildOpenAiTools,
  resolveCliEffectiveEnabledPacks,
  resolveCliRequestedToolNames,
  buildLocalPolicyToolNames,
  resolveProviderOpenAiToolBundle,
  buildLocalWorkspaceToolsetForEnv,
  buildServerPlatformOpenAiTools,
  withRuntimeEnabledPacksAndPrompt,
} from "./localRuntimeTools";
import {
  buildOpenAiTools,
  resolveCliRequestedToolNames,
  buildLocalPolicyToolNames,
  resolveProviderOpenAiToolBundle,
  withRuntimeEnabledPacksAndPrompt,
} from "./localRuntimeTools";

export {
  resolveStore,
  getOrCreateSharedStore,
  createLocalDialogTitleGenerator,
  writeLocalTokenRecord,
  writeDialog,
  resolveCliDialogRecordKey,
  loadCliDialogSummary,
  saveCliDialogSummary,
  loadCliDialogLastContextUsage,
} from "./localRuntimeDialog";
import {
  getOrCreateSharedStore,
  createLocalDialogTitleGenerator,
  writeDialog,
  loadCliDialogSummary,
  saveCliDialogSummary,
  loadCliDialogLastContextUsage,
} from "./localRuntimeDialog";

/**
 * 「一次上游响应 → 可用性落盘」的可复用核心（模块级导出）。
 *
 * 与 run 中途路径（resolveProviderBase 里的 `recordLocalAvailability` 闭包）完全
 * 同语义：resolveAvailabilityAction 解析 status/body → credential 级优先写盘 →
 * agent 级 nextAvailableAt（merge 取更晚者）。中途路径直接复用它；agent run
 * 启动期路径（agentRun.ts 在 classifyLocalRunError 命中 rate-limit 时）经
 * adapter 扩展方法 `recordStartupAvailabilityForAgent` 复用，保证两条路径的
 * 判据、clamp、merge 语义不漂移。
 *
 * 返回 mark 时**最终生效**的冷却截止（agent 级与 credential 级取更晚者），
 * 供调用方渲染「已标记冷却至 <ISO>」文案；clear/noop/跳过返回 undefined。
 */
export async function recordLocalAvailabilityForAgent(args: {
  deps: CliLocalRuntimeAdapterDeps;
  agentConfig: unknown;
  status: number;
  body?: unknown;
  now?: () => number;
}): Promise<number | undefined> {
  const now = args.now ?? Date.now;
  const { deps, status } = args;
  const agentConfig = args.agentConfig as Record<string, unknown> | undefined;
  const key = typeof agentConfig?.key === "string" ? agentConfig.key : "";
  if (!key) return undefined;
  const action = resolveAvailabilityAction(status, args.body, now());
  if (action.kind === "noop") return undefined;

  // Credential 层优先：限流是 provider 凭证的属性，不是 agent 的属性。
  // 共用同一 OAuth（chatgpt / claude / antigravity）的多个 agent 必须
  // 共享冷却，否则会逐个重复撞同一堵墙。
  //
  // 这一步还修掉了下面 agent 级写回的一个真实缺陷：agent 定义来自远端
  // global-cache 时本地并无记录，`if (!current) return` 会把 429 结论
  // 静默丢弃，nextAvailableAt 永远是 now。credential 存储不依赖 agent
  // 记录是否存在，因此即使本地没缓存过该 agent，冷却也能落盘。
  const credentialKey = resolveCredentialKeyWithFallback(agentConfig);
  if (credentialKey) {
    if (action.kind === "mark") {
      await markCredentialUnavailable(
        credentialKey,
        action.nextAvailableAt,
        deps.env,
        now(),
      ).catch(() => undefined);
    } else {
      await clearCredentialAvailability(
        credentialKey,
        deps.env,
        now(),
      ).catch(() => undefined);
    }
  }

  const store = await getOrCreateSharedStore(deps);
  const current = await store.read(key, { remote: false }).catch(() => null);
  // 本地没有该 agent 的记录时不再往 agent store 里补写半条记录——
  // 冷却已经落在 credential 层，这里只负责维护既有的 agent 级字段。
  if (!current || typeof current !== "object") {
    // 本地无 agent 记录时，冷却只落在 credential 层；回报 credential 的截止。
    if (action.kind !== "mark" || !credentialKey) return undefined;
    const entry = await readCredentialEntry(credentialKey, deps.env, now()).catch(
      () => undefined,
    );
    return typeof entry?.nextAvailableAt === "number"
      ? entry.nextAvailableAt
      : action.nextAvailableAt;
  }
  const record = current as Record<string, unknown>;
  // 无 deadline 时的 clear 是空操作，跳过可避免每次成功响应都写一次库。
  if (action.kind === "clear" && !("nextAvailableAt" in record)) return undefined;
  const next = { ...record };
  let effectiveNextAvailableAt: number | undefined;
  if (action.kind === "mark") {
    // 取更晚者：短冷却（如 5xx 的 5 分钟）不得抹掉已落盘的长冷却（如周额度）。
    const merged = mergeAvailabilityDeadline(
      record.nextAvailableAt,
      action.nextAvailableAt,
    );
    next.nextAvailableAt = merged;
    effectiveNextAvailableAt = merged;
  } else {
    delete next.nextAvailableAt;
  }
  await store.write(key, next).catch(() => undefined);

  if (action.kind !== "mark") return undefined;
  // 与派发 gate 的 effective 口径一致：agent 级与 credential 级取更晚者，
  // 避免文案报的截止早于实际拦截时刻。
  if (credentialKey) {
    const entry = await readCredentialEntry(credentialKey, deps.env, now()).catch(
      () => undefined,
    );
    if (typeof entry?.nextAvailableAt === "number") {
      effectiveNextAvailableAt = mergeAvailabilityDeadline(
        entry.nextAvailableAt,
        effectiveNextAvailableAt ?? entry.nextAvailableAt,
      );
    }
  }
  return effectiveNextAvailableAt;
}

/**
 * 会话级自动压缩摘要 fallback。
 *
 * 自动上下文压缩（localLoop → createTurnCompactionController）的主通道是 agent
 * 自己的 provider；它慢/失败时过去只报一次 failure 然后等下一轮（实测反复 60s
 * 超时且无进展）。这里把**已有的**平台摘要通道（CLI 入口用
 * createTuiSummaryLlmCaller 建的实例）以会话级单例形式交给本地 adapter，
 * 由 localLoop 读走并作为「最多一次」的 fallback。
 *
 * 放模块级而不是 deps：deps 类型在 localRuntimeDiagnostics（本次改动范围外），
 * 且一个 CLI 进程只有一条平台摘要通道，会话级单例正是需要的语义。未注入
 * （desktop、未登录、headless）→ adapter 不带该字段 → 不 fallback，行为与今天
 * 完全一致。
 */
let cliAutoCompactionSummaryFallback:
  | ((content: string) => Promise<string | null>)
  | undefined;

/** CLI 入口在启动 TUI 时注入平台摘要 caller（与 /compact 复用同一条通道）。 */
export function setCliAutoCompactionSummaryFallback(
  caller: ((content: string) => Promise<string | null>) | undefined,
): void {
  cliAutoCompactionSummaryFallback = caller;
}

/** 当前会话注入的摘要 fallback（未注入 → undefined）。 */
export function getCliAutoCompactionSummaryFallback():
  | ((content: string) => Promise<string | null>)
  | undefined {
  return cliAutoCompactionSummaryFallback;
}

export function createCliLocalRuntimeAdapter(
  deps: CliLocalRuntimeAdapterDeps,
): AgentRuntimeHostAdapter & {
  /**
   * 自动上下文压缩的摘要 fallback（CLI 专有，非 AgentRuntimeHostAdapter 接口
   * 成员）。localLoop 在主通道超时/失败时最多调用一次；形状与 CLI 的
   * SummaryLlmCaller 一致。未注入 → undefined（见
   * setCliAutoCompactionSummaryFallback）。
   */
  compactionSummaryFallback?: (content: string) => Promise<string | null>;
  /**
   * 启动期 429 冷却兜底落盘入口（CLI 本地 adapter 专有，非
   * AgentRuntimeHostAdapter 接口成员）。agentRun.ts 在 classifyLocalRunError
   * 命中 rate-limit 时调用：provider 握手/首请求期的 429（如 Codex/Claude
   * OAuth "usage limit reached"、antigravity "Individual quota reached"）
   * 往往在 transport 抛错路径上没走到响应分支的 recordLocalAvailability，
   * 只打日志 exit 1 不落冷却 → agent 照常被 listAgents 列出、下次派发继续
   * 撞 429。这里复用本 adapter 的 deps/store，把与中途路径同语义的冷却落盘。
   * 幂等：transport 已落盘时重复 mark 由 mergeAvailabilityDeadline 取更晚者收敛。
   */
  recordStartupAvailabilityForAgent(
    agentRef: string,
    status: number,
    body?: unknown,
  ): Promise<number | undefined>;
} {
  const now = deps.now ?? Date.now;
  const createId = deps.createId ?? createFallbackId;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const loopbackRequest =
    deps.loopbackRequest ??
    (deps.fetchImpl ? undefined : defaultLoopbackRequest);
  const userId = resolveLocalUserId(deps.env);
  const localToolBudgets = parseLocalToolBudgets(deps.env);
  const localToolUsage = new Map<string, number>();
  const buildProviderOpenAiTools =
    deps.buildProviderOpenAiTools ?? buildOpenAiTools;
  const additionalToolNames = deps.pastedTextStore ? ["readPastedText"] : [];
  // 并发扇出守卫的凭证组解析：轻量读 agent 记录（不走 loadAgentConfig——
  // 它会改 prepared-runtime 缓存与父 run 的工具面状态）。记录上已有
  // credentialGroup 就直接用；否则从 apiKeyRef/credentialRef 派生。
  // 解析失败/无凭据引用返回 undefined = 凭证归属未知，守卫按未知保守拦截。
  const resolveAgentCredentialGroup = async (
    agentRef: string,
  ): Promise<string | undefined> => {
    try {
      const record = await readAgentFromStore({
        agentRef,
        store: await getOrCreateSharedStore(deps),
        userId,
      });
      if (!record || typeof record !== "object") return undefined;
      const rec = record as Record<string, unknown>;
      const existing =
        typeof rec.credentialGroup === "string" && rec.credentialGroup.trim()
          ? rec.credentialGroup.trim()
          : undefined;
      if (existing) return existing;
      const ref =
        typeof rec.apiKeyRef === "string" && rec.apiKeyRef.trim()
          ? rec.apiKeyRef
          : typeof rec.credentialRef === "string" && rec.credentialRef.trim()
            ? rec.credentialRef
            : undefined;
      const viaRef = deriveCredentialGroup(ref)?.credentialGroup;
      if (viaRef) return viaRef;
      // 无 ref 的自定义 API agent：用 provider URL 派生稳定组，避免落进
      // 「未知」把同父对话的并发派发全部拦死（详见该函数的注释）。
      const customUrl =
        typeof rec.customProviderUrl === "string" ? rec.customProviderUrl : undefined;
      return deriveCustomProviderCredentialGroup(userId, customUrl)?.credentialGroup;
    } catch {
      return undefined;
    }
  };
  let activeAgentToolNames: string[] = [];
  /**
   * owner-required 会话上下文（块 D）：resolveProviderBase 判定本机用户 ≠
   * credential owner 时写入（agentName/ownerUserId/deviceId/deviceName）。
   * executeTool 在 shellGrant 确认请求里原样引用——同一份 owner 身份不在
   * 两条路径上重复推导（rawRecord 读取规则只此一处）。
   */
  let ownerAgentContext:
    | {
        agentName: string;
        agentKey: string;
        ownerUserId: string;
        deviceId: string;
        deviceName?: string;
      }
    | undefined;
  const workspaceRoot = deps.cwd ?? process.cwd();
  let runtimeToolExecutionLimits: ReturnType<
    typeof resolveLocalWorkspaceExecutorOptionsFromPolicy
  > = {};
  // Executor closures belong to this adapter; only prepared metadata is shared.
  const buildCurrentToolExecutors = (agentKey?: string | null) =>
    buildLocalToolExecutors({
      workspaceRoot,
      env: deps.env,
      fetchImpl,
      ...(deps.chromeConnectorClient
        ? { chromeConnectorClient: deps.chromeConnectorClient }
        : {}),
      localToolExecutors: deps.localToolExecutors,
      readXPost: deps.readXPost,
      readXhsProfile: deps.readXhsProfile,
      cliEntrypoint: CLI_ENTRYPOINT,
      resolveAgentCredentialGroup,
      ...(deps.confirmDestructiveAction
        ? { confirmDestructiveAction: deps.confirmDestructiveAction }
        : {}),
      ...(deps.requestUserChoice
        ? { requestUserChoice: deps.requestUserChoice }
        : {}),
      ...(deps.pastedTextStore
        ? { pastedTextStore: deps.pastedTextStore }
        : {}),
      agentKey,
      ...runtimeToolExecutionLimits,
    });
  let localToolExecutors = buildCurrentToolExecutors();

  // 凭据保管库：同一个实例既供 provider 解析密钥，也暴露给 localLoop 做输入隔离
  // 与执行边界解包（adapter.credentialBroker）。此前只有 provider 那条路建 broker，
  // adapter 上没有这个字段 → 隔离路径恒不激活，用户粘贴的密钥只会被正则脱敏成
  // 不可用的 [REDACTED:…] 标记，而不是模型能安全消费的引用。
  const credentialBroker = createFileCredentialBroker({
    migration: { enableLegacyMigration: true },
  });

  const adapterBase = {
    host: "cli",
    capabilities: [
      "leveldb-agent-config",
      "local-provider",
      "leveldb-persistence",
      "local-tools",
    ],
    credentialBroker,
    loadAgentConfig: async (agentRef) => {
      // Read the global skill settings before checking the prepared-runtime cache.
      // Otherwise a setting change would keep reusing the old tool surface.
      let systemBuiltinSkills: Record<string, boolean> | null = null;
      const sharedStore = await getOrCreateSharedStore(deps);
      if (userId) {
        try {
          const settingsRecord = await sharedStore.read(
            createUserKey.settings(userId),
            { remote: false },
          );
          systemBuiltinSkills =
            settingsRecord && typeof settingsRecord === "object"
              ? (settingsRecord as any).systemBuiltinSkills ?? null
              : null;
        } catch {
          // Local settings are best-effort; a read failure keeps skills enabled.
        }
      }
      const cacheKey = buildPreparedAgentCacheKey({
        userId,
        agentRef,
        cwd: normalizeRuntimeCacheCwd(workspaceRoot),
        systemBuiltinSkills,
      });
      // Paste availability changes the prepared tool surface, so paste-aware
      // runs remain isolated from the shared metadata cache.
      const cached = deps.pastedTextStore
        ? undefined
        : preparedAgentRuntimeCache.get(cacheKey);
      if (cached) {
        activeAgentToolNames = cached.activeAgentToolNames;
        runtimeToolExecutionLimits = cached.runtimeToolExecutionLimits;
        localToolExecutors = buildCurrentToolExecutors(cached.agentConfig.key);
        return cached.agentConfig;
      }

      const storedAgentConfig = await readAgentFromStore({
        agentRef,
        store: await getOrCreateSharedStore(deps),
        userId,
      });
      const fallbackLocalCliAgentConfig = storedAgentConfig
        ? null
        : resolveBuiltinLocalCliAgentConfig(agentRef, userId);
      const baseAgentConfig = withResolvedRuntimeToolSurface(
        storedAgentConfig ?? fallbackLocalCliAgentConfig,
        deps.env,
      );
      // CLI 端 system prompt 直用 agentConfig.prompt（不经 buildSystemPrompt 的
      // skill-guidance 层），这里把启用能力包的 promptPatch 纪律追加进 prompt，
      // 与 web 端 skillPromptPatches 注入对齐。
      const agentConfig = baseAgentConfig
        ? withRuntimeEnabledPacksAndPrompt(baseAgentConfig)
        : baseAgentConfig;
      // 读取用户全局设置中的「系统内置 Skill」开关映射，传给工具展开管道，
      // 让 CLI 端与 Web/桌面端行为一致：用户关闭「联网搜索」后，CLI agent
      // 也不再注入 web-search 包工具。best-effort，读失败视为默认全开。
      const requestedToolNames = agentConfig
        ? resolveCliRequestedToolNames(
            agentConfig,
            deps.env,
            systemBuiltinSkills,
          )
        : [];
      const effectiveToolNames = [...requestedToolNames, ...additionalToolNames];
      activeAgentToolNames = buildLocalPolicyToolNames({
        agentKey: agentConfig?.key,
        toolNames: effectiveToolNames,
        env: deps.env,
        buildProviderOpenAiTools: (toolArgs) =>
          buildOpenAiTools({
            ...toolArgs,
            effectiveToolNames,
          }),
      });
      runtimeToolExecutionLimits =
        resolveLocalWorkspaceExecutorOptionsFromPolicy(
          resolveCurrentRunRuntimeToolPolicy(agentConfig),
        );
      localToolExecutors = buildCurrentToolExecutors(agentConfig?.key);
      // Report the post-filter tool list so runtime guidance describes what the
      // model can actually call. The CLI drops declared names it has no
      // executor for (read/createDoc/...), and prompt blocks keyed off the
      // declared list would advertise tools that never reach the schema.
      //
      // `toolSurface.finalToolNames` is the canonical checkpoint record, so it
      // must record the same post-expansion list. The surface resolved from the
      // agent record predates pack expansion (the `code` fallback plus
      // `readPastedText` for large pastes), and leaving it untouched made the
      // checkpoint claim the model only had workspace metadata tools.
      const exposedAgentConfig = agentConfig
        ? {
            ...agentConfig,
            exposedToolNames: activeAgentToolNames,
            toolSurface: {
              ...((agentConfig as any).toolSurface ?? {}),
              finalToolNames: activeAgentToolNames,
            },
          }
        : agentConfig;
      if (exposedAgentConfig && !deps.pastedTextStore) {
        preparedAgentRuntimeCache.set(cacheKey, {
          agentConfig: exposedAgentConfig,
          activeAgentToolNames,
          runtimeToolExecutionLimits,
        });
      }
      return exposedAgentConfig;
    },
    loadDialogHistory: async (dialogId) =>
      readDialogMessages({
        dialogId,
        store: await getOrCreateSharedStore(deps),
      }),
    loadDialogSummary: async (dialogId) =>
      loadCliDialogSummary({
        store: await getOrCreateSharedStore(deps),
        userId,
        dialogId,
      }),
    saveDialogSummary: async (input) =>
      saveCliDialogSummary({
        store: await getOrCreateSharedStore(deps),
        userId,
        dialogId: input.dialogId,
        summary: input.summary,
        summarizedBeforeId: input.summarizedBeforeId,
        sourceHash: input.sourceHash,
        sourceCount: input.sourceCount,
        schemaVersion: input.schemaVersion,
      }),
    loadLastContextUsage: async (dialogId) => {
      // 从 per-dialog 权威持久化记录读取上一次调用的真实 input tokens。
      // 轮内压缩（localLoop round 间检查）成为主防线后，此处只服务轮开始
      // 的兜底判定；记录缺失（旧对话）安全落到估算兜底，不再设第二回退。
      const fromDialog = await loadCliDialogLastContextUsage({
        store: await getOrCreateSharedStore(deps),
        userId,
        dialogId,
      });
      if (fromDialog?.inputTokens) {
        return fromDialog;
      }
      return null;
    },
    saveTurn: async (input) =>
      writeDialog({
        store: await getOrCreateSharedStore(deps),
        input,
        userId,
        now,
        createId,
        env: deps.env,
        fetchImpl,
        output: deps.output,
        cwd: workspaceRoot,
        titleGenerator: createLocalDialogTitleGenerator(deps, {
          apiKeyRefResolver: createOAuthApiKeyRefResolver({
            migration: { enableLegacyMigration: true },
          }),
          credentialBroker,
          loopbackRequest,
        }),
      }),
    resolveProviderBase: async (agentConfig) => {
      const nowMs = now();
      const serverUrl = asOptionalTrimmedString(deps.env.NOLO_SERVER) ?? "https://us.nolo.chat";
      const authToken = asOptionalTrimmedString(deps.env.AUTH_TOKEN);
      // owner-required 派发契约：分享者 OAuth agent（本机用户 ≠ credential
      // owner）走服务端 owner-required 代理，模型烧 owner 订阅、工具留在本机。
      // 构造条件与 agentRun.resolveOAuthChannelOwnerSkip 同源（apiKeyRef 是
      // OAuth 引用 / antigravity OAuth agent，且 rawRecord.userId ≠ 本机 userId）。
      // 不满足任一条件即 undefined → 所有既有 transport 逐字不变。
      //
      // 判定必须在**任何本机 credential availability 读/写之前**完成：分享者
      // agent 的 apiKeyRef（如 "claude"）与发起者自己的 agent 共用同一 credential
      // key，若先做冷却门控，发起者该凭据的冷却会阻断 owner dispatch（owner
      // 订阅健康也被拦），probe 还会写发起者 lastProbeAt 污染本机状态。
      let ownerOriginExecution: OwnerOriginExecution | undefined;
      {
        const rawRecord =
          (agentConfig as { rawRecord?: Record<string, unknown> }).rawRecord ?? {};
        const ownerUserId =
          asOptionalTrimmedString(rawRecord.userId) ??
          asOptionalTrimmedString(rawRecord.ownerUserId);
        const apiKeyRef =
          typeof agentConfig.apiKeyRef === "string" ? agentConfig.apiKeyRef : undefined;
        const isOAuthChannel =
          Boolean(apiKeyRef && isOAuthApiKeyRef(apiKeyRef)) ||
          isAntigravityOAuthAgent(agentConfig);
        if (ownerUserId && ownerUserId !== userId && isOAuthChannel) {
          try {
            const { detectMachineInfo } = await import(
              "connector-experimental/machineInfo"
            );
            const machine = await detectMachineInfo({ probeLaunchable: false });
            const machineId = asOptionalTrimmedString(machine?.machineId);
            if (!machineId) {
              // 当前设备不可用 → 明确失败，不静默转其他机器/服务端工作区。
              throw Object.assign(
                new Error(
                  "owner-required route unavailable: cannot resolve this device's machineId; " +
                    "the origin host must be the device that runs local tools",
                ),
                { code: "origin_unavailable" },
              );
            }
            ownerAgentContext = {
              agentName:
                asOptionalTrimmedString(
                  (agentConfig as { name?: unknown }).name,
                ) ?? agentConfig.key,
              agentKey: agentConfig.key,
              ownerUserId,
              deviceId: machineId,
              ...(asOptionalTrimmedString((machine as { name?: unknown }).name)
                ? {
                    deviceName: asOptionalTrimmedString(
                      (machine as { name?: unknown }).name,
                    )!,
                  }
                : {}),
            };
            ownerOriginExecution = {
              version: OWNER_ORIGIN_EXECUTION_VERSION,
              controller: "origin_local",
              origin: {
                machineId,
                identitySource: "machine",
                // 会话身份：优先取 TUI 显式注入的 originSession.sessionId（跨轮
                // 稳定、与 dialogId 生命周期一致）；非 TUI 调用方回退
                // parentDialogId → ephemeral id。workspaceId 同理优先取
                // originSession.workspaceId，缺省仍由 workspaceRoot 派生。
                sessionId:
                  deps.originSession?.sessionId ??
                  deps.parentDialogId ??
                  `session-${createId()}`,
                workspaceId:
                  deps.originSession?.workspaceId ?? `ws-${workspaceRoot}`,
                workspaceRoot,
                cwd: workspaceRoot,
              },
              modelRoute: {
                kind: "server_agent_oauth",
                agentKey: agentConfig.key,
                credentialPolicy: "owner_required",
              },
            };
            // 运行位置展示（块 D）：把本机 origin 按共享契约投影成
            // ToolExecutionLocation 并回调给宿主（TUI 渲染「工具在
            // <deviceName>(<deviceId>) · <workspaceRoot> 执行 · ready」）。
            // 宿主缺省时不投影不回调——旧调用方无感知。
            if (deps.onToolExecutionLocation) {
              try {
                deps.onToolExecutionLocation(
                  projectToolExecutionLocation({
                    status: "ready",
                    // 本机是发起设备、工具留在本机跑——对应 machine-connector 契约。
                    hostType: "machine-connector",
                    deviceId: machineId,
                    deviceName: ownerAgentContext.deviceName ?? machineId,
                    workspace: {
                      id:
                        deps.originSession?.workspaceId ??
                        `ws-${workspaceRoot}`,
                      root: workspaceRoot,
                      cwd: workspaceRoot,
                    },
                  }),
                );
              } catch {
                // 展示回调失败不影响派发；宿主拿到 unknown 也该继续跑。
              }
            }
          } catch (error) {
            if (
              error &&
              typeof error === "object" &&
              (error as { code?: unknown }).code === "origin_unavailable"
            ) {
              throw error;
            }
            // detectMachineInfo 抛错视同不可用。
            throw Object.assign(
              new Error(
                `owner-required route unavailable: ${toErrorMessage(error)}; ` +
                  "the origin host must be the device that runs local tools",
              ),
              { code: "origin_unavailable" },
            );
          }
        }
      }

      /**
       * owner-required 时后续 real dispatch 不调用：任何调用都说明 owner
       * transport 被绕过（链上更早的 transport 读发起者凭据），抛错哨兵
       * 而不是写发起者本机可用性状态。
       */
      const ownerRouteLeakGuard = (what: string): never => {
        throw new Error(
          `owner-required dispatch attempted local credential ${what}; ` +
            "caller credentials must never serve or be mutated by an owner-routed request",
        );
      };
      /**
       * 把一次上游响应的可用性结论落到本地 agent 记录（429 冷却 / 恢复）。
       * 决策用共享纯函数，本地只负责 IO；每条 transport 分支都必须调用它，
       * 否则限流 agent 会继续被 listAgents 列出、继续被选中、继续撞 429。
       * owner-required 时装成抛错哨兵：本机记录与发起者冷却挂钩，绝不能被
       * 分享调用污染。
       */
      let recordLocalAvailability: (status: number, body?: unknown) => Promise<void> =
        async () => ownerRouteLeakGuard("availability write");
      /**
       * owner-required 时装抛错哨兵；旧模式在门控后由真实实现覆盖。
       * 哨兵防回归：owner transport 不应读取它们（fail-closed 已在
       * resolveLocalProvider 拦截），若未来有新路径绕过契约检查，这里兜底。
       */
      let apiKeyRefResolver: ProviderResolutionContext["apiKeyRefResolver"] = (
        (() => ownerRouteLeakGuard("apiKeyRefResolver read")) as unknown as ProviderResolutionContext["apiKeyRefResolver"]
      );
      // credentialBroker 直接用外层实例：owner transport 不调用它；若未来出现
      // 绕开 resolveLocalProvider 契约检查的新路径，外层单例仍正确。

      if (!ownerOriginExecution) {
      // 冷却检查放在派发点：loadAgentConfig 只负责加载配置，不应因冷却失败
      // （冷却 ≠ 配置错误，listAgents/预览等读配置路径不能被误伤）。
      // owner-required 路径已在上文短路，不读/写本机 credential availability——
      // 发起者的冷却/probe 状态与 owner 订阅无关，不能被分享调用消耗或污染。
      const credentialKeyForGate = resolveCredentialKeyWithFallback(
        agentConfig as unknown as Record<string, unknown>,
      );
      const credentialCooldowns: Record<string, number> = credentialKeyForGate
        ? await readCredentialAvailability(deps.env, nowMs).catch(() => ({}))
        : {};
      const credentialCooldownAt = credentialKeyForGate
        ? credentialCooldowns[credentialKeyForGate]
        : undefined;
      // agent 级（含旧数据）与 credential 级取更晚者，升级后旧冷却不失效。
      const agentLevelNextAvailableAt = (
        agentConfig as { nextAvailableAt?: number }
      ).nextAvailableAt;
      const effectiveNextAvailableAt =
        typeof credentialCooldownAt === "number"
          ? mergeAvailabilityDeadline(
              agentLevelNextAvailableAt,
              credentialCooldownAt,
            )
          : agentLevelNextAvailableAt;
      recordLocalAvailability = (status: number, body?: unknown): Promise<void> =>
        recordLocalAvailabilityForAgent({
          deps,
          agentConfig,
          status,
          body,
          now,
        }).then(() => undefined);

      // 冷却门控：deadline 已过 → 放行；未过但距上次探测超间隔 → probe（放行一次真实
      // 请求去试探上游是否已恢复）；刚探测过 → blocked（照旧 throw）。probe 由本次
      // 请求自己完成试探，成功后会在 recordLocalAvailability（2xx → clear）里清除冷却。
      // lastProbeAt 必须一并读出：缺省时 resolveCooldownGate 一律判 "probe"，
      // 会让 "blocked" 永不可达、冷却完全失效（每次派发都放行 → 反复撞 429）。
      const gateEntry = credentialKeyForGate
        ? await readCredentialEntry(credentialKeyForGate, deps.env, nowMs).catch(
            () => undefined,
          )
        : undefined;
      const gateDecision = resolveCooldownGate(
        {
          nextAvailableAt: effectiveNextAvailableAt,
          lastProbeAt: gateEntry?.lastProbeAt,
        },
        nowMs,
      );
      if (gateDecision === "blocked") {
        throw new Error(
          `agent temporarily unavailable until ${new Date(Number(effectiveNextAvailableAt)).toISOString()}`,
        );
      }
      // probe 态：放行本次真实请求，并在发出前记录探测时间，避免 10 分钟间隔内
      // 反复重试。
      //
      // 冷却与探测时间都记在 credential entry 上。无 apiKeyRef/credentialRef 的
      // custom-provider agent（如 Ollama cloud 直连）经 resolveCredentialKeyWithFallback
      // 派生 fallback key（custom-endpoint:<origin> / custom-agent:<key>）后与
      // 其它 agent 共用同一套 mark / gate / probe 机制。其中 endpoint 级分组比
      // credential 粒度粗——同一 endpoint 下账号 A 耗尽会连带挡住正常的账号 B：
      // 冷却期内 B 只能等这里每 PROBE_INTERVAL_MS 放行一次 probe，直到某次 probe
      // 拿到 2xx 才清除冷却，并非「延迟一个窗口即恢复」。刻意取舍：这仍远优于
      // 反向故障——冷却落不了盘导致每次派发都撞 429；且 MAX_COOLDOWN_MS 保证
      // 任何冷却最长 24h 自然过期。
      if (gateDecision === "probe" && credentialKeyForGate) {
        await recordCredentialProbe(credentialKeyForGate, deps.env, nowMs).catch(
          () => undefined,
        );
      }

      // Local-first: OAuth resolver + file credential broker (metered API keys).
      // Broker is preferred inside buildProviderExecutionPlan when both are present.
      const legacyCredentialMigration = {
        enableLegacyMigration: true,
      } as const;
      apiKeyRefResolver = createOAuthApiKeyRefResolver({
        migration: legacyCredentialMigration,
      });
      } // end if (!ownerOriginExecution) —— 本机 credential 门控/resolver 仅旧模式需要
      const syncFetcher = authToken
        ? async (ref: string) => {
            try {
              // provider-key:xxx 格式的共享密钥存在 user-secrets store，
              // 不是 agent-credentials store。按前缀路由到正确的 API。
              if (ref.startsWith("provider-key:")) {
                const presetId = ref.slice("provider-key:".length);
                return await getServerProviderSecret({
                  serverOrigin: serverUrl,
                  token: authToken,
                  presetId,
                });
              }
              return await fetchServerSyncedCredential(
                { currentServer: serverUrl, authToken },
                ref,
              );
            } catch (error) {
              // Local OAuth/API-key execution must survive a server deploy or
              // transient 502. A missing synced copy is not a failed turn;
              // the local resolver/broker may still have the credential.
              logLocalRuntimeDiagnostic("credential.sync.unavailable", {
                ref,
                error: toErrorMessage(error),
              });
              return null;
            }
          }
        : undefined;


      return resolveLocalProvider({
        agentConfig,
        deps,
        fetchImpl,
        loopbackRequest,
        now,
        workspaceRoot,
        additionalToolNames,
        activeAgentToolNames,
        localToolExecutors,
        buildProviderOpenAiTools,
        recordLocalAvailability,
        apiKeyRefResolver,
        credentialBroker,
        serverUrl,
        authToken,
        syncFetcher,
        ...(ownerOriginExecution ? { ownerOriginExecution } : {}),
      });
    },
    executeTool: async (call, opts) => {
      const contextualCall = opts?.runtimeContext
        ? { ...call, runtimeContext: opts.runtimeContext }
        : call;
      // Inject the current TUI conversation as the parent for local background
      // run delegations. Without this, a child run spawned from inside a TUI
      // turn carries no link to its orchestrating dialog, preventing proper
      // conversation scoping for the TUI run dock, terminal wake attribution,
      // and Web child thread queries. We inject only when (a) this is a
      // startAgentRun call and (b) we actually know the current dialog id —
      // otherwise leave the call untouched.
      let injectedCall = contextualCall;
      // startAgentRun 且本轮无法盖章（无 deps.parentDialogId、模型也未显式
      // 传参——新会话首轮 dialogId 尚未生成就是这种情形）时置 true；执行
      // 成功后从结果 JSON 取 runId 上报，供 TUI 在 turn 结束回填归属。
      let spawnedWithoutParent = false;
      if (
        contextualCall.name === "startAgentRun" &&
        typeof contextualCall.arguments === "string"
      ) {
        try {
          const args = JSON.parse(contextualCall.arguments);
          if (!args.parentDialogId) {
            if (deps.parentDialogId) {
              injectedCall = {
                ...contextualCall,
                arguments: JSON.stringify({
                  ...args,
                  parentDialogId: deps.parentDialogId,
                }),
              };
            } else {
              spawnedWithoutParent = true;
            }
          }
        } catch {
          // Malformed arguments: leave the call as-is; the executor will fail
          // with a clear message if agentKey/task are missing.
        }
      }
      assertWithinLocalToolBudget({
        toolName: call.name,
        budgets: localToolBudgets,
        usage: localToolUsage,
      });
      // 分享 OAuth agent 的 shell 会话授权（块 D）：首次命令执行类工具调用
      // 前必须显式确认。判定顺序：先跑与 executeLocalToolWithPolicy 同源的
      // 上限判定（run-scoped surface + policy），被拒即抛——read-only 与
      // policy shell-disabled 是 deny ceiling，会话允许绝不能覆盖；上限
      // 通过后强制走会话授权。ownerAgentContext 缺省（非 owner-required 场景）
      // → 整段跳过，旧行为逐字不变。撤销后 isGranted() 翻回 false，下一次
      // shell 调用立即重新弹确认（同步状态，无传播延迟）。
      if (
        ownerAgentContext &&
        requiresShellSessionGrant(call.name)
      ) {
        // 上限预检：与下方 executeLocalToolWithPolicy 的 runToolNames 断言 +
        // resolveLocalToolPolicy 同规则。read-only surface（runToolNames 不含
        // 该工具）或 policy shell-disabled（agent 未声明 + restricted 未放行）
        // 都在这里先拒——会话 grant 永远不是绕过上限的通道。
        const surfaceDenied =
          !activeAgentToolNames
            .map(normalizeLocalToolName)
            .includes(normalizeLocalToolName(call.name)) ||
          !resolveLocalToolPolicy({
            env: deps.env,
            agentToolNames: activeAgentToolNames,
            toolName: call.name,
          }).allowed;
        if (surfaceDenied) {
          throw new Error(
            `${call.name} is outside the run tool surface / policy for shared agent ` +
              `"${ownerAgentContext.agentName}" — session shell grant cannot ` +
              "override run-scoped or policy ceilings.",
          );
        }
        // 默认拒绝：headless / 非 TUI 调用方没有确认通道（未注入 shellGrant）
        // 时绝不能 fail-open 放行——共享 OAuth agent 的 shell 在本机可读写该
        // 用户能访问的全部资源，不能因为「模型跑在别人的订阅上」就静默执行。
        // 缺省确认通道 = 拒绝，不是默认放行。
        if (!deps.shellGrant) {
          throw Object.assign(
            new Error(
              `Shell execution declined: shared agent "${ownerAgentContext.agentName}" ` +
                "requires explicit per-session approval before running commands " +
                `on this device (${ownerAgentContext.deviceId}), but no confirmation ` +
                "channel is available.",
            ),
            { code: "origin_authorization_required" },
          );
        }
        if (!deps.shellGrant.isGranted()) {
          const granted = await deps.shellGrant.requestGrant({
            agentName: ownerAgentContext.agentName,
            agentKey: ownerAgentContext.agentKey,
            ownerUserId: ownerAgentContext.ownerUserId,
            deviceId: ownerAgentContext.deviceId,
            ...(ownerAgentContext.deviceName
              ? { deviceName: ownerAgentContext.deviceName }
              : {}),
            workspaceRoot,
            toolName: call.name,
            ...(extractShellCommandPreview(call.arguments)
              ? { command: extractShellCommandPreview(call.arguments) }
              : {}),
          });
          if (!granted) {
            throw Object.assign(
              new Error(
                `Shell execution declined: shared agent "${ownerAgentContext.agentName}" ` +
                  "requires explicit per-session approval before running commands " +
                  `on this device (${ownerAgentContext.deviceId}).`,
              ),
              { code: "origin_authorization_required" },
            );
          }
        }
      }
      const result = await executeLocalToolWithPolicy({
        env: deps.env,
        agentToolNames: activeAgentToolNames,
        runToolNames: activeAgentToolNames,
        call: injectedCall,
        executors: localToolExecutors,
        // 分发前参数闸门：只覆盖 agent-runtime 工具族（workspace + nolo
        // workspace）。ai/tools registry 的工具不接——它们有各自的前置 policy
        // guard 与结构化结果契约（例：createTable 的 capture 确认守卫），
        // 闸门抢先拦截会覆盖这些语义（见 toolArgumentGate.ts 的范围说明）。
        toolParametersIndex: getAgentRuntimeToolParametersIndex(),
        abortSignal: opts?.abortSignal,
        detachMs: resolveExecShellDetachMs(deps.env),
        ...(deps.confirmDestructiveAction
          ? { confirmDestructiveAction: deps.confirmDestructiveAction }
          : {}),
      });
      if (spawnedWithoutParent && deps.onBackgroundRunSpawned) {
        try {
          const payload = JSON.parse(result?.content ?? "");
          if (payload && typeof payload.runId === "string" && payload.runId) {
            deps.onBackgroundRunSpawned(payload.runId);
          }
        } catch {
          // 结果非 JSON 或 spawn 失败（错误 payload 无 runId）——没有可回填的 run。
        }
      }
      return {
        ...result,
        metadata: {
          ...(result.metadata ?? {}),
          workspaceRoot,
          workspaceKind: "current",
        },
      };
    },
  } satisfies Omit<AgentRuntimeHostAdapter, "resolveProvider"> & {
    resolveProviderBase: AgentRuntimeHostAdapter["resolveProvider"];
  };

  // Direct providers keep the bounded whole-stream retry across all
  // retryable stream failures. Platform chat POSTs restrict stream-level
  // retry to `isBusyProviderStreamError` (the server's pre-admission
  // `PLATFORM_LLM_BUSY` SSE error frame or non-streaming busy 503): busy
  // consumes 0 tokens and has no side effects, so retrying it after cooldown
  // does not violate the duplicate-cost / billing boundary. Generic
  // mid-stream drops / network errors on platform chat remain non-retryable
  // here (commit ac58f2c79).
  // Non-streaming busy 503 is retried first at the fetch layer (fetchWithTransientRetry);
  // if that layer exhausts its attempts and throws, the complete-level retry
  // provides one final backed-off retry (worst-case 6 upstream POSTs across
  // two full 3-attempt fetch budgets, 5×1200ms cooldowns — 4 fetch-level +
  // 1 complete-level), all of which are
  // pre-admission zero-cost attempts protected by abort/sawToolEvent guards.
  return {
    ...adapterBase,
    // 会话级摘要 fallback（未注入 → undefined）：getter 而非快照值，因为 adapter
    // 可能被 prepared-runtime 缓存复用，而注入发生在 CLI 启动早期。
    get compactionSummaryFallback() {
      return cliAutoCompactionSummaryFallback;
    },
    resolveProvider: async (agentConfig: AgentRuntimeAgentConfig) => {
      const provider = (await adapterBase.resolveProviderBase(
        agentConfig,
      )) as AgentRuntimeProvider;
      return shouldUsePlatformChatProvider(deps.env, agentConfig)
        ? withProviderStreamRetry(provider, {
            ...deps,
            retryOnly: isBusyProviderStreamError,
          })
        : withProviderStreamRetry(provider, deps);
    },
    recordStartupAvailabilityForAgent: async (
      agentRef: string,
      status: number,
      body?: unknown,
    ) => {
      const agentConfig = await adapterBase.loadAgentConfig(agentRef);
      if (!agentConfig) return undefined;
      return recordLocalAvailabilityForAgent({
        deps,
        agentConfig,
        status,
        body,
        now,
      });
    },
  };
}
