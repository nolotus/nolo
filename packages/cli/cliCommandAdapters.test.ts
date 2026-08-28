import { describe, expect, mock, test } from "bun:test";

import {
  withCliEntrypointEnv,
  withCliEnv,
  withCliEnvAndScriptDir,
} from "./cliCommandAdapters";

describe("cli command adapters", () => {
  test("withCliEnv passes argv tail and env deps to the command", async () => {
    const command = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv }) => {
      expect(deps.env.NOLO_SERVER).toBe("https://us.nolo.chat");
      return 7;
    });

    const handler = withCliEnv(command);
    const exitCode = await handler(
      ["--json"],
      {
        env: { NOLO_SERVER: "https://us.nolo.chat" } as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(exitCode).toBe(7);
    expect(command).toHaveBeenCalledWith(
      ["--json"],
      expect.objectContaining({
        env: expect.objectContaining({ NOLO_SERVER: "https://us.nolo.chat" }),
      })
    );
  });

  test("withCliEnvAndScriptDir passes scriptDir alongside env deps", async () => {
    const command = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv; scriptDir: string }) => {
      expect(deps.scriptDir).toBe("/tmp/scripts");
      expect(deps.env.NOLO_PROFILE).toBe("local");
      return 0;
    });

    const handler = withCliEnvAndScriptDir(command);
    await handler(
      ["frontend-implementer", "--msg", "hi"],
      {
        env: { NOLO_PROFILE: "local" } as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(command).toHaveBeenCalledWith(
      ["frontend-implementer", "--msg", "hi"],
      expect.objectContaining({
        env: expect.objectContaining({ NOLO_PROFILE: "local" }),
        scriptDir: "/tmp/scripts",
      })
    );
  });

  test("withCliEntrypointEnv passes entrypointPath for machine-oriented commands", async () => {
    const command = mock(async (_args: string[], deps: { env: NodeJS.ProcessEnv; cliEntrypointPath: string }) => {
      expect(deps.cliEntrypointPath).toBe("/tmp/nolo");
      return 0;
    });

    const handler = withCliEntrypointEnv(command);
    await handler(
      ["--ws"],
      {
        env: {} as NodeJS.ProcessEnv,
        scriptDir: "/tmp/scripts",
        entrypointPath: "/tmp/nolo",
        packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
      }
    );

    expect(command).toHaveBeenCalledWith(
      ["--ws"],
      expect.objectContaining({
        cliEntrypointPath: "/tmp/nolo",
      })
    );
  });
});
