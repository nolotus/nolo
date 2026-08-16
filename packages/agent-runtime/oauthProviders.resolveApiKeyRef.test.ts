import { afterEach, describe, expect, it, mock } from "bun:test";
import type { OAuthCredential } from "./oauthTokenStore";
import {
  resetOAuthRefreshInflightForTests,
  resolveApiKeyRefFromStore,
} from "./oauthProviders";

afterEach(() => {
  resetOAuthRefreshInflightForTests();
});

describe("resolveApiKeyRefFromStore", () => {
  it("returns accountId and metadata with the access token", async () => {
    const store = {
      read: mock(async () => ({
        provider: "chatgpt" as const,
        accessToken: "tok-1",
        refreshToken: "ref-1",
        accountId: "acct-1",
        metadata: { email: "a@example.com" },
        obtainedAt: Date.now(),
        expiresAt: Date.now() + 3_600_000,
      })),
      write: mock(async () => {}),
      remove: mock(async () => {}),
    };

    const resolved = await resolveApiKeyRefFromStore({
      userId: "user-1",
      provider: "chatgpt",
      store,
    });

    expect(resolved.accessToken).toBe("tok-1");
    expect(resolved.accountId).toBe("acct-1");
    expect(resolved.metadata).toEqual({ email: "a@example.com" });
    expect(store.write).not.toHaveBeenCalled();
  });

  it("coalesces concurrent refreshes for the same user+provider", async () => {
    let refreshCalls = 0;
    let releaseRefresh!: (cred: OAuthCredential) => void;
    const refreshGate = new Promise<OAuthCredential>((resolve) => {
      releaseRefresh = resolve;
    });

    const expired: OAuthCredential = {
      provider: "chatgpt",
      accessToken: "stale",
      refreshToken: "ref-1",
      accountId: "acct-1",
      obtainedAt: Date.now() - 10_000,
      expiresAt: Date.now() - 1_000,
    };

    const store = {
      read: mock(async () => expired),
      write: mock(async () => {}),
      remove: mock(async () => {}),
    };

    const refreshFn = mock(async () => {
      refreshCalls += 1;
      return refreshGate;
    });

    const p1 = resolveApiKeyRefFromStore({
      userId: "user-1",
      provider: "chatgpt",
      store,
      refreshFn,
    });
    const p2 = resolveApiKeyRefFromStore({
      userId: "user-1",
      provider: "chatgpt",
      store,
      refreshFn,
    });

    for (let i = 0; i < 20 && refreshCalls === 0; i += 1) {
      await Promise.resolve();
    }
    expect(refreshCalls).toBe(1);

    releaseRefresh({
      ...expired,
      accessToken: "fresh",
      expiresAt: Date.now() + 3_600_000,
      obtainedAt: Date.now(),
    });

    const [a, b] = await Promise.all([p1, p2]);
    expect(a.accessToken).toBe("fresh");
    expect(b.accessToken).toBe("fresh");
    expect(refreshCalls).toBe(1);
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it("force=true refreshes even when the token is not yet expired", async () => {
    const fresh: OAuthCredential = {
      provider: "chatgpt",
      accessToken: "still-valid",
      refreshToken: "ref-1",
      obtainedAt: Date.now(),
      expiresAt: Date.now() + 3_600_000,
    };

    const store = {
      read: mock(async () => fresh),
      write: mock(async () => {}),
      remove: mock(async () => {}),
    };

    const refreshFn = mock(async () => ({
      ...fresh,
      accessToken: "rotated",
      obtainedAt: Date.now(),
      expiresAt: Date.now() + 3_600_000,
    }));

    const resolved = await resolveApiKeyRefFromStore({
      userId: "user-1",
      provider: "chatgpt",
      store,
      refreshFn,
      force: true,
    });

    // Without force this returns "still-valid" and never calls refreshFn.
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(resolved.accessToken).toBe("rotated");
    expect(store.write).toHaveBeenCalledTimes(1);
  });
});
