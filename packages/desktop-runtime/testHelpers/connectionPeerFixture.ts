// packages/desktop-runtime/testHelpers/connectionPeerFixture.ts
// Kept in sync with packages/server/testHelpers/connectionPeerFixture.ts.
//
// 测试夹具：isLoopbackRequest 以真实连接对端地址（server.requestIP）判定，而非 Host 头。
// 单元测试用合成 Request，没有真实 socket，故需注入一个 fake Bun server。
//
// 本夹具按请求 URL 的主机名推导对端：loopback URL（localhost/127.0.0.1/::1）↔ 本机对端
// 127.0.0.1，其余 ↔ 远程对端 203.0.113.5。这精确复刻真实连接语义，让“本机放行 / 远程拒绝”
// 两类用例都按预期工作（等价于旧 Host 版判定的行为，但走新的对端地址路径）。
//
// 用法：在**每个需要的 describe 内部**调用一次 installConnectionPeerFixture()。
// 切勿在模块顶层（describe 外）调用——那会注册成 root hook，多文件同跑时跨文件串扰。
import { afterEach, beforeEach } from "bun:test";

export const LOOPBACK_PEER = "127.0.0.1";
export const REMOTE_PEER = "203.0.113.5";

export function installConnectionPeerFixture() {
  let original: unknown;
  beforeEach(() => {
    original = (globalThis as any).__httpServer;
    (globalThis as any).__httpServer = {
      requestIP: (req: Request) => {
        let hostname = "";
        try {
          hostname = new URL(req.url).hostname.toLowerCase();
        } catch {
          hostname = "";
        }
        const loopback =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1";
        return {
          address: loopback ? LOOPBACK_PEER : REMOTE_PEER,
          family: "IPv4",
          port: 1,
        };
      },
    };
  });
  afterEach(() => {
    if (original === undefined) delete (globalThis as any).__httpServer;
    else (globalThis as any).__httpServer = original;
  });
}
