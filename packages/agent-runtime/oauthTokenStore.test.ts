import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createOAuthTokenStore,
  DEFAULT_REFRESH_SKEW_MS,
  getCredentialPath,
  getCredentialsDir,
  isTokenExpired,
  readOAuthCredential,
  removeOAuthCredential,
  resolveFreshAccessToken,
  writeOAuthCredential,
  type OAuthCredential,
} from "./oauthTokenStore";

const tempHomes: string[] = [];

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "nolo-oauth-store-"));
  tempHomes.push(home);
  return home;
}

function sampleCredential(
  overrides: Partial<OAuthCredential> & Pick<OAuthCredential, "provider"> = {
    provider: "chatgpt",
  }
): OAuthCredential {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    obtainedAt: 1_700_000_000_000,
    ...overrides,
  };
}

afterEach(() => {
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) rmSync(home, { recursive: true, force: true });
  }
});

describe("oauthTokenStore", () => {
  test("write/read/remove round-trip", () => {
    const homeDir = makeHome();
    const credential = sampleCredential({ provider: "chatgpt" });

    expect(readOAuthCredential("chatgpt", homeDir)).toBeNull();
    writeOAuthCredential("chatgpt", credential, homeDir);
    expect(readOAuthCredential("chatgpt", homeDir)).toEqual(credential);

    const path = getCredentialPath("chatgpt", homeDir);
    expect(existsSync(path)).toBe(true);
    expect(path.startsWith(getCredentialsDir(homeDir))).toBe(true);

    removeOAuthCredential("chatgpt", homeDir);
    expect(readOAuthCredential("chatgpt", homeDir)).toBeNull();
    expect(existsSync(path)).toBe(false);
  });

  test("createOAuthTokenStore uses private file permissions when the host supports mode bits", () => {
    const homeDir = makeHome();
    const store = createOAuthTokenStore(homeDir);
    store.write("xai", sampleCredential({ provider: "xai", accessToken: "xai-token" }));

    const dir = getCredentialsDir(homeDir);
    const path = getCredentialPath("xai", homeDir);
    expect(existsSync(path)).toBe(true);

    // Best-effort private mode (skip assert on platforms that never honor chmod).
    if (process.platform !== "win32") {
      expect(statSync(dir).mode & 0o777).toBe(0o700);
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }

    store.remove("xai");
    expect(store.read("xai")).toBeNull();
  });

  test("writeOAuthCredential re-applies private modes on existing paths", () => {
    const homeDir = makeHome();
    writeOAuthCredential(
      "cloudflare",
      sampleCredential({ provider: "cloudflare", accessToken: "cf-1", obtainedAt: 1 }),
      homeDir
    );

    const dir = getCredentialsDir(homeDir);
    const path = getCredentialPath("cloudflare", homeDir);

    // Overwrite existing file — modes should stay private.
    writeOAuthCredential(
      "cloudflare",
      sampleCredential({ provider: "cloudflare", accessToken: "cf-2", obtainedAt: 2 }),
      homeDir
    );

    expect(readOAuthCredential("cloudflare", homeDir)?.accessToken).toBe("cf-2");
    if (process.platform !== "win32") {
      expect(statSync(dir).mode & 0o777).toBe(0o700);
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
  });
});

describe("isTokenExpired", () => {
  const base = sampleCredential({ provider: "chatgpt" });

  test("missing expiresAt is not expired", () => {
    expect(isTokenExpired(base, DEFAULT_REFRESH_SKEW_MS, 1_700_000_000_000)).toBe(
      false,
    );
  });

  test("expires well after now+skew is fresh", () => {
    const now = 1_000_000;
    const skew = 60_000;
    expect(
      isTokenExpired(
        { ...base, expiresAt: now + skew + 1 },
        skew,
        now,
      ),
    ).toBe(false);
  });

  test("within skew window is expired", () => {
    const now = 1_000_000;
    const skew = 60_000;
    expect(
      isTokenExpired({ ...base, expiresAt: now + skew }, skew, now),
    ).toBe(true);
    expect(
      isTokenExpired({ ...base, expiresAt: now + 1 }, skew, now),
    ).toBe(true);
  });

  test("past expiry is expired", () => {
    const now = 1_000_000;
    expect(isTokenExpired({ ...base, expiresAt: now - 1 }, 0, now)).toBe(true);
  });
});

describe("resolveFreshAccessToken", () => {
  test("force: true refreshes even when token is not expired", async () => {
    const homeDir = makeHome();
    const store = createOAuthTokenStore(homeDir);
    const now = 1_000_000;
    const fresh = sampleCredential({
      provider: "chatgpt",
      accessToken: "fresh-access",
      refreshToken: "refresh-token",
      expiresAt: now + 10 * DEFAULT_REFRESH_SKEW_MS,
      obtainedAt: now,
    });
    store.write("chatgpt", fresh);
    expect(isTokenExpired(fresh, DEFAULT_REFRESH_SKEW_MS, now)).toBe(false);

    let refreshCalled = 0;
    const refreshed = sampleCredential({
      provider: "chatgpt",
      accessToken: "force-refreshed-access",
      refreshToken: "refresh-token",
      expiresAt: now + 10 * DEFAULT_REFRESH_SKEW_MS,
      obtainedAt: now,
    });
    const token = await resolveFreshAccessToken({
      provider: "chatgpt",
      store,
      now: () => now,
      refresh: async () => {
        refreshCalled += 1;
        return refreshed;
      },
      force: true,
    });
    expect(token).toBe("force-refreshed-access");
    expect(refreshCalled).toBe(1);
    expect(store.read("chatgpt")?.accessToken).toBe("force-refreshed-access");
  });

  test("without force, returns cached token when not expired", async () => {
    const homeDir = makeHome();
    const store = createOAuthTokenStore(homeDir);
    const now = 1_000_000;
    const fresh = sampleCredential({
      provider: "chatgpt",
      accessToken: "cached-access",
      refreshToken: "refresh-token",
      expiresAt: now + 10 * DEFAULT_REFRESH_SKEW_MS,
      obtainedAt: now,
    });
    store.write("chatgpt", fresh);

    let refreshCalled = 0;
    const token = await resolveFreshAccessToken({
      provider: "chatgpt",
      store,
      now: () => now,
      refresh: async () => {
        refreshCalled += 1;
        return { ...fresh, accessToken: "should-not-happen" };
      },
    });
    expect(token).toBe("cached-access");
    expect(refreshCalled).toBe(0);
  });
});
