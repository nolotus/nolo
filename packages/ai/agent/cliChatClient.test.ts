import { afterEach, describe, expect, it, mock } from "bun:test";

const selectCurrentServerMock = mock(() => "http://localhost");
const selectCurrentTokenMock = mock(() => "token-1");
const getIsDesktopAppMock = mock(() => false);
const originalFetch = globalThis.fetch;

// Bun 的 mock.restore() 清不掉 mock.module——被替换的导出会泄漏到后续 suite
// 文件。这里快照真实模块，afterEach 手动还原。
// （selectIdentityToken 被永久替换成恒返回 token 的 mock，曾让 queryRunOverlay
//  的「无 token」用例拿到 token 而变红。）
const realSettingSliceSnapshot = { ...(await import("app/settings/settingSlice")) };
const realAuthSliceSnapshot = { ...(await import("auth/authSlice")) };
const realIdentitySelectorsSnapshot = { ...(await import("identity/selectors")) };
const realEnvSnapshot = { ...(await import("app/utils/env")) };

const restoreLeakedModuleMocks = () => {
  mock.module("app/settings/settingSlice", () => realSettingSliceSnapshot);
  mock.module("auth/authSlice", () => realAuthSliceSnapshot);
  mock.module("identity/selectors", () => realIdentitySelectorsSnapshot);
  mock.module("app/utils/env", () => realEnvSnapshot);
};

let moduleVersion = 0;

const loadModule = async (isDesktop = false) => {
  getIsDesktopAppMock.mockImplementation(() => isDesktop);
  selectCurrentServerMock.mockImplementation(() =>
    isDesktop ? "https://nolo.chat" : "http://localhost",
  );

  const realSettingSlice = await import("app/settings/settingSlice");
  const realAuthSlice = await import("auth/authSlice");
  const realIdentitySelectors = await import("identity/selectors");
  const realEnv = await import("app/utils/env");

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: selectCurrentServerMock,
  }));

  mock.module("identity/selectors", () => ({
    ...realIdentitySelectors,
    selectIdentityToken: selectCurrentTokenMock,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: selectCurrentTokenMock,
  }));

  mock.module("app/utils/env", () => ({
    ...realEnv,
    getIsDesktopApp: getIsDesktopAppMock,
  }));

  const mod = await import(`./cliChatClient.ts`);
  mock.restore();
  return mod;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  getIsDesktopAppMock.mockImplementation(() => false);
  selectCurrentServerMock.mockImplementation(() => "http://localhost");
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("cliChatClient", () => {
  it("starts a session with auth headers", async () => {
    const { startCliChatSession } = await loadModule();
    const fetchMock = mock(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as any;

    await startCliChatSession(
      {
        getState: () => ({}),
      },
      {
        cliProvider: "codex",
        model: "gpt-5.4",
        systemPrompt: "You are helpful",
      },
    );

    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    const url = firstCall?.[0];
    const init = firstCall?.[1] as RequestInit | undefined;
    expect(url).toBe("http://localhost/api/cli/chat");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    expect(JSON.parse(String(init?.body))).toEqual({
      action: "start",
      cliProvider: "codex",
      model: "gpt-5.4",
      systemPrompt: "You are helpful",
    });
  });

  it("uses relative same-origin /api/cli/chat on desktop (not currentServer/cloud)", async () => {
    const { startCliChatSession } = await loadModule(true);
    const fetchMock = mock(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as any;

    await startCliChatSession(
      { getState: () => ({}) },
      { cliProvider: "codex", model: "gpt-5.4" },
    );

    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    const url = firstCall?.[0];
    // Desktop currentServer is cloud (resolveDesktopSafeServer), but CLI must
    // hit local host via relative path so Sec-Fetch-Site is same-origin.
    expect(url).toBe("/api/cli/chat");
    expect(url).not.toContain("nolo.chat");
    expect(selectCurrentServerMock()).toBe("https://nolo.chat");
  });

  it("uses absolute currentServer URL for CLI chat when not desktop", async () => {
    const { startCliChatSession } = await loadModule(false);
    // loadModule defaults non-desktop to localhost; override to prove absolute cloud URL.
    selectCurrentServerMock.mockImplementation(() => "https://nolo.chat");
    const fetchMock = mock(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as any;

    await startCliChatSession(
      { getState: () => ({}) },
      { cliProvider: "claude", model: "claude-sonnet" },
    );

    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    expect(firstCall?.[0]).toBe("https://nolo.chat/api/cli/chat");
  });

  it("creates a legacy single-turn stream request when no sessionId is provided", async () => {
    const { createCliChatTurnStream } = await loadModule();
    const response = new Response("ok");
    const fetchMock = mock(async () => response);
    globalThis.fetch = fetchMock as any;

    const result = await createCliChatTurnStream(
      {
        getState: () => ({}),
      },
      {
        prompt: "hello",
        model: "gpt-5.4",
        cliProvider: "codex",
      },
    );

    expect(result).toBe(response);
    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    expect(JSON.parse(String((firstCall?.[1] as RequestInit | undefined)?.body))).toEqual({
      prompt: "hello",
      model: "gpt-5.4",
      cliProvider: "codex",
    });
  });

  it("creates a session turn request when sessionId is provided", async () => {
    const { createCliChatTurnStream } = await loadModule();
    const response = new Response("ok");
    const fetchMock = mock(async () => response);
    globalThis.fetch = fetchMock as any;

    await createCliChatTurnStream(
      {
        getState: () => ({}),
      },
      {
        sessionId: "cli-session-1",
        prompt: "continue",
        model: "gpt-5.4",
      },
    );

    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    expect(JSON.parse(String((firstCall?.[1] as RequestInit | undefined)?.body))).toEqual({
      action: "turn",
      sessionId: "cli-session-1",
      prompt: "continue",
      model: "gpt-5.4",
    });
  });

  it("creates a non-streaming session turn request when requested", async () => {
    const { runCliChatTurnNonStreaming } = await loadModule();
    const fetchMock = mock(async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify({ echoed: init?.body ? JSON.parse(String(init.body)) : null }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    );
    globalThis.fetch = fetchMock as any;

    const result = await runCliChatTurnNonStreaming(
      {
        getState: () => ({}),
      },
      {
        sessionId: "cli-session-1",
        prompt: "continue",
        model: "gpt-5.4",
      },
    );

    expect(result.echoed).toEqual({
      action: "turn",
      sessionId: "cli-session-1",
      prompt: "continue",
      model: "gpt-5.4",
      stream: false,
    });
  });

  it("gets and closes sessions through the same endpoint", async () => {
    const { closeCliChatSession, getCliChatSession } = await loadModule();
    const fetchMock = mock(async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify({ echoed: init?.body ? JSON.parse(String(init.body)) : null }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    );
    globalThis.fetch = fetchMock as any;

    const getResult = await getCliChatSession({ getState: () => ({}) }, { sessionId: "cli-session-1" });
    const closeResult = await closeCliChatSession({ getState: () => ({}) }, { sessionId: "cli-session-1" });

    expect(getResult.echoed).toEqual({
      action: "get",
      sessionId: "cli-session-1",
    });
    expect(closeResult.echoed).toEqual({
      action: "close",
      sessionId: "cli-session-1",
    });
  });

  it("scanInstalledClis skips fetch on non-desktop and returns []", async () => {
    const { scanInstalledClis } = await loadModule(false);
    const fetchMock = mock(async () => new Response("should-not-run"));
    globalThis.fetch = fetchMock as any;

    const result = await scanInstalledClis({ getState: () => ({}) });
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("scanInstalledClis hits same-origin /api/cli/scan on desktop", async () => {
    const { scanInstalledClis } = await loadModule(true);
    const fetchMock = mock(
      async () =>
        new Response(JSON.stringify({ installed: ["claude", "agy", "not-a-provider"] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    globalThis.fetch = fetchMock as any;

    const result = await scanInstalledClis({ getState: () => ({}) });
    const firstCall = fetchMock.mock.calls[0] as any[] | undefined;
    expect(firstCall?.[0]).toBe("/api/cli/scan");
    expect((firstCall?.[1] as RequestInit).method).toBe("POST");
    expect(result).toEqual(["claude", "agy"]);
  });

  it("scanInstalledClis returns [] on network/http failure (manual fallback)", async () => {
    const { scanInstalledClis } = await loadModule(true);
    globalThis.fetch = mock(async () => {
      throw new Error("network down");
    }) as any;
    expect(await scanInstalledClis({ getState: () => ({}) })).toEqual([]);

    globalThis.fetch = mock(
      async () => new Response("nope", { status: 500 }),
    ) as any;
    expect(await scanInstalledClis({ getState: () => ({}) })).toEqual([]);
  });
});
