import { describe, expect, it } from "bun:test";

import {
  HOME_AUTH_DEFAULT_TAB,
  HOME_GUEST_DEFAULT_TAB,
  HOME_TAB_STORAGE_KEY,
  normalizeHomeTabForAccess,
  readStoredHomeTab,
  resolveHomeTabForDisplay,
  writeStoredHomeTab,
} from "./homeTabState";

describe("homeTabState", () => {
  it("uses AI plaza as both the guest and authed fallback tab", () => {
    expect(HOME_GUEST_DEFAULT_TAB).toBe("communityAI");
    expect(HOME_AUTH_DEFAULT_TAB).toBe("communityAI");
  });

  it("defaults logged-in users to AI plaza when no preference exists", () => {
    expect(resolveHomeTabForDisplay(undefined, true)).toBe("communityAI");
  });

  it("falls back to AI plaza when signed-out users are on auth-only tabs", () => {
    expect(normalizeHomeTabForAccess("myContent", false)).toBe("communityAI");
    expect(normalizeHomeTabForAccess("myFav", false)).toBe("communityAI");
  });

  it("restores a remembered public tab for logged-in users", () => {
    expect(resolveHomeTabForDisplay("communityAI", true)).toBe("communityAI");
  });

  it("downgrades inaccessible remembered tabs for signed-out users", () => {
    expect(resolveHomeTabForDisplay("myContent", false)).toBe("communityAI");
  });

  it("keeps public tabs available for signed-out users", () => {
    expect(normalizeHomeTabForAccess("shareCommunity", false)).toBe(
      "shareCommunity"
    );
  });

  it("reads and writes remembered tabs from local storage", () => {
    const storage = {
      value: null as string | null,
      getItem(key: string) {
        return key === HOME_TAB_STORAGE_KEY ? this.value : null;
      },
      setItem(key: string, value: string) {
        if (key === HOME_TAB_STORAGE_KEY) {
          this.value = value;
        }
      },
    };

    writeStoredHomeTab("communityAI", storage);
    expect(readStoredHomeTab(storage)).toBe("communityAI");
  });
});
