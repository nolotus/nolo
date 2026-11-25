import { NOT_FOUND_ROUTE_ID, PAGE_KEY_ROUTE_ID } from "app/constants/routePaths";
import type { RouteMatch, RouteObject } from "./matchRoutes";

/**
 * 一棵路由树的「未匹配路径」该怎么处理。
 *
 * 抽成纯函数是刻意的：这是服务端 HTTP 状态码契约（404 vs 200）的唯一真值，
 * 需要能脱离 SSR 渲染与数据库直接测试。
 */
export interface RouteDisposition {
  /** 渲染 404 页并把 HTTP 状态置为 404。 */
  notFound: boolean;
  /** 命中的是单段对象 key 兜底路由（如 `/some-key`）：私有内容，但无法不查库判断真伪。 */
  keyPage: boolean;
}

const containsNotFoundCatchAll = (routes: RouteObject[]): boolean =>
  routes.some(
    (route) =>
      route.id === NOT_FOUND_ROUTE_ID ||
      (route.children ? containsNotFoundCatchAll(route.children) : false)
  );

/**
 * 路由树里是否注册了 catch-all（id 为 NOT_FOUND_ROUTE_ID）。
 *
 * 这是启用 404 语义的前提：部分路由树没有 catch-all，
 * 它们的未匹配路径必须保持既有行为（200），不能被主站规则误伤。
 */
export const hasNotFoundCatchAll = (routes: RouteObject[]): boolean =>
  containsNotFoundCatchAll(routes);

export const resolveRouteDisposition = (
  routes: RouteObject[],
  matches: RouteMatch[] | null
): RouteDisposition => {
  const catchAllRegistered = hasNotFoundCatchAll(routes);
  const leafId = matches?.[matches.length - 1]?.route.id;

  const notFound =
    catchAllRegistered && (matches === null || leafId === NOT_FOUND_ROUTE_ID);
  const keyPage = !notFound && leafId === PAGE_KEY_ROUTE_ID;

  return { notFound, keyPage };
};
