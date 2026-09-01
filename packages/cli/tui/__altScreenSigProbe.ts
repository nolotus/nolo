/**
 * Subprocess helper for the alternate-screen signal-exit tests.
 * NOT shipped — only spawned by readlineWorkspace.test.ts via Bun.spawn.
 *
 * Behavior is selected by argv:
 *   "install"            — install handlers, then idle; signal should exit.
 *   "install+listener"   — install handlers after attaching a pre-existing
 *                          SIGINT listener that sets a marker; verifies the
 *                          listener runs exactly once.
 *   "throw"              — throw after install so uncaughtException fires;
 *                          must print the error and exit non-zero.
 *
 * Readiness and diagnostics travel through files: under "bun test" with a
 * repo-local test file the runner intercepts spawned children's stdout AND
 * stderr pipes, so pipe-based channels lose bytes on the parent side. Real
 * stderr keeps flowing (CI/human diagnostics); the file channels are what
 * the test asserts on. Non-TTY output keeps `leaveAltScreen` a no-op — we
 * are testing exit semantics, not ANSI bytes.
 */
import { appendFileSync } from "node:fs";
import { installAltScreenRestoreHandlers } from "./readlineWorkspace";

const mode = process.argv[2] ?? "install";
const readyFile = process.argv[3];
const diagFile = process.argv[4];
const output = process.stderr; // non-TTY in the child; leaveAltScreen no-op

if (!readyFile) throw new Error("missing ready-file argument");

// Tee every stderr write into the diag file BEFORE any listener or handler is
// installed, so pre-install markers, listener runs and the uncaughtException
// report are all observable by the parent even when its stderr pipe is
// intercepted.
if (diagFile) {
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: any, ...rest: any[]) => {
    try {
      appendFileSync(diagFile, typeof chunk === "string" ? chunk : String(chunk));
    } catch {
      // A failing diagnostic tee must never mask the real stderr output.
    }
    return originalWrite(chunk, ...rest);
  }) as typeof process.stderr.write;
}

if (mode === "install+listener") {
  // MUST register the pre-existing listener BEFORE install so the handler
  // snapshots it (otherwise install sees no listeners and auto-exits on
  // signal, bypassing the listener entirely).
  let count = 0;
  process.on("SIGINT", () => {
    count += 1;
    process.stderr.write(`listener-runs=${count}\n`);
    process.exit(count);
  });
}

installAltScreenRestoreHandlers(output);

// File-based readiness handshake: the parent polls this file instead of
// reading stdout (which the runner may intercept).
appendFileSync(readyFile, "ready\n");

if (mode === "throw") {
  // Defer so the parent has time to observe the ready file.
  setTimeout(() => {
    throw new Error("probe-boom");
  }, 20);
} else {
  // Idle; the parent will send a real signal. Keep the loop alive.
  setInterval(() => {}, 1000);
}
