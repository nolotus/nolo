import { describe, expect, test } from "bun:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import {
  ANTHROPIC_OAUTH_CLIENT_ID,
  ANTHROPIC_OAUTH_REDIRECT_URI,
  anthropicRefresh,
  buildAnthropicAuthorizeUrl,
  exchangeAnthropicAuthorizationCode,
  refreshAnthropicToken,
  runAnthropicOAuthLogin,
} from "./anthropic";

describe("Claude OAuth", () => {
  test("builds a PKCE authorization URL", () => {
    const url = new URL(buildAnthropicAuthorizeUrl({
      state: "state-1",
      challenge: "challenge-1",
    }));
    expect(url.origin).toBe("https://claude.ai");
    expect(url.searchParams.get("client_id")).toBe(ANTHROPIC_OAUTH_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(ANTHROPIC_OAUTH_REDIRECT_URI);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-1");
  });

  test("exchanges and maps the authorization code without leaking tokens", async () => {
    let posted: Record<string, unknown> = {};
    const credential = await exchangeAnthropicAuthorizationCode({
      code: "auth-code",
      state: "state-1",
      verifier: "verifier-1",
      now: () => 1_000_000,
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        posted = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          access_token: "access-secret",
          refresh_token: "refresh-secret",
          expires_in: 3600,
          scope: "user:inference",
          account: { uuid: "acct-1", email_address: "user@example.com" },
          organization: { uuid: "org-1", name: "Example" },
        }), { status: 200 });
      }) as typeof fetch,
    });
    expect(posted).toMatchObject({
      code: "auth-code",
      state: "state-1",
      code_verifier: "verifier-1",
    });
    expect(credential).toMatchObject({
      provider: "claude",
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      accountId: "acct-1",
      metadata: { email: "user@example.com", organizationId: "org-1" },
    });
    expect(credential.expiresAt).toBe(4_300_000);
  });

  test("refresh preserves the old refresh token when Anthropic omits rotation", async () => {
    const credential = await anthropicRefresh(
      {
        provider: "claude",
        accessToken: "old-access",
        refreshToken: "keep-refresh",
        obtainedAt: 1,
      },
      {
        now: () => 2_000_000,
        fetchImpl: (async () =>
          new Response(JSON.stringify({
            access_token: "new-access",
            expires_in: 3600,
          }))) as unknown as typeof fetch,
      },
    );
    expect(credential.accessToken).toBe("new-access");
    expect(credential.refreshToken).toBe("keep-refresh");
    expect(credential.expiresAt).toBe(5_300_000);
  });

  test("refreshAnthropicToken wrapper delegates to pure refresh", async () => {
    expect(refreshAnthropicToken).toBe(anthropicRefresh);
    const credential = await refreshAnthropicToken(
      {
        provider: "claude",
        accessToken: "old-access",
        refreshToken: "keep-refresh",
        obtainedAt: 1,
      },
      {
        now: () => 3_000_000,
        fetchImpl: (async () =>
          new Response(JSON.stringify({
            access_token: "refreshed-token",
            expires_in: 1800,
          }))) as unknown as typeof fetch,
      },
    );
    expect(credential.accessToken).toBe("refreshed-token");
    expect(credential.expiresAt).toBe(3_000_000 + 1800 * 1000 - 5 * 60 * 1000);
  });

  test("login advertises the actual fallback port when the preferred port is busy", async () => {
    // Other OAuth suites use sticky mock.module overrides for the shared
    // callback module, so inject a cache-busted real implementation here.
    const callbackServer = await import(
      `../callback-server.ts?anthropic-real=${Date.now()}`
    );
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const occupiedPort = (blocker.address() as AddressInfo).port;
    let advertisedPort = occupiedPort;
    const logs: string[] = [];

    try {
      const credential = await runAnthropicOAuthLogin({
        callbackPort: occupiedPort,
        callbackServerFactory: callbackServer.startCallbackServer,
        output: { log: (message: unknown) => logs.push(String(message)) },
        openBrowser: async (authorizationUrl: string) => {
          const authorize = new URL(authorizationUrl);
          const redirect = new URL(String(authorize.searchParams.get("redirect_uri")));
          advertisedPort = Number(redirect.port);
          redirect.searchParams.set("code", "auth-code");
          redirect.searchParams.set("state", String(authorize.searchParams.get("state")));
          const response = await fetch(redirect);
          expect(response.status).toBe(200);
          return true;
        },
        fetchImpl: (async () =>
          new Response(JSON.stringify({
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            expires_in: 3600,
          }))) as unknown as typeof fetch,
      });
      expect(credential.provider).toBe("claude");
      expect(advertisedPort).not.toBe(occupiedPort);
      expect(logs.some((line) => line.includes("using callback port"))).toBe(true);
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });
});
