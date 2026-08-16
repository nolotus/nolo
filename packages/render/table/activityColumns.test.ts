import { describe, expect, test } from "bun:test";
import { includeTableActivityColumns } from "core/table/activityColumns";

describe("includeTableActivityColumns", () => {
  test("returns default activity fields when no columns are provided", () => {
    expect(includeTableActivityColumns()).toEqual(["meta.latestActivityRef", "meta.activityRefs"]);
  });

  test("appends activity fields without duplicating caller columns", () => {
    expect(includeTableActivityColumns(["title", "meta.latestActivityRef"])).toEqual([
      "title",
      "meta.latestActivityRef",
      "meta.activityRefs",
    ]);
  });
});
