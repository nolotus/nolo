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
import { findPotentialSecrets } from "../secretScan";
import { redactSecrets } from "./redactSecrets";
import { stripAnsi } from "./tuiAnsi";

const ASK_SECRET_PLACEHOLDER = "⟨redacted⟩";

// eslint-disable-next-line no-control-regex
const C0_C1_CONTROL_REGEX = /[\x00-\x1f\x7f-\x9f]/g;

/**
 * normal 档摘要出口的统一补充护栏：runtime 投影虽非模型直控，但 URL query、
 * 搜索词、命令行仍可能携带密钥形态串（?api_key=sk-…、Authorization: Bearer …、
 * ghp_/xox 系前缀）。secretScan 覆盖赋值形态，这里补令牌串形态；命中即整体
 * 放弃摘要退回纯 label——宁可少显示，不上屏可疑串（阶段 A 收敛，2026-09-02）。
 */
const NORMAL_GIST_SECRET_PATTERNS: RegExp[] = [
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-(?:ant-)?(?:api)?[0-9a-zA-Z-]{10,}/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{10,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
];

export function withholdIfSecretLike(gist: string): string {
  if (!gist) return "";
  if (findPotentialSecrets(gist).length > 0) return "";
  if (NORMAL_GIST_SECRET_PATTERNS.some((pattern) => pattern.test(gist))) return "";
  return gist;
}

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
