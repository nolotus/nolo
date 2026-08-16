import { describe, expect, it } from "bun:test";

import {
  normalizeCollapsedCategories,
  readStoredCollapsedCategories,
  writeStoredCollapsedCategories,
} from "./spaceCollapsedState";
import { UNCATEGORIZED_ID } from "./constants";

const createStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
};

describe("spaceCollapsedState", () => {
  it("stores and reads per-space collapsed category state", () => {
    const storage = createStorage();

    writeStoredCollapsedCategories(
      "space-1",
      { a: true, b: false, [UNCATEGORIZED_ID]: true },
      storage,
    );

    expect(readStoredCollapsedCategories("space-1", storage)).toEqual({
      a: true,
      b: false,
      [UNCATEGORIZED_ID]: true,
    });
    expect(readStoredCollapsedCategories("space-2", storage)).toEqual({
      [UNCATEGORIZED_ID]: false,
    });
  });

  it("drops invalid persisted values", () => {
    const storage = createStorage();
    storage.setItem(
      "space-collapsed-categories:space-1",
      JSON.stringify({ a: true, b: "oops", c: 1 }),
    );

    expect(readStoredCollapsedCategories("space-1", storage)).toEqual({
      a: true,
    });
  });

  it("preserves explicit uncategorized collapse state", () => {
    expect(
      normalizeCollapsedCategories({
        a: true,
        [UNCATEGORIZED_ID]: true,
      }),
    ).toEqual({
      a: true,
      [UNCATEGORIZED_ID]: true,
    });
  });
});
