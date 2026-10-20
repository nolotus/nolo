// create/space/contentSearchQuery.ts
// SpaceContent 里「搜索词 ⇄ URL ?q=」同步的纯逻辑。
// 抽出来是为了能直接做行为单测：页面本体依赖 store / identity / i18n / leveldb
// 全链路，为一条查询参数规则拉起整条链路不划算。
//
// 约定：`current` 一律是「当前 URL 里的 q 值」（searchParams.get("q") ?? ""），
// 不带前导 "?"；两侧都按 trim 后的形态比较。

export const CONTENT_QUERY_SEARCH_PARAM = "q";

/** 规范化目标搜索词：只 trim；空串表示「URL 不带 q」。 */
export function resolveContentQuery(raw: string): string {
  return raw.trim();
}

/**
 * 目标 q 是否与 URL 里的 q 不同——只有不同才应该写 URL。
 * 相同还写会多一轮「写了又回来」的导航，并和同页其它写入者抢基底。
 */
export function shouldSyncContentQuery(next: string, current: string): boolean {
  return resolveContentQuery(next) !== resolveContentQuery(current);
}

/**
 * 在既有 params 上改写 q：只增删 q，其它键（types / view 等）原样保留。
 * next 规范化后为空串时删除 q。
 */
export function applyContentQuery(params: URLSearchParams, next: string): void {
  const query = resolveContentQuery(next);
  if (query) {
    params.set(CONTENT_QUERY_SEARCH_PARAM, query);
  } else {
    params.delete(CONTENT_QUERY_SEARCH_PARAM);
  }
}
