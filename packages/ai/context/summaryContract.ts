import { isAbortError } from "../../core/abortError";
import { readOptionalOutputTokens } from "../token/normalizeUsage";

export type SummaryMode = "automatic" | "manual";
export const SUMMARY_TOTAL_BUDGET_MS = { automatic: 60_000, manual: 120_000 } as const;

/** Injectable clock/scheduler keeps deadline tests independent of wall-clock timing. */
export interface SummaryClock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
const realClock: SummaryClock = {
  now: Date.now,
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface SummaryAttemptContext {
  readonly deadlineMs: number;
  readonly signal: AbortSignal;
}

export interface SummaryBudget extends SummaryAttemptContext {
  remainingMs(): number;
  /** Bounds preparation and attempts even if an adapter ignores cancellation. */
  run<T>(operation: (context: SummaryAttemptContext) => Promise<T>): Promise<T>;
  /** Call after the entire operation, not between attempts. Disposing cancels pending work. */
  dispose(): void;
}

/** Create before account lookup/preparation. An earlier caller deadline may shorten, never extend it. */
export function createSummaryBudget(options: {
  mode: SummaryMode;
  signal?: AbortSignal;
  deadlineMs?: number;
  clock?: SummaryClock;
}): SummaryBudget {
  const clock = options.clock ?? realClock;
  if (options.deadlineMs !== undefined && !Number.isFinite(options.deadlineMs)) {
    throw new RangeError("Summary deadline must be finite");
  }
  const deadlineMs = Math.min(clock.now() + SUMMARY_TOTAL_BUDGET_MS[options.mode], options.deadlineMs ?? Infinity);
  const controller = new AbortController();
  // Never copy the caller's abort reason: it can contain prompt text or credentials.
  const cancel = () => controller.abort(new DOMException("Summary cancelled", "AbortError"));
  const expire = () => controller.abort(new DOMException("Summary deadline exceeded", "TimeoutError"));
  const remainingMs = () => Math.max(0, deadlineMs - clock.now());
  const check = () => {
    if (!controller.signal.aborted && remainingMs() === 0) expire();
    if (controller.signal.aborted) throw controller.signal.reason;
  };
  let timer: unknown;
  const cleanup = () => {
    if (timer !== undefined) clock.clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  };
  controller.signal.addEventListener("abort", cleanup, { once: true });
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  else if (remainingMs() === 0) expire();
  else timer = clock.setTimeout(expire, remainingMs());

  const budget: SummaryBudget = {
    deadlineMs,
    signal: controller.signal,
    remainingMs,
    async run(operation) {
      check();
      let onAbort: (() => void) | undefined;
      const stopped = new Promise<never>((_, reject) => {
        onAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        const value = await Promise.race([Promise.resolve().then(() => {
          check();
          return operation({ deadlineMs, signal: controller.signal });
        }), stopped]);
        check();
        return value;
      } finally {
        if (onAbort) controller.signal.removeEventListener("abort", onAbort);
      }
    },
    dispose() { cancel(); cleanup(); },
  };
  return budget;
}

export type SummaryErrorCategory = "http" | "timeout" | "cancelled" | "provider" | "unknown";
export interface SummaryFailure {
  category: SummaryErrorCategory;
  /** Stable local text only; never upstream message/body/cause/headers. */
  message: string;
  status?: number;
  code?: string;
  /** Structured upstream error type, never inferred from message text. */
  errorType?: string;
  balanceSource?: "platform-user" | "upstream";
  model?: string;
  provider?: string;
  attemptId?: string;
  stage: string;
  finishReason?: string;
  responseStatus?: string;
  incompleteReason?: string;
  maxOutputTokens?: number;
  completionTokens?: number;
  outputChars?: number;
}
export interface SummaryAttemptMetadata {
  model?: string;
  provider?: string;
  attemptId?: string;
  stage?: string;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
/** Identifiers only: URLs, whitespace, bearer credentials and common secret formats are not metadata. */
function identifier(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 128
    && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(value)
    && !/https?:|^bearer|^sk-|^vault-cred|^nolo_cred/i.test(value)
    ? value : undefined;
}

/** Accept structured error fields (including JSON {error:{code}}), never parse human message text. */
export function classifySummaryError(error: unknown, context: SummaryAttemptMetadata = {}): SummaryFailure {
  const top = record(error);
  const nested = record(top.error);
  const rawStatus = top.status ?? top.statusCode ?? nested.status;
  const status = typeof rawStatus === "number" && Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus : undefined;
  const code = identifier(top.code ?? nested.code);
  const errorType = identifier(top.type ?? nested.type);
  // Upstream evidence wins even if an adapter also supplies the platform reserved code.
  const balanceSource = errorType === "insufficient_balance_error" || top.balanceSource === "upstream"
    ? "upstream" : code === "INSUFFICIENT_BALANCE" ? "platform-user" : undefined;
  const category: SummaryErrorCategory = top.name === "TimeoutError" || code === "ETIMEDOUT" || code === "DEADLINE_EXCEEDED"
    ? "timeout" : isAbortError(error) ? "cancelled" : status !== undefined ? "http" : code ? "provider" : "unknown";
  return {
    category,
    message: `Summary ${category} failure`,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
    ...(errorType === undefined ? {} : { errorType }),
    ...(balanceSource === undefined ? {} : { balanceSource }),
    model: identifier(top.model) ?? identifier(context.model),
    provider: identifier(top.provider) ?? identifier(context.provider),
    attemptId: identifier(top.attemptId) ?? identifier(context.attemptId),
    stage: identifier(top.stage) ?? identifier(context.stage) ?? "attempt",
    ...Object.fromEntries(["finishReason", "responseStatus", "incompleteReason"].flatMap((key) => {
      const value = identifier(top[key]);
      return value === undefined ? [] : [[key, value]];
    })),
    ...Object.fromEntries(["maxOutputTokens", "completionTokens", "outputChars"].flatMap((key) =>
      typeof top[key] === "number" && Number.isSafeInteger(top[key]) && (top[key] as number) >= 0
        ? [[key, top[key]]] : [])),
  };
}

/** Adapters must preserve truncation; a string/null adapter cannot express this contract. */
export interface SummaryCompletion {
  text: string;
  truncated?: boolean;
  finishReason?: string;
  responseStatus?: string;
  incompleteReason?: string;
  maxOutputTokens?: number;
  completionTokens?: number;
}
export interface SummaryAttempt extends SummaryAttemptMetadata {
  run(context: SummaryAttemptContext): Promise<SummaryCompletion>;
}
export type SummaryAttemptRoute = "platform" | "current";
export interface SummaryAttemptReport {
  route: SummaryAttemptRoute;
  outcome: "success" | "empty" | "truncated" | "cancelled" | "error";
  error?: SummaryFailure;
}
export type SummaryResult = (
  | { kind: "success"; text: string; route: SummaryAttemptRoute; completion: SummaryCompletion }
  | { kind: "empty"; route: SummaryAttemptRoute; completion: SummaryCompletion }
  | { kind: "truncated"; text: string; route: SummaryAttemptRoute; completion: SummaryCompletion }
  | { kind: "cancelled"; error: SummaryFailure; route: SummaryAttemptRoute }
  | { kind: "error"; error: SummaryFailure; route: SummaryAttemptRoute }
) & { attempts: SummaryAttemptReport[] };


/** One summary-only truncation truth for structured and legacy callers. */
export function isTruncatedCompletion(completion: Pick<SummaryCompletion, "finishReason" | "responseStatus" | "incompleteReason" | "truncated">): boolean {
  return completion.truncated === true || completion.finishReason === "length"
    || completion.finishReason === "max_tokens" || completion.responseStatus === "incomplete"
    || completion.incompleteReason !== undefined;
}

/** Canonical usage normalization without converting absent output evidence to zero. */
export function summaryCompletionTokens(usage: Record<string, unknown> | undefined): number | undefined {
  const tokens = readOptionalOutputTokens(usage);
  return typeof tokens === "number" && Number.isSafeInteger(tokens) && tokens >= 0 ? tokens : undefined;
}
