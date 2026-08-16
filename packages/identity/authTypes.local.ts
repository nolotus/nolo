// Auth types: local edition 用最小化类型（无 token manager）。
// cloud edition 委托 auth/types。
//
// ⚠️ TokenManager 接口必须与 auth/types.ts 的 TokenManager 保持同步。
// 如果 cloud 侧加了新方法，这里必须同步加，否则 local edition 的 webTokenManager
// 会类型不匹配。reviewer 在 wave 5 审查中抓到了一次这样的遗漏。
export interface TokenManager {
  getTokens(): Promise<string[]>;
  storeToken(token: string): Promise<void>;
  removeToken(token: string): Promise<void>;
  initTokens(): Promise<string[]>;
}