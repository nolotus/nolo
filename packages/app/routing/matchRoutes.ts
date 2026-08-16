import type React from "react";

export type RouteObject = {
  path?: string;
  index?: boolean;
  element?: React.ReactNode;
  children?: RouteObject[];
};

export type RouteMatch = {
  route: RouteObject;
  params: Record<string, string>;
  pathnameBase: string;
};

/**
 * Match a set of nested route definitions against a pathname.
 *
 * Returns an array representing the matched route chain (outermost first)
 * with accumulated params, or null if no route matched.
 *
 * Supports: root path "/", relative child paths, index routes, :param
 * dynamic segments, * wildcards, and pathless layout routes (no path).
 */
export function matchRoutes(
  routes: RouteObject[],
  pathname: string,
): RouteMatch[] | null {
  const segments = pathname.split("/").filter(Boolean);

  for (const route of routes) {
    const result = matchRouteRecursive(route, segments, {});
    if (result) return result;
  }

  return null;
}

function matchRouteRecursive(
  route: RouteObject,
  segments: string[],
  parentParams: Record<string, string>,
  parentPathSegments: string[] = [],
): RouteMatch[] | null {
  const consumed = matchPath(route.path, segments);

  // No match on this route
  if (consumed === null) return null;

  const remaining = segments.slice(consumed.length);
  const params = { ...parentParams, ...consumed.params };
  const pathSegments = [...parentPathSegments, ...segments.slice(0, consumed.length)];
  const currentMatch: RouteMatch = {
    route,
    params,
    pathnameBase: pathSegments.length ? `/${pathSegments.join("/")}` : "/",
  };

  // If there are remaining segments, try to match children
  if (remaining.length > 0 && route.children) {
    for (const child of rankRoutes(route.children)) {
      const childResult = matchRouteRecursive(child, remaining, params, pathSegments);
      if (childResult) return [currentMatch, ...childResult];
    }
  }

  // If there are no remaining segments, try to match an index child
  if (remaining.length === 0 && route.children) {
    for (const child of route.children) {
      if (child.index) {
        return [
          currentMatch,
          { route: child, params, pathnameBase: currentMatch.pathnameBase },
        ];
      }
    }
  }

  // If there are remaining segments and nothing matched, try wildcard children
  if (remaining.length > 0 && route.children) {
    for (const child of route.children) {
      if (child.path === "*") {
        return [
          currentMatch,
          { route: child, params: { ...params }, pathnameBase: currentMatch.pathnameBase },
        ];
      }
    }
  }

  // Leaf match (no children or children didn't match)
  // Only return this route if there are no remaining segments, or if it's a
  // pathless layout route
  if (remaining.length === 0) {
    return [currentMatch];
  }

  return null;
}

function rankRoutes(routes: RouteObject[]): RouteObject[] {
  return routes
    .map((route, index) => ({ route, index, score: scoreRoutePath(route.path) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ route }) => route);
}

function scoreRoutePath(path: string | undefined): number {
  if (path === undefined || path === "") return 1;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return 1;

  return parts.reduce((score, part) => {
    if (part === "*") return score - 100;
    if (part.startsWith(":")) return score + 3;
    return score + 10;
  }, parts.length);
}

/**
 * Try to match a route path pattern against the current path segments.
 *
 * Returns the consumed segments with extracted params, or null if no match.
 */
function matchPath(
  pattern: string | undefined,
  segments: string[],
): { length: number; params: Record<string, string> } | null {
  // Pathless layout route: matches without consuming any segments
  if (pattern === undefined || pattern === "") {
    return { length: 0, params: {} };
  }

  // Normalise pattern segments (filter blanks so leading "/" works)
  const patternParts = pattern.split("/").filter(Boolean);
  const params: Record<string, string> = {};

  // Wildcard: consumes all remaining segments
  if (patternParts.length === 1 && patternParts[0] === "*") {
    params["*"] = decodePathParam(segments.join("/"));
    return { length: segments.length, params };
  }

  // Root path "/": matches zero segments (like a pathless layout)
  if (patternParts.length === 0) {
    return { length: 0, params };
  }

  // Can't match if there aren't enough segments
  if (segments.length < patternParts.length) {
    return null;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    const seg = segments[i];

    if (part === "*") {
      // Wildcard at position i: consume everything from here
      params["*"] = decodePathParam(segments.slice(i).join("/"));
      return { length: segments.length, params };
    }

    if (part.startsWith(":")) {
      params[part.slice(1)] = decodePathParam(seg);
    } else if (part !== seg) {
      return null;
    }
  }

  return { length: patternParts.length, params };
}

function decodePathParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
