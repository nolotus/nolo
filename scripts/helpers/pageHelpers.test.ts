import { describe, expect, test } from "bun:test";

import {
  buildPageKey,
  buildPageRecord,
  textToSlate,
} from "./pageHelpers";

describe("pageHelpers", () => {
  test("buildPageKey uses user and page ids", () => {
    expect(buildPageKey("user-1", "01ABC")).toBe("page-user-1-01ABC");
  });

  test("textToSlate preserves line boundaries", () => {
    expect(textToSlate("a\nb")).toEqual([
      { type: "paragraph", children: [{ text: "a" }] },
      { type: "paragraph", children: [{ text: "b" }] },
    ]);
  });

  test("buildPageRecord creates a plain page with slate data", () => {
    const record = buildPageRecord({
      dbKey: "page-user-1-01ABC",
      pageId: "01ABC",
      title: "Demo Doc",
      spaceId: "space-1",
      content: "Body text",
    });

    expect(record.type).toBe("page");
    expect(record.content).toBe("Body text");
    expect(record.slateData).toEqual(textToSlate("Body text"));
    expect(record.spaceId).toBe("space-1");
  });

  test("buildPageRecord can override slate data and remove meta", () => {
    const record = buildPageRecord({
      dbKey: "page-user-1-01ABC",
      pageId: "01ABC",
      title: "Demo Doc",
      spaceId: null,
      content: "Body text",
      existing: {
        id: "01ABC",
        meta: { kind: "skill" },
        slateData: [{ type: "paragraph", children: [{ text: "old" }] }],
      },
      meta: null,
      slateData: null,
    });

    expect(record.meta).toBeUndefined();
    expect(record.slateData).toBeUndefined();
  });
});
