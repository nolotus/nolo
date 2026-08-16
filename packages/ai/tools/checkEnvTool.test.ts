import { afterEach, describe, expect, it, mock } from "bun:test";

const callToolApiMock = mock(async (_thunkApi, _path, payload) => {
  if (payload?.key === "gemini") {
    return {
      ok: true,
      check: "tool",
      key: "gemini",
      probes: [
        {
          label: "gemini --version",
          ok: true,
          stdout: "0.7.1\n",
        },
        {
          label: "npm latest @google/gemini-cli",
          ok: true,
          stdout: "0.7.2\n",
        },
      ],
    };
  }

  if (payload?.check === "context") {
    return {
      ok: true,
      check: "context",
      platform: "win32",
      cwd: "C:\\repo",
      defaultShell: "powershell",
      shells: {
        bash: false,
        powershell: true,
        pwsh: false,
      },
    };
  }

  return {
    ok: true,
    check: "build",
    exitCode: 0,
  };
});

let moduleVersion = 0;

const loadModule = async () => {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
    getToolBaseUrl: () => "https://us.nolo.chat",
    buildToolRequestHeaders: (_thunkApi: any, options: any = {}) => ({
      "Content-Type": "application/json",
      ...(options.withAuth ? { Authorization: "Bearer token-1" } : {}),
      ...(options.agentKey ? { "X-Nolo-Agent-Key": options.agentKey } : {}),
    }),
  }));

  const mod = await import(`./checkEnvTool.ts`);
  mock.restore();
  return mod;
};

afterEach(() => {
  callToolApiMock.mockClear();
  mock.restore();
});

describe("checkEnvTool", () => {
  const thunkApi = {
    getState: () => ({}),
  };

  it("requests context and formats runtime details", async () => {
    const { checkEnvFunc } = await loadModule();

    const result = await checkEnvFunc({ check: "context" }, thunkApi);

    expect(callToolApiMock).toHaveBeenCalledWith(thunkApi, "/api/check-env", { check: "context" }, {
      withAuth: true,
      agentKey: undefined,
    });
    expect(result.displayData).toContain("当前环境");
    expect(result.displayData).toContain("平台: win32");
    expect(result.displayData).toContain("defaultShell: powershell");
  });

  it("keeps build as the default check", async () => {
    const { checkEnvFunc } = await loadModule();

    const result = await checkEnvFunc({}, thunkApi);

    expect(callToolApiMock).toHaveBeenCalledWith(thunkApi, "/api/check-env", { check: "build" }, {
      withAuth: true,
      agentKey: undefined,
    });
    expect(result.displayData).toContain("环境检查通过: build");
  });

  it("probes a named local tool without forcing the build check", async () => {
    const { checkEnvFunc, checkEnvFunctionSchema } = await loadModule();

    const result = await checkEnvFunc({ key: "gemini" }, thunkApi);

    expect((checkEnvFunctionSchema.parameters.properties as any).key).toBeTruthy();
    expect(callToolApiMock).toHaveBeenCalledWith(thunkApi, "/api/check-env", { key: "gemini" }, {
      withAuth: true,
      agentKey: undefined,
    });
    expect(result.rawData.check).toBe("tool");
    expect(result.displayData).toContain("gemini");
    expect(result.displayData).toContain("gemini --version");
    expect(result.displayData).toContain("0.7.2");
  });
});
