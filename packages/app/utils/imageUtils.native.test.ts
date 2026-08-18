import { describe, expect, it, mock } from "bun:test";
import { waitForFileReady } from "./imageUtils.native";

describe("waitForFileReady.native", () => {
  it("falls back to GET when HEAD is not supported", async () => {
    const fetchMock = mock(async (_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 405 });
      }
      return new Response("ok", { status: 200 });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const ready = await waitForFileReady("https://example.com/file.png", {
        maxWaitMs: 50,
        intervalMs: 1,
      });

      expect(ready).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("HEAD");
      expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
