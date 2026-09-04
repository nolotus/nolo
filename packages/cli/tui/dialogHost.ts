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
 *
 * Phase 2 adds terminal ownership to the same split: the host session owns
 * SGR mouse reporting and raw-mode acquire/release (see `DialogSession`), so
 * dialogs never write terminal-mode ANSI themselves and cannot strand a
 * terminal in raw mode or clobber the user's `/mouse off` preference. The
 * only non-hosted writers left are the standalone session's canonical pair,
 * used by tests and non-workspace pickers.
 */

import { resetHistoryFrameDiffCache } from "./tuiHistory";

/** The slice of the composer controller a dialog needs to take over the screen. */
export type DialogHostComposer = {
  pause(): void;
  resumeFromDialog(): void;
  getInputLines(): number;
  isPaused(): boolean;
  /** The fixed input owns the user `/mouse on|off` preference. */
  isMouseEnabled?(): boolean;
  setMouseEnabled?(enabled: boolean): void;
};

/**
 * Input-routing contract for one modal session: which keys belong to the
 * modal and which fall through to the workspace transcript. This type is also
 * the ownership carrier for foreground-repaint registration, mouse
 * preference, and the host-owned terminal session (see DialogSession).
 * `pageKeys: "modal"` stays a fall-through — the list dialogs keep their
 * default page handling (no owned page navigation yet); "ignore" suppresses
 * transcript routing. All wheel semantics live here: "modal" moves the
 * dialog's own cursor, "transcript" routes the event to the workspace
 * history, "ignore" swallows it (confirm's wheel must never flip a choice).
 */
export type DialogInputPolicy = {
  wheel: "modal" | "transcript" | "ignore";
  pageKeys: "modal" | "transcript" | "ignore";
};

/**
 * Terminal lifecycle ownership for one modal session. The host wires this to
 * the workspace's composer owner; standalone sessions (tests, non-workspace
 * pickers) acquire and release the terminal themselves. Dialogs call these
 * around their event loop — they must never write terminal-mode ANSI or
 * toggle raw mode directly, because a modal that crashes mid-loop would then
 * strand the terminal in a state it no longer owns.
 */
export type DialogSession = {
  /**
   * Enable/disable SGR mouse reporting for the dialog window. Hosted
   * sessions route the enable side to the composer owner (which `pause()`
   * disabled for the modal) and leave the disable side to the host's
   * post-session preference restore; standalone sessions write the canonical
   * enable/disable pair, strictly paired so a dialog that never enabled
   * never disables either.
   */
  setMouseReporting(enabled: boolean): void;
  /**
   * Ensure raw input for the dialog loop. Returns true only when THIS call
   * acquired raw mode (the terminal was a TTY and not already raw) — the
   * caller must pass that result to `releaseRaw`. Hosted sessions always
   * return false: the workspace composer owns raw mode for the whole session.
   */
  acquireRaw(): boolean;
  /** Restore raw mode exactly when a matching `acquireRaw()` returned true. */
  releaseRaw(acquired: boolean): void;
  /** Report the number of screen rows reserved by the active modal. */
  setReservedRows?(rows: number): void;
  /** Get currently reserved row count. */
  getReservedRows?(): number;
};

/** Canonical dialog-owned mouse reporting pair (standalone sessions only). */
const DIALOG_MOUSE_ENABLE = "\x1b[?1006h\x1b[?1000h";
const DIALOG_MOUSE_DISABLE = "\x1b[?1000l\x1b[?1006l";

/**
 * Terminal session for dialogs running outside the workspace host: tests and
 * standalone pickers. Owns raw-mode acquire/release and the SGR mouse
 * reporting pair; the enable/disable writes are strictly paired so cleanup
 * never touches a mode the dialog did not turn on.
 */
export function createStandaloneDialogSession(args: {
  input: NodeJS.ReadStream;
  output: NodeJS.WritableStream;
}): DialogSession {
  let mouseReportingOwned = false;
  let reservedRows = 0;
  return {
    setMouseReporting(enabled) {
      if (enabled && !mouseReportingOwned) {
        mouseReportingOwned = true;
        args.output.write(DIALOG_MOUSE_ENABLE);
        return;
      }
      if (!enabled && mouseReportingOwned) {
        mouseReportingOwned = false;
        args.output.write(DIALOG_MOUSE_DISABLE);
      }
    },
    acquireRaw() {
      if (!args.input.isTTY || args.input.isRaw) return false;
      args.input.setRawMode?.(true);
      return true;
    },
    releaseRaw(acquired) {
      if (!acquired) return;
      args.input.setRawMode?.(false);
    },
    setReservedRows(rows) {
      reservedRows = Math.max(0, rows);
    },
    getReservedRows() {
      return reservedRows;
    },
  };
}

export type DialogAnchor = {
  /** Explicit routing contract for input not owned by the modal. */
  inputPolicy: DialogInputPolicy;
  /** Workspace-owned transcript routing; the host never owns history state. */
  onTranscriptScroll?: (action: string) => void;
  registerForegroundRepaint?(repaint: () => void): void;
  /** Mouse reporting preference at session open. */
  mouseEnabled: boolean;
  /** Host-owned terminal lifecycle (mouse reporting + raw mode). */
  session: DialogSession;
  bottomAnchored: true;
  /**
   * Lazily resolved 1-indexed absolute row the last line of the frame sits
   * on. A function (not a snapshot) so the dialog re-anchors above the
   * composer on every paint — a terminal resize changes `output.rows` while
   * the dialog is open, and a captured number would leave the frame frozen
   * at the pre-resize rows.
   */
  bottomRow: () => number;
  /** Phase 3: report modal rows reserved above the composer */
  setReservedRows?: (rows: number) => void;
  getReservedRows?: () => number;
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
  repaint(): void;
  getReservedRows(): number;
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
  inputPolicy?: DialogInputPolicy;
  onTranscriptScroll?: (action: string) => void;
  renderUnderlay?: () => void;
}): DialogHost {
  // The single source of truth for "does a modal currently own the
  // keyboard". Callers used to keep their own copy of this flag and set it
  // by hand around every `run()` call; that duplication is exactly what let
  // three of the six call sites forget it. Owning it here means there is
  // nowhere else for it to live.
  let keyboardClaimed = false;
  let foregroundRepaint: (() => void) | null = null;
  let reservedRows = 0;

  // Host-owned terminal session handed to every framed dialog via the anchor.
  // Mouse reporting: the workspace composer is the owner of record — pause()
  // disabled reporting for the modal window, so the dialog re-enables it
  // through here when the user preference allows, and run()'s finally
  // restores the exact pre-modal preference afterwards. Raw mode: the
  // composer already owns it for the whole workspace session; dialogs never
  // acquire or release it in hosted mode.
  const hostedSession: DialogSession = {
    setMouseReporting: (enabled) => {
      // If user preference is mouse-off, never enable terminal mouse reporting.
      const pref = args.composer.isMouseEnabled?.() ?? true;
      if (!pref) return;
      if (enabled) {
        args.composer.setMouseEnabled?.(true);
      }
    },
    acquireRaw: () => false,
    releaseRaw: () => {},
    setReservedRows: (rows) => {
      const next = Math.max(0, rows);
      if (next !== reservedRows) {
        reservedRows = next;
        args.renderUnderlay?.();
      }
    },
    getReservedRows: () => reservedRows,
  };

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
      const mouseStateBefore = args.composer.isMouseEnabled?.() ?? true;
      const anchor: DialogAnchor = {
        inputPolicy: args.inputPolicy ?? { wheel: "modal", pageKeys: "transcript" },
        onTranscriptScroll: (action) => { args.onTranscriptScroll?.(action); foregroundRepaint?.(); },
        registerForegroundRepaint: (repaint) => { foregroundRepaint = repaint; },
        mouseEnabled: args.composer.isMouseEnabled?.() ?? true,
        session: hostedSession,
        bottomAnchored: true,
        bottomRow: () =>
          resolveDialogBottomRow({
            output: args.output,
            inputLines: args.composer.getInputLines(),
          }),
        setReservedRows: (rows) => hostedSession.setReservedRows?.(rows),
        getReservedRows: () => hostedSession.getReservedRows?.() ?? 0,
      };
      claimKeyboard();
      // pause() flips isPaused(), which is what suppresses the transcript
      // repaint while the dialog owns the screen. Without it a dialog opened
      // during a streaming turn is erased by the next token.
      args.composer.pause();
      try {
        return await body(anchor);
      } finally {
        hostedSession.setReservedRows?.(0);
        foregroundRepaint = null;
        resetHistoryFrameDiffCache(args.output);
        args.composer.resumeFromDialog();
        // resumeFromDialog restores the normal composer mode; restore the
        // exact pre-modal preference afterwards (notably `/mouse off`).
        if (args.composer.setMouseEnabled) {
          args.composer.setMouseEnabled(mouseStateBefore);
        }
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
    repaint: () => {
      if (!keyboardClaimed) return;
      args.renderUnderlay?.();
      foregroundRepaint?.();
    },
    getReservedRows: () => reservedRows,
  };
}
