// packages/agent-runtime/antigravityInvocation.ts
//
// Antigravity Cloud Code 专属 invocation lifecycle seam（provider-specific，
// 刻意不做 universal/generic 抽象 —— 见 docs/plans/2026-09-08-antigravity-invocation-lifecycle.md）。
//
// 职责（且仅限）：
// 1. lazy request：Effect fiber 真正运行时才发起 fetch。构造 Effect 本身零 I/O，
//    timeout/abort 等输家路径不会留下任何已发出的请求。
// 2. 真实取消：fiber timeout / interrupt / 外部 abort 都会 abort 底层 fetch 与
//    SSE reader（fetch signal 被真实触发，pending 的 body 读取被中断），输家
//    promise 的后续 rejection 在 kernel 内吸收，无 unhandled rejection。
// 3. cleanup：abort listener / fiber signal listener / SSE reader release 全部
//    经 Effect.ensuring 兜底执行（正常、timeout、interrupt、abort 均覆盖）。
// 4. 401/403 refresh-retry 策略（at most once）：仅 OAuth 可重试状态、仅
//    resolver 可用、仅新 credential 与旧 credential 实际不同才重试；refresh
//    失败 / 非 OAuth / 无 resolver / 同 credential 一律保留原始结果语义。
// 5. whole-invocation deadline：timeoutMs 是整个 invocation（初始 credential
//    resolve → attempt 1 → force refresh → attempt 2）共享的单一预算，由最外层
//    Effect.timeoutOption 统一 interrupt 当前正在执行的 child effect —— 不是
//    per-attempt 超时，attempt 2 只继承剩余预算。
//
// retry matrix（与 docs/plans 的 16 项一致）：
//   success=1 | 401 changed=2 | 401 same=1 | 403 changed=2 | 403 same=1
//   refresh failure=1 (原样上抛) | non-OAuth=1 | MALFORMED_FUNCTION_CALL=1
//   429/503 → transport 层预算（本 seam 不加预算） | network → transport 层
//   abort after fetch=1 | abort before request=0 fetch | fiber timeout=1
//   fiber interrupt=1 | SSE reader cleanup on abort | credential A/B generation
//
// credential 与 retry policy 通过窄 callback 注入：本模块不知道 local/server
// credential source 的差异，只消费 `resolveCredential({ forceRefresh })` 返回的
// 完整 ResolvedAntigravityCredential（accessToken/metadata/projectId/accountId
// 每次尝试整体替换，不残留旧闭包）。
//
// transport retry（fetchWithTransientRetry）与 stream retry（providerStreamRetry）
// 行为不变：本 seam 不吞网络错误、不扩大 429/503 预算；MALFORMED_FUNCTION_CALL
// 仍按 provider 语义失败（semantic failure，retryable=false）。

import { Duration, Effect, Exit, Fiber, Option } from "effect";
import type { ManagedRuntime } from "effect";
import type {
  AntigravitySemanticResult,
} from "./antigravitySemanticTypes";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import { fetchAntigravityCloudCodeCompletion } from "./antigravityCloudCodeProvider";
import type { ResolvedAntigravityCredential } from "./antigravityCredential";

/** 上游身份类拒绝状态码：允许一次 force-refresh 重试（仅 OAuth credential）。 */
const AUTH_RETRYABLE_STATUSES = new Set([401, 403]);

export type AntigravityInvocationFailureReason =
  | "timeout"
  | "aborted"
  | "interrupted"
  | "failed";

export type AntigravityInvocationOutcome =
  | { kind: "done"; result: AntigravitySemanticResult }
  | {
    kind: "not-done";
    reason: AntigravityInvocationFailureReason;
    error?: unknown;
  };

export type InvokeAntigravityArgs = {
  agentConfig: AgentRuntimeAgentConfig;
  /** 首次尝试（forceRefresh=false）解析的完整 credential。 */
  resolveCredential: (args: { forceRefresh: boolean }) => Promise<ResolvedAntigravityCredential>;
  /**
   * 该 credential 来源是否支持 force-refresh 重试。非 OAuth（api-key ref）
   * 或无 resolver 时为 false —— 401/403 不重试，保留原始响应。
   */
  supportsAuthRetry: boolean;
  openAiBody: {
    model?: unknown;
    messages: unknown[];
    tools?: unknown[];
  };
  signal?: AbortSignal;
  /**
   * whole-invocation deadline（ms）：整个 invocation（初始 credential resolve →
   * attempt 1 → force refresh → attempt 2）共享同一预算，由最外层 Effect
   * timeoutOption 统一 interrupt 当前正在执行的 child effect；被 interrupt 的
   * attempt 经既有 AbortController bridge 真实 abort fetch/SSE reader ——
   * 不只是「停止等待」。undefined = 不限时。
   * timeout outcome 不触发 401/403 refresh-retry。
   */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
  /**
   * [test seam] 注入带 TestClock 的 runtime：timeout 由虚拟时钟驱动。
   * 生产不传——走 Effect.runPromise 默认 runtime（真实 Clock）。
   */
  runtime?: ManagedRuntime.ManagedRuntime<never, never>;
  /** [test seam] 覆盖 401/403 重试判定集合；默认 {401, 403}。 */
  authRetryableStatuses?: ReadonlySet<number>;
};

/** 单次尝试：完整 credential 驱动的 provider fetch（lazy：fiber 运行时才 fetch）。 */
function antigravityAttemptEffect(args: {
  agentConfig: AgentRuntimeAgentConfig;
  credential: ResolvedAntigravityCredential;
  openAiBody: InvokeAntigravityArgs["openAiBody"];
  externalSignal: AbortSignal | undefined;
  fetchImpl: typeof fetch;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
}): Effect.Effect<AntigravitySemanticResult, unknown, never> {
  return Effect.suspend(() => {
    // fiber 运行到这里才开始建 abort 链路 / 发请求（lazy 保证）。
    const attemptController = new AbortController();
    const externalSignal = args.externalSignal;
    let onExternalAbort: (() => void) | undefined;
    const forwardExternalAbort = () => {
      if (!attemptController.signal.aborted) attemptController.abort(externalSignal?.reason);
    };
    if (externalSignal) {
      if (externalSignal.aborted) forwardExternalAbort();
      else {
        onExternalAbort = forwardExternalAbort;
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }
    }
    const removeExternalListener = () => {
      if (onExternalAbort) {
        externalSignal?.removeEventListener("abort", onExternalAbort);
        onExternalAbort = undefined;
      }
    };

    // bridge promise：在 fiber 内创建（lazy），把 fiber 的中断信号接到 attempt
    // controller，输家路径的 fetch/SSE 读取被真实 abort。
    const attempt = Effect.callback<AntigravitySemanticResult, unknown>((resume, fiberSignal) => {
      const onFiberAbort = () => forwardExternalAbort();
      if (fiberSignal?.aborted) forwardExternalAbort();
      else fiberSignal?.addEventListener("abort", onFiberAbort);
      const removeFiberListener = () => {
        if (onFiberAbort) fiberSignal?.removeEventListener("abort", onFiberAbort);
      };

      // 已取消（外部 abort 先到 / fiber 已中断）：零上游请求，直接失败。
      // 真实 fetch 对 aborted signal 不会发出网络请求，但请求计数与「零请求」
      // 契约要求我们在创建 fetch promise 之前就短路。失败带 aborted 语义码，
      // gen 层据此转换为 aborted outcome（而非 failed）。
      if (attemptController.signal.aborted) {
        removeFiberListener();
        removeExternalListener();
        resume(Effect.fail(buildInvocationError(
          "ANTIGRAVITY_INVOCATION_ABORTED",
          "Antigravity invocation aborted before request.",
        )));
        return Effect.succeed(void 0) as Effect.Effect<void, never, never>;
      }

      // fetch promise 在 fiber callback 内创建 —— 未运行 fiber 就没有请求。
      const pending = fetchAntigravityCloudCodeCompletion({
        agentConfig: args.agentConfig,
        accessToken: args.credential.accessToken,
        metadata: args.credential.metadata,
        openAiBody: args.openAiBody,
        signal: attemptController.signal,
        fetchImpl: args.fetchImpl,
        ...(args.onTextDelta ? { onTextDelta: args.onTextDelta } : {}),
        ...(args.onReasoningDelta ? { onReasoningDelta: args.onReasoningDelta } : {}),
      });
      pending.then(
        (result) => resume(Effect.succeed(result)),
        (error) => resume(Effect.fail(error)),
      );
      // interrupt 路径：v4 callback 的 native cleanup（fiber 中断时执行）。
      return Effect.sync(() => {
        removeFiberListener();
        removeExternalListener();
      });
    }).pipe(
      // 兜底：winner 路径（正常 settle）也要摘 listener；timeout 赢时 attempt
      // 是输家 fiber，callback cleanup 已由 race/timeout 的 interrupt 触发，
      // 这里保证任何出口 listener 都被移除。
      Effect.ensuring(Effect.sync(() => {
        removeExternalListener();
        // 输家 promise 的迟到 settle 由 pending.then 吸收（resume 已无效时
        // Effect 内部忽略），无 unhandled rejection。
      })),
    );

    return attempt;
  });
}

/** 单次尝试 + 外部 abort 桥接（raceFirst：先 settle 者赢）。 */
function attemptWithAbort(
  args: Parameters<typeof antigravityAttemptEffect>[0],
): Effect.Effect<AntigravitySemanticResult | "aborted", unknown, never> {
  const externalSignal = args.externalSignal;
  if (!externalSignal) {
    return antigravityAttemptEffect(args);
  }
  let abortListener: (() => void) | undefined;
  const removeAbortListener = () => {
    if (abortListener) externalSignal.removeEventListener("abort", abortListener);
    abortListener = undefined;
  };
  const abortEffect = Effect.callback<"aborted", never>((resume) => {
    const finish = () => resume(Effect.succeed("aborted" as const));
    if (externalSignal.aborted) {
      finish();
      return;
    }
    abortListener = () => finish();
    externalSignal.addEventListener("abort", abortListener, { once: true });
    return Effect.sync(removeAbortListener);
  }).pipe(Effect.ensuring(Effect.sync(removeAbortListener)));

  return Effect.raceFirst(
    antigravityAttemptEffect(args),
    abortEffect,
  ) as Effect.Effect<AntigravitySemanticResult | "aborted", unknown, never>;
}

export type InvokeAntigravityEffectOutcome =
  | { kind: "done"; result: AntigravitySemanticResult }
  | { kind: "aborted" }
  | { kind: "timeout" }
  | { kind: "failed"; error: unknown };

/**
 * Lazy lifecycle：返回的 Effect 在被 fiber 运行前不产生任何请求。
 *
 * - 请求仅在 fiber 启动后发起（Effect.suspend + callback 内建 promise）。
 * - fiber timeout（Effect Clock，TestClock 可虚拟推进）与外部 abort 均真实
 *   abort fetch/SSE；被放弃尝试的后续 rejection 在 kernel 内吸收。
 * - 401/403 最多一次重试：仅 supportsAuthRetry 且新 credential 实际变化
 *   （token/metadata/accountId 任一变化）才重试。
 */
export function invokeAntigravityEffect(
  args: InvokeAntigravityArgs,
): Effect.Effect<InvokeAntigravityEffectOutcome, never, never> {
  const authRetryable = args.authRetryableStatuses ?? AUTH_RETRYABLE_STATUSES;
  // whole-invocation deadline：>0 才生效；最外层 timeoutOption interrupt 整个
  // orchestration（resolve / attempt / refresh 共享预算）。
  const timeoutMs = typeof args.timeoutMs === "number" && args.timeoutMs > 0
    ? args.timeoutMs
    : undefined;
  const runOneAttempt = (
    credential: ResolvedAntigravityCredential,
  ): Effect.Effect<AntigravitySemanticResult | "aborted", unknown, never> =>
    Effect.suspend(() =>
      attemptWithAbort({
        agentConfig: args.agentConfig,
        credential,
        openAiBody: args.openAiBody,
        externalSignal: args.signal,
        fetchImpl: args.fetchImpl ?? fetch,
        ...(args.onTextDelta ? { onTextDelta: args.onTextDelta } : {}),
        ...(args.onReasoningDelta ? { onReasoningDelta: args.onReasoningDelta } : {}),
      }),
    );

  // whole-invocation deadline：单个 timeoutOption 包住整个 orchestration gen
  //（初始 resolve → attempt 1 → refresh → attempt 2），重试只继承剩余预算；
  // 输家路径（进行中的 fetch/SSE/refresh）被 interrupt 时经既有 abort 桥接
  // 真实取消。
  const orchestration = Effect.gen(function* () {
    const firstCredential = yield* Effect.tryPromise({
      try: () => args.resolveCredential({ forceRefresh: false }),
      catch: (error) => error,
    });

    const first = yield* Effect.exit(
      runOneAttempt(firstCredential),
    );
    if (Exit.isFailure(first)) {
      // 尝试本体失败：区分「取消语义」（abort 前置短路）与一般错误。
      const errorOption = Exit.findErrorOption(first);
      const error = Option.isSome(errorOption) ? errorOption.value : first.cause;
      if (isAntigravityAbortErrorValue(error)) {
        return { kind: "aborted" } as InvokeAntigravityEffectOutcome;
      }
      return { kind: "failed", error } as InvokeAntigravityEffectOutcome;
    }
    let current: AntigravitySemanticResult | "aborted" = first.value;

    // 401/403 → force refresh → 仅当 credential 实际变化才重试一次。
    if (
      typeof current !== "string" &&
      supportsAuthRetry(args.supportsAuthRetry, current.status, authRetryable)
    ) {
      const refreshed = yield* Effect.exit(
        Effect.tryPromise({
          try: () => args.resolveCredential({ forceRefresh: true }),
          catch: (error) => error,
        }),
      );
      if (Exit.isSuccess(refreshed) && credentialChanged(firstCredential, refreshed.value)) {
        const retried = yield* Effect.exit(
          runOneAttempt(refreshed.value),
        );
        if (Exit.isSuccess(retried)) {
          current = retried.value;
        }
        // 重试失败/放弃：保留原始 401/403 语义（对齐 loopUpstream 的 catch 行为）。
      }
      // refresh 失败 / same credential：保留原始响应（不吞、不换语义）。
    }

    if (current === "aborted") return { kind: "aborted" } as InvokeAntigravityEffectOutcome;
    return { kind: "done", result: current } as InvokeAntigravityEffectOutcome;
  }).pipe(Effect.catch((error) => Effect.succeed({
    kind: "failed",
    error,
  } as InvokeAntigravityEffectOutcome)));

  if (typeof timeoutMs !== "number") return orchestration;
  return Effect.gen(function* () {
    const outcome = yield* Effect.timeoutOption(orchestration, Duration.millis(timeoutMs));
    return Option.isNone(outcome)
      ? ({ kind: "timeout" } as InvokeAntigravityEffectOutcome)
      : outcome.value;
  });
}

function supportsAuthRetry(
  supports: boolean,
  status: number,
  authRetryable: ReadonlySet<number>,
): boolean {
  return supports && authRetryable.has(status);
}

/** 取消语义错误判定（seam 内部 abort 短路 / 外部 abort reason 传播）。 */
function isAntigravityAbortErrorValue(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return (
    code === "ANTIGRAVITY_INVOCATION_ABORTED" ||
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

/**
 * credential 实际变化判定：token、metadata（projectId 等）、accountId 任一
 * 变化即为「fresh credential 实际变化」。同 token 同 metadata 不重试。
 */
export function credentialChanged(
  before: ResolvedAntigravityCredential,
  after: ResolvedAntigravityCredential,
): boolean {
  return (
    before.accessToken !== after.accessToken ||
    before.accountId !== after.accountId ||
    before.projectId !== after.projectId ||
    JSON.stringify(before.metadata) !== JSON.stringify(after.metadata)
  );
}

/**
 * Promise compatibility facade：与既有 fetchAntigravityCloudCodeCompletion 调用
 * 点形状兼容（Promise<AntigravitySemanticResult>）。timeout → 抛 code=
 * ANTIGRAVITY_INVOCATION_TIMEOUT；aborted → 抛 code=ANTIGRAVITY_INVOCATION_ABORTED；
 * 其余失败原样抛出。迟到 rejection 由 Effect kernel 吸收，无 unhandled rejection。
 */
export async function invokeAntigravity(
  args: InvokeAntigravityArgs,
): Promise<AntigravitySemanticResult> {
  const outcome = await (args.runtime
    ? args.runtime.runPromise(invokeAntigravityEffect(args))
    : Effect.runPromise(invokeAntigravityEffect(args)));
  if (outcome.kind === "done") return outcome.result;
  if (outcome.kind === "timeout") {
    throw buildInvocationError("ANTIGRAVITY_INVOCATION_TIMEOUT", "Antigravity invocation timed out.");
  }
  if (outcome.kind === "aborted") {
    throw buildInvocationError("ANTIGRAVITY_INVOCATION_ABORTED", "Antigravity invocation aborted.");
  }
  throw outcome.error ?? new Error("Antigravity invocation failed.");
}

function buildInvocationError(code: string, message: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

/** Abort/timeout 上抛错误码；transport 层据此区分调用方取消与 provider 失败。 */
export function isAntigravityInvocationAbortError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return (
    error instanceof Error &&
    (code === "ANTIGRAVITY_INVOCATION_ABORTED" ||
      code === "ANTIGRAVITY_INVOCATION_TIMEOUT")
  );
}

// ── fiber interruption test seam ────────────────────────────────────────────
// 供测试直接驱动「fiber 被外部 interrupt」路径：fork 后立即 interrupt，
// in-flight fetch 应收到真实 abort。生产不使用。
export function forkAntigravityInvocationForTest(
  args: InvokeAntigravityArgs,
): { fiber: Fiber.Fiber<InvokeAntigravityEffectOutcome, never>; interrupt: () => Promise<void> } {
  const fiber = Effect.runFork(invokeAntigravityEffect(args));
  return {
    fiber,
    interrupt: () => Effect.runPromise(Fiber.interrupt(fiber)) as unknown as Promise<void>,
  };
}