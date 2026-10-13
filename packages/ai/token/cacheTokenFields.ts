/**
 * Provider usage 里「缓存命中/缓存写入」token 的统一读取。
 *
 * 各家 provider 用四种不同字段表达同一件事：
 *   - Anthropic：顶层 cache_read_input_tokens / cache_creation_input_tokens
 *   - DeepSeek：顶层 prompt_cache_hit_tokens / prompt_cache_miss_tokens
 *   - OpenAI Responses：嵌套 input_tokens_details.cached_tokens
 *   - OpenAI/RunInfra chat.completions：嵌套 prompt_tokens_details.cached_tokens
 *
 * 这份判定曾经只活在 normalizeUsage 里（写 token 记录用），而 localLoop 的
 * 每轮累计只认前两种顶层字段——于是「DB 记录里有缓存、本轮记账显示 0」。
 * 抽成单一真相源，任何消费方都不必再各写一遍别名表。
 */

const finiteTokenCount = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.floor(value));
};

const readNested = (value: unknown, path: readonly string[]): number | undefined => {
  let cursor = value;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return finiteTokenCount(cursor);
};

/**
 * 按别名顺序取第一个「有值且非 0」的读数，全都缺失/为 0 时返回 0。
 *
 * 为什么取非 0 而不是第一个有定义的值：这是对「顶层 0 + 嵌套非 0」这种
 * 组合的**防御性**取舍，不是对已观测行为的适配——盘点过当前所有产出这些
 * 字段的位置（anthropicMessagesProvider、geminiNativeShared 仅在 cached>0
 * 时设顶层字段、DeepSeek 只给顶层、OpenAI 两条线只给嵌套），没有任何
 * provider 会同时给出这两个互相矛盾的读数。若将来真出现，取非 0 的那个
 * 比取「碰巧排在前面的 0」更接近真相。别去找一个现在并不存在的 bug 源。
 */
const firstPositive = (
  usage: unknown,
  readers: ReadonlyArray<(usage: unknown) => number | undefined>,
): number => {
  for (const read of readers) {
    const value = read(usage);
    if (value !== undefined && value !== 0) return value;
  }
  return 0;
};

const topLevel =
  (field: string) =>
  (usage: unknown): number | undefined => {
    if (!usage || typeof usage !== "object") return undefined;
    return finiteTokenCount((usage as Record<string, unknown>)[field]);
  };

const nested =
  (path: readonly string[]) =>
  (usage: unknown): number | undefined =>
    readNested(usage, path);

/** 命中缓存被复用的 prompt token 数。 */
export const readCacheReadInputTokens = (usage: unknown): number =>
  firstPositive(usage, [
    topLevel("cache_read_input_tokens"),
    topLevel("prompt_cache_hit_tokens"),
    nested(["input_tokens_details", "cached_tokens"]),
    nested(["prompt_tokens_details", "cached_tokens"]),
  ]);

/** 本次写入缓存（未命中）的 prompt token 数。 */
export const readCacheCreationInputTokens = (usage: unknown): number =>
  firstPositive(usage, [
    topLevel("cache_creation_input_tokens"),
    topLevel("prompt_cache_miss_tokens"),
  ]);
