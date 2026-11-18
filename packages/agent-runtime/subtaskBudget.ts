import { isSubtaskRun, type AgentRunKind } from "./agentRunIsolation";

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

export const DEFAULT_SUBTASK_SOFT_BUDGET_MILESTONE_1_TOOL_CALLS = 40;
export const DEFAULT_SUBTASK_SOFT_BUDGET_MILESTONE_2_TOOL_CALLS = 80;

export const SUBTASK_SOFT_BUDGET_MILESTONE_1_PREFIX = "[系统提示 · 子任务软预算提醒]";
export const SUBTASK_SOFT_BUDGET_MILESTONE_2_PREFIX = "[系统提示 · 子任务强收敛提醒]";

export type SubtaskSoftBudgetMilestoneLevel = 1 | 2;

export type SubtaskSoftBudgetConfig = {
  /** Explicitly enable (`true`) or disable (`false`) soft budget advisories. */
  enabled?: boolean;
  /** Cumulative tool-call threshold for Milestone 1 (convergence self-check). Default: 40. */
  milestone1ToolCalls?: number;
  /** Cumulative tool-call threshold for Milestone 2 (strong convergence). Default: 80. */
  milestone2ToolCalls?: number;
};

export type SubtaskSoftBudgetAdvisorOptions = {
  /** Explicit soft-budget config (`true`/`false`/config object). */
  softBudget?: boolean | SubtaskSoftBudgetConfig;
  /** Explicit subtask flag (`true` activates soft budget unless killed by env/config). */
  isSubtask?: boolean;
  /** Run kind alternative (`"subtask"` activates soft budget unless disabled). */
  runKind?: AgentRunKind;
  /** Environment map override (defaults to `process.env` when available). */
  env?: Record<string, string | undefined>;
};

export type SubtaskSoftBudgetAdvisory = {
  milestone: SubtaskSoftBudgetMilestoneLevel;
  threshold: number;
  toolCallCount: number;
  message: string;
};

export type SubtaskSoftBudgetAdvisorState = {
  readonly enabled: boolean;
  readonly milestone1ToolCalls: number;
  readonly milestone2ToolCalls: number;
  readonly milestone1Triggered: boolean;
  readonly milestone2Triggered: boolean;
  readonly lastObservedToolCallCount: number;
};

export type SoftBudgetAdvisor = {
  readonly enabled: boolean;
  readonly milestone1ToolCalls: number;
  readonly milestone2ToolCalls: number;
  /**
   * Observe cumulative tool calls after a round's tool execution.
   * Returns a one-time advisory when a milestone threshold is newly crossed,
   * or `null` when disabled, below threshold, or already emitted.
   * Never throws and never requests termination.
   */
  observeToolCalls(toolCallCount: number): SubtaskSoftBudgetAdvisory | null;
  /** Read-only snapshot of advisor state. */
  getState(): SubtaskSoftBudgetAdvisorState;
};

export function buildSubtaskSoftBudgetMilestone1Prompt(toolCallCount: number): string {
  return (
    `${SUBTASK_SOFT_BUDGET_MILESTONE_1_PREFIX} 当前子任务已累计执行 ${toolCallCount} 次工具调用，请做一次收敛自检：` +
    "若核心目标与必需验证已完成，请尽快整理结果并收敛交付；" +
    "若同一报错已连续重试且无新证据，请停止盲试并在结果中如实报告根因与阻碍；" +
    "若确系正常的多文件修改或验证工作，可继续稳步完成。"
  );
}

export function buildSubtaskSoftBudgetMilestone2Prompt(toolCallCount: number): string {
  return (
    `${SUBTASK_SOFT_BUDGET_MILESTONE_2_PREFIX} 当前子任务已累计执行 ${toolCallCount} 次工具调用。` +
    "建议在完成当前手头最后一步必要验证后，立即整理已有成果、未完成项与建议的下一步直接交付父对话，" +
    "避免单次子任务过度消耗配额与上下文。"
  );
}

function resolveSoftBudgetEnv(
  explicitEnv: Record<string, string | undefined> | undefined,
): Record<string, string | undefined> | undefined {
  if (explicitEnv !== undefined) return explicitEnv;
  if (typeof process !== "undefined" && process.env) return process.env;
  return undefined;
}

function isEnvSoftBudgetDisabled(env: Record<string, string | undefined> | undefined): boolean {
  const raw = env?.NOLO_SUBTASK_SOFT_BUDGET?.trim().toLowerCase();
  return raw === "0" || raw === "false";
}

function hasParentDialogEnvSignal(env: Record<string, string | undefined> | undefined): boolean {
  const raw = env?.NOLO_PARENT_DIALOG_ID;
  return typeof raw === "string" && raw.trim().length > 0;
}

function normalizeThreshold(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

/**
 * Create a non-killing, one-shot-per-milestone soft budget convergence advisor
 * for subtask runs.
 *
 * Activation rules (default off for normal interactive turns):
 * - Kill switch `NOLO_SUBTASK_SOFT_BUDGET=0` (or `"false"`) always disables.
 * - Explicit `softBudget: false` or `softBudget: { enabled: false }` disables.
 * - Otherwise enabled when `softBudget` is explicitly provided (`true` or config
 *   object), or a subtask context is detected (`isSubtask: true`,
 *   `runKind: "subtask"`, non-empty `NOLO_PARENT_DIALOG_ID`, or
 *   `isSubtaskRun(env)` / `NOLO_AGENT_RUN_CHILD`).
 */
export function createSubtaskSoftBudgetAdvisor(
  options?: SubtaskSoftBudgetAdvisorOptions,
): SoftBudgetAdvisor {
  const env = resolveSoftBudgetEnv(options?.env);
  const envDisabled = isEnvSoftBudgetDisabled(env);
  const configDisabled =
    options?.softBudget === false ||
    (typeof options?.softBudget === "object" &&
      options.softBudget !== null &&
      options.softBudget.enabled === false);

  const configEnabled =
    options?.softBudget === true ||
    (typeof options?.softBudget === "object" &&
      options.softBudget !== null &&
      options.softBudget.enabled !== false);

  const hasSubtaskContext =
    options?.isSubtask === true ||
    options?.runKind === "subtask" ||
    hasParentDialogEnvSignal(env) ||
    isSubtaskRun(env);

  const enabled = !envDisabled && !configDisabled && (configEnabled || hasSubtaskContext);

  const rawConfig =
    typeof options?.softBudget === "object" && options.softBudget !== null
      ? options.softBudget
      : undefined;

  const milestone1ToolCalls =
    normalizeThreshold(rawConfig?.milestone1ToolCalls) ??
    DEFAULT_SUBTASK_SOFT_BUDGET_MILESTONE_1_TOOL_CALLS;

  const explicitMilestone2 = normalizeThreshold(rawConfig?.milestone2ToolCalls);
  const milestone2ToolCalls =
    explicitMilestone2 !== undefined
      ? Math.max(milestone1ToolCalls + 1, explicitMilestone2)
      : Math.max(
          DEFAULT_SUBTASK_SOFT_BUDGET_MILESTONE_2_TOOL_CALLS,
          milestone1ToolCalls * 2,
        );

  let milestone1Triggered = false;
  let milestone2Triggered = false;
  let lastObservedToolCallCount = 0;

  function observeToolCalls(toolCallCount: number): SubtaskSoftBudgetAdvisory | null {
    const normalized =
      typeof toolCallCount === "number" && Number.isFinite(toolCallCount) && toolCallCount > 0
        ? Math.floor(toolCallCount)
        : 0;
    if (normalized > lastObservedToolCallCount) {
      lastObservedToolCallCount = normalized;
    }
    if (!enabled) return null;

    if (!milestone2Triggered && normalized >= milestone2ToolCalls) {
      milestone1Triggered = true;
      milestone2Triggered = true;
      return {
        milestone: 2,
        threshold: milestone2ToolCalls,
        toolCallCount: normalized,
        message: buildSubtaskSoftBudgetMilestone2Prompt(normalized),
      };
    }

    if (!milestone1Triggered && normalized >= milestone1ToolCalls) {
      milestone1Triggered = true;
      return {
        milestone: 1,
        threshold: milestone1ToolCalls,
        toolCallCount: normalized,
        message: buildSubtaskSoftBudgetMilestone1Prompt(normalized),
      };
    }

    return null;
  }

  function getState(): SubtaskSoftBudgetAdvisorState {
    return {
      enabled,
      milestone1ToolCalls,
      milestone2ToolCalls,
      milestone1Triggered,
      milestone2Triggered,
      lastObservedToolCallCount,
    };
  }

  return {
    enabled,
    milestone1ToolCalls,
    milestone2ToolCalls,
    observeToolCalls,
    getState,
  };
}
