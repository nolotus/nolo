// packages/agent-runtime/processTaskResult.ts
//
// Bounded stdout/stderr result capsule for promoted (timeout-detach) execShell
// tasks. When a detached command finally closes, the buffered output is still
// available on the stdio pipes — this module turns it into a small, self
// contained capsule that rides on the registry envelope and the terminal
// notice, so the wake can carry the actual result instead of pointing the
// model at a lifecycle debug tool (ProcessTask lifecycle history remains
// runtime-internal; the event log deliberately stays
// started/promoted/exited/killed only — no output event, §1.2).
//
// Boundaries:
// - launchProcess (ambient) tasks have no capsule: their terminal path in
//   localWorkspaceTools calls markExited without one, unchanged.
// - Any inline truncation spills the full output to the existing tool spill
//   store (`spillToolOutput`, toolName "execShell") so truncated output always
//   has a recoverable full-output ref. Spill failure is fail-open: the bounded
//   tails below are still preserved.

import { spillToolOutput } from "./toolSpillStore";

/**
 * Inline tail kept per stream (chars). Big enough to carry the useful end of
 * a build/test log, small enough to ride inside a terminal notice.
 */
export const PROCESS_RESULT_CAPSULE_TAIL_CHARS = 4_000;

/**
 * Legacy/sanity threshold retained for callers/tests that tune spill policy.
 * The stronger invariant is that ANY inline truncation requires a spill ref;
 * therefore this threshold can only make spilling happen earlier, never later.
 */
export const PROCESS_RESULT_CAPSULE_SPILL_THRESHOLD_CHARS = 20_000;

/** Where the full output lives when the capsule only carries a tail. */
export type ProcessTaskResultSpillRef = {
  displayPath: string;
  totalChars: number;
  totalLines: number;
};

export type ProcessTaskResultCapsule = {
  /** Bounded stdout tail (chars-capped, may be the full stream when small). */
  stdout: string;
  /** Bounded stderr tail (chars-capped, may be the full stream when small). */
  stderr: string;
  exitCode: number;
  /**
   * Wall time from the registry envelope's startedAt (captured at spawn) to
   * the terminal moment. Undefined only when no envelope startedAt exists.
   */
  durationMs?: number;
  /** True when the inline tails are not the complete streams. */
  truncated: boolean;
  /** Short fail-open diagnostic when a stdout/stderr stream could not be read. */
  captureError?: string;
  /** Present when the full output was spilled to the tool spill store. */
  spill?: ProcessTaskResultSpillRef;
};

/** Keep only the last `maxChars` chars, reporting whether anything was cut. */
function tailText(value: string, maxChars: number): { text: string; truncated: boolean } {
  if (value.length <= maxChars) return { text: value, truncated: false };
  return { text: value.slice(-maxChars), truncated: true };
}

function formatCapsuleStream(name: string, value: string): string {
  return value.trim() ? `${name}:\n${value.replace(/\n+$/, "")}` : "";
}

/**
 * Build the bounded capsule from the drained stdout/stderr of a promoted
 * execShell task. Never throws: a spill failure is fail-open and the bounded
 * tails are preserved regardless.
 */
export function buildProcessTaskResultCapsule(args: {
  stdout: string;
  stderr: string;
  exitCode: number;
  captureError?: string;
  /** Registry envelope startedAt (spawn moment); enables durationMs. */
  startedAt?: number;
  /** Terminal moment; defaults to now. */
  endedAt?: number;
  /** Workspace root for the spill store (same base as execShell overflow). */
  workspaceRoot?: string;
  tailChars?: number;
  spillThresholdChars?: number;
}): ProcessTaskResultCapsule {
  const tailChars = args.tailChars ?? PROCESS_RESULT_CAPSULE_TAIL_CHARS;
  const spillThresholdChars =
    args.spillThresholdChars ?? PROCESS_RESULT_CAPSULE_SPILL_THRESHOLD_CHARS;
  const stdout = typeof args.stdout === "string" ? args.stdout : "";
  const stderr = typeof args.stderr === "string" ? args.stderr : "";
  const exitCode = args.exitCode;
  const captureError = args.captureError?.trim() || undefined;
  const durationMs =
    typeof args.startedAt === "number" && Number.isFinite(args.startedAt)
      ? Math.max(0, (args.endedAt ?? Date.now()) - args.startedAt)
      : undefined;

  const stdoutTail = tailText(stdout, tailChars);
  const stderrTail = tailText(stderr, tailChars);
  const inlineSize = stdout.length + stderr.length;
  const inlineTruncated = stdoutTail.truncated || stderrTail.truncated;
  const shouldSpill = inlineTruncated || inlineSize > spillThresholdChars;

  let spill: ProcessTaskResultSpillRef | undefined;
  if (shouldSpill) {
    try {
      const result = spillToolOutput({
        content: [
          formatCapsuleStream("stdout", stdout),
          formatCapsuleStream("stderr", stderr),
        ]
          .filter(Boolean)
          .join("\n\n"),
        toolName: "execShell",
        ...(args.workspaceRoot !== undefined ? { workspaceRoot: args.workspaceRoot } : {}),
      });
      spill = {
        displayPath: result.displayPath,
        totalChars: result.totalChars,
        totalLines: result.totalLines,
      };
    } catch {
      // Fail-open: spill is a recovery aid; terminal delivery must still happen.
    }
  }

  return {
    stdout: stdoutTail.text,
    stderr: stderrTail.text,
    exitCode,
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(captureError ? { captureError } : {}),
    truncated: inlineTruncated || Boolean(captureError),
    ...(spill ? { spill } : {}),
  };
}
