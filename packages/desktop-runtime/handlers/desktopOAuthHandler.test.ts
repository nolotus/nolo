import { describe, expect, test } from "bun:test";
import { installConnectionPeerFixture } from "../testHelpers/connectionPeerFixture";
import type {
  OAuthCredential,
  OAuthProvider,
  OAuthTokenStore,
} from "../../agent-runtime/oauthTokenStore";
import {
  handleDesktopOAuthDelete,
  handleDesktopOAuthStartPost,
  handleDesktopOAuthStatusGet,
} from "./desktopOAuthHandler";

const request = (action: "start" | "status", provider = "claude") =>
  new Request(`http://127.0.0.1/api/desktop/oauth/${provider}/${action}`, {
    method: action === "start" ? "POST" : "GET",
    headers: { "Sec-Fetch-Site": "same-origin" },
  });

function memoryStore(initial?: OAuthCredential): OAuthTokenStore {
  const values = new Map<OAuthProvider, OAuthCredential>();
  if (initial) values.set(initial.provider, initial);
  return {
    read: provider => values.get(provider) ?? null,
    write: (provider, credential) => values.set(provider, credential),
    remove: provider => values.delete(provider),
  };
}

const credential: OAuthCredential = {
  provider: "claude",
  accessToken: "secret-access-token",
  refreshToken: "secret-refresh-token",
  expiresAt: 123456,
  accountId: "account-1",
  metadata: { email: "person@example.com" },
  obtainedAt: 100,
};

describe("desktop OAuth handler", () => {
  installConnectionPeerFixture();
  test("is unavailable outside Desktop and rejects untrusted callers", async () => {
    expect(
      (await handleDesktopOAuthStatusGet(request("status"), { env: {} })).status,
    ).toBe(404);
    const bare = new Request(
      "http://127.0.0.1/api/desktop/oauth/claude/status",
    );
    expect(
      (await handleDesktopOAuthStatusGet(bare, {
        env: { NOLO_DESKTOP: "1" },
      })).status,
    ).toBe(403);
  });

  test("returns sanitized local connection status", async () => {
    const response = await handleDesktopOAuthStatusGet(request("status"), {
      env: { NOLO_DESKTOP: "1" },
      tokenStore: memoryStore(credential),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      connected: true,
      email: "person@example.com",
      accountId: "account-1",
      expiresAt: 123456,
    });
    expect(JSON.stringify(body)).not.toContain("secret-");
  });

  test("runs Claude login, saves locally, and never returns tokens", async () => {
    const store = memoryStore();
    const response = await handleDesktopOAuthStartPost(request("start"), {
      env: { NOLO_DESKTOP: "1" },
      tokenStore: store,
      runLogin: async () => credential,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(store.read("claude")?.accessToken).toBe("secret-access-token");
    expect(JSON.stringify(body)).not.toContain("secret-");
  });

  test("fails closed for providers not enabled in the Desktop UI", async () => {
    const response = await handleDesktopOAuthStatusGet(
      request("status", "cloudflare"),
      { env: { NOLO_DESKTOP: "1" }, tokenStore: memoryStore() },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unsupported_provider" });
  });

  test("disconnect removes only the selected local credential", async () => {
    const store = memoryStore(credential);
    const response = await handleDesktopOAuthDelete(
      new Request("http://127.0.0.1/api/desktop/oauth/claude", {
        method: "DELETE",
        headers: { "Sec-Fetch-Site": "same-origin" },
      }),
      { env: { NOLO_DESKTOP: "1" }, tokenStore: store },
    );
    expect(response.status).toBe(200);
    expect(store.read("claude")).toBeNull();
  });
});
