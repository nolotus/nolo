// Cloud bootstrap: local edition no-op。
// 公开集（local）无需 token cookie 同步或 auth state bootstrap。
// 函数签名需匹配 cloud edition（消费方传参调用）。
// 从 authTypes.local 直接导入（相对路径不走 package.json 条件导出）。
import type { TokenManager } from "./authTypes.local";

export const syncWebAuthTokenCookie = (_tokens: readonly string[]): void => {};
export const readBootstrappedAuthState = (
  _storage: Pick<Storage, "getItem">,
): null => null;

const noopTokenManager: TokenManager = {
  getTokens: async () => [],
  storeToken: async (_token: string) => {},
  removeToken: async (_token: string) => {},
  initTokens: async () => [],
};
export const webTokenManager = noopTokenManager;