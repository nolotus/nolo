import { describe, expect, test } from "bun:test";
import { checkHttpReady } from "./httpReady";

describe("checkHttpReady", () => {
  test("returns true for a successful fetch probe", async () => {
    const ready = await checkHttpReady("http://127.0.0.1:38123", {
      fetchImpl: async () => new Response(null, { status: 204 }),
      curlProbe: async () => false,
    });

    expect(ready).toBe(true);
  });

  test("uses curl fallback when localhost fetch fails", async () => {
    let probedUrl = "";

    const ready = await checkHttpReady("http://127.0.0.1:38123", {
      fetchImpl: async () => {
        throw new Error("Unable to connect");
      },
      curlProbe: async (url) => {
        probedUrl = url;
        return true;
      },
    });

    expect(ready).toBe(true);
    expect(probedUrl).toBe("http://127.0.0.1:38123/api/agent/run");
  });

  test("does not curl fallback for remote origins", async () => {
    let curlCalled = false;

    const ready = await checkHttpReady("https://alpha-c.nolo.chat", {
      fetchImpl: async () => {
        throw new Error("network failed");
      },
      curlProbe: async () => {
        curlCalled = true;
        return true;
      },
    });

    expect(ready).toBe(false);
    expect(curlCalled).toBe(false);
  });
});
