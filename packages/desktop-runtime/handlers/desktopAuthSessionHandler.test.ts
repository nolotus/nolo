import { describe, expect, test } from "bun:test";
import { installConnectionPeerFixture } from "../testHelpers/connectionPeerFixture";
import { handleDesktopAuthSessionGet } from "./desktopAuthSessionHandler";

function trustedDesktopRequest(
  headers: Record<string, string> = { "Sec-Fetch-Site": "same-origin" },
  url = "http://127.0.0.1/api/desktop/auth/session",
) {
  return new Request(url, { method: "GET", headers });
}

describe("desktop auth session handler", () => {
  installConnectionPeerFixture();
  test("is unavailable outside desktop runtime", async () => {
    const response = await handleDesktopAuthSessionGet(
      trustedDesktopRequest(),
      { env: {} as NodeJS.ProcessEnv }
    );

    expect(response.status).toBe(404);
  });

  test("returns the current local profile token for trusted same-origin callers", async () => {
    const response = await handleDesktopAuthSessionGet(
      trustedDesktopRequest(),
      {
        env: { NOLO_DESKTOP: "1" } as NodeJS.ProcessEnv,
        validateAuthToken: async () => true,
        loadProfile: () => ({
          currentProfile: "default",
          profiles: {
            default: {
              serverUrl: "https://nolo.chat",
              authToken: "token-abc",
            },
          },
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      tokens: ["token-abc"],
      serverUrl: "https://nolo.chat",
      profile: "default",
    });
  });

  test("rejects bare curl (no browser provenance) before reading profile", async () => {
    let loadProfileCalls = 0;
    const secret = "token-must-not-leak";

    const response = await handleDesktopAuthSessionGet(
      new Request("http://127.0.0.1/api/desktop/auth/session"),
      {
        env: { NOLO_DESKTOP: "1" } as NodeJS.ProcessEnv,
        loadProfile: () => {
          loadProfileCalls += 1;
          return {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                authToken: secret,
              },
            },
          };
        },
      }
    );

    expect(response.status).toBe(403);
    expect(loadProfileCalls).toBe(0);
    const body = await response.json();
    expect(body.error).toContain("same-origin");
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(body.tokens).toBeUndefined();
    expect(body.profile).toBeUndefined();
    expect(body.serverUrl).toBeUndefined();
  });

  test("rejects cross-origin Origin before reading profile", async () => {
    let loadProfileCalls = 0;
    const secret = "token-cross-origin-blocked";

    const response = await handleDesktopAuthSessionGet(
      trustedDesktopRequest({ Origin: "https://evil.example" }),
      {
        env: { NOLO_DESKTOP: "1" } as NodeJS.ProcessEnv,
        loadProfile: () => {
          loadProfileCalls += 1;
          return {
            currentProfile: "default",
            profiles: {
              default: {
                serverUrl: "https://nolo.chat",
                authToken: secret,
              },
            },
          };
        },
      }
    );

    expect(response.status).toBe(403);
    expect(loadProfileCalls).toBe(0);
    const body = await response.json();
    expect(body.error).toContain("same-origin");
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(body.tokens).toBeUndefined();
  });

  test("does not return an invalid local profile token inside desktop runtime", async () => {
    const response = await handleDesktopAuthSessionGet(
      trustedDesktopRequest(),
      {
        env: { NOLO_DESKTOP: "1" } as NodeJS.ProcessEnv,
        validateAuthToken: async () => false,
        loadProfile: () => ({
          currentProfile: "default",
          profiles: {
            default: {
              serverUrl: "https://nolo.chat",
              authToken: "opaque-profile-token",
            },
          },
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      tokens: [],
      serverUrl: "https://nolo.chat",
      profile: "default",
      error: "invalid_profile_token",
    });
  });

  test("returns an empty token list when no profile exists", async () => {
    const response = await handleDesktopAuthSessionGet(
      trustedDesktopRequest(),
      {
        env: { NOLO_DESKTOP: "1" } as NodeJS.ProcessEnv,
        loadProfile: () => null,
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, tokens: [] });
  });
});
