/**
 * Phase-aware budgets for one getConvMsgs exchange, in ms.
 *
 * A single 5000ms deadline used to cover request start through the body being
 * fully parsed. A large history on a slow link cannot be read in 5s, so the
 * exchange was aborted mid-body and the caller got the same `[]` it uses for
 * "server has no more messages": the local merge never picked up the newest
 * replies and a reentry turn stayed stuck on "正在接回回复…" (US 063f41228).
 *
 * The deadline is therefore split by progress instead of by total duration:
 *  - connectMs: request start → response headers. This is NOT only network
 *    reachability: getConvMsgs can assemble a large history server-side before
 *    it sends any header, so a 5s budget sat inside server think-time and
 *    aborted healthy large dialogs (the same silent `[]` symptom as the total
 *    deadline it replaced). 15s keeps a dead endpoint visible while leaving
 *    room for server-side assembly. The value is not yet measured against
 *    production traffic — calibrate it from `phase=connect` watchdog logs.
 *  - stallMs: max gap between two consecutive body chunks once bytes flow.
 *    Progress buys time, so a big-but-healthy download is never mistaken for a
 *    frozen one; only a connection that stops delivering is cut. 10s is well
 *    above any healthy inter-chunk gap and still short enough that a genuinely
 *    frozen tab recovers without a reload.
 *  - totalMs: absolute ceiling so a pathological endless trickle cannot hold a
 *    caller (and the recovery UI) forever. 2 min is 12x the stall budget and
 *    leaves headroom for a multi-MB history even on a ~100KB/s link.
 */
export const FETCH_BUDGETS = {
  connectMs: 15000,
  stallMs: 10000,
  totalMs: 120000,
} as const;

type WatchdogCause = "connect-timeout" | "stall-timeout" | "total-timeout";

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/**
 * Reads the whole body as JSON text while reporting each chunk's size to
 * `onChunk`. `response.json()` gives no body progress, and the watchdog around
 * it needs a tick per received chunk to tell "slow" from "frozen".
 */
const readJsonBody = async (
  response: Response,
  onChunk: (byteLength: number) => void,
): Promise<unknown> => {
  const body = response.body;
  if (!body) {
    // Nothing to observe (exotic or already consumed body): fall back to the
    // platform parse; the total budget still bounds it from the outside.
    return await response.json();
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      text += decoder.decode(value, { stream: true });
      onChunk(value.byteLength);
    }
  }
  text += decoder.decode();
  return JSON.parse(text);
};

export const fetchConvMsgs = async (
  server: string,
  token: string,
  {
    dialogId,
    dialogKey,
    limit,
    beforeKey,
  }: { dialogId: string; dialogKey?: string; limit?: number; beforeKey?: string },
  options: { signal?: AbortSignal } = {}
) => {
  const { signal: externalSignal } = options;

  const controller = new AbortController();
  const startedAt = now();
  let phase: "connect" | "body" = "connect";
  let receivedBytes = 0;
  let receivedChunks = 0;
  // Written only by the internal watchdogs. An external abort leaves it null so
  // the catch block can keep "we gave up" apart from "the user navigated away"
  // (the latter must keep re-throwing).
  let watchdogCause: WatchdogCause | null = null;

  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const clearConnectTimer = () => {
    if (connectTimer !== undefined) {
      clearTimeout(connectTimer);
      connectTimer = undefined;
    }
  };
  const clearStallTimer = () => {
    if (stallTimer !== undefined) {
      clearTimeout(stallTimer);
      stallTimer = undefined;
    }
  };
  /** Re-armed on every chunk: it measures the gap since the last byte, not the
   * total body duration. */
  const armStallTimer = () => {
    clearStallTimer();
    stallTimer = setTimeout(() => {
      watchdogCause = "stall-timeout";
      controller.abort();
    }, FETCH_BUDGETS.stallMs);
  };

  // Absolute ceiling, armed before the first await that could hang.
  const totalTimer = setTimeout(() => {
    watchdogCause = "total-timeout";
    controller.abort();
  }, FETCH_BUDGETS.totalMs);
  // Short budget for "cannot reach the server / no response at all".
  connectTimer = setTimeout(() => {
    watchdogCause = "connect-timeout";
    controller.abort();
  }, FETCH_BUDGETS.connectMs);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);
  // Covers a signal that was already aborted, plus an abort that lands between
  // the `aborted` read and the listener registration.
  if (externalSignal?.aborted) {
    controller.abort();
  }

  try {
    const response = await fetch(`${server}/rpc/getConvMsgs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dialogId,
        ...(dialogKey && { dialogKey }),
        limit,
        ...(beforeKey && { beforeKey }),
      }),
      signal: controller.signal,
    });

    // Headers are the first bytes back from the server: the connect budget did
    // its job, and body progress takes over from here.
    phase = "body";
    clearConnectTimer();
    armStallTimer();

    if (!response.ok) {
      console.error(`fetchConvMsgs: Failed ${response.status} from ${server}`);
      return [];
    }

    const data = await readJsonBody(response, (byteLength) => {
      receivedBytes += byteLength;
      receivedChunks += 1;
      armStallTimer();
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Only re-throw when external signal was aborted (user navigated away)
    if (externalSignal?.aborted) {
      throw error;
    }
    if (watchdogCause !== null) {
      // Never silent: callers turn `[]` into "server has no more messages", so
      // an internal abort has to say which budget expired, at which phase, and
      // how much had already arrived (the connect case arrives empty).
      console.error(
        `fetchConvMsgs: Error fetching from ${server}: ${watchdogCause} ` +
          `elapsedMs=${Math.round(now() - startedAt)} phase=${phase} ` +
          `receivedBytes=${receivedBytes} chunks=${receivedChunks} — ` +
          "internal watchdog abort, returning [] (NOT evidence of an empty history)",
      );
      return [];
    }
    console.error(`fetchConvMsgs: Error fetching from ${server}:`, error);
    return [];
  } finally {
    clearConnectTimer();
    clearStallTimer();
    clearTimeout(totalTimer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
};
