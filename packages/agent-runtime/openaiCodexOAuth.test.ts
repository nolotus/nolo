import { describe, expect, test } from "bun:test";

import {
  OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS,
  OPENAI_CODEX_CLIENT_ID,
  OPENAI_CODEX_TOKEN_URL,
  decodeOpenAiIdToken,
  normalizeOpenAiCodexTokenPayload,
  openAiCodexRefresh,
  refreshOpenAiCodexToken,
} from "./openaiCodexOAuth";
import type { OAuthCredential } from "./oauthTokenStore";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("OpenAI Codex OAuth Pure Runtime Seam", () => {
  describe("constants", () => {
    test("exports expected client id and token url", () => {
      expect(OPENAI_CODEX_CLIENT_ID).toBe("app_EMoamEEZ73f0CkXaXp7hrann");
      expect(OPENAI_CODEX_TOKEN_URL).toBe("https://auth.openai.com/oauth/token");
      expect(OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS).toBe(5 * 60 * 1000);
    });
  });

  describe("decodeOpenAiIdToken", () => {
    test("extracts chatgpt_account_id and email from namespaced auth claim", () => {
      const token = makeJwt({
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-12345",
        },
        email: "user@example.com",
      });

      const decoded = decodeOpenAiIdToken(token);
      expect(decoded).toEqual({
        accountId: "acct-12345",
        email: "user@example.com",
      });
    });

    test("extracts chatgpt_account_id from top-level claims", () => {
      const token = makeJwt({
        chatgpt_account_id: "acct-top-level",
        email: "alice@example.com",
      });

      const decoded = decodeOpenAiIdToken(token);
      expect(decoded).toEqual({
        accountId: "acct-top-level",
        email: "alice@example.com",
      });
    });

    test("extracts account_id fallback from top-level claims", () => {
      const token = makeJwt({
        account_id: "acct-fallback",
        email: "bob@example.com",
      });

      const decoded = decodeOpenAiIdToken(token);
      expect(decoded).toEqual({
        accountId: "acct-fallback",
        email: "bob@example.com",
      });
    });

    test("handles standard base64url padding and url-safe characters", () => {
      const token = makeJwt({
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-with-special-chars-_+=",
        },
        email: "special+tag@domain.co.uk",
      });

      const decoded = decodeOpenAiIdToken(token);
      expect(decoded.accountId).toBe("acct-with-special-chars-_+=");
      expect(decoded.email).toBe("special+tag@domain.co.uk");
    });

    test("returns empty object for undefined, empty, or malformed tokens", () => {
      expect(decodeOpenAiIdToken()).toEqual({});
      expect(decodeOpenAiIdToken("")).toEqual({});
      expect(decodeOpenAiIdToken("not-a-jwt")).toEqual({});
      expect(decodeOpenAiIdToken("header.invalid-base64-json.sig")).toEqual({});
      expect(decodeOpenAiIdToken("a.b")).toEqual({});
    });
  });

  describe("normalizeOpenAiCodexTokenPayload", () => {
    test("normalizes a full payload with JWT access/id tokens and DI clock", () => {
      const now = 1_000_000;
      const accessToken = makeJwt({
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-from-access",
        },
        email: "access-user@example.com",
      });
      const idToken = makeJwt({
        email: "id-user@example.com",
      });

      const credential = normalizeOpenAiCodexTokenPayload({
        payload: {
          access_token: accessToken,
          refresh_token: "new-refresh-token",
          expires_in: 3600,
          scope: "openid profile email",
          id_token: idToken,
        },
        now,
      });

      expect(credential).toEqual({
        provider: "chatgpt",
        accessToken,
        refreshToken: "new-refresh-token",
        expiresAt: now + 3600 * 1000 - OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS,
        obtainedAt: now,
        scope: "openid profile email",
        accountId: "acct-from-access",
        metadata: {
          email: "access-user@example.com",
        },
      });
    });

    test("extracts account and email from id_token when access_token is opaque", () => {
      const now = 1_000_000;
      const idToken = makeJwt({
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-from-id",
        },
        email: "id-only@example.com",
      });

      const credential = normalizeOpenAiCodexTokenPayload({
        payload: {
          access_token: "opaque-access-token",
          id_token: idToken,
          expires_in: 1800,
        },
        now,
      });

      expect(credential.accountId).toBe("acct-from-id");
      expect(credential.metadata?.email).toBe("id-only@example.com");
      expect(credential.expiresAt).toBe(
        now + 1800 * 1000 - OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS
      );
    });

    test("preserves existing baseCredential fields when payload omits them", () => {
      const now = 2_000_000;
      const baseCredential: OAuthCredential = {
        provider: "chatgpt",
        accessToken: "old-access",
        refreshToken: "keep-refresh-token",
        expiresAt: 1_500_000,
        scope: "openid profile",
        accountId: "acct-existing",
        metadata: {
          email: "existing@example.com",
          customAttr: "value",
        },
        obtainedAt: 1_000_000,
      };

      const result = normalizeOpenAiCodexTokenPayload({
        payload: {
          access_token: "new-access",
        },
        baseCredential,
        now,
      });

      expect(result.accessToken).toBe("new-access");
      expect(result.refreshToken).toBe("keep-refresh-token");
      expect(result.accountId).toBe("acct-existing");
      expect(result.scope).toBe("openid profile");
      expect(result.metadata).toEqual({
        email: "existing@example.com",
        customAttr: "value",
      });
      expect(result.expiresAt).toBe(1_500_000);
      expect(result.obtainedAt).toBe(now);
    });

    test("allows custom clientSkewMs override", () => {
      const now = 10_000_000;
      const result = normalizeOpenAiCodexTokenPayload({
        payload: {
          access_token: "test-token",
          expires_in: 3600,
        },
        now,
        clientSkewMs: 0,
      });

      expect(result.expiresAt).toBe(now + 3600 * 1000);
    });

    test("throws when access_token is missing or empty", () => {
      expect(() =>
        normalizeOpenAiCodexTokenPayload({
          payload: { refresh_token: "some-refresh" },
        })
      ).toThrow("OpenAI Codex token response missing access_token");

      expect(() =>
        normalizeOpenAiCodexTokenPayload({
          payload: { access_token: "   " },
        })
      ).toThrow("OpenAI Codex token response missing access_token");
    });
  });

  describe("refreshOpenAiCodexToken / openAiCodexRefresh", () => {
    test("is aliased to openAiCodexRefresh", () => {
      expect(openAiCodexRefresh).toBe(refreshOpenAiCodexToken);
    });

    test("throws when credential has no refresh_token", async () => {
      await expect(
        refreshOpenAiCodexToken({
          provider: "chatgpt",
          accessToken: "tok",
          obtainedAt: 1000,
        })
      ).rejects.toThrow("Cannot refresh OpenAI Codex token without a refresh token.");
    });

    test("refreshes token successfully via form-urlencoded POST", async () => {
      let interceptedUrl = "";
      let interceptedMethod = "";
      let interceptedHeaders: HeadersInit | undefined;
      let interceptedBody = "";

      const now = 5_000_000;
      const newAccessToken = makeJwt({
        "https://api.openai.com/auth": { chatgpt_account_id: "refreshed-acct" },
        email: "refreshed@example.com",
      });

      const fakeFetch: typeof fetch = async (input, init) => {
        interceptedUrl = String(input);
        interceptedMethod = init?.method ?? "";
        interceptedHeaders = init?.headers;
        interceptedBody = String(init?.body ?? "");

        return new Response(
          JSON.stringify({
            access_token: newAccessToken,
            refresh_token: "brand-new-refresh-token",
            expires_in: 7200,
            scope: "openid profile email",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      const result = await refreshOpenAiCodexToken(
        {
          provider: "chatgpt",
          accessToken: "old-access",
          refreshToken: "current-refresh",
          obtainedAt: 1000,
        },
        {
          fetchImpl: fakeFetch,
          now: () => now,
        }
      );

      expect(interceptedUrl).toBe(OPENAI_CODEX_TOKEN_URL);
      expect(interceptedMethod).toBe("POST");
      expect(interceptedHeaders).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      });

      const parsedBody = new URLSearchParams(interceptedBody);
      expect(parsedBody.get("grant_type")).toBe("refresh_token");
      expect(parsedBody.get("client_id")).toBe(OPENAI_CODEX_CLIENT_ID);
      expect(parsedBody.get("refresh_token")).toBe("current-refresh");

      expect(result).toEqual({
        provider: "chatgpt",
        accessToken: newAccessToken,
        refreshToken: "brand-new-refresh-token",
        expiresAt: now + 7200 * 1000 - OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS,
        obtainedAt: now,
        scope: "openid profile email",
        accountId: "refreshed-acct",
        metadata: {
          email: "refreshed@example.com",
        },
      });
    });

    test("preserves existing refreshToken when refresh response omits it", async () => {
      const now = 5_000_000;
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            access_token: "rotated-access",
            expires_in: 3600,
          }),
          { status: 200 }
        );

      const result = await refreshOpenAiCodexToken(
        {
          provider: "chatgpt",
          accessToken: "old-access",
          refreshToken: "preserve-this-refresh",
          obtainedAt: 1000,
        },
        {
          fetchImpl: fakeFetch,
          now: () => now,
        }
      );

      expect(result.accessToken).toBe("rotated-access");
      expect(result.refreshToken).toBe("preserve-this-refresh");
    });

    test("handles HTTP error response with error_description", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Refresh token has expired or is revoked",
          }),
          { status: 400 }
        );

      await expect(
        refreshOpenAiCodexToken(
          {
            provider: "chatgpt",
            accessToken: "old-access",
            refreshToken: "expired-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("OpenAI Codex token refresh failed: Refresh token has expired or is revoked");
    });

    test("handles non-JSON error response", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("502 Bad Gateway - Cloudflare", { status: 502 });

      await expect(
        refreshOpenAiCodexToken(
          {
            provider: "chatgpt",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("OpenAI Codex token refresh failed: HTTP 502");
    });

    test("handles 200 response missing access_token", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(JSON.stringify({}), { status: 200 });

      await expect(
        refreshOpenAiCodexToken(
          {
            provider: "chatgpt",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("OpenAI Codex token refresh response missing access_token");
    });

    test("handles network fetch error", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("Connection reset by peer");
      };

      await expect(
        refreshOpenAiCodexToken(
          {
            provider: "chatgpt",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("OpenAI Codex token refresh failed: Connection reset by peer");
    });
  });
});
