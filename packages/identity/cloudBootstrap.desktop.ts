// Desktop bootstrap: the desktop edition keeps the local edition's no-op
// cookie/bootstrapped-state behavior (the webview origin is the local
// runtime; the web auth cookie does not apply cross-origin), but swaps in the
// REAL desktop token manager so the composed account session imports the
// trusted profile token through GET /api/desktop/auth/session exactly once.
//
// 从 cloudBootstrap.local 直接导入（相对路径不走 package.json 条件导出）。
export {
  syncWebAuthTokenCookie,
  readBootstrappedAuthState,
} from "./cloudBootstrap.local";
export { desktopTokenManager as webTokenManager } from "./session/desktopTokenManager";
