import { normalizeSpaceId } from "create/space/spaceKeys";
import { BUILTIN_APP_BUILDER_AGENT_KEY } from "core/builtinAgents";
import { normalizeServerOrigin } from "core/serverOrigin";

export const APP_BUILDER_PUBLIC_AGENT_KEY = BUILTIN_APP_BUILDER_AGENT_KEY;

export const APP_SERVER_SEARCH_PARAM = "server";
export const APP_EDIT_SEARCH_PARAM = "edit";
export const APP_EDIT_MODE_SEARCH_PARAM = "mode";
/** 编辑器左侧栏状态，读取方见 packages/app/pages/AppEditorPage.tsx */
export const APP_EDITOR_SIDEBAR_SEARCH_PARAM = "sidebar";
/** 编辑器标签页状态，读取方见 packages/app/pages/AppEditorPage.tsx */
export const APP_EDITOR_TAB_SEARCH_PARAM = "tab";

/**
 * app 页面（详情页 / 编辑器）URL 上允许存在的查询参数白名单。
 *
 * 只收「这个 app 页面自己的状态」：
 * - server：从哪个 server 读这个 app（readAppServerOrigin 读取）
 * - edit / mode：PageLoader 与 AppEditorPage 据此决定是否进编辑器、进哪个模式
 * - sidebar / tab：编辑器内的面板状态
 *
 * 来源页的参数（空间内容页的 types、列表页的 view/q 等）不属于详情页状态，
 * 若被原样抄进详情页 URL，会出现「读 URL → 写 URL → 参数又变」的规范化回环
 * （见 packages/app/pages/AppDetailPage.tsx 的 URL 规范化 effect）。
 */
export const APP_DETAIL_SEARCH_PARAM_KEYS = [
  APP_SERVER_SEARCH_PARAM,
  APP_EDIT_SEARCH_PARAM,
  APP_EDIT_MODE_SEARCH_PARAM,
  APP_EDITOR_SIDEBAR_SEARCH_PARAM,
  APP_EDITOR_TAB_SEARCH_PARAM,
] as const;

const normalizeAppServerOrigin = (serverOrigin?: string | null): string | null => {
  const normalized = normalizeServerOrigin(serverOrigin);
  return normalized || null;
};

const withAppQuery = (
  path: string,
  query: Record<string, string | undefined>,
  serverOrigin?: string | null
): string => {
  const url = new URL(path, "https://nolo.local");
  for (const [key, value] of Object.entries(query)) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  const normalizedServerOrigin = normalizeAppServerOrigin(serverOrigin);
  if (normalizedServerOrigin) {
    url.searchParams.set(APP_SERVER_SEARCH_PARAM, normalizedServerOrigin);
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

export const readAppServerOrigin = (
  search: URLSearchParams | string | null | undefined
): string | undefined => {
  if (!search) return undefined;
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return normalizeAppServerOrigin(params.get(APP_SERVER_SEARCH_PARAM)) ?? undefined;
};

const buildAppBasePath = (appKey: string, spaceId?: string | null) => {
  if (!spaceId) return `/${appKey}`;
  return `/space/${normalizeSpaceId(spaceId)}/${appKey}`;
};

export const buildAppDetailPath = (
  appKey: string,
  spaceId?: string | null,
  serverOrigin?: string | null
) => withAppQuery(buildAppBasePath(appKey, spaceId), {}, serverOrigin);

export const buildAppEditorPath = (
  appKey: string,
  spaceId?: string | null,
  serverOrigin?: string | null
) =>
  withAppQuery(
    buildAppBasePath(appKey, spaceId),
    {
      [APP_EDIT_SEARCH_PARAM]: "true",
    },
    serverOrigin
  );

export const buildAppChatEditorPath = (
  appKey: string,
  spaceId?: string | null,
  serverOrigin?: string | null
) =>
  withAppQuery(
    buildAppBasePath(appKey, spaceId),
    {
      [APP_EDIT_SEARCH_PARAM]: "true",
      [APP_EDIT_MODE_SEARCH_PARAM]: "chat",
    },
    serverOrigin
  );

export const buildAppCodeEditorPath = (
  appKey: string,
  spaceId?: string | null,
  serverOrigin?: string | null
) =>
  withAppQuery(
    buildAppBasePath(appKey, spaceId),
    {
      [APP_EDIT_SEARCH_PARAM]: "true",
      [APP_EDIT_MODE_SEARCH_PARAM]: "code",
    },
    serverOrigin
  );

export const buildAppAssistantSidebarId = (appKey: string) =>
  `objectAssistant:app:${appKey}`;
