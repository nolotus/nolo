import { describe, expect, test } from "bun:test";

import {
  ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTIGRAVITY_AUTH_URL,
  ANTIGRAVITY_CALLBACK_PATH,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_CALLBACK_URL,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_TOKEN_REQUEST_TIMEOUT_MS,
  ANTIGRAVITY_TOKEN_URL,
  ANTIGRAVITY_USERINFO_URL,
  antigravityRefresh,
  getAntigravityUserAgent,
  isAntigravityOAuthAgent,
  normalizeAntigravityTokenPayload,
  readAntigravityProjectId,
  refreshAntigravityToken,
  resolveAntigravityCloudCodeBaseUrl,
} from "./antigravityOAuth";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import type { OAuthCredential } from "./oauthTokenStore";

describe("antigravityOAuth Pure Runtime Seam", () => {
  describe("constants & public client configuration", () => {
    test("exports expected public client credentials and endpoints", () => {
      expect(ANTIGRAVITY_CLIENT_ID).toContain("googleusercontent.com");
      expect(ANTIGRAVITY_CLIENT_SECRET).toBeTruthy();
      expect(ANTIGRAVITY_TOKEN_URL).toBe("https://oauth2.googleapis.com/token");
      expect(ANTIGRAVITY_AUTH_URL).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(ANTIGRAVITY_USERINFO_URL).toBe(
        "https://www.googleapis.com/oauth2/v1/userinfo?alt=json"
      );
      expect(ANTIGRAVITY_CALLBACK_PORT).toBe(51121);
      expect(ANTIGRAVITY_CALLBACK_PATH).toBe("/oauth-callback");
      expect(ANTIGRAVITY_CALLBACK_URL).toBe("http://127.0.0.1:51121/oauth-callback");
      expect(ANTIGRAVITY_SCOPES.length).toBeGreaterThan(0);
      expect(ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS).toBe(5 * 60 * 1000);
      expect(ANTIGRAVITY_TOKEN_REQUEST_TIMEOUT_MS).toBe(30_000);
    });

    test("generates expected User-Agent header string", () => {
      const ua = getAntigravityUserAgent();
      expect(ua).toMatch(/^antigravity\/hub\//);
    });
  });

  describe("agent configuration detection & URL resolution", () => {
    test("detects antigravity agents by apiKeyRef, provider, or cloud code URL", () => {
      expect(
        isAntigravityOAuthAgent({ apiKeyRef: "antigravity" } as AgentRuntimeAgentConfig)
      ).toBe(true);
      expect(
        isAntigravityOAuthAgent({ provider: "google-antigravity" } as AgentRuntimeAgentConfig)
      ).toBe(true);
      expect(
        isAntigravityOAuthAgent({
          customProviderUrl: "https://cloudcode-pa.googleapis.com/v1",
        } as AgentRuntimeAgentConfig)
      ).toBe(true);
      expect(
        isAntigravityOAuthAgent({ provider: "openai" } as AgentRuntimeAgentConfig)
      ).toBe(false);
      expect(isAntigravityOAuthAgent(null)).toBe(false);
      expect(isAntigravityOAuthAgent(undefined)).toBe(false);
    });

    test("resolves cloud code base URL", () => {
      expect(resolveAntigravityCloudCodeBaseUrl("")).toBe(
        ANTIGRAVITY_CLOUD_CODE_BASE_URL
      );
      expect(ANTIGRAVITY_CLOUD_CODE_BASE_URL).toBe(
        "https://daily-cloudcode-pa.googleapis.com"
      );
      expect(
        resolveAntigravityCloudCodeBaseUrl(
          "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent"
        )
      ).toBe(ANTIGRAVITY_CLOUD_CODE_BASE_URL);
      expect(
        resolveAntigravityCloudCodeBaseUrl(
          "https://daily-cloudcode-pa.googleapis.com"
        )
      ).toBe("https://daily-cloudcode-pa.googleapis.com");
      expect(
        resolveAntigravityCloudCodeBaseUrl(
          "https://custom-cloudcode-pa.googleapis.com/v1"
        )
      ).toBe("https://custom-cloudcode-pa.googleapis.com/v1");
    });

    test("reads projectId from metadata", () => {
      expect(readAntigravityProjectId({ projectId: "proj-1" })).toBe("proj-1");
      expect(readAntigravityProjectId({ projectId: "  " })).toBeUndefined();
      expect(readAntigravityProjectId(null)).toBeUndefined();
      expect(readAntigravityProjectId(undefined)).toBeUndefined();
    });
  });

  describe("normalizeAntigravityTokenPayload", () => {
    test("normalizes complete token payload with skew and timestamp", () => {
      const now = 10_000_000;
      const result = normalizeAntigravityTokenPayload({
        payload: {
          access_token: "ya29.sample-token",
          refresh_token: "1//sample-refresh",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/cloud-platform",
        },
        baseCredential: {
          provider: "antigravity",
          accountId: "user@example.com",
          metadata: {
            projectId: "projects/sample-project",
            email: "user@example.com",
          },
        },
        now,
      });

      expect(result).toEqual({
        provider: "antigravity",
        accessToken: "ya29.sample-token",
        refreshToken: "1//sample-refresh",
        expiresAt: now + 3600 * 1000 - ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        obtainedAt: now,
        accountId: "user@example.com",
        metadata: {
          projectId: "projects/sample-project",
          email: "user@example.com",
        },
      });
    });

    test("preserves existing refresh_token when response does not return a new one", () => {
      const now = 10_000_000;
      const result = normalizeAntigravityTokenPayload({
        payload: {
          access_token: "ya29.new-access-token",
          expires_in: 1800,
        },
        baseCredential: {
          provider: "antigravity",
          refreshToken: "1//existing-refresh-token",
          metadata: {
            projectId: "projects/p1",
          },
        },
        now,
      });

      expect(result.accessToken).toBe("ya29.new-access-token");
      expect(result.refreshToken).toBe("1//existing-refresh-token");
      expect(result.expiresAt).toBe(
        now + 1800 * 1000 - ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS
      );
      expect(result.metadata).toEqual({ projectId: "projects/p1" });
    });

    test("allows custom clientSkewMs", () => {
      const now = 10_000_000;
      const result = normalizeAntigravityTokenPayload({
        payload: {
          access_token: "ya29.token",
          expires_in: 3600,
        },
        now,
        clientSkewMs: 0,
      });

      expect(result.expiresAt).toBe(now + 3600 * 1000);
    });

    test("handles payload without expires_in", () => {
      const now = 10_000_000;
      const result = normalizeAntigravityTokenPayload({
        payload: {
          access_token: "ya29.token",
        },
        baseCredential: {
          expiresAt: 555555,
        },
        now,
      });

      expect(result.expiresAt).toBe(555555);
    });

    test("throws when access_token is missing or empty", () => {
      expect(() =>
        normalizeAntigravityTokenPayload({
          payload: { refresh_token: "1//refresh" },
        })
      ).toThrow("Antigravity token response missing access_token");

      expect(() =>
        normalizeAntigravityTokenPayload({
          payload: { access_token: "   " },
        })
      ).toThrow("Antigravity token response missing access_token");

      expect(() =>
        normalizeAntigravityTokenPayload({
          payload: { access_token: null as unknown as string },
        })
      ).toThrow("Antigravity token response missing access_token");
    });
  });

  describe("refreshAntigravityToken & antigravityRefresh", () => {
    test("antigravityRefresh is an alias for refreshAntigravityToken", () => {
      expect(antigravityRefresh).toBe(refreshAntigravityToken);
    });

    test("throws when credential has no refreshToken", async () => {
      await expect(
        refreshAntigravityToken({
          provider: "antigravity",
          accessToken: "ya29.old",
          obtainedAt: 1000,
        })
      ).rejects.toThrow("Antigravity credential has no refresh_token");

      await expect(
        refreshAntigravityToken({
          provider: "antigravity",
          accessToken: "ya29.old",
          refreshToken: "   ",
          obtainedAt: 1000,
        })
      ).rejects.toThrow("Antigravity credential has no refresh_token");
    });

    test("successfully refreshes token with valid response (DI fetch & clock)", async () => {
      let interceptedUrl = "";
      let interceptedMethod = "";
      let interceptedHeaders: HeadersInit | undefined;
      let interceptedBody = "";

      const now = 20_000_000;
      const fakeFetch: typeof fetch = async (input, init) => {
        interceptedUrl = String(input);
        interceptedMethod = init?.method ?? "";
        interceptedHeaders = init?.headers;
        interceptedBody = String(init?.body ?? "");

        return new Response(
          JSON.stringify({
            access_token: "ya29.refreshed-access-token",
            expires_in: 3600,
            token_type: "Bearer",
            scope: "https://www.googleapis.com/auth/cloud-platform",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      const baseCredential: OAuthCredential = {
        provider: "antigravity",
        accessToken: "ya29.old-token",
        refreshToken: "1//current-refresh-token",
        accountId: "user@example.com",
        metadata: {
          projectId: "projects/test-project",
          email: "user@example.com",
        },
        obtainedAt: 1000,
      };

      const result = await refreshAntigravityToken(baseCredential, {
        fetchImpl: fakeFetch,
        now: () => now,
      });

      expect(interceptedUrl).toBe(ANTIGRAVITY_TOKEN_URL);
      expect(interceptedMethod).toBe("POST");
      expect(interceptedHeaders).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      });

      const bodyParams = new URLSearchParams(interceptedBody);
      expect(bodyParams.get("client_id")).toBe(ANTIGRAVITY_CLIENT_ID);
      expect(bodyParams.get("client_secret")).toBe(ANTIGRAVITY_CLIENT_SECRET);
      expect(bodyParams.get("refresh_token")).toBe("1//current-refresh-token");
      expect(bodyParams.get("grant_type")).toBe("refresh_token");

      expect(result).toEqual({
        provider: "antigravity",
        accessToken: "ya29.refreshed-access-token",
        refreshToken: "1//current-refresh-token",
        expiresAt: now + 3600 * 1000 - ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        obtainedAt: now,
        accountId: "user@example.com",
        metadata: {
          projectId: "projects/test-project",
          email: "user@example.com",
        },
      });
    });

    test("rotates refreshToken if the refresh endpoint returns a new one", async () => {
      const now = 20_000_000;
      const fakeFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            access_token: "ya29.new-access-token",
            refresh_token: "1//rotated-refresh-token",
            expires_in: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const result = await refreshAntigravityToken(
        {
          provider: "antigravity",
          accessToken: "ya29.old",
          refreshToken: "1//old-refresh",
          obtainedAt: 1000,
        },
        {
          fetchImpl: fakeFetch,
          now: () => now,
        }
      );

      expect(result.accessToken).toBe("ya29.new-access-token");
      expect(result.refreshToken).toBe("1//rotated-refresh-token");
      expect(result.expiresAt).toBe(
        now + 7200 * 1000 - ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS
      );
    });

    test("throws error when response is missing access_token", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Antigravity token refresh response missing access_token");
    });

    test("handles structured JSON error response with error_description", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been expired or revoked.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//expired-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow(
        "Antigravity token refresh failed: Token has been expired or revoked."
      );
    });

    test("handles structured JSON error response with error only", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            error: "invalid_request",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//bad-refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Antigravity token refresh failed: invalid_request");
    });

    test("handles non-JSON error response", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("502 Bad Gateway: upstream server unavailable", {
          status: 502,
          headers: { "Content-Type": "text/plain" },
        });

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow(
        "Antigravity token refresh failed: 502 Bad Gateway: upstream server unavailable"
      );
    });

    test("handles empty body error response", async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response("", {
          status: 500,
        });

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow("Antigravity token refresh failed: HTTP 500");
    });

    test("handles network exception during fetch", async () => {
      const fakeFetch: typeof fetch = async () => {
        throw new Error("Connection refused (ECONNREFUSED)");
      };

      await expect(
        refreshAntigravityToken(
          {
            provider: "antigravity",
            accessToken: "ya29.old",
            refreshToken: "1//refresh",
            obtainedAt: 1000,
          },
          { fetchImpl: fakeFetch }
        )
      ).rejects.toThrow(
        "Antigravity token refresh failed: Connection refused (ECONNREFUSED)"
      );
    });
  });
});
