import {
  LOCAL_AGENT_CONFIG_MISSING_CODE,
  LOCAL_TURN_ABORTED_CODE,
} from "../../agent-runtime/localLoop";
import { resolveAgentRuntimeConfigFromRecord } from "../../agent-runtime/agentRecordConfig";
import {
  applyModelLayerOverride,
  type ModelLayerOverride,
} from "../../agent-runtime/modelLayerOverride";
import type { AgentRuntimeHostAdapter } from "../agentRuntimeLocal";
import {
  createCliLocalRuntimeAdapter,
  isBuiltinNoloAgentRef,
} from "./localRuntimeAdapter";
import { isTransientFetchError } from "./localRuntimeFetchRetry";
import type {
  LocalAgentTurnInput,
} from "../../agent-runtime/localLoop";
import {
  buildTurnTokenUsage,
  formatUsage,
  platformCreditsFromUsage,
  shouldShowUsage,
  sumPlatformCredits,
  withTurnCredits,
} from "./tokenUsage";

import {
  createCliTurnOutput,
  formatAssistantResponseForCli,
} from "./agentRunOutput";
import { readStreamingAgentRun } from "./agentRunStream";
import {
  describeClientVersionTooOldFailure,
  isClientVersionTooOldFailure,
} from "./clientVersionTooOldFailure";

import {
  type DispatchPlan,
  resolveAuthToken,
  resolveFileWriteGateEnabled,
  isMachineBoundLocalhostCustomProvider,
  resolveBoundMachineId,
  detectCurrentMachineId,
  isCliProviderAgentConfig,
  type AgentRunSubjectRef,
  type RunAgentTurnOptions,
  type RunAgentTurnResult,
  type TaskEvidenceInput,
} from "./agentRunTypes";

export type { RunAgentTurnOptions, RunAgentTurnResult, TaskEvidenceInput };
import { Spinner } from "./agentRunSpinner";
import {
  resolveServerPlatformToolNames,
  isKnownServerPlatformAgent,
} from "./agentRunPlatformTools";
import { isGatewayHttpStatus } from "core/gatewayHttpStatus";
import { NOLO_CLIENT_VERSION_HEADER } from "core/clientVersionGate";
import { resolveClientVersion } from "../../agent-runtime/providerResolution";
import { expandCollapsedPastes } from "../../core/collapsedPaste";

import { ulid } from "ulid";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import { toErrorMessage } from "core/errorMessage";
import {
  readCredentialEntry,
  recordCredentialProbe,
  resolveCredentialKeyWithFallback,
} from "../credentialAvailability";
import {
  mergeAvailabilityDeadline,
  resolveCooldownGate,
} from "../../ai/agent/agentAvailabilityShared";
import { t } from "../tui/i18n";

/** Local loop is heavy; load only when a local turn actually runs. */
async function loadRunLocalAgentTurn() {
  const { runLocalAgentTurn } = await import("../agentRuntimeLocal");
  return runLocalAgentTurn;
}

type ReviewDecisionStatus = "passed" | "needs_changes" | "blocked";

// 剥离 provider 回显的调试噪音：`raw="..."` / `headers=[...]` 仅供诊断，
// 不应出现在面向用户的错误文案中。
const stripDebugNoise = (s: string) =>
  s
    .replace(/\s*raw="[\s\S]*"/g, "")
    .replace(/\s*raw=\S+/g, "")
    .replace(/\s*headers=\[[^\]]*\]/g, "")
    .replace(/\s*headers=\S+/g, "")
    .trim();

/**
 * 空 assistant 兜底标记的统一透传。
 *
 * 后台 run 结算（agentRunCommand 的 isRunResultStalledOrTruncated）依赖这两个
 * 字段区分「有正文的收尾帧缺失」与「真的没拿到输出」；两处 fold 点（成功路径
 * 与 localResult 折叠路径）此前各写一遍相同的 spread，新增字段时极易漏一处。
 * 收敛到这里后，漏转发只会发生在这一处，且 agentRunTurnCredits.test 的透传
 * 测试直接覆盖它。
 */
const pickEmptyAssistantFlags = (result: {
  emptyAssistantFallbackReason?: string;
  emptyAssistantOutputUsable?: boolean;
}): {
  emptyAssistantFallbackReason?: string;
  emptyAssistantOutputUsable?: true;
} => ({
  ...(result.emptyAssistantFallbackReason
    ? { emptyAssistantFallbackReason: result.emptyAssistantFallbackReason }
    : {}),
  ...(result.emptyAssistantOutputUsable ? { emptyAssistantOutputUsable: true as const } : {}),
});


function extractEmbeddedErrorMessage(message: string): string | undefined {
  const match = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(message);
  if (!match) return undefined;

  try {
    const decoded = JSON.parse(`"${match[1]}"`);
    if (typeof decoded !== "string" || !decoded.trim()) return undefined;
    // 控制字符（\u0000-\u001f、\u007f）在 \uXXXX 解码后会变成真实终端序列
    // （ESC 清屏 / 光标移动），provider 可控文本必须先剥离再进用户文案。
    const cleaned = decoded.replace(/[\u0000-\u001f\u007f]/g, "");
    return cleaned.trim() ? cleaned : undefined;
  } catch {
    return undefined;
  }
}

function parseEmbeddedBalanceDetails(
  message: string,
): { required: string; current: string } | undefined {
  const jsonStart = message.indexOf('{"error"');
  if (jsonStart < 0) return undefined;

  try {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;
    for (let i = jsonStart; i < message.length; i += 1) {
      const char = message[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}" && --depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd < 0) return undefined;
    const parsed: unknown = JSON.parse(message.slice(jsonStart, jsonEnd));
    if (!parsed || typeof parsed !== "object") return undefined;
    const error = (parsed as { error?: unknown }).error;
    if (!error || typeof error !== "object") return undefined;
    const details = (error as { details?: unknown }).details;
    if (!details || typeof details !== "object") return undefined;
    const requiredBalance = (details as { requiredBalance?: unknown }).requiredBalance;
    const currentBalance = (details as { currentBalance?: unknown }).currentBalance;
    if (typeof requiredBalance !== "number" || typeof currentBalance !== "number") {
      return undefined;
    }
    // 病态数值（1e999 → Infinity、负数）只影响显示：降级回 provider 原文，
    // 而不是渲染出「需要余额 > Infinity」这类原因行（review LOW 建议采纳）。
    if (
      !Number.isFinite(requiredBalance) ||
      !Number.isFinite(currentBalance) ||
      requiredBalance <= 0
    ) {
      return undefined;
    }
    return { required: String(requiredBalance), current: String(currentBalance) };
  } catch {
    return undefined;
  }
}

async function resolveCurrentMachineId(options: RunAgentTurnOptions) {
  return options.currentMachineIdResolver
    ? options.currentMachineIdResolver(options.env)
    : detectCurrentMachineId(options.env);
}

function resolveRequestedRuntimeMode(options: RunAgentTurnOptions) {
  const envMode = options.env.NOLO_RUNTIME_MODE;
  if (options.runtimeMode) return options.runtimeMode;
  if (envMode === "local" || envMode === "server" || envMode === "auto")
    return envMode;
  return "auto";
}

function canResolveCollapsedPasteReference(
  store: import("../../core/collapsedPaste").CollapsedPasteStore,
  content: import("../../agent-runtime/types").AgentRuntimeMessageContent,
) {
  const expand = (text: string) => expandCollapsedPastes(text, store) !== text;
  if (typeof content === "string") return expand(content);
  if (!Array.isArray(content)) return false;
  return content.some((part) => part.type === "text" && expand(part.text));
}

function buildDefaultLocalRuntimeAdapter(options: RunAgentTurnOptions) {
  return createCliLocalRuntimeAdapter({
    env: options.env,
    fetchImpl: options.fetchImpl,
    cwd: options.localRuntimeCwd,
    output: options.output,
    ...(options.confirmDestructiveAction
      ? { confirmDestructiveAction: options.confirmDestructiveAction }
      : {}),
    ...(options.requestUserChoice
      ? { requestUserChoice: options.requestUserChoice }
      : {}),
    ...(options.pastedTextStore?.items.size
      ? { pastedTextStore: options.pastedTextStore }
      : {}),
    ...(options.activityReporter
      ? { activityReporter: options.activityReporter }
      : {}),
  });
}

function resolveLocalRuntimeAdapter(options: RunAgentTurnOptions) {
  return (
    options.localRuntimeAdapter ||
    options.localRuntimeAdapterFactory?.(options.env, {
      cwd: options.localRuntimeCwd,
    }) ||
    buildDefaultLocalRuntimeAdapter(options)
  );
}

/**
 * Ephemeral / memory-only adapter wrapper. Replaces `saveTurn` with an
 * in-memory no-op (returns the turn's dialogId without writing to any store
 * or syncing to a remote server) and `loadDialogHistory` with an empty
 * history (ephemeral dialogs are never persisted, so they have no history to
 * load). Capabilities are intentionally left untouched — persistence
 * *capability* is descriptive host metadata consumed by runtime decision
 * logic (runtimeFacts/runtimeDecision); ephemeral changes *behavior* on
 * this turn, not the host's capability set. Everything else (agent config,
 * provider, tools) is unchanged so a liveness probe still exercises the real
 * runtime path — only persistence is stripped out.
 */
function wrapAdapterEphemeral(
  adapter: AgentRuntimeHostAdapter,
): AgentRuntimeHostAdapter {
  return {
    ...adapter,
    loadDialogHistory: async () => [],
    saveTurn: async (input) => ({
      dialogId: input.continueDialogId ?? "ephemeral",
    }),
  };
}

function applyEphemeralIfRequested(
  options: RunAgentTurnOptions,
  adapter: AgentRuntimeHostAdapter,
): AgentRuntimeHostAdapter {
  return options.ephemeral ? wrapAdapterEphemeral(adapter) : adapter;
}

/**
 * quick-chat 自动路由的 model 层覆盖（local 模式）：tier agent 的配置从
 * adapter 读出后，用覆盖包替换其 model 层再交给 local loop；
 * 其余 agentRef 透传，不影响 startAgentRun 子代理。
 */
function wrapLoadAgentConfigWithModelOverride(
  adapter: AgentRuntimeHostAdapter,
  targetAgentKey: string,
  override: ModelLayerOverride,
): AgentRuntimeHostAdapter {
  return {
    ...adapter,
    loadAgentConfig: async (agentRef: string) => {
      const config = await adapter.loadAgentConfig(agentRef);
      if (!config || agentRef !== targetAgentKey) return config;
      const baseRecord =
        (config as { rawRecord?: Record<string, unknown> }).rawRecord ??
        (config as unknown as Record<string, unknown>);
      return resolveAgentRuntimeConfigFromRecord(
        agentRef,
        applyModelLayerOverride(baseRecord, override),
      );
    },
  };
}

async function shouldSkipAutoLocalForServerPlatformTools(
  options: RunAgentTurnOptions,
) {
  if (isBuiltinNoloAgentRef(options.agentKey)) return false;
  if (options.localRuntimeCwd) {
    return false;
  }
  const knownServerPlatformAgent = isKnownServerPlatformAgent(options);
  const adapter = resolveLocalRuntimeAdapter(options);
  if (!adapter) return knownServerPlatformAgent;
  let agentConfig;
  try {
    agentConfig = await adapter.loadAgentConfig(options.agentKey);
  } catch {
    if (knownServerPlatformAgent) {
      options.output.write(
        `[nolo] auto runtime: skipping local runtime because ${options.agentKey} is a known platform agent. ` +
          "Use --local explicitly to force local workspace tools.\n",
      );
      return true;
    }
    return false;
  }
  if (isCliProviderAgentConfig(agentConfig)) {
    const boundMachineId = resolveBoundMachineId(agentConfig);
    if (!boundMachineId) return false;
    const currentMachineId =
      (await resolveCurrentMachineId(options))?.trim() || "";
    if (currentMachineId && currentMachineId === boundMachineId) return false;
    options.output.write(
      `[nolo] auto runtime: skipping local runtime because ${options.agentKey} is bound to ${boundMachineId}` +
        (currentMachineId ? ` and this machine is ${currentMachineId}.` : ".") +
        " Use --local explicitly to force the current machine.\n",
    );
    return true;
  }
  if (knownServerPlatformAgent) {
    options.output.write(
      `[nolo] auto runtime: skipping local runtime because ${options.agentKey} is a known platform agent. ` +
        "Use --local explicitly to force local workspace tools.\n",
    );
    return true;
  }
  if (isMachineBoundLocalhostCustomProvider(agentConfig)) {
    options.output.write(
      `[nolo] auto runtime: skipping local runtime because ${options.agentKey} is a machine-bound localhost custom provider. ` +
        "Use --local explicitly to force the current machine.\n",
    );
    return true;
  }
  const serverTools = resolveServerPlatformToolNames(agentConfig);
  if (serverTools.length === 0) return false;
  options.output.write(
    `[nolo] auto runtime: skipping local runtime because ${options.agentKey} declares server platform tools ` +
      `(${serverTools.join(", ")}). Use --local explicitly to force local workspace tools.\n`,
  );
  return true;
}

function buildUserInputContent(message: string, imageUrls: string[] = []) {
  if (imageUrls.length === 0) return message;
  return [
    ...(message.trim() ? [{ type: "text" as const, text: message }] : []),
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];
}

function buildSubjectRefs(options: RunAgentTurnOptions) {
  const refs: AgentRunSubjectRef[] = [];
  const seen = new Set<string>();
  const pushRef = (ref: AgentRunSubjectRef) => {
    const kind = ref.kind.trim();
    const id = ref.id.trim();
    const role = ref.role?.trim();
    if (!kind || !id) return;
    const key = `${kind}\u0000${id}\u0000${role ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ kind, id, ...(role ? { role } : {}) });
  };
  for (const ref of options.subjectRefs ?? []) pushRef(ref);
  if (options.subjectDialogKey) {
    pushRef({
      kind: "dialog",
      id: options.subjectDialogKey,
      role: "subject",
    });
  }
  if (options.taskEvidence?.rowDbKey) {
    pushRef({
      kind: "table-row",
      id: options.taskEvidence.rowDbKey,
      role: "task",
    });
  }
  for (const artifactId of options.taskEvidence?.artifactIds ?? []) {
    pushRef({
      kind: "artifact",
      id: artifactId,
      role: "evidence",
    });
  }
  return refs.length ? refs : undefined;
}

function isMissingLocalAgentConfigError(error: unknown, agentRef: string) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string; agentRef?: string }).code ===
      LOCAL_AGENT_CONFIG_MISSING_CODE &&
    (error as { code?: string; agentRef?: string }).agentRef === agentRef,
  );
}

/**
 * Detect failures raised by a provider HTTP transport. A provider transport
 * is anything that called an upstream chat-completions endpoint and got a
 * non-OK response — that includes the local runtime calling an upstream
 * directly (`local provider failed:`, `local antigravity provider failed:`,
 * `local Claude OAuth provider failed:`, `local Codex OAuth provider
 * failed:`, `gemini native tool provider failed:`) and the nolo server
 * proxying the chat request (`platform provider failed:`, `desktop platform
 * provider failed:`).
 *
 * All of these mean the *upstream* returned non-OK, NOT that the local OS
 * credential broker is broken — so they should never be reported as "fix
 * the local credential/config" unless the status is an explicit auth failure
 * (401/403).
 *
 * The regex matches the common shape `<label> provider failed: HTTP <status>`
 * shared by every adapter, so newly added transports are covered without
 * editing this function. `scripts/benchmarks/localAgentToolsetBenchmark.ts`
 * uses the same shape.
 *
 * Empty body (`{}`) is typical of a gateway 502/504, not of an application-
 * layer nolo error (which always returns a JSON `{error:{message,code}}`).
 */
const PROVIDER_HTTP_FAILED_RE =
  /(.+?) provider failed:\s*HTTP\s+(\d+)\b/i;

/**
 * Platform transports (nolo server proxying the request) are identified by the
 * label containing `platform provider failed`. Everything else is a local
 * transport. `desktop platform provider failed` is the desktop-adapter flavor
 * of the same platform hop and is intentionally covered by this substring.
 */
const PLATFORM_TRANSPORT_RE = /\bplatform provider failed\b/i;

type ProviderTransport = "local" | "platform";

type LocalRunErrorClass =
  | { kind: "generic" }
  | {
      kind:
        | "auth"
        | "rejected-payload"
        | "rate-limit"
        | "transient"
        | "upstream";
      transport: ProviderTransport;
      status: number;
    };

/**
 * Classify a provider HTTP failure into a user-facing category.
 *
 * Status → kind mapping (applies to both local and platform transports):
 *   401 / 403          → auth            (credential/permission — legit "fix local credential")
 *   400 / 422          → rejected-payload (upstream rejected the *request body*; NOT a credential
 *                                         issue — e.g. `invalid tool call arguments` when a dialog
 *                                         history contains tool_calls from a different model after
 *                                         `/switch`, or any `invalid_request_error`)
 *   429                → rate-limit      (provider throttling — retry)
 *   500–599            → transient       (gateway/upstream hiccup — retry)
 *   other 4xx          → upstream        (provider-side rejection, not local config)
 *   no HTTP match      → generic         (genuinely local config/runtime — "fix local credential")
 */
function classifyLocalRunError(message: string): LocalRunErrorClass {
  const m = message.match(PROVIDER_HTTP_FAILED_RE);
  if (!m) return { kind: "generic" };
  const status = Number(m[2]);
  const transport: ProviderTransport = PLATFORM_TRANSPORT_RE.test(message)
    ? "platform"
    : "local";

  if (status === 401 || status === 403) {
    return { kind: "auth", transport, status };
  }
  if (status === 400 || status === 422) {
    return { kind: "rejected-payload", transport, status };
  }
  if (status === 429) {
    return { kind: "rate-limit", transport, status };
  }
  if (status >= 500 && status <= 599) {
    return { kind: "transient", transport, status };
  }
  return { kind: "upstream", transport, status };
}

/**
 * Hint that the rejection looks like a history-replay problem (the upstream
 * refused tool_calls / arguments carried over from a prior model), as opposed
 * to a generic 400. Detected from the upstream `error.message` /
 * `invalid_request_error` body that `describeProviderFailure` already inlined
 * into the error string.
 *
 * Keep this narrow: only fire the history-replay hint when the body explicitly
 * mentions `tool_call` arguments or an `invalid_request_error` type. A bare
 * `invalid arguments` (e.g. Google's INVALID_ARGUMENT for a bad request field)
 * is NOT necessarily a history-replay problem and should not trigger the
 * "/switch history" lecture.
 */
const HISTORY_REPLAY_REJECTION_RE =
  /invalid_request_error|invalid\s+tool\s+call\s+arguments?/i;

/**
 * Shared framing for the five non-402 local-run failure builders below.
 * The 402 branch deliberately does not use this prefix: the TUI immediately
 * follows it with a localized balance hint, so the old bilingual scaffolding
 * made the failure line noisy and repetitive.
 *
 * Tradeoff accepted in review (MEDIUM-info, option ①): on the plain CLI /
 * headless path (options.output.write here) no hint line follows, so the 402
 * output carries no explicit top-up guidance. The extracted provider message
 * ("余额不足，无法继续访问（需要余额 > 1，当前0.923167）") is self-explanatory,
 * so the guidance duplication was dropped on purpose.
 */
const RUN_UNAVAILABLE_PREFIX = "[nolo] auto runtime: local run unavailable";
const NO_FALLBACK = "Not falling back to server.";
const SERVER_FALLBACK_HINT = "or use --server to run on the server explicitly.";

/**
 * Per-kind message builders. Each is a small pure function that returns the
 * user-facing line for one failure category. Adding a new kind (e.g. 408
 * timeout) is now a one-line entry here + the classifyLocalRunError status
 * map, instead of editing a 70-line switch body.
 */
type FailureCtx = {
  message: string;
  /** Human-readable transport label: "server chat proxy" or "local provider". */
  where: "server chat proxy" | "local provider";
  status: number;
  /**
   * 启动期 429 兜底落盘后的冷却截止（ISO）。由 rawError.cooldownUntil 传入
   * （markStartupRateLimitCooldown 把它挂在错误对象上，沿用 localLoop 把
   * dialogId 挂错误上的既有模式）；undefined = 未命中 rate-limit 或落盘跳过。
   */
  cooldownUntil?: string;
};

function buildAuthFailure(ctx: FailureCtx): string {
  // 401/403 is the one case where "fix the local credential" is correct.
  // For the platform transport the credential lives on nolo.chat, not the
  // local machine, so point there instead.
  const fix = ctx.where === "server chat proxy"
    ? `Check the agent's provider/api-key settings on nolo.chat`
    : `Fix the local credential/config and retry`;
  return (
    `${RUN_UNAVAILABLE_PREFIX} (${ctx.where} returned HTTP ${ctx.status}, auth rejected). Detail: ${ctx.message} ` +
    `${NO_FALLBACK} ${fix}, ${SERVER_FALLBACK_HINT}.\n`
  );
}

function buildRejectedPayloadFailure(ctx: FailureCtx): string {
  // 400/422: the upstream rejected the request BODY. This is never a local
  // credential issue. The most common cause is replaying a dialog history
  // that contains tool_calls / reasoning produced by a different model
  // (e.g. after `/switch`), which the new provider's gateway validates more
  // strictly and rejects with `invalid tool call arguments` /
  // `invalid_request_error`.
  const looksLikeHistoryReplay = HISTORY_REPLAY_REJECTION_RE.test(ctx.message);
  const cause = looksLikeHistoryReplay
    ? ` This usually happens when the dialog history contains tool_calls or reasoning produced by a different model/provider (e.g. after /switch); the new provider rejects that history. Start a fresh dialog, or clean the offending history.`
    : "";
  return (
    `${RUN_UNAVAILABLE_PREFIX} (${ctx.where} returned HTTP ${ctx.status}, the provider rejected the request body — this is NOT a local credential/config issue). Detail: ${ctx.message}${cause} ` +
    `${NO_FALLBACK} Use --server to run on the server explicitly, or start a fresh dialog.\n`
  );
}

function buildRateLimitFailure(ctx: FailureCtx): string {
  // 启动期 429 已由 markStartupRateLimitCooldown 落冷却（与 run 中途同语义）。
  // 文案必须带上「已标记冷却至 <ISO>」：用户不再只看到一次限流报错，还能知道
  // 该 agent 在冷却解除前会被派发门控拦住，不会继续白撞 429。
  const cooldownNote = ctx.cooldownUntil
    ? ` 已标记冷却至 ${ctx.cooldownUntil}，到期前派发会被冷却门控拦截（到期自动 probe 恢复）。`
    : "";
  return (
    `${RUN_UNAVAILABLE_PREFIX} (${ctx.where} returned HTTP ${ctx.status}, rate limited). Detail: ${ctx.message} ` +
    `${NO_FALLBACK} Retry shortly, ${SERVER_FALLBACK_HINT}.${cooldownNote}\n`
  );
}

function buildTransientFailure(ctx: FailureCtx): string {
  return (
    `${RUN_UNAVAILABLE_PREFIX} (${ctx.where} returned HTTP ${ctx.status}; this is an upstream/gateway issue, not your local credential or config). Detail: ${ctx.message} ` +
    `${NO_FALLBACK} Retry shortly, ${SERVER_FALLBACK_HINT}.\n`
  );
}

function buildUpstreamFailure(ctx: FailureCtx): string {
  // Other 4xx (404/405/451/…): provider-side rejection that is neither auth
  // nor a request-body validation error. For the platform transport the fix
  // is on nolo.chat; for the local transport it's the agent's endpoint/model.
  const fix = ctx.where === "server chat proxy"
    ? `Check the agent's provider/api-key settings on nolo.chat`
    : `Check the agent's endpoint/model settings`;
  return (
    `${RUN_UNAVAILABLE_PREFIX} (${ctx.where} returned HTTP ${ctx.status}). Detail: ${ctx.message} ` +
    `${NO_FALLBACK} ${fix}, ${SERVER_FALLBACK_HINT}.\n`
  );
}

/**
 * Map each classified kind to its message builder. Keys mirror the `kind`
 * union in LocalRunErrorClass. `auth`/`upstream` branch on transport inside
 * their builder, so the table is a flat lookup.
 */
const FAILURE_BUILDERS: Record<
  Exclude<LocalRunErrorClass, { kind: "generic" }>["kind"],
  (ctx: FailureCtx) => string
> = {
  auth: buildAuthFailure,
  "rejected-payload": buildRejectedPayloadFailure,
  "rate-limit": buildRateLimitFailure,
  transient: buildTransientFailure,
  upstream: buildUpstreamFailure,
};

export function describeLocalRunFailure(
  message: string,
  rawError?: unknown,
): string {
  // 客户端版本闸门拒绝（本地 self-check 在 providerResolution 抛错，Error 上带
  // code + 结构化 detail）：渲染含模型/所需版本/升级命令的可操作提示。与
  // agentRunStream 的 server-run 分支共用同一份渲染，避免文案漂移。
  if (isClientVersionTooOldFailure(message, rawError)) {
    return describeClientVersionTooOldFailure(message, rawError);
  }

  // Extract an in-band busy detail (e.g. "runinfra HTTP 503 (pc_123, 2
  // attempts)") carried on the thrown error's `.detail`. It survives
  // `toErrorMessage` only through the raw object, so it's threaded in here.
  let busyDetail: string | undefined;
  if (
    rawError &&
    typeof rawError === "object" &&
    "detail" in rawError &&
    typeof (rawError as { detail: unknown }).detail === "string" &&
    (rawError as { detail: string }).detail.trim()
  ) {
    busyDetail = (rawError as { detail: string }).detail.trim();
  }

  // 服务器紧张 (PLATFORM_LLM_BUSY): the platform LLM upstream is
  // capacity-limited / timed out. Root cause is on the platform, not the
  // user's machine — never suggest fixing local credentials.
  if (
    /PLATFORM_LLM_BUSY|服务器紧张/.test(message)
  ) {
    const shown = stripDebugNoise(
      message.replace(/\s*\(PLATFORM_LLM_BUSY\)\s*$/, ""),
    );
    const cleanedBusyDetail = busyDetail ? stripDebugNoise(busyDetail) : undefined;
    return (
      `${RUN_UNAVAILABLE_PREFIX} 服务器紧张${shown !== "服务器紧张" ? ` (${shown})` : ""} (PLATFORM_LLM_BUSY)${cleanedBusyDetail ? `: ${cleanedBusyDetail}` : ""}. ${NO_FALLBACK} ` +
      `平台模型上游繁忙，稍后重试或换个模型。Retry shortly, ${SERVER_FALLBACK_HINT}\n`
    );
  }

  // Balance/402 is the common "I just topped up / please continue" case —
  // never tell the user to fix local credentials.
  if (
    /UPSTREAM_402|Insufficient Balance|余额不足|insufficient\s+balance/i.test(
      message,
    )
  ) {
    const cleanedMessage = stripDebugNoise(message);
    const fallback = cleanedMessage.replace(
      /^[^:]*provider failed: HTTP \d{3}\s*/,
      "",
    );
    const balanceDetails = parseEmbeddedBalanceDetails(cleanedMessage);
    const shownMessage = balanceDetails
      ? t(
          "balanceInsufficientReason",
          balanceDetails.required,
          balanceDetails.current,
        )
      : extractEmbeddedErrorMessage(cleanedMessage) ?? fallback;
    return `[nolo] ${shownMessage}\n`;
  }

  const cls = classifyLocalRunError(message);
  if (cls.kind === "generic") {
    // Socket/network deaths mid-stream are upstream transport failures —
    // telling the user to "fix the local credential/config" points the
    // investigation in the wrong direction (this exact wording misled a real
    // mid-stream kill investigation; the 502/503 branches already carry
    // "not your local credential" disclaimers).
    if (isTransientFetchError(message)) {
      return (
        `${RUN_UNAVAILABLE_PREFIX} (${message}). ${NO_FALLBACK} ` +
        `The upstream connection dropped mid-request (transient network/gateway issue — not a local credential or config problem). Send again (or say "continue") to retry in the same conversation.\n`
      );
    }
    return (
      `${RUN_UNAVAILABLE_PREFIX} (${message}). ${NO_FALLBACK} ` +
      `Fix the local credential/config and retry, ${SERVER_FALLBACK_HINT}.\n`
    );
  }

  // 启动期 429 兜底落盘后的冷却截止挂在 rawError 上（markStartupRateLimitCooldown）。
  const cooldownUntil =
    rawError && typeof rawError === "object"
      ? (rawError as { cooldownUntil?: string }).cooldownUntil
      : undefined;
  const ctx: FailureCtx = {
    message,
    where: cls.transport === "platform" ? "server chat proxy" : "local provider",
    status: cls.status,
    ...(cooldownUntil ? { cooldownUntil } : {}),
  };
  return FAILURE_BUILDERS[cls.kind](ctx);
}

/**
 * 启动期 rate-limit 冷却兜底落盘。
 *
 * 缺陷背景：agent run 启动期的 provider 429（如 Codex/Claude OAuth 握手期
 * "usage limit reached"、antigravity "Individual quota reached"）往往在
 * transport 抛错路径上没走到响应分支的 recordLocalAvailability，只被
 * classifyLocalRunError 分类后打日志 exit 1，冷却不落盘 → agent 照常被
 * listAgents 列出、下次派发继续撞 429。这里补上与 run 中途完全同语义的落盘：
 * resolveAvailabilityAction 解析 status=429 + 从 message 文本提取复位文案
 * （"Resets in 1h35m38s" / "reset at …" / weekly usage limit 启发式）→
 * credential 级优先写盘 → agent 级 nextAvailableAt（merge 取更晚者）。
 *
 * 幂等：transport 响应分支已落盘时重复 mark 由 mergeAvailabilityDeadline
 * 收敛到更晚者，不会缩短既有冷却。解析不出复位时刻时由共享层落到保守默认
 * 窗口（DEFAULT_PROVIDER_RETRY_MS），不新发明数值。
 *
 * 返回最终生效的冷却截止 ISO（agent 级与 credential 级取更晚者），供失败文案
 * 「已标记冷却至 <ISO>」；未命中 rate-limit / adapter 无扩展方法 / 落盘失败
 * 一律返回 undefined（文案退回原样，退出码与退出路径不变）。
 */
async function markStartupRateLimitCooldown(
  options: RunAgentTurnOptions,
  adapter: AgentRuntimeHostAdapter | undefined,
  message: string,
): Promise<string | undefined> {
  const cls = classifyLocalRunError(message);
  if (cls.kind !== "rate-limit") return undefined;
  const recorder = adapter as
    | (AgentRuntimeHostAdapter & {
        recordStartupAvailabilityForAgent?(
          agentRef: string,
          status: number,
          body?: unknown,
        ): Promise<number | undefined>;
      })
    | undefined;
  if (typeof recorder?.recordStartupAvailabilityForAgent !== "function") {
    return undefined;
  }
  try {
    const effectiveNextAvailableAt =
      await recorder.recordStartupAvailabilityForAgent(
        options.agentKey,
        cls.status,
        message,
      );
    return typeof effectiveNextAvailableAt === "number"
      ? new Date(effectiveNextAvailableAt).toISOString()
      : undefined;
  } catch {
    // 冷却落盘是尽力而为：失败不改变 run 失败的呈现与退出码。
    return undefined;
  }
}

function shouldAttemptAutoLocal(options: RunAgentTurnOptions) {
  if (options.localRuntimeAdapter || options.localRuntimeAdapterFactory)
    return true;
  if (
    options.env.NOLO_DISABLE_CLI_WORKSPACE_TOOLS !== "1" &&
    isBuiltinNoloAgentRef(options.agentKey) &&
    resolveAuthToken(options.env)
  ) {
    return true;
  }
  if (
    options.env.NOLO_DISABLE_CLI_WORKSPACE_TOOLS !== "1" &&
    resolveAuthToken(options.env) &&
    !isKnownServerPlatformAgent(options)
  ) {
    return true;
  }
  return Boolean(
    options.env.NOLO_LOCAL_OPENAI_API_KEY ||
    options.env.OPENAI_API_KEY ||
    options.env.NOLO_LOCAL_OPENAI_BASE_URL ||
    options.env.OPENAI_BASE_URL ||
    options.env.NOLO_LOCAL_AGENT_KEY,
  );
}

export function classifyReviewDecisionStatus(
  summary?: string,
): ReviewDecisionStatus | undefined {
  const normalized = summary?.toLowerCase().trim();
  if (!normalized) return undefined;

  const explicit = normalized.match(
    /review\s+decision\s*:\s*(passed|needs_changes|blocked)/,
  );
  if (explicit?.[1]) return explicit[1] as ReviewDecisionStatus;

  if (
    /\b(blocked|cannot review|unable to review)\b|无法审查|阻塞/.test(
      normalized,
    )
  ) {
    return "blocked";
  }
  if (
    /\b(needs changes|request changes|changes requested|not approved)\b|需要修改|需修改|发现问题/.test(
      normalized,
    )
  ) {
    return "needs_changes";
  }
  if (/\b(approved|lgtm|no issues|passed)\b|通过|无问题/.test(normalized)) {
    return "passed";
  }
  return undefined;
}

function buildTransportErrorHint(serverUrl: string, error: unknown) {
  const endpoint = `${serverUrl}/api/agent/run`;
  const reason = toErrorMessage(error);

  let detail = `[nolo] Could not reach ${endpoint}.\n` + `Reason: ${reason}\n`;

  try {
    const parsed = new URL(serverUrl);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      detail +=
        "If you meant local dev, start the local API first.\n" +
        "Otherwise set NOLO_SERVER to a reachable server, or re-run `nolo login --server https://nolo.chat`.\n";
      return detail;
    }
  } catch {
    // Keep the generic hint below when serverUrl is not a valid absolute URL.
  }

  detail +=
    "Check NOLO_SERVER / BASE_URL and make sure the configured server is reachable.\n";
  return detail;
}

async function readAgentRunFailureMetadata(
  res: Response,
): Promise<{ dialogId?: string }> {
  const data = await res
    .clone()
    .json()
    .catch(() => ({}));
  return {
    ...(asOptionalTrimmedString(data?.dialogId)
      ? { dialogId: asOptionalTrimmedString(data?.dialogId) }
      : {}),
  };
}

async function runHttpAgentTurn(
  options: RunAgentTurnOptions,
  authToken: string,
): Promise<RunAgentTurnResult> {
  const spinner = new Spinner(
    options.output,
    `${options.agentName} -> working`,
    // 与 createCliTurnOutput 的兜底构造一致：传入 activityReporter 时
    // Spinner 静默，避免 TUI docked 活动行与 spinner 帧重复 live 指示。
    Boolean(options.activityReporter),
  );
  spinner.start();

  const fetchImpl = options.fetchImpl ?? fetch;
  // 本 CLI 自身版本（packages/cli/index.ts 注入 NOLO_CLI_VERSION）。
  // 缺失时不发头 —— server 侧 fail-open，见 platformHostedClientVersionGate。
  const clientVersionHeader = resolveClientVersion(options.env ?? {});
  const subjectRefs = buildSubjectRefs(options);
  const allowedChildAgentKeys = options.allowedChildAgentKeys?.filter((key) =>
    key.trim(),
  );
  const allowedToolNames = options.allowedToolNames?.filter((name) =>
    name.trim(),
  );
  const blockedToolNames = options.blockedToolNames?.filter((name) =>
    name.trim(),
  );
  const shouldStream = !options.noStream && !options.background;
  const expandedMessage = options.pastedTextStore?.items.size
    ? expandCollapsedPastes(options.message, options.pastedTextStore)
    : options.message;
  // Server path: pass context blocks as canonical contextBlockScopes request
  // field instead of prepending to userInput. Prefer the already-scoped
  // representation; fall back to converting plain extraContextBlocks to
  // turn-scope blocks (the CLI client doesn't know session vs turn).
  const serverContextBlockScopes =
    options.contextBlockScopes && options.contextBlockScopes.length > 0
      ? options.contextBlockScopes
      : options.extraContextBlocks && options.extraContextBlocks.length > 0
        ? options.extraContextBlocks.map((block) => ({
            content: block,
            cacheScope: "turn" as const,
          }))
        : undefined;
  const buildRequestBody = (stream: boolean) =>
    JSON.stringify({
      agentKey: options.agentKey,
      userInput: buildUserInputContent(expandedMessage, options.imageUrls),
      runtimeContext: {
        surface: "cli",
        host: "terminal",
        runtime: "bun",
        entrypoint: "nolo-cli",
        capabilities: ["text-io", "streaming", "slash-commands"],
        ...(options.dialogAgentMode
          ? { dialogAgentMode: options.dialogAgentMode }
          : {}),
        ...(subjectRefs ? { subjectRefs } : {}),
        ...(allowedChildAgentKeys?.length ? { allowedChildAgentKeys } : {}),
        ...(blockedToolNames?.length ? { blockedToolNames } : {}),
        ...(allowedToolNames?.length ? { allowedToolNames } : {}),
      },
      ...(options.continueDialogId
        ? { continueDialogId: options.continueDialogId }
        : {}),
      ...(options.spaceId ? { spaceId: options.spaceId } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.inheritedFromDialogKey
        ? { inheritedFromDialogKey: options.inheritedFromDialogKey }
        : {}),
      ...(options.parentDialogId
        ? { parentDialogId: options.parentDialogId }
        : {}),
      ...(options.background ? { background: true } : {}),
      ...(options.ephemeral ? { ephemeral: true } : {}),
      ...(typeof options.timeoutMs === "number"
        ? { timeoutMs: options.timeoutMs }
        : {}),
      ...(options.modelOverride
        ? { runtimeOptions: { quickChatModelOverride: options.modelOverride } }
        : {}),
      ...(serverContextBlockScopes ? { contextBlockScopes: serverContextBlockScopes } : {}),
      stream,
    });
  const postAgentRun = (stream: boolean) =>
    fetchImpl(`${options.serverUrl}/api/agent/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        // 客户端版本闸门：与鉴权头同处注入。server 侧据此拒绝旧客户端选中的
        // 新托管模型（明确提示升级），而不是放行去连续截断 + 照常扣积分。
        ...(clientVersionHeader
          ? { [NOLO_CLIENT_VERSION_HEADER]: clientVersionHeader }
          : {}),
      },
      body: buildRequestBody(stream),
      ...(options.abortSignal ? { signal: options.abortSignal } : {}),
    });
  let res: Response;
  try {
    res = await postAgentRun(shouldStream);
  } catch (error) {
    spinner.stop();
    if (options.abortSignal?.aborted) {
      return { exitCode: 0, streamInterrupted: true };
    }
    options.output.write(buildTransportErrorHint(options.serverUrl, error));
    return { exitCode: 1 };
  }

  if (shouldStream && isGatewayHttpStatus(res.status)) {
    const failureMeta = await readAgentRunFailureMetadata(res);
    if (!failureMeta.dialogId) {
      spinner.stop();
      options.output.write(
        `[nolo] streaming request returned HTTP ${res.status}; retrying once without streaming.\n`,
      );
      spinner.start();
      try {
        res = await postAgentRun(false);
      } catch (error) {
        spinner.stop();
        options.output.write(buildTransportErrorHint(options.serverUrl, error));
        return { exitCode: 1 };
      }
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream") && res.body) {
    const result = await readStreamingAgentRun(options, res, spinner);
    return result;
  }

  spinner.stop();
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    options.output.write(`[nolo] Agent request failed: HTTP ${res.status}\n`);
    const errorText = asTrimmedString(data?.error);
    const messageText = asTrimmedString(data?.message);
    const reasonText = asTrimmedString(data?.reason);
    const codeText = asTrimmedString(data?.code);
    const dialogIdText = asTrimmedString(data?.dialogId);
    if (errorText || messageText) {
      options.output.write(`${errorText || messageText}\n`);
      if (messageText && messageText !== errorText) {
        options.output.write(`${messageText}\n`);
      }
      if (codeText && codeText !== errorText && codeText !== messageText) {
        options.output.write(`code=${codeText}\n`);
      }
      if (
        reasonText &&
        reasonText !== errorText &&
        reasonText !== messageText
      ) {
        options.output.write(`reason=${reasonText}\n`);
      }
    }
    if (dialogIdText) {
      options.output.write(`[nolo] failed dialog: ${dialogIdText}\n`);
      options.output.write(
        `[nolo] continue with: nolo agent run ${options.agentKey} --continue ${dialogIdText} --msg "retry"\n`,
      );
    }
    return dialogIdText
      ? { exitCode: 1, dialogId: dialogIdText }
      : { exitCode: 1 };
  }

  const content = formatAssistantResponseForCli(
    String(data?.content ?? data?.message ?? ""),
  );
  if (content) {
    options.output.write(`\n${options.agentName} > ${content}\n`);
  } else {
    options.output.write(`\n${options.agentName} > (no text response)\n`);
  }

  const usage = formatUsage(data?.usage, data?.dialogId);
  if (usage && shouldShowUsage(options.env)) options.output.write(`${usage}\n`);
  // 同流式分支：非流式 done 响应的 cost 已是整个 run 的汇总额。
  const turnCredits = platformCreditsFromUsage(
    data?.usage as Record<string, unknown> | undefined,
  );
  return {
    exitCode: 0,
    ...(typeof data?.dialogId === "string" && data.dialogId
      ? { dialogId: data.dialogId }
      : {}),
    turnTokens: buildTurnTokenUsage(
      data?.usage,
      typeof data?.model === "string" ? data.model : options.agentKey,
    ),
    ...(turnCredits !== undefined ? { turnCredits } : {}),
  };
}

async function runInjectedLocalAgentTurn(options: RunAgentTurnOptions): Promise<RunAgentTurnResult> {
  return runLocalAgentTurnForCli(options, { reportFailure: true });
}

async function refreshMissingLocalAgentConfig(options: RunAgentTurnOptions) {
  const adapter = resolveLocalRuntimeAdapter(options);
  if (!adapter) return false;
  const agentConfig = await adapter.loadAgentConfig(options.agentKey);
  return Boolean(agentConfig);
}

async function runLocalAgentTurnForCli(
  options: RunAgentTurnOptions,
  settings: { reportFailure: boolean },
): Promise<RunAgentTurnResult> {
  const resolvedBaseAdapter = resolveLocalRuntimeAdapter(options);
  const baseAdapter = (() => {
    let adapter =
      resolvedBaseAdapter && options.modelOverride
        ? wrapLoadAgentConfigWithModelOverride(
            resolvedBaseAdapter,
            options.agentKey,
            options.modelOverride,
          )
        : resolvedBaseAdapter;
    if (adapter) adapter = applyEphemeralIfRequested(options, adapter);
    return adapter;
  })();
  if (!baseAdapter) {
    options.output.write(
      "[nolo] Local runtime was requested but no local runtime adapter is available.\n",
    );
    return { exitCode: 1 };
  }

  const subjectRefs = buildSubjectRefs(options);
  const allowedChildAgentKeys = options.allowedChildAgentKeys?.filter((key) =>
    key.trim(),
  );
  const allowedToolNames = options.allowedToolNames?.filter((name) =>
    name.trim(),
  );
  const blockedToolNames = options.blockedToolNames?.filter((name) =>
    name.trim(),
  );
  const runtimeContext: Record<string, any> | undefined =
    subjectRefs ||
    allowedChildAgentKeys?.length ||
    allowedToolNames?.length ||
    blockedToolNames?.length ||
    options.parentWakeOnTerminal ||
    options.dialogAgentMode
      ? {
          ...(subjectRefs ? { subjectRefs } : {}),
          ...(options.dialogAgentMode
            ? { dialogAgentMode: options.dialogAgentMode }
            : {}),
          ...(allowedChildAgentKeys?.length ? { allowedChildAgentKeys } : {}),
          ...(allowedToolNames?.length ? { allowedToolNames } : {}),
          ...(blockedToolNames?.length ? { blockedToolNames } : {}),
          ...(options.parentWakeOnTerminal
            ? { parentWakeOnTerminal: true }
            : {}),
          ...(options.parentDialogId
            ? { parentThreadId: options.parentDialogId }
            : {}),
        }
      : undefined;
  const currentDialogId = options.continueDialogId ?? ulid();

  const adapter = baseAdapter;
  const expandedMessage = options.pastedTextStore?.items.size
    ? expandCollapsedPastes(options.message, options.pastedTextStore)
    : options.message;

  const workingLabel = `${options.agentName} -> working locally`;
  const turnOutput = createCliTurnOutput({
    options,
    workingLabel,
  });
  turnOutput.spinner.start();
  try {
    const runLocalAgentTurn = await loadRunLocalAgentTurn();
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: options.agentKey,
      userLanguage: options.userLanguage ?? options.env.NOLO_LANG ?? null,
      input: buildUserInputContent(options.message, options.imageUrls),
      ...(expandedMessage !== options.message
        ? {
            persistedInput: buildUserInputContent(
              expandedMessage,
              options.imageUrls,
            ),
            persistedInputReference: buildUserInputContent(
              options.message,
              options.imageUrls,
            ),
          }
        : {}),
      ...(options.pastedTextStore
        ? {
            contextReferenceResolver: (reference: LocalAgentTurnInput["input"]) =>
              canResolveCollapsedPasteReference(options.pastedTextStore!, reference),
          }
        : {}),
      continueDialogId: currentDialogId,
      fileWriteSessionId: currentDialogId,
      fileWriteGateEnabled: resolveFileWriteGateEnabled(options.env),
      spaceId: options.spaceId,
      category: options.category,
      inheritedFromDialogKey: options.inheritedFromDialogKey,
      parentDialogId: options.parentDialogId,
      background: options.background,
      noStream: options.noStream,
      ...(runtimeContext ? { runtimeContext } : {}),
      ...(options.contextBlockScopes?.length
        ? { contextBlockScopes: options.contextBlockScopes }
        : options.extraContextBlocks?.length
          ? { contextBlocks: options.extraContextBlocks }
          : {}),
      ...(typeof options.timeoutMs === "number"
        ? { timeoutMs: options.timeoutMs }
        : {}),
      ...(options.actionGateHandler
        ? { onActionGate: options.actionGateHandler }
        : {}),
      onLoopEvent: (event) => {
        if (event.kind === "llm-start") {
          turnOutput.showWorking();
        }
        if (event.kind === "image-downgraded") {
          // 第 4 级降级提示：模型不支持图片，已用占位文本替代；给用户 escape hatch。
          // 不阻断当前轮——agent 拿到的是 [Image content omitted...] 占位文本，能继续跑。
          options.output.write(
            "[nolo] 当前 agent 不支持图片输入，已用占位文本替代。要完整图片理解可 /switch 到 Kimi K2.6。\n",
          );
        }
        if (event.kind === "compaction") {
          // 记录压缩观测事件，turn 结束时由 turnOutput.finish() 渲染一行 dim 摘要。
          turnOutput.recordCompaction(event);
        }
        options.onLoopEvent?.(event);
      },
      ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
      // 回合内注入（TUI 后台 run 唤醒直投）：透传给 local loop。
      ...(options.drainInjections ? { drainInjections: options.drainInjections } : {}),
      // tool-gist-fold 后 onToolEvent 无条件挂载（不再受 traceLocalTools 开关
      // 控制，显示模式合并为单一 gist/折叠通道）——保留 alpha 的新形态。
      onToolEvent: (event) => {
        turnOutput.handleToolEvent(event);
      },
      ...(!options.noStream
        ? {
            onTextDelta: (chunk) => {
              turnOutput.pushText(chunk);
            },
            onReasoningDelta: (chunk) => {
              turnOutput.pushThinking(chunk);
            },
          }
        : {}),
    });
    turnOutput.finish(result.content);
    const turnCredits = sumPlatformCredits(result.usageRecords);
    return {
      exitCode: 0,
      dialogId: result.dialogId,
      title: result.title,
      ...(result.titlePatchPromise ? { titlePatchPromise: result.titlePatchPromise } : {}),
      ...pickEmptyAssistantFlags(result),
      // 积分口径按「全轮」而非「最后一次调用」：result.usage 只是收尾那次
      // provider 调用的 usage，本轮前面 N-1 次工具循环调用（以及自动压缩摘要）
      // 的 cost 都只存在于 usageRecords 里。token 字段仍取 result.usage——
      // 上下文占用本来就该看最后一次调用的累计输入，不是各次相加。
      turnTokens: withTurnCredits(buildTurnTokenUsage(result.usage, result.model), turnCredits),
      ...(turnCredits !== undefined ? { turnCredits } : {}),
    };
  } catch (error) {
    turnOutput.spinner.stop();
    // localLoop saveTurn()s on failure/abort and hangs dialogId on the error
    // so TUI can keep state.dialogId and the next message --continues instead
    // of opening a fresh dialog (402 / provider errors used to "amnesia").
    const savedDialogId = (error as { dialogId?: string })?.dialogId;
    // 中断/失败前已经发生的 provider 调用照样扣了费（localLoop 把同一批
    // usageRecords 既存进 saveTurn 也挂到错误上）。不带出去的话，Esc 掉一轮
    // 长对话 = 状态行凭空少算一整轮，而余额是实实在在扣了的。
    const abortedTurnCredits = sumPlatformCredits(
      (error as { usageRecords?: Parameters<typeof sumPlatformCredits>[0] })?.usageRecords,
    );
    if (
      (error as { code?: string })?.code === LOCAL_TURN_ABORTED_CODE ||
      options.abortSignal?.aborted
    ) {
      // User-initiated stop: the TUI reports it; nothing failed.
      // If a tool was still running when the stop landed, localLoop attaches
      // its name (error.pendingToolName) so the caller can tell the user the
      // tool may still finish in the background.
      const pendingToolName = (error as { pendingToolName?: string })
        ?.pendingToolName;
      return {
        exitCode: 0,
        streamInterrupted: true,
        ...(savedDialogId ? { dialogId: savedDialogId } : {}),
        ...(pendingToolName ? { pendingToolName } : {}),
        ...(abortedTurnCredits !== undefined ? { turnCredits: abortedTurnCredits } : {}),
      };
    }
    // 启动期 429 兜底：分类命中 rate-limit 时与 run 中途同语义落冷却（幂等）。
    // 冷却截止沿用 localLoop 把 dialogId 挂错误上的既有模式挂在错误对象上，
    // 供 auto 路径 describeLocalRunFailure 渲染「已标记冷却至 <ISO>」。
    const cooldownUntil = await markStartupRateLimitCooldown(
      options,
      baseAdapter,
      toErrorMessage(error),
    );
    if (cooldownUntil) {
      (error as { cooldownUntil?: string }).cooldownUntil = cooldownUntil;
    }
    if (settings.reportFailure) {
      options.output.write(
        `[nolo] Local agent run failed: ${toErrorMessage(error)}\n`,
      );
      if (cooldownUntil) {
        options.output.write(
          `[nolo] 已标记冷却至 ${cooldownUntil}，到期前派发该 agent 会被冷却门控拦截。\n`,
        );
      }
    }
    return {
      exitCode: 1,
      localError: error,
      ...(savedDialogId ? { dialogId: savedDialogId } : {}),
      ...(abortedTurnCredits !== undefined ? { turnCredits: abortedTurnCredits } : {}),
    };
  }
}

/**
 * HTTP/server 派发前的本地冷却预检。
 *
 * server 端 admission guard 只读 server KV 的 agent 记录，而 CLI 本地 runtime
 * 的 429 冷却按设计只落本地（credential-availability.json + 本地 agent store，
 * 见 localRuntimeAdapter 的 mark/gate）——本地限流的 agent 经 HTTP 派发时
 * server guard 看不到标记，会放行 run 再在执行期失败。
 *
 * 这里在发起 POST 前用同一套共享判据（resolveCooldownGate）预检本地冷却：
 * - "blocked" → 直接报错返回（附恢复时刻），不发请求。
 * - "probe" → 放行并记录探测时间（与执行期 gate 同语义，冷却自愈依赖它）。
 * - 本地无 agent 配置 / 无 credential key → 无法判定，放行（server 端 guard 负责）。
 */
async function checkLocalAvailabilityBeforeHttpDispatch(
  options: RunAgentTurnOptions,
): Promise<{ exitCode: 1 } | null> {
  const adapter = resolveLocalRuntimeAdapter(options);
  if (!adapter || typeof adapter.loadAgentConfig !== "function") return null;
  let config: unknown;
  try {
    config = await adapter.loadAgentConfig(options.agentKey);
  } catch {
    // 本地无配置（如平台 agent）→ 无法判定本地冷却，交给 server 端 guard。
    return null;
  }
  if (!config || typeof config !== "object") return null;
  // 与 wrapLoadAgentConfigWithModelOverride 同一取法：runtime config 可能包着
  // 原始记录，credential 归属字段（apiKeyRef/credentialRef/customProviderUrl/key）
  // 在 rawRecord 上。
  const baseRecord =
    (config as { rawRecord?: Record<string, unknown> }).rawRecord ??
    (config as unknown as Record<string, unknown>);
  const credentialKey = resolveCredentialKeyWithFallback(baseRecord);
  const agentLevelAt = (baseRecord as { nextAvailableAt?: unknown }).nextAvailableAt;
  const agentLevelNextAvailableAt =
    typeof agentLevelAt === "number" && Number.isFinite(agentLevelAt)
      ? agentLevelAt
      : undefined;
  if (!credentialKey && agentLevelNextAvailableAt === undefined) return null;
  const env = options.env as NodeJS.ProcessEnv;
  const now = Date.now();
  const entry = credentialKey
    ? await readCredentialEntry(credentialKey, env, now).catch(() => undefined)
    : undefined;
  const entryAt = entry?.nextAvailableAt;
  const effectiveNextAvailableAt =
    typeof entryAt === "number"
      ? mergeAvailabilityDeadline(agentLevelNextAvailableAt, entryAt)
      : agentLevelNextAvailableAt;
  if (typeof effectiveNextAvailableAt !== "number") return null;
  const gateDecision = resolveCooldownGate(
    { nextAvailableAt: effectiveNextAvailableAt, lastProbeAt: entry?.lastProbeAt },
    now,
  );
  if (gateDecision === "probe" && credentialKey) {
    // 与执行期 gate 同语义：放行本次真实请求前记录探测时间，避免间隔内反复重试。
    await recordCredentialProbe(credentialKey, env, now).catch(() => undefined);
    return null;
  }
  if (gateDecision !== "blocked") return null;
  options.output.write(
    `[nolo] Agent ${options.agentName || options.agentKey} is temporarily unavailable (429 cooldown) until ${new Date(Number(effectiveNextAvailableAt)).toISOString()}.\n` +
      "Dispatch aborted before reaching the server. Pick another agent via listAgents, or retry after the cooldown.\n",
  );
  return { exitCode: 1 };
}

/**
 * 本地 turn 结果 → 对外 RunAgentTurnResult 的唯一重建口。
 *
 * 为什么是显式函数而不是调用点手写展开：auto→local 成功路径有两处重建
 * （主路径 + 本地配置刷新重试），各自手写白名单曾在 fix/tui-session-credits
 * 里漏掉 `turnCredits` —— TUI 的 accumulateSessionCredits 拿到 undefined，
 * 状态行 ⚡ 从此不显示，而 context 芯片（turnTokens）正常，形成「扣了费、
 * 上下文在走、积分消失」的不对称。收敛到一处 + 单测钉死字段清单。
 */
export function foldLocalResultForTui(
  localResult: RunAgentTurnResult,
): RunAgentTurnResult {
  return {
    exitCode: localResult.exitCode,
    ...(localResult.dialogId ? { dialogId: localResult.dialogId } : {}),
    title: localResult.title,
    ...(localResult.titlePatchPromise
      ? { titlePatchPromise: localResult.titlePatchPromise }
      : {}),
    // 空 assistant 兜底成因必须随行：后台 run 的结算（resolveRunOutcome 的
    // isStalledOrTruncated）靠它把截断轮判成 stalled 而不是 clean 失败。
    ...pickEmptyAssistantFlags(localResult),
    ...(localResult.turnTokens ? { turnTokens: localResult.turnTokens } : {}),
    // 平台积分必须随行：runLocalAgentTurnForCli 里 sumPlatformCredits 已按
    // 「全轮逐次求和」算好（只认 billing_unit === "credits" 的平台计费帧）。
    ...(localResult.turnCredits !== undefined
      ? { turnCredits: localResult.turnCredits }
      : {}),
    ...(localResult.streamInterrupted
      ? { streamInterrupted: localResult.streamInterrupted }
      : {}),
    ...(localResult.pendingToolName
      ? { pendingToolName: localResult.pendingToolName }
      : {}),
  };
}

export async function runAgentTurn(options: RunAgentTurnOptions): Promise<RunAgentTurnResult> {
  const authToken = resolveAuthToken(options.env);
  const runtimeMode = resolveRequestedRuntimeMode(options);

  if (runtimeMode === "local") {
    return runInjectedLocalAgentTurn(options);
  }

  if (runtimeMode === "auto" && shouldAttemptAutoLocal(options)) {
    const skipLocal = await shouldSkipAutoLocalForServerPlatformTools(options);
    if (!skipLocal) {
      const localResult = await runLocalAgentTurnForCli(options, {
        reportFailure: false,
      });
      if (localResult.exitCode === 0) {
        return foldLocalResultForTui(localResult);
      }
      if (
        isMissingLocalAgentConfigError(localResult.localError, options.agentKey)
      ) {
        // Local config refresh is local-adapter only; still prefer local before any server path.
        options.output.write(
          `[nolo] Local agent config was missing; refreshing local config and retrying local once.\n`,
        );
        try {
          const refreshed = await refreshMissingLocalAgentConfig(options);
          if (refreshed) {
            const retriedLocalResult = await runLocalAgentTurnForCli(options, {
              reportFailure: false,
            });
            if (retriedLocalResult.exitCode === 0) {
              return foldLocalResultForTui(retriedLocalResult);
            }
          }
        } catch {
          // Fall through to surface local runtime failure.
        }
      }
      const localErrorMessage = localResult.localError
        ? toErrorMessage(localResult.localError)
        : "local runtime failed";
      options.output.write(describeLocalRunFailure(localErrorMessage, localResult.localError));
      return {
        exitCode: 1,
        ...(localResult.dialogId ? { dialogId: localResult.dialogId } : {}),
        // Keep localError so TUI can show balance/quota/dialog-preserved hints
        // instead of only the raw auto-runtime line.
        ...(localResult.localError ? { localError: localResult.localError } : {}),
      };
    }
  }

  if (!authToken) {
    options.output.write(
      "[nolo] This install needs an auth token before it can talk to agents.\n" +
        "Run `nolo login`, or set AUTH_TOKEN / NOLO_SERVER for non-interactive runs.\n",
    );
    return { exitCode: 1 };
  }

  // HTTP/server path 同样支持 ephemeral（请求体透传 ephemeral: true，
  // 服务端据此跳过 dialog 持久化），与本地 wrapAdapterEphemeral 一致。
  // 无需在此警告"仅 local 生效"——那是修复前的过时语义。

  // HTTP/server 派发前先查本地冷却（server guard 读不到本地 credential 冷却）。
  const localBlock = await checkLocalAvailabilityBeforeHttpDispatch(options);
  if (localBlock) {
    return { exitCode: localBlock.exitCode };
  }

  return runHttpAgentTurn(options, authToken);
}
