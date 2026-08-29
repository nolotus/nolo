// Phase 0 integration tests: Execution Envelope pre-registration, grace GC,
// same-process promotion and the append-only event stream, exercised through
// runWorkspaceCommand (the execShell core). See handoff doc §12.1 items 2-3.
import { test, expect, beforeEach, afterEach } from "bun:test";
import { ok } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runWorkspaceCommand } from "./workspaceShell";
import { getProcessRegistry } from "./processRegistry";
import type { RegisteredProcess } from "./processRegistry";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until `fn` returns a value (envelope appears right after spawn). */
async function waitForEnvelope(
  fn: () => RegisteredProcess | undefined,
  timeoutMs = 3000,
): Promise<RegisteredProcess> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value !== undefined) return value;
    await wait(20);
  }
  throw new Error("waitForEnvelope: envelope did not appear in time");
}

let workspaceRoot: string;

beforeEach(() => {
  getProcessRegistry().clear();
  workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-exec-envelope-"));
});

afterEach(() => {
  // Never leak processes between tests.
  getProcessRegistry().stopAll(undefined, { includePersist: true });
  getProcessRegistry().clear();
  try {
    rmSync(workspaceRoot, { recursive: true, force: true });
  } catch {
    // best effort
  }
});

test("envelope is pre-registered at spawn time, long before the detach threshold", async () => {
  const pending = runWorkspaceCommand({
    workspaceRoot,
    command: ["sleep", "5"],
    detachMs: 30_000, // would not fire during this test
  });

  const envelope = await waitForEnvelope(() =>
    getProcessRegistry().list().find((p) => p.command === "sleep 5"),
  );
  // Registration happened while the command was still running in grace.
  expect(envelope.status).toBe("running");
  expect(envelope.promoted).toBe(false);
  expect(envelope.taskId).toMatch(/^ptask-/);
  expect(envelope.pid).toBeGreaterThan(0);
  expect(envelope.pgid).toBe(envelope.pid);
  expect(envelope.label).toBe("5"); // deriveLabel takes the last command token (legacy behavior)
  expect(envelope.startedAt).toBeGreaterThan(0);

  const startedEvents = getProcessRegistry().getTaskEvents(envelope.taskId);
  expect(startedEvents).toEqual([
    expect.objectContaining({ seq: 1, type: "started", pid: envelope.pid }),
  ]);

  // End the command while still in grace; the foreground result must keep the
  // legacy shape and the envelope must be GC'd (不留痕是结果).
  try {
    process.kill(-envelope.pid, "SIGTERM");
  } catch {
    // already gone
  }
  const result = await pending;

  expect(result.detached).toBeFalsy();
  expect((result as { taskId?: unknown }).taskId).toBeUndefined();
  expect(Object.keys(result).sort()).toEqual(
    ["aborted", "content", "exitCode", "stderr", "stdout", "timedOut"],
  );
  expect(result.exitCode).toBe(0);
  expect(result.timedOut).toBe(false);
  expect(result.aborted).toBe(false);

  expect(getProcessRegistry().get(envelope.pid)).toBeUndefined();
  expect(getProcessRegistry().list()).toHaveLength(0);
  // The audit trail survives the GC.
  expect(
    getProcessRegistry().getTaskEvents(envelope.taskId).map((e) => [e.seq, e.type]),
  ).toEqual([[1, "started"], [2, "exited"]]);
});

test("fast foreground commands GC their envelope and keep the exact legacy result shape", async () => {
  const result = await runWorkspaceCommand({
    workspaceRoot,
    command: ["echo", "hi"],
  });

  expect(Object.keys(result).sort()).toEqual(
    ["aborted", "content", "exitCode", "stderr", "stdout", "timedOut"],
  );
  expect(result.stdout).toBe("hi\n");
  expect(result.exitCode).toBe(0);
  expect(result.timedOut).toBe(false);
  expect(result.aborted).toBe(false);
  expect(result.content).toContain("exitCode: 0");
  expect(getProcessRegistry().list()).toHaveLength(0);
});

test("foreground timeout (still in grace) also GCs the envelope", async () => {
  const pending = runWorkspaceCommand({
    workspaceRoot,
    command: ["sleep", "30"],
    timeoutMs: 250,
    detachMs: 30_000,
  });
  const envelope = await waitForEnvelope(() =>
    getProcessRegistry().list().find((p) => p.command === "sleep 30"),
  );

  const result = await pending;
  expect(result.detached).toBeFalsy();
  expect(result.timedOut).toBe(true);
  expect(result.exitCode).toBe(124);
  expect(getProcessRegistry().get(envelope.pid)).toBeUndefined();
  const events = getProcessRegistry().getTaskEvents(envelope.taskId);
  expect(events.map((e) => [e.seq, e.type])).toEqual([[1, "started"], [2, "exited"]]);
  expect(events[1]?.exitCode).toBe(124);
});

test("timeout-detach promotes the pre-registered envelope: same taskId, single record", async () => {
  const pending = runWorkspaceCommand({
    workspaceRoot,
    command: ["sleep", "30"],
    detachMs: 200,
  });
  const preRegistered = await waitForEnvelope(() =>
    getProcessRegistry().list().find((p) => p.command === "sleep 30"),
  );

  const result = await pending;
  expect(result.detached).toBe(true);
  ok(result.detached); // narrow to the detached variant for pid/label/taskId
  // Same envelope: identical taskId and pid — never a re-execution, never a
  // second record.
  expect(result.taskId).toBe(preRegistered.taskId);
  expect(result.pid).toBe(preRegistered.pid);
  expect(getProcessRegistry().list()).toHaveLength(1);

  const promoted = getProcessRegistry().getByTaskId(preRegistered.taskId);
  expect(promoted?.promoted).toBe(true);
  expect(promoted?.status).toBe("running");

  // Legacy detached return body intact; taskId is additive.
  expect(result.label).toBe("30"); // deriveLabel takes the last command token (legacy behavior)
  expect(result.exitCode).toBe(0);
  expect(result.timedOut).toBe(false);
  expect(JSON.parse(result.content)).toEqual({
    detached: true,
    pid: result.pid,
    label: "30",
    taskId: preRegistered.taskId,
    status: "running",
  });

  // Event stream of the one task: started(1) -> promoted(2) -> killed(3).
  expect(getProcessRegistry().kill(result.pid)).toBe(true);
  expect(
    getProcessRegistry().getTaskEvents(preRegistered.taskId).map((e) => [e.seq, e.type]),
  ).toEqual([[1, "started"], [2, "promoted"], [3, "killed"]]);
});

test("immediate smart-detach (detachMs 0) reuses the pre-registered envelope", async () => {
  const result = await runWorkspaceCommand({
    workspaceRoot,
    command: ["sleep", "30"],
    detachMs: 0,
  });

  expect(result.detached).toBe(true);
  ok(result.detached); // narrow to the detached variant for pid/taskId
  expect(result.taskId).toMatch(/^ptask-/);
  const envelope = getProcessRegistry().getByTaskId(result.taskId);
  expect(envelope?.pid).toBe(result.pid);
  expect(envelope?.promoted).toBe(true);
  expect(JSON.parse(result.content).reason).toBe("long-running-command");
  expect(
    getProcessRegistry().getTaskEvents(result.taskId).map((e) => [e.seq, e.type]),
  ).toEqual([[1, "started"], [2, "promoted"]]);
  expect(getProcessRegistry().kill(result.pid)).toBe(true);
});

test("spawn failure leaves no envelope behind", async () => {
  const result = await runWorkspaceCommand({
    workspaceRoot,
    command: ["definitely-not-a-real-binary-phase0-xyz"],
    detachMs: 30_000,
  });

  expect((result as { spawnFailed?: boolean }).spawnFailed).toBe(true);
  expect(result.exitCode).toBe(127);
  expect(getProcessRegistry().list()).toHaveLength(0);
});
