/** All remote MCP/OAuth traffic goes through this pinned, redirect-free transport.
 * No ambient proxy, cookies, fetch DNS cache or SDK auth discovery is used. */
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import type { McpPlacement } from "./mcpConnectionSpecs";

const denied4 = new BlockList();
for (const [ip, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3]] as const) denied4.addSubnet(ip, bits, "ipv4");
const global6 = new BlockList(); global6.addSubnet("2000::", 3, "ipv6");
const denied6 = new BlockList();
for (const [ip, bits] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) denied6.addSubnet(ip, bits, "ipv6");
export function isMcpPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return !denied4.check(address, "ipv4");
  return isIP(address) === 6 && !address.includes("%") && global6.check(address, "ipv6") && !denied6.check(address, "ipv6");
}
export type McpResolvedAddress = { address: string; family: number };
export type McpNetworkPolicyOptions = {
  placement: McpPlacement;
  /** Resolved from the saved endpointRef on THIS execution plane, never a model argument. */
  savedEndpoint: string;
  /** Trusted DNS seam for tests/host resolver; actual dial uses the returned IP literally. */
  resolve?: (hostname: string, signal?: AbortSignal) => Promise<McpResolvedAddress[]>;
  /** Trusted adapter hook, after DNS/body awaits and immediately before HTTP request.
   * Once request bytes are sent, cancellation cannot undo remote side effects. */
  beforeSend?(input: string | URL | Request, init?: RequestInit): Promise<void>;
  maxResponseBytes?: number; maxRequestBytes?: number; timeoutMs?: number;
};
export interface McpNetworkPolicy {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}
function urlOf(value: string): URL {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash || url.href.length > 16384) throw 0;
    return url;
  } catch { throw new Error("network_denied"); }
}
/** Public HTTPS requests may target OAuth-discovered hosts. Nonpublic targets are
 * permitted ONLY on local/machine and ONLY the explicitly saved endpoint origin.
 * Metadata/link-local/multicast/unspecified addresses remain denied on all planes. */
export function createMcpNetworkPolicy(options: McpNetworkPolicyOptions): McpNetworkPolicy {
  const saved = urlOf(options.savedEndpoint);
  const resolve = options.resolve ?? (async hostname => lookup(hostname, { all: true, verbatim: true }));
  const maxResponse = options.maxResponseBytes ?? 2 * 1024 * 1024;
  const maxRequest = options.maxRequestBytes ?? 256 * 1024;
  const timeoutMs = options.timeoutMs ?? 30_000;
  return { async fetch(input, init) {
    const req = input instanceof Request ? input : undefined;
    const url = urlOf(req ? req.url : String(input));
    const signal = AbortSignal.any([...(init?.signal ?? req?.signal ? [init?.signal ?? req!.signal] : []), AbortSignal.timeout(timeoutMs)]);
    signal?.throwIfAborted();
    if (options.placement.kind === "server" && url.protocol !== "https:") throw new Error("network_denied");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await new Promise<McpResolvedAddress[]>((done, reject) => {
      const abort = () => reject(new Error(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled"));
      signal.addEventListener("abort", abort, { once: true });
      resolve(host, signal).then(done, reject).finally(() => signal.removeEventListener("abort", abort));
    });
    signal?.throwIfAborted();
    if (!addresses.length || addresses.length > 32) throw new Error("network_denied");
    for (const entry of addresses) {
      if (entry.family !== isIP(entry.address) || !entry.family) throw new Error("network_denied");
      if (isMcpPublicAddress(entry.address)) continue;
      const lan = new BlockList();
      for (const [ip, bits] of [["10.0.0.0", 8], ["127.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16]] as const) lan.addSubnet(ip, bits, "ipv4");
      lan.addAddress("::1", "ipv6"); lan.addSubnet("fc00::", 7, "ipv6");
      if (options.placement.kind === "server" || url.origin !== saved.origin || !lan.check(entry.address, entry.family === 4 ? "ipv4" : "ipv6")) throw new Error("network_denied");
    }
    if (url.protocol === "http:" && url.origin !== saved.origin) throw new Error("network_denied");
    const headers = new Headers(init?.headers ?? req?.headers);
    for (const key of ["host", "connection", "transfer-encoding", "content-length", "proxy-authorization", "cookie", "accept-encoding"]) headers.delete(key);
    headers.set("host", url.host); headers.set("accept-encoding", "identity");
    const body = init?.body ?? (req?.body ? await req.arrayBuffer() : undefined);
    let bytes: Uint8Array | undefined;
    if (body != null) {
      if (typeof body === "string") bytes = new TextEncoder().encode(body);
      else if (body instanceof URLSearchParams) bytes = new TextEncoder().encode(body.toString());
      else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
      else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      else throw new Error("limit_exceeded");
      if (bytes.byteLength > maxRequest) throw new Error("limit_exceeded");
    }
    await options.beforeSend?.(input, init);
    signal.throwIfAborted();
    return await new Promise<Response>((resolveResponse, reject) => {
      const address = addresses[0]!;
      // Literal IP dial + original SNI/certificate identity + Host. DNS cannot be
      // queried a second time between validation and connect (including Bun).
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)({
        hostname: address.address, family: address.family, port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: isIP(host) ? undefined : host, path: url.pathname + url.search,
        method: init?.method ?? req?.method ?? "GET", headers: Object.fromEntries(headers), agent: false,
        ...(url.protocol === "https:" ? { rejectUnauthorized: true } : {}),
      }, response => {
        const status = response.statusCode ?? 500;
        if (status >= 300 && status < 400) { response.destroy(); request.destroy(); cleanup(); reject(new Error("network_denied")); return; }
        if (Number(response.headers["content-length"] ?? 0) > maxResponse || (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) { response.destroy(); cleanup(); reject(new Error("limit_exceeded")); return; }
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
        let total = 0;
        let finished = false;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            response.on("data", (chunk: Buffer) => { total += chunk.length; if (total > maxResponse) { finished = true; controller.error(new Error("limit_exceeded")); response.destroy(); cleanup(); } else { controller.enqueue(new Uint8Array(chunk)); response.pause(); } });
            response.on("end", () => { cleanup(); if (!finished) { finished = true; controller.close(); } });
            response.on("error", error => { cleanup(); if (!finished) { finished = true; controller.error(error); } });
            response.on("close", () => { cleanup(); if (!finished) { finished = true; controller.error(new Error("transport_error")); } });
          },
          pull() { response.resume(); },
          cancel() { finished = true; response.destroy(); request.destroy(); cleanup(); },
        });
        resolveResponse(new Response([204, 205, 304].includes(status) ? null : stream, { status, headers: responseHeaders }));
      });
      const abort = () => request.destroy(new Error(signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled"));
      const timer = setTimeout(() => request.destroy(new Error("timeout")), timeoutMs);
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
      signal?.addEventListener("abort", abort, { once: true });
      request.on("error", error => { cleanup(); reject(error); });
      if (bytes) request.write(bytes);
      request.end();
    });
  } };
}
