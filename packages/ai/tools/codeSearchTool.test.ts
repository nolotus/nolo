import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadCodeSearchTool() {
  return import(`./codeSearchTool`);
}

function makeThunkApi(input: {
  currentServer?: string;
  token?: string | null;
} = {}) {
  return {
    getState: () => ({
      settings: { currentServer: input.currentServer ?? "https://us.nolo.chat" },
      auth: { currentToken: input.token ?? "token-1" },
    }),
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("codeSearchFunc", () => {
  it("sends auth and agent headers for guarded devtool routes", async () => {
    const { codeSearchFunc } = await loadCodeSearchTool();
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      status: 200,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ hits: [] }),
      text: async () => JSON.stringify({ hits: [] }),
    }));
    globalThis.fetch = fetchMock as any;

    await codeSearchFunc(
      { query: "MessageActions", maxResults: 3 },
      makeThunkApi(),
      { agentKey: "agent-user-1-01FRONTENDAG0000000115N4E1" } as any,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://us.nolo.chat/api/code-search");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer token-1",
      "X-Nolo-Agent-Key": "agent-user-1-01FRONTENDAG0000000115N4E1",
    });
  });
});
