// File: chat/web/foregroundTurnRecoveryDisplay.ts
// Pure display-phase derivation for the foreground-turn recovery observer.
//
// The observer (foregroundTurnRecoveryObserver.ts) is the single owner of the
// durable dialog SSE channel and settles server-owned facts; this module only
// turns those facts into one of three mild reply-area states:
//   attaching   — still (re)attaching to the turn's durable event channel;
//   running     — the server confirmed it is still generating the reply;
//   interrupted — the transport dropped after we had positively observed the
//                 turn; execution status is UNKNOWN (not a failure claim).
//
// Invariants enforced here:
// - a local foreground controller owns the reply → no recovery display;
// - a transport drop before any lifecycle evidence is indistinguishable from
//   an idle dialog → stay silent (no false connection-failure report);
// - terminal / idle discovery settle the attach → nothing is displayed, so
//   idle completed dialogs never show recovery noise.

export type RecoveryDisplayPhase = "attaching" | "running" | "interrupted";

export type RecoveryDisplayInput = {
  /** This tab owns a live controller for the dialog → recovery is dormant. */
  hasLocalForegroundOwner: boolean;
  /** Durable store fact: the server reported the turn running. */
  recoveredForegroundTurn: "running" | null;
  /** Any foreground lifecycle event (status/terminal) was observed. */
  sawForegroundLifecycle: boolean;
  /** The observer stream ended or errored (transport-level, not execution). */
  streamDropped: boolean;
  /** Terminal refresh or bounded-window exhaustion settled this attach. */
  attachSettled: boolean;
  /** The subtle attach hint delay elapsed while still attaching. */
  attachHintElapsed: boolean;
  /** Last persisted message is a user row still awaiting its reply. */
  replyMaybePending: boolean;
};

export function deriveRecoveryDisplayPhase(
  input: RecoveryDisplayInput
): RecoveryDisplayPhase | null {
  if (input.hasLocalForegroundOwner) return null;

  if (input.streamDropped) {
    // A transport error is not an execution failure. Only a turn we positively
    // observed keeps a muted "connection interrupted, status unknown" hint —
    // never a failure claim and never a retry prompt. A drop before any
    // lifecycle evidence behaves exactly like idle discovery: silence.
    return input.sawForegroundLifecycle ? "interrupted" : null;
  }

  // Terminal refresh or idle-discovery abort settled this attach; the durable
  // channel is closed by design, so nothing may linger.
  if (input.attachSettled) return null;

  if (input.recoveredForegroundTurn === "running") return "running";

  if (input.sawForegroundLifecycle) {
    // Lifecycle seen but not running (e.g. a non-running status frame): the
    // turn is not observable as running, so no recovery hint.
    return null;
  }

  // Still attaching. A fast attach resolves silently; the hint only appears
  // after a short delay and only while a reply is actually pending, so idle
  // completed dialogs (last row is an assistant/tool row) never flash it.
  return input.attachHintElapsed && input.replyMaybePending
    ? "attaching"
    : null;
}

/** Delay before the subtle "attaching" hint may appear (fast attaches stay silent). */
export const FOREGROUND_ATTACH_HINT_DELAY_MS = 400;
