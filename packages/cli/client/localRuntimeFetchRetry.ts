/**
 * Compatibility re-export for the shared fetch retry, plus the Node-only
 * loopback bypass.
 *
 * The retry core (fetchWithTransientRetry / budgeting / core_draining friendly
 * exhaustion) now lives in core/fetchWithTransientRetry so non-CLI clients
 * (e.g. packages/ai workspace read tools) share the exact same mechanism
 * without creating an ai → cli package dependency. Existing imports from
 * "./localRuntimeFetchRetry" and the "./localRuntimeAdapter" barrel keep
 * working unchanged.
 *
 * `defaultLoopbackRequest` intentionally stays here: it needs node:http(s),
 * which core (shared with browser/RN embeddings) cannot assume.
 */
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { FetchInput, FetchInit } from "core/fetchWithTransientRetry";
import { isLoopbackHostname } from "core/localOrigins";

export {
  fetchWithTransientRetry,
  isTransientFetchError,
} from "core/fetchWithTransientRetry";
export type {
  FetchInput,
  FetchInit,
  SharedFetchImpl,
  FetchWithTransientRetryOptions,
} from "core/fetchWithTransientRetry";

/**
 * Loopback URL check for fetch inputs (string | URL | Request).
 * Reuses core/localOrigins `isLoopbackHostname` so loopback detection stays
 * single-source. Request objects are unwrapped via `.url`.
 */
export function isLoopbackUrl(input: FetchInput) {
  try {
    const target =
      typeof input === "string" || input instanceof URL
        ? new URL(String(input))
        : new URL(input.url);
    return isLoopbackHostname(target.hostname);
  } catch {
    return false;
  }
}

function toNodeRequestBody(body: FetchInit["body"]) {
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return null;
}

export async function defaultLoopbackRequest(
  input: FetchInput,
  init?: FetchInit,
) {
  const target =
    typeof input === "string" || input instanceof URL
      ? new URL(String(input))
      : new URL(input.url);
  const headers = new Headers(init?.headers);
  const body = toNodeRequestBody(init?.body);
  if (body && !headers.has("Content-Length")) {
    headers.set("Content-Length", String(body.byteLength));
  }
  return await new Promise<Response>((resolve, reject) => {
    const requestImpl = target.protocol === "https:" ? httpsRequest : httpRequest;
    const req = requestImpl(
      target,
      {
        method: init?.method ?? "GET",
        headers: Object.fromEntries(headers.entries()),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        );
        res.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 500,
              headers: res.headers as Record<string, string>,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    init?.signal?.addEventListener(
      "abort",
      () => {
        req.destroy(
          init.signal?.reason instanceof Error
            ? init.signal?.reason
            : new Error("request aborted"),
        );
        reject(init.signal?.reason ?? new Error("request aborted"));
      },
      { once: true },
    );
    if (body) req.write(body);
    req.end();
  });
}
