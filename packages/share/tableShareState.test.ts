import { afterEach, describe, expect, it, mock } from "bun:test";
import { DataType } from "create/types";
import {
  buildTableShareState,
  isTableShareSummaryForDbKey,
  loadTableShareState,
} from "./tableShareState";

describe("isTableShareSummaryForDbKey", () => {
  it("matches a table share by originalId or tableDbKey", () => {
    expect(
      isTableShareSummaryForDbKey(
        {
          token: "a",
          type: DataType.TABLE,
          title: "Gemma",
          createdAt: 1,
          authorId: "u1",
          originalId: "meta-u1-gemma4",
        },
        "meta-u1-gemma4"
      )
    ).toBe(true);

    expect(
      isTableShareSummaryForDbKey(
        {
          token: "b",
          type: DataType.TABLE,
          title: "Gemma",
          createdAt: 1,
          authorId: "u1",
          tableDbKey: "meta-u1-gemma4",
        },
        "meta-u1-gemma4"
      )
    ).toBe(true);

    expect(
      isTableShareSummaryForDbKey(
        {
          token: "c",
          type: DataType.DIALOG,
          title: "Other",
          createdAt: 1,
          authorId: "u1",
          originalId: "meta-u1-gemma4",
        },
        "meta-u1-gemma4"
      )
    ).toBe(false);
  });
});

describe("buildTableShareState", () => {
  it("prefers the newest community share for the current table", () => {
    const state = buildTableShareState(
      [
        {
          token: "private-newer",
          type: DataType.TABLE,
          title: "Gemma private",
          createdAt: 30,
          authorId: "u1",
          visibility: "private",
          originalId: "meta-u1-gemma4",
        },
        {
          token: "community-current",
          type: DataType.TABLE,
          title: "Gemma community",
          createdAt: 20,
          authorId: "u1",
          visibility: "community",
          tableDbKey: "meta-u1-gemma4",
          replicationDirtyAt: 1715000000456,
        },
        {
          token: "other-table",
          type: DataType.TABLE,
          title: "Other table",
          createdAt: 40,
          authorId: "u1",
          visibility: "community",
          originalId: "meta-u1-other",
        },
      ],
      "meta-u1-gemma4"
    );

    expect(state.currentShare?.token).toBe("community-current");
    expect(state.communityShare?.token).toBe("community-current");
    expect(state.shareUrl).toBe("/share/community-current");
    expect(state.communityShareUrl).toBe("/share/community-current");
    expect(state.isCommunityShared).toBe(true);
    expect(state.hasReplicationIssue).toBe(true);
  });
});

describe("loadTableShareState", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      (globalThis as { fetch?: typeof fetch }).fetch = undefined;
    }
  });

  it("loads owner shares and narrows them to the requested table", async () => {
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              token: "gemma-live",
              type: DataType.TABLE,
              title: "Gemma 4 Benchmarks",
              createdAt: 10,
              authorId: "u1",
              visibility: "community",
              originalId: "meta-u1-gemma4",
            },
            {
              token: "other",
              type: DataType.TABLE,
              title: "Other",
              createdAt: 11,
              authorId: "u1",
              visibility: "community",
              originalId: "meta-u1-other",
            },
          ],
        }),
        { status: 200 }
      )
    ) as unknown as typeof globalThis.fetch;

    const state = await loadTableShareState({
      servers: ["https://us.nolo.chat"],
      userId: "u1",
      token: "token",
      tableDbKey: "meta-u1-gemma4",
    });

    expect(state.currentShare?.token).toBe("gemma-live");
    expect(state.matches.map((share) => share.token)).toEqual(["gemma-live"]);
  });
});
