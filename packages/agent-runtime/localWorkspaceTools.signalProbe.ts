import { existsSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createLocalWorkspaceToolExecutors } from "./localWorkspaceTools.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/**
 * Probe: execShell spawns a detached child in its own process group. When the
 * host process (TUI/CLI) receives SIGHUP (terminal closed), the detached child
 * must be cleaned up, not left running. This probe reproduces the TUI close
 * scenario by issuing execShell then SIGHUP-ing itself, and checks the child
 * did not survive to write its proof file.
 */
async function run() {
  const root = mkdtempSync(join(tmpdir(), "nolo-signal-probe-"));
  const proofFile = join(root, "survived.txt");
  if (existsSync(proofFile)) unlinkSync(proofFile);

  const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

  // Long-running command that writes a proof file only if it reaches the end.
  // 6s is long enough to outlive the SIGHUP + settle window below.
  const cmd = process.platform === "win32"
    ? `Start-Sleep -Seconds 6; Set-Content -Path ${proofFile} -Value survived`
    : `sleep 6; echo survived > ${proofFile}`;

  // Fire execShell without awaiting — we simulate the host dying mid-run.
  const runPromise = executors.execShell({
    id: "call-signal-probe",
    name: "execShell",
    arguments: JSON.stringify({ cmd }),
  });
  runPromise.catch(() => {
    // Host exits before the tool settles; an unhandled rejection here would
    // mask the real signal behavior under test. Swallow.
  });

  // Give the child a moment to spawn and enter its detached process group.
  await delay(400);

  // Simulate terminal close: SIGHUP to ourselves. The fix in runWorkspaceCommand
  // forwards this to the detached child's process group.
  process.kill(process.pid, "SIGHUP");

  // Keep the process alive briefly so the SIGHUP handler runs before exit.
  await delay(1500);

  // Wait past the full 6s sleep. A killed child never writes the proof file;
  // a survivor would. Distinguish "killed early" from "ran to end".
  await delay(5500);

  const survived = existsSync(proofFile);
  assert(!survived, "detached execShell child should be killed on host SIGHUP, but the proof file was written — child survived");
}

await run();