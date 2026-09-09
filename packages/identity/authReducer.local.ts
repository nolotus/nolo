// Auth reducer: local edition 返回最小 auth state（空对象，不是 null）。
// cloud edition 是同一 noop reducer（Phase 5： Redux auth slice 已删除）。
//
// ── Migration boundary（迁移边界）─────────────────────────────────────────
// 这是一个迁移边界的空 reducer，不是扩展点：
// - 永不保存 currentUser / currentToken / users / isLoggedIn / isInitialized
//   等任何会话镜像字段（AuthReducerBoundaryState 是 Record<string, never>，
//   添加已知业务字段会直接 typecheck 失败）；
// - 禁止新业务代码依赖：只有白名单内的根 reducer 可以注册 `auth` key
//   （由 identity/authMigrationBoundary.source.test.ts 强制）。
//
// ⚠️ 不能返回 null：SSR 端 Bun 走 default（本文件）拿到 noopReducer，
// 如果初始 state 是 null，SSR 注入 "auth":null，客户端 hydrate 崩溃。
// 返回空对象 {} 让 SSR 和客户端都看到一致的 "auth":{}。
import type { Reducer } from "redux";

export type AuthReducerBoundaryState = Record<string, never>;

const emptyAuthState: AuthReducerBoundaryState = {};
const localAuthReducer: Reducer<AuthReducerBoundaryState> = (
  state = emptyAuthState,
  _action,
) => state;

export const authReducer = localAuthReducer;
export { authReducer as noopAuthReducer };
export default authReducer;
