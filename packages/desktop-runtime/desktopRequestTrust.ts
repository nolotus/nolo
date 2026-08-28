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
 * Trusted Desktop same-origin browser request:
 * - NOLO_DESKTOP=1 (server process is Desktop host)
 * - request URL is loopback
 * - caller proves same-origin via Sec-Fetch-Site, x-nolo-desktop-tool,
 *   or exact Origin/Referer origin match
 *
 * Bare curl / cross-origin browser calls fail.
 */
export const isTrustedDesktopSameOriginRequest = (
  req: Request,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean => {
  if (env.NOLO_DESKTOP !== "1" || !isLoopbackRequest(req)) return false;

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
