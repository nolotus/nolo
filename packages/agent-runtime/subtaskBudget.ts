/**
 * Transitional API for dispatchers that still send cumulative run budgets.
 * These inputs are ignored: neither explicit values, legacy environment variables,
 * nor a parent's former budget deadline can enable automatic termination.
 * Remove these compatibility exports with the remaining CLI/schema callers.
 */
export type SubtaskBudgetLimits = {
  maxToolCalls: number;
  maxWallClockMs: number;
};

/** @deprecated Cumulative run budgets have been removed. */
export function resolveSubtaskBudgetLimits(_options?: {
  maxToolCalls?: number;
  maxWallClockMs?: number;
  env?: Record<string, string | undefined>;
}): undefined {
  return undefined;
}

/** @deprecated No automatic run deadline is created or inherited. */
export function resolveDispatchedSubtaskBudget(_args?: {
  maxToolCalls?: number;
  maxWallClockMs?: number;
  parentDeadlineAtMs?: number | null;
  childStartedAtMs?: number;
  env?: Record<string, string | undefined>;
}): { limits: undefined; deadlineAtMs: null } {
  return { limits: undefined, deadlineAtMs: null };
}
