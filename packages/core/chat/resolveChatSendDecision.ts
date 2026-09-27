// packages/chat/queue/resolveChatSendDecision.ts
//
// Cross-platform send/queue decision resolver for the chat composer.
//
// This is the single source of truth for "what should the composer do when the
// user presses send right now?" across Web, RN, and TUI. It is a pure function
// with zero dependencies — no React, no Redux — so every client can share the
// exact same semantics.
//
// Originally extracted from packages/chat/web/messageInputSendResolver.ts.
//
// Turn-lease contract (ctx-overflow-feedback batch 2):
//   Previously every "nothing to do" outcome collapsed into an un-typed
//   `{kind:"noop"}` which callers silently consumed — a stuck send guard then
//   dropped every subsequent press without feedback. The noop kind now carries
//   a discriminating `reason`:
//     - "empty-input":      nothing to send — allowed to stay silent;
//     - "already-sending":  a send/turn lease is still active — callers may
//                         either queue (text) or surface an explicit hint;
//     - "blocked":          content exists but isSendBlocked vetoed the send.
//   To let the caller distinguish "stale lease" (no runtime activity behind
//   the lease) from a genuinely running turn, the resolver also accepts an
//   optional `hasActiveTurn` fact; when a send lease exists but no runtime
//   activity is observed, it emits `stale-send` so the caller can recover
//   instead of swallowing the press.

export type ChatSendNoopReason = "empty-input" | "already-sending" | "blocked";

export type ChatSendDecision =
  | { kind: "arm-fresh-dialog" }
  | { kind: "compact-blocked" }
  | { kind: "compact-dialog" }
  | { kind: "noop"; reason: ChatSendNoopReason }
  | { kind: "stale-send" }
  | { kind: "multi-image-blocked" }
  | { kind: "queue-text"; text: string }
  | { kind: "queue-blocked" }
  | { kind: "send"; text: string };

export type ResolveChatSendDecisionInput = {
  text: string;
  imagePreviewCount: number;
  pendingFileCount: number;
  isSendBlocked: boolean;
  canMultiImg: boolean;
  isLoopRunning: boolean;
  isSendPending: boolean;
  /**
   * Whether a runtime turn is actually active behind the send lease
   * (streaming message, loop controller, or pending file processing).
   * When a send lease is held but no runtime activity exists, the lease is
   * stale and the resolver emits `stale-send` instead of a silent noop so the
   * caller can release it and let the user retry.
   *
   * Optional for backwards compatibility: callers that cannot observe
   * runtime activity should pass `undefined`, which conservatively treats the
   * lease as live (`already-sending`) rather than risking a duplicate send.
   */
  hasActiveTurn?: boolean;
  isFreshDialogSlashCommand: (input: string) => boolean;
  isCompactDialogSlashCommand: (input: string) => boolean;
};

export function resolveChatSendDecision(
  input: ResolveChatSendDecisionInput
): ChatSendDecision {
  const trimmed = input.text.trim();

  if (input.isFreshDialogSlashCommand(trimmed)) {
    return { kind: "arm-fresh-dialog" };
  }

  if (input.isCompactDialogSlashCommand(trimmed)) {
    if (input.isLoopRunning || input.isSendPending) {
      return { kind: "compact-blocked" };
    }
    return { kind: "compact-dialog" };
  }

  const hasContent = Boolean(trimmed) || input.imagePreviewCount > 0 || input.pendingFileCount > 0;
  const hasActiveTurn =
    input.hasActiveTurn ?? (input.isLoopRunning || input.isSendPending);

  if (!hasContent) {
    return { kind: "noop", reason: "empty-input" };
  }

  // A held send lease with real content: distinguish a genuinely running
  // turn (explicit "already-sending" noop) from a stale lease left behind by
  // a turn that never settled (`stale-send` → caller recovers once).
  if (input.isSendPending && !input.isLoopRunning && !hasActiveTurn) {
    return { kind: "stale-send" };
  }

  if (input.isSendPending) {
    return { kind: "noop", reason: "already-sending" };
  }

  if (input.isSendBlocked) {
    return { kind: "noop", reason: "blocked" };
  }

  if (!input.canMultiImg && input.imagePreviewCount > 1) {
    return { kind: "multi-image-blocked" };
  }

  if (input.isLoopRunning) {
    if (trimmed && !input.imagePreviewCount && !input.pendingFileCount) {
      return { kind: "queue-text", text: trimmed };
    }
    return { kind: "queue-blocked" };
  }

  return { kind: "send", text: trimmed };
}
