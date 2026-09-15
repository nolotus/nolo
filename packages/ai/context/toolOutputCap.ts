// ai/context/toolOutputCap.ts

/**
 * 工具输出上下文上限 + 压缩触发线。
 *
 * 两个公式互为基础，必须住在同一个文件里：
 *
 * 1. 单条工具输出硬上限 capToolOutputTokens(window)：
 *    让「单轮工具循环的最大灌水增量」有界。
 * 2. 压缩触发线 resolveCompressionTriggerRatio(window)：
 *    检查点（轮开始 / 轮内 round 之间）要求真实占用低于该线，
 *    余量 = 上限 + 固定余量，保证「检查通过 → 下一次 provider 调用
 *    之前灌进来的内容」永远不会把窗口打爆：
 *
 *      任意一次 provider 调用输入 < triggerRatio + headroom ≤ 1
 *
 * 没有上限，阈值检查在数学上不可靠（一条 cat 大文件就能从 70% 灌到 130%）；
 * 没有阈值检查，上限只能推迟不能阻止 400。
 */

import { estimateTokenCount } from "./tokenUtils";

/** 工具输出上限占窗口的比例。 */
const TOOL_OUTPUT_CAP_WINDOW_RATIO = 0.12;
/** 工具输出上限的绝对上下界（tokens，估算口径）。 */
const TOOL_OUTPUT_CAP_MIN_TOKENS = 4_000;
const TOOL_OUTPUT_CAP_MAX_TOKENS = 50_000;

/**
 * 压缩触发线（真实占用口径）的上下界。
 *
 * 触发不是固定 78%：必须给「下一次 provider 调用之前的最大增量」留余量，
 * 否则检查通过 → 一轮工具输出灌水 → 仍然 400。单轮最大增量有界的前提是
 * 上面的工具输出硬上限，两者配套：
 *   任意一次 provider 调用输入 < triggerRatio + 单轮最大增量 ≤ 窗口。
 */
export const COMPRESSION_TRIGGER_RATIO_MAX = 0.78;
export const COMPRESSION_TRIGGER_RATIO_MIN = 0.5;
// 注：cap/overhead 的绝对下限（各 4k）在 <16k 的窗口上会让 headroom 占比
// 超过 50%，触发线被 MIN clamp 托住、不变式饱和。该量级的模型无法承担
// 工具循环场景，属可接受的边界行为，不额外加复杂度。

/**
 * 除工具输出外一轮还可能新增的内容余量（assistant 正文 + tool_calls 参数
 * + 回合内注入消息）。随窗口等比缩放并带绝对上下界——固定余量在小窗口上
 * 会把整个窗口吃光，不变式 ratio + headroom/window ≤ 1 必须对小窗口成立。
 */
const ROUND_OVERHEAD_WINDOW_RATIO = 0.08;
const ROUND_OVERHEAD_MIN_TOKENS = 4_000;
const ROUND_OVERHEAD_MAX_TOKENS = 24_000;

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** 单条工具输出允许进入对话上下文的最大估算 token 数。 */
export const capToolOutputTokens = (contextWindow: number): number =>
  clamp(
    Math.floor(contextWindow * TOOL_OUTPUT_CAP_WINDOW_RATIO),
    TOOL_OUTPUT_CAP_MIN_TOKENS,
    TOOL_OUTPUT_CAP_MAX_TOKENS,
  );

/**
 * 压缩触发线（真实 input_tokens / contextWindow 比例）。
 * 窗口越大线越高（上限 78%），窗口越小线越低（下限 50%）——小窗口模型
 * 单轮灌水占比大，必须更早压。
 */
export const resolveCompressionTriggerRatio = (
  contextWindow: number,
): number => {
  if (
    typeof contextWindow !== "number" ||
    !Number.isFinite(contextWindow) ||
    contextWindow <= 0
  ) {
    return COMPRESSION_TRIGGER_RATIO_MAX;
  }
  const headroom =
    capToolOutputTokens(contextWindow) +
    clamp(
      Math.floor(contextWindow * ROUND_OVERHEAD_WINDOW_RATIO),
      ROUND_OVERHEAD_MIN_TOKENS,
      ROUND_OVERHEAD_MAX_TOKENS,
    );
  return clamp(
    1 - headroom / contextWindow,
    COMPRESSION_TRIGGER_RATIO_MIN,
    COMPRESSION_TRIGGER_RATIO_MAX,
  );
};

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
