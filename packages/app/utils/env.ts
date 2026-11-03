//  app/utils/fileUtils.ts
export const isBrowser = typeof window !== "undefined";
const processEnv = typeof process !== "undefined" ? process.env : undefined;
const reactNativeDev =
  typeof globalThis !== "undefined" && "__DEV__" in globalThis
    ? (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__
    : undefined;

export const isProduction =
  processEnv?.NOLO_FORCE_PRODUCTION === "1" ||
  processEnv?.NODE_ENV === "production" ||
  reactNativeDev === false;
export const isDevelopment = !isProduction;
/** UI-only preview, restricted to loopback development; grants no native capability. */
export const getIsDesktopPreview = (): boolean =>
  isDevelopment && typeof window !== "undefined" &&
  ["127.0.0.1", "localhost", "[::1]"].includes(window.location?.hostname) &&
  new URLSearchParams(window.location.search).get("desktop") === "1";

/**
 * 真桌面壳判据：只由宿主注入的环境变量 / 注入标记决定。
 * `?desktop=1` 预览**不**参与——它曾经被 OR 进来，于是 loopback 开发页
 * 一个查询参数就让 49 个消费方以为自己跑在桌面壳里（挂工作区工具、决定 cwd、
 * 写项目绑定、分流 `/api/desktop/*`），等于给普通浏览器开了原生能力。
 */
export const getIsDesktopApp = (): boolean =>
  (typeof process !== "undefined" ? process.env?.NOLO_DESKTOP : processEnv?.NOLO_DESKTOP) === "1" ||
  (typeof window !== "undefined" &&
    (window as Window & { __NOLO_DESKTOP__?: boolean }).__NOLO_DESKTOP__ === true);
export const isDesktopApp = getIsDesktopApp();

/**
 * 桌面**外观**判据：真桌面壳，或 loopback 开发下显式的 `?desktop=1` 预览。
 *
 * 只允许纯渲染 / 布局调用点使用（页面骨架、侧栏、菜单项、空状态）。
 * 任何决定能力面的调用点——工具挂载、cwd、项目绑定、`/api/desktop/*` 分流、
 * 本地 connector 自启——必须继续用 `getIsDesktopApp()`。
 */
export const getIsDesktopUiPreview = (): boolean =>
  getIsDesktopApp() || getIsDesktopPreview();
