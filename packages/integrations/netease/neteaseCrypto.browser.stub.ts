/**
 * 网易云加解密模块的浏览器侧 stub。
 *
 * 真实实现 `neteaseCrypto.ts` 依赖 `node:crypto` 与 Buffer，只有桌面端音乐功能会用到；
 * 但 web 入口的依赖图会经 desktop-runtime 走到它，`platform:browser` 构建时
 * `node:crypto` 解析失败，整条 web bundle 直接构建不出来
 * （2026-11-03 实测：alpha 推送被 web bundle 护栏拦下，先报
 *  `packages/integrations/netease/neteaseCrypto.ts:1: Could not resolve "node:crypto"`）。
 *
 * 按仓库既有范式（见 `packages/agent-runtime/*.browser.stub.ts`）在
 * `scripts/dev/esbuild.config.js` 里把真实模块重定向到这里。
 *
 * 浏览器确实没有实现这些算法，所以这里**显式抛错**而不是返回假数据：
 * 静默返回空串会变成「请求发出去了但签名是错的」这种更难查的故障。
 */
export type NeteaseEncryptedPayload = {
  params: string;
  encSecKey: string;
};

const BROWSER_UNSUPPORTED =
  "[netease] 加解密只在桌面端提供（依赖 node:crypto），浏览器侧不可用。";

export const NETEASE_RSA_MODULUS_HEX = "";
export const NETEASE_RSA_EXPONENT_HEX = "";
export const WEAPI_PRESET_KEY = "";
export const WEAPI_IV = "";
export const WEAPI_SECRET_KEY = "";
export const EAPI_SECRET_KEY = "";
export const EAPI_IV = "";

export function buildRsaPublicKeyPem(_modulusHex: string, _exponentHex: string): string {
  throw new Error(BROWSER_UNSUPPORTED);
}

export function rsaModPow(_base: string, _exponent: string, _modulus: string): string {
  throw new Error(BROWSER_UNSUPPORTED);
}

export function weapiEncrypt(_data: Record<string, unknown>): NeteaseEncryptedPayload {
  throw new Error(BROWSER_UNSUPPORTED);
}

export function eapiEncrypt(
  _url: string,
  _data: Record<string, unknown>,
): NeteaseEncryptedPayload {
  throw new Error(BROWSER_UNSUPPORTED);
}
