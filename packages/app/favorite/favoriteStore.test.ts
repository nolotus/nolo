import { afterEach, describe, expect, it } from "bun:test";

import {
  getFavoriteAgentIds,
  getFavoriteContentIds,
  getSnapshot,
  isAgentFavorited,
  isContentFavorited,
  removeFavoriteLocally,
  resetFavoriteStoreForTests,
  resetFavorites,
  seedFavoriteStoreForTests,
} from "./favoriteStore";

describe("favoriteStore", () => {
  afterEach(() => {
    resetFavoriteStoreForTests();
  });

  it("resetFavorites clears to initial", () => {
    seedFavoriteStoreForTests({
      agentIds: ["a1"],
      contentIds: ["c1"],
      favoritedAtById: { a1: 1, c1: 2 },
    });
    resetFavorites();
    expect(getFavoriteAgentIds()).toEqual([]);
    expect(getFavoriteContentIds()).toEqual([]);
    expect(isAgentFavorited("a1")).toBe(false);
    expect(isContentFavorited("c1")).toBe(false);
  });

  it("removeFavoriteLocally removes agent and content ids", () => {
    seedFavoriteStoreForTests({
      agentIds: ["agent-1", "agent-2"],
      contentIds: ["page-1", "page-2"],
      favoritedAtById: {
        "agent-1": 1,
        "agent-2": 2,
        "page-1": 3,
        "page-2": 4,
      },
    });
    removeFavoriteLocally({ targetType: "agent", id: "agent-1" });
    removeFavoriteLocally({ targetType: "content", id: "page-1" });
    expect(getFavoriteAgentIds()).toEqual(["agent-2"]);
    expect(getFavoriteContentIds()).toEqual(["page-2"]);
    expect(isAgentFavorited("agent-1")).toBe(false);
    expect(isContentFavorited("page-1")).toBe(false);
  });

  it("bumps snapshot when favorites change", () => {
    const before = getSnapshot();
    seedFavoriteStoreForTests({ agentIds: ["a1"] });
    expect(getSnapshot()).not.toBe(before);
  });
});
