/**
 * ask_user 文本清洗：headless 菜单（client/toolOutput）与交互弹窗（tui/askChoiceDialog）共用。
 *
 * 下沉到 tui/ 层：toolOutput 依赖 tui，而弹窗不能反向依赖 client 层，否则形成循环。
 *
 * 规则（按顺序）：
 *   1. stripAnsi 剥 ANSI/CSI/OSC（含 BEL 结尾的 OSC 52 剪贴板写入等）；
 *   2. 折叠换行与空白，保证单行渲染；
 *   3. 删除剩余 C0/C1 控制字符（BEL、BS 等，BS 能覆盖已显示文字伪造选项）。
 *      必须放在第 1 步之后，否则会把转义序列拆散；嵌套 ESC 残留也在这里清掉；
 *   4. redactSecrets 打码凭据键值形态；
 *   5. withholdIfSecretLike 兜底：令牌串形态命中则整段换成打码占位。
 * 可选宽度上限 max 时按行宽 clip；不传 max 则不截断（弹窗正文不应被截）。
 */
import { clipCompactText } from "core/clipCompactText";
import { redactSecrets, withholdIfSecretLike } from "./redactSecrets";
import { stripAnsi } from "./tuiAnsi";

export { withholdIfSecretLike };

const ASK_SECRET_PLACEHOLDER = "⟨redacted⟩";

// eslint-disable-next-line no-control-regex
const C0_C1_CONTROL_REGEX = /[\x00-\x1f\x7f-\x9f]/g;

/** 运行时防御：输入可能是 undefined / null / 数字等非字符串（线上 JSON）。 */
function toText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

/** 第 1–3 步：剥转义、折叠空白、删控制字符。 */
export function cleanAskText(value: unknown): string {
  return stripAnsi(toText(value))
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(C0_C1_CONTROL_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 第 1–5 步的完整清洗；返回值可直接拼进终端。 */
export function safeAskText(value: unknown, max?: number): string {
  const cleaned = redactSecrets(cleanAskText(value));
  if (!cleaned) return "";
  const guarded = withholdIfSecretLike(cleaned) || ASK_SECRET_PLACEHOLDER;
  return max === undefined ? guarded : clipCompactText(guarded, max, "…");
}


/** Preserve code line boundaries while retaining terminal-control and secret protections. */
export function safeApprovalMultilineText(value: unknown): string {
  // CR, LS and PS are ECMAScript line terminators too; never collapse them into a comment.
  const lines = stripAnsi(String(value ?? "")).replace(/\r\n?|\u2028|\u2029/g, "\n").split("\n");
  return lines.map(line => {
    // Tabs are non-executing whitespace on screen; remove remaining C0/C1 controls after ANSI.
    const cleaned = line.replace(/\t/g, "    ").replace(C0_C1_CONTROL_REGEX, "");
    const redacted = redactSecrets(cleaned);
    return redacted ? withholdIfSecretLike(redacted) || ASK_SECRET_PLACEHOLDER : "";
  }).join("\n");
}
