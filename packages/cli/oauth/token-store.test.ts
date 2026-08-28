import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createOAuthTokenStore,
  readOAuthCredential,
  writeOAuthCredential,
  removeOAuthCredential,
  isTokenExpired,
  resolveFreshAccessToken,
} from "./token-store";
import type { OAuthCredential } from "../../agent-runtime/oauthTokenStore";

describe("OAuth token store", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "nolo-oauth-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  test("reads and writes credentials", () => {
    const store = createOAuthTokenStore(homeDir);
    const credential: OAuthCredential = {
      provider: "chatgpt",
      accessToken: "sk-test",
      expiresAt: Date.now() + 3600_000,
      obtainedAt: Date.now(),
    };
    store.write("chatgpt", credential);
    const read = store.read("chatgpt");
    expect(read?.accessToken).toBe("sk-test");
    expect(read?.provider).toBe("chatgpt");
  });

  test("remove deletes the credential file", () => {
    const store = createOAuthTokenStore(homeDir);
    store.write("chatgpt", {
      provider: "chatgpt",
      accessToken: "sk-test",
      obtainedAt: Date.now(),
    });
    store.remove("chatgpt");
    expect(store.read("chatgpt")).toBeNull();
  });

  test("isTokenExpired returns true within skew window", () => {
    const now = 1_000_000;
    const credential: OAuthCredential = {
      provider: "chatgpt",
      accessToken: "x",
      expiresAt: now + 4 * 60 * 1000,
      obtainedAt: now,
    };
    expect(isTokenExpired(credential, 5 * 60 * 1000, now)).toBeTrue();
  });

  test("isTokenExpired returns false outside skew window", () => {
    const now = 1_000_000;
    const credential: OAuthCredential = {
      provider: "chatgpt",
      accessToken: "x",
      expiresAt: now + 10 * 60 * 1000,
      obtainedAt: now,
    };
    expect(isTokenExpired(credential, 5 * 60 * 1000, now)).toBeFalse();
  });

  test("resolveFreshAccessToken returns existing token when not expired", async () => {
    writeOAuthCredential(
      "chatgpt",
      {
        provider: "chatgpt",
        accessToken: "fresh",
        expiresAt: Date.now() + 3600_000,
        refreshToken: "refresh",
        obtainedAt: Date.now(),
      },
      homeDir
    );
    const token = await resolveFreshAccessToken({
      provider: "chatgpt",
      homeDir,
    });
    expect(token).toBe("fresh");
  });

  test("resolveFreshAccessToken refreshes expired token", async () => {
    const now = 1_000_000;
    writeOAuthCredential(
      "chatgpt",
      {
        provider: "chatgpt",
        accessToken: "expired",
        expiresAt: now + 60_000,
        refreshToken: "refresh-1",
        obtainedAt: now,
      },
      homeDir
    );
    const refreshed = await resolveFreshAccessToken({
      provider: "chatgpt",
      homeDir,
      refresh: async (credential) => ({
        ...credential,
        accessToken: "refreshed",
        refreshToken: "refresh-2",
        expiresAt: now + 3600_000,
        obtainedAt: now,
      }),
      now: () => now,
    });
    expect(refreshed).toBe("refreshed");
    expect(readOAuthCredential("chatgpt", homeDir)?.accessToken).toBe("refreshed");
  });

  test("resolveFreshAccessToken returns null when credential is missing", async () => {
    const token = await resolveFreshAccessToken({ provider: "chatgpt", homeDir });
    expect(token).toBeNull();
  });
});
