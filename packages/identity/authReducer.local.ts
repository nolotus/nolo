// Auth reducer: local edition 返回最小 auth state（空对象，不是 null）。
// cloud edition 委托 auth/authSlice。
//
// ⚠️ 不能返回 null：SSR 端 Bun 走 default（本文件）拿到 noopReducer，
// 如果初始 state 是 null，SSR 注入 "auth":null，客户端 hydrate 崩溃。
// 返回空对象 {} 让 SSR 和客户端都看到一致的 "auth":{}。
import type { Reducer } from "redux";

const emptyAuthState = {};
const localAuthReducer: Reducer<Record<string, never>> = (
  state = emptyAuthState,
  _action,
) => state;

export const authReducer = localAuthReducer;
export default authReducer;