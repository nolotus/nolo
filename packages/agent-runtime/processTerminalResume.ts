// packages/agent-runtime/processTerminalResume.ts
//
// 后台进程任务终态 → 「要不要续跑 agent」的决策层（host 中立，纯依赖注入）。
//
// 背景：launchProcess / 超长 execShell 自动 detach 出来的进程任务终态时，此前只有一个
// 单行提示（pendingProcessNotices → 下一个真实 turn 的 turn-scope context block）：
// agent 得等用户再说一句话才会看到「你派的任务干完了」。本模块给 TUI 一个可测的决策：
// 终态该怎么投递。
//
// 三条投递形态：
//   - inject-turn     : 父 dialog 的某个 turn 正在跑 → 直投该 turn 的注入收件箱（in-turn 消化）。
//   - completion-turn : 父 dialog 当前空闲且仍是那个 dialog → 自动开一个内部 completion turn。
//   - notice-only     : 无归属 / dialog 不匹配 / 重复 / 触顶 / 无投递通道 → 维持既有单行提示。
//
// 分层红线（与 processTask.ts 顶部同源）：本模块只消费 ProcessTask 轴的状态与
// ProcessOwner，不碰 agent-run 文件轴（AGENT_RUN_TERMINAL_STATUSES），也不写任何持久记录。

import type { ProcessOwner } from "./processOwnership";
import type { ProcessTerminalNotice } from "./processRegistry";

/** Maximum causal completion depth, independent of sibling tasks. */
export const DEFAULT_MAX_CHAINED_COMPLETION_TURNS = 3;

export type ProcessTerminalResumeReason =
  /** 没有投递通道（非交互模式 / 会话已结束）：连 claim 都不该消耗。 */
  | "no-channel"
  /** 派发时刻没抓到归属（不是本 TUI 起的任务，或宿主没注入 runtimeContext）。 */
  | "unowned"
  /** 显式后台/环境任务（launchProcess 等，promoted !== true）：只发通知不自动续跑。 */
  | "not-promoted"
  /** 同一 taskId 已经续跑过一次。 */
  | "duplicate"
  /** 归属 dialog 不是当前 dialog（用户已 /switch 或 /new）。 */
  | "dialog-mismatch"
  /** 连续自动 completion turn 触顶。 */
  | "chain-cap";

export type ProcessTerminalResumeDecision =
  | { kind: "notice-only"; reason: ProcessTerminalResumeReason; taskId: string }
  | {
      kind: "inject-turn";
      taskId: string;
      owner: ProcessOwner;
      notice: ProcessTerminalNotice;
    }
  | {
      kind: "completion-turn";
      taskId: string;
      owner: ProcessOwner;
      notice: ProcessTerminalNotice;
    };

/**
 * 决策台账：once-only 的 taskId 集合。
 *
 * 显式传入而非模块级单例：TUI 每会话一份，测试可造任意份，registry 单例问题不传染。
 */
export type ProcessTerminalResumeState = {
  /** 已作出续跑决策的 taskId；claim 先于宿主实际投递，不代表投递成功。 */
  claimedTaskIds: Set<string>;
};

export function createProcessTerminalResumeState(): ProcessTerminalResumeState {
  return { claimedTaskIds: new Set<string>() };
}

export type ProcessTerminalResumeInput = {
  notice: ProcessTerminalNotice;
  /** 派发时刻捕获的归属（registry 记录上那一份），不是终态时的当前 dialog。 */
  owner: ProcessOwner | null | undefined;
  /** 终态投递时刻的当前 dialog（UI 事实）。 */
  currentDialogId: string | null | undefined;
  /** 当前是否有 turn 正在跑（有 → 直投收件箱，不新开 turn）。 */
  turnActive: boolean;
  state: ProcessTerminalResumeState;
  /** false = 没有投递通道；此时一律 notice-only 且不消耗 claim。缺省 true。 */
  canDeliver?: boolean;
  maxChainedCompletionTurns?: number;
};

const resolveCap = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return DEFAULT_MAX_CHAINED_COMPLETION_TURNS;
  }
  return Math.floor(value);
};

/**
 * 单条终态通知 → 投递决策。
 *
 * 决定投递时先 claim taskId（实际投递发生在调用方）；链深由任务归属携带。
 * 既有限制：投递失败或宿主退出后不会回滚 claim；这里不保证可靠提交/重试。
 */
export function decideProcessTerminalResume(
  input: ProcessTerminalResumeInput,
): ProcessTerminalResumeDecision {
  const taskId = input.notice.taskId;
  if (input.canDeliver === false) {
    return { kind: "notice-only", reason: "no-channel", taskId };
  }
  const dialogId = input.owner?.dialogId;
  if (!input.owner || !dialogId) {
    return { kind: "notice-only", reason: "unowned", taskId };
  }
  if (!input.notice.promoted) {
    return { kind: "notice-only", reason: "not-promoted", taskId };
  }
  if (input.state.claimedTaskIds.has(taskId)) {
    return { kind: "notice-only", reason: "duplicate", taskId };
  }
  const currentDialogId = input.currentDialogId ?? null;
  if (currentDialogId !== dialogId) {
    return { kind: "notice-only", reason: "dialog-mismatch", taskId };
  }
  const cap = resolveCap(input.maxChainedCompletionTurns);
  const depth = input.owner.processCausalDepth ?? 0;
  if (depth >= cap) {
    return { kind: "notice-only", reason: "chain-cap", taskId };
  }
  input.state.claimedTaskIds.add(taskId);
  if (input.turnActive) {
    return { kind: "inject-turn", taskId, owner: input.owner, notice: input.notice };
  }
  return { kind: "completion-turn", taskId, owner: input.owner, notice: input.notice };
}

/**
 * TUI 侧粘合：把「读归属 / 读当前 dialog / 判断 turn 活跃 / 是否有投递通道」四件事
 * 注入进来，得到一个每会话一个、可测的决策器。文案不在这里生成——唤醒文本由调用方
 * 用既有 formatter 组装（processTerminalNotice.ts），保证「存的行」与「注入的文本」同源。
 */
export type ProcessTerminalAutoResumeDeps = {
  /** 从 registry 记录读产物归属（launch/detach 时写入）。 */
  readOwner: (taskId: string) => ProcessOwner | null | undefined;
  getCurrentDialogId: () => string | null;
  isTurnActive: () => boolean;
  /** 缺省恒 true；TUI 在非交互/会话结束时给 false。 */
  canDeliver?: () => boolean;
  maxChainedCompletionTurns?: number;
  /** 诊断出口（可选）：每次决策回报一次，便于日志/测试观察。 */
  onDecision?: (decision: ProcessTerminalResumeDecision) => void;
  /** 可选：从 registry 读是否已 promote（若 notice 未显式携带）。 */
  isPromoted?: (taskId: string) => boolean;
};

export type ProcessTerminalAutoResumer = {
  decide: (notice: ProcessTerminalNotice) => ProcessTerminalResumeDecision;
  readonly state: ProcessTerminalResumeState;
};

export function createProcessTerminalAutoResumer(
  deps: ProcessTerminalAutoResumeDeps,
): ProcessTerminalAutoResumer {
  const state = createProcessTerminalResumeState();
  return {
    state,
    decide: (notice) => {
      const promoted = notice.promoted ?? deps.isPromoted?.(notice.taskId) ?? false;
      const effectiveNotice = notice.promoted === promoted ? notice : { ...notice, promoted };
      const decision = decideProcessTerminalResume({
        notice: effectiveNotice,
        owner: deps.readOwner(notice.taskId),
        currentDialogId: deps.getCurrentDialogId(),
        turnActive: deps.isTurnActive(),
        state,
        ...(deps.canDeliver ? { canDeliver: deps.canDeliver() } : {}),
        ...(deps.maxChainedCompletionTurns === undefined
          ? {}
          : { maxChainedCompletionTurns: deps.maxChainedCompletionTurns }),
      });
      deps.onDecision?.(decision);
      return decision;
    },
  };
}
