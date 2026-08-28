import { describe, expect, test } from "bun:test";

import { pollCursorAuth, runCursorOAuthLogin, cursorRefresh } from "./cursor";
import type { OAuthCredential } from "../types";

function makeFakeJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("Cursor OAuth", () => {
  test("pollCursorAuth succeeds when poll returns tokens", async () => {
    let calls = 0;
    const fetchImpl = (async (url: string | URL | Request) => {
      calls++;
      const u = new URL(String(url));
      expect(u.origin + u.pathname).toBe("https://api2.cursor.sh/auth/poll");
      expect(u.searchParams.get("uuid")).toBe("uuid-1");
      expect(u.searchParams.get("verifier")).toBe("verifier-1");
      if (calls < 2) {
        return new Response("{}", { status: 404 });
      }
      return new Response(
        JSON.stringify({ accessToken: "access-1", refreshToken: "refresh-1" }),
        { status: 200 }
      );
    }) as typeof fetch;

    const result = await pollCursorAuth("uuid-1", "verifier-1", {
      fetchImpl,
      sleepFn: async () => {},
    });
    expect(result).toEqual({ accessToken: "access-1", refreshToken: "refresh-1" });
    expect(calls).toBe(2);
  });

  test("pollCursorAuth throws on timeout after max attempts", async () => {
    const fetchImpl = (async () =>
      new Response("{}", { status: 404 })) as typeof fetch;
    await expect(
      pollCursorAuth("uuid-2", "verifier-2", {
        fetchImpl,
        sleepFn: async () => {},
      })
    ).rejects.toThrow("timed out");
  });

  test("pollCursorAuth throws after consecutive non-404 errors", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return new Response("error", { status: 500 });
    }) as typeof fetch;
    await expect(
      pollCursorAuth("uuid-3", "verifier-3", {
        fetchImpl,
        sleepFn: async () => {},
      })
    ).rejects.toThrow("Cursor auth poll failed: 500");
    // 3 consecutive errors triggers throw
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  test("runCursorOAuthLogin returns a credential with correct provider", async () => {
    const jwt = makeFakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ accessToken: jwt, refreshToken: "refresh-1" }),
        { status: 200 }
      )) as typeof fetch;

    const logs: string[] = [];
    const credential = await runCursorOAuthLogin({
      fetchImpl,
      openBrowser: async () => true,
      output: { log: (msg: unknown) => logs.push(String(msg)) },
      sleep: async () => {},
      now: () => 1_000_000,
    });

    expect(credential.provider).toBe("cursor");
    expect(credential.accessToken).toBe(jwt);
    expect(credential.refreshToken).toBe("refresh-1");
    expect(credential.obtainedAt).toBe(1_000_000);
    expect(logs.some((l) => l.includes("cursor.com/loginDeepControl"))).toBe(true);
  });

  test("runCursorOAuthLogin works without a browser (--no-browser style)", async () => {
    const jwt = makeFakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ accessToken: jwt, refreshToken: "refresh-1" }),
        { status: 200 }
      )) as typeof fetch;

    const credential = await runCursorOAuthLogin({
      fetchImpl,
      openBrowser: undefined,
      output: { log: () => {} },
      sleep: async () => {},
    });
    expect(credential.provider).toBe("cursor");
  });

  test("cursorRefresh exchanges refresh token for new access token", async () => {
    const newJwt = makeFakeJwt(Math.floor(Date.now() / 1000) + 7200);
    let postedAuth: string | undefined;
    let postedBody: string | undefined;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      postedAuth = (init?.headers as Record<string, string>)["Authorization"];
      postedBody = String(init?.body);
      return new Response(
        JSON.stringify({ accessToken: newJwt, refreshToken: "new-refresh" }),
        { status: 200 }
      );
    }) as typeof fetch;

    const oldCred: OAuthCredential = {
      provider: "cursor",
      accessToken: "old-access",
      refreshToken: "old-refresh",
      obtainedAt: 0,
    };

    const refreshed = await cursorRefresh(oldCred, { fetchImpl });
    expect(refreshed.accessToken).toBe(newJwt);
    expect(refreshed.refreshToken).toBe("new-refresh");
    expect(postedAuth).toBe("Bearer old-refresh");
    expect(postedBody).toBe("{}");
  });

  test("cursorRefresh preserves old refresh token when response omits it", async () => {
    const newJwt = makeFakeJwt(Math.floor(Date.now() / 1000) + 7200);
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ accessToken: newJwt }),
        { status: 200 }
      )) as typeof fetch;

    const oldCred: OAuthCredential = {
      provider: "cursor",
      accessToken: "old-access",
      refreshToken: "keep-refresh",
      obtainedAt: 0,
    };

    const refreshed = await cursorRefresh(oldCred, { fetchImpl });
    expect(refreshed.accessToken).toBe(newJwt);
    expect(refreshed.refreshToken).toBe("keep-refresh");
  });

  test("cursorRefresh throws when response is not ok", async () => {
    const fetchImpl = (async () =>
      new Response("invalid token", { status: 401 })) as typeof fetch;

    await expect(
      cursorRefresh(
        { provider: "cursor", accessToken: "old", refreshToken: "r", obtainedAt: 0 },
        { fetchImpl }
      )
    ).rejects.toThrow("Cursor token refresh failed: 401");
  });

  test("cursorRefresh throws when credential has no refresh_token", async () => {
    await expect(
      cursorRefresh(
        { provider: "cursor", accessToken: "old", obtainedAt: 0 } as OAuthCredential,
        { fetchImpl: fetch }
      )
    ).rejects.toThrow("no refresh_token");
  });
});