/**
 * Pure viewport geometry and layout reservation contract for the TUI workspace.
 *
 * Resolves the terminal screen into three vertical stacked zones (from top to bottom):
 *   1. History Viewport: scrollable transcript pane (height = terminalRows - composerRows - foregroundReservedRows)
 *   2. Foreground Modal: reserved row region for active framed dialogs (height = foregroundReservedRows)
 *   3. Composer: fixed docked input / status area (height = composerRows)
 *
 * Framebuffer scrolling (CSI n S) is forbidden in production modals; modal height
 * is layout state managed through this contract.
 */

export type TerminalLayoutInput = {
  /** Total available terminal height in rows (defaults to 24 if <= 0). */
  terminalRows: number;
  /** Total available terminal width in columns (defaults to 80 if <= 0). */
  terminalColumns?: number;
  /** Number of screen rows occupied by the docked composer (>= 0). */
  composerRows: number;
  /** Number of screen rows reserved by an active modal dialog (>= 0). */
  foregroundReservedRows?: number;
};

export type TerminalZoneBounds = {
  /** 1-based top row index in the terminal. */
  topRow: number;
  /** 1-based bottom row index in the terminal. */
  bottomRow: number;
  /** Height in screen rows. */
  height: number;
};

export type TerminalLayout = {
  terminalRows: number;
  terminalColumns: number;
  composerRows: number;
  foregroundReservedRows: number;
  /** Height in rows of the scrollable history viewport (Math.max(0, terminalRows - composerRows - foregroundReservedRows)). */
  historyViewportHeight: number;
  /** 1-based start row of the history viewport (1 if height > 0, else 0). */
  historyViewportTop: number;
  /** 1-based end row of the history viewport (historyViewportHeight if height > 0, else 0). */
  historyViewportBottom: number;
  /** 1-based bounds for the foreground modal region, or null if no rows reserved. */
  modalBounds: TerminalZoneBounds | null;
  /** 1-based bounds for the docked composer region, or null if composerRows is 0. */
  composerBounds: TerminalZoneBounds | null;
};

const DEFAULT_TERMINAL_ROWS = 24;
const DEFAULT_TERMINAL_COLUMNS = 80;

/**
 * Resolve the height in rows of the scrollable history transcript viewport.
 */
export function resolveHistoryViewportHeight(
  terminalRows: number,
  composerRows: number,
  foregroundReservedRows = 0,
): number {
  const rows = Math.max(1, terminalRows > 0 ? terminalRows : DEFAULT_TERMINAL_ROWS);
  const composer = Math.max(0, composerRows);
  const reserved = Math.max(0, foregroundReservedRows);
  return Math.max(0, rows - composer - reserved);
}

/**
 * Compute the 1-based row index that the bottom line of a modal dialog should sit on.
 * Stacks immediately above the docked composer.
 */
export function resolveModalBottomRow(
  terminalRows: number,
  composerRows: number,
): number {
  const rows = Math.max(1, terminalRows > 0 ? terminalRows : DEFAULT_TERMINAL_ROWS);
  const composer = Math.max(0, composerRows);
  return Math.max(1, rows - composer);
}

/**
 * Compute the complete geometric breakdown of the terminal screen.
 */
export function computeTerminalLayout(input: TerminalLayoutInput): TerminalLayout {
  const terminalRows = Math.max(
    1,
    input.terminalRows > 0 ? input.terminalRows : DEFAULT_TERMINAL_ROWS,
  );
  const terminalColumns = Math.max(
    1,
    (input.terminalColumns ?? 0) > 0
      ? input.terminalColumns!
      : DEFAULT_TERMINAL_COLUMNS,
  );

  const composerRows = Math.max(
    0,
    Math.min(terminalRows, input.composerRows),
  );

  const maxReservable = Math.max(0, terminalRows - composerRows);
  const foregroundReservedRows = Math.max(
    0,
    Math.min(maxReservable, input.foregroundReservedRows ?? 0),
  );

  const historyViewportHeight = Math.max(
    0,
    terminalRows - composerRows - foregroundReservedRows,
  );

  const historyViewportTop = historyViewportHeight > 0 ? 1 : 0;
  const historyViewportBottom = historyViewportHeight;

  let modalBounds: TerminalZoneBounds | null = null;
  if (foregroundReservedRows > 0) {
    const bottomRow = terminalRows - composerRows;
    const topRow = bottomRow - foregroundReservedRows + 1;
    modalBounds = {
      topRow,
      bottomRow,
      height: foregroundReservedRows,
    };
  }

  let composerBounds: TerminalZoneBounds | null = null;
  if (composerRows > 0) {
    const bottomRow = terminalRows;
    const topRow = terminalRows - composerRows + 1;
    composerBounds = {
      topRow,
      bottomRow,
      height: composerRows,
    };
  }

  return {
    terminalRows,
    terminalColumns,
    composerRows,
    foregroundReservedRows,
    historyViewportHeight,
    historyViewportTop,
    historyViewportBottom,
    modalBounds,
    composerBounds,
  };
}
