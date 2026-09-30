/**
 * Renderer suspension for subprocess handoffs.
 *
 * When the TUI hands the terminal to an interactive subprocess (the
 * action-gate "handoff" path — the subprocess spawns with inherited stdio and
 * a real human types into it), the renderer must stop owning the screen for
 * the duration of the handoff:
 *
 *   1. leaveAltScreen(output)  — return the terminal to the main screen so
 *      the subprocess writes into the shell's buffer, not the TUI's private
 *      one. (Writing into the alt-screen buffer while the user interacts
 *      with it is exactly the pollution class documented in
 *      docs/plans/2026-09-29-spawn-stdio-audit.md.)
 *   2. mark the output as suspended — stray repaint paths (terminal resize
 *      → dialogHost.repaint → renderUnderlay) check isRendererSuspended()
 *      and become no-ops, so nothing paints the TUI underlay into a screen
 *      the subprocess is occupying.
 *   3. run fn() — the subprocess spawn + exit wait.
 *   4. enterAltScreen(output) + resetHistoryFrameDiffCache + onResume() —
 *      reclaim the private buffer, drop every diff cache that assumed the
 *      screen was still ours, and let the caller issue its full repaint.
 *
 * Both alt-screen primitives are idempotent and no-op on non-TTY outputs, so
 * this helper is safe on the non-raw action-gate fallback (piped stdin with
 * a TTY stdout) and in tests. The suspended flag itself is stream-agnostic —
 * it exists so repaint paths that *would* fire on non-TTY mocks can still be
 * audited for correct suspension in unit tests.
 */
import { enterAltScreen, leaveAltScreen } from "./tuiRawInput";
import { resetHistoryFrameDiffCache } from "./tuiHistory";

const suspendedOutputs = new WeakMap<NodeJS.WritableStream, number>();

/**
 * True while `withSuspendedRenderer` has yielded `output`'s screen to a
 * subprocess. Repaint entry points (resize → dialogHost.repaint →
 * renderUnderlay) must check this before writing — after leaveAltScreen the
 * terminal belongs to the child, and any renderer byte lands as garbage in
 * the child's view.
 */
export function isRendererSuspended(output: NodeJS.WritableStream): boolean {
  return (suspendedOutputs.get(output) ?? 0) > 0;
}

/**
 * Run `fn` with the renderer's terminal ownership suspended, then restore.
 *
 * Restoration is unconditional: even when `fn` throws, the alt screen is
 * re-entered, the frame-diff cache is reset, and `onResume` (the caller's
 * full repaint) still runs — a crashed handoff must not strand the terminal
 * on the main screen or leave the composer believing its scroll region is
 * still valid.
 *
 * Nested calls on the same output are reference-counted; the outermost
 * resume is the one that repaints.
 */
export async function withSuspendedRenderer<T>(
  output: NodeJS.WritableStream,
  fn: () => Promise<T>,
  opts?: {
    /**
     * Full-repaint callback, invoked after the alt screen is re-entered and
     * before the suspended flag drops. For the raw handoff path this is the
     * composer's resumeFromSubprocess (+ any history repaint the caller
     * wires in); the non-raw fallback has no composer and leaves it unset.
     */
    onResume?: () => void;
  },
): Promise<T> {
  const depth = (suspendedOutputs.get(output) ?? 0) + 1;
  suspendedOutputs.set(output, depth);
  if (depth === 1) {
    leaveAltScreen(output);
  }
  try {
    return await fn();
  } finally {
    if (depth === 1) {
      // Re-enter the private buffer first so the repaint lands there, not
      // on the shell's main screen.
      enterAltScreen(output);
      resetHistoryFrameDiffCache(output);
      try {
        opts?.onResume?.();
      } finally {
        suspendedOutputs.delete(output);
      }
    } else {
      suspendedOutputs.set(output, depth - 1);
    }
  }
}
