/**
 * OSC 7501 Program Status Protocol —— Nolo 作为 first-party 程序，向终端上报
 * 「我现在在干什么」：闲置 / 工作中 / 等用户 / 完成 / 失败。
 *
 * 协议事实（https://control-codes.page/proposals/osc-7501/，revision 0.4）：
 * - 序列形如 `OSC 7501 ; key=value : key=value … ST`，ST 是 `ESC \`。
 * - `state` 必填；`kind` 只在 blocked 时才有意义（permission/question/auth），
 *   其他值按「没有」处理；`app` 是程序的稳定名（不是给人看的标签）。
 * - 每条 report **整体替换**自己的 record：没带的 key 事后就没了，所以
 *   app 必须在每一条 report 里重复。
 * - 值域只允许字母、数字和 `_ . , + / = -`，因此永远不需要转义；含控制字符或
 *   超限的 report 会被终端整条丢弃。所以这里只发固定安全文本，不发 msg/title
 *   （那两者是 base64 自由文本，v1 不需要），也不做支持性查询（`OSC 7501 ; ? ST`）。
 *
 * 分层：本模块只负责编码 + 有闸门的写入；「什么时候该报什么状态」由调用方
 * （TUI 生命周期 / 一次性 CLI 生命周期）决定。终端怎么展示完全不管。
 *
 * 写入纪律：
 * - 只认 `output.isTTY === true`（严格相等）。不把 truthy 当 TTY，也不回退到
 *   process.stdout —— 调用方给的是真实输出流，管道 / 日志 / JSON 输出必须干净。
 * - 任何写入失败（EPIPE、流已关）都吞掉并返回 false：状态上报是增强，绝不
 *   允许它破坏业务（对照 terminalNotification.ts 的 BEL / OSC 9;4 处理）。
 * - 不发 clear，也没有自动清除。
 */

/** 可上报的状态。协议里的 `clear` 不是状态，故意不在这里。 */
export type TerminalProgramStatusState = "idle" | "working" | "blocked" | "done" | "error";

/** blocked 的原因：要批准、要文字回答、要登录/凭证。 */
export type TerminalProgramStatusKind = "permission" | "question" | "auth";

export type TerminalProgramStatusReport = {
  state: TerminalProgramStatusState;
  /** 只在 state === "blocked" 时上报；其他状态下会被丢弃。 */
  kind?: TerminalProgramStatusKind;
};

/** 上报所需的最小输出流形状（与 agentRunTypes.OutputLike 同构，不互相耦合）。 */
export type TerminalProgramStatusOutput = {
  write: (chunk: string) => unknown;
  isTTY?: boolean;
};

/** 程序名固定为 nolo：分组 / 过滤 / 选图标都靠它，每条 report 都要带。 */
export const TERMINAL_PROGRAM_STATUS_APP = "nolo";

const KNOWN_STATES: ReadonlySet<string> = new Set<TerminalProgramStatusState>([
  "idle",
  "working",
  "blocked",
  "done",
  "error",
]);

const KNOWN_KINDS: ReadonlySet<string> = new Set<TerminalProgramStatusKind>([
  "permission",
  "question",
  "auth",
]);

/**
 * 把一条 report 编码成完整 OSC 7501 序列（含 `ESC ]` 前缀与 ST 结尾）。
 *
 * 返回 `null` 表示「这条不该发」：state 不认识（含 clear），或 kind 不在协议
 * 允许的三种里。这里不抛错 —— 调用方多在 TUI 生命周期与 finally 清理路径上，
 * 参数写错的代价必须是「少发一条状态」，不是「把 turn 弄挂」。
 *
 * 契约（有测试守护）：`state` 永远第一个，`app=nolo` 永远在，`kind` 只出现在
 * blocked 上，不含 msg / title / id / progress，不以 BEL 收尾。
 */
export function encodeTerminalProgramStatus(
  report: TerminalProgramStatusReport,
): string | null {
  const state = report?.state;
  if (typeof state !== "string" || !KNOWN_STATES.has(state)) return null;

  const pairs = [`state=${state}`, `app=${TERMINAL_PROGRAM_STATUS_APP}`];

  // kind 只对 blocked 有定义（协议：With blocked only）。其余状态下静默丢弃，
  // 而不是发一条终端会当作「none」的 kind。
  if (state === "blocked" && typeof report.kind === "string" && KNOWN_KINDS.has(report.kind)) {
    pairs.push(`kind=${report.kind}`);
  }

  return `\x1b]7501;${pairs.join(":")}\x1b\\`;
}

/**
 * 有闸门地发一条状态：只有真实 TTY 输出流才会写，写失败不影响调用方。
 *
 * @returns true = 真的写出去了；false = 被闸门挡掉 / 参数无效 / 写入抛错。
 */
export function emitTerminalProgramStatus(
  output: TerminalProgramStatusOutput | null | undefined,
  report: TerminalProgramStatusReport,
): boolean {
  if (!output || typeof output.write !== "function") return false;
  if (output.isTTY !== true) return false;

  const sequence = encodeTerminalProgramStatus(report);
  if (sequence === null) return false;

  try {
    output.write(sequence);
    return true;
  } catch {
    // 流已关闭 / EPIPE：状态上报失败不是业务失败。
    return false;
  }
}
