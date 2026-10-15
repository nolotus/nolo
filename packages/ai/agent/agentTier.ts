/**
 * 默认档位（tier）解析：按模型名推断一个**通用**的弱先验。
 *
 * tier 只是按模型名推断的弱先验，**不代表领域能力**——一个 fast 档模型完全可能
 * 在某个领域比 top 档更胜任，反之亦然。选人应以领域胜任为先（用户点名 > 记忆 >
 * 领域证据），tier 只在缺少领域证据时用来粗估「够不够」。
 *
 * 这是**对所有用户的通用默认值**，不是对某个用户的偏好判断：它只由模型名
 * 字符串决定，不读用户配置、不做 IO、不查经济性快照。
 *
 * 用户可以通过记忆（memory）或当次指令覆盖这个默认值（例如「这次用最强档」
 * /「省点用」）。**覆盖由编排提示词（orchestration / dispatch prompt）负责，
 * 不在本函数里**。
 *
 * unknown 表示未知、**不推断强弱**：既不说它强、也不说它弱，更不冒充 top。
 * 成本上是否保守（例如未知模型不接简单活、或反过来不接关键活）由编排提示词
 * 决定，不由本函数替调用方站队。
 *
 * 下面的关键词表只覆盖常见厂商的档位命名惯例；判不准时返回 unknown。
 */

export type AgentTier = "fast" | "balanced" | "top" | "unknown";

/** 便宜/低延迟档的模型标记。 */
const FAST_MARKERS = new Set(["flash", "mini", "lite", "nano", "haiku", "luna"]);
/** 中档的模型标记。 */
const BALANCED_MARKERS = new Set(["sonnet", "turbo", "plus"]);
/** 顶档的模型标记。 */
const TOP_MARKERS = new Set(["opus", "sol", "pro", "max", "ultra"]);

/**
 * 模型名 → token：按 `-` `.` `_` `/` 与空格切开，小写化。
 * 必须整 token 匹配而不是子串匹配——"promo-model" 的 "promo" 不得被当成
 * "pro"（子串匹配会把促销/预览类模型误判成顶档）。
 */
function tokenizeModel(model: string): string[] {
  return model
    .toLowerCase()
    .split(/[-._/\s]+/)
    .filter(Boolean);
}

/**
 * 命中的标记里优先返回 fast：便宜档的标记是最具体的（它命名的就是变体本身，
 * 如 `gemini-pro-flash`——"pro" 只是系列名，"flash" 才是真正跑的档位），
 * 而 top 档的 "pro"/"max" 常作为后缀修饰词出现。故判定顺序为 fast → balanced
 * → top，"gemini-pro-flash" 归 fast。
 *
 * 未命中任何标记、model 不是字符串、或切不出 token（空串）→ `{ tier: "unknown" }`。
 */
export function resolveDefaultAgentTier(model: unknown): { tier: AgentTier } {
  if (typeof model !== "string") return { tier: "unknown" };

  const tokens = tokenizeModel(model);
  if (tokens.length === 0) return { tier: "unknown" };

  const hits = (markers: Set<string>) => tokens.some((token) => markers.has(token));

  if (hits(FAST_MARKERS)) return { tier: "fast" };
  if (hits(BALANCED_MARKERS)) return { tier: "balanced" };
  if (hits(TOP_MARKERS)) return { tier: "top" };

  return { tier: "unknown" };
}
