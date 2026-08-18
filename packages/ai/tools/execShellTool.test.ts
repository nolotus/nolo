import { afterEach, describe, expect, it, mock } from "bun:test";

const callToolApiMock = mock(async () => ({
  ok: true,
}));

let moduleVersion = 0;

const loadModule = async () => {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
    ToolApiError: class ToolApiError extends Error {},
    getRequestConfig: () => ({
      currentServer: "https://us.nolo.chat",
      token: "token-1",
    }),
    getToolRequestContext: () => ({
      currentServer: "https://us.nolo.chat",
      token: "token-1",
      baseUrl: "https://us.nolo.chat",
    }),
    getToolBaseUrl: () => "https://us.nolo.chat",
    resolveToolBaseUrl: () => "https://us.nolo.chat",
    resolveToolApiBaseUrl: () => "https://us.nolo.chat",
    buildToolRequestHeaders: (_thunkApi: any, options: any = {}) => ({
      "Content-Type": "application/json",
      ...(options.withAuth ? { Authorization: "Bearer token-1" } : {}),
      ...(options.agentKey ? { "X-Nolo-Agent-Key": options.agentKey } : {}),
    }),
  }));

  const mod = await import(`./execShellTool.ts`);
  mock.restore();
  return mod;
};

afterEach(() => {
  callToolApiMock.mockClear();
  mock.restore();
});

describe("execShellTool helpers", () => {
  const thunkApi = {
    getState: () => ({}),
  };

  it("fails execShell when the local API request fails", async () => {
    callToolApiMock.mockImplementationOnce(async () => {
      throw new Error("Load failed");
    });
    const { execShellFunc } = await loadModule();

    await expect(execShellFunc({ command: "pwd" }, thunkApi)).rejects.toMatchObject({
      name: "ToolResultError",
      rawData: {
        error: expect.stringContaining("Load failed"),
      },
      displayData: expect.stringContaining("execShell 调用失败"),
    });
  });

  it("starts an execShell session with the expected payload", async () => {
    const { startExecShellSession } = await loadModule();

    await startExecShellSession(thunkApi, {
      command: "Get-Location",
      cwd: "packages/server",
      shell: "auto",
    });

    expect(callToolApiMock).toHaveBeenCalledWith(
      thunkApi,
      "/api/exec-shell",
      {
        command: "Get-Location",
        cwd: "packages/server",
        interactive: true,
        shell: "auto",
      },
      {
        withAuth: true,
        agentKey: undefined,
      },
    );
  });
});
