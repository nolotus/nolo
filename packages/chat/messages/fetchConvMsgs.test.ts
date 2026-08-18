import { describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

const loadFetchConvMsgs = async () =>
  (await import(`./fetchConvMsgs.ts`)).fetchConvMsgs;

describe("fetchConvMsgs", () => {
  it("sends dialogKey with the message request when provided", async () => {
    const fetchConvMsgs = await loadFetchConvMsgs();
    const fetchMock = mock(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        dialogId: "dialog-1",
        limit: 30,
        dialogKey: "dialog-user-dialog-1",
      });
      return new Response(JSON.stringify([]), { status: 200 });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await fetchConvMsgs("https://nolo.chat", "token", {
        dialogId: "dialog-1",
        dialogKey: "dialog-user-dialog-1",
        limit: 30,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
