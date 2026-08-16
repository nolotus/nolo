import { describe, expect, test } from "bun:test";
import { resolveBrowserModelImageUrl } from "./browserImageUrl";

describe("resolveBrowserModelImageUrl", () => {
  test("keeps remote URLs unchanged", async () => {
    expect(
      await resolveBrowserModelImageUrl(
        "https://nolo.chat/api/v1/db/file/content/file-user-01IMAGE"
      )
    ).toBe("https://nolo.chat/api/v1/db/file/content/file-user-01IMAGE");
  });

  test("converts local file content URLs into data URLs", async () => {
    expect(
      await resolveBrowserModelImageUrl(
        "http://127.0.0.1:38123/api/v1/db/file/content/file-user-01IMAGE",
        {
          authToken: "token-demo",
          deps: {
            fetch: (async (_url: RequestInfo | URL, init?: RequestInit) => {
              expect(init?.headers).toEqual({ Authorization: "Bearer token-demo" });
              return new Response(new Blob(["abc"], { type: "image/png" }));
            }) as unknown as typeof fetch,
            blobToDataUrl: async (blob) =>
              `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`,
          },
        }
      )
    ).toBe("data:image/png;base64,YWJj");
  });

  test("falls back to the original URL when local conversion fails", async () => {
    const url = "http://127.0.0.1:38123/api/v1/db/file/content/file-user-01IMAGE";
    expect(
      await resolveBrowserModelImageUrl(url, {
        deps: {
          fetch: (async () => new Response("missing", { status: 404 })) as unknown as unknown as typeof fetch,
          blobToDataUrl: async () => {
            throw new Error("should not convert failed responses");
          },
        },
      })
    ).toBe(url);
  });
});
