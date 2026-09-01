/**
 * Single entry point for every modal the TUI puts on screen: the agent picker,
 * the dialog/history picker, ask_choice, and every confirm/action-gate prompt.
 *
 * Each modal needs five things done, every time, in the right order:
 *   1. compute the anchor (which row to dock the frame above the composer)
 *   2. pause the composer (so streaming repaints early-return instead of
 *      wiping the frame)
 *   3. claim the keyboard (so the composer's own decoder drops keys instead
 *      of leaking them into the draft buffer / submit path)
 *   4. drain the decoder on close (a debounced Enter or partial ESC/CSI tail
 *      sitting in the composer's raw decoder must not survive past the
 *      keyboard release, or it leaks into the next submit)
 *   5. release the keyboard and resume the composer
 *
 * This used to be split: `run()` only did #1/#2 and half of #5, and every
 * call site was expected to hand-roll #3/#4 around its own `run()` call. That
 * duplication is exactly what cost two separate incidents (decoder drain
 * fixed once for the confirm path, then again for ask_user; the mouse-CSI
 * misdetection fixed once for selectDialog, then again for the action gate)
 * and, on 2026-08-31, a confirm prompt that did none of the five and hung the
 * turn for minutes. `run()` (framed dialogs) and `withKeyboard()` (the raw
 * handoff-gate text prompt, which has no dialog frame) are now the *only*
 * two places #3/#4 happen — a new modal cannot forget a step because there is
 * no step left for it to do by hand.
 */

import { resetHistoryFrameDiffCache } from "./tuiHistory";

/** The slice of the composer controller a dialog needs to take over the screen. */
export type DialogHostComposer = {
  pause(): void;
  resumeFromDialog(): void;
  getInputLines(): number;
  isPaused(): boolean;
};

/**
 * Where a dialog frame should be drawn. Pass straight through to
 * `runSelectDialog` / `runMultiSelectDialog` / `runConfirmDialog`.
 */
export type DialogAnchor = {
  bottomAnchored: true;
  /**
   * Lazily resolved 1-indexed absolute row the last line of the frame sits
   * on. A function (not a snapshot) so the dialog re-anchors above the
   * composer on every paint — a terminal resize changes `output.rows` while
   * the dialog is open, and a captured number would leave the frame frozen
   * at the pre-resize rows.
   */
  bottomRow: () => number;
};

export type DialogHost = {
  /** Open a framed, anchored dialog. Owns all five concerns end to end. */
  run<T>(body: (anchor: DialogAnchor) => Promise<T>): Promise<T>;
  /**
   * Claim the keyboard for a modal interaction that has no dialog frame of
   * its own — currently only the handoff-gate raw text prompt, which prints
   * a bare instruction and waits for Enter/Ctrl+C rather than opening a
   * `runSelectDialog`-style frame. Composer pause/resume and the anchor stay
   * the caller's job there (see `resolveActionGate`'s handoff branch); this
   * only owns claim (#3) and drain-then-release (#4/#5), the same contract
   * `run()` uses internally, in the same order.
   */
  withKeyboard<T>(body: () => Promise<T>): Promise<T>;
  /** True while `run()` or `withKeyboard()` currently holds the keyboard. */
  isKeyboardClaimed(): boolean;
};

const DEFAULT_TTY_ROWS = 24;

function resolveTtyRows(output: unknown): number {
  if (
    typeof output === "object" &&
    output !== null &&
    "rows" in output &&
    typeof (output as { rows?: unknown }).rows === "number"
  ) {
    return (output as { rows: number }).rows;
  }
  return DEFAULT_TTY_ROWS;
}

/**
 * Compute the row the dialog's last line should occupy so the frame stacks
 * upward from just above the docked composer.
 */
export function resolveDialogBottomRow(args: {
  output: unknown;
  inputLines: number;
}): number {
  return Math.max(1, resolveTtyRows(args.output) - args.inputLines);
}

export function createDialogHost(args: {
  composer: DialogHostComposer;
  output: NodeJS.WritableStream;
  /**
   * Discard whatever the composer's raw decoder currently has buffered
   * (a debounced Enter, a partial ESC/CSI tail). Called on every close,
   * before the keyboard claim is released — see `releaseKeyboard` below for
   * why the order matters. Optional so callers with no raw decoder at all
   * (tests, the non-raw readline input path) can omit it.
   */
  drainDecoder?: () => void;
}): DialogHost {
  // The single source of truth for "does a modal currently own the
  // keyboard". Callers used to keep their own copy of this flag and set it
  // by hand around every `run()` call; that duplication is exactly what let
  // three of the six call sites forget it. Owning it here means there is
  // nowhere else for it to live.
  let keyboardClaimed = false;

  const claimKeyboard = () => {
    keyboardClaimed = true;
  };

  const releaseKeyboard = () => {
    // Order is load-bearing (8952280c1 / b149133ee, both regressions from
    // getting this backwards): drain the decoder's buffered bytes BEFORE
    // flipping the claim flag back. The composer's raw decoder debounces an
    // unmarked-paste burst (which an Enter keypress looks like) for ~40ms;
    // if the flag drops first, that debounce can fire after the modal has
    // closed and the Enter falls through to the composer's submit path,
    // enqueueing whatever draft happens to be sitting there.
    args.drainDecoder?.();
    keyboardClaimed = false;
  };

  return {
    async run(body) {
      const anchor: DialogAnchor = {
        bottomAnchored: true,
        bottomRow: () =>
          resolveDialogBottomRow({
            output: args.output,
            inputLines: args.composer.getInputLines(),
          }),
      };
      claimKeyboard();
      // pause() flips isPaused(), which is what suppresses the transcript
      // repaint while the dialog owns the screen. Without it a dialog opened
      // during a streaming turn is erased by the next token.
      args.composer.pause();
      try {
        return await body(anchor);
      } finally {
        resetHistoryFrameDiffCache(args.output);
        args.composer.resumeFromDialog();
        releaseKeyboard();
      }
    },
    async withKeyboard(body) {
      claimKeyboard();
      try {
        return await body();
      } finally {
        releaseKeyboard();
      }
    },
    isKeyboardClaimed: () => keyboardClaimed,
  };
}
