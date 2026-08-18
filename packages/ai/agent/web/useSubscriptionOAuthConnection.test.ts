import { afterEach, describe, expect, test, mock } from "bun:test";

const getIsDesktopAppMock = mock(() => false);
const selectCurrentServerMock = mock(() => "https://app.example.com");
const useTokenMock = mock(() => "token-123");
const originalFetch = globalThis.fetch;
let moduleVersion = 0;

// Bun 的 mock.restore() 清不掉 mock.module——被替换的模块会泄漏到后续 suite
// 文件。这里快照真实导出，afterEach 手动还原。
// 尤其是 "identity"：只塞 { useToken } 会让整个模块少掉 useUserId 等导出，
// 后面 import 它的文件直接 SyntaxError（usePublicAgents 就这么红过）。
const realIdentity = { ...(await import("identity")) };
const realReactModule = { ...(await import("react")) };
const realEnv = { ...(await import("app/utils/env")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realStore = { ...(await import("app/store")) };
const realServerOrigin = { ...(await import("core/serverOrigin")) };

const restoreLeakedModuleMocks = () => {
  mock.module("identity", () => realIdentity);
  mock.module("react", () => realReactModule);
  mock.module("app/utils/env", () => realEnv);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("app/store", () => realStore);
  mock.module("core/serverOrigin", () => realServerOrigin);
};

async function loadHook(isDesktop = false) {
  getIsDesktopAppMock.mockImplementation(() => isDesktop);
  const state: { value: any } = { value: undefined };
  const realReact = await import("react");
  mock.module("react", () => ({
    ...realReact,
    useCallback: (fn: Function) => fn,
    useMemo: (fn: Function) => fn(),
    useState: (initial: any) => {
      state.value ??= initial;
      return [state.value, (next: any) => {
        state.value = typeof next === "function" ? next(state.value) : next;
      }];
    },
    useEffect: (fn: Function) => { void fn(); },
  }));
  mock.module("app/utils/env", () => ({ ...realEnv, getIsDesktopApp: getIsDesktopAppMock }));
  mock.module("app/settings/settingSlice", () => ({ ...realSettingSlice, selectCurrentServer: selectCurrentServerMock }));
  mock.module("app/store", () => ({ ...realStore, useAppSelector: (selector: Function) => selector() }));
  mock.module("identity", () => ({ ...realIdentity, useToken: useTokenMock }));
  mock.module("core/serverOrigin", () => ({ ...realServerOrigin, normalizeServerOrigin: (value: string) => value }));
  const { useSubscriptionOAuthConnection } = await import(`./useSubscriptionOAuthConnection.ts`);
  mock.restore();
  return { hook: useSubscriptionOAuthConnection("qwen"), state };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  getIsDesktopAppMock.mockImplementation(() => false);
  selectCurrentServerMock.mockImplementation(() => "https://app.example.com");
  useTokenMock.mockImplementation(() => "token-123");
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("useSubscriptionOAuthConnection", () => {
  test("web uses authenticated server status and returns connected", async () => {
    const fetchMock = mock(async () => new Response(JSON.stringify({ connected: true, email: "u@example.com" })));
    globalThis.fetch = fetchMock as any;
    const { state } = await loadHook(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example.com/api/oauth/qwen/status",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(state.value).toEqual({ kind: "connected", email: "u@example.com", accountId: undefined, expiresAt: undefined });
  });

  test("web without server origin or token degrades to not_connected", async () => {
    selectCurrentServerMock.mockImplementation(() => "");
    useTokenMock.mockImplementation(() => "");
    const fetchMock = mock(async () => new Response(JSON.stringify({ connected: true })));
    globalThis.fetch = fetchMock as any;
    const { state } = await loadHook(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.value).toEqual({ kind: "not_connected" });
  });

  test("desktop keeps using the desktop status endpoint", async () => {
    const fetchMock = mock(async () => new Response(JSON.stringify({ connected: true })));
    globalThis.fetch = fetchMock as any;
    const { state } = await loadHook(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/desktop/oauth/qwen/status",
      expect.objectContaining({ headers: undefined }),
    );
    expect(state.value.kind).toBe("connected");
  });
});
