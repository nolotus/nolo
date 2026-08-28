import { describe, expect, it, mock } from "bun:test";
import React from "react";
import { flushDomUpdates, renderInDom } from "../../testing/domRender";

let moduleVersion = 0;

async function loadUseAppDetail(state: {
  auth: { currentToken?: string; currentUser?: { userId?: string } | null };
  settings: { currentServer?: string };
}) {
  const actualStore = await import("app/store");
  const actualVersionReplication = await import("create/version/appVersionReplication");
  const dispatchMock = mock(() => undefined);
  const syncAppRecordMock = mock((_appKey: string, _appRecord: Record<string, any>) => () => Promise.resolve());
  const syncRecentAppVersionsMock = mock(async () => 0);
  mock.module("app/store", () => ({
    ...actualStore,
    useAppSelector: (selector: (value: typeof state) => unknown) => selector(state),
    useAppDispatch: () => dispatchMock,
  }));
  mock.module("app/actions/syncAppRecord", () => ({
    syncAppRecord: syncAppRecordMock,
  }));
  mock.module("create/version/appVersionReplication", () => ({
    ...actualVersionReplication,
    syncRecentAppVersions: syncRecentAppVersionsMock,
  }));
  mock.module("auth/authSlice", () => ({
    selectCurrentToken: (value: typeof state) => value.auth.currentToken,
    selectUserId: (value: typeof state) => value.auth.currentUser?.userId,
  }));
  mock.module("app/settings/settingSlice", () => ({
    selectRemoteServer: (value: typeof state) => value.settings.currentServer,
  }));

  const mod = await import(`./useAppDetail?test=${moduleVersion++}`);
  mock.restore();
  return {
    useAppDetail: mod.useAppDetail,
    dispatchMock,
    syncAppRecordMock,
    syncRecentAppVersionsMock,
  };
}

const HookProbe: React.FC<{
  useAppDetailImpl: (
    appKey?: string,
    options?: { prepareEdit?: boolean; serverOrigin?: string | null }
  ) => {
    app: { userFriendlyName?: string } | null;
    loading: boolean;
    error: string | null;
  };
  appKey: string;
  serverOrigin?: string;
  prepareEdit?: boolean;
}> = ({ useAppDetailImpl, appKey, serverOrigin, prepareEdit }) => {
  const { app, loading, error } = useAppDetailImpl(appKey, { serverOrigin, prepareEdit });
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "idle"}</div>
      <div data-testid="name">{app?.userFriendlyName ?? ""}</div>
      <div data-testid="error">{error ?? ""}</div>
    </div>
  );
};

describe("useAppDetail", () => {
  it("reads current server first and does not hit serverOrigin when current server succeeds", async () => {
    const { useAppDetail, dispatchMock } = await loadUseAppDetail({
      auth: { currentToken: "token-1", currentUser: { userId: "u1" } },
      settings: { currentServer: "http://localhost" },
    });
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://localhost/api/app/get");
      return new Response(
        JSON.stringify({
          success: true,
          appId: "app-1",
          userFriendlyName: "local-app",
          url: "http://localhost/apps/app-1/",
          code: "",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const view = await renderInDom(
      <HookProbe
        useAppDetailImpl={useAppDetail}
        appKey="app-user-app-1"
        serverOrigin="https://us.nolo.chat"
      />
    );

    try {
      await flushDomUpdates(2);
      expect(fetchMock.mock.calls.length).toBe(1);
      expect(dispatchMock.mock.calls.length).toBe(0);
      expect(view.container.querySelector('[data-testid="name"]')?.textContent).toBe("local-app");
      expect(view.container.querySelector('[data-testid="error"]')?.textContent).toBe("");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("falls back to serverOrigin only when current server returns not found", async () => {
    const { useAppDetail, dispatchMock, syncAppRecordMock, syncRecentAppVersionsMock } = await loadUseAppDetail({
      auth: { currentToken: "token-1", currentUser: { userId: "u1" } },
      settings: { currentServer: "http://localhost" },
    });
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/app/get") {
        return new Response(
          JSON.stringify({ success: false, message: "应用不存在", code: "NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://us.nolo.chat/api/app/get") {
        return new Response(
          JSON.stringify({
            success: true,
            appId: "app-1",
            appKey: "app-u1-app-1",
            userFriendlyName: "remote-app",
            url: "https://us.nolo.chat/apps/app-1/",
            versionServerOrigin: "https://us.nolo.chat",
            code: "",
            appRecord: {
              appId: "app-1",
              appKey: "app-u1-app-1",
              userId: "u1",
              name: "remote-app",
              code: "export default {}",
              updatedAt: 100,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const view = await renderInDom(
      <HookProbe
        useAppDetailImpl={useAppDetail}
        appKey="app-user-app-1"
        serverOrigin="https://us.nolo.chat"
      />
    );

    try {
      await flushDomUpdates(2);
      expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
        "http://localhost/api/app/get",
        "https://us.nolo.chat/api/app/get",
      ]);
      expect(syncAppRecordMock).toHaveBeenCalledWith(
        "app-u1-app-1",
        expect.objectContaining({
          userId: "u1",
          name: "remote-app",
        }),
        { includeCurrentServer: true }
      );
      expect(dispatchMock.mock.calls.length).toBe(1);
      expect(syncRecentAppVersionsMock).toHaveBeenCalledWith({
        currentServer: "http://localhost",
        sourceServer: "https://us.nolo.chat",
        token: "token-1",
        appId: "app-1",
      });
      expect(view.container.querySelector('[data-testid="name"]')?.textContent).toBe("remote-app");
      expect(view.container.querySelector('[data-testid="error"]')?.textContent).toBe("");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("reconstructs a syncable app record from legacy fallback payloads that omit appRecord", async () => {
    const { useAppDetail, dispatchMock, syncAppRecordMock } = await loadUseAppDetail({
      auth: { currentToken: "token-1", currentUser: { userId: "u1" } },
      settings: { currentServer: "http://localhost" },
    });
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/app/get") {
        return new Response(
          JSON.stringify({ success: false, message: "应用不存在", code: "NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://us.nolo.chat/api/app/get") {
        return new Response(
          JSON.stringify({
            success: true,
            appId: "app-1",
            appKey: "app-u1-app-1",
            userFriendlyName: "remote-app",
            url: "https://us.nolo.chat/apps/app-1/",
            customUrl: "https://us.nolo.chat/apps/app-1/",
            code: "export default {}",
            framework: "worker",
            visibility: "private",
            modifiedOn: "2026-03-30T04:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const view = await renderInDom(
      <HookProbe
        useAppDetailImpl={useAppDetail}
        appKey="app-user-app-1"
        serverOrigin="https://us.nolo.chat"
      />
    );

    try {
      await flushDomUpdates(2);
      expect(syncAppRecordMock).toHaveBeenCalledWith(
        "app-u1-app-1",
        expect.objectContaining({
          appId: "app-1",
          appKey: "app-u1-app-1",
          userId: "u1",
          name: "remote-app",
          customUrl: undefined,
          source: {
            kind: "worker-code",
            code: "export default {}",
          },
        }),
        { includeCurrentServer: true }
      );
      expect(dispatchMock.mock.calls.length).toBe(1);
      expect(view.container.querySelector('[data-testid="name"]')?.textContent).toBe("remote-app");
      expect(view.container.querySelector('[data-testid="error"]')?.textContent).toBe("");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("keeps trying serverOrigin for prepare-edit when current server only has rebuild-risk data", async () => {
    const { useAppDetail, syncRecentAppVersionsMock } = await loadUseAppDetail({
      auth: { currentToken: "token-1", currentUser: { userId: "u1" } },
      settings: { currentServer: "http://localhost" },
    });
    const previousFetch = globalThis.fetch;
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/app/prepare-edit") {
        return new Response(
          JSON.stringify({
            success: true,
            appId: "app-1",
            appKey: "app-u1-app-1",
            userFriendlyName: "local-artifact",
            url: "http://localhost/apps/app-1/",
            code: "bundled-worker",
            editSafety: "rebuild-risk",
            sourceStatus: "artifact-only",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://us.nolo.chat/api/app/prepare-edit") {
        return new Response(
          JSON.stringify({
            success: true,
            appId: "app-1",
            appKey: "app-u1-app-1",
            userFriendlyName: "remote-source",
            url: "https://us.nolo.chat/apps/app-1/",
            code: "source-worker",
            editSafety: "safe",
            sourceStatus: "ready",
            versionServerOrigin: "https://us.nolo.chat",
            appRecord: {
              appId: "app-1",
              appKey: "app-u1-app-1",
              userId: "u1",
              name: "remote-source",
              code: "source-worker",
              updatedAt: 100,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch url: ${url}`);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const view = await renderInDom(
      <HookProbe
        useAppDetailImpl={useAppDetail}
        appKey="app-user-app-1"
        serverOrigin="https://us.nolo.chat"
        prepareEdit
      />
    );

    try {
      await flushDomUpdates(2);
      expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
        "http://localhost/api/app/prepare-edit",
        "https://us.nolo.chat/api/app/prepare-edit",
      ]);
      expect(syncRecentAppVersionsMock).toHaveBeenCalledWith({
        currentServer: "http://localhost",
        sourceServer: "https://us.nolo.chat",
        token: "token-1",
        appId: "app-1",
      });
      expect(view.container.querySelector('[data-testid="name"]')?.textContent).toBe("remote-source");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });
});
