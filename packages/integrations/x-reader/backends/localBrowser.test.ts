import { describe, expect, test } from "bun:test";
import { createLocalBrowserBackend, type LocalBrowserReader } from "./localBrowser";

describe("createLocalBrowserBackend", () => {
  test("returns not_connected when no reader is injected", async () => {
    const backend = createLocalBrowserBackend();

    const result = await backend.readPost(
      "https://x.com/karminski3/status/2051832734533013575",
    );

    expect(result).toMatchObject({
      ok: false,
      code: "not_connected",
      backend: "desktop_local_browser",
    });
  });

  test("delegates post reads to the injected local browser reader", async () => {
    const reader: LocalBrowserReader = {
      async readVisiblePost(url) {
        return {
          ok: true,
          backend: "desktop_local_browser",
          fetchedAt: "2026-05-06T03:30:00.000Z",
          data: {
            id: "2051832734533013575",
            url,
            author: { handle: "karminski3" },
            text: "visible post",
            media: [],
            sourceBackend: "desktop_local_browser",
            fetchedAt: "2026-05-06T03:30:00.000Z",
          },
        };
      },
      async readVisibleThread(url) {
        const post = await this.readVisiblePost(url);
        if (!post.ok) {
          return post;
        }

        return {
          ok: true,
          backend: "desktop_local_browser",
          fetchedAt: post.fetchedAt,
          data: {
            root: post.data,
            posts: [post.data],
            completeness: "single_post",
          },
        };
      },
    };

    const result = await createLocalBrowserBackend(reader).readPost(
      "https://x.com/karminski3/status/2051832734533013575",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.data.text).toBe("visible post");
  });
});
