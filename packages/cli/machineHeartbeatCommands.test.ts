import { describe, expect, test } from "bun:test";

import { runMachineHeartbeatConnectCommand } from "./machineHeartbeatCommands";

describe("cli machine heartbeat commands", () => {
  test("one-shot connect posts a heartbeat and prints the connected machine", async () => {
    const calls: Array<{ url: string; body: any; auth: string | null }> = [];
    const chunks: string[] = [];

    const exitCode = await runMachineHeartbeatConnectCommand({
      output: { write(chunk) { chunks.push(chunk); } },
      machine: {
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        connectorVersion: "0.1.0",
        capabilities: ["shell-readonly"],
      } as any,
      sendHeartbeat: async () => {
        calls.push({
          url: "https://agent.nolo.chat/api/machines/heartbeat",
          auth: "Bearer token-abc",
          body: {
            machineId: "machine-test",
            name: "Test Machine",
            platform: "linux",
            arch: "x64",
            connectorVersion: "0.1.0",
            capabilities: ["shell-readonly"],
          },
        });
      },
    });

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      {
        url: "https://agent.nolo.chat/api/machines/heartbeat",
        auth: "Bearer token-abc",
        body: {
          machineId: "machine-test",
          name: "Test Machine",
          platform: "linux",
          arch: "x64",
          connectorVersion: "0.1.0",
          capabilities: ["shell-readonly"],
        },
      },
    ]);
    expect(chunks.join("")).toContain("Connected machine: Test Machine (linux/x64)");
  });

  test("one-shot connect reports heartbeat failures", async () => {
    const chunks: string[] = [];

    const exitCode = await runMachineHeartbeatConnectCommand({
      output: { write(chunk) { chunks.push(chunk); } },
      machine: {
        machineId: "machine-test",
        name: "Test Machine",
        platform: "linux",
        arch: "x64",
        capabilities: [],
      } as any,
      sendHeartbeat: async () => {
        throw new Error("HTTP 500");
      },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("[nolo] Machine connect failed: HTTP 500");
  });
});
