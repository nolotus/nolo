// Auth reducer: 通过 identity/authReducer edition 注入。
// - Phase 5：cloud 与 local edition 都是 noop reducer（`auth` key 不再变化），
//   SSR 和客户端用同一个 reducer shape。
// - Migration boundary：`auth` key 只为 persisted/SSR root shape 存在，
//   永不保存 currentUser/currentToken/users/isLoggedIn/isInitialized 等
//   会话镜像字段；禁止新业务依赖（见
//   identity/authMigrationBoundary.source.test.ts 白名单）。
//
// ⚠️ 不能返回 null：SSR 端注入 "auth":{}，如果初始 state 是 null，
// hydrate 会拿到不一致的 shape。noop edition 返回空对象 {} 保持一致。
import { authReducer } from "identity/authReducer";
import databaseReducer from "database/dbSlice";
import settingReducer from "app/settings/settingSlice";

import tableReducer from "render/table/tableSlice";

import messageReducer from "chat/messages/messageSlice";

// Explicit Record type so composite/declaration checks do not require naming
// private slice state interfaces from other packages (TS4023).
// Using property getters guards against circular import TDZ during module evaluation.
export const reducer: Record<string, any> = {
  get message() { return messageReducer; },
  get auth() { return authReducer; },
  get db() { return databaseReducer; },
  get settings() { return settingReducer; },
  get table() { return tableReducer; },
};