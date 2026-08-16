// packages/cli/oauth/flows/xai.test.ts
// Always dynamic-import with a cache-bust query so sibling tests that mock
// `./flows/xai` (Bun shares the module registry) cannot poison this file.
// authCommand.test.ts must also re-register the real module after its mocks
// (mock.restore() alone does not clear mock.module).
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const DISCOVERY_URL = "https://auth.x.ai/.well-known/openid-configuration";
const AUTH_ENDPOINT = "https://auth.x.ai/authorize";
const TOKEN_ENDPOINT = "https://auth.x.ai/oauth/token";
const DEVICE_ENDPOINT = "https://auth.x.ai/oauth/device/code";
const VERIFICATION_URI = "https://accounts.x.ai/device";
const VERIFICATION_URI_COMPLETE = "https://accounts.x.ai/device?user_code=ABCD-EFGH";

const TRUSTED_DISCOVERY = {
  authorization_endpoint: AUTH_ENDPOINT,
  token_endpoint: TOKEN_ENDPOINT,
  device_authorization_endpoint: DEVICE_ENDPOINT,
};

type XaiFlowModule = typeof import("./xai");

let loadSeq = 0;

async function loadXaiFlow(): Promise<XaiFlowModule> {
  // Clear spies; mock.restore() does not undo mock.module.
  mock.restore();
  loadSeq += 1;
  const mod = await import(`./xai.ts?real=${loadSeq}-${Date.now()}`);
  // Reinstall under both specifier shapes used by sibling suites so a sticky
  // mock.module("./flows/xai") from authCommand.test.ts cannot win later.
  mock.module("./xai", () => mod);
  mock.module("../flows/xai", () => mod);
  return mod;
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function htmlResponse(status = 403) {
  return new Response(
    "<!DOCTYPE html><html><body>Just a moment... Cloudflare challenge-platform</body></html>",
    {
      status,
      headers: {
        "Content-Type": "text/html",
        "cf-mitigated": "challenge",
      },
    }
  );
}

function plainMalformedResponse(status = 200) {
  return new Response("not-json-at-all {{{", {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("validateXAIEndpoint", () => {
  let validateXAIEndpoint: XaiFlowModule["validateXAIEndpoint"];

  beforeEach(async () => {
    ({ validateXAIEndpoint } = await loadXaiFlow());
  });

  afterEach(() => {
    mock.restore();
  });

  it("accepts trusted x.ai https hosts", () => {
    expect(validateXAIEndpoint(TOKEN_ENDPOINT, "token_endpoint")).toBe(TOKEN_ENDPOINT);
    expect(validateXAIEndpoint(DEVICE_ENDPOINT, "device_authorization_endpoint")).toBe(
      DEVICE_ENDPOINT
    );
  });

  it("rejects non-https and untrusted hosts", () => {
    expect(() => validateXAIEndpoint("http://auth.x.ai/token", "token_endpoint")).toThrow(
      /Invalid xAI/
    );
    expect(() =>
      validateXAIEndpoint("https://evil.example/token", "token_endpoint")
    ).toThrow(/Invalid xAI/);
  });
});

describe("runXaiOAuthDeviceCode", () => {
  let runXaiOAuthDeviceCode: XaiFlowModule["runXaiOAuthDeviceCode"];

  beforeEach(async () => {
    ({ runXaiOAuthDeviceCode } = await loadXaiFlow());
  });

  afterEach(() => {
    mock.restore();
  });

  it("completes trusted discovery → device start → pending → success", async () => {
    let pollCount = 0;
    const fetches: Array<{ url: string; body?: string }> = [];
    let clock = 1_000_000;

    const fetchImpl = async (url: string, init?: RequestInit) => {
      const body =
        typeof init?.body === "string"
          ? init.body
          : init?.body instanceof URLSearchParams
            ? init.body.toString()
            : init?.body
              ? String(init.body)
              : undefined;
      fetches.push({ url, body });

      if (url === DISCOVERY_URL) {
        return jsonResponse(TRUSTED_DISCOVERY);
      }
      if (url === DEVICE_ENDPOINT) {
        expect(init?.method).toBe("POST");
        const params = new URLSearchParams(body);
        expect(params.get("client_id")).toBe("b1a00492-073a-47ea-816f-4c329264a828");
        expect(params.get("scope")).toContain("offline_access");
        return jsonResponse({
          device_code: "device-secret-do-not-log",
          user_code: "ABCD-EFGH",
          verification_uri: VERIFICATION_URI,
          verification_uri_complete: VERIFICATION_URI_COMPLETE,
          expires_in: 600,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        pollCount += 1;
        const params = new URLSearchParams(body);
        expect(params.get("grant_type")).toBe(
          "urn:ietf:params:oauth:grant-type:device_code"
        );
        expect(params.get("device_code")).toBe("device-secret-do-not-log");
        if (pollCount === 1) {
          return jsonResponse({ error: "authorization_pending" }, 400);
        }
        return jsonResponse({
          access_token: "access-token-value",
          refresh_token: "refresh-token-value",
          expires_in: 3600,
          scope: "openid profile email offline_access",
          id_token: "id-token-value",
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const logs: string[] = [];
    const sleeps: number[] = [];
    const credential = await runXaiOAuthDeviceCode({
      fetchImpl: fetchImpl as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      now: () => clock,
      output: { log: (msg: string) => logs.push(String(msg)) },
      error: { error: () => {} },
    });

    expect(credential.provider).toBe("xai");
    expect(credential.accessToken).toBe("access-token-value");
    expect(credential.refreshToken).toBe("refresh-token-value");
    expect(credential.idToken).toBe("id-token-value");
    expect(typeof credential.expiresAt).toBe("number");
    expect(pollCount).toBe(2);
    expect(sleeps.length).toBeGreaterThanOrEqual(2);

    // UX shows URI + user code; never secrets
    const joined = logs.join("\n");
    expect(joined).toContain(VERIFICATION_URI);
    expect(joined).toContain("ABCD-EFGH");
    expect(joined).toContain(VERIFICATION_URI_COMPLETE);
    expect(joined).not.toContain("access-token-value");
    expect(joined).not.toContain("refresh-token-value");
    expect(joined).not.toContain("device-secret-do-not-log");

    // Discovery + device + polls only hit trusted hosts
    for (const call of fetches) {
      expect(call.url.startsWith("https://auth.x.ai")).toBe(true);
    }
  });

  it("increases interval on slow_down then succeeds", async () => {
    let pollCount = 0;
    let clock = 0;
    const sleeps: number[] = [];

    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 120,
          interval: 2,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        pollCount += 1;
        if (pollCount === 1) {
          return jsonResponse({ error: "slow_down" }, 400);
        }
        return jsonResponse({
          access_token: "a",
          refresh_token: "r",
          expires_in: 100,
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const credential = await runXaiOAuthDeviceCode({
      fetchImpl: fetchImpl as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      now: () => clock,
      output: { log: () => {} },
      error: { error: () => {} },
    });

    expect(credential.accessToken).toBe("a");
    // first wait ~2s, after slow_down interval becomes 2s+5s=7s
    expect(sleeps[0]).toBe(2000);
    expect(sleeps[1]).toBe(7000);
  });

  it("throws on access_denied", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 60,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse(
          { error: "access_denied", error_description: "user denied" },
          400
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/denied/i);
  });

  it("throws on expired_token", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 60,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse({ error: "expired_token" }, 400);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/expired/i);
  });

  it("throws when device authorization times out", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 2,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return jsonResponse({ error: "authorization_pending" }, 400);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/timed out/i);
  });

  it("throws on Cloudflare HTML challenge instead of OAuth JSON", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 60,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return htmlResponse(403);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/Cloudflare|HTML/i);
  });

  it("throws on malformed non-JSON token poll body", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 60,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        return plainMalformedResponse(200);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/invalid JSON/i);
  });

  it("throws when token poll aborts or times out", async () => {
    let clock = 0;
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) return jsonResponse(TRUSTED_DISCOVERY);
      if (url === DEVICE_ENDPOINT) {
        return jsonResponse({
          device_code: "dc",
          user_code: "CODE",
          verification_uri: VERIFICATION_URI,
          expires_in: 60,
          interval: 1,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        sleep: async (ms) => {
          clock += ms;
        },
        now: () => clock,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/aborted or timed out/i);
  });

  it("rejects discovery without device_authorization_endpoint", async () => {
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) {
        return jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: TOKEN_ENDPOINT,
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/device_authorization_endpoint/);
  });

  it("rejects untrusted device endpoint from discovery", async () => {
    const fetchImpl = async (url: string) => {
      if (url === DISCOVERY_URL) {
        return jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: TOKEN_ENDPOINT,
          device_authorization_endpoint: "https://evil.example/device",
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await expect(
      runXaiOAuthDeviceCode({
        fetchImpl: fetchImpl as typeof fetch,
        output: { log: () => {} },
        error: { error: () => {} },
      })
    ).rejects.toThrow(/Invalid xAI device_authorization_endpoint/);
  });
});

describe("runXaiOAuthLogin (loopback regression)", () => {
  afterEach(() => {
    mock.restore();
  });

  it("still uses loopback PKCE (callback server + authorization_code grant)", async () => {
    mock.restore();
    mock.module("../callback-server", () => ({
      startCallbackServer: async () => ({
        waitForCode: async () => ({ code: "auth-code-123", state: "st" }),
        close: async () => {},
      }),
    }));
    mock.module("../pkce", () => ({
      generatePkcePair: async () => ({
        verifier: "verifier-abc",
        challenge: "challenge-xyz",
        method: "S256" as const,
      }),
    }));

    // Re-import after mocks so the module sees mocked deps.
    const { runXaiOAuthLogin: login } = await import(
      `./xai.ts?loopback=${Date.now()}-${++loadSeq}`
    );

    const fetches: Array<{ url: string; body?: string }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      const body =
        typeof init?.body === "string"
          ? init.body
          : init?.body instanceof URLSearchParams
            ? init.body.toString()
            : undefined;
      fetches.push({ url, body });
      if (url === DISCOVERY_URL) {
        return jsonResponse({
          authorization_endpoint: AUTH_ENDPOINT,
          token_endpoint: TOKEN_ENDPOINT,
        });
      }
      if (url === TOKEN_ENDPOINT) {
        const params = new URLSearchParams(body);
        expect(params.get("grant_type")).toBe("authorization_code");
        expect(params.get("code")).toBe("auth-code-123");
        expect(params.get("code_verifier")).toBe("verifier-abc");
        expect(params.get("redirect_uri")).toContain("127.0.0.1:56121");
        return jsonResponse({
          access_token: "loop-access",
          refresh_token: "loop-refresh",
          expires_in: 3600,
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const logs: string[] = [];
    const credential = await login({
      fetchImpl: fetchImpl as typeof fetch,
      openBrowser: async () => true,
      output: { log: (msg: string) => logs.push(String(msg)) },
      error: { error: () => {} },
      now: () => 1_700_000_000_000,
    });

    expect(credential.provider).toBe("xai");
    expect(credential.accessToken).toBe("loop-access");
    expect(credential.refreshToken).toBe("loop-refresh");
    expect(logs.some((l) => l.includes("Open the following URL"))).toBe(true);
    // No device-code grant on the loopback path
    expect(
      fetches.some((f) => f.body?.includes("urn:ietf:params:oauth:grant-type:device_code"))
    ).toBe(false);
  });
});
