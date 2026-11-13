// 文件路径: app/constants/routePaths.ts

/**
 * 应用中所有路由路径的枚举
 */
export enum AppRoutePaths {
  LOGIN = "/login",
  CLI_AUTHORIZE = "/cli/authorize",
  SIGNUP = "/signup",
  INVITE_SIGNUP = "/invite-signup",
  SPACE_INVITE = "/space/invite",
  GUIDE = "/guide",
  CHAT = "/chat",
  CLIENT_DOWNLOADS = "/downloads",
  NOTIFICATIONS = "/notifications",
}

/**
 * 反馈入口：/chat 的 `launch` 白名单 slug 之一，
 * 直达内置反馈 agent（见 app/pages/quickChatFlow 的 QUICK_CHAT_LAUNCH_SPECIALISTS）。
 */
export const QUICK_CHAT_FEEDBACK_LAUNCH_PATH = `${AppRoutePaths.CHAT}?launch=feedback`;

/**
 * 新增应用与模板入口：/chat 的 `launch` 白名单 slug，
 * 直达内置应用构建 agent（BUILTIN_APP_BUILDER_AGENT_KEY）。
 */
export const QUICK_CHAT_CREATE_APP_LAUNCH_SLUG = "create-app";
export const QUICK_CHAT_CREATE_APP_SURF_LAUNCH_SLUG = "create-app-surf";

/**
 * 主路由树 catch-all（404）路由的 id 标识。
 * 客户端在 app/web/routes.tsx 注册，服务端在 server/render.tsx 用它判定 404。
 */
export const NOT_FOUND_ROUTE_ID = "not-found";

/**
 * `:pageKey` 兜底路由（单段对象 key：page/dialog/agent 等）的 id 标识。
 * 服务端用它把这类页面标为 noindex（不查库无法判断 key 真伪，但都不是公开页）。
 */
export const PAGE_KEY_ROUTE_ID = "page-key";

export const QUICK_CHAT_CREATE_APP_LAUNCH_PATH = `${AppRoutePaths.CHAT}?launch=${QUICK_CHAT_CREATE_APP_LAUNCH_SLUG}`;
export const QUICK_CHAT_CREATE_APP_SURF_LAUNCH_PATH = `${AppRoutePaths.CHAT}?launch=${QUICK_CHAT_CREATE_APP_SURF_LAUNCH_SLUG}`;
