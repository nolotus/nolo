import { describe, expect, it } from "bun:test";

import { parseListResponse } from "./MemoryConfig";

describe("MemoryConfig memory list parsing", () => {
  it("drops items missing numeric memory metrics", () => {
    const parsed = parseListResponse({
      items: [
        {
          id: "mem-ok",
          ownerType: "user",
          ownerId: "user-1",
          visibility: "private",
          subjectType: "user",
          subjectId: "user-1",
          kind: "semantic",
          content: "stable memory",
          createdAt: "2026-06-23T00:00:00.000Z",
          lastActivatedAt: "2026-06-23T00:00:00.000Z",
          activationCount: 0,
          importance: 0.7,
          confidence: 0.8,
        },
        {
          id: "mem-bad",
          subjectType: "user",
          kind: "semantic",
          content: "missing metrics would crash toFixed",
          createdAt: "2026-06-23T00:00:00.000Z",
        },
      ],
    });

    expect(parsed.items.map((item) => item.id)).toEqual(["mem-ok"]);
  });
});
