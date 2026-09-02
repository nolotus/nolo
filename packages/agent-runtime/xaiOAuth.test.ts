import { describe, expect, it } from "bun:test";

import {
  isLikelyHtmlOrCloudflareChallenge,
  normalizeXaiTokenPayload,
  readJsonBody,
  refreshXaiToken,
  validateXAIEndpoint,
  XAI_ACCESS_TOKEN_CLIENT_SKEW_MS,
  XAI_OAUTH_CLIENT_ID,
  XAI_OAUTH_DISCOVERY_URL,
  xaiOAuthDiscovery,
  xaiRefresh,
} from "./xaiOAuth";
import type { OAuthCredential } from "./oauthTokenStore";

const AUTH_ENDPOINT = "https://auth.x.ai/authorize";
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth/token";
const DEVICE_ENDPOINT = "https://auth.x.ai/oauth/device/code";

const TRUSTED_DISCOVERY = {
  authorization_endpoint: AUTH_ENDPOINT,
  token_endpoint: TOKEN_ENDPOINT,
  device_authorization_endpoint: DEVICE_ENDPOINT,
};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function htmlResponse(status = 403, body?: string) {
  return new Response(
    body ?? "<!DOCTYPE html><html><body>Just a moment... Cloudflare challenge-platform</body></html>",
    {
      status,
      headers: {
        "Content-Type": "text/html",
        "cf-mitigated": "challenge",
      },
    }
  );
}

describe("xaiOAuth pure seam", () => {
  describe("validateXAIEndpoint", () => {
    it("accepts trusted x.ai https endpoints", () => {
      expect(validateXAIEndpoint("https://auth.x.ai/oauth/token", "token_endpoint")).toBe(
        "https://auth.x.ai/oauth/token"
      );
      expect(validateXAIEndpoint("https://x.ai/oauth/authorize", "authorization_endpoint")).toBe(
        "https://x.ai/oauth/authorize"
      );
      expect(validateXAIEndpoint("https://api.x.ai/v1", "api_endpoint")).toBe(
        "https://api.x.ai/v1"
      );
      expect(validateXAIEndpoint("https://accounts.x.ai/device", "verification_uri")).toBe(
        "https://accounts.x.ai/device"
      );
    });

    it("rejects non-https URLs", () => {
      expect(() => validateXAIEndpoint("http://auth.x.ai/token", "token_endpoint")).toThrow(
        "Invalid xAI token_endpoint: http://auth.x.ai/token"
      );
    });

    it("rejects untrusted domains and spoof attempts", () => {
      expect(() =>
        validateXAIEndpoint("https://evil.example.com/oauth/token", "token_endpoint")
      ).toThrow(/Invalid xAI token_endpoint/);
      expect(() =>
        validateXAIEndpoint("https://x.ai.attacker.com/oauth/token", "token_endpoint")
      ).toThrow(/Invalid xAI token_endpoint/);
      expect(() =>
        validateXAIEndpoint("https://notx.ai/oauth/token", "token_endpoint")
      ).toThrow(/Invalid xAI token_endpoint/);
      expect(() =>
        validateXAIEndpoint("https://x.ai@attacker.com/oauth/token", "token_endpoint")
      ).toThrow(/Invalid xAI token_endpoint/);
    });

    it("rejects malformed URLs", () => {
      expect(() => validateXAIEndpoint("not-a-valid-url", "token_endpoint")).toThrow(
        "Invalid xAI token_endpoint: not-a-valid-url"
      );
    });
  });

  describe("isLikelyHtmlOrCloudflareChallenge", () => {
    it("detects cf-mitigated header", () => {
      const resp = new Response("", { headers: { "cf-mitigated": "challenge" } });
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "")).toBe(true);
    });

    it("detects text/html content-type", () => {
      const resp = new Response("", { headers: { "content-type": "text/html; charset=utf-8" } });
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "")).toBe(true);
    });

    it("detects html tags and Cloudflare challenge keywords in body", () => {
      const resp = new Response("", { headers: { "content-type": "application/json" } });
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "<!DOCTYPE html><html><body>Error</body></html>")).toBe(true);
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "<html><body>Blocked</body></html>")).toBe(true);
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "Please wait, attention required")).toBe(true);
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "Just a moment while we check your browser")).toBe(true);
      expect(isLikelyHtmlOrCloudflareChallenge(resp, "enable javascript and cookies to continue")).toBe(true);
    });

    it("returns false for regular json responses", () => {
      const resp = new Response("", { headers: { "content-type": "application/json" } });
      expect(isLikelyHtmlOrCloudflareChallenge(resp, '{"error":"invalid_grant"}')).toBe(false);
    });
  });

  describe("readJsonBody", () => {
    it("parses valid JSON object", async () => {
      const resp = jsonResponse({ key: "val" });
      const result = await readJsonBody(resp, "test context");
      expect(result).toEqual({ key: "val" });
    });

    it("returns empty object for empty body on ok response", async () => {
      const resp = new Response("", { status: 200 });
      const result = await readJsonBody(resp, "test context");
      expect(result).toEqual({});
    });

    it("throws for empty body on non-ok response", async () => {
      const resp = new Response("", { status: 500 });
      await expect(readJsonBody(resp, "test context")).rejects.toThrow(
        "test context failed (500): empty response body"
      );
    });

    it("throws for non-object JSON", async () => {
      const resp = jsonResponse([1, 2, 3]);
      await expect(readJsonBody(resp, "test context")).rejects.toThrow(
        "test context returned non-object JSON"
      );
    });

    it("formats HTML challenge error", async () => {
      const resp = htmlResponse(403);
      await expect(readJsonBody(resp, "test context")).rejects.toThrow(
        "test context failed (403): xAI returned an HTML/Cloudflare challenge instead of OAuth JSON"
      );
    });

    it("throws invalid JSON error for other malformed bodies", async () => {
      const resp = new Response("not-json {[[", { status: 200, headers: { "content-type": "application/json" } });
      await expect(readJsonBody(resp, "test context")).rejects.toThrow(
        /test context returned invalid JSON/
      );
    });
  });

  describe("xaiOAuthDiscovery", () => {
    it("successfully retrieves and validates discovery endpoints with DI fetch", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        expect(url).toBe(XAI_OAUTH_DISCOVERY_URL);
        return jsonResponse(TRUSTED_DISCOVERY);
      };

      const discovery = await xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch);
      expect(discovery).toEqual({
        authorization_endpoint: AUTH_ENDPOINT,
        token_endpoint: TOKEN_ENDPOINT,
        device_authorization_endpoint: DEVICE_ENDPOINT,
      });
    });

    it("validates device_authorization_endpoint when requireDeviceAuthorization is true", async () => {
      const fetchImpl = async () => jsonResponse(TRUSTED_DISCOVERY);
      const discovery = await xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch, {
        requireDeviceAuthorization: true,
      });
      expect(discovery.device_authorization_endpoint).toBe(DEVICE_ENDPOINT);
    });

    it("throws when requireDeviceAuthorization is true but endpoint is missing", async () => {
      const fetchImpl = async () =>
        jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: TOKEN_ENDPOINT,
        });

      await expect(
        xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch, { requireDeviceAuthorization: true })
      ).rejects.toThrow("xAI OIDC discovery response was missing device_authorization_endpoint.");
    });

    it("throws when discovery endpoints are missing required fields", async () => {
      const fetchImpl = async () =>
        jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
        });

      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        "xAI OIDC discovery response was missing required endpoints."
      );
    });

    it("rejects evil authorization endpoint in discovery", async () => {
      const fetchImpl = async () =>
        jsonResponse({
          authorization_endpoint: "https://evil.attacker.com/auth",
          token_endpoint: TOKEN_ENDPOINT,
        });

      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        /Invalid xAI authorization_endpoint/
      );
    });

    it("rejects evil token endpoint in discovery", async () => {
      const fetchImpl = async () =>
        jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: "https://evil.attacker.com/token",
        });

      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        /Invalid xAI token_endpoint/
      );
    });

    it("rejects evil device authorization endpoint in discovery", async () => {
      const fetchImpl = async () =>
        jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: TOKEN_ENDPOINT,
          device_authorization_endpoint: "https://evil.attacker.com/device",
        });

      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        /Invalid xAI device_authorization_endpoint/
      );
    });

    it("handles non-200 discovery response", async () => {
      const fetchImpl = async () => new Response("Server error", { status: 500 });
      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        "xAI OIDC discovery returned status 500."
      );
    });

    it("handles HTML/Cloudflare challenge on discovery", async () => {
      const fetchImpl = async () => htmlResponse(403);
      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        /xAI OIDC discovery failed \(403\): xAI returned an HTML\/Cloudflare challenge instead of OAuth JSON/
      );
    });

    it("handles network error on discovery", async () => {
      const fetchImpl = async () => {
        throw new Error("DNS resolution failed");
      };
      await expect(xaiOAuthDiscovery(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
        "xAI OIDC discovery failed: DNS resolution failed"
      );
    });
  });

  describe("normalizeXaiTokenPayload", () => {
    it("normalizes a complete token payload with DI clock", () => {
      const now = 1_000_000;
      const credential = normalizeXaiTokenPayload({
        payload: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          scope: "openid profile email",
          id_token: "test-id-token",
          account_id: "xai-acct-1",
        },
        now,
      });

      expect(credential).toEqual({
        provider: "xai",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: now + 3600 * 1000 - XAI_ACCESS_TOKEN_CLIENT_SKEW_MS,
        scope: "openid profile email",
        idToken: "test-id-token",
        accountId: "xai-acct-1",
        obtainedAt: now,
      });
    });

    it("preserves existing baseCredential fields when omitted in payload", () => {
      const now = 2_000_000;
      const baseCredential: OAuthCredential = {
        provider: "xai",
        accessToken: "old-access",
        refreshToken: "keep-refresh",
        expiresAt: 1_500_000,
        scope: "existing-scope",
        idToken: "existing-id-token",
        accountId: "existing-acct",
        metadata: { custom: "val" },
        obtainedAt: 1_000_000,
      };

      const result = normalizeXaiTokenPayload({
        payload: {
          access_token: "new-access",
          expires_in: 7200,
        },
        baseCredential,
        now,
      });

      expect(result.accessToken).toBe("new-access");
      expect(result.refreshToken).toBe("keep-refresh");
      expect(result.scope).toBe("existing-scope");
      expect(result.idToken).toBe("existing-id-token");
      expect(result.accountId).toBe("existing-acct");
      expect(result.metadata).toEqual({ custom: "val" });
      expect(result.expiresAt).toBe(now + 7200 * 1000 - XAI_ACCESS_TOKEN_CLIENT_SKEW_MS);
      expect(result.obtainedAt).toBe(now);
    });

    it("throws when access_token is missing or empty", () => {
      expect(() =>
        normalizeXaiTokenPayload({
          payload: { refresh_token: "ref", expires_in: 3600 },
        })
      ).toThrow("xAI OAuth token response missing access_token");

      expect(() =>
        normalizeXaiTokenPayload({
          payload: { access_token: "   ", expires_in: 3600 },
        })
      ).toThrow("xAI OAuth token response missing access_token");
    });

    it("throws when expires_in is missing or invalid", () => {
      expect(() =>
        normalizeXaiTokenPayload({
          payload: { access_token: "tok" },
        })
      ).toThrow("xAI OAuth token response missing expires_in");

      expect(() =>
        normalizeXaiTokenPayload({
          payload: { access_token: "tok", expires_in: "not-a-number" },
        })
      ).toThrow("xAI OAuth token response missing expires_in");
    });

    it("throws when requireRefreshToken is true and refresh_token is missing", () => {
      expect(() =>
        normalizeXaiTokenPayload({
          payload: { access_token: "tok", expires_in: 3600 },
          requireRefreshToken: true,
          context: "exchange",
        })
      ).toThrow("exchange missing refresh_token");
    });
  });

  describe("refreshXaiToken", () => {
    it("refreshes token successfully with DI fetch and clock", async () => {
      const calls: { url: string; body?: string }[] = [];
      const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        calls.push({ url: urlStr, body: init?.body ? String(init.body) : undefined });
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse(TRUSTED_DISCOVERY);
        }
        if (urlStr === TOKEN_ENDPOINT) {
          const bodyParams = new URLSearchParams(String(init?.body));
          expect(bodyParams.get("grant_type")).toBe("refresh_token");
          expect(bodyParams.get("client_id")).toBe(XAI_OAUTH_CLIENT_ID);
          expect(bodyParams.get("refresh_token")).toBe("old-refresh-token");
          return jsonResponse({
            access_token: "refreshed-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            scope: "openid profile email",
            id_token: "new-id-token",
          });
        }
        throw new Error(`Unexpected url: ${urlStr}`);
      };

      const fixedNow = 1_700_000_000_000;
      const initialCredential: OAuthCredential = {
        provider: "xai",
        accessToken: "stale-access-token",
        refreshToken: "old-refresh-token",
        expiresAt: fixedNow - 10_000,
        obtainedAt: fixedNow - 3_600_000,
      };

      const refreshed = await refreshXaiToken(initialCredential, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: () => fixedNow,
      });

      expect(refreshed.accessToken).toBe("refreshed-access-token");
      expect(refreshed.refreshToken).toBe("new-refresh-token");
      expect(refreshed.expiresAt).toBe(fixedNow + 3600 * 1000 - XAI_ACCESS_TOKEN_CLIENT_SKEW_MS);
      expect(refreshed.idToken).toBe("new-id-token");
      expect(refreshed.obtainedAt).toBe(fixedNow);
      expect(calls.length).toBe(2);
    });

    it("retains old refresh token when refresh response omits a new refresh_token", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse(TRUSTED_DISCOVERY);
        }
        if (urlStr === TOKEN_ENDPOINT) {
          return jsonResponse({
            access_token: "refreshed-access-token",
            expires_in: 1800,
          });
        }
        throw new Error(`Unexpected url: ${urlStr}`);
      };

      const initialCredential: OAuthCredential = {
        provider: "xai",
        accessToken: "stale-access-token",
        refreshToken: "persistent-refresh-token",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      const refreshed = await refreshXaiToken(initialCredential, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: () => 2000,
      });

      expect(refreshed.accessToken).toBe("refreshed-access-token");
      expect(refreshed.refreshToken).toBe("persistent-refresh-token");
    });

    it("throws when credential has no refresh_token", async () => {
      const credential: OAuthCredential = {
        provider: "xai",
        accessToken: "tok",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      await expect(refreshXaiToken(credential)).rejects.toThrow(
        "xAI credential has no refresh_token"
      );
    });

    it("handles HTTP error response with detail from xAI token endpoint", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse(TRUSTED_DISCOVERY);
        }
        if (urlStr === TOKEN_ENDPOINT) {
          return jsonResponse(
            { error: "invalid_grant", error_description: "Refresh token is expired or revoked" },
            400
          );
        }
        throw new Error(`Unexpected url: ${urlStr}`);
      };

      const credential: OAuthCredential = {
        provider: "xai",
        accessToken: "tok",
        refreshToken: "bad-ref",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      await expect(
        refreshXaiToken(credential, { fetchImpl: fetchImpl as unknown as typeof fetch })
      ).rejects.toThrow("xAI token refresh failed: 400 Refresh token is expired or revoked");
    });

    it("handles HTML/Cloudflare challenge during refresh", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse(TRUSTED_DISCOVERY);
        }
        if (urlStr === TOKEN_ENDPOINT) {
          return htmlResponse(403);
        }
        throw new Error(`Unexpected url: ${urlStr}`);
      };

      const credential: OAuthCredential = {
        provider: "xai",
        accessToken: "tok",
        refreshToken: "ref",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      await expect(
        refreshXaiToken(credential, { fetchImpl: fetchImpl as unknown as typeof fetch })
      ).rejects.toThrow(
        /xAI token refresh failed \(403\): xAI returned an HTML\/Cloudflare challenge instead of OAuth JSON/
      );
    });

    it("rejects evil token endpoint returned during discovery on refresh hot path", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse({
            authorization_endpoint: AUTH_ENDPOINT,
            token_endpoint: "https://evil.hacker.com/token",
          });
        }
        throw new Error(`Should not reach here: ${urlStr}`);
      };

      const credential: OAuthCredential = {
        provider: "xai",
        accessToken: "tok",
        refreshToken: "secret-refresh-token",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      await expect(
        refreshXaiToken(credential, { fetchImpl: fetchImpl as unknown as typeof fetch })
      ).rejects.toThrow(/Invalid xAI token_endpoint/);
    });

    it("handles network error during refresh request", async () => {
      const fetchImpl = async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr === XAI_OAUTH_DISCOVERY_URL) {
          return jsonResponse(TRUSTED_DISCOVERY);
        }
        if (urlStr === TOKEN_ENDPOINT) {
          throw new Error("Connection reset by peer");
        }
        throw new Error(`Unexpected url: ${urlStr}`);
      };

      const credential: OAuthCredential = {
        provider: "xai",
        accessToken: "tok",
        refreshToken: "ref",
        expiresAt: 1000,
        obtainedAt: 500,
      };

      await expect(
        refreshXaiToken(credential, { fetchImpl: fetchImpl as unknown as typeof fetch })
      ).rejects.toThrow("xAI token refresh failed: Connection reset by peer");
    });

    it("exports xaiRefresh alias matching refreshXaiToken", async () => {
      expect(xaiRefresh).toBe(refreshXaiToken);
    });
  });
});
