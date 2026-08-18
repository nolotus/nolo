import { describe, expect, it } from "bun:test";

import {
  buildSpaceLookup,
  getSpaceContentKeys,
  normalizeSpaceIdInput,
} from "./cliSpaceHelpers";

describe("normalizeSpaceIdInput pure seam", () => {
  it("returns empty string for blank input", () => {
    expect(normalizeSpaceIdInput("")).toBe("");
    expect(normalizeSpaceIdInput("   ")).toBe("");
  });

  it("accepts bare space ids", () => {
    expect(normalizeSpaceIdInput("abc")).toBe("abc");
    expect(normalizeSpaceIdInput("  spaceA  ")).toBe("spaceA");
  });

  it("strips the space- key prefix", () => {
    expect(normalizeSpaceIdInput("space-abc")).toBe("abc");
    expect(normalizeSpaceIdInput("  space-spaceA  ")).toBe("spaceA");
  });

  it("extracts bare ids from space page URLs", () => {
    expect(normalizeSpaceIdInput("https://us.nolo.chat/space/abc")).toBe("abc");
    expect(
      normalizeSpaceIdInput("https://us.nolo.chat/space/space-abc?x=1#frag")
    ).toBe("abc");
    expect(
      normalizeSpaceIdInput("http://localhost:38123/space/spaceA")
    ).toBe("spaceA");
  });

  it("rejects non-space URLs", () => {
    expect(normalizeSpaceIdInput("https://us.nolo.chat/dialog/abc")).toBe("");
    expect(normalizeSpaceIdInput("https://us.nolo.chat/")).toBe("");
  });

  it("decodes URL-encoded path segments", () => {
    expect(
      normalizeSpaceIdInput("https://us.nolo.chat/space/hello%20world")
    ).toBe("hello world");
  });
});

describe("buildSpaceLookup pure seam", () => {
  it("pairs bare space ids with space- keys", () => {
    expect(buildSpaceLookup("abc")).toEqual({
      spaceId: "abc",
      spaceKey: "space-abc",
    });
    expect(buildSpaceLookup("space-abc")).toEqual({
      spaceId: "abc",
      spaceKey: "space-abc",
    });
    expect(buildSpaceLookup("https://us.nolo.chat/space/space-abc")).toEqual({
      spaceId: "abc",
      spaceKey: "space-abc",
    });
  });

  it("returns empty key for blank input", () => {
    expect(buildSpaceLookup("")).toEqual({ spaceId: "", spaceKey: "" });
    expect(buildSpaceLookup("   ")).toEqual({ spaceId: "", spaceKey: "" });
  });
});

describe("getSpaceContentKeys pure seam", () => {
  it("returns empty set for missing or non-object contents", () => {
    expect([...getSpaceContentKeys(null)]).toEqual([]);
    expect([...getSpaceContentKeys({})]).toEqual([]);
    expect([...getSpaceContentKeys({ contents: null })]).toEqual([]);
    expect([...getSpaceContentKeys({ contents: "nope" })]).toEqual([]);
  });

  it("collects map entry keys and nested contentKey fields", () => {
    const keys = getSpaceContentKeys({
      contents: {
        "meta-owner-table1": { contentKey: "meta-owner-table1" },
        "  page-owner-a  ": { contentKey: "  page-owner-b  " },
        "dialog-user-1": true,
      },
    });
    expect(keys.has("meta-owner-table1")).toBe(true);
    expect(keys.has("page-owner-a")).toBe(true);
    expect(keys.has("page-owner-b")).toBe(true);
    expect(keys.has("dialog-user-1")).toBe(true);
    expect(keys.size).toBe(4);
  });

  it("ignores blank entry keys and blank contentKey strings", () => {
    const keys = getSpaceContentKeys({
      contents: {
        "   ": { contentKey: "   " },
        ok: { contentKey: "" },
        keep: {},
      },
    });
    expect([...keys].sort()).toEqual(["keep", "ok"]);
  });
});
