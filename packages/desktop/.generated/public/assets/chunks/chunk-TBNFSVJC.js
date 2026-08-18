import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";

// packages/create/space/spaceKeys.ts
var SEPARATOR = "-";
var SPACE_PREFIX = "space";
var SPACE_PREFIX_WITH_SEPARATOR = `${SPACE_PREFIX}${SEPARATOR}`;
var normalizeSpaceId = (spaceId) => {
  if (!spaceId) return spaceId;
  return spaceId.startsWith(SPACE_PREFIX_WITH_SEPARATOR) ? spaceId.slice(SPACE_PREFIX_WITH_SEPARATOR.length) : spaceId;
};
var createSpaceKey = {
  // 空间基础信息的key
  space: (spaceId) => {
    return [SPACE_PREFIX, normalizeSpaceId(spaceId)].join(SEPARATOR);
  },
  // 空间成员的key
  member: (userId, spaceId) => {
    return [SPACE_PREFIX, "member", userId, normalizeSpaceId(spaceId)].join(
      SEPARATOR
    );
  },
  // 查询用户所在的所有空间的范围
  memberRange: (userId) => {
    return {
      start: [SPACE_PREFIX, "member", userId, ""].join(SEPARATOR),
      end: [SPACE_PREFIX, "member", userId, "\uFFFF"].join(SEPARATOR)
    };
  },
  /**
   * 预留：未来若出现“按用户、按空间、且必须跨设备同步”的空间级偏好，
   * 统一使用这个 key family。当前产品主链不要依赖它。
   */
  setting: (userId, spaceId) => {
    return [SPACE_PREFIX, "setting", userId, normalizeSpaceId(spaceId)].join(
      SEPARATOR
    );
  },
  /**
   * 预留：未来如确实需要批量读取空间级远端偏好，再使用这个范围。
   */
  settingRange: (userId) => {
    return {
      start: [SPACE_PREFIX, "setting", userId, ""].join(SEPARATOR),
      end: [SPACE_PREFIX, "setting", userId, "\uFFFF"].join(SEPARATOR)
    };
  },
  // 从成员key中提取空间key
  // 成员 key 格式: space-member-{userId}-{spaceId}
  // userId 是单段（无连字符），spaceId 是 ULID（无连字符）
  spaceFromMember: (memberKey) => {
    const parts = memberKey.split(SEPARATOR);
    if (parts.length < 4) return "";
    const spaceId = parts[parts.length - 1];
    return [SPACE_PREFIX, spaceId].join(SEPARATOR);
  },
  // 从成员key中提取空间ID
  spaceIdFromMember: (memberKey) => {
    const parts = memberKey.split(SEPARATOR);
    return parts.length >= 4 ? parts[parts.length - 1] : "";
  }
};

// packages/core/builtinAgents.ts
var BUILTIN_NOLO_AGENT_KEY = "agent-pub-01NOLOAPPBLD000000019KCKT0";
var BUILTIN_APP_BUILDER_AGENT_KEY = "agent-pub-01APPBUILDER00000001YAII3I";
var BUILTIN_ECOMMERCE_AGENT_KEY = "agent-pub-01ECOMMERCEAG00000001PYQ2J";
var BUILTIN_AGENT_CREATOR_AGENT_KEY = "agent-pub-01NOLOAGENTCRT000000000001";
var BUILTIN_FEEDBACK_AGENT_KEY = "agent-pub-01NOLOFEEDBACKA000000000R2";
var BUILTIN_CHROME_OPERATOR_AGENT_KEY = "agent-pub-01CHROMEOPR000000000001";
var PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID = "01DSV4FLASHPB00000000JFPFD";
var PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY = `agent-pub-${PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID}`;
var PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID = "01DSV4PROPUB00000001A9OLZN";
var PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY = `agent-pub-${PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID}`;
var PUBLIC_GLM_52_AGENT_ID = "01GLM52DIPB00000000I3E2MY";
var PUBLIC_GLM_52_AGENT_KEY = `agent-pub-${PUBLIC_GLM_52_AGENT_ID}`;
var PUBLIC_KIMI_K26_IMAGE_AGENT_ID = "01KIMIK26OLLAMA0000000001";
var PUBLIC_KIMI_K26_IMAGE_AGENT_KEY = `agent-pub-${PUBLIC_KIMI_K26_IMAGE_AGENT_ID}`;
var BUILTIN_PLATFORM_AGENT_KEYS = [
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_ECOMMERCE_AGENT_KEY,
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
  BUILTIN_CHROME_OPERATOR_AGENT_KEY
];
var BUILTIN_PLATFORM_AGENT_KEY_SET = new Set(BUILTIN_PLATFORM_AGENT_KEYS);

// packages/app/constants/appEditor.ts
var APP_BUILDER_PUBLIC_AGENT_KEY = BUILTIN_APP_BUILDER_AGENT_KEY;
var APP_SERVER_SEARCH_PARAM = "server";
var APP_EDIT_MODE_SEARCH_PARAM = "mode";
var normalizeAppServerOrigin = (serverOrigin) => {
  const normalized = normalizeServerOrigin(serverOrigin);
  return normalized || null;
};
var withAppQuery = (path, query, serverOrigin) => {
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
var readAppServerOrigin = (search) => {
  if (!search) return void 0;
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  return normalizeAppServerOrigin(params.get(APP_SERVER_SEARCH_PARAM)) ?? void 0;
};
var buildAppBasePath = (appKey, spaceId) => {
  if (!spaceId) return `/${appKey}`;
  return `/space/${normalizeSpaceId(spaceId)}/${appKey}`;
};
var buildAppDetailPath = (appKey, spaceId, serverOrigin) => withAppQuery(buildAppBasePath(appKey, spaceId), {}, serverOrigin);
var buildAppEditorPath = (appKey, spaceId, serverOrigin) => withAppQuery(
  buildAppBasePath(appKey, spaceId),
  {
    edit: "true"
  },
  serverOrigin
);
var buildAppChatEditorPath = (appKey, spaceId, serverOrigin) => withAppQuery(
  buildAppBasePath(appKey, spaceId),
  {
    edit: "true",
    [APP_EDIT_MODE_SEARCH_PARAM]: "chat"
  },
  serverOrigin
);
var buildAppCodeEditorPath = (appKey, spaceId, serverOrigin) => withAppQuery(
  buildAppBasePath(appKey, spaceId),
  {
    edit: "true",
    [APP_EDIT_MODE_SEARCH_PARAM]: "code"
  },
  serverOrigin
);
var buildAppAssistantSidebarId = (appKey) => `objectAssistant:app:${appKey}`;

// packages/create/space/contentKeyUtils.ts
var ROUTABLE_KEY_PREFIXES = [
  "dialog-",
  "page-",
  "meta-",
  "file-",
  "image-",
  "agent-",
  "cybot-",
  "task-"
];
var hasRoutablePrefix = (contentKey) => ROUTABLE_KEY_PREFIXES.some((prefix) => contentKey.startsWith(prefix));
var isAppContentKey = (contentKey) => typeof contentKey === "string" && contentKey.startsWith("app-");
var normalizeAppRouteId = (contentKey) => isAppContentKey(contentKey) ? contentKey : `app-${contentKey}`;
var resolveRoutableContentKey = (contentKey, type, userId) => {
  if (!contentKey) return contentKey;
  const normalizedType = type?.toLowerCase();
  if (normalizedType === "app" /* APP */ || normalizedType === "app") {
    return normalizeAppRouteId(contentKey);
  }
  if (hasRoutablePrefix(contentKey)) return contentKey;
  if (!userId) return contentKey;
  if (normalizedType === "dialog" /* DIALOG */ || normalizedType === "dialog" /* DIALOG */) {
    return `${"dialog" /* DIALOG */}-${userId}-${contentKey}`;
  }
  if (normalizedType === "page" /* DOC */ || normalizedType === "page" /* DOC */) {
    return `${"page" /* DOC */}-${userId}-${contentKey}`;
  }
  if (normalizedType === "file" /* FILE */ || normalizedType === "file" /* FILE */ || normalizedType === "image" /* IMAGE */ || normalizedType === "image" /* IMAGE */) {
    return `file-${userId}-${contentKey}`;
  }
  return contentKey;
};
var buildScopedPagePath = (pageKey, spaceId) => {
  if (!spaceId) return `/${pageKey}`;
  return `/space/${normalizeSpaceId(spaceId)}/${pageKey}`;
};
var buildRoutableContentPath = ({
  contentKey,
  type,
  userId,
  spaceId
}) => buildScopedPagePath(
  resolveRoutableContentKey(contentKey, type, userId),
  spaceId
);
var CONTENT_ROUTE_TRAILING_SEGMENTS = /* @__PURE__ */ new Set(["inbox"]);
var extractActiveRouteKey = (currentPath) => {
  if (!currentPath) return void 0;
  const pathname = currentPath.split("?")[0].split("#")[0];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return void 0;
  let last = segments[segments.length - 1];
  if (CONTENT_ROUTE_TRAILING_SEGMENTS.has(last) && segments.length >= 2) {
    last = segments[segments.length - 2];
  }
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};
var isRoutableContentActive = ({
  contentKey,
  type,
  userId,
  spaceId,
  activePageKey,
  currentPath
}) => {
  const routeContentKey = resolveRoutableContentKey(
    contentKey,
    type,
    userId ?? void 0
  );
  if (type?.toLowerCase() === "app" /* APP */ || isAppContentKey(contentKey)) {
    const appRouteId = normalizeAppRouteId(contentKey);
    return currentPath === buildAppDetailPath(appRouteId, spaceId) || currentPath === buildAppEditorPath(appRouteId, spaceId);
  }
  if (activePageKey === contentKey || activePageKey === routeContentKey) {
    return true;
  }
  const activeKeyFromPath = extractActiveRouteKey(currentPath);
  return activeKeyFromPath === contentKey || activeKeyFromPath === routeContentKey;
};

// packages/chat/dialog/dialogUrl.ts
var buildDialogUrl = (dialogKey, spaceId) => buildScopedPagePath(dialogKey, spaceId);

export {
  BUILTIN_NOLO_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY,
  PUBLIC_GLM_52_AGENT_KEY,
  PUBLIC_KIMI_K26_IMAGE_AGENT_KEY,
  BUILTIN_PLATFORM_AGENT_KEYS,
  normalizeSpaceId,
  createSpaceKey,
  APP_BUILDER_PUBLIC_AGENT_KEY,
  APP_EDIT_MODE_SEARCH_PARAM,
  readAppServerOrigin,
  buildAppDetailPath,
  buildAppEditorPath,
  buildAppChatEditorPath,
  buildAppCodeEditorPath,
  buildAppAssistantSidebarId,
  normalizeAppRouteId,
  resolveRoutableContentKey,
  buildScopedPagePath,
  buildRoutableContentPath,
  isRoutableContentActive,
  buildDialogUrl
};
