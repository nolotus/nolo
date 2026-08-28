// packages/server/requestRemoteAddress.ts
//
// 真实连接对端地址（不可被 Host 头伪造），用于 loopback 等信任决策。
//
// 背景：loopback 判定若基于 URL/Host 头，远程攻击者发 `Host: localhost` 即可冒充本机，
// 绕过基于 loopback 的鉴权豁免。正确依据是真实 TCP 对端地址，Bun 通过
// `server.requestIP(req)` 提供。entry.ts 在 Bun.serve 后把 server 写入
// `globalThis.__httpServer`（hot-reload 也复用该全局），此处据此读取，避免改动各处签名。
//
// Fail-closed：拿不到 server 或对端地址（如合成请求/测试环境未注入 server）时返回 null，
// 下游 isLoopbackAddress(null) 返回 false——宁可拒绝也不放行。

type ServerLike = {
  requestIP?: (req: Request) => { address?: string } | null;
};

const getServer = (): ServerLike | undefined =>
  (globalThis as { __httpServer?: ServerLike }).__httpServer;

/** 返回真实 TCP 对端地址；拿不到时返回 null（fail-closed）。 */
export const getRequestRemoteAddress = (req: Request): string | null => {
  try {
    return getServer()?.requestIP?.(req)?.address ?? null;
  } catch {
    return null;
  }
};

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** 纯函数：判断一个对端地址是否 loopback。null → false（fail-closed）。 */
export const isLoopbackAddress = (address: string | null): boolean =>
  address != null && LOOPBACK_ADDRESSES.has(address.toLowerCase());
