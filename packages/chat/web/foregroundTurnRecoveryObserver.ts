// File: chat/web/foregroundTurnRecoveryObserver.ts
// Observable core of the foreground-turn recovery observer.
//
// Extracted from the ForegroundTurnRecovery effect so the durable-channel
// attach, discovery timeout, terminal handling and transport-drop paths are
// unit-testable with an injected fetch + timers. The React component stays the
// single owner: exactly one bounded session per mount, and the session runs at
// most one attach attempt at a time.
//
// P0/P1 recovery contract (do not regress):
// - never re-POST the user turn — this is GET-only observation;
// - never subscribe twice; one observer per dialog attach;
// - idle dialogs close the discovery connection instead of holding an SSE;
// - a transport drop is NOT an execution failure — it is reported as such;
// - a no-evidence attach is retried a bounded number of times, then the turn
//   state is left unknown — never an infinite SSE, never a failure claim.

import { createSSEParser } from "ai/chat/parseMultilineSSE";

export const FOREGROUND_DISCOVERY_TIMEOUT_MS = 1_500;

/** Bounded backoff before each re-attach attempt (whole window ≈ 60-75s). */
export const FOREGROUND_RETRY_DELAYS_MS: readonly number[] = [
  5_000, 15_000, 45_000,
];

const FOREGROUND_STATUS_EVENT = "foreground_turn_status";
const FOREGROUND_TERMINAL_EVENT = "foreground_turn_terminal";

export type ForegroundTurnRecoveryCallbacks = {
  /** Every parsed SSE frame (feeds the shared execution-id cache). */
  onForegroundEvent: (event: Record<string, unknown>) => void;
  /** Any foreground lifecycle frame (status or terminal) was observed. */
  onLifecycle: () => void;
  /** The server reported the detached turn is still running. */
  onRunning: () => void;
  /** Terminal event reached: reload persisted dialog messages. */
  onTerminal: () => void | Promise<void>;
  /** Discovery window elapsed with no lifecycle evidence: idle dialog. */
  onIdle: () => void;
  /** The transport ended or errored without an abort (status unknown). */
  onDropped: () => void;
};

export type ForegroundTurnRecoveryTimers = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

export async function observeForegroundTurnRecovery(args: {
  controller: AbortController;
  origin: string;
  dialogId: string;
  token: string;
  callbacks: ForegroundTurnRecoveryCallbacks;
  fetchImpl?: typeof fetch;
  timers?: ForegroundTurnRecoveryTimers;
}): Promise<void> {
  const {
    controller,
    origin,
    dialogId,
    token,
    callbacks,
  } = args;
  const fetchFn = args.fetchImpl ?? fetch;
  const timers = args.timers ?? {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  let sawForegroundLifecycle = false;

  const discoveryTimer = timers.setTimeout(() => {
    if (sawForegroundLifecycle) return;
    callbacks.onIdle();
    controller.abort("foreground-recovery-idle");
  }, FOREGROUND_DISCOVERY_TIMEOUT_MS);

  try {
    const cleanOrigin = String(origin).replace(/\/+$/, "");
    const response = await fetchFn(
      `${cleanOrigin}/api/events/dialog-${encodeURIComponent(dialogId)}`,
      {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      },
    );
    if (!response.ok || !response.body) {
      // No lifecycle evidence was acquired; settle this display-only attach.
      // Authentication/loading errors belong to the normal dialog surface.
      callbacks.onIdle();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parseSSE = createSSEParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const event of parseSSE(chunk)) {
          if (!event || typeof event !== "object") continue;
          const frame = event as Record<string, unknown>;

          // Live and recovery streams feed one execution-id cache. This keeps a
          // recovered Stop scoped to the turn the user actually observed
          // without making the cache execution authority.
          callbacks.onForegroundEvent(frame);

          const type = typeof frame.type === "string" ? frame.type : "";
          if (
            type === FOREGROUND_STATUS_EVENT ||
            type === FOREGROUND_TERMINAL_EVENT
          ) {
            sawForegroundLifecycle = true;
            callbacks.onLifecycle();
          }
          if (type === FOREGROUND_TERMINAL_EVENT) {
            timers.clearTimeout(discoveryTimer);
            await callbacks.onTerminal();
            controller.abort("foreground-recovery-terminal");
            return;
          }
          if (type === FOREGROUND_STATUS_EVENT && frame.status === "running") {
            timers.clearTimeout(discoveryTimer);
            callbacks.onRunning();
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    // The server keeps the channel open with heartbeats after terminal, so a
    // normal end means the transport went away mid-observation. An end that
    // follows our own idle/cleanup abort is intentional, not a drop.
    if (!controller.signal.aborted) callbacks.onDropped();
  } catch (error) {
    if (controller.signal.aborted) return;
    console.warn("[chat] foreground turn recovery observer disconnected", {
      dialogId,
      error,
    });
    callbacks.onDropped();
  } finally {
    timers.clearTimeout(discoveryTimer);
  }
}

/**
 * Session-level callbacks for the bounded recovery window. Unlike the
 * single-attach callbacks, `onIdle` is not exposed: a no-evidence attempt is
 * either re-attached after a bounded backoff or reported via `onExhausted`.
 * The turn state is never rendered as failed here.
 */
export type ForegroundTurnRecoverySessionCallbacks = {
  /** Every parsed SSE frame from any attempt (feeds the execution-id cache). */
  onForegroundEvent: (event: Record<string, unknown>) => void;
  /** Any foreground lifecycle frame (status or terminal) was observed. */
  onLifecycle: () => void;
  /** The server reported the detached turn is still running. */
  onRunning: () => void;
  /** Terminal event reached: reload persisted dialog messages (at most once). */
  onTerminal: () => void | Promise<void>;
  /** A bounded attach attempt is starting (0 = the initial attach). */
  onAttemptStart?: (attempt: number) => void;
  /** A no-evidence attempt settled; a re-attach follows after delayMs. */
  onRetryScheduled?: (retry: number, delayMs: number) => void;
  /** Transport dropped after lifecycle evidence: status unknown, session ends. */
  onDropped?: () => void;
  /** The bounded window ended with zero lifecycle evidence. */
  onExhausted?: () => void;
};

/**
 * Bounded observation session for a detached foreground turn.
 *
 * A single discovery attach can settle with zero lifecycle evidence (idle
 * timeout, attach error, silent drop) while the server is in fact still
 * generating — the reply area must not stay silent forever. This session
 * re-attaches the durable dialog channel a bounded number of times with
 * backoff (FOREGROUND_RETRY_DELAYS_MS, one attach at a time). It never
 * re-POSTs the turn and it always ends: terminal → reload once; lifecycle
 * then drop → status-unknown settle; zero evidence for the whole window →
 * onExhausted (unknown, not a failure).
 */
export async function observeForegroundTurnRecoveryWithRetry(args: {
  /** Session-level cancel (component unmount / dialog switch / local owner). */
  controller: AbortController;
  origin: string;
  dialogId: string;
  token: string;
  callbacks: ForegroundTurnRecoverySessionCallbacks;
  fetchImpl?: typeof fetch;
  timers?: ForegroundTurnRecoveryTimers;
}): Promise<void> {
  const { controller, origin, dialogId, token, callbacks } = args;
  const fetchFn = args.fetchImpl ?? fetch;
  const timers = args.timers ?? {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  if (controller.signal.aborted) return;

  let ended = false;
  let attemptController: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let resolveRetryWait: (() => void) | null = null;

  const clearRetryTimer = () => {
    if (retryTimer === null) return;
    timers.clearTimeout(retryTimer);
    retryTimer = null;
  };
  const settleSession = () => {
    ended = true;
    clearRetryTimer();
    resolveRetryWait?.();
    resolveRetryWait = null;
    attemptController?.abort("foreground-recovery-session-end");
  };
  // An abort from the owning component (unmount / dialog switch) must clear
  // the pending retry timer and prevent any further attempt or callback.
  const onSessionAbort = () => {
    ended = true;
    clearRetryTimer();
    resolveRetryWait?.();
    resolveRetryWait = null;
    attemptController?.abort("foreground-recovery-cleanup");
  };
  controller.signal.addEventListener("abort", onSessionAbort, { once: true });

  const waitForRetry = (delayMs: number) =>
    new Promise<void>((resolve) => {
      resolveRetryWait = resolve;
      retryTimer = timers.setTimeout(() => {
        retryTimer = null;
        resolveRetryWait = null;
        resolve();
      }, delayMs);
    });

  try {
    for (
      let attempt = 0;
      attempt <= FOREGROUND_RETRY_DELAYS_MS.length;
      attempt += 1
    ) {
      if (ended || controller.signal.aborted) return;

      callbacks.onAttemptStart?.(attempt);
      attemptController = new AbortController();
      let attemptSawLifecycle = false;
      let attemptDropped = false;

      await observeForegroundTurnRecovery({
        controller: attemptController,
        origin,
        dialogId,
        token,
        fetchImpl: fetchFn,
        timers,
        callbacks: {
          onForegroundEvent: callbacks.onForegroundEvent,
          onLifecycle: () => {
            attemptSawLifecycle = true;
            callbacks.onLifecycle();
          },
          onRunning: callbacks.onRunning,
          onTerminal: async () => {
            try {
              await callbacks.onTerminal();
            } finally {
              settleSession();
            }
          },
          onIdle: () => {
            // Consumed by the session: re-attach after backoff or exhaust.
          },
          onDropped: () => {
            attemptDropped = true;
          },
        },
      });

      if (ended || controller.signal.aborted) return;

      if (attemptSawLifecycle) {
        // The turn was positively observed; the transport then ended. Report
        // the status-unknown settle (never a failure) and stop re-attaching.
        if (attemptDropped) callbacks.onDropped?.();
        return;
      }

      if (attempt < FOREGROUND_RETRY_DELAYS_MS.length) {
        const delayMs = FOREGROUND_RETRY_DELAYS_MS[attempt];
        callbacks.onRetryScheduled?.(attempt + 1, delayMs);
        await waitForRetry(delayMs);
      } else {
        callbacks.onExhausted?.();
        return;
      }
    }
  } finally {
    controller.signal.removeEventListener("abort", onSessionAbort);
  }
}

/**
 * Recovery is entered only for a reply that may still be pending in this tab:
 * the last persisted row is the user's and no local controller owns the turn.
 * Idle completed dialogs (last row is a reply) and locally-owned turns stay
 * dormant, so they never flash recovery noise or start retries.
 */
export function shouldStartForegroundTurnRecovery(input: {
  dialogId: string | null | undefined;
  token: string | null | undefined;
  server: unknown;
  hasLocalForegroundOwner: boolean;
  replyMaybePending: boolean;
}): boolean {
  return (
    Boolean(input.dialogId) &&
    Boolean(input.token) &&
    Boolean(input.server) &&
    !input.hasLocalForegroundOwner &&
    input.replyMaybePending
  );
}
