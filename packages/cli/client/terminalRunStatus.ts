/**
 * run 终态（完成 / 失败 / 用户叫停）的**唯一真值**：后台结算、一次性 CLI 与
 * TUI 的 OSC 7501 生命周期共用同一份判定。
 *
 * 收敛的是两份曾经各写一套的判定：
 * 1) 「停滞 / 截断的伪成功」——原因集合与判定过去只活在 agentRunCommand.ts
 *    里，TUI 只能靠 `exitCode === 0 ? done : error` 自己猜；于是同一个 run 在
 *    registry 里被结算成 failed，终端却显示「已完成」（第二份真值）。
 * 2) 终态 → OSC 7501 状态的映射（resolveTerminalProgramStatusState）。
 *
 * 分层：本模块只吃 runResult 的字段、只吐结论；编码与 TTY 闸门在
 * terminalProgramStatus.ts，「什么时候上报」由各调用方（一次性 CLI / TUI
 * 生命周期）决定。
 */
import type { TerminalProgramStatusState } from "./terminalProgramStatus";

// ── Empty-assistant settlement semantics ─────────────────────────────────
// ok_with_warning（有完整正文、只缺 finish_reason 收尾帧）与 fallback（真没
// 拿到输出）共用 reason 值，结算只能靠 emptyAssistantOutputUsable 区分。
// 判定与 note 的构造收敛到下面两个纯函数，导出供 agentRunCommand 结算与 TUI
// 状态直接复用（agentRunCommand 按原路径 re-export，消费者 import 不变）。
export const FAILED_EMPTY_ASSISTANT_REASONS: ReadonlySet<string> = new Set([
  "length_truncated",
  "stream_truncated",
  "repetition_loop",
  "stagnant_tool_calls",
]);

export const isRunResultStalledOrTruncated = (result: {
  emptyAssistantFallbackReason?: string;
  emptyAssistantOutputUsable?: boolean;
}): boolean =>
  !result.emptyAssistantOutputUsable &&
  FAILED_EMPTY_ASSISTANT_REASONS.has(result.emptyAssistantFallbackReason ?? "");

export type TerminalRunSettlementInput = {
  exitCode: number;
  /** 用户主动叫停（TUI Esc / 一次性 CLI 的 streamInterrupted）。 */
  cancelled?: boolean;
  /** 停滞 / 截断类「伪成功」：runner 没抛错，但没有可用输出。 */
  stalledOrTruncated?: boolean;
};

/**
 * 把一次 run 的最终结果映射成 OSC 7501 终态。优先级是有意的，不是随手排序：
 *
 * 1) `cancelled` → idle：用户叫停既不是失败也不是完成。取消优先于 error，
 *    因为报「出错了」会把责任算到程序头上，掩盖是用户自己按了 Esc；取消优
 *    先于 done，因为用户根本没看到结果，报 done 会让终端一直挂着「已完成」。
 *    真实输入域里 streamInterrupted 的生产者恒为 exitCode 0（client/agentRunStream.ts
 *    的 abort 分支），所以「取消优先」不会改变既有判定，只是把这条语义写死。
 * 2) `stalledOrTruncated || exitCode !== 0` → error：停滞/截断的 run 可以带着
 *    exitCode 0 返回（runner 没抛错，只是没拿到可用输出）。只看 exitCode 会把
 *    它报成 done，而 registry 里记的是 failed/exitCode=1 —— 同一个 run 两个结
 *    论。二者必须同列 error：非零退出码本来就不算成功，伪成功也只差在这个终
 *    端结论上。
 * 3) 其余 → done。
 */
export function resolveTerminalProgramStatusState(
  input: TerminalRunSettlementInput,
): TerminalProgramStatusState {
  if (input.cancelled) return "idle";
  if (input.stalledOrTruncated || input.exitCode !== 0) return "error";
  return "done";
}
