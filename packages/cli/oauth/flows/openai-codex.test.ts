import { describe, expect, test } from "bun:test";

import {
  OPENAI_CODEX_CLIENT_ID,
  OPENAI_CODEX_DEVICE_AUTH_URL,
  OPENAI_CODEX_DEVICE_REDIRECT_URI,
  OPENAI_CODEX_DEVICE_TOKEN_URL,
  OPENAI_CODEX_TOKEN_URL,
  exchangeCodexAuthorizationCode,
  openAiCodexFlowController,
  pollDeviceCodeToken,
  refreshOpenAiCodexToken,
  startDeviceCodeFlow,
} from "./openai-codex";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("OpenAI Codex OAuth CLI Flow", () => {
  test("exports expected flow controller", () => {
    expect(typeof openAiCodexFlowController.runDeviceCode).toBe("function");
    expect(typeof openAiCodexFlowController.runBrowserPkce).toBe("function");
  });

  test("startDeviceCodeFlow requests user_code and device_auth_id", async () => {
    let requestedUrl = "";
    let requestBody: unknown;

    const fakeFetch: typeof fetch = async (url, init) => {
      requestedUrl = String(url);
      requestBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          device_auth_id: "dev-auth-123",
          user_code: "ABCD-EFGH",
          interval: 5,
        }),
        { status: 200 }
      );
    };

    const result = await startDeviceCodeFlow({ fetchImpl: fakeFetch });
    expect(requestedUrl).toBe(OPENAI_CODEX_DEVICE_AUTH_URL);
    expect(requestBody).toEqual({ client_id: OPENAI_CODEX_CLIENT_ID });
    expect(result).toEqual({
      deviceAuthId: "dev-auth-123",
      userCode: "ABCD-EFGH",
      intervalMs: 8000,
    });
  });

  test("pollDeviceCodeToken polls until authorization_code is returned", async () => {
    let callCount = 0;
    const fakeFetch: typeof fetch = async (url, init) => {
      callCount++;
      if (callCount < 2) {
        return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 403 });
      }
      return new Response(
        JSON.stringify({
          authorization_code: "auth-code-xyz",
          code_verifier: "verifier-xyz",
        }),
        { status: 200 }
      );
    };

    let pendingCalled = false;
    const result = await pollDeviceCodeToken({
      deviceAuthId: "dev-auth-123",
      userCode: "ABCD-EFGH",
      deps: { fetchImpl: fakeFetch },
      sleep: async () => {},
      onPending: () => {
        pendingCalled = true;
      },
    });

    expect(callCount).toBe(2);
    expect(pendingCalled).toBe(true);
    expect(result).toEqual({
      authorizationCode: "auth-code-xyz",
      codeVerifier: "verifier-xyz",
    });
  });

  test("exchangeCodexAuthorizationCode exchanges code for tokens and normalizes credential", async () => {
    let postBody = "";
    const now = 1_000_000;
    const accessToken = makeJwt({
      "https://api.openai.com/auth": { chatgpt_account_id: "acct-openai-99" },
      email: "user@example.com",
    });

    const fakeFetch: typeof fetch = async (url, init) => {
      postBody = String(init?.body);
      return new Response(
        JSON.stringify({
          access_token: accessToken,
          refresh_token: "refresh-99",
          expires_in: 3600,
          scope: "openid profile email",
        }),
        { status: 200 }
      );
    };

    const credential = await exchangeCodexAuthorizationCode({
      code: "auth-code-xyz",
      codeVerifier: "verifier-xyz",
      redirectUri: OPENAI_CODEX_DEVICE_REDIRECT_URI,
      deps: { fetchImpl: fakeFetch },
      now: () => now,
    });

    const params = new URLSearchParams(postBody);
    expect(params.get("grant_type")).toBe("authorization_code");
    expect(params.get("code")).toBe("auth-code-xyz");
    expect(params.get("code_verifier")).toBe("verifier-xyz");
    expect(params.get("redirect_uri")).toBe(OPENAI_CODEX_DEVICE_REDIRECT_URI);

    expect(credential).toEqual({
      provider: "chatgpt",
      accessToken,
      refreshToken: "refresh-99",
      expiresAt: now + 3600 * 1000 - 5 * 60 * 1000,
      obtainedAt: now,
      scope: "openid profile email",
      accountId: "acct-openai-99",
      metadata: {
        email: "user@example.com",
      },
    });
  });

  test("refreshOpenAiCodexToken delegates to runtime seam", async () => {
    const now = 2_000_000;
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: "refreshed-tok",
          expires_in: 1800,
        }),
        { status: 200 }
      );

    const result = await refreshOpenAiCodexToken(
      {
        provider: "chatgpt",
        accessToken: "old-tok",
        refreshToken: "ref-tok",
        obtainedAt: 1000,
      },
      {
        fetchImpl: fakeFetch,
        now: () => now,
      }
    );

    expect(result.accessToken).toBe("refreshed-tok");
    expect(result.refreshToken).toBe("ref-tok");
    expect(result.expiresAt).toBe(now + 1800 * 1000 - 5 * 60 * 1000);
  });
});
