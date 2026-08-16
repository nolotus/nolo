import { describe, expect, mock, test } from "bun:test";

import {
  createArgsCommand,
  createContextCommand,
  createDaemonShortcutCommand,
  createEnvCommand,
  createEntrypointEnvCommand,
  createEnvScriptDirCommand,
} from "./cliCommandFactories";

describe("cli command factories", () => {
  test("createEnvCommand returns an internal command that binds env deps", async () => {
    const commandImpl = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv }) => {
      expect(deps.env.NOLO_SERVER).toBe("https://us.nolo.chat");
      return 11;
    });

    const entry = createEnvCommand(["agent", "list"], "List owned agents", commandImpl);

    expect(entry.kind).toBe("internal");
    expect(entry.path).toEqual(["agent", "list"]);
    expect(entry.description).toBe("List owned agents");

    const exitCode = await entry.handler!(
      ["--json"],
      {
        env: { NOLO_SERVER: "https://us.nolo.chat" } as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(exitCode).toBe(11);
  });

  test("createEnvScriptDirCommand binds scriptDir for agent run commands", async () => {
    const commandImpl = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv; scriptDir: string }) => {
      expect(deps.scriptDir).toBe("/tmp/scripts");
      return 0;
    });

    const entry = createEnvScriptDirCommand(["agent", "run"], "Run an agent", commandImpl);
    await entry.handler!(
      ["frontend-implementer"],
      {
        env: {} as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(commandImpl).toHaveBeenCalled();
  });

  test("createEntrypointEnvCommand binds entrypointPath for machine connect", async () => {
    const commandImpl = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv; cliEntrypointPath: string }) => {
      expect(deps.cliEntrypointPath).toBe("/tmp/nolo");
      return 0;
    });

    const entry = createEntrypointEnvCommand(["connect"], "Send machine heartbeats", commandImpl);
    await entry.handler!(
      ["--ws"],
      {
        env: {} as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(commandImpl).toHaveBeenCalled();
  });

  test("createArgsCommand ignores runtime context and forwards only args", async () => {
    const commandImpl = mock(async (args: string[]) => {
      expect(args).toEqual(["--token", "abc"]);
      return 5;
    });

    const entry = createArgsCommand(["login"], "Log in", commandImpl);
    const exitCode = await entry.handler!(
      ["--token", "abc"],
      {
        env: { NOLO_SERVER: "https://ignored.example" } as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(exitCode).toBe(5);
    expect(commandImpl).toHaveBeenCalledTimes(1);
  });

  test("createContextCommand exposes full runtime context to the handler", async () => {
    const commandImpl = mock(async (_args: string[], ctx: any) => {
      expect(ctx.entrypointPath).toBe("/tmp/nolo");
      expect(ctx.packageInfo.version).toBe("0.0.0");
      return 0;
    });

    const entry = createContextCommand(["version"], "Show version", commandImpl);
    await entry.handler!(
      [],
      {
        env: {} as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(commandImpl).toHaveBeenCalled();
  });

  test("createDaemonShortcutCommand normalizes daemon env and rewrites args", async () => {
    const commandImpl = mock(async (args: string[], deps: { env: NodeJS.ProcessEnv; cliEntrypointPath: string }) => {
      expect(args).toEqual(["--ws"]);
      expect(deps.cliEntrypointPath).toBe("/tmp/nolo");
      expect(deps.env.NOLO_SERVER).toBe("https://api.nolo.chat");
      expect(deps.env.AUTH_TOKEN).toBe("sk_machine_xxx");
      return 0;
    });

    const entry = createDaemonShortcutCommand(["daemon"], "Daemon shortcut", commandImpl);
    await entry.handler!(
      ["--server-url", "https://api.nolo.chat", "--machine-key", "sk_machine_xxx"],
      {
        env: {} as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(commandImpl).toHaveBeenCalledTimes(1);
  });
});
