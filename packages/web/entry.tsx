// web/entry.tsx
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import React from "react";
import type { RouteObject } from "app/routing";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "app/routing";
import { syncWebAuthTokenCookie, webTokenManager, readBootstrappedAuthState } from "identity/cloudBootstrap";
import App from "app/web/App";
import { createAppStore } from "app/store";
import {
  readStoredFontPreset,
  readStoredThemeDensity,
  readStoredThemeName,
  resolveThemeModePreload,
  SYSTEM_DARK_MEDIA_QUERY,
} from "app/theme/themeModeBootstrap";
import { applyAgentThemeToElement } from "app/theme/agentTheme.stylex";
import { getDb } from "database/client/db";
import { detectSite, loadRoutes, type SiteId } from "app/web/siteRoutes";
import i18n from "app/i18n/client";
import { loadClientLanguage } from "app/i18n/clientResources";
import { isProduction } from "app/utils/env";
import { isCloudEdition } from "identity";
import { toast } from "app/utils/toast";
import { registerDatabaseActionToast } from "database/actions/actionToast";

registerDatabaseActionToast({
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
});
import { setSSRCommunityShares } from "share/shareStore";
import { setSSRPublicAgents } from "ai/agent/publicAgentsSSRStore";
import { installChunkLoadRecovery } from "./chunkLoadRecovery";
import "./input.css";
import "render/table.css";
import "app/settings/web/settings.css";
// StyleX 管线冒烟：导入后其 CSS 宿主进入 entry CSS，StyleX 聚合规则会追加到 entry CSS 产物；
// 模块副作用会把 StyleX 生成的类名写到 <html data-stylex-smoke>（见 ./stylexSmoke.ts）。
import "./stylexSmoke";

declare global {
  interface Window {
    // RootState shape is declared in app/store; keep partial for SSR hydrate.
    __SITE_ID__?: SiteId;
    __SSR_LANG__?: string;
    __NOLO_EDITION__?: "cloud" | "local";
  }
}

installChunkLoadRecovery();

// Edition 契约验证：SSR 注入的 edition 必须与客户端 bundle 的 isCloudEdition 一致。
// 不一致说明 SSR 和客户端用了不同的 --conditions=nolo-cloud，
// 会导致路由表不匹配 → hydrate mismatch → 白屏。
// 及早抛错比静默白屏更容易诊断。
{
  const ssrEdition = window.__NOLO_EDITION__;
  const clientEdition = isCloudEdition ? "cloud" : "local";
  if (ssrEdition && ssrEdition !== clientEdition) {
    throw new Error(
      `[nolo] Edition mismatch: SSR rendered with "${ssrEdition}" but client bundle is "${clientEdition}". ` +
        `This means SSR and client used different --conditions=nolo-cloud. ` +
        `Check that the server is started with --conditions=nolo-cloud and the client bundle is built with the same condition.`
    );
  }
}

const serverPreloadedState = (window.__PRELOADED_STATE__ ?? {}) as Record<string, any>;

// share 已剥叶为 module store + ALS：SSR 注入的 `share` 字段由客户端 boot 时
// 写入 shareStore 客户端单例，之后从 Redux preloadedState 里剔除，避免
// 把已剥叶的 slice 喂回 configureStore（reducer 已无 share key）。
const shareBoot = serverPreloadedState?.share?.communityShares;
if (shareBoot && Array.isArray(shareBoot.data)) {
  setSSRCommunityShares({
    data: shareBoot.data,
    nextCursor: shareBoot.nextCursor,
  });
}

// pubAgents（Wave5）已剥叶为 module store + ALS：SSR 注入的 `agent.pubAgents`
// 字段由客户端 boot 时写入 publicAgentsSSRStore 客户端单例，之后从 Redux
// preloadedState 里剔除 `agent`（今天 agent preload 只携带 pubAgents），
// 避免把已剥叶的 slice key 喂回 configureStore。
const pubAgentsBoot = serverPreloadedState?.agent?.pubAgents;
if (pubAgentsBoot && Array.isArray(pubAgentsBoot.data)) {
  setSSRPublicAgents(pubAgentsBoot.data);
}
const {
  share: _omitShare,
  agent: _omitAgent,
  ...serverPreloadedWithoutShare
} = serverPreloadedState;

function consumeDevLoginParams() {
  if (isProduction) return {};
  if (!["127.0.0.1", "localhost", "nolotus.local"].includes(window.location.hostname)) {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const devAuthToken = params.get("devAuthToken")?.trim();
  const devCurrentServer = params.get("devCurrentServer")?.trim();
  let changed = false;

  if (devAuthToken) {
    try {
      const existing = JSON.parse(window.localStorage.getItem("tokens") || "[]");
      const tokens = Array.isArray(existing)
        ? existing.filter((token): token is string => typeof token === "string" && token !== devAuthToken)
        : [];
      tokens.unshift(devAuthToken);
      window.localStorage.setItem("tokens", JSON.stringify(tokens));
      syncWebAuthTokenCookie(tokens);
      params.delete("devAuthToken");
      changed = true;
    } catch {
      // Ignore dev bootstrap failures; the normal login flow remains available.
    }
  }

  let normalizedDevCurrentServer: string | undefined;
  if (devCurrentServer) {
    try {
      normalizedDevCurrentServer = new URL(devCurrentServer).origin;
      params.delete("devCurrentServer");
      changed = true;
    } catch {
      // Ignore malformed dev server hints.
    }
  }

  // 本地开发环境：如果没有显式指定 devCurrentServer，自动使用当前 origin。
  // 否则 currentServer 会保持默认的远程集群地址（如 us.nolo.chat），
  // 导致登录/注册请求发往远程而非本地服务器，本地用户数据找不到。
  if (!normalizedDevCurrentServer) {
    normalizedDevCurrentServer = window.location.origin;
  }

  if (changed) {
    const nextSearch = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
  }

  return { currentServer: normalizedDevCurrentServer };
}

const devLoginSettings = consumeDevLoginParams();
const bootstrappedAuthState = readBootstrappedAuthState(window.localStorage);
syncWebAuthTokenCookie(
  bootstrappedAuthState?.currentToken ? [bootstrappedAuthState.currentToken] : []
);

// 同步读主题 mode，消除 hydration 覆盖首屏主题的闪烁
const themeModePreload = resolveThemeModePreload({
  storage: window.localStorage,
  systemPrefersDark: window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches,
});

// 同步读主题名，但仅尊重显式选择或非旧默认值，避免历史 neutral 持续覆盖新默认主题。
const storedThemeName = readStoredThemeName(window.localStorage);
const storedThemeDensity = readStoredThemeDensity(window.localStorage);
const storedFontPreset = readStoredFontPreset(window.localStorage);

try {
  const rawStoredThemeName = window.localStorage.getItem("nolo-theme-name");
  const themeExplicit = window.localStorage.getItem("nolo-theme-name-explicit") === "1";
  if (!storedThemeName && rawStoredThemeName === "neutral" && !themeExplicit) {
    window.localStorage.removeItem("nolo-theme-name");
  }
} catch {
  // ignore localStorage access failures
}

// 提前同步 HTML 根节点的 StyleX 主题 class，保证 pre-React 零闪烁
applyAgentThemeToElement(
  document.documentElement,
  storedThemeName,
  themeModePreload.isDark
);

const preloadedState = bootstrappedAuthState
  ? {
    ...serverPreloadedWithoutShare,
    auth: {
      ...serverPreloadedWithoutShare.auth,
      ...bootstrappedAuthState,
    },
    settings: {
      ...serverPreloadedWithoutShare.settings,
      ...themeModePreload,
      ...devLoginSettings,
      ...(storedThemeName ? { themeName: storedThemeName } : {}),
      ...(storedThemeDensity ? { density: storedThemeDensity } : {}),
      ...(storedFontPreset ? { fontPreset: storedFontPreset } : {}),
    },
  }
  : {
    ...serverPreloadedWithoutShare,
    settings: {
      ...serverPreloadedWithoutShare.settings,
      ...themeModePreload,
      ...devLoginSettings,
      ...(storedThemeName ? { themeName: storedThemeName } : {}),
      ...(storedThemeDensity ? { density: storedThemeDensity } : {}),
      ...(storedFontPreset ? { fontPreset: storedFontPreset } : {}),
    },
  };
const hostname = window.location.hostname;
const requestedLng = window.__SSR_LANG__ || window.navigator.language;
const desktopSearchParams = new URLSearchParams(window.location.search);
// Desktop mode must survive location.reload(): the ?noloDesktop=1 query param
// is stripped from the URL after first boot (below), so a reload would lose
// desktop mode if we only looked at the param. The embedded desktop server
// injects window.__NOLO_DESKTOP__ into every SSR response, so prefer that;
// the query param remains as a fallback for web previews of the desktop shell.
const isDesktopShell =
  (window as Window & { __NOLO_DESKTOP__?: boolean }).__NOLO_DESKTOP__ === true ||
  desktopSearchParams.get("noloDesktop") === "1";

type DesktopDiagnosticPayload = Record<string, unknown>;

const serializeDesktopDiagnosticValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
};

if (isDesktopShell) {
  document.documentElement.dataset.noloDesktop = "1";
  // Query-param previews must behave like the real shell: getIsDesktopApp()
  // reads this global, which only the embedded desktop server injects.
  (window as Window & { __NOLO_DESKTOP__?: boolean }).__NOLO_DESKTOP__ = true;

  // 劫持 console 桥接到 Electrobun 主进程
  const sendToHost = (window as any).__electrobunSendToHost;
  const sendDesktopDiagnostic = (event: string, payload: DesktopDiagnosticPayload = {}) => {
    if (typeof sendToHost !== "function") {
      return;
    }
    try {
      sendToHost({
        type: "nolo-desktop-diagnostic",
        event,
        payload: serializeDesktopDiagnosticValue(payload),
      });
    } catch {
      // ignore send error
    }
  };

  let lastInputDiagnosticAt = 0;
  let lastDesktopInputBreadcrumb: DesktopDiagnosticPayload | null = null;
  const readInputValueLength = (target: EventTarget | null) => {
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return target.value.length;
    }
    return undefined;
  };
  const createInputBreadcrumb = (event: Event): DesktopDiagnosticPayload => {
    const target = event.target instanceof Element ? event.target : document.activeElement;
    const inputEvent =
      typeof InputEvent !== "undefined" && event instanceof InputEvent ? event : null;
    return {
      eventType: event.type,
      inputType: inputEvent?.inputType,
      isComposing: inputEvent?.isComposing,
      inputValueLength: readInputValueLength(event.target),
      activeElementTag: target?.tagName?.toLowerCase() ?? null,
      activeElementRole: target?.getAttribute?.("role") ?? null,
      path: window.location.pathname,
      hash: window.location.hash,
      timestamp: Date.now(),
    };
  };
  const sendInputDiagnostic = (event: Event, force = false) => {
    lastDesktopInputBreadcrumb = createInputBreadcrumb(event);
    const now = Date.now();
    if (!force && now - lastInputDiagnosticAt < 500) {
      return;
    }
    lastInputDiagnosticAt = now;
    sendDesktopDiagnostic("renderer-input", lastDesktopInputBreadcrumb);
  };
  const installDesktopInputDiagnostics = () => {
    document.addEventListener("beforeinput", (event) => sendInputDiagnostic(event), true);
    document.addEventListener("input", (event) => sendInputDiagnostic(event), true);
    document.addEventListener("compositionstart", (event) => sendInputDiagnostic(event, true), true);
    document.addEventListener("compositionend", (event) => sendInputDiagnostic(event, true), true);
  };
  window.addEventListener("error", (event) => {
    sendDesktopDiagnostic("renderer-error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: serializeDesktopDiagnosticValue(event.error),
      lastInputBreadcrumb: lastDesktopInputBreadcrumb,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    sendDesktopDiagnostic("renderer-unhandledrejection", {
      reason: serializeDesktopDiagnosticValue(event.reason),
      lastInputBreadcrumb: lastDesktopInputBreadcrumb,
    });
  });
  installDesktopInputDiagnostics();

  if (typeof sendToHost === "function") {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    // Native marshal (sendToHost) is expensive on macOS 26 + electrobun and
    // high-frequency console forwarding can destabilize the webview bridge.
    // Batch console messages per microtask and flush once, drastically cutting
    // the number of native ScriptMessage round-trips.
    let pending: { level: string; args: any[] }[] = [];
    let flushScheduled = false;
    const MAX_ARG_CHARS = 2000;
    const serializeArg = (arg: unknown): unknown => {
      if (arg instanceof Error) {
        return { message: arg.message, stack: arg.stack, name: arg.name };
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          const json = JSON.stringify(arg);
          if (json.length > MAX_ARG_CHARS) {
            return json.slice(0, MAX_ARG_CHARS) + "…[truncated]";
          }
          return JSON.parse(json);
        } catch {
          return String(arg).slice(0, MAX_ARG_CHARS);
        }
      }
      if (typeof arg === "string" && arg.length > MAX_ARG_CHARS) {
        return arg.slice(0, MAX_ARG_CHARS) + "…[truncated]";
      }
      return arg;
    };
    const flush = () => {
      flushScheduled = false;
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      try {
        sendToHost({
          type: "nolo-desktop-console-batch",
          messages: batch,
        });
      } catch {
        // ignore send error
      }
    };
    const scheduleFlush = () => {
      if (flushScheduled) return;
      flushScheduled = true;
      // Flush on next macrotask so many console calls within one tick coalesce.
      setTimeout(flush, 0);
    };
    const wrapConsole = (level: string) => {
      return (...args: any[]) => {
        (originalConsole as any)[level].apply(console, args);
        try {
          pending.push({ level, args: args.map(serializeArg) });
          scheduleFlush();
        } catch {
          // ignore
        }
      };
    };
    console.log = wrapConsole("log");
    console.warn = wrapConsole("warn");
    console.error = wrapConsole("error");
    console.debug = wrapConsole("debug");
  }


  // Titlebar mode arrives via query param on first boot only; persist it so a
  // reload (param already stripped) keeps the same shell chrome offsets.
  let titlebarMode = desktopSearchParams.get("noloDesktopTitlebar");
  if (!titlebarMode) {
    try {
      titlebarMode = window.sessionStorage.getItem("noloDesktopTitlebar");
    } catch {
      // ignore sessionStorage access failures
    }
  }
  if (titlebarMode) {
    document.documentElement.dataset.noloDesktopTitlebar = titlebarMode;
    desktopSearchParams.delete("noloDesktopTitlebar");
    try {
      window.sessionStorage.setItem("noloDesktopTitlebar", titlebarMode);
    } catch {
      // ignore sessionStorage access failures
    }
  }
  desktopSearchParams.delete("noloDesktop");
  const nextSearch = desktopSearchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

// 创建浏览器端 store
const browserStore = createAppStore({
  dbInstance: getDb(),
  tokenManager: webTokenManager,
  preloadedState,
});
delete window.__PRELOADED_STATE__;

const domNode = document.getElementById("root") as HTMLElement;

(async () => {
  const lng = await loadClientLanguage(i18n, requestedLng);

  // 与 SSR 保持一致：优先使用服务端注入的 siteId；没有则自行判定
  const siteId: SiteId = window.__SITE_ID__ || detectSite(hostname);

  // hydrate 前预加载对应站点的路由，确保与 SSR 一致 -> 不闪烁
  const initialRoutes: RouteObject[] = await loadRoutes(siteId, undefined);

  const AppRoot = () => (
    <React.StrictMode>
      <Provider store={browserStore}>
        <RouterProvider>
          <App hostname={hostname} lng={lng} initialRoutes={initialRoutes} />
        </RouterProvider>
      </Provider>
    </React.StrictMode>
  );

  if (domNode.hasChildNodes()) {
    hydrateRoot(domNode, <AppRoot />);
  } else {
    createRoot(domNode).render(<AppRoot />);
  }

})();
