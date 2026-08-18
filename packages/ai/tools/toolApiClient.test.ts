import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadToolApiClient() {
  return import(`./toolApiClient?test=${moduleVersion++}`);
}

function makeThunkApi(input: {
  currentServer?: string;
  token?: string | null;
  dialogKey?: string | null;
} = {}) {
  return {
    getState: () => ({
      settings: { currentServer: input.currentServer ?? "http://localhost" },
      auth: { currentToken: input.token ?? "token-1" },
      dialog: { currentDialogKey: input.dialogKey ?? null },
    }),
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as any).window;
});

describe("callToolApi", () => {
  it("builds request context with base url and token", async () => {
    const { getToolRequestContext } = await loadToolApiClient();

    expect(
      getToolRequestContext(makeThunkApi())
    ).toEqual({
      currentServer: "http://localhost",
      token: "token-1",
      baseUrl: "http://localhost",
    });
  });

  it("derives base url from current server in node-like environments", async () => {
    const { getToolBaseUrl } = await loadToolApiClient();

    expect(
      getToolBaseUrl(makeThunkApi())
    ).toBe("http://localhost");
  });

  it("classifies html success responses as transport stoploss errors", async () => {
    const { callToolApi } = await loadToolApiClient();
    const fetchMock = mock(async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null,
      },
      text: async () => "<!DOCTYPE html><html><body>Bad Gateway</body></html>",
    }));

    globalThis.fetch = fetchMock as any;

    await expect(
      callToolApi(
        {
          ...makeThunkApi(),
        },
        "/api/app/deploy",
        { name: "demo" },
        { withAuth: true }
      )
    ).rejects.toMatchObject({
      name: "ToolApiError",
      code: "HTML_RESPONSE",
    });
  });

  it("classifies non-json error responses with preview details", async () => {
    const { callToolApi } = await loadToolApiClient();
    const fetchMock = mock(async () => ({
      ok: false,
      status: 502,
      headers: {
        get: () => "text/html; charset=utf-8",
      },
      text: async () => "<!DOCTYPE html><html><body>502 Bad Gateway</body></html>",
    }));

    globalThis.fetch = fetchMock as any;

    await expect(
      callToolApi(
        {
          ...makeThunkApi(),
        },
        "/api/app/preflight",
        { name: "demo" },
        { withAuth: true }
      )
    ).rejects.toMatchObject({
      name: "ToolApiError",
      code: "HTML_ERROR_RESPONSE",
      details: {
        responsePreview: expect.stringContaining("Bad Gateway"),
      },
    });
  });

  it("injects the current dialog id into tool request bodies", async () => {
    const { callToolApi } = await loadToolApiClient();
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      headers: {
        get: () => "application/json",
      },
      text: async () => JSON.stringify({
        echoedBody: init?.body ? JSON.parse(String(init.body)) : null,
      }),
    }));

    globalThis.fetch = fetchMock as any;

    const response = await callToolApi(
      {
        ...makeThunkApi({ dialogKey: "dialog-user-01TESTDIALOGTOOLAPI000001" }),
      },
      "/api/exa-search",
      { query: "hello" },
      { withAuth: true }
    );

    expect(response).toMatchObject({
      echoedBody: {
        query: "hello",
        dialogId: "01TESTDIALOGTOOLAPI000001",
      },
    });
  });

  it("routes desktop-local tool APIs to the current app origin instead of the remote server", async () => {
    (globalThis as any).window = {
      __NOLO_DESKTOP__: true,
      location: { origin: "http://127.0.0.1:3233" },
    };
    const { callToolApi } = await loadToolApiClient();
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      headers: {
        get: () => "application/json",
      },
      text: async () => JSON.stringify({
        echoedBody: init?.body ? JSON.parse(String(init.body)) : null,
      }),
    }));
    globalThis.fetch = fetchMock as any;

    await callToolApi(
      {
        ...makeThunkApi({ currentServer: "https://nolo.chat" }),
      },
      "/api/check-env",
      { check: "context" },
      { withAuth: true }
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://127.0.0.1:3233/api/check-env"
    );
  });

  it("routes desktop local file bridge APIs to the current app origin instead of the remote server", async () => {
    (globalThis as any).window = {
      __NOLO_DESKTOP__: true,
      location: { origin: "http://127.0.0.1:3233" },
    };
    const { resolveToolApiBaseUrl } = await loadToolApiClient();

    expect(resolveToolApiBaseUrl("https://nolo.chat", "/api/desktop/files/roots")).toBe(
      "http://127.0.0.1:3233"
    );
    expect(resolveToolApiBaseUrl("https://nolo.chat", "/api/desktop/files/list")).toBe(
      "http://127.0.0.1:3233"
    );
  });
});
