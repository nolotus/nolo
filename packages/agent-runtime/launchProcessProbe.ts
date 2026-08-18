import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

import { createLocalWorkspaceToolExecutors } from "./localWorkspaceTools.ts";
import { getProcessRegistry } from "./processRegistry.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function createWorkspace() {
  return mkdtempSync(join(tmpdir(), "nolo-launch-process-probe-"));
}

async function run() {
  const root = createWorkspace();
  try {
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const startTime = Date.now();
    const launchResult = await executors.launchProcess({
      id: "call-launch-probe",
      name: "launchProcess",
      arguments: JSON.stringify({ command: "sleep 10" }),
    });
    const duration = Date.now() - startTime;

    assert(duration < 1000, `launchProcess took ${duration}ms, expected < 1000ms`);

    const launchData = JSON.parse(launchResult.content);
    assert(typeof launchData.pid === "number", "pid should be a number");
    assert(launchData.status === "running", "status should be running");

    const listResult = await executors.listProcesses({
      id: "call-list-probe",
      name: "listProcesses",
      arguments: "{}",
    });

    const listData = JSON.parse(listResult.content);
    assert(Array.isArray(listData), "listProcesses should return an array");
    const found = listData.find((p: any) => p.pid === launchData.pid);
    assert(found !== undefined, "launched pid should be in listProcesses output");

    // Wait 1s
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const registry = getProcessRegistry();
    const killed = registry.kill(launchData.pid);
    assert(killed === true, "registry.kill should return true");

    // Allow process kill signal to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify pgrep or process kill state
    if (process.platform !== "win32") {
      let pgrepFound = false;
      try {
        const out = execSync(`pgrep -P ${process.pid} || true`).toString();
        const pids = out.trim().split(/\s+/).map(Number);
        if (pids.includes(launchData.pid)) {
          pgrepFound = true;
        }
      } catch {
        // pgrep not available or error
      }
      assert(!pgrepFound, `Process PID ${launchData.pid} should not exist in pgrep after kill`);
    }

    console.log("launchProcessProbe: SUCCESS");
  } finally {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

run().catch((err) => {
  console.error("launchProcessProbe: FAILED", err);
  process.exit(1);
});
