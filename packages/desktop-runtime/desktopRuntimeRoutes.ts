import { createApiRouteFamily } from "./apiRouteAdapter";
import { createLazyLoader, lazyHandler } from "./lazyLoader";

// --- 桌面运行时路由懒加载 ---
// desktopRuntimeRoutes 静态 import 了 10 个桌面专属 handler 文件（16 个函数），
// 其中 desktopAgentRuntimeTurnHandler 会传递
// 引入 agent-runtime 的部分子模块。这些路由只在 NOLO_DESKTOP=1 桌面进程内被命中，
// 远端生产服务器一次都不会用。
const loadDesktopRuntimeHandlers = createLazyLoader(
  () => import("./handlers/desktopRuntimeHandlers"),
);
const d = (key: string) => lazyHandler(loadDesktopRuntimeHandlers, key as any);

// desktopLocalConnectorHandler 有独立的加载路径（不进聚合入口）
const loadDesktopLocalConnector = createLazyLoader(
  () => import("./handlers/desktopLocalConnectorHandler"),
);

export const prewarmDesktopRuntimeRoutes = (): void => {
  if (process.env.NOLO_DESKTOP !== "1") return;
  loadDesktopRuntimeHandlers().catch((error) => {
    console.error("[prewarm] desktop runtime routes preload failed:", error);
  });
};

export const desktopRuntimeRoutes: Record<string, any> = createApiRouteFamily([
  { path: "/api/desktop-updater", handlers: { GET: d("handleDesktopUpdaterGet"), POST: d("handleDesktopUpdaterPost") } },
  { path: "/api/desktop/clipboard", handlers: { POST: d("handleDesktopClipboardPost") } },
  { path: "/api/desktop/preview/open", handlers: { POST: d("handleDesktopPreviewOpenPost") } },
  { path: "/api/desktop/credentials", enableCors: false, handlers: { POST: d("handleDesktopCredentialsPost") } },
  { path: "/api/desktop/pick-folder", handlers: { POST: d("handleDesktopPickFolder") } },
  { path: "/api/desktop/chrome-connector/status", handlers: { GET: d("handleDesktopChromeConnectorStatusGet") } },
  { path: "/api/desktop/chrome-connector/install-native-host", handlers: { POST: d("handleDesktopChromeConnectorInstallNativeHostPost") } },
  { path: "/api/desktop/chrome-connector/smoke-test", handlers: { POST: d("handleDesktopChromeConnectorSmokeTestPost") } },
  { path: "/api/desktop/auth/session", enableCors: false, handlers: { GET: d("handleDesktopAuthSessionGet") } },
  { path: "/api/desktop/oauth/:provider/status", enableCors: false, handlers: { GET: d("handleDesktopOAuthStatusGet") } },
  { path: "/api/desktop/oauth/:provider/start", enableCors: false, handlers: { POST: d("handleDesktopOAuthStartPost") } },
  { path: "/api/desktop/oauth/:provider", enableCors: false, handlers: { DELETE: d("handleDesktopOAuthDelete") } },
  { path: "/api/desktop/agent-runtime/turn", enableCors: false, handlers: { POST: d("handleDesktopAgentRuntimeTurnPost") } },
  { path: "/api/desktop/local-connector/start", handlers: { POST: lazyHandler(loadDesktopLocalConnector, "handleDesktopLocalConnectorStart") } },
]);