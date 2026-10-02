// packages/ai/agent/foregroundTurnAdmissionFetch.ts
//
// Browser admission hardening for server-owned foreground turns.
//
// A normal fetch may be cancelled while Chrome is unloading/reloading the page,
// before /api/agent/run has even finished reading its JSON request body. In that
// pre-admission window there is no dialog/execution identity yet, so durable
// foreground recovery cannot help. Fetch keepalive lets a small already-started
// POST finish transmitting after page unload.
//
// Fetch keepalive has a browser-defined payload budget (commonly 64 KiB across
// in-flight keepalive requests). Stay below it deliberately; large turns keep
// the existing fetch semantics instead of failing synchronously with a
// keepalive quota error.

export const FOREGROUND_TURN_KEEPALIVE_MAX_BODY_BYTES = 60 * 1024;

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function shouldKeepForegroundTurnAdmissionAlive(
  serializedBody: string,
): boolean {
  return (
    serializedBody.length > 0 &&
    getUtf8ByteLength(serializedBody) <= FOREGROUND_TURN_KEEPALIVE_MAX_BODY_BYTES
  );
}

export function buildForegroundTurnAdmissionFetchInit(args: {
  body: string;
  headers: HeadersInit;
  signal?: AbortSignal;
}): RequestInit {
  return {
    method: "POST",
    headers: args.headers,
    body: args.body,
    ...(args.signal ? { signal: args.signal } : {}),
    ...(shouldKeepForegroundTurnAdmissionAlive(args.body)
      ? { keepalive: true }
      : {}),
  };
}
