/**
 * 前台一次性 Agent CLI（`nolo run` / `nolo chat` / `nolo agent run` 前台）的
 * OSC 7501 生命周期：working → done / error / idle。
 *
 * 只管「什么时候报什么」，编码与 TTY 闸门在 terminalProgramStatus.ts。
 *
 * 纪律：
 * - 只对整次 run 的**最终结果**报终态；中间的工具失败、quota fallback 的首轮
 *   失败都不是整体 error（它们根本不经过这里）。
 * - done / error 一旦发出就是终态：不 clear、不被后续 idle/working 覆盖，
 *   finally / 收尾路径再调用也是空操作（终端要保留“跑完了/失败了”给用户看）。
 * - 用户取消（streamInterrupted，exitCode 0）→ idle：用户叫停不是失败也不是完成。
 * - 一次性 CLI 没有 stdin 交互（不问问题、不要批准、不就地登录），因此不会产生
 *   blocked；真出现该类等待的入口再接 blocked(kind)，不要在这里虚报。
 */
import {
  emitTerminalProgramStatus,
  type TerminalProgramStatusOutput,
  type TerminalProgramStatusState,
} from "./terminalProgramStatus";
import { resolveTerminalProgramStatusState } from "./terminalRunStatus";

export type OneShotRunSettlement = {
  exitCode: number;
  /** 用户中断（Esc/abort）：runner 以 exitCode 0 + streamInterrupted 返回。 */
  streamInterrupted?: boolean;
  /** 停滞/截断类“伪成功”：registry 记 failed，终端状态保持一致。 */
  stalledOrTruncated?: boolean;
};

export type OneShotTerminalStatus = {
  working(): void;
  settle(result: OneShotRunSettlement): void;
  /** runner 抛错 / watchdog 超时 / 停滞。 */
  fail(): void;
};

/**
 * 终态判定本身只有一份：client/terminalRunStatus.ts 的
 * resolveTerminalProgramStatusState（TUI 生命周期共用同一份）。这里只把一次性
 * CLI 的字段名（streamInterrupted）映射过去，优先级与理由见该函数注释。
 */
export function resolveOneShotTerminalState(
  result: OneShotRunSettlement,
): TerminalProgramStatusState {
  return resolveTerminalProgramStatusState({
    exitCode: result.exitCode,
    cancelled: result.streamInterrupted,
    stalledOrTruncated: result.stalledOrTruncated,
  });
}

/**
 * @param output 真实输出流（要求 isTTY === true 才会写）；传 null 表示本次 run
 *   不上报（JSON/events、后台子进程等）。
 */
export function createOneShotTerminalStatus(
  output: TerminalProgramStatusOutput | null | undefined,
): OneShotTerminalStatus {
  let last: TerminalProgramStatusState | undefined;
  let terminal = false;

  const report = (state: TerminalProgramStatusState) => {
    if (!output || terminal || last === state) return;
    last = state;
    if (state === "done" || state === "error") terminal = true;
    emitTerminalProgramStatus(output, { state });
  };

  return {
    working: () => report("working"),
    settle: (result) => report(resolveOneShotTerminalState(result)),
    fail: () => report("error"),
  };
}
