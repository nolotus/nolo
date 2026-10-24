// packages/agent-runtime/subtaskBudget.ts
//
// 派发子任务的**硬预算**（hard budget for dispatched subtasks）。
//
// 【为什么需要硬预算】
// 既有的 round budget（localLoop.ts 的 roundBudgetWarningThreshold）只是往
// transcript 注入一条系统提示，指望模型自己收尾——它是**建议**，不是**约束**。
// 实测事故：一次「改一个常量」的子 run 跑了 82 次工具调用 / 43 分钟，
// 软提醒完全没兜住。本模块提供不依赖模型自觉的硬约束：
//
//   - maxToolCalls：按**实际执行的 tool call** 计数（不是轮次）；
//   - maxWallClockMs：从 run 开始计的墙钟。
//
// 【作用范围】
// 只对 runKind === "subtask" 生效（localLoop 只在子任务时创建 tracker）。
// 交互式会话（用户在 TUI 里跑长任务）永远不受影响。
//
// 【与软提醒的关系】
// 软提醒**保留**：它在阈值更早时提示模型收敛，给模型主动收尾的机会；
// 硬预算在模型没收尾时兜底。两者的阈值互相独立，可以同时生效。

/**
 * 子任务工具调用硬上限默认值。
 *
 * 取值依据（docs/plans/2026-10-24-subtask-run-budget.md）：历史 1828 条 done
 * run 的工具调用数 max = 161，**没有一条达到 200**；2026-10-24 那次失控是
 * 83 次 / 43.75 分钟。所以这组默认**抓不到那次事故**——它的作用是「无界损失」
 * 兜底，不是「识别失控」。不要为了更早抓住而往小调（会误杀合法长任务）。
 */
export const DEFAULT_SUBTASK_MAX_TOOL_CALLS = 200;
/**
 * 子任务墙钟硬上限默认值（毫秒）= 60 分钟。
 *
 * 取值依据同上：历史 done run 总时长 max = 45.7 分钟，无一达到 60 分钟；
 * 失控那次是 43.75 分钟，同样低于这个兜底线。
 */
export const DEFAULT_SUBTASK_MAX_WALL_CLOCK_MS = 60 * 60 * 1000;

/** 环境变量覆盖：子任务最大工具调用数。 */
export const SUBTASK_MAX_TOOL_CALLS_ENV = "NOLO_SUBTASK_MAX_TOOL_CALLS";
/** 环境变量覆盖：子任务最大墙钟（毫秒）。 */
export const SUBTASK_MAX_WALL_CLOCK_MS_ENV = "NOLO_SUBTASK_MAX_WALL_CLOCK_MS";

/** 终止标记：写进结果正文，父方/UI 可据此识别「中间结论」而非失败。 */
export const SUBTASK_BUDGET_EXHAUSTED_MARKER = "[budget-exhausted]";

export type SubtaskBudgetLimits = {
  maxToolCalls: number;
  maxWallClockMs: number;
};

export type SubtaskBudgetLimitKind = "max-tool-calls" | "max-wall-clock-ms";

export type SubtaskBudgetExhaustion = {
  /** 触发的上限种类。 */
  limit: SubtaskBudgetLimitKind;
  limits: SubtaskBudgetLimits;
  /** 已实际执行的工具调用数。 */
  toolCallsExecuted: number;
  /** 从 run 开始到触发的墙钟耗时（毫秒）。 */
  elapsedMs: number;
  atMs: number;
};

/**
 * 解析一个正整数上限。
 *
 * 非法值（空串 / 非数字 / NaN / Infinity / <= 0）一律回退默认值——
 * 宁可用默认的宽松上限，也不能因为一个手滑的环境变量把子任务变成「立刻终止」。
 */
export function parseSubtaskBudgetLimit(
  raw: string | number | undefined | null,
  fallback: number,
): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return Math.floor(raw);
  }
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/**
 * 解析子任务硬预算上限。
 *
 * 优先级：显式入参 > 环境变量 > 默认值。非法值逐级回退（显式入参非法 → 看环境变量，
 * 环境变量非法 → 默认值）。
 */
export function resolveSubtaskBudgetLimits(options?: {
  maxToolCalls?: number;
  maxWallClockMs?: number;
  env?: Record<string, string | undefined>;
}): SubtaskBudgetLimits {
  const env =
    options?.env ??
    (typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {});
  const explicitToolCalls = options?.maxToolCalls;
  const explicitWallClock = options?.maxWallClockMs;
  return {
    maxToolCalls:
      typeof explicitToolCalls === "number"
        ? parseSubtaskBudgetLimit(explicitToolCalls, parseSubtaskBudgetLimit(env?.[SUBTASK_MAX_TOOL_CALLS_ENV], DEFAULT_SUBTASK_MAX_TOOL_CALLS))
        : parseSubtaskBudgetLimit(env?.[SUBTASK_MAX_TOOL_CALLS_ENV], DEFAULT_SUBTASK_MAX_TOOL_CALLS),
    maxWallClockMs:
      typeof explicitWallClock === "number"
        ? parseSubtaskBudgetLimit(explicitWallClock, parseSubtaskBudgetLimit(env?.[SUBTASK_MAX_WALL_CLOCK_MS_ENV], DEFAULT_SUBTASK_MAX_WALL_CLOCK_MS))
        : parseSubtaskBudgetLimit(env?.[SUBTASK_MAX_WALL_CLOCK_MS_ENV], DEFAULT_SUBTASK_MAX_WALL_CLOCK_MS),
  };
}

/**
 * 子 run 的墙钟截止（绝对毫秒）。
 *
 * 父子关系一行表达：**子截止 = min(父截止, 子开始 + 子默认)**。
 * 不做额度树累加——子 run 只受「父级截止」与「自身默认」中更早的那个约束。
 */
export function resolveSubtaskBudgetDeadlineMs(args: {
  /** 父 run 的截止（绝对毫秒）；父没有截止时传 undefined / null。 */
  parentDeadlineAtMs?: number | null;
  /** 子 run 开始时刻（绝对毫秒）。 */
  childStartedAtMs: number;
  /** 子 run 已解析的上限。 */
  limits: SubtaskBudgetLimits;
}): number {
  const ownDeadlineAtMs = args.childStartedAtMs + args.limits.maxWallClockMs;
  const parentDeadlineAtMs = args.parentDeadlineAtMs;
  if (typeof parentDeadlineAtMs === "number" && Number.isFinite(parentDeadlineAtMs)) {
    return Math.min(parentDeadlineAtMs, ownDeadlineAtMs);
  }
  return ownDeadlineAtMs;
}

/**
 * **派发边界**的一次性解析：显式参数 > 环境变量 > 默认值，并算出子 run 截止。
 *
 * 只在「创建子 run 的入口」调用一次，解析结果随 run 请求传给子 run；
 * 子 run（localLoop）**只消费** limits，**不再自行读 env**——否则父子 run 处在
 * 不同执行环境时（父在 CLI、子在服务端）会各自解释出不同的授权额度。
 */
export function resolveDispatchedSubtaskBudget(args?: {
  maxToolCalls?: number;
  maxWallClockMs?: number;
  /** 父 run 的截止（绝对毫秒）；父没有截止时省略。 */
  parentDeadlineAtMs?: number | null;
  /** 子 run 开始时刻（绝对毫秒）；默认取当前时间。 */
  childStartedAtMs?: number;
  /** 环境变量快照（默认 process.env）。 */
  env?: Record<string, string | undefined>;
}): { limits: SubtaskBudgetLimits; deadlineAtMs: number } {
  const limits = resolveSubtaskBudgetLimits({
    ...(typeof args?.maxToolCalls === "number" ? { maxToolCalls: args.maxToolCalls } : {}),
    ...(typeof args?.maxWallClockMs === "number" ? { maxWallClockMs: args.maxWallClockMs } : {}),
    ...(args?.env ? { env: args.env } : {}),
  });
  const childStartedAtMs = args?.childStartedAtMs ?? Date.now();
  const deadlineAtMs = resolveSubtaskBudgetDeadlineMs({
    parentDeadlineAtMs: args?.parentDeadlineAtMs ?? null,
    childStartedAtMs,
    limits,
  });
  return {
    // 父截止更早时，子 run 的墙钟额度被压到「距离父截止的剩余时间」。
    limits: {
      maxToolCalls: limits.maxToolCalls,
      maxWallClockMs: Math.max(1, deadlineAtMs - childStartedAtMs),
    },
    deadlineAtMs,
  };
}

export type SubtaskBudgetTracker = {
  limits: SubtaskBudgetLimits;
  /** run 开始时刻（同一时钟源）。 */
  startedAtMs: number;
  /** 已实际执行的工具调用数。 */
  toolCallsExecuted: number;
  elapsedMs(): number;
  remainingToolCalls(): number;
  /** 是否已达任一上限。 */
  isExhausted(): boolean;
  /** 已达上限时给出终止详情；未达上限返回 null。 */
  exhaustion(): SubtaskBudgetExhaustion | null;
  /** 记录一次**实际执行**的工具调用，返回累计执行数。 */
  recordToolCallExecuted(): number;
};

/**
 * 创建子任务预算追踪器。
 *
 * `now` 是时钟 seam：测试注入假时钟即可验证墙钟上限，无需真的等 45 分钟。
 */
export function createSubtaskBudgetTracker(options: {
  limits: SubtaskBudgetLimits;
  now?: () => number;
  startedAtMs?: number;
}): SubtaskBudgetTracker {
  const now = options.now ?? (() => Date.now());
  const startedAtMs = options.startedAtMs ?? now();
  let toolCallsExecuted = 0;

  const elapsedMs = () => Math.max(0, now() - startedAtMs);

  const exhaustion = (): SubtaskBudgetExhaustion | null => {
    const elapsed = elapsedMs();
    // 工具调用数优先：它是更确定的信号（墙钟会受 provider 慢响应影响）。
    if (toolCallsExecuted >= options.limits.maxToolCalls) {
      return {
        limit: "max-tool-calls",
        limits: options.limits,
        toolCallsExecuted,
        elapsedMs: elapsed,
        atMs: now(),
      };
    }
    if (elapsed >= options.limits.maxWallClockMs) {
      return {
        limit: "max-wall-clock-ms",
        limits: options.limits,
        toolCallsExecuted,
        elapsedMs: elapsed,
        atMs: now(),
      };
    }
    return null;
  };

  return {
    limits: options.limits,
    startedAtMs,
    get toolCallsExecuted() {
      return toolCallsExecuted;
    },
    elapsedMs,
    remainingToolCalls: () => Math.max(0, options.limits.maxToolCalls - toolCallsExecuted),
    isExhausted: () => exhaustion() !== null,
    exhaustion,
    recordToolCallExecuted: () => {
      toolCallsExecuted += 1;
      return toolCallsExecuted;
    },
  };
}

/**
 * 生成「已达预算上限」的中间结论文案。
 *
 * 语义要求：明确说明「已达预算上限 / 这是中间结论 / 当前完成到哪一步」，
 * 并且**不得**读起来像 provider 报错或崩溃。
 */
export function buildSubtaskBudgetExhaustedContent(args: {
  exhaustion: SubtaskBudgetExhaustion;
  roundsCompleted: number;
  recentToolNames?: string[];
}): string {
  const { exhaustion } = args;
  const limitLabel =
    exhaustion.limit === "max-tool-calls"
      ? `工具调用上限（已执行 ${exhaustion.toolCallsExecuted}/${exhaustion.limits.maxToolCalls} 次）`
      : `墙钟上限（已运行 ${Math.round(exhaustion.elapsedMs / 1000)} 秒 / 上限 ${Math.round(
          exhaustion.limits.maxWallClockMs / 1000,
        )} 秒）`;
  const recent = (args.recentToolNames ?? []).slice(-5);
  const recentText = recent.length > 0 ? recent.join("、") : "（本轮无工具调用）";
  return [
    `${SUBTASK_BUDGET_EXHAUSTED_MARKER} 已达子任务预算上限（${limitLabel}），本次子任务到此优雅终止。`,
    "这是一份**中间结论**，不是完整交付，也不是失败：上文保留的是本轮已完成的阶段性成果，可直接作为阶段交接使用。",
    `当前完成到哪一步：已完成 ${args.roundsCompleted} 轮模型往返、${exhaustion.toolCallsExecuted} 次工具调用；最近完成的工具：${recentText}。`,
    "已完成的工具结果全部保留在本回合的 transcript / 结果中，没有任何回滚或丢弃。",
    "如需继续推进，请由父方携带当前中间结论重新派发（可按需调高预算上限）。",
  ].join("\n");
}
