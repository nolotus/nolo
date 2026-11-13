import type { LocalAutoCompactionResult } from "./localAutoCompaction";

export type ContextRefusalReason =
  | "summary-provider-busy"
  | "summary-failed"
  | "no-compactable-content"
  | "single-message-too-large"
  | "unknown";

/** No message, summary, tool output or raw exception text belongs in this contract. */
export interface ContextRefusalDiagnostics {
  reason: ContextRefusalReason;
  historyTokens: number;
  budget: number;
  droppedCount: number;
  /** -1 means a reliable estimate was unavailable (never means zero tokens). */
  largestMessageTokens: number;
  detail: string;
}

/** Structured fields from classifySummaryError, not raw provider errors. */
export interface ContextCompactionFailure {
  category: "http" | "timeout" | "cancelled" | "provider" | "unknown";
  status?: number;
  code?: string;
  errorType?: string;
}

export interface ContextCompactionOutcome {
  result?: LocalAutoCompactionResult;
  error?: ContextCompactionFailure;
}

const machineIdentifier = (value: string | undefined) =>
  value && /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : undefined;

/** Pure refusal classification. Single-message impossibility takes precedence over summary failures. */
export function classifyContextRefusal(args: {
  outcome?: ContextCompactionOutcome;
  historyTokens: number;
  budget: number;
  droppedCount: number;
  largestMessageTokens?: number;
}): ContextRefusalDiagnostics {
  const { outcome, historyTokens, budget, droppedCount } = args;
  const largest = args.largestMessageTokens;
  const numbersKnown = Number.isFinite(historyTokens) && historyTokens >= 0
    && Number.isFinite(budget) && budget >= 0
    && largest !== undefined && Number.isFinite(largest) && largest >= 0;
  const base = { historyTokens, budget, droppedCount, largestMessageTokens: largest ?? -1 };
  const result = (reason: ContextRefusalReason, detail: string): ContextRefusalDiagnostics =>
    ({ ...base, reason, detail });
  if (!numbersKnown) return result("unknown", "input-estimate-unavailable");
  if (largest! >= budget) return result("single-message-too-large", "largest-message-at-or-above-budget");

  const compacted = outcome?.result;
  const decision = compacted?.decision;
  const failure = outcome?.error ?? compacted?.failure;
  if (failure || compacted?.failureReason || decision?.outcome === "failed") {
    const code = machineIdentifier(failure?.code);
    const errorType = failure?.errorType;
    const status = failure?.status;
    if (code === "PROVIDER_UNAVAILABLE" || code === "SUMMARY_PROVIDER_UNAVAILABLE") {
      return result("no-compactable-content", `code=${code}`);
    }
    const busy = status === 503 || status === 429
      || !!code && /BUSY|RATE_LIMIT|CAPACITY|OVERLOAD|RESOURCE_EXHAUSTED/.test(code)
      || !!errorType && /^(?:capacity|overloaded|rate_limit)(?:_error)?$/.test(errorType);
    const detail = [
      status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599 ? `status=${status}` : "",
      code ? `code=${code}` : "",
      failure ? `category=${failure.category}` : `failure=${compacted?.failureReason ?? (decision?.outcome === "failed" ? decision.reason : "provider-error")}`,
    ].filter(Boolean).join(" ");
    return result(busy ? "summary-provider-busy" : "summary-failed", detail);
  }
  if (decision?.outcome === "skipped") {
    if (decision.skipReason === "summary-empty") return result("summary-failed", "summary-empty");
    // Only extract known machine tokens; decision.detail may contain arbitrary text.
    const bounded = decision.skipReason === "bounded-request-blocked"
      ? /\b(no-budget|invalid-window|empty-input|no-safe-group|group-too-large)\b/.exec(decision.detail ?? "")?.[1]
      : undefined;
    return result("no-compactable-content", `skip=${decision.skipReason}${bounded ? ` detail=${bounded}` : ""}`);
  }
  return result("unknown", decision ? "no-refusal-decision" : "compaction-not-evaluated");
}
