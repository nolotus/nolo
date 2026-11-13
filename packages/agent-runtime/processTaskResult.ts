import { openSync, readSync, closeSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { isSpilledToolOutput } from "./toolOutputSpillProjection";
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
// Boundaries (capture/spill strategy, per tool):
// - execShell (promoted/detached tasks): the command runner hands the FULL
//   drained stdout/stderr here; any inline truncation spills that full output
//   to the existing tool spill store (`spillToolOutput`, toolName
//   "execShell") so truncated output always has a recoverable full-output
//   ref. Spill failure is fail-open: the bounded tails below are still
//   preserved.
// - launchProcess (ambient tasks): since the P1 backpressure fix its
//   terminal path DOES attach a capsule (markExited with one). Spawn-time
//   drains keep a bounded tail ring per stream AND — from the first ring
//   eviction on — a full-output capture, so the spill ref below is the real
//   process output, never just the surviving ring tail. That capture is
//   bounded, so the caller also passes live `streamProvenance` counters
//   (original-stream sizes + eviction evidence): capsule.truncated and the
//   spill metadata are decided from the original stream, never from the
//   size of the buffered text alone.

import { countLines, spillToolOutput } from "./toolSpillStore";

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

/**
 * Facts about an ORIGINAL stream, recorded live by a bounded caller-side
 * capture (launchProcess drain). Because the capture buffers at most a
 * bounded full-output slice, these counters — not the size of the buffered
 * text — are the source of truth for "how much did the process produce".
 */
export type ProcessTaskStreamProvenance = {
  /** True when the caller's tail ring evicted earlier data. */
  evicted: boolean;
  /** Chars in the original stream (accurate even when the capture bounded). */
  totalChars: number;
  /** Lines in the original stream (`countLines` convention). */
  totalLines: number;
};

/** Recovery path and output counters (capsule.spill aggregates separate streamSpills). */
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
  /** Separate original streams when capture already published spill files. */
  streamSpills?: { stdout?: ProcessTaskResultSpillRef; stderr?: ProcessTaskResultSpillRef };
};

/** Keep only the last `maxChars` chars, reporting whether anything was cut. */
function tailText(value: string, maxChars: number): { text: string; truncated: boolean } {
  if (value.length <= maxChars) return { text: value, truncated: false };
  return { text: value.slice(-maxChars), truncated: true };
}

/** Read counters from the existing file, never from its bounded preview. */
function reuseStreamSpill(text: string, workspaceRoot?: string): ProcessTaskResultSpillRef | undefined {
  const displayPath = /Full output saved to ([^\n]+?)\]/.exec(text)?.[1];
  if (!displayPath) return undefined;
  const path = isAbsolute(displayPath) ? displayPath : workspaceRoot ? resolve(workspaceRoot, displayPath) : undefined;
  if (!path) return undefined;
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const decoder = new StringDecoder("utf8");
    let totalChars = 0, newlines = 0;
    const count = (chunk: string) => {
      totalChars += chunk.length;
      for (let i = chunk.indexOf("\n"); i >= 0; i = chunk.indexOf("\n", i + 1)) newlines++;
    };
    for (let bytes; (bytes = readSync(fd, buffer, 0, buffer.length, null)) > 0;) count(decoder.write(buffer.subarray(0, bytes)));
    count(decoder.end());
    return { displayPath, totalChars, totalLines: totalChars ? newlines + 1 : 0 };
  } finally { closeSync(fd); }
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
  /**
   * Optional TRUE-TAIL sources for the inline capsule (launchProcess drain's
   * live ring). When provided, inline tails are sliced from these — NOT from
   * the stdout/stderr capture above, whose text can end at the bounded
   * prefix's end rather than the process's real tail.
   */
  stdoutTail?: string;
  stderrTail?: string;
  /**
   * Bounded-capture provenance (launchProcess drain). When provided, the
   * stdout/stderr above are whatever the bounded capture could hold (a tail
   * ring plus a bounded full-output slice) while these describe the
   * ORIGINAL streams. Effects:
   * - `evicted` counts as truncation evidence even if the buffered text
   *   happens to fit the tail cap;
   * - the spill ref reports the real original-stream totals, so a capped
   *   capture still records the true char/line counts.
   */
  streamProvenance?: {
    stdout?: ProcessTaskStreamProvenance;
    stderr?: ProcessTaskStreamProvenance;
  };
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

  const stdoutProvenance = args.streamProvenance?.stdout;
  const stderrProvenance = args.streamProvenance?.stderr;
  const ringEvicted = Boolean(stdoutProvenance?.evicted || stderrProvenance?.evicted);

  // Inline tails prefer the caller's live ring (the process's real last
  // bytes); fall back to slicing the capture for callers that pass the full
  // stream (e.g. promoted execShell).
  const stdoutTailSource = typeof args.stdoutTail === "string" ? args.stdoutTail : stdout;
  const stderrTailSource = typeof args.stderrTail === "string" ? args.stderrTail : stderr;
  const stdoutTail = tailText(stdoutTailSource, tailChars);
  const stderrTail = tailText(stderrTailSource, tailChars);
  const inlineSize = stdout.length + stderr.length;
  const inlineTruncated = stdoutTail.truncated || stderrTail.truncated;
  // A ring eviction is direct evidence that the inline tails are not the
  // complete streams — independent of how the buffered text compares to the
  // tail cap.
  const truncated = inlineTruncated || ringEvicted || Boolean(captureError) || isSpilledToolOutput(stdout) || isSpilledToolOutput(stderr);
  const shouldSpill = truncated || inlineSize > spillThresholdChars;

  let spill: ProcessTaskResultSpillRef | undefined;
  let streamSpills: ProcessTaskResultCapsule["streamSpills"];
  if (isSpilledToolOutput(stdout) || isSpilledToolOutput(stderr)) {
    streamSpills = {};
    for (const [name, text] of [["stdout", stdout], ["stderr", stderr]] as const) {
      if (!text) continue;
      try {
        if (isSpilledToolOutput(text)) {
          streamSpills[name] = reuseStreamSpill(text, args.workspaceRoot);
        } else {
          const result = spillToolOutput({ content: text, toolName: "execShell", workspaceRoot: args.workspaceRoot });
          streamSpills[name] = { displayPath: result.displayPath, totalChars: result.totalChars, totalLines: result.totalLines };
        }
      } catch { /* Preserve the inline pointer if the original file cannot be read. */ }
    }
    const primary = streamSpills.stdout ?? streamSpills.stderr;
    if (primary) {
      spill = {
        displayPath: primary.displayPath,
        totalChars: (streamSpills.stdout?.totalChars ?? 0) + (streamSpills.stderr?.totalChars ?? 0),
        totalLines: (streamSpills.stdout?.totalLines ?? 0) + (streamSpills.stderr?.totalLines ?? 0),
      };
    }
  } else if (shouldSpill) {
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
        // Prefer the caller's live provenance counters: they count every
        // byte of the original stream, while the buffered content above may
        // be a capped prefix of it.
        totalChars:
          (stdoutProvenance?.totalChars ?? stdout.length) +
          (stderrProvenance?.totalChars ?? stderr.length),
        totalLines:
          (stdoutProvenance?.totalLines ?? countLines(stdout)) +
          (stderrProvenance?.totalLines ?? countLines(stderr)),
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
    truncated,
    ...(spill ? { spill } : {}),
    ...(streamSpills ? { streamSpills } : {}),
  };
}
