import { describe, expect, it } from "bun:test";
import { createTokenKey, createTokenStatsKey, isTokenStatsKey } from "./keys";

describe("token stats keys", () => {
  it("correctly identifies token stats keys", () => {
    const statsKey = createTokenStatsKey("user-1", "2026-08-20");
    expect(statsKey).toBe("token-stats-day-user-user-1-2026-08-20");
    expect(isTokenStatsKey(statsKey)).toBe(true);

    expect(isTokenStatsKey("token-stats-day-user-anyuser-2026-01-01")).toBe(true);
    expect(isTokenStatsKey("token-stats-other")).toBe(true);
  });

  it("does not match normal token detail records or other keys", () => {
    const normalTokenKey = createTokenKey.record("user-1", 1787193554023);
    expect(normalTokenKey).toBe("token-user-1-1787193554023");
    expect(isTokenStatsKey(normalTokenKey)).toBe(false);

    const stableCallKey = createTokenKey.recordForStableCall("user-1", "call-123");
    expect(isTokenStatsKey(stableCallKey)).toBe(false);

    expect(isTokenStatsKey("token-user-1-123456789")).toBe(false);
    expect(isTokenStatsKey("dialog-user-1-01DIALOGID000000000000001")).toBe(false);
    expect(isTokenStatsKey("page-user-1-page-1")).toBe(false);
    expect(isTokenStatsKey("meta-user-1-table-1")).toBe(false);
    expect(isTokenStatsKey("")).toBe(false);
  });
});
