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
 * 侧边栏类型筛选的本地偏好 key：chip（ChatSidebar）写入，列表与 chip 共用同一份读取，
 * 语义是「URL 覆盖本地偏好」（见 resolveEffectiveSidebarType）。
 */
export const SIDEBAR_TYPE_PREFERENCE_STORAGE_KEY = "space-sidebar-type-filter";

/**
 * 读本地偏好；没有有效存储值（首次访问 / 非法值 / SSR / 读写被拒）返回 null。
 * 返回 null 而不是直接给默认值：「首次默认」由各调用方决定——chip 用
 * DEFAULT_SIDEBAR_TYPE_FILTER（all），独立渲染的列表沿用自身的历史默认。
 */
const preferenceKey = (userId: string): string =>
  `${SIDEBAR_TYPE_PREFERENCE_STORAGE_KEY}:user:${encodeURIComponent(userId)}`;

export const readStoredSidebarType = (userId: string | undefined): SidebarTypeFilterId | null => {
  try {
    if (typeof window === "undefined" || !userId) return null;
    const stored = window.localStorage.getItem(preferenceKey(userId));
    return isSidebarTypeFilterId(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const writeStoredSidebarType = (filter: SidebarTypeFilterId, userId: string | undefined): void => {
  try {
    if (typeof window === "undefined" || !userId) return;
    window.localStorage.setItem(preferenceKey(userId), filter);
  } catch {}
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
 * 有效 URL 优先，其次本地偏好（本地偏好本身已回落为首次默认 all）。
 */
export const resolveEffectiveSidebarType = (
  search: string | null | undefined,
  stored: SidebarTypeFilterId,
): SidebarTypeFilterId => resolveSidebarTypeFromSearch(search) ?? stored;
