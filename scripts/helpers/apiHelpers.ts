/**
 * 脚本通用 HTTP 工具
 * 被 setupDemoAgent.ts / agentRunDemo.ts / testWorkerE2E.ts 等复用
 */

import { toErrorMessage } from "core/errorMessage";

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
}

export interface ApiRequestOptions {
  timeoutMs?: number;
}

const HTTP_DEBUG =
  process.env.SCRIPTS_HTTP_DEBUG === "1" ||
  process.env.SCRIPTS_HTTP_DEBUG === "true";
const REMOTE_FETCH_TIMEOUT_MS = Number(process.env.SCRIPTS_REMOTE_TIMEOUT_MS ?? "30000");
const LOCAL_CURL_BODY_LIMIT = 8000;

function logHttp(message: string, extra?: unknown) {
  if (!HTTP_DEBUG) return;
  if (extra === undefined) {
    console.error(`[scripts:http] ${message}`);
    return;
  }
  console.error(`[scripts:http] ${message}`, extra);
}

function isLocalhostUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function shouldRetry(url: string, error: unknown, attempt: number) {
  if (attempt >= 2) return false;
  const message = toErrorMessage(error);
  if (isLocalhostUrl(url)) {
    return /Unable to connect|ConnectionRefused|ECONNREFUSED|Failed to connect/i.test(message);
  }
  return /Unable to connect|ConnectionRefused|ECONNREFUSED|Failed to connect|Was there a typo|timed out|Timeout|handshake|certificate|ECONNRESET|socket|network/i.test(message);
}

function readCurlResolveEntries(): string[] {
  return (process.env.SCRIPTS_CURL_RESOLVE ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function waitForLocalOriginReady(url: string): Promise<void> {
  if (!isLocalhostUrl(url)) return;

  const origin = new URL(url).origin;
  const probeUrl = `${origin}/api/agent/run`;
  let lastError = "";
  logHttp(`wait for local origin ${origin}`);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      logHttp(`probe ${probeUrl} attempt=${attempt + 1}`);
      const probe = Bun.spawn(["curl", "-sS", "-i", "-X", "OPTIONS", probeUrl], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(probe.stdout).text(),
        new Response(probe.stderr).text(),
        probe.exited,
      ]);
      if (exitCode === 0 && /HTTP\/[0-9.]+\s+(200|204)/.test(stdout)) {
        logHttp(`probe ok ${probeUrl}`);
        return;
      }
      if (exitCode !== 0) {
        lastError = `port unreachable or blocked for child curl: ${stderr.trim() || `curl exit ${exitCode}`}`;
      } else {
        lastError = `readiness endpoint did not return 200/204: ${stdout.trim() || "empty response"}`;
      }
    } catch (error) {
      lastError = toErrorMessage(error);
    }
    try {
      const fetchProbe = await fetch(probeUrl, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(1000),
      });
      if (fetchProbe.status === 200 || fetchProbe.status === 204) {
        logHttp(`fetch probe ok ${probeUrl}`);
        return;
      }
      lastError = `readiness endpoint returned ${fetchProbe.status}`;
    } catch (error) {
      const fetchError = toErrorMessage(error);
      lastError = `${lastError}; direct fetch probe failed: ${fetchError}`;
    }
    await Bun.sleep(250 * (attempt < 8 ? 1 : 2));
  }

  throw new Error(
    `Local dev server is unavailable at ${origin} while preparing ${url} (${lastError || "timeout"}). ` +
      "Check that the shared local dev server is running on the intended base URL and the same sandbox/escalation level as the script."
  );
}

export function buildCurlCommand(url: string, init?: RequestInit): string[] {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers ?? {});
  const command = ["curl", "-sS", "-L", "-X", method];

  for (const entry of readCurlResolveEntries()) {
    command.push("--resolve", entry);
  }

  headers.forEach((value, key) => {
    command.push("-H", `${key}: ${value}`);
  });

  if (typeof init?.body === "string" && init.body.length > 0) {
    command.push("--data", init.body);
  }

  command.push("-w", "\n__CODE__:%{http_code}", url);
  return command;
}

async function curlRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers ?? {});
  const command = buildCurlCommand(url, init);
  logHttp(`curl ${method} ${url}`);

  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    logHttp(`curl failed ${method} ${url}`, stderr.trim());
    throw new Error(stderr.trim() || `curl failed for ${url}`);
  }

  const marker = "\n__CODE__:";
  const index = stdout.lastIndexOf(marker);
  const body = index >= 0 ? stdout.slice(0, index) : stdout;
  const statusText = index >= 0 ? stdout.slice(index + marker.length).trim() : "0";
  const status = Number(statusText);

  return new Response(body, {
    status: Number.isFinite(status) ? status : 0,
    headers: { "Content-Type": headers.get("Content-Type") ?? "application/json" },
  });
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: ApiRequestOptions
): Promise<Response> {
  const useLocalFetch =
    isLocalhostUrl(url) &&
    typeof init?.body === "string" &&
    init.body.length > LOCAL_CURL_BODY_LIMIT;

  if (isLocalhostUrl(url) && !useLocalFetch) {
    try {
      return await curlRequest(url, init);
    } catch (error) {
      logHttp(`localhost request failed first attempt ${url}`, toErrorMessage(error));
      if (!shouldRetry(url, error, 0)) throw error;
      await waitForLocalOriginReady(url);
      return curlRequest(url, init);
    }
  }
  let attempt = 0;
  while (true) {
    try {
      logHttp(`fetch ${url}`);
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(options?.timeoutMs ?? REMOTE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      logHttp(`fetch failed ${url}`, toErrorMessage(error));
      if (!shouldRetry(url, error, attempt)) {
        if (!isLocalhostUrl(url)) return curlRequest(url, init);
        throw error;
      }
      if (isLocalhostUrl(url)) {
        await waitForLocalOriginReady(url);
      }
      attempt += 1;
      if (attempt >= 2 && !isLocalhostUrl(url)) return curlRequest(url, init);
      await Bun.sleep(500 * attempt);
    }
  }
}

export async function apiPost<T = any>(
  url: string,
  body: any,
  token = "",
  options?: ApiRequestOptions
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, options);
  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, ok: res.ok, data };
}

export async function apiDelete<T = any>(
  url: string,
  token: string
): Promise<ApiResponse<T>> {
  const res = await fetchWithRetry(url, {
    method: "DELETE",
    headers: { "Authorization": "Bearer " + token },
  });
  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, ok: res.ok, data };
}

export async function apiGet<T = any>(
  url: string,
  token = ""
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetchWithRetry(url, { headers });
  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, ok: res.ok, data };
}
