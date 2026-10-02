// File: chat/web/foregroundTurnRecoveryObserver.ts
// Observable core of the foreground-turn recovery observer.
//
// Extracted from the ForegroundTurnRecovery effect so the durable-channel
// attach, discovery timeout, terminal handling and transport-drop paths are
// unit-testable with an injected fetch + timers. The React component stays the
// single owner: exactly one `observeForegroundTurnRecovery` call per mount.
//
// P0/P1 recovery contract (do not regress):
// - never re-POST the user turn — this is GET-only observation;
// - never subscribe twice; one observer per dialog attach;
// - idle dialogs close the discovery connection instead of holding an SSE;
// - a transport drop is NOT an execution failure — it is reported as such.

import { createSSEParser } from "ai/chat/parseMultilineSSE";

export const FOREGROUND_DISCOVERY_TIMEOUT_MS = 1_500;

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
