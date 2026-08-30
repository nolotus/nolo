import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { matchRoutes, type RouteObject as NativeRouteObject } from "./matchRoutes";
import { shouldAutoRouteViewTransition } from "app/viewTransitions";

// Types

export type { RouteObject } from "./matchRoutes";

export type Location = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
};

export type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

export type To = string | Location;
type SetSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[]>
  | string;
type SetSearchParamsUpdater = (prev: URLSearchParams) => SetSearchParamsInput;
type SetSearchParamsNext = SetSearchParamsInput | SetSearchParamsUpdater;
type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: To;
  state?: unknown;
  replace?: boolean;
};
type NavLinkRenderProps = { isActive: boolean };
type NavLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children" | "style"
> & {
  to: To;
  state?: unknown;
  replace?: boolean;
  className?: string | ((args: NavLinkRenderProps) => string | undefined);
  style?: React.CSSProperties | ((args: NavLinkRenderProps) => React.CSSProperties | undefined);
  children?: React.ReactNode | ((args: NavLinkRenderProps) => React.ReactNode);
  end?: boolean;
  caseSensitive?: boolean;
};
type BrowserHistoryState = {
  __noloRouter: true;
  usr: unknown;
  key: string;
  idx: number;
};

// Internal location parsing

function parseLocation(urlOrPath: string): Location {
  try {
    const url = new URL(urlOrPath);
    return {
      pathname: url.pathname,
      search: url.search || "",
      hash: url.hash || "",
      state: null,
      key: "default",
    };
  } catch {
    const qIndex = urlOrPath.indexOf("?");
    const hIndex = urlOrPath.indexOf("#");
    return {
      pathname:
        qIndex >= 0
          ? urlOrPath.slice(0, qIndex)
          : hIndex >= 0
            ? urlOrPath.slice(0, hIndex)
            : urlOrPath,
      search: qIndex >= 0 ? urlOrPath.slice(qIndex, hIndex >= 0 ? hIndex : undefined) : "",
      hash: hIndex >= 0 ? urlOrPath.slice(hIndex) : "",
      state: null,
      key: "default",
    };
  }
}

function createBrowserLocation(state: unknown = window.history.state): Location {
  const browserState = readBrowserHistoryState(state);
  return {
    pathname: window.location.pathname,
    search: window.location.search || "",
    hash: window.location.hash || "",
    state: browserState.userState,
    key: browserState.key,
  };
}

/** Build location from an explicit history write target (push/replace `to`). */
function locationFromHistoryWrite(
  to: string,
  historyState: BrowserHistoryState,
): Location {
  const parsed = parseLocation(to);
  // Relative query/hash-only targets inherit current path from the browser.
  const pathname =
    parsed.pathname && parsed.pathname !== ""
      ? parsed.pathname.startsWith("/")
        ? parsed.pathname
        : `/${parsed.pathname}`
      : typeof window !== "undefined"
        ? window.location.pathname
        : "/";
  return {
    pathname,
    search: parsed.search || "",
    hash: parsed.hash || "",
    state: historyState.usr,
    key: historyState.key,
  };
}

let locationKeyCounter = 0;

function createLocationKey(): string {
  locationKeyCounter += 1;
  return `nolo-${locationKeyCounter}`;
}

// History

class History {
  currentLocation: Location;
  type: "POP" | "PUSH" | "REPLACE";
  private listeners: Set<() => void>;
  private hydrated: boolean;

  constructor(initialLocation: Location) {
    this.currentLocation = initialLocation;
    this.type = "POP";
    this.listeners = new Set();
    this.hydrated = false;
  }

  get isSSR(): boolean {
    return typeof window === "undefined";
  }

  hydrate(): void {
    if (this.hydrated || this.isSSR) return;
    this.hydrated = true;

    window.addEventListener("popstate", () => this.handlePop());
    window.addEventListener("nolo:navigation", () => this.handleCustomNav());
    this.ensureBrowserHistoryState("replace");
    this.currentLocation = createBrowserLocation(window.history.state);
  }

  private handlePop(): void {
    if (this.isSSR) return;
    this.currentLocation = createBrowserLocation(window.history.state);
    this.type = "POP";
    this.notify();
  }

  private handleCustomNav(): void {
    if (this.isSSR) return;
    this.ensureBrowserHistoryState("push");
    this.currentLocation = createBrowserLocation(window.history.state);
    this.type = "PUSH";
    this.notify();
  }

  push(to: string, state?: unknown): void {
    if (this.isSSR) return;
    const nextState = createBrowserHistoryState(state ?? null, this.getCurrentIndex() + 1);
    window.history.pushState(nextState, "", to);
    // Prefer the explicit target path over window.location after pushState.
    // Some hosts (desktop webviews) may not update location.pathname synchronously,
    // which would leave React stuck on the previous route after a successful push.
    this.currentLocation = locationFromHistoryWrite(to, nextState);
    this.type = "PUSH";
    this.notify();
  }

  replace(to: string, state?: unknown): void {
    if (this.isSSR) return;
    const nextState = createBrowserHistoryState(state ?? null, this.getCurrentIndex());
    window.history.replaceState(nextState, "", to);
    this.currentLocation = locationFromHistoryWrite(to, nextState);
    this.type = "REPLACE";
    this.notify();
  }

  go(delta: number): void {
    if (this.isSSR) return;
    window.history.go(delta);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private getCurrentIndex(): number {
    if (this.isSSR) return 0;
    const state = readBrowserHistoryState(window.history.state);
    return state.idx ?? 0;
  }

  private ensureBrowserHistoryState(kind: "push" | "replace"): void {
    if (this.isSSR) return;
    const state = readBrowserHistoryState(window.history.state);
    if (state.isRouterState) return;

    const idx = kind === "push" ? this.getCurrentIndex() + 1 : this.getCurrentIndex();
    const nextState = createBrowserHistoryState(state.userState, idx);
    window.history.replaceState(
      nextState,
      "",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }
}

// Router context

type RouterContextValue = {
  location: Location;
  navigate: (to: string | number, options?: NavigateOptions) => void;
  navigationType: "POP" | "PUSH" | "REPLACE";
};

const RouterContext = createContext<RouterContextValue | null>(null);

function useRouterContext(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouterContext: no RouterContext available");
  return ctx;
}

// SSR-safe 降级可见性：hooks 在无 RouterContext 时按事故修复行为静默 no-op，
// 但降级必须可观测——每进程最多 warn 一次（防刷屏），供探针/日志发现静默降级。
let missingRouterContextWarned = false;
function warnMissingRouterContextOnce(): void {
  if (missingRouterContextWarned) return;
  missingRouterContextWarned = true;
  console.warn("[routing] RouterContext missing during SSR — navigation no-op");
}

// RouterProvider

export function RouterProvider({
  children,
  initialUrl,
  initialState,
}: {
  children: React.ReactNode;
  initialUrl?: string | URL;
  initialState?: unknown;
}): React.JSX.Element {
  const initialLocation = useMemo(() => {
    if (initialUrl) {
      const parsed = parseLocation(String(initialUrl));
      return { ...parsed, state: initialState ?? parsed.state };
    }
    if (typeof window !== "undefined") {
      return createBrowserLocation(window.history.state);
    }
    return { pathname: "/", search: "", hash: "", state: null, key: "default" };
  }, []);

  const h = useMemo(() => new History(initialLocation), []);
  const [location, setLocation] = useState<Location>(
    h.isSSR ? initialLocation : h.currentLocation,
  );
  const [navType, setNavType] = useState<"POP" | "PUSH" | "REPLACE">(
    h.isSSR ? "POP" : h.type,
  );

  useEffect(() => {
    h.hydrate();
    setLocation(h.currentLocation);
    setNavType(h.type);

    let lastPathname = h.currentLocation.pathname;

    return h.subscribe(() => {
      const doc = typeof document !== "undefined" ? (document as any) : null;
      const nextPathname = h.currentLocation.pathname;
      // Route-level View Transitions are expensive on content-heavy app pages.
      // Default: explicit opt-in via data-nolo-route-view-transition.
      // Also auto-enable Back/Forward between AI plaza and agent detail so the
      // reverse shared-element morph works without a click handler.
      const autoPlazaDetailVt =
        h.type === "POP" &&
        shouldAutoRouteViewTransition(lastPathname, nextPathname);

      const useTransition =
        h.type !== "REPLACE" &&
        !!doc?.startViewTransition &&
        (doc?.documentElement?.dataset?.noloRouteViewTransition === "1" ||
          autoPlazaDetailVt);

      lastPathname = nextPathname;

      if (useTransition) {
        if (autoPlazaDetailVt && doc?.documentElement) {
          doc.documentElement.dataset.noloRouteViewTransition = "1";
        }
        const transition = doc.startViewTransition(() => {
          flushSync(() => {
            setLocation({ ...h.currentLocation });
            setNavType(h.type);
          });
        });
        // Keep data-nolo-route-view-transition until animation ends so scoped
        // ::view-transition CSS (shared-element morph) stays active.
        Promise.resolve(transition?.finished)
          .catch(() => undefined)
          .finally(() => {
            try {
              delete doc.documentElement.dataset.noloRouteViewTransition;
            } catch {
              // ignore
            }
          });
      } else {
        setLocation({ ...h.currentLocation });
        setNavType(h.type);
      }
    });
  }, []);

  const navigate = useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        h.go(to);
      } else if (options?.replace) {
        h.replace(to, options?.state);
      } else {
        h.push(to, options?.state);
      }
    },
    [],
  );

  const ctx = useMemo(
    () => ({ location, navigate, navigationType: navType }),
    [location, navigate, navType],
  );

  return <RouterContext.Provider value={ctx}>{children}</RouterContext.Provider>;
}

// BrowserRouter / MemoryRouter

export const BrowserRouter = RouterProvider;

export function MemoryRouter({
  children,
  initialEntries,
  initialState,
}: {
  children: React.ReactNode;
  initialEntries?: string[];
  initialState?: unknown;
}): React.JSX.Element {
  const entry = initialEntries?.at(-1) ?? "/";
  return (
    <RouterProvider initialUrl={entry} initialState={initialState}>
      {children}
    </RouterProvider>
  );
}

// useLocation / useNavigate / useNavigationType / useParams

const DEFAULT_FALLBACK_LOCATION: Location = {
  pathname: "/",
  search: "",
  hash: "",
  state: null,
  key: "default",
};

export function useLocation(): Location {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    warnMissingRouterContextOnce();
    return DEFAULT_FALLBACK_LOCATION;
  }
  return ctx.location;
}

export function useNavigate(): (to: To | number, options?: NavigateOptions) => void {
  const ctx = useContext(RouterContext);
  const matches = useContext(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";

  if (!ctx) {
    warnMissingRouterContextOnce();
  }

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (!ctx) return;
      if (typeof to === "number") {
        ctx.navigate(to, options);
        return;
      }
      const resolvedOptions =
        typeof to === "object" && options?.state === undefined
          ? { ...options, state: to.state }
          : options;
      ctx.navigate(resolveTo(to, routeBase), resolvedOptions);
    },
    [ctx, routeBase],
  );
}

export function useNavigationType(): "POP" | "PUSH" | "REPLACE" {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    warnMissingRouterContextOnce();
    return "POP";
  }
  return ctx.navigationType;
}

export function useParams<K extends string = string>(): Readonly<
  Record<K, string | undefined>
> {
  const paramsMatch = useContext(RouteParamsMatchContext);
  const routeMatch = useContext(RouteMatchContext);
  const matches = paramsMatch ?? routeMatch;
  if (!matches) return {} as Record<K, string | undefined>;
  const merged: Record<string, string | undefined> = {};
  for (const m of matches) {
    for (const [k, v] of Object.entries(m.params)) {
      merged[k] = v;
    }
  }
  return merged as Record<K, string | undefined>;
}

// useRoutes / Outlet

const RouteMatchContext = createContext<
  Array<{ params: Record<string, string>; pathnameBase: string }> | null
>(null);
const RouteParamsMatchContext = createContext<
  Array<{ params: Record<string, string> }> | null
>(null);

const OutletContext = createContext<React.ReactNode>(null);

export function useRoutes(
  routes: NativeRouteObject[],
  locationArg?: Location,
): React.ReactNode {
  const ctx = useRouterContext();
  const location = locationArg ?? ctx.location;
  const matches = matchRoutes(routes, location.pathname);

  if (!matches) return null;

  return (
    <RouteParamsMatchContext.Provider value={matches}>
      {renderMatches(matches, 0)}
    </RouteParamsMatchContext.Provider>
  );
}

function renderMatches(
  matches: Array<{
    route: NativeRouteObject;
    params: Record<string, string>;
    pathnameBase: string;
  }>,
  index: number,
): React.ReactNode {
  if (index >= matches.length) return null;

  const match = matches[index];
  const outlet = renderMatches(matches, index + 1);

  return (
    <RouteMatchContext.Provider value={matches.slice(0, index + 1)}>
      <OutletContext.Provider value={outlet}>
        {match.route.element}
      </OutletContext.Provider>
    </RouteMatchContext.Provider>
  );
}

export function Outlet(): React.ReactNode {
  return useContext(OutletContext);
}

// Link / NavLink

export function Link({
  to,
  state,
  replace,
  onClick,
  target,
  download,
  ...rest
}: LinkProps): React.JSX.Element {
  const navigate = useNavigate();
  const matches = useContext(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";
  const href = resolveTo(to, routeBase);
  const navigationState = state ?? (typeof to === "object" ? to.state : undefined);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);

      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        isModifiedEvent(e) ||
        target ||
        download ||
        isExternalHref(href)
      ) {
        return;
      }

      e.preventDefault();
      navigate(href, { replace, state: navigationState });
    },
    [navigate, href, replace, navigationState, onClick, target, download],
  );

  return <a {...rest} href={href} target={target} download={download} onClick={handleClick} />;
}

export function NavLink({
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
}: NavLinkProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const matches = useContext(RouteMatchContext);
  const routeBase = matches?.at(-1)?.pathnameBase ?? "/";
  const href = resolveTo(to, routeBase);
  const navigationState = state ?? (typeof to === "object" ? to.state : undefined);

  const linkPathname = getPathnameFromTo(href);
  const currentPathname = caseSensitive
    ? location.pathname
    : location.pathname.toLowerCase();
  const targetPathname = caseSensitive
    ? linkPathname
    : linkPathname.toLowerCase();
  const isActive = end
    ? currentPathname === targetPathname
    : currentPathname === targetPathname ||
      currentPathname.startsWith(`${targetPathname}/`);

  const resolvedClassName =
    typeof className === "function" ? className({ isActive }) : className;
  const resolvedStyle =
    typeof style === "function" ? style({ isActive }) : style;

  const resolvedChildren =
    typeof children === "function" ? children({ isActive }) : children;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);

      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        isModifiedEvent(e) ||
        target ||
        download ||
        isExternalHref(href)
      ) {
        return;
      }

      e.preventDefault();
      navigate(href, { replace, state: navigationState });
    },
    [navigate, href, replace, navigationState, onClick, target, download],
  );

  return (
    <a
      {...rest}
      href={href}
      className={resolvedClassName}
      style={resolvedStyle}
      target={target}
      download={download}
      onClick={handleClick}
    >
      {resolvedChildren}
    </a>
  );
}

// Navigate

export function Navigate({
  to,
  replace,
  state,
}: {
  to: To;
  replace?: boolean;
  state?: unknown;
}): null {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      navigate(to, { replace, state });
    }
  }, [navigate, to, replace, state]);

  return null;
}

// useSearchParams

export function useSearchParams(): [
  URLSearchParams,
  (
    next: SetSearchParamsNext,
    options?: NavigateOptions,
  ) => void,
] {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setSearchParams = useCallback(
    (
      next: SetSearchParamsNext,
      options?: NavigateOptions,
    ) => {
      const resolvedNext =
        typeof next === "function"
          ? next(new URLSearchParams(location.search))
          : next;
      let nextSearch: string;
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
    [location.pathname, location.search, location.hash, navigate],
  );

  return [searchParams, setSearchParams];
}

// Helpers

function isModifiedEvent(e: React.MouseEvent): boolean {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}

function getPathnameFromTo(to: To): string {
  const href = toToHref(to);
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const endIndexCandidates = [hashIndex, queryIndex].filter((index) => index >= 0);
  const endIndex = endIndexCandidates.length ? Math.min(...endIndexCandidates) : href.length;
  return href.slice(0, endIndex) || "/";
}

function resolveTo(to: To, routeBase: string): string {
  const href = toToHref(to);
  if (
    href.startsWith("/") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  if (href.startsWith("?") || href.startsWith("#")) {
    return `${routeBase}${href}`;
  }

  const splitIndexCandidates = [href.indexOf("?"), href.indexOf("#")].filter(
    (index) => index >= 0,
  );
  const splitIndex = splitIndexCandidates.length
    ? Math.min(...splitIndexCandidates)
    : href.length;
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

function toToHref(to: To): string {
  if (typeof to === "string") return to;
  return `${to.pathname || "/"}${to.search || ""}${to.hash || ""}`;
}

function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function createBrowserHistoryState(userState: unknown, idx: number): BrowserHistoryState {
  return {
    __noloRouter: true,
    usr: userState,
    key: createLocationKey(),
    idx,
  };
}

function readBrowserHistoryState(state: unknown): {
  userState: unknown;
  key: string;
  idx: number;
  isRouterState: boolean;
} {
  if (
    state &&
    typeof state === "object" &&
    (state as { __noloRouter?: unknown }).__noloRouter === true
  ) {
    const routerState = state as Partial<BrowserHistoryState>;
    return {
      userState: routerState.usr ?? null,
      key: typeof routerState.key === "string" ? routerState.key : createLocationKey(),
      idx: typeof routerState.idx === "number" ? routerState.idx : 0,
      isRouterState: true,
    };
  }

  return {
    userState: state ?? null,
    key: createLocationKey(),
    idx: 0,
    isRouterState: false,
  };
}
