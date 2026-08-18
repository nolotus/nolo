import { describe, expect, test } from "bun:test";

import { runMachineWatchCommand } from "./machineWatchCommands";

describe("cli machine watch commands", () => {
  test("watch keeps sending heartbeats through the connector loop", async () => {
    let loopCalls = 0;
    let heartbeatCalls = 0;
    const chunks: string[] = [];

    const exitCode = await runMachineWatchCommand({
      env: {
        NOLO_CONNECT_HEARTBEAT_MS: "1234",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      machine: {
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: [],
      } as any,
      sendHeartbeat: async () => {
        heartbeatCalls += 1;
      },
      runHeartbeatLoop: async ({ intervalMs, sendHeartbeat }) => {
        loopCalls += 1;
        expect(intervalMs).toBe(1234);
        await sendHeartbeat();
        await sendHeartbeat();
      },
    });

    expect(exitCode).toBe(0);
    expect(loopCalls).toBe(1);
    expect(heartbeatCalls).toBe(2);
    expect(chunks.join("")).toContain("Connecting machine heartbeat loop: Test Machine (linux/x64)");
  });

  test("watch reports heartbeat loop failures", async () => {
    const chunks: string[] = [];

    const exitCode = await runMachineWatchCommand({
      env: {},
      output: { write(chunk) { chunks.push(chunk); } },
      machine: {
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: [],
      } as any,
      sendHeartbeat: async () => undefined,
      runHeartbeatLoop: async () => {
        throw new Error("loop failed");
      },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("[nolo] Machine heartbeat loop failed: loop failed");
  });
});
