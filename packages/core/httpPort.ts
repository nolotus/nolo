// packages/core/httpPort.ts
//
// HTTP_PORT 的解析与 fail-closed 校验。
//
// 为什么需要这个模块（2026-10-26 事故）：
//   entry.ts 曾经写 `Number(process.env.HTTP_PORT ?? 80)`。端口没传时静默退到 80，
//   而 alpha 上 80 被 caddy 占着 —— 进程启动后撞 EADDRINUSE 反复重启，运维只看到
//   「进程在崩」，看不出根因是「少传了一个参数」。当天就是手工 `pm2 start` 漏了
//   HTTP_PORT，导致 38123 槽位空了一段、公网入口全部超时。
//
// 与 core/runtimeRole.ts 同一条原则：PM2 托管的进程必须显式声明关键配置，
// 缺省一律 fail-closed —— 报错可见，绝不猜一个默认值把请求送到别处。
//
// 为什么不能一刀切禁掉 80：
//   desktop-runtime 有自己的 entry，确实要 80；本地 dev 也不该受影响。
//   因此只在「PM2 托管 + 服务端（非 desktop）」时才强制显式端口。

/** PM2 托管判据复用 core/runtimeRole.ts，避免两处实现漂移。 */
import { isPm2Managed } from "./runtimeRole";

export const HTTP_PORT_ENV = "HTTP_PORT";

function isDesktopMode(env: Record<string, string | undefined>): boolean {
  return env.NOLO_DESKTOP === "1";
}

/**
 * 解析本进程应监听的 HTTP 端口。
 *
 * - 显式给了 HTTP_PORT：校验是 0..65535 的整数，合法即用（0 = 由 OS 分配临时端口）
 * - 没给：PM2 托管且非 desktop → 抛错拒绝启动（fail-closed）
 *          其余场景（本地 dev / desktop / CLI）→ 沿用历史默认 80
 *
 * 抛错发生在 bootstrap 早期，进程直接退出，不会进入「撞端口 → 反复重启」的
 * 静默失败形态。
 */
export function resolveHttpPort(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env[HTTP_PORT_ENV];
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  if (trimmed === "") {
    if (isPm2Managed(env) && !isDesktopMode(env)) {
      throw new Error(
        `PM2 托管进程缺少 ${HTTP_PORT_ENV}：拒绝以默认端口 80 启动 —— ` +
          `2026-10-26 事故中，漏传该变量导致进程抢占 caddy 的 80 端口，` +
          `槽位反复重启、公网入口超时。请通过部署脚本启动槽位（会显式声明端口）。`
      );
    }
    return 80;
  }

  const port = Number(trimmed);
  // 0 是合法值：表示由 OS 分配临时端口（Bun.serve port:0），测试与本地探针常用。
  // 这与「漏传 HTTP_PORT」是两件事——漏传是 undefined，走上面的 fail-closed 分支。
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(
      `非法的 ${HTTP_PORT_ENV}="${trimmed}"：必须是 0..65535 的整数（0 = 由 OS 分配端口）。`
    );
  }
  return port;
}
