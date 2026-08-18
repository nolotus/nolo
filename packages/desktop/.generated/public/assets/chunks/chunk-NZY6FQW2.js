import {
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";

// packages/render/layout/deleteBehavior.ts
var ROUTE_SCOPED_DELETE_TYPES = /* @__PURE__ */ new Set([
  "page",
  "dialog",
  "file",
  "image",
  "meta"
]);
var resolveDeleteSpaceId = ({
  contentKeyType,
  docSpaceId,
  entitySpaceId,
  routeSpaceId,
  currentSpaceId
}) => {
  const persistedSpaceId = entitySpaceId || docSpaceId || void 0;
  if (persistedSpaceId) return persistedSpaceId;
  if (routeSpaceId && ROUTE_SCOPED_DELETE_TYPES.has(contentKeyType)) {
    return routeSpaceId;
  }
  return void 0;
};
var resolveDeleteSuccessPath = ({
  contentKey,
  routeSpaceId
}) => {
  if (!contentKey) return void 0;
  if (routeSpaceId) {
    return `/space/${normalizeSpaceId(routeSpaceId)}`;
  }
  if (contentKey.startsWith("agent-pub-")) {
    return "/explore";
  }
  return void 0;
};
var isViewingDeletedContent = (pathname, contentKey) => {
  if (!pathname || !contentKey) return false;
  return pathname.includes(`/${contentKey}`) || pathname.endsWith(contentKey) || pathname.includes(contentKey);
};

export {
  resolveDeleteSpaceId,
  resolveDeleteSuccessPath,
  isViewingDeletedContent
};
