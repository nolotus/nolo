import { describe, expect, test } from "bun:test";

import { runMachineDaemonCommand } from "./machineDaemonCommands";

describe("cli machine daemon commands", () => {
  test("daemon starts a silent background connector process", async () => {
    const chunks: string[] = [];
    const spawned: any[] = [];

    const exitCode = await runMachineDaemonCommand({
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
        NOLO_CONNECT_LOG: "C:\\tmp\\nolo-connector.log",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      cliEntrypointPath: "/repo/packages/cli/index.ts",
      validateWorkspaceLinks: async () => [],
      spawnDaemon: (args) => {
        spawned.push(args);
        return { pid: 1234 };
      },
    });

    expect(exitCode).toBe(0);
    expect(spawned).toHaveLength(1);
    expect(spawned[0].cmd).toEqual([
      process.execPath,
      "/repo/packages/cli/index.ts",
      "connect",
      "--ws",
    ]);
    expect(spawned[0].logPath).toBe("C:\\tmp\\nolo-connector.log");
    expect(chunks.join("")).toContain("Connector daemon started pid=1234");
    expect(chunks.join("")).toContain("C:\\tmp\\nolo-connector.log");
  });

  test("daemon refuses unsafe workspace package links before spawning", async () => {
    const chunks: string[] = [];
    const spawned: any[] = [];

    const exitCode = await runMachineDaemonCommand({
      env: {
        NOLO_SERVER: "https://agent.nolo.chat",
        AUTH_TOKEN: "token-abc",
      },
      output: { write(chunk) { chunks.push(chunk); } },
      validateWorkspaceLinks: async () => [
        "/repo/node_modules/ai points outside this checkout: /other/packages/ai. Run bun install in /repo.",
      ],
      spawnDaemon: (args) => {
        spawned.push(args);
        return { pid: 1234 };
      },
    });

    expect(exitCode).toBe(1);
    expect(spawned).toHaveLength(0);
    expect(chunks.join("")).toContain("workspace package links are unsafe");
    expect(chunks.join("")).toContain("points outside this checkout");
  });
});
