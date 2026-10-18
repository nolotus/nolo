// packages/ai/llm/modelCatalogSort.ts
//
// 价格页/模型目录的「综合排序」纯函数真值（2026-10-18）。
//
// 设计取舍（owner 交给本 Agent 定，口径写在此处，改权重只改这一处）：
// - **综合 = 新发 + 运营置顶 + 价格友好度 + 能力档**。刻意不吃「使用量」：
//   当前没有按模型聚合的可信调用量数据源（token 记录只给管理员报表），
//   编一个假热度比不排序更糟，热度留给运营用 featuredRank 显式表达。
// - 「看价格的人」不被牺牲：价格友好度只占 1.5，且价格列始终可点按升降序排。
// - 新鲜度按 90 天线性半衰，避免老模型被永久压死；权重只决定默认视图，
//   不改变任何计费/能力语义。
//
// 本模块只做「排序与打分」，不读 React、不读 env、不做 I/O，便于单测。

export type CatalogSortMode = "composite" | "newest" | "priceAsc" | "priceDesc";

export const CATALOG_SORT_MODES: readonly CatalogSortMode[] = [
  "composite",
  "newest",
  "priceAsc",
  "priceDesc",
] as const;

/** 综合分权重。调整这里即调整产品口径。 */
export const CATALOG_COMPOSITE_WEIGHTS = {
  freshness: 3,
  featured: 2.5,
  priceFriendliness: 1.5,
  capability: 0.5,
} as const;

/** 新鲜度半衰期：90 天。 */
export const FRESHNESS_HALF_LIFE_DAYS = 90;

/** 价格友好度的归一化上限（输出价 credits / 1M）：>= 该值记 0 分。 */
export const PRICE_FRIENDLINESS_CEILING = 400;

/** 排序所需的最小模型形状（与 ALL_MODELS 条目兼容，字段都可选）。 */
export interface CatalogSortableModel {
  name: string;
  price?: { input?: number; output?: number } | null;
  /** 上架/发布时间的毫秒时间戳；缺省视为「未知」（新鲜度 0）。 */
  releasedAtMs?: number | null;
  /** 运营置顶权重（0/1/2，越大越靠前）；缺省 0。 */
  featuredRank?: number | null;
  /** 能力档（0..1，可由 modelAbility/tier 推导）；缺省 0.5。 */
  capabilityScore?: number | null;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 新鲜度：30 天内 1.0，按 FRESHNESS_HALF_LIFE_DAYS 线性降到 0。 */
export function freshnessScore(releasedAtMs: number | null | undefined, nowMs: number): number {
  if (!releasedAtMs || !Number.isFinite(releasedAtMs) || releasedAtMs <= 0) return 0;
  const ageDays = Math.max(0, (nowMs - releasedAtMs) / 86_400_000);
  if (ageDays <= 30) return 1;
  return clamp01(1 - (ageDays - 30) / (FRESHNESS_HALF_LIFE_DAYS - 30));
}

/** 价格友好度：输出价越低越高；缺价视为不利（0）。 */
export function priceFriendlinessScore(output: number | null | undefined): number {
  if (typeof output !== "number" || !Number.isFinite(output) || output < 0) return 0;
  return clamp01(1 - output / PRICE_FRIENDLINESS_CEILING);
}

/** 综合分。同分时调用方按输出价升序兜底（便宜优先）。 */
export function catalogCompositeScore(
  model: CatalogSortableModel,
  nowMs: number
): number {
  const w = CATALOG_COMPOSITE_WEIGHTS;
  const featured = Math.min(2, Math.max(0, model.featuredRank ?? 0)) / 2;
  const capability = clamp01(model.capabilityScore ?? 0.5);
  return (
    freshnessScore(model.releasedAtMs, nowMs) * w.freshness +
    featured * w.featured +
    priceFriendlinessScore(model.price?.output) * w.priceFriendliness +
    capability * w.capability
  );
}

const outputNum = (m: CatalogSortableModel) =>
  typeof m.price?.output === "number" && Number.isFinite(m.price.output)
    ? m.price.output
    : Number.POSITIVE_INFINITY;

const byName = (a: CatalogSortableModel, b: CatalogSortableModel) =>
  String(a.name).localeCompare(String(b.name));

/** 稳定排序：返回新数组，不修改入参。 */
export function sortCatalogModels<T extends CatalogSortableModel>(
  models: readonly T[],
  mode: CatalogSortMode,
  nowMs: number = Date.now()
): T[] {
  const rows = [...models];
  switch (mode) {
    case "newest":
      rows.sort((a, b) => {
        const d = (b.releasedAtMs ?? 0) - (a.releasedAtMs ?? 0);
        return d !== 0 ? d : outputNum(a) - outputNum(b) || byName(a, b);
      });
      return rows;
    case "priceAsc":
      rows.sort((a, b) => outputNum(a) - outputNum(b) || byName(a, b));
      return rows;
    case "priceDesc":
      // 缺价条目不参与「最贵优先」：显式压到末尾，否则 Infinity 会在降序里
      // 反而排到最前（2026-10-18 由数据层 review 发现）。
      rows.sort((a, b) => {
        const aKnown = Number.isFinite(a.price?.output) ? 0 : 1;
        const bKnown = Number.isFinite(b.price?.output) ? 0 : 1;
        if (aKnown !== bKnown) return aKnown - bKnown;
        return outputNum(b) - outputNum(a) || byName(a, b);
      });
      return rows;
    case "composite":
    default: {
      const score = new Map<string, number>();
      for (const m of rows) score.set(m.name, catalogCompositeScore(m, nowMs));
      rows.sort((a, b) => {
        const d = (score.get(b.name) ?? 0) - (score.get(a.name) ?? 0);
        return d !== 0 ? d : outputNum(a) - outputNum(b) || byName(a, b);
      });
      return rows;
    }
  }
}
