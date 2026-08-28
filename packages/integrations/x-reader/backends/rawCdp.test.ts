import { describe, expect, test } from "bun:test";
import { getBrowserWebSocketUrl } from "./rawCdp";

describe("getBrowserWebSocketUrl", () => {
  test("reads webSocketDebuggerUrl from a CDP version endpoint", async () => {
    const url = await getBrowserWebSocketUrl(
      "http://127.0.0.1:9222",
      (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://127.0.0.1:9222/json/version");
      return new Response(
        JSON.stringify({
          webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/test",
        }),
        { status: 200 },
      );
      }) as typeof fetch,
    );

    expect(url).toBe("ws://127.0.0.1:9222/devtools/browser/test");
  });

  test("throws when CDP version response has no websocket URL", async () => {
    await expect(
      getBrowserWebSocketUrl(
        "http://127.0.0.1:9222/",
        (async () => {
        return new Response(JSON.stringify({ Browser: "Chrome" }), { status: 200 });
        }) as unknown as typeof fetch,
      ),
    ).rejects.toThrow("webSocketDebuggerUrl");
  });
});
