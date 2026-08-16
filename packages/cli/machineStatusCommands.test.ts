import { describe, expect, test } from "bun:test";

import {
  formatMachineStatus,
  runMachineStatusCommand,
} from "./machineStatusCommands";

describe("cli machine status commands", () => {
  test("formats an empty machine list with the next command", () => {
    expect(formatMachineStatus([])).toContain("No connected machines");
    expect(formatMachineStatus([])).toContain("nolo connect");
  });

  test("formats connected machine capabilities", () => {
    expect(
      formatMachineStatus([
        {
          machineId: "machine-1",
          name: "Windows Workstation",
          platform: "win32",
          arch: "x64",
          connectorVersion: "0.1.0",
          capabilities: ["codex-cli", "local-llm:qwen"],
          connectorStatus: "connected",
          status: "online",
          lastSeenAt: 1_000,
        },
      ])
    ).toContain("Windows Workstation  online  ws:connected  win32/x64  codex-cli, local-llm:qwen");
  });

  test("status fetches machines from the selected server", async () => {
    let requestedUrl = "";
    const chunks: string[] = [];

    const exitCode = await runMachineStatusCommand([], {
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      fetchImpl: async (url) => {
        requestedUrl = String(url);
        return new Response(
          JSON.stringify({
            machines: [
              {
                machineId: "machine-1",
                name: "Linux VPS",
                platform: "linux",
                arch: "x64",
                connectorVersion: null,
                capabilities: [],
                connectorStatus: "disconnected",
                status: "online",
                lastSeenAt: 1,
              },
            ],
          }),
          { status: 200 }
        );
      },
    });

    expect(exitCode).toBe(0);
    expect(requestedUrl).toBe("https://agent.nolo.chat/api/machines");
    expect(chunks.join("")).toContain("Linux VPS");
    expect(chunks.join("")).toContain("ws:disconnected");
  });

  test("status defaults to the production server when NOLO_SERVER is unset", async () => {
    let requestedUrl = "";

    const exitCode = await runMachineStatusCommand([], {
      env: {
        AUTH_TOKEN: "token-abc",
      },
      output: { write() {} },
      fetchImpl: async (url) => {
        requestedUrl = String(url);
        return new Response(JSON.stringify({ machines: [] }), { status: 200 });
      },
    });

    expect(exitCode).toBe(0);
    expect(requestedUrl).toBe("https://nolo.chat/api/machines");
  });

  test("status reports transport failures without throwing", async () => {
    const chunks: string[] = [];

    const exitCode = await runMachineStatusCommand([], {
      env: {
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      fetchImpl: async () => {
        throw new Error("connect ECONNREFUSED");
      },
    });

    expect(exitCode).toBe(1);
    expect(chunks.join("")).toContain("[nolo] Machine status failed: connect ECONNREFUSED");
  });
});
