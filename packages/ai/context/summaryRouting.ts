import { isTruncatedCompletion } from "./summaryContract";
import { isAbortError } from "../../core/abortError";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "../llm/platformHostedRoutingTable";

/** Surface adapters supply authenticated account truth, never token-derived balance. */
export function selectSummaryRoute(input: {
  userId?: string | null;
  authenticated: boolean;
  platformAvailable: boolean;
  credits?: unknown;
}): { kind: "platform"; model: typeof PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } | { kind: "current" } {
  return input.authenticated && input.platformAvailable && !!input.userId
    && input.userId !== "local" && input.userId !== "guest"
    && typeof input.credits === "number" && Number.isFinite(input.credits) && input.credits > 0
    ? { kind: "platform", model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL }
    : { kind: "current" };
}

/** Exactly one platform attempt; only the caller's safe current-model channel may follow. */
export async function runRoutedSummary<T>(args: {
  platformPrimary: boolean;
  signal?: AbortSignal;
  platform: () => Promise<T>;
  current: () => Promise<T>;
  usable?: (value: T) => boolean;
}): Promise<T> {
  const checkAbort = () => { if (args.signal?.aborted) throw new DOMException("summary aborted", "AbortError"); };
  checkAbort();
  if (args.platformPrimary) {
    try {
      const value = await args.platform();
      checkAbort();
      if (args.usable ? args.usable(value) : typeof value === "string" && value.trim().length > 0) return value;
    } catch (error) {
      checkAbort();
      // Transports may cancel independently of the caller's AbortSignal.
      // Cancellation is terminal, not permission for another model request.
      if (isAbortError(error)) throw error;
    }
  }
  checkAbort();
  const value = await args.current();
  checkAbort();
  return value;
}

// Legacy runRoutedSummary intentionally retains broad fallback until consumers migrate.
export {
  createSummaryBudget, classifySummaryError, SUMMARY_TOTAL_BUDGET_MS,
} from "./summaryContract";
export type {
  SummaryMode, SummaryClock, SummaryBudget, SummaryAttemptContext,
  SummaryFailure, SummaryErrorCategory, SummaryAttemptMetadata, SummaryCompletion,
  SummaryAttempt, SummaryAttemptRoute, SummaryAttemptReport, SummaryResult,
} from "./summaryContract";

import { classifySummaryError } from "./summaryContract";
import type {
  SummaryBudget, SummaryAttempt, SummaryAttemptRoute, SummaryAttemptReport, SummaryResult,
} from "./summaryContract";

/**
 * Strict opt-in contract. Create budget BEFORE eligibility lookup and share it throughout.
 * No retries; only an explicit platform balance rejection permits one current attempt.
 * The owner must dispose the budget in finally, after all preparation and attempts.
 */
export async function runSummaryWithContract(args: {
  eligibility: Parameters<typeof selectSummaryRoute>[0];
  budget: SummaryBudget;
  platform: SummaryAttempt;
  current: SummaryAttempt;
}): Promise<SummaryResult> {
  const attempts: SummaryAttemptReport[] = [];
  const execute = async (route: SummaryAttemptRoute): Promise<SummaryResult> => {
    const attempt = args[route];
    try {
      const completion = await args.budget.run((context) => attempt.run(context));
      if (typeof completion?.text !== "string") {
        throw { code: "INVALID_SUMMARY_COMPLETION", stage: "decode" };
      }
      const text = completion.text.trim();
      const kind = isTruncatedCompletion(completion)
        ? "truncated" : text ? "success" : "empty";
      attempts.push({ route, outcome: kind });
      if (kind === "empty") return { kind, route, attempts, completion };
      return { kind, text, route, attempts, completion };
    } catch (cause) {
      // Shared cancellation/deadline wins over a late provider rejection.
      const error = classifySummaryError(args.budget.signal.aborted ? args.budget.signal.reason : cause, attempt);
      const kind = error.category === "cancelled" ? "cancelled" : "error";
      attempts.push({ route, outcome: kind, error });
      return { kind, error, route, attempts };
    }
  };
  if (selectSummaryRoute(args.eligibility).kind === "platform") {
    const result = await execute("platform");
    if (result.kind !== "error" || result.error.code !== "INSUFFICIENT_BALANCE" || result.error.balanceSource !== "platform-user"
      || result.error.category === "timeout" || args.budget.signal.aborted) return result;
  }
  return execute("current");
}
