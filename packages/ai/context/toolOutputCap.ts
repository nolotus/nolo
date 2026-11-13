// ai/context/toolOutputCap.ts

/**
 * 单条工具输出上限与统一的压缩软触发线。
 * cap 只限制一条输出，不限制多工具合计、assistant 或注入消息的整轮增量。
 * 90% 是软检查点，不是发送准入保证；发送前预算不足须立即救援，
 * 救援失败且原历史仍装不下时须拒发，不得等到软线或静默丢弃历史。
 */

import { estimateTokenCount } from "./tokenUtils";

/** 工具输出上限占窗口的比例。 */
const TOOL_OUTPUT_CAP_WINDOW_RATIO = 0.12;
/** 工具输出上限的绝对上下界（tokens，估算口径）。 */
const TOOL_OUTPUT_CAP_MIN_TOKENS = 4_000;
const TOOL_OUTPUT_CAP_MAX_TOKENS = 50_000;

/** 所有窗口共用的软触发线；上下界导出保留兼容。 */
export const COMPRESSION_TRIGGER_RATIO_MAX = 0.9;
export const COMPRESSION_TRIGGER_RATIO_MIN = 0.9;

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** 单条工具输出允许进入对话上下文的最大估算 token 数。 */
export const capToolOutputTokens = (contextWindow: number): number =>
  clamp(
    Math.floor(contextWindow * TOOL_OUTPUT_CAP_WINDOW_RATIO),
    TOOL_OUTPUT_CAP_MIN_TOKENS,
    TOOL_OUTPUT_CAP_MAX_TOKENS,
  );

/** 真实占用与无遥测时估算占用共用 90% 软线，与窗口大小无关。 */
export const resolveCompressionTriggerRatio = (
  _contextWindow: number,
): number => COMPRESSION_TRIGGER_RATIO_MAX;

/**
 * 截断超上限的工具输出：保留头尾、中间替换为标记，结果按 token 硬封顶。
 *
 * 头 60% / 尾 40%：头部通常含工具输出的结构信息（文件头、命令开头），
 * 尾部通常含结论（测试汇总、错误尾部）。
 *
 * 截断预算必须用 estimateTokenCount 二分逼近，不能按固定 char/token 换算：
 * CJK 文本密度可达 ~1.5 tok/char（tokenUtils.ts），固定 4 char/token 会把
 * 一条 60k 中文字符（≈90k tokens）原样放行，不变式直接失效。
 */
export const truncateToolOutputForContext = (
  text: string,
  contextWindow: number,
): string => {
  if (!text) return text;
  const capTokens = capToolOutputTokens(contextWindow);
  if (estimateTokenCount(text) <= capTokens) return text;

  const build = (keepChars: number): string => {
    const headChars = Math.floor(keepChars * 0.6);
    const tailChars = keepChars - headChars;
    const omittedTokens = estimateTokenCount(
      text.slice(headChars, text.length - tailChars),
    );
    return (
      text.slice(0, headChars) +
      `\n...[tool output truncated: ~${omittedTokens} tokens omitted]...\n` +
      text.slice(text.length - tailChars)
    );
  };

  // 二分最大保留字符数：估算为 O(n)，~log2(n) 次，截断是一次性事件，可接受。
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokenCount(build(mid)) <= capTokens) lo = mid;
    else hi = mid - 1;
  }
  return build(lo);
};
