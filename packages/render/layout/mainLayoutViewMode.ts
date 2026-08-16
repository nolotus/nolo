import { MY_ROUTE_SECTIONS } from "app/constants/mySections";
import type { ContentKeyType } from "./topbarUtils";
import { getContentKeyType } from "./topbarUtils";

const allViewRoutePaths = new Set([
  "/",
  ...MY_ROUTE_SECTIONS.map((section) => section.path),
]);

const SPACE_ROUTE_PATTERN = /^\/space\/([^/]+)(?:\/(.*))?\/?$/;

export interface SpaceRouteContext {
  isSpaceRoute: boolean;
  isSpaceRootRoute: boolean;
  spaceId: string | null;
  routeSection:
    | "root"
    | "files"
    | "ai"
    | "members"
    | "settings"
    | "content"
    | null;
}

export type TopBarMode =
  | "space-root"
  | "space-files"
  | "space-ai"
  | "space-members"
  | "space-settings"
  | "content"
  | "global-nav"
  | "other";

export interface RouteDescriptor {
  routeKind: "space" | "global" | "unknown";
  spaceId: string | null;
  routeSection: SpaceRouteContext["routeSection"];
  contentKey: string | null;
  contentKeyType: ContentKeyType;
  topbarMode: TopBarMode;
}

export function isAllViewRoutePath(pathname: string): boolean {
  return allViewRoutePaths.has(pathname);
}

export function getSpaceRouteContext(pathname: string): SpaceRouteContext {
  const match = pathname.match(SPACE_ROUTE_PATTERN);
  if (!match) {
    return {
      isSpaceRoute: false,
      isSpaceRootRoute: false,
      spaceId: null,
      routeSection: null,
    };
  }

  const [, encodedSpaceId, descendantPath] = match;

  let spaceId = encodedSpaceId;
  try {
    spaceId = decodeURIComponent(encodedSpaceId);
  } catch {
    // Keep the encoded segment so route classification never fails on bad input.
  }

  let routeSection: SpaceRouteContext["routeSection"] = "root";
  if (descendantPath) {
    const sectionSegment = descendantPath.split("/")[0];
    if (["files", "ai", "members", "settings"].includes(sectionSegment)) {
      routeSection = sectionSegment as any;
    } else {
      routeSection = "content";
    }
  }

  return {
    isSpaceRoute: true,
    isSpaceRootRoute: !descendantPath,
    spaceId,
    routeSection,
  };
}

export function getRouteDescriptor(pathname: string): RouteDescriptor {
  const spaceRoute = getSpaceRouteContext(pathname);

  // 1. Global routes that should keep the normal topbar navigation.
  if (allViewRoutePaths.has(pathname) || pathname === "/explore" || pathname === "/pricing") {
    return {
      routeKind: "global",
      spaceId: null,
      routeSection: null,
      contentKey: null,
      contentKeyType: "unknown",
      topbarMode: "global-nav",
    };
  }

  // 2. Space routes: root/sub-section/content are the shell source of truth.
  if (spaceRoute.isSpaceRoute) {
    const section = spaceRoute.routeSection;
    if (section === "content") {
      const match = pathname.match(SPACE_ROUTE_PATTERN);
      const descendantPath = match ? match[2] : null;
      const contentKey = descendantPath || null;
      const contentKeyType = getContentKeyType(contentKey ?? undefined);
      return {
        routeKind: "space",
        spaceId: spaceRoute.spaceId,
        routeSection: "content",
        contentKey,
        contentKeyType,
        topbarMode: "content",
      };
    } else {
      let topbarMode: TopBarMode = "space-root";
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
        topbarMode,
      };
    }
  }

  // 3. Top-level content routes, matching PageLoader's pageKey dispatch.
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
        topbarMode: "content",
      };
    }
  }

  return {
    routeKind: "unknown",
    spaceId: null,
    routeSection: null,
    contentKey: null,
    contentKeyType: "unknown",
    topbarMode: "other",
  };
}

export function isSpaceRoutePath(pathname: string): boolean {
  return getSpaceRouteContext(pathname).isSpaceRoute;
}

export function shouldForceCategoriesViewMode(
  pathname: string,
  viewMode: string
): boolean {
  return isSpaceRoutePath(pathname) && viewMode !== "categories";
}
