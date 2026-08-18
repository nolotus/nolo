import { afterEach, describe, expect, it } from "bun:test";

import {
  clearRecentlyCreated,
  getSnapshot,
  hasRecentlyCreated,
  isRecentlyCreated,
  markRecentlyCreated,
  RECENTLY_CREATED_FLASH_TTL_MS,
  resetRecentlyCreatedStoreForTests,
  subscribe,
} from "./recentlyCreatedStore";

afterEach(() => {
  resetRecentlyCreatedStoreForTests();
});

describe("recentlyCreatedStore", () => {
  it("mark → isRecentlyCreated hits → auto-expires after TTL", async () => {
    const key = "dialog-local-01TESTKEY";
    expect(isRecentlyCreated(key)).toBe(false);
    expect(hasRecentlyCreated()).toBe(false);

    const before = getSnapshot();
    markRecentlyCreated(key);

    expect(isRecentlyCreated(key)).toBe(true);
    expect(hasRecentlyCreated()).toBe(true);
    expect(getSnapshot()).toBeGreaterThan(before);

    await new Promise((resolve) =>
      setTimeout(resolve, RECENTLY_CREATED_FLASH_TTL_MS + 50)
    );

    expect(isRecentlyCreated(key)).toBe(false);
    expect(hasRecentlyCreated()).toBe(false);
  });

  it("subscribe notifies on mark and clear", () => {
    const key = "agent-local-01ABC";
    let calls = 0;
    const unsub = subscribe(() => {
      calls += 1;
    });

    markRecentlyCreated(key);
    expect(calls).toBe(1);

    clearRecentlyCreated(key);
    expect(calls).toBe(2);
    expect(isRecentlyCreated(key)).toBe(false);

    unsub();
    markRecentlyCreated(key);
    expect(calls).toBe(2);
  });

  it("ignores empty keys", () => {
    const before = getSnapshot();
    markRecentlyCreated("  ");
    markRecentlyCreated("");
    expect(getSnapshot()).toBe(before);
    expect(hasRecentlyCreated()).toBe(false);
  });
});
