import { describe, expect, it } from "bun:test";

import {
  buildFilteredSidebarGroupedData,
  computeIsEmptySidebar,
  splitPinnedAndFavoriteItems,
} from "./useChatSidebarFilteredData";

// The fixture items intentionally omit required `SpaceContent` fields
// (`pinned`, `createdAt`); the filter logic only reads `title`/`name`/
// `description`/`type` and the surrounding `* as any` keeps the tests
// honest about that.
const item = (id: string, type = "dialog") =>
  ({ contentKey: id, title: id, type, updatedAt: Date.now() }) as any;

const cat = (id: string, name: string, order: number) =>
  ({ id, name, order }) as any;

const emptyGroupedData = { categorized: {}, uncategorized: [] } as any;

describe("buildFilteredSidebarGroupedData", () => {
  it("keeps category buckets available when uncategorized items consume the first batch", () => {
    const uncategorized = Array.from({ length: 92 }, (_, i) =>
      item(`uncategorized-${i}`),
    );
    const categorized = [item("usage-test-1"), item("usage-test-2")];

    const result = buildFilteredSidebarGroupedData({
      groupedData: {
        uncategorized,
        categorized: { "usage-management-tests": categorized },
      },
      sortedCategories: [cat("usage-management-tests", "用量管理测试", 0)],
      visibleTypes: ["dialog", "page", "table"],
      isShowingAllTypes: false,
      displayCount: 50,
      isFullyLoaded: false,
      searchQuery: "",
    });

    expect(result.uncategorized).toHaveLength(50);
    expect(result.categorized).toHaveProperty("usage-management-tests");
    expect(result.categorized["usage-management-tests"]).toEqual([]);
  });
});

describe("computeIsEmptySidebar", () => {
  it("returns true when there is no content and no categories", () => {
    expect(
      computeIsEmptySidebar({
        filteredGroupedData: emptyGroupedData,
        sortedCategories: [],
      }),
    ).toBe(true);
  });

  it("returns false when the user has created empty categories", () => {
    // Regression: previously this hid the entire sidebar and made
    // newly added categories appear to disappear.
    expect(
      computeIsEmptySidebar({
        filteredGroupedData: emptyGroupedData,
        sortedCategories: [cat("cat-1", "a", 0), cat("cat-2", "测试", 1)],
      }),
    ).toBe(false);
  });

  it("returns false when there is uncategorized content", () => {
    expect(
      computeIsEmptySidebar({
        filteredGroupedData: { categorized: {}, uncategorized: [item("u-1")] },
        sortedCategories: [],
      }),
    ).toBe(false);
  });

  it("returns false when there is categorized content", () => {
    expect(
      computeIsEmptySidebar({
        filteredGroupedData: {
          categorized: { "cat-1": [item("c-1")] },
          uncategorized: [],
        },
        sortedCategories: [cat("cat-1", "Travel", 0)],
      }),
    ).toBe(false);
  });
});

describe("splitPinnedAndFavoriteItems", () => {
  const pinnedItem = (id: string, type = "dialog") =>
    ({ ...item(id, type), pinned: true }) as any;

  it("removes favorite items from uncategorized and categorized lists", () => {
    const favoriteKeys = new Set(["fav-1", "fav-cat-1"]);
    const groupedData = {
      uncategorized: [item("fav-1"), item("plain-1"), pinnedItem("p-1")],
      categorized: { "cat-1": [item("fav-cat-1"), item("plain-cat-1")] },
    } as any;

    const { dedupedGroupedData, pinnedItems } =
      splitPinnedAndFavoriteItems(groupedData, favoriteKeys);

    expect(dedupedGroupedData.uncategorized.map((i: any) => i.contentKey)).toEqual(["plain-1"]);
    expect(dedupedGroupedData.categorized["cat-1"].map((i: any) => i.contentKey)).toEqual(["plain-cat-1"]);
    expect(pinnedItems.map((i: any) => i.contentKey)).toEqual(["p-1"]);
  });

  it("keeps all items when favoriteKeys is undefined", () => {
    const groupedData = {
      uncategorized: [item("a"), pinnedItem("b")],
      categorized: { "cat-1": [item("c")] },
    } as any;

    const { dedupedGroupedData, pinnedItems } =
      splitPinnedAndFavoriteItems(groupedData);

    expect(dedupedGroupedData.uncategorized.map((i: any) => i.contentKey)).toEqual(["a"]);
    expect(dedupedGroupedData.categorized["cat-1"].map((i: any) => i.contentKey)).toEqual(["c"]);
    expect(pinnedItems.map((i: any) => i.contentKey)).toEqual(["b"]);
  });
});
