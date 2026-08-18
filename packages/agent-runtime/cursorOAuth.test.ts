import { describe, expect, test } from "bun:test";

import {
  CURSOR_ACCESS_TOKEN_CLIENT_SKEW_MS,
  CURSOR_LOGIN_URL,
  CURSOR_POLL_URL,
  CURSOR_REFRESH_URL,
  cursorRefresh,
  decodeJwtExp,
  normalizeCursorTokenPayload,
  refreshCursorToken,
} from "./cursorOAuth";
import type { OAuthCredential } from "./oauthTokenStore";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.mock-signature`;
}

describe("Cursor OAuth Pure Runtime Seam", () => {
  describe("constants", () => {
    test("exports expected URLs and timing constants", () => {
      expect(CURSOR_LOGIN_URL).toBe("https://cursor.com/loginDeepControl");
      expect(CURSOR_POLL_URL).toBe("https://api2.cursor.sh/auth/poll");
      expect(CURSOR_REFRESH_URL).toBe("https://api2.cursor.sh/auth/exchange_user_api_key");
      expect(CURSOR_ACCESS_TOKEN_CLIENT_SKEW_MS).toBe(5 * 60 * 1000);
    });
  });

  describe("decodeJwtExp", () => {
    test("extracts exp in seconds and converts to milliseconds", () => {
      const expSec = 1_700_000_000;
      const jwt = makeJwt({ exp: expSec, sub: "user-123" });
      expect(decodeJwtExp(jwt)).toBe(expSec * 1000);
    });

    test("returns null when exp is missing in JWT payload", () => {
      const jwt = makeJwt({ sub: "user-123" });
      expect(decodeJwtExp(jwt)).toBeNull();
    });

    test("returns null when exp is not a finite number", () => {
      expect(decodeJwtExp(makeJwt({ exp: "1700000000" }))).toBeNull();
      expect(decodeJwtExp(makeJwt({ exp: true }))).toBeNull();
      expect(decodeJwtExp(makeJwt({ exp: null }))).toBeNull();
      expect(decodeJwtExp(makeJwt({ exp: NaN }))).toBeNull();
      expect(decodeJwtExp(makeJwt({ exp: Infinity }))).toBeNull();
    });

    test("returns null for non-JWT strings", () => {
      expect(decodeJwtExp("")).toBeNull();
      expect(decodeJwtExp("not-a-jwt")).toBeNull();
      expect(decodeJwtExp("header-only")).toBeNull();
    });

    test("returns null for malformed base64url or non-JSON payloads", () => {
      expect(decodeJwtExp("header.not-base64-json.signature")).toBeNull();
      expect(decodeJwtExp("header." + Buffer.from("plain text not json").toString("base64url") + ".signature")).toBeNull();
    });
  });

  describe("normalizeCursorTokenPayload", () => {
    test("normalizes a token payload with JWT accessToken and new refreshToken", () => {
      const now = 1_000_000;
      const expSec = 2_000_000;
      const jwt = makeJwt({ exp: expSec });

      const credential = normalizeCursorTokenPayload({
        payload: {
          accessToken: jwt,
          refreshToken: "new-refresh-token",
        },
        baseCredential: {
          provider: "cursor",
          accessToken: "old-access",
          refreshToken: "old-refresh",
          obtainedAt: 500,
        },
        now,
      });

      expect(credential).toEqual({
        provider: "cursor",
        accessToken: jwt,
        refreshToken: "new-refresh-token",
        expiresAt: expSec * 1000,
        obtainedAt: now,
      });
    });

    test("falls back to default 1h expiry when accessToken is not a JWT", () => {
      const now = 1_000_000;
      const credential = normalizeCursorTokenPayload({
        payload: {
          accessToken: "opaque-cursor-token",
        },
        baseCredential: {
          provider: "cursor",
          accessToken: "old-access",
          refreshToken: "old-refresh",
          obtainedAt: 500,
        },
        now,
      });

      expect(credential.expiresAt).toBe(now + 3600 * 1000 - CURSOR_ACCESS_TOKEN_CLIENT_SKEW_MS);
      expect(credential.refreshToken).toBe("old-refresh");
      expect(credential.obtainedAt).toBe(now);
    });

    test("preserves existing baseCredential fields when payload omits optional fields", () => {
      const now = 2_000_000;
      const base: OAuthCredential = {
        provider: "cursor",
        accessToken: "old-token",
        refreshToken: "preserved-refresh",
        accountId: "acc-999",
        metadata: { customField: true },
        obtainedAt: 1000,
      };

      const result = normalizeCursorTokenPayload({
        payload: {
          accessToken: "new-token",
        },
        baseCredential: base,
        now,
      });

      expect(result.refreshToken).toBe("preserved-refresh");
      expect(result.accountId).toBe("acc-999");
      expect(result.metadata).toEqual({ customField: true });
    });

    test("throws when accessToken is missing or empty", () => {
      expect(() =>
        normalizeCursorTokenPayload({
          payload: {},
          now: 1000,
        })
      ).toThrow("Cursor token refresh response missing accessToken");

      expect(() =>
        normalizeCursorTokenPayload({
          payload: { accessToken: "   " },
          now: 1000,
        })
      ).toThrow("Cursor token refresh response missing accessToken");
    });
  });

  describe("refreshCursorToken / cursorRefresh", () => {
    test("is aliased to cursorRefresh", () => {
      expect(cursorRefresh).toBe(refreshCursorToken);
    });

    test("throws when credential has no refreshToken", async () => {
      await expect(
        refreshCursorToken({
          provider: "cursor",
          accessToken: "old-access",
          obtainedAt: 1000,
        })
      ).rejects.toThrow("Cursor credential has no refresh_token");
    });

    test("successfully refreshes token with valid response and headers", async () => {
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      const fakeNow = 1_700_000_000_000;
      const expSec = 1_700_003_600;
      const jwtToken = makeJwt({ exp: expSec });

      const fakeFetch: typeof fetch = async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return new Response(
          JSON.stringify({
            accessToken: jwtToken,
            refreshToken: "rotated-refresh-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const oldCredential: OAuthCredential = {
        provider: "cursor",
        accessToken: "old-access-token",
        refreshToken: "initial-refresh-token",
        obtainedAt: 1_600_000_000_000,
      };

      const refreshed = await refreshCursorToken(oldCredential, {
        fetchImpl: fakeFetch,
        now: () => fakeNow,
      });

      expect(capturedUrl).toBe(CURSOR_REFRESH_URL);
      expect(capturedInit?.method).toBe("POST");
      expect((capturedInit?.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer initial-refresh-token"
      );
      expect((capturedInit?.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json"
      );
      expect(capturedInit?.body).toBe("{}");

      expect(refreshed).toEqual({
        provider: "cursor",
        accessToken: jwtToken,
        refreshToken: "rotated-refresh-token",
        expiresAt: expSec * 1000,
        obtainedAt: fakeNow,
      });
    });

    test("preserves previous refreshToken if response omits it", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            accessToken: "new-opaque-access",
          }),
          { status: 200 }
        );

      const refreshed = await refreshCursorToken(
        {
          provider: "cursor",
          accessToken: "old-access",
          refreshToken: "keep-this-refresh",
          obtainedAt: 1000,
        },
        { fetchImpl: fakeFetch, now: () => 5000 }
      );

      expect(refreshed.accessToken).toBe("new-opaque-access");
      expect(refreshed.refreshToken).toBe("keep-this-refresh");
    });

    test("throws with status and body detail when response is not ok", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("Unauthorized: invalid grant", { status: 401 });

      await expect(
        refreshCursorToken(
          {
            provider: "cursor",
            accessToken: "old-access",
            refreshToken: "bad-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Cursor token refresh failed: 401 Unauthorized: invalid grant");
    });

    test("handles non-ok response when body reading fails", async () => {
      const responseWithBrokenText = new Response(new ReadableStream({
        start(controller) {
          controller.error(new Error("stream failure"));
        },
      }), { status: 502 });

      const fakeFetch: typeof fetch = async () => responseWithBrokenText;

      await expect(
        refreshCursorToken(
          {
            provider: "cursor",
            accessToken: "old-access",
            refreshToken: "bad-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Cursor token refresh failed: 502");
    });

    test("throws when response JSON parsing fails", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("Not a JSON response", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });

      await expect(
        refreshCursorToken(
          {
            provider: "cursor",
            accessToken: "old-access",
            refreshToken: "good-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Cursor token refresh response is not valid JSON");
    });

    test("throws when network request fails", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("Connection refused");
      };

      await expect(
        refreshCursorToken(
          {
            provider: "cursor",
            accessToken: "old-access",
            refreshToken: "good-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Cursor token refresh failed: Connection refused");
    });
  });
});
