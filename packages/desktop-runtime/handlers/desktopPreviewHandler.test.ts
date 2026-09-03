import { describe, expect, it } from "bun:test";

import { handleDesktopPreviewOpenPost } from "./desktopPreviewHandler";

const DESKTOP_ENV = { NOLO_DESKTOP: "1" } as Record<string, string | undefined>;

const post = (body: unknown | string) =>
  new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("handleDesktopPreviewOpenPost", () => {
  it("returns 404 outside the desktop runtime (env gate)", async () => {
    const response = await handleDesktopPreviewOpenPost(
      new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
        method: "POST",
        body: JSON.stringify({ url: "http://localhost:38123" }),
      }),
      { env: {} },
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid JSON bodies", async () => {
    const response = await handleDesktopPreviewOpenPost("not-json{", {
      env: DESKTOP_ENV,
    });
    expect(response.status).toBe(400);
  });

  it("rejects non-http(s) url schemes (400)", async () => {
    for (const url of ["javascript:alert(1)", "file:///etc/passwd", "not a url"]) {
      const response = await handleDesktopPreviewOpenPost(
        new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
          method: "POST",
          body: JSON.stringify({ url }),
        }),
        { env: DESKTOP_ENV },
      );
      expect(response.status).toBe(400);
    }
  });

  it("returns 503 when the desktop bridge is not connected", async () => {
    const response = await handleDesktopPreviewOpenPost(
      new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
        method: "POST",
        body: JSON.stringify({ url: "http://localhost:38123" }),
      }),
      { env: DESKTOP_ENV, desktopApiRequest: undefined },
    );
    expect(response.status).toBe(503);
  });

  it("forwards the url to the bridge and returns ok", async () => {
    const seen: unknown[] = [];
    const response = await handleDesktopPreviewOpenPost(
      new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
        method: "POST",
        body: JSON.stringify({ url: "http://localhost:38123" }),
      }),
      {
        env: DESKTOP_ENV,
        desktopApiRequest: async (payload) => {
          seen.push(payload);
          return null;
        },
      },
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok?: boolean; url?: string };
    expect(payload.ok).toBe(true);
    expect(payload.url).toBe("http://localhost:38123");
    expect(seen[0]).toEqual({
      type: "nolo-preview-open",
      action: "open",
      url: "http://localhost:38123",
    });
  });

  it("maps bridge rejections to 500 with the error message", async () => {
    const response = await handleDesktopPreviewOpenPost(
      new Request("http://127.0.0.1:3233/api/desktop/preview/open", {
        method: "POST",
        body: JSON.stringify({ url: "http://localhost:38123" }),
      }),
      {
        env: DESKTOP_ENV,
        desktopApiRequest: async () => {
          throw new Error("webview gone");
        },
      },
    );
    expect(response.status).toBe(500);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain("webview gone");
  });
});
