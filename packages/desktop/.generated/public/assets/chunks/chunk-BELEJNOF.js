import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __publicField,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/viewTransitions.ts
var sanitizeViewTransitionKey = (key) => {
  if (!key) return "";
  return key.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
};
var cardIconViewTransitionName = (key) => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-icon-${safe}` : "";
};
var cardTitleViewTransitionName = (key) => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-title-${safe}` : "";
};
var cardSurfaceViewTransitionName = (key) => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-surface-${safe}` : "";
};
var reducedMotionCached = null;
var reducedMotionSubscribed = false;
var resolveMatchMedia = () => {
  const g = globalThis;
  if (typeof g.matchMedia === "function") return g.matchMedia.bind(g);
  if (g.window && typeof g.window.matchMedia === "function") {
    return g.window.matchMedia.bind(g.window);
  }
  return null;
};
var prefersReducedMotion = () => {
  if (reducedMotionCached !== null) {
    return reducedMotionCached;
  }
  const matchMedia = resolveMatchMedia();
  if (!matchMedia) return false;
  try {
    const mql = matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionCached = mql.matches;
    if (!reducedMotionSubscribed && typeof mql.addEventListener === "function") {
      reducedMotionSubscribed = true;
      mql.addEventListener("change", (event) => {
        reducedMotionCached = event.matches;
      });
    }
    return reducedMotionCached;
  } catch {
    return false;
  }
};
var viewTransitionStyle = (name, options) => {
  if (!name || options?.enabled === false) return void 0;
  if (prefersReducedMotion()) return void 0;
  return { viewTransitionName: name };
};
var cardViewTransitionStyles = (key, options) => {
  if (!key || options?.enabled === false || prefersReducedMotion()) {
    return {};
  }
  const iconName = cardIconViewTransitionName(key);
  const titleName = cardTitleViewTransitionName(key);
  const surfaceName = cardSurfaceViewTransitionName(key);
  return {
    icon: viewTransitionStyle(iconName),
    title: viewTransitionStyle(titleName),
    surface: viewTransitionStyle(surfaceName)
  };
};
var isAgentDetailPath = (pathname) => {
  if (!pathname || pathname === "/") return false;
  const first = pathname.split("/").filter(Boolean)[0] || "";
  return first.startsWith("agent-") || first.startsWith("agent-pub-");
};
var isAgentPlazaPath = (pathname) => {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "") return true;
  return pathname === "/explore" || pathname.startsWith("/explore/");
};
var shouldAutoRouteViewTransition = (fromPathname, toPathname) => {
  if (fromPathname === toPathname) return false;
  const fromDetail = isAgentDetailPath(fromPathname);
  const toDetail = isAgentDetailPath(toPathname);
  const fromPlaza = isAgentPlazaPath(fromPathname);
  const toPlaza = isAgentPlazaPath(toPathname);
  return fromDetail && toPlaza || fromPlaza && toDetail;
};
var QUICK_CHAT_COMPOSER_VT_NAME = "quick-chat-composer";
var enableNextRouteViewTransition = () => {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;
  const doc = document;
  if (typeof doc.startViewTransition !== "function") return;
  doc.documentElement.dataset.noloRouteViewTransition = "1";
};

// packages/app/routing/index.tsx
var import_react = __toESM(require_react());
var import_react_dom = __toESM(require_react_dom());

// packages/app/routing/matchRoutes.ts
function matchRoutes(routes, pathname) {
  const segments = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    const result = matchRouteRecursive(route, segments, {});
    if (result) return result;
  }
  return null;
}
function matchRouteRecursive(route, segments, parentParams, parentPathSegments = []) {
  const consumed = matchPath(route.path, segments);
  if (consumed === null) return null;
  const remaining = segments.slice(consumed.length);
  const params = { ...parentParams, ...consumed.params };
  const pathSegments = [...parentPathSegments, ...segments.slice(0, consumed.length)];
  const currentMatch = {
    route,
    params,
    pathnameBase: pathSegments.length ? `/${pathSegments.join("/")}` : "/"
  };
  if (remaining.length > 0 && route.children) {
    for (const child of rankRoutes(route.children)) {
      const childResult = matchRouteRecursive(child, remaining, params, pathSegments);
      if (childResult) return [currentMatch, ...childResult];
    }
  }
  if (remaining.length === 0 && route.children) {
    for (const child of route.children) {
      if (child.index) {
        return [
          currentMatch,
          { route: child, params, pathnameBase: currentMatch.pathnameBase }
        ];
      }
    }
  }
  if (remaining.length > 0 && route.children) {
    for (const child of route.children) {
      if (child.path === "*") {
        return [
          currentMatch,
          { route: child, params: { ...params }, pathnameBase: currentMatch.pathnameBase }
        ];
      }
    }
  }
  if (remaining.length === 0) {
    return [currentMatch];
  }
  return null;
}
function rankRoutes(routes) {
  return routes.map((route, index) => ({ route, index, score: scoreRoutePath(route.path) })).sort((a, b) => b.score - a.score || a.index - b.index).map(({ route }) => route);
}
function scoreRoutePath(path) {
  if (path === void 0 || path === "") return 1;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return 1;
  return parts.reduce((score, part) => {
    if (part === "*") return score - 100;
    if (part.startsWith(":")) return score + 3;
    return score + 10;
  }, parts.length);
}
function matchPath(pattern, segments) {
  if (pattern === void 0 || pattern === "") {
    return { length: 0, params: {} };
  }
  const patternParts = pattern.split("/").filter(Boolean);
  const params = {};
  if (patternParts.length === 1 && patternParts[0] === "*") {
    params["*"] = decodePathParam(segments.join("/"));
    return { length: segments.length, params };
  }
  if (patternParts.length === 0) {
    return { length: 0, params };
  }
  if (segments.length < patternParts.length) {
    return null;
  }
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    const seg = segments[i];
    if (part === "*") {
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
function decodePathParam(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// packages/app/routing/index.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
function parseLocation(urlOrPath) {
  try {
    const url = new URL(urlOrPath);
    return {
      pathname: url.pathname,
      search: url.search || "",
      hash: url.hash || "",
      state: null,
      key: "default"
    };
  } catch {
    const qIndex = urlOrPath.indexOf("?");
    const hIndex = urlOrPath.indexOf("#");
    return {
      pathname: qIndex >= 0 ? urlOrPath.slice(0, qIndex) : hIndex >= 0 ? urlOrPath.slice(0, hIndex) : urlOrPath,
      search: qIndex >= 0 ? urlOrPath.slice(qIndex, hIndex >= 0 ? hIndex : void 0) : "",
      hash: hIndex >= 0 ? urlOrPath.slice(hIndex) : "",
      state: null,
      key: "default"
    };
  }
}
function createBrowserLocation(state = window.history.state) {
  const browserState = readBrowserHistoryState(state);
  return {
    pathname: window.location.pathname,
    search: window.location.search || "",
    hash: window.location.hash || "",
    state: browserState.userState,
    key: browserState.key
  };
}
function locationFromHistoryWrite(to, historyState) {
  const parsed = parseLocation(to);
  const pathname = parsed.pathname && parsed.pathname !== "" ? parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}` : typeof window !== "undefined" ? window.location.pathname : "/";
  return {
    pathname,
    search: parsed.search || "",
    hash: parsed.hash || "",
    state: historyState.usr,
    key: historyState.key
  };
}
var locationKeyCounter = 0;
function createLocationKey() {
  locationKeyCounter += 1;
  return `nolo-${locationKeyCounter}`;
}
var History = class {
  constructor(initialLocation) {
    __publicField(this, "currentLocation");
    __publicField(this, "type");
    __publicField(this, "listeners");
    __publicField(this, "hydrated");
    this.currentLocation = initialLocation;
    this.type = "POP";
    this.listeners = /* @__PURE__ */ new Set();
    this.hydrated = false;
  }
  get isSSR() {
    return typeof window === "undefined";
  }
  hydrate() {
    if (this.hydrated || this.isSSR) return;
    this.hydrated = true;
    window.addEventListener("popstate", () => this.handlePop());
    window.addEventListener("nolo:navigation", () => this.handleCustomNav());
    this.ensureBrowserHistoryState("replace");
    this.currentLocation = createBrowserLocation(window.history.state);
  }
  handlePop() {
    if (this.isSSR) return;
    this.currentLocation = createBrowserLocation(window.history.state);
    this.type = "POP";
    this.notify();
  }
  handleCustomNav() {
    if (this.isSSR) return;
    this.ensureBrowserHistoryState("push");
    this.currentLocation = createBrowserLocation(window.history.state);
    this.type = "PUSH";
    this.notify();
  }
  push(to, state) {
    if (this.isSSR) return;
    const nextState = createBrowserHistoryState(state ?? null, this.getCurrentIndex() + 1);
    window.history.pushState(nextState, "", to);
    this.currentLocation = locationFromHistoryWrite(to, nextState);
    this.type = "PUSH";
    this.notify();
  }
  replace(to, state) {
    if (this.isSSR) return;
    const nextState = createBrowserHistoryState(state ?? null, this.getCurrentIndex());
    window.history.replaceState(nextState, "", to);
    this.currentLocation = locationFromHistoryWrite(to, nextState);
    this.type = "REPLACE";
    this.notify();
  }
  go(delta) {
    if (this.isSSR) return;
    window.history.go(delta);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  getCurrentIndex() {
    if (this.isSSR) return 0;
    const state = readBrowserHistoryState(window.history.state);
    return state.idx ?? 0;
  }
  ensureBrowserHistoryState(kind) {
    if (this.isSSR) return;
    const state = readBrowserHistoryState(window.history.state);
    if (state.isRouterState) return;
    const idx = kind === "push" ? this.getCurrentIndex() + 1 : this.getCurrentIndex();
    const nextState = createBrowserHistoryState(state.userState, idx);
    window.history.replaceState(
      nextState,
      "",
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }
};
var RouterContext = (0, import_react.createContext)(null);
function useRouterContext() {
  const ctx = (0, import_react.useContext)(RouterContext);
  if (!ctx) throw new Error("useRouterContext: no RouterContext available");
  return ctx;
}
function RouterProvider({
  children,
  initialUrl,
  initialState
}) {
  const initialLocation = (0, import_react.useMemo)(() => {
    if (initialUrl) {
      const parsed = parseLocation(String(initialUrl));
      return { ...parsed, state: initialState ?? parsed.state };
    }
    if (typeof window !== "undefined") {
      return createBrowserLocation(window.history.state);
    }
    return { pathname: "/", search: "", hash: "", state: null, key: "default" };
  }, []);
  const h = (0, import_react.useMemo)(() => new History(initialLocation), []);
  const [location, setLocation] = (0, import_react.useState)(
    h.isSSR ? initialLocation : h.currentLocation
  );
  const [navType, setNavType] = (0, import_react.useState)(
    h.isSSR ? "POP" : h.type
  );
  (0, import_react.useEffect)(() => {
    h.hydrate();
    setLocation(h.currentLocation);
    setNavType(h.type);
    let lastPathname = h.currentLocation.pathname;
    return h.subscribe(() => {
      const doc = typeof document !== "undefined" ? document : null;
      const nextPathname = h.currentLocation.pathname;
      const autoPlazaDetailVt = h.type === "POP" && shouldAutoRouteViewTransition(lastPathname, nextPathname);
      const useTransition = h.type !== "REPLACE" && !!doc?.startViewTransition && (doc?.documentElement?.dataset?.noloRouteViewTransition === "1" || autoPlazaDetailVt);
      lastPathname = nextPathname;
      if (useTransition) {
        if (autoPlazaDetailVt && doc?.documentElement) {
          doc.documentElement.dataset.noloRouteViewTransition = "1";
        }
        const transition = doc.startViewTransition(() => {
          (0, import_react_dom.flushSync)(() => {
            setLocation({ ...h.currentLocation });
            setNavType(h.type);
          });
        });
        Promise.resolve(transition?.finished).catch(() => void 0).finally(() => {
          try {
            delete doc.documentElement.dataset.noloRouteViewTransition;
          } catch {
          }
        });
      } else {
        setLocation({ ...h.currentLocation });
        setNavType(h.type);
      }
    });
  }, []);
  const navigate = (0, import_react.useCallback)(
    (to, options) => {
      if (typeof to === "number") {
        h.go(to);
      } else if (options?.replace) {
        h.replace(to, options?.state);
      } else {
        h.push(to, options?.state);
      }
    },
    []
  );
  const ctx = (0, import_react.useMemo)(
    () => ({ location, navigate, navigationType: navType }),
    [location, navigate, navType]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouterContext.Provider, { value: ctx, children });
}
function useLocation() {
  return useRouterContext().location;
}
function useNavigate() {
  const { navigate } = useRouterContext();
  const matches = (0, import_react.useContext)(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";
  return (0, import_react.useCallback)(
    (to, options) => {
      if (typeof to === "number") {
        navigate(to, options);
        return;
      }
      const resolvedOptions = typeof to === "object" && options?.state === void 0 ? { ...options, state: to.state } : options;
      navigate(resolveTo(to, routeBase), resolvedOptions);
    },
    [navigate, routeBase]
  );
}
function useNavigationType() {
  return useRouterContext().navigationType;
}
function useParams() {
  const paramsMatch = (0, import_react.useContext)(RouteParamsMatchContext);
  const routeMatch = (0, import_react.useContext)(RouteMatchContext);
  const matches = paramsMatch ?? routeMatch;
  if (!matches) return {};
  const merged = {};
  for (const m of matches) {
    for (const [k, v] of Object.entries(m.params)) {
      merged[k] = v;
    }
  }
  return merged;
}
var RouteMatchContext = (0, import_react.createContext)(null);
var RouteParamsMatchContext = (0, import_react.createContext)(null);
var OutletContext = (0, import_react.createContext)(null);
function useRoutes(routes, locationArg) {
  const ctx = useRouterContext();
  const location = locationArg ?? ctx.location;
  const matches = matchRoutes(routes, location.pathname);
  if (!matches) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteParamsMatchContext.Provider, { value: matches, children: renderMatches(matches, 0) });
}
function renderMatches(matches, index) {
  if (index >= matches.length) return null;
  const match = matches[index];
  const outlet = renderMatches(matches, index + 1);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteMatchContext.Provider, { value: matches.slice(0, index + 1), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutletContext.Provider, { value: outlet, children: match.route.element }) });
}
function Outlet() {
  return (0, import_react.useContext)(OutletContext);
}
function Link({
  to,
  state,
  replace,
  onClick,
  target,
  download,
  ...rest
}) {
  const navigate = useNavigate();
  const matches = (0, import_react.useContext)(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";
  const href = resolveTo(to, routeBase);
  const navigationState = state ?? (typeof to === "object" ? to.state : void 0);
  const handleClick = (0, import_react.useCallback)(
    (e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.button !== 0 || isModifiedEvent(e) || target || download || isExternalHref(href)) {
        return;
      }
      e.preventDefault();
      navigate(href, { replace, state: navigationState });
    },
    [navigate, href, replace, navigationState, onClick, target, download]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { ...rest, href, target, download, onClick: handleClick });
}
function NavLink({
  to,
  state,
  replace,
  className,
  style,
  children,
  onClick,
  target,
  download,
  end = false,
  caseSensitive = false,
  ...rest
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const matches = (0, import_react.useContext)(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";
  const href = resolveTo(to, routeBase);
  const navigationState = state ?? (typeof to === "object" ? to.state : void 0);
  const linkPathname = getPathnameFromTo(href);
  const currentPathname = caseSensitive ? location.pathname : location.pathname.toLowerCase();
  const targetPathname = caseSensitive ? linkPathname : linkPathname.toLowerCase();
  const isActive = end ? currentPathname === targetPathname : currentPathname === targetPathname || currentPathname.startsWith(`${targetPathname}/`);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
  const resolvedStyle = typeof style === "function" ? style({ isActive }) : style;
  const resolvedChildren = typeof children === "function" ? children({ isActive }) : children;
  const handleClick = (0, import_react.useCallback)(
    (e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.button !== 0 || isModifiedEvent(e) || target || download || isExternalHref(href)) {
        return;
      }
      e.preventDefault();
      navigate(href, { replace, state: navigationState });
    },
    [navigate, href, replace, navigationState, onClick, target, download]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "a",
    {
      ...rest,
      href,
      className: resolvedClassName,
      style: resolvedStyle,
      target,
      download,
      onClick: handleClick,
      children: resolvedChildren
    }
  );
}
function Navigate({
  to,
  replace,
  state
}) {
  const navigate = useNavigate();
  const navigatedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      navigate(to, { replace, state });
    }
  }, [navigate, to, replace, state]);
  return null;
}
function useSearchParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = (0, import_react.useMemo)(() => new URLSearchParams(location.search), [location.search]);
  const setSearchParams = (0, import_react.useCallback)(
    (next, options) => {
      const resolvedNext = typeof next === "function" ? next(new URLSearchParams(location.search)) : next;
      let nextSearch;
      if (typeof resolvedNext === "string") {
        nextSearch = resolvedNext.startsWith("?") ? resolvedNext : `?${resolvedNext}`;
      } else {
        const params = resolvedNext instanceof URLSearchParams ? resolvedNext : new URLSearchParams();
        if (!(resolvedNext instanceof URLSearchParams)) {
          for (const [key, value] of Object.entries(resolvedNext)) {
            if (Array.isArray(value)) {
              for (const v of value) params.append(key, v);
            } else {
              params.set(key, value);
            }
          }
        }
        const s = params.toString();
        nextSearch = s ? `?${s}` : "";
      }
      if (nextSearch !== location.search) {
        navigate(`${location.pathname}${nextSearch}${location.hash}`, options);
      }
    },
    [location.pathname, location.search, location.hash, navigate]
  );
  return [searchParams, setSearchParams];
}
function isModifiedEvent(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
function getPathnameFromTo(to) {
  const href = toToHref(to);
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const endIndexCandidates = [hashIndex, queryIndex].filter((index) => index >= 0);
  const endIndex = endIndexCandidates.length ? Math.min(...endIndexCandidates) : href.length;
  return href.slice(0, endIndex) || "/";
}
function resolveTo(to, routeBase) {
  const href = toToHref(to);
  if (href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }
  if (href.startsWith("?") || href.startsWith("#")) {
    return `${routeBase}${href}`;
  }
  const splitIndexCandidates = [href.indexOf("?"), href.indexOf("#")].filter(
    (index) => index >= 0
  );
  const splitIndex = splitIndexCandidates.length ? Math.min(...splitIndexCandidates) : href.length;
  const pathname = href.slice(0, splitIndex);
  const suffix = href.slice(splitIndex);
  const segments = routeBase.split("/").filter(Boolean);
  for (const part of pathname.split("/").filter(Boolean)) {
    if (part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return `/${segments.join("/")}${suffix}`;
}
function toToHref(to) {
  if (typeof to === "string") return to;
  return `${to.pathname || "/"}${to.search || ""}${to.hash || ""}`;
}
function isExternalHref(href) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href);
}
function createBrowserHistoryState(userState, idx) {
  return {
    __noloRouter: true,
    usr: userState,
    key: createLocationKey(),
    idx
  };
}
function readBrowserHistoryState(state) {
  if (state && typeof state === "object" && state.__noloRouter === true) {
    const routerState = state;
    return {
      userState: routerState.usr ?? null,
      key: typeof routerState.key === "string" ? routerState.key : createLocationKey(),
      idx: typeof routerState.idx === "number" ? routerState.idx : 0,
      isRouterState: true
    };
  }
  return {
    userState: state ?? null,
    key: createLocationKey(),
    idx: 0,
    isRouterState: false
  };
}

export {
  cardIconViewTransitionName,
  cardTitleViewTransitionName,
  cardSurfaceViewTransitionName,
  viewTransitionStyle,
  cardViewTransitionStyles,
  QUICK_CHAT_COMPOSER_VT_NAME,
  enableNextRouteViewTransition,
  RouterProvider,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
  useRoutes,
  Outlet,
  Link,
  NavLink,
  Navigate,
  useSearchParams
};
