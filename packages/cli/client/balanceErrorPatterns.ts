/**
 * 余额不足 / HTTP 402 的识别词表与判定（单一事实来源）。
 *
 * 单独成文件的原因：这份口径有两个消费者——client/agentRun.ts（本地 run 失败的
 * 渲染与分类）与 agentRunCommand.ts（TUI 的「充值后接着聊」提示
 * isBalanceExhaustedError）。此前两边各维护一份，且都只认
 * `UPSTREAM_402|Insufficient Balance|余额不足|insufficient balance`，于是真实报文里的
 * `[code=insufficient_balance]`（下划线形态）、`wallet balance is insufficient`、
 * `payment_required` 全都不命中 → 报文落进 generic/upstream 分支，用户看到的是那条
 * 巨长 4xx 文案，TUI 的充值提示也不触发。
 * 放在 client/ 而不是 agentRunCommand.ts：agentRunCommand 依赖 client/agentRun，
 * 反向 import 会形成循环依赖。
 */

/**
 * 零宽字符（U+200B–U+200D / U+2060 / U+FEFF）会撕裂关键词：真实报文出现过
 * `wallet\u200b... balance is insufficient` 这类形态，裸正则怎么看都不是「余额不足」。
 * 判定与渲染前统一剥离（渲染侧还兼作输出卫生：不可见字符不该进用户文案）。
 */
const ZERO_WIDTH_RE = /[\u200b-\u200d\u2060\ufeff]/g;

export function stripZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_RE, "");
}

/**
 * 控制字符（含 ESC `\u001b`）会驱动终端（清屏 / 光标移动），provider 可控文本进
 * 用户文案前必须剥离。刻意保留 `\t`(09) / `\n`(0a) / `\r`(0d)：那三个交给空白折叠，
 * 直接删掉会把 `a\nb` 粘成 `ab`。
 */
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function stripControlChars(text: string): string {
  return text.replace(CONTROL_CHAR_RE, "");
}

/**
 * 余额类报文特征。刻意覆盖真实报文的多种拼写，且**不**包含任何限流/额度措辞的
 * 泛化匹配（裸 quota / rate limit / `coding plan …` 都不在此列）：那会把真 429
 * 「Individual quota reached… Please upgrade your subscription」以及
 * 「coding plan quota exhausted. Resets in 30m」劫持进余额块——复位行消失、出口被
 * 换成「充值后重发」。真实 402 报文本来就命中 `insufficient_balance` 与
 * `wallet balance is insufficient`，这类边际召回为零的额度措辞不值得这个代价。
 */
export const BALANCE_ERROR_PATTERNS: ReadonlyArray<RegExp> = [
  /UPSTREAM_402/i,
  // 裸 HTTP 402 本身就是「Payment Required」：报文里没有任何余额关键词（如只有
  // `{"error":{}}` 空壳）时也必须走余额块，而不是落进通用 4xx 长文案。
  // `\b` 保证 `HTTP 4020` 不误命中。
  /\bHTTP\s*402\b/i,
  // `insufficient balance` / `insufficient_balance` / `insufficient-balance` /
  // `Insufficient  Balance`（分隔符重复也要认：alpha 里的旧 `/insufficient\s+balance/`
  // 能覆盖双空格，收窄成 `?` 会回退）。
  /insufficient[_\s-]+balance/i,
  /余额不足/,
  /wallet\s+balance\s+is\s+insufficient/i,
  /top\s+up\s+your\s+wallet/i,
  /payment[_ ]required/i,
];

/**
 * Coding Plan 额度耗尽标记：只用于**选措辞**（`coding_plan_exhausted` /
 * `coding-plan-exhausted` / `coding plan quota exhausted`），不参与余额判定——
 * 调用点必须先判成余额不足才读它，所以这里的宽匹配不会劫持 429。
 */
export const CODING_PLAN_EXHAUSTED_RE = /coding[_\s-]?plan[_\s-]?exhausted/i;

/** 判定余额不足（先归一化零宽字符，再逐条匹配）。 */
export function matchesBalanceError(message: string): boolean {
  if (!message) return false;
  const normalized = stripZeroWidthChars(message);
  return BALANCE_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** 从任意错误/字符串取出文本再判定（TUI 侧入口）。 */
export function isBalanceExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as { message?: unknown })?.message ?? "");
  return matchesBalanceError(message);
}
