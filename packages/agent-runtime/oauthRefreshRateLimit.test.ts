import { describe, expect, it } from "bun:test";
import {
  assertOAuthRefreshAllowed,
  OAuthRefreshRateLimitedError,
  resetOAuthRefreshRateLimitForTests,
} from "./oauthRefreshRateLimit";

describe("oauthRefreshRateLimit", () => {
  it("allows up to maxStarts then throws", () => {
    resetOAuthRefreshRateLimitForTests();
    let now = 1_000;
    const cfg = { maxStarts: 3, windowMs: 60_000, now: () => now };

    assertOAuthRefreshAllowed("u:p", "xai", cfg);
    assertOAuthRefreshAllowed("u:p", "xai", cfg);
    assertOAuthRefreshAllowed("u:p", "xai", cfg);

    expect(() => assertOAuthRefreshAllowed("u:p", "xai", cfg)).toThrow(
      OAuthRefreshRateLimitedError,
    );

    now += 60_001;
    assertOAuthRefreshAllowed("u:p", "xai", cfg);
  });
});
