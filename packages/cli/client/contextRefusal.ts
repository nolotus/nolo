import type { ContextRefusalDiagnostics } from "../../agent-runtime/contextRefusal";
import { t } from "../i18n";

/** Consume only the runtime's machine-only refusal contract, never exception text. */
export function contextRefusalDiagnostics(error: unknown): ContextRefusalDiagnostics | undefined {
  return error && typeof error === "object"
    ? (error as { diagnostics?: ContextRefusalDiagnostics }).diagnostics
    : undefined;
}

const tokens = (value: number): string => value >= 1000
  ? `${Math.round(value / 100) / 10}k` : String(value);

/** One shared projection for bare CLI and TUI; unknown refusals use the common fallback. */
export function describeContextRefusal(refusal?: ContextRefusalDiagnostics): string {
  const budgetDetail = refusal && Number.isFinite(refusal.historyTokens) && refusal.historyTokens >= 0
    && Number.isFinite(refusal.budget) && refusal.budget > 0
    ? t("contextRefusalBudgetDetail", tokens(refusal.historyTokens), tokens(refusal.budget)) : "";
  switch (refusal?.reason) {
    case "summary-provider-busy": return t("contextRefusalSummaryBusy", budgetDetail);
    case "summary-failed": return t("contextRefusalSummaryFailed", budgetDetail);
    case "no-compactable-content": return t("contextRefusalNoCompactableContent");
    case "single-message-too-large":
      if (refusal.largestMessageTokens >= 0 && Number.isFinite(refusal.largestMessageTokens)) {
        return t("contextRefusalSingleMessageTooLarge", tokens(refusal.largestMessageTokens), tokens(refusal.budget));
      }
  }
  return t("contextPreflightBlockedHint");
}
