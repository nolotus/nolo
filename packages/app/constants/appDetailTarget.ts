import {
  APP_DETAIL_SEARCH_PARAM_KEYS,
  APP_SERVER_SEARCH_PARAM,
  buildAppDetailPath,
  readAppServerOrigin,
} from "./appEditor";

const toSearchParams = (
  search: URLSearchParams | string | null | undefined
): URLSearchParams => {
  if (!search) return new URLSearchParams();
  if (search instanceof URLSearchParams) return search;
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
};

/**
 * 从来源 URL 的查询参数里挑出**允许留在 app 详情页 URL 上**的那些（白名单见
 * APP_DETAIL_SEARCH_PARAM_KEYS）。
 *
 * 来源页参数（空间内容页的 types、列表页的 view/q …）不属于详情页状态，这里
 * 一律丢弃；否则详情页的 URL 规范化会与来源页互相改写，形成地址栏参数来回
 * 变动、页面不跳转的回环。
 */
export const pickAppDetailSearchParams = (
  search: URLSearchParams | string | null | undefined
): URLSearchParams => {
  const source = toSearchParams(search);
  const picked = new URLSearchParams();
  for (const key of APP_DETAIL_SEARCH_PARAM_KEYS) {
    const value = source.get(key);
    if (value === null) continue;
    picked.set(key, value);
  }
  return picked;
};

/**
 * 产出 app 详情页应当使用的 URL（path + 白名单内查询参数 + hash）。
 *
 * 幂等：把产出 URL 的查询参数再喂回来，结果仍是同一个 URL——这是详情页
 * 规范化 effect 不产生回环的前提。
 */
export const buildAppDetailTargetPath = (
  appKey: string,
  sourceSearch?: URLSearchParams | string | null,
  spaceId?: string | null,
  serverOrigin?: string | null
): string => {
  const base = buildAppDetailPath(
    appKey,
    spaceId,
    serverOrigin ?? readAppServerOrigin(sourceSearch)
  );
  const url = new URL(base, "https://nolo.local");
  for (const [key, value] of pickAppDetailSearchParams(sourceSearch).entries()) {
    // server 已由 buildAppDetailPath 以归一化形式写入，别用来源页的原值盖回去
    // （否则同一个 origin 会有多种写法，仍可能被反复重写）。
    if (key === APP_SERVER_SEARCH_PARAM) continue;
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

const parseTarget = (target: string) => {
  const url = new URL(target, "https://nolo.local");
  return {
    pathname: url.pathname,
    hash: url.hash,
    // 查询参数按「key=value」排序后比较：参数顺序不同不代表 URL 需要重写。
    search: [...url.searchParams.entries()].map(([key, value]) => `${key}=${value}`).sort(),
  };
};

/** 两个 URL 是否等价（pathname / hash / 查询参数集合相同，忽略参数顺序）。 */
export const isSameAppDetailTarget = (left: string, right: string): boolean => {
  const a = parseTarget(left);
  const b = parseTarget(right);
  return (
    a.pathname === b.pathname &&
    a.hash === b.hash &&
    a.search.length === b.search.length &&
    a.search.every((entry, index) => entry === b.search[index])
  );
};
