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
