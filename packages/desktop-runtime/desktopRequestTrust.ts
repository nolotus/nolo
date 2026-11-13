/**
 * Shared trust checks for Desktop-local HTTP bridges.
 * Loopback connection peer (real remote address) + same-origin browser provenance
 * (not process identity alone).
 */

import {
  getRequestRemoteAddress,
  isLoopbackAddress,
} from "./requestRemoteAddress";

/**
 * True when the request originates from a loopback connection peer.
 *
 * Security: 判定依据是真实 TCP 对端地址（server.requestIP），而非 URL/Host 头。
 * Host 头可被远程攻击者伪造（发 `Host: localhost` 即可），若据它判定 loopback，
 * 远程攻击者就能冒充本机、绕过基于 loopback 的鉴权豁免。拿不到对端地址时 fail-closed。
 */
export const isLoopbackRequest = (req: Request): boolean =>
  isLoopbackAddress(getRequestRemoteAddress(req));

/**
 * True when the request carries an edge-proxy marker, i.e. it arrived through the
 * deployment's public reverse proxy (Caddy) rather than a direct local client.
 *
 * Security: 公网入口是 Caddy，它 `header_up -X-Nolo-Client-IP` 先删除客户端自带值，
 * 再 `header_up X-Nolo-Client-IP {remote_host}` / `X-Real-IP {remote_host}` 写入真实
 * 客户端地址（scripts/release/configureCaddyProxy.sh）。因此这些标记在经 Caddy 的
 * 请求上必然存在且不可由外部客户端伪造；直连本地请求则没有这些标记。
 *
 * 为什么必须检查：生产 NOLO_DESKTOP=1 时 Bun 监听 0.0.0.0，Caddy 以 127.0.0.1 回源，
 * 于是公网请求在 `isLoopbackRequest` 看来也是 loopback。若只凭 loopback 放行，
 * 公网反代就能绕过本地信任。故 loopback 只是必要条件，还必须「无代理标记」。
 */
export const isProxiedRequest = (req: Request): boolean =>
  Boolean(
    (req.headers.get("x-nolo-client-ip") ?? "").trim() ||
      (req.headers.get("x-real-ip") ?? "").trim() ||
      (req.headers.get("x-forwarded-for") ?? "").trim(),
  );

/**
 * Trusted Desktop same-origin browser request:
 * - NOLO_DESKTOP=1 (server process is Desktop host)
 * - request originates from a real loopback connection peer
 * - request did NOT arrive through the public reverse proxy (no proxy marker)
 * - caller proves same-origin via Sec-Fetch-Site, x-nolo-desktop-tool,
 *   or exact Origin/Referer origin match
 *
 * Bare curl / cross-origin browser calls fail. 经 Caddy 的公网请求即使伪造
 * `Sec-Fetch-Site: same-origin` / `x-nolo-desktop-tool: 1` / Origin，也会因携带
 * 代理标记而被拒绝——同源头可由外部客户端伪造，不能单独作为宿主控制证据。
 */
export const isTrustedDesktopSameOriginRequest = (
  req: Request,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean => {
  if (env.NOLO_DESKTOP !== "1" || !isLoopbackRequest(req)) return false;
  if (isProxiedRequest(req)) return false;

  const secFetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (secFetchSite === "same-origin") return true;
  if ((req.headers.get("x-nolo-desktop-tool") ?? "") === "1") return true;

  let requestOrigin = "";
  try {
    requestOrigin = new URL(req.url).origin;
  } catch {
    return false;
  }

  const origin = req.headers.get("origin");
  if (origin && origin === requestOrigin) return true;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  return false;
};
