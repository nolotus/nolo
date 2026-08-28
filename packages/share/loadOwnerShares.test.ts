import { afterEach, describe, expect, it, mock } from "bun:test";

import { DataType } from "create/types";

import { loadOwnerSharesAcrossServers, mergeOwnerShares } from "./loadOwnerShares";

describe("mergeOwnerShares", () => {
  it("dedupes by token and sorts newest first", () => {
    expect(
      mergeOwnerShares([
        {
          token: "same",
          type: DataType.DIALOG,
          title: "Older",
          createdAt: 1,
          authorId: "u1",
        },
        {
          token: "newest",
          type: DataType.DIALOG,
          title: "Newest",
          createdAt: 3,
          authorId: "u1",
        },
        {
          token: "same",
          type: DataType.DIALOG,
          title: "Newer copy",
          createdAt: 2,
          authorId: "u1",
        },
      ])
    ).toEqual([
      expect.objectContaining({ token: "newest", title: "Newest" }),
      expect.objectContaining({ token: "same", title: "Newer copy" }),
    ]);
  });
});

describe("loadOwnerSharesAcrossServers", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
  });

  it("merges shares from current and sync servers across paginated pages", async () => {
    globalThis.fetch = (mock(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("https://nolo.chat") && !url.includes("cursor=")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                token: "main-share",
                type: DataType.DIALOG,
                title: "Main Share",
                createdAt: 2,
                authorId: "u1",
              },
            ],
            nextCursor: "main-cursor",
          }),
          { status: 200 }
        );
      }

      if (url.startsWith("https://nolo.chat") && url.includes("cursor=main-cursor")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                token: "shared-copy",
                type: DataType.DIALOG,
                title: "Shared Copy Main",
                createdAt: 4,
                authorId: "u1",
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (url.startsWith("https://us.nolo.chat")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                token: "us-share",
                type: DataType.DIALOG,
                title: "US Share",
                createdAt: 3,
                authorId: "u1",
              },
              {
                token: "shared-copy",
                type: DataType.DIALOG,
                title: "Shared Copy US",
                createdAt: 1,
                authorId: "u1",
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response("unexpected", { status: 500 });
    }) as unknown as typeof fetch);

    const shares = await loadOwnerSharesAcrossServers({
      servers: ["https://nolo.chat", "https://us.nolo.chat"],
      userId: "u1",
      token: "token",
      pageSize: 30,
    });

    expect(shares.map((share) => share.token)).toEqual([
      "shared-copy",
      "us-share",
      "main-share",
    ]);
    expect(shares.find((share) => share.token === "shared-copy")?.title).toBe("Shared Copy Main");
  });

  it("returns partial data when at least one server succeeds", async () => {
    globalThis.fetch = (mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://nolo.chat")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                token: "main-share",
                type: DataType.DIALOG,
                title: "Main Share",
                createdAt: 2,
                authorId: "u1",
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response("boom", { status: 500 });
    }) as unknown as typeof fetch);

    const shares = await loadOwnerSharesAcrossServers({
      servers: ["https://nolo.chat", "https://us.nolo.chat"],
      userId: "u1",
      token: "token",
    });

    expect(shares).toEqual([
      expect.objectContaining({
        token: "main-share",
      }),
    ]);
  });

  it("requests lightweight owner-share summaries when cover images are not needed", async () => {
    const seenUrls: string[] = [];
    globalThis.fetch = (mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch);

    await loadOwnerSharesAcrossServers({
      servers: ["https://nolo.chat"],
      userId: "u1",
      token: "token",
      includeCoverImage: false,
    });

    expect(seenUrls).toHaveLength(1);
    expect(seenUrls[0]).toContain("coverImage=0");
  });
});
