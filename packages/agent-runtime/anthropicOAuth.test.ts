import { describe, expect, test } from "bun:test";

import {
  ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTHROPIC_OAUTH_BETA,
  ANTHROPIC_OAUTH_CLIENT_ID,
  ANTHROPIC_OAUTH_TOKEN_URL,
  anthropicRefresh,
  normalizeAnthropicTokenPayload,
  refreshAnthropicToken,
} from "./anthropicOAuth";
import type { OAuthCredential } from "./oauthTokenStore";

describe("Anthropic OAuth Pure Runtime Seam", () => {
  describe("normalizeAnthropicTokenPayload", () => {
    test("normalizes a complete token payload with DI clock", () => {
      const now = 1_000_000;
      const credential = normalizeAnthropicTokenPayload({
        payload: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          scope: "user:inference user:profile",
          account: {
            uuid: "acct-123",
            email_address: "user@example.com",
          },
          organization: {
            uuid: "org-456",
            name: "Acme Corp",
          },
        },
        now,
      });

      expect(credential).toEqual({
        provider: "claude",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: now + 3600 * 1000 - ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS,
        scope: "user:inference user:profile",
        accountId: "acct-123",
        metadata: {
          email: "user@example.com",
          organizationId: "org-456",
          organizationName: "Acme Corp",
        },
        obtainedAt: now,
      });
    });

    test("preserves existing refresh token and metadata when omitted in refresh response", () => {
      const now = 2_000_000;
      const baseCredential: OAuthCredential = {
        provider: "claude",
        accessToken: "old-access",
        refreshToken: "keep-this-refresh-token",
        expiresAt: 1_500_000,
        scope: "user:inference",
        accountId: "acct-existing",
        metadata: {
          email: "user@example.com",
          customKey: "customValue",
        },
        obtainedAt: 1_000_000,
      };

      const result = normalizeAnthropicTokenPayload({
        payload: {
          access_token: "new-access",
          expires_in: 7200,
        },
        baseCredential,
        now,
      });

      expect(result.accessToken).toBe("new-access");
      expect(result.refreshToken).toBe("keep-this-refresh-token");
      expect(result.accountId).toBe("acct-existing");
      expect(result.scope).toBe("user:inference");
      expect(result.metadata).toEqual({
        email: "user@example.com",
        customKey: "customValue",
      });
      expect(result.expiresAt).toBe(now + 7200 * 1000 - ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS);
      expect(result.obtainedAt).toBe(now);
    });

    test("throws when access_token is missing or empty", () => {
      expect(() =>
        normalizeAnthropicTokenPayload({
          payload: { refresh_token: "some-refresh" },
        })
      ).toThrow("Claude OAuth token response missing access_token");

      expect(() =>
        normalizeAnthropicTokenPayload({
          payload: { access_token: "   " },
        })
      ).toThrow("Claude OAuth token response missing access_token");

      expect(() =>
        normalizeAnthropicTokenPayload({
          payload: { access_token: 12345 as unknown as string },
        })
      ).toThrow("Claude OAuth token response missing access_token");
    });
  });

  describe("refreshAnthropicToken / anthropicRefresh", () => {
    test("is aliased to anthropicRefresh", () => {
      expect(anthropicRefresh).toBe(refreshAnthropicToken);
    });

    test("throws if credential has no refresh_token", async () => {
      await expect(
        refreshAnthropicToken({
          provider: "claude",
          accessToken: "token-without-refresh",
          obtainedAt: 1000,
        })
      ).rejects.toThrow("Claude credential has no refresh_token");
    });

    test("sends proper payload and headers with DI fetch and clock", async () => {
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;
      const fakeNow = 5_000_000;

      const fakeFetch: typeof fetch = async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return new Response(
          JSON.stringify({
            access_token: "refreshed-access-token",
            refresh_token: "rotated-refresh-token",
            expires_in: 3600,
            scope: "user:inference",
          }),
          { status: 200 }
        );
      };

      const result = await refreshAnthropicToken(
        {
          provider: "claude",
          accessToken: "old-access",
          refreshToken: "current-refresh",
          accountId: "acct-1",
          obtainedAt: 1000,
        },
        {
          fetchImpl: fakeFetch,
          now: () => fakeNow,
        }
      );

      expect(capturedUrl).toBe(ANTHROPIC_OAUTH_TOKEN_URL);
      expect(capturedInit?.method).toBe("POST");

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["anthropic-beta"]).toBe(ANTHROPIC_OAUTH_BETA);
      expect(headers["User-Agent"]).toBe("nolo-cli userOAuthProvider");

      const body = JSON.parse(String(capturedInit?.body));
      expect(body).toEqual({
        grant_type: "refresh_token",
        client_id: ANTHROPIC_OAUTH_CLIENT_ID,
        refresh_token: "current-refresh",
      });
      expect(body).not.toHaveProperty("client_secret");

      expect(result).toEqual({
        provider: "claude",
        accessToken: "refreshed-access-token",
        refreshToken: "rotated-refresh-token",
        expiresAt: fakeNow + 3600 * 1000 - ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS,
        scope: "user:inference",
        accountId: "acct-1",
        obtainedAt: fakeNow,
      });
    });

    test("handles error_description in error response", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Refresh token is invalid or expired",
          }),
          { status: 400 }
        );

      await expect(
        refreshAnthropicToken(
          {
            provider: "claude",
            accessToken: "old-access",
            refreshToken: "bad-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Claude token refresh failed: Refresh token is invalid or expired");
    });

    test("handles error code when error_description is absent", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "invalid_client",
          }),
          { status: 401 }
        );

      await expect(
        refreshAnthropicToken(
          {
            provider: "claude",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Claude token refresh failed: invalid_client");
    });

    test("handles non-JSON error response", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("Gateway Timeout", { status: 504 });

      await expect(
        refreshAnthropicToken(
          {
            provider: "claude",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Claude token refresh failed: HTTP 504");
    });

    test("handles 200 response missing access_token", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(JSON.stringify({}), { status: 200 });

      await expect(
        refreshAnthropicToken(
          {
            provider: "claude",
            accessToken: "old-access",
            refreshToken: "some-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Claude token refresh response missing access_token");
    });
  });
});
