import {
  MY_ROUTE_SECTIONS
} from "/public/assets/chunks/chunk-WULKCFMZ.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/layout/topbarUtils.ts
var import_react = __toESM(require_react(), 1);
var getSideChatLabels = (t, type) => {
  switch (type) {
    case "app":
      return {
        open: t("showAppAssistant", "\u6253\u5F00\u5E94\u7528 AI"),
        hide: t("hideAppAssistant", "\u9690\u85CF\u5E94\u7528 AI")
      };
    case "page":
      return {
        open: t("showDocAssistant", "\u6253\u5F00\u6587\u6863 AI"),
        hide: t("hideDocAssistant", "\u9690\u85CF\u6587\u6863 AI")
      };
    case "meta":
      return {
        open: t("showTableAssistant", "\u6253\u5F00\u8868\u683C AI"),
        hide: t("hideTableAssistant", "\u9690\u85CF\u8868\u683C AI")
      };
    case "image":
      return {
        open: t("showImageAssistant", "\u6253\u5F00\u56FE\u7247 AI"),
        hide: t("hideImageAssistant", "\u9690\u85CF\u56FE\u7247 AI")
      };
    case "file":
      return {
        open: t("showFileAssistant", "\u6253\u5F00\u6587\u4EF6 AI"),
        hide: t("hideFileAssistant", "\u9690\u85CF\u6587\u4EF6 AI")
      };
    default:
      return {
        open: t("showAssistant", "\u6253\u5F00\u9875\u9762 AI"),
        hide: t("hideAssistant", "\u9690\u85CF\u9875\u9762 AI")
      };
  }
};
var useIsMac = () => (0, import_react.useMemo)(
  () => typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform),
  []
);
var getContentKeyType = (pageKey, pageType, appKey) => {
  if (appKey) return "app";
  if (!pageKey) return "unknown";
  if (pageType === "image") return "image";
  if (pageType === "file") return "file";
  if (pageKey.startsWith("file")) return "file";
  if (pageKey.startsWith("image")) return "image";
  if (pageKey.startsWith("page")) return "page";
  if (pageKey.startsWith("meta")) return "meta";
  if (pageKey.startsWith("dialog")) return "dialog";
  if (pageKey.startsWith("task")) return "task";
  if (pageKey.startsWith("cybot")) return "agent";
  if (pageKey.startsWith("agent")) return "agent";
  return "other";
};

// packages/render/layout/mainLayoutViewMode.ts
var allViewRoutePaths = /* @__PURE__ */ new Set([
  "/",
  ...MY_ROUTE_SECTIONS.map((section) => section.path)
]);
var SPACE_ROUTE_PATTERN = /^\/space\/([^/]+)(?:\/(.*))?\/?$/;
function isAllViewRoutePath(pathname) {
  return allViewRoutePaths.has(pathname);
}
function getSpaceRouteContext(pathname) {
  const match = pathname.match(SPACE_ROUTE_PATTERN);
  if (!match) {
    return {
      isSpaceRoute: false,
      isSpaceRootRoute: false,
      spaceId: null,
      routeSection: null
    };
  }
  const [, encodedSpaceId, descendantPath] = match;
  let spaceId = encodedSpaceId;
  try {
    spaceId = decodeURIComponent(encodedSpaceId);
  } catch {
  }
  let routeSection = "root";
  if (descendantPath) {
    const sectionSegment = descendantPath.split("/")[0];
    if (["files", "ai", "members", "settings"].includes(sectionSegment)) {
      routeSection = sectionSegment;
    } else {
      routeSection = "content";
    }
  }
  return {
    isSpaceRoute: true,
    isSpaceRootRoute: !descendantPath,
    spaceId,
    routeSection
  };
}
function getRouteDescriptor(pathname) {
  const spaceRoute = getSpaceRouteContext(pathname);
  if (allViewRoutePaths.has(pathname) || pathname === "/explore" || pathname === "/pricing") {
    return {
      routeKind: "global",
      spaceId: null,
      routeSection: null,
      contentKey: null,
      contentKeyType: "unknown",
      topbarMode: "global-nav"
    };
  }
  if (spaceRoute.isSpaceRoute) {
    const section = spaceRoute.routeSection;
    if (section === "content") {
      const match = pathname.match(SPACE_ROUTE_PATTERN);
      const descendantPath = match ? match[2] : null;
      const contentKey = descendantPath || null;
      const contentKeyType = getContentKeyType(contentKey ?? void 0);
      return {
        routeKind: "space",
        spaceId: spaceRoute.spaceId,
        routeSection: "content",
        contentKey,
        contentKeyType,
        topbarMode: "content"
      };
    } else {
      let topbarMode = "space-root";
      if (section === "files") topbarMode = "space-files";
      else if (section === "ai") topbarMode = "space-ai";
      else if (section === "members") topbarMode = "space-members";
      else if (section === "settings") topbarMode = "space-settings";
      return {
        routeKind: "space",
        spaceId: spaceRoute.spaceId,
        routeSection: section,
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode
      };
    }
  }
  const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  if (key) {
    const contentKeyType = getContentKeyType(key);
    if (contentKeyType !== "unknown" && contentKeyType !== "other") {
      return {
        routeKind: "global",
        spaceId: null,
        routeSection: "content",
        contentKey: key,
        contentKeyType,
        topbarMode: "content"
      };
    }
  }
  return {
    routeKind: "unknown",
    spaceId: null,
    routeSection: null,
    contentKey: null,
    contentKeyType: "unknown",
    topbarMode: "other"
  };
}
function isSpaceRoutePath(pathname) {
  return getSpaceRouteContext(pathname).isSpaceRoute;
}
function shouldForceCategoriesViewMode(pathname, viewMode) {
  return isSpaceRoutePath(pathname) && viewMode !== "categories";
}

export {
  getSideChatLabels,
  useIsMac,
  isAllViewRoutePath,
  getSpaceRouteContext,
  getRouteDescriptor,
  isSpaceRoutePath,
  shouldForceCategoriesViewMode
};
