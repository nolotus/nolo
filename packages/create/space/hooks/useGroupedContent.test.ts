import { expect, test } from "bun:test";
import { filterAndSortContentItems } from "./useGroupedContent";
import type { SpaceContent } from "app/types";

test("filterAndSortContentItems sorts pinned items first, then by updatedAt", () => {
  const mockContents = {
    "item-1": {
      contentKey: "item-1",
      title: "Newer unpinned",
      updatedAt: "2023-01-02T00:00:00.000Z",
    } as unknown as SpaceContent,
    "item-2": {
      contentKey: "item-2",
      title: "Older pinned",
      updatedAt: "2023-01-01T00:00:00.000Z",
      pinned: true,
    } as unknown as SpaceContent,
    "item-3": {
      contentKey: "item-3",
      title: "Oldest unpinned",
      updatedAt: "2022-12-31T00:00:00.000Z",
    } as unknown as SpaceContent,
  };

  const sorted = filterAndSortContentItems(mockContents);

  expect(sorted.map((i) => i.contentKey)).toEqual([
    "item-2", // pinned goes first
    "item-1", // then newer unpinned
    "item-3", // then oldest unpinned
  ]);
});
