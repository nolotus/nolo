import { isSidebarTypeFilterId, type SidebarTypeFilterId } from "./SidebarTypeFilter";

/**
 * 侧边栏类型筛选的 URL query 参数名。
 * 选 `sidebarType` 而不是通用 `type`：仓库里 `type` 已被其它 query 语义占用
 * （服务端 mediaJobs / versionHandler 等），通用名容易撞车。
 */
export const SIDEBAR_TYPE_QUERY_KEY = "sidebarType";

const toSearchParams = (search: string | null | undefined): URLSearchParams => {
  if (!search) return new URLSearchParams();
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
};

/**
 * 从 URL query 读侧边栏类型筛选值。
 * 缺失 / 未知 / 空值一律返回 null（视作「URL 没给有效值」），由上层回落到本地偏好。
 */
export const resolveSidebarTypeFromSearch = (
  search: string | null | undefined,
): SidebarTypeFilterId | null => {
  const raw = toSearchParams(search).get(SIDEBAR_TYPE_QUERY_KEY);
  if (raw === null) return null;
  return isSidebarTypeFilterId(raw) ? raw : null;
};

/**
 * 在保留其它 query 参数的前提下写入侧边栏类型筛选值（同名 key 覆盖，不产生重复 key）。
 */
export const applySidebarTypeToParams = (
  params: URLSearchParams,
  filter: SidebarTypeFilterId,
): URLSearchParams => {
  const next = new URLSearchParams(params);
  next.set(SIDEBAR_TYPE_QUERY_KEY, filter);
  return next;
};

/**
 * 有效 URL 优先，其次本地偏好（本地偏好本身已回落为首次默认 agent）。
 */
export const resolveEffectiveSidebarType = (
  search: string | null | undefined,
  stored: SidebarTypeFilterId,
): SidebarTypeFilterId => resolveSidebarTypeFromSearch(search) ?? stored;
