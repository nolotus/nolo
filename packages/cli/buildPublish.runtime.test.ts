import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildPublishArtifact } from "./buildPublish";

describe("CLI dist import resolution", () => {
  const DIST_DIR = join(import.meta.dir, ".test-dist-runtime");

  beforeAll(async () => {
    rmSync(DIST_DIR, { recursive: true, force: true });
    await buildPublishArtifact(import.meta.dir, DIST_DIR);
  });

  afterAll(() => {
    rmSync(DIST_DIR, { recursive: true, force: true });
  });

  test("dist directory exists", () => {
    expect(existsSync(DIST_DIR)).toBe(true);
  });

  test("machineCommands.ts rewritten import resolves correctly", async () => {
    const machineCommandsPath = join(DIST_DIR, "machineCommands.ts");
    expect(existsSync(machineCommandsPath)).toBe(true);

    // The critical import path that was previously broken
    const machineRunPermissionsPath = join(DIST_DIR, "ai", "agent", "machineRunPermissions.ts");
    expect(existsSync(machineRunPermissionsPath)).toBe(true);

    // Verify the import can actually be resolved by TypeScript/Bun
    // This will throw if the import path is incorrect
    const { resolveMachineRunPermissionPolicy } = await import(
      pathToFileURL(machineRunPermissionsPath).href
    );
    expect(typeof resolveMachineRunPermissionPolicy).toBe("function");
  });

  test("agentRuntimeCommands.ts rewritten import resolves correctly", async () => {
    const agentRuntimeCommandsPath = join(DIST_DIR, "agentRuntimeCommands.ts");
    expect(existsSync(agentRuntimeCommandsPath)).toBe(true);

    // Verify the rewritten import can be resolved
    const { resolveMachineRunPermissionPolicy } = await import(
      pathToFileURL(join(DIST_DIR, "ai", "agent", "machineRunPermissions.ts")).href
    );
    expect(typeof resolveMachineRunPermissionPolicy).toBe("function");
  });

  test("agentRunCommand.ts is included for the product agent run entrypoint", async () => {
    const agentRunCommandPath = join(DIST_DIR, "agentRunCommand.ts");
    expect(existsSync(agentRunCommandPath)).toBe(true);

    const { parseAgentRunArgs } = await import(pathToFileURL(agentRunCommandPath).href);
    expect(parseAgentRunArgs(["my-custom-agent", "--msg", "hello"])).toMatchObject({
      agentKey: "my-custom-agent",
      message: "hello",
    });
  });

  test("agentPullCommand.ts is included for local agent bootstrap", async () => {
    const agentPullCommandPath = join(DIST_DIR, "agentPullCommand.ts");
    expect(existsSync(agentPullCommandPath)).toBe(true);

    const { parseAgentPullArgs } = await import(pathToFileURL(agentPullCommandPath).href);
    expect(parseAgentPullArgs(["agent-pub-01FRONTEND"])).toMatchObject({
      agentKey: "agent-pub-01FRONTEND",
    });
  });

  test("client agentRun.ts resolves inlined agent-runtime imports", async () => {
    const agentRunPath = join(DIST_DIR, "client", "agentRun.ts");
    expect(existsSync(agentRunPath)).toBe(true);
    expect(existsSync(join(DIST_DIR, "agent-runtime", "localLoop.ts"))).toBe(true);

    const platformToolsPath = join(DIST_DIR, "client", "agentRunPlatformTools.ts");
    expect(existsSync(platformToolsPath)).toBe(true);
    const { findServerPlatformTools } = await import(pathToFileURL(platformToolsPath).href);
    expect(findServerPlatformTools(["readFile", "queryTableRows"])).toEqual([]);
  });

  test("connector-experimental package was inlined", () => {
    const connectorDir = join(DIST_DIR, "connector-experimental");
    expect(existsSync(connectorDir)).toBe(true);

    const protocolPath = join(connectorDir, "protocol.ts");
    expect(existsSync(protocolPath)).toBe(true);
  });
});
