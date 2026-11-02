/**
 * Run 级缓存命中汇总：把一轮 agent run 里各次 provider 调用的缓存读数
 * **只读地**汇总成三个字段，供 run 结果文件（`<runId>.result.md` 的
 * front matter）使用。
 *
 * 为什么需要：usage（含 cached_tokens）原先只写进 LevelDB 的 token 记录，
 * agent run 结束时不带任何缓存信息——于是「复用 subagent / 复用长前缀到底
 * 省了多少」只能事后翻库，配置改动与档位切换没有即时反馈。
 *
 * 边界（与既有记账逻辑无关）：
 * - 不参与计费/记账，不写 token 记录，不改 normalizeUsage；
 * - 输入取自 localLoop 透传的 usageRecords（每次 provider 调用的**原始**
 *   usage），因此与落库的逐条 token 记录同源、可对账；
 * - `cached_tokens` 三态：`number` = provider 报的命中量；`0` = provider
 *   明确报了「命中 0」；`null` = 未知（provider 未提供任何 cached 字段）。
 */
import { readCacheReadInputTokensOrNull } from "./cacheTokenFields";

/**
 * 汇总结果的字段口径（写进 run 结果 front matter 时逐字展开）：
 *
 * - `input_tokens`：本 run 各次 provider 调用输入 token 之和（与 token 记录
 *   逐条相加同口径，含命中缓存的部分；不是「最后一次调用的上下文占用」）。
 * - `cached_tokens`：其中命中缓存、被复用的部分。`null` = 未知（有调用没报）。
 * - `cache_hit_ratio`：派生的 `cached_tokens / input_tokens`，保留 4 位小数。
 *   未知传播（cached 为 null 时 ratio 也是 null）；input 为 0 时固定 `0`，
 *   绝不产出 NaN / Infinity。
 */
export type CacheRunUsageSummary = {
  /** 输入 token 总量（含命中部分）。 */
  input_tokens: number;
  /** 命中缓存的输入 token 量；`null` = 未知（provider 未给 cached 字段）。 */
  cached_tokens: number | null;
  /** `cached_tokens / input_tokens`（4 位小数）；`null` = 未知，input=0 → 0。 */
  cache_hit_ratio: number | null;
};

/** usageRecords 条目的结构（只取 usage 一个字段，避免与 hostAdapter 耦合）。 */
export type CacheUsageRecordLike = { usage?: unknown };

const finiteCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined;

const isUsageObject = (usage: unknown): usage is Record<string, unknown> =>
  Boolean(usage) && typeof usage === "object";

/** input token：`input_tokens` 优先，回退 Chat Completions 的 `prompt_tokens`。 */
const readInputTokens = (usage: Record<string, unknown>): number =>
  finiteCount(usage.input_tokens) ?? finiteCount(usage.prompt_tokens) ?? 0;

/**
 * 命中率派生。三条硬约束（都有对应单测）：
 * - `cached === null` → `null`：分子未知时不该编一个 0 出来；
 * - `input <= 0` → `0`：0/0 是 NaN，NaN 进 YAML 就是垃圾数据；
 * - 其余按 `cached / input`，四舍五入到 4 位小数（与 localLoop llm-end 事件
 *   的 hitRatio 同一精度，两处读数可对照）。
 */
export const computeCacheHitRatio = (
  inputTokens: number,
  cachedTokens: number | null,
): number | null => {
  if (cachedTokens === null) return null;
  if (!Number.isFinite(inputTokens) || inputTokens <= 0) return 0;
  return Math.round((cachedTokens / inputTokens) * 10000) / 10000;
};

const withRatio = (
  inputTokens: number,
  cachedTokens: number | null,
): CacheRunUsageSummary => ({
  input_tokens: inputTokens,
  cached_tokens: cachedTokens,
  cache_hit_ratio: computeCacheHitRatio(inputTokens, cachedTokens),
});

/**
 * 单次 provider 调用的 usage → 汇总片段。空对象/非对象返回 `undefined`
 * （「这次调用没报 usage」，与「报了但命中 0」是两件事）。
 */
export const summarizeCacheUsage = (
  usage: unknown,
): CacheRunUsageSummary | undefined => {
  if (!isUsageObject(usage)) return undefined;
  if (Object.keys(usage).length === 0) return undefined;
  return withRatio(readInputTokens(usage), readCacheReadInputTokensOrNull(usage));
};

/**
 * 一轮 turn 的逐次调用记录 → turn 级汇总（各次调用相加）。
 *
 * 「任一条未知 → 整体未知」是有意的：拿 20 次调用里 19 次的命中量算出一个
 * 比率，是个看起来精确、实际偏低的假数字，比 null 更能误导人。同一轮里
 * 各次调用通常走同一个 provider，所以这个保守取舍几乎不会损失信息。
 */
export const summarizeCacheUsageRecords = (
  records: readonly CacheUsageRecordLike[] | undefined | null,
): CacheRunUsageSummary | undefined => {
  if (!records || records.length === 0) return undefined;
  let inputTokens = 0;
  let cachedTokens: number | null = 0;
  let sawUsage = false;
  for (const record of records) {
    const summary = summarizeCacheUsage(record?.usage);
    if (!summary) continue;
    sawUsage = true;
    inputTokens += summary.input_tokens;
    cachedTokens =
      cachedTokens === null || summary.cached_tokens === null
        ? null
        : cachedTokens + summary.cached_tokens;
  }
  if (!sawUsage) return undefined;
  return withRatio(inputTokens, cachedTokens);
};

/**
 * 跨 turn 合并（quota fallback 轮、队列 drain 轮）。
 *
 * 与 run 级积分累计（agentRunCommand 的 runCreditsTotal）同一必要性：drain
 * 分支会整体替换 result，只看最终那一轮就少记前面的调用。合并规则与逐次
 * 调用相加一致：token 相加，任一侧未知则整体未知。
 */
export const mergeCacheUsageSummaries = (
  left: CacheRunUsageSummary | undefined,
  right: CacheRunUsageSummary | undefined,
): CacheRunUsageSummary | undefined => {
  if (!left) return right;
  if (!right) return left;
  const inputTokens = left.input_tokens + right.input_tokens;
  const cachedTokens =
    left.cached_tokens === null || right.cached_tokens === null
      ? null
      : left.cached_tokens + right.cached_tokens;
  return withRatio(inputTokens, cachedTokens);
};
