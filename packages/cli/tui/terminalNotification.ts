/**
 * Terminal attention：Nolo 决定「什么时候需要用户注意」，终端决定「怎么提醒」。
 *
 * 分层：
 * - BEL（\x07）是 Ghostty / Windows Terminal / Linux 终端共同理解的基础
 *   primitive，永远先写。响铃、闪动、taskbar 注意等都交给终端 emulator
 *   解释，Nolo 不决定用户最终看到/听到什么。
 * - Windows Terminal（feature detection：存在 WT_SESSION 环境变量；不是
 *   process.platform 硬编码——Windows 可跑其他终端，WSL 里的 WT 也带
 *   WT_SESSION）额外支持 OSC 9;4 progress：input-required 时给 tab/taskbar
 *   一个 indeterminate 状态，等待结束后必须清掉，否则 taskbar 永远转圈。
 */

export type TerminalAttentionReason = "input-required" | "turn-completed";

/**
 * turn-completed attention 的最小时长门槛：长任务完成值得提醒，300ms 的
 * 普通聊天每句都响会非常烦。后续如需配置化再从这里挪出去。
 */
export const TURN_COMPLETION_ATTENTION_THRESHOLD_MS = 5_000;

// Windows Terminal OSC 9;4 progress state（均以 BEL 结尾）：
//   state 3 = indeterminate（等待用户输入）
//   state 0 = clear（用户已应答 / turn 已结束）
// magic string 只在这里构造一次，调用方一律走函数，不要到处复制。
function buildWindowsTerminalProgressSequence(state: 0 | 3): string {
  return `\x1b]9;4;${state};0\x07`;
}

/** 是否运行在 Windows Terminal 里（env.WT_SESSION feature detection）。 */
export function isWindowsTerminal(env?: NodeJS.ProcessEnv): boolean {
  return Boolean(env?.WT_SESSION);
}

export interface TerminalBellDecision {
  wasAborted: boolean;
  streamInterrupted?: boolean;
  exitCode: number;
  interactive: boolean;
  /**
   * turn 实际运行时长。低于阈值不值得打断用户；调用方必须如实报告，
   * 未传视为 0（不响）。
   */
  durationMs?: number;
}

export function shouldEmitTerminalBell(decision: TerminalBellDecision): boolean {
  return (
    !decision.wasAborted &&
    !decision.streamInterrupted &&
    decision.exitCode === 0 &&
    decision.interactive &&
    (decision.durationMs ?? 0) >= TURN_COMPLETION_ATTENTION_THRESHOLD_MS
  );
}

/** Emit a best-effort terminal notification without changing the TUI layout. */
export function emitTerminalBell(output: NodeJS.WritableStream): void {
  try {
    output.write("\x07");
  } catch {
    // A notification must never make a completed turn fail.
  }
}

export interface TerminalAttentionArgs {
  output: NodeJS.WritableStream;
  /** feature detection 只读这里；缺省（非 Windows Terminal）时只发 BEL。 */
  env?: NodeJS.ProcessEnv;
  reason: TerminalAttentionReason;
}

/**
 * 统一的注意力入口：
 * - BEL 永远发（跨平台基础协议，语义交给终端）。
 * - input-required 且在 Windows Terminal：追加 OSC 9;4 indeterminate，让
 *   tab/taskbar 有可见状态——用户即使关掉 audible bell 也能看到。
 * - turn-completed 且在 Windows Terminal：追加 OSC 9;4 clear，防御性清掉
 *   任何残留 progress（正常情况 input-required 的 finally 已经清过）。
 */
export function emitTerminalAttention(args: TerminalAttentionArgs): void {
  emitTerminalBell(args.output);
  if (!isWindowsTerminal(args.env)) return;
  try {
    args.output.write(
      args.reason === "input-required"
        ? buildWindowsTerminalProgressSequence(3)
        : buildWindowsTerminalProgressSequence(0),
    );
  } catch {
    // 视觉增强失败不影响基础 BEL，更不能让已完成的 turn 失败。
  }
}

/** 清掉 Windows Terminal 的 tab/taskbar progress（非 WT 是 no-op）。 */
export function clearTerminalAttentionProgress(args: {
  output: NodeJS.WritableStream;
  env?: NodeJS.ProcessEnv;
}): void {
  if (!isWindowsTerminal(args.env)) return;
  try {
    args.output.write(buildWindowsTerminalProgressSequence(0));
  } catch {
    // cleanup 永不抛错。
  }
}

/**
 * 「Agent 原本正在自主运行，现在因为需要用户做决定而暂停」的统一包装：
 * 进入等待时立即发 attention（无时长门槛——等待本身就是值得提醒的事）；
 * body 无论 confirm / cancel / exception / Ctrl+C / turn abort 从哪条路
 * 退出，finally 都保证清掉 progress。绝不允许出现「Agent 已经继续跑了，
 * Windows taskbar 永远保持 progress 状态」。
 */
export async function runWithInputRequiredAttention<T>(
  args: { output: NodeJS.WritableStream; env?: NodeJS.ProcessEnv },
  body: () => Promise<T>,
): Promise<T> {
  emitTerminalAttention({ output: args.output, env: args.env, reason: "input-required" });
  try {
    return await body();
  } finally {
    clearTerminalAttentionProgress({ output: args.output, env: args.env });
  }
}
