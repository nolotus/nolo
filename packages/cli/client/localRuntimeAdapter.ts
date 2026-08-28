import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeHostAdapter,
  AgentRuntimeSaveTurnInput,
} from "../agentRuntimeLocal";
import { resolveLocalProvider } from "./providerResolution/resolveLocalProvider";
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
import { withProviderStreamRetry } from "./providerStreamRetry";

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
  resolveGlobFilesDescriptionVariant,
  resolveReadFileDescriptionVariant,
  resolveReadFileParameterVariant,
  resolveGlobFilesParameterVariant,
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
import {
  clearCredentialAvailability,
  markCredentialUnavailable,
  readCredentialAvailability,
  readCredentialEntry,
  recordCredentialProbe,
  resolveCredentialKey,
} from "../credentialAvailability";
import {
  createCursorProvider,
  isCursorOAuthAgent,
} from "../../agent-runtime/cursor/cursorProvider";
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
import { executeLocalToolWithPolicy } from "./localToolPolicy";
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
} from "./localRuntimeDialog";
import {
  getOrCreateSharedStore,
  createLocalDialogTitleGenerator,
  writeDialog,
  loadCliDialogSummary,
  saveCliDialogSummary,
} from "./localRuntimeDialog";

export function createCliLocalRuntimeAdapter(
  deps: CliLocalRuntimeAdapterDeps,
): AgentRuntimeHostAdapter {
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
  let activeAgentToolNames: string[] = [];
  const workspaceRoot = deps.cwd ?? process.cwd();
  let runtimeToolExecutionLimits: ReturnType<
    typeof resolveLocalWorkspaceExecutorOptionsFromPolicy
  > = {};
  let localToolExecutors: Record<
    string,
    (
      call: any,
    ) => Promise<{ content: string; metadata?: Record<string, unknown> }>
  > = buildLocalToolExecutors({
    workspaceRoot,
    env: deps.env,
    fetchImpl,
    localToolExecutors: deps.localToolExecutors,
    readXPost: deps.readXPost,
    readXhsProfile: deps.readXhsProfile,
    cliEntrypoint: CLI_ENTRYPOINT,
    ...(deps.confirmDestructiveAction
      ? { confirmDestructiveAction: deps.confirmDestructiveAction }
      : {}),
    ...(deps.requestUserChoice
      ? { requestUserChoice: deps.requestUserChoice }
      : {}),
    ...(deps.pastedTextStore
      ? { pastedTextStore: deps.pastedTextStore }
      : {}),
    ...runtimeToolExecutionLimits,
  });

  const adapterBase = {
    host: "cli",
    capabilities: [
      "leveldb-agent-config",
      "local-provider",
      "leveldb-persistence",
      "local-tools",
    ],
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
      // Paste executors close over the current TUI store. A prepared runtime
      // cache hit would otherwise reuse an executor bound to an older paste
      // store, so paste-aware runs are intentionally per-turn.
      const cached = deps.pastedTextStore
        ? undefined
        : preparedAgentRuntimeCache.get(cacheKey);
      if (cached) {
        activeAgentToolNames = cached.activeAgentToolNames;
        runtimeToolExecutionLimits = cached.runtimeToolExecutionLimits;
        localToolExecutors = cached.localToolExecutors;
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
      activeAgentToolNames = buildLocalPolicyToolNames({
        agentKey: agentConfig?.key,
        toolNames: [...requestedToolNames, ...additionalToolNames],
        env: deps.env,
      });
      runtimeToolExecutionLimits =
        resolveLocalWorkspaceExecutorOptionsFromPolicy(
          resolveCurrentRunRuntimeToolPolicy(agentConfig),
        );
      localToolExecutors = buildLocalToolExecutors({
        workspaceRoot,
        env: deps.env,
        fetchImpl,
        localToolExecutors: deps.localToolExecutors,
        readXPost: deps.readXPost,
        readXhsProfile: deps.readXhsProfile,
        cliEntrypoint: CLI_ENTRYPOINT,
        ...(deps.confirmDestructiveAction
          ? { confirmDestructiveAction: deps.confirmDestructiveAction }
          : {}),
        ...(deps.requestUserChoice
          ? { requestUserChoice: deps.requestUserChoice }
          : {}),
        ...(deps.pastedTextStore
          ? { pastedTextStore: deps.pastedTextStore }
          : {}),
        agentKey: agentConfig?.key,
        ...runtimeToolExecutionLimits,
      });
      // Report the post-filter tool list so runtime guidance describes what the
      // model can actually call. The CLI drops declared names it has no
      // executor for (read/createDoc/...), and prompt blocks keyed off the
      // declared list would advertise tools that never reach the schema.
      const exposedAgentConfig = agentConfig
        ? { ...agentConfig, exposedToolNames: activeAgentToolNames }
        : agentConfig;
      if (exposedAgentConfig && !deps.pastedTextStore) {
        preparedAgentRuntimeCache.set(cacheKey, {
          agentConfig: exposedAgentConfig,
          activeAgentToolNames,
          runtimeToolExecutionLimits,
          localToolExecutors,
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
      }),
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
          apiKeyRefResolver: createOAuthApiKeyRefResolver(),
          credentialBroker: createFileCredentialBroker(),
          loopbackRequest,
        }),
      }),
    resolveProviderBase: async (agentConfig) => {
      // 冷却检查放在派发点：loadAgentConfig 只负责加载配置，不应因冷却失败
      // （冷却 ≠ 配置错误，listAgents/预览等读配置路径不能被误伤）。
      const nowMs = now();
      const credentialKeyForGate = resolveCredentialKey(
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
      /**
       * 把一次上游响应的可用性结论落到本地 agent 记录（429 冷却 / 恢复）。
       * 决策用共享纯函数，本地只负责 IO；每条 transport 分支都必须调用它，
       * 否则限流 agent 会继续被 listAgents 列出、继续被选中、继续撞 429。
       */
      const recordLocalAvailability = async (status: number, body?: unknown) => {
        const key = typeof agentConfig.key === "string" ? agentConfig.key : "";
        if (!key) return;
        const action = resolveAvailabilityAction(status, body, now());
        if (action.kind === "noop") return;

        // Credential 层优先：限流是 provider 凭证的属性，不是 agent 的属性。
        // 共用同一 OAuth（chatgpt / claude / antigravity）的多个 agent 必须
        // 共享冷却，否则会逐个重复撞同一堵墙。
        //
        // 这一步还修掉了下面 agent 级写回的一个真实缺陷：agent 定义来自远端
        // global-cache 时本地并无记录，`if (!current) return` 会把 429 结论
        // 静默丢弃，nextAvailableAt 永远是 now。credential 存储不依赖 agent
        // 记录是否存在，因此即使本地没缓存过该 agent，冷却也能落盘。
        const credentialKey = resolveCredentialKey(
          agentConfig as unknown as Record<string, unknown>,
        );
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
        if (!current || typeof current !== "object") return;
        const record = current as Record<string, unknown>;
        // 无 deadline 时的 clear 是空操作，跳过可避免每次成功响应都写一次库。
        if (action.kind === "clear" && !("nextAvailableAt" in record)) return;
        const next = { ...record };
        if (action.kind === "mark") {
          // 取更晚者：短冷却（如 5xx 的 5 分钟）不得抹掉已落盘的长冷却（如周额度）。
          next.nextAvailableAt = mergeAvailabilityDeadline(
            record.nextAvailableAt,
            action.nextAvailableAt,
          );
        } else {
          delete next.nextAvailableAt;
        }
        await store.write(key, next).catch(() => undefined);
      };

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
      // 已知降级（有意接受）：探测时间只能记在 credential entry 上，因此解析不出
      // credentialKey 的 agent 拿不到 lastProbeAt，会每次派发都判 probe —— 对这类
      // agent 等同于不设冷却。注意 recordLocalAvailability 在 mark 时也会写 agent
      // 记录的 nextAvailableAt，所以这类冷却并非只有历史遗留数据会产生。
      // 之所以仍可接受：撞 429 的代价是一次被拒的请求（provider 已在限流，不会真正
      // 消耗配额），而反向的失败模式——冷却把可用凭证锁死数天——才是本次要修的故障。
      // 且 MAX_COOLDOWN_MS 已保证任何冷却最长 24h 自然过期。
      // 若日后要收紧，正解是给 agent 级记录也存 lastProbeAt，而不是退回硬 block。
      if (gateDecision === "probe" && credentialKeyForGate) {
        await recordCredentialProbe(credentialKeyForGate, deps.env, nowMs).catch(
          () => undefined,
        );
      }

      // Local-first: OAuth resolver + file credential broker (metered API keys).
      // Broker is preferred inside buildProviderExecutionPlan when both are present.
      const apiKeyRefResolver = createOAuthApiKeyRefResolver();
      const credentialBroker = createFileCredentialBroker();
      const serverUrl = asOptionalTrimmedString(deps.env.NOLO_SERVER) ?? "https://us.nolo.chat";
      const authToken = asOptionalTrimmedString(deps.env.AUTH_TOKEN);
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
      });
    },
    executeTool: async (call, opts) => {
      const contextualCall = opts?.runtimeContext
        ? { ...call, runtimeContext: opts.runtimeContext }
        : call;
      // Inject the current TUI conversation as the parent for local background
      // run delegations. Without this, a child run spawned from inside a TUI
      // turn carries no link to its orchestrating dialog, so the run-overlay
      // cannot answer "which runs belong to this conversation?". We inject
      // only when (a) this is a startAgentRun call and (b) we actually know
      // the current dialog id — otherwise leave the call untouched.
      let injectedCall = contextualCall;
      if (
        contextualCall.name === "startAgentRun" &&
        deps.parentDialogId &&
        typeof contextualCall.arguments === "string"
      ) {
        try {
          const args = JSON.parse(contextualCall.arguments);
          if (!args.parentDialogId) {
            injectedCall = {
              ...contextualCall,
              arguments: JSON.stringify({
                ...args,
                parentDialogId: deps.parentDialogId,
              }),
            };
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
      const result = await executeLocalToolWithPolicy({
        env: deps.env,
        agentToolNames: activeAgentToolNames,
        call: injectedCall,
        executors: localToolExecutors,
        abortSignal: opts?.abortSignal,
        detachMs: resolveExecShellDetachMs(deps.env),
        ...(deps.confirmDestructiveAction
          ? { confirmDestructiveAction: deps.confirmDestructiveAction }
          : {}),
      });
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

  // Direct providers keep the bounded whole-stream retry. Platform chat POSTs
  // do not: a lost response does not prove nolo/its upstream skipped execution,
  // so replaying here could duplicate provider cost and billing evidence.
  // Deployment drains remain retryable inside platformProxyTransport because
  // structured `503 core_draining` is emitted before provider admission.
  return {
    ...adapterBase,
    resolveProvider: async (agentConfig: AgentRuntimeAgentConfig) => {
      const provider = (await adapterBase.resolveProviderBase(
        agentConfig,
      )) as AgentRuntimeProvider;
      return shouldUsePlatformChatProvider(deps.env, agentConfig)
        ? provider
        : withProviderStreamRetry(provider, deps);
    },
  };
}
