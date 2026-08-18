import { toErrorMessage } from "core/errorMessage";

type FetchLike = (
  input: string | URL | Request,
  init?: BunFetchRequestInit
) => Promise<Response>;

type HttpReadyDeps = {
  fetchImpl?: FetchLike;
  curlProbe?: (url: string) => Promise<boolean>;
};

const HTTP_READY_DEBUG =
  process.env.NOLO_HTTP_READY_DEBUG === "1" ||
  process.env.NOLO_HTTP_READY_DEBUG === "true";

function debugHttpReady(message: string, extra?: unknown) {
  if (!HTTP_READY_DEBUG) return;
  if (extra === undefined) {
    console.error(`[http-ready] ${message}`);
    return;
  }
  console.error(`[http-ready] ${message}`, extra);
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

async function defaultCurlProbe(url: string): Promise<boolean> {
  const proc = Bun.spawn(
    ["curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "-X", "OPTIONS", url],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) return false;
  const status = Number(stdout.trim());
  return status >= 200 && status < 400;
}

export async function checkHttpReady(origin: string, deps: HttpReadyDeps = {}): Promise<boolean> {
  const readyUrl = `${origin}/api/agent/run`;
  const fetchImpl: FetchLike = deps.fetchImpl ?? fetch;
  const curlProbe = deps.curlProbe ?? defaultCurlProbe;

  try {
    const res = await fetchImpl(readyUrl, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(3000),
    });
    debugHttpReady(`fetch ${readyUrl}`, { status: res.status });
    if (res.status === 200 || res.status === 204) {
      return true;
    }
  } catch (error) {
    debugHttpReady(`fetch failed ${readyUrl}`, toErrorMessage(error));
    // Fall through to localhost curl fallback below.
  }

  if (!isLocalhostOrigin(origin)) return false;
  const curlReady = await curlProbe(readyUrl);
  debugHttpReady(`curl ${readyUrl}`, { ready: curlReady });
  return curlReady;
}
