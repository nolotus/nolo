// packages/cli/oauth/authCommand.test.ts
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import type {
  OAuthCredential,
  OAuthProvider,
  OAuthTokenStore,
} from "../../agent-runtime/oauthTokenStore";
import type { AuthProviderCommandDeps } from "./authCommand";

// Mock OAuth flows + fetch. Pass a fresh in-memory OAuthTokenStore via deps so
// auth tests never mock.module("./token-store") (which poisons the module registry).

// Value-copy snapshots captured before any mock.module in this file.
// Bun's mock.restore() does not clear mock.module overrides; afterEach must
// re-register these so sibling suites (flows/xai.test.ts) see the real surface.
const realXaiFlow = { ...(await import("./flows/xai")) };
const realOpenAiCodexFlow = { ...(await import("./flows/openai-codex")) };
const realAntigravityFlow = { ...(await import("./flows/antigravity")) };

const FAKE_CREDENTIAL: OAuthCredential = {
  provider: "xai",
  accessToken: "fake-access-token",
  refreshToken: "fake-refresh-token",
  expiresAt: Date.now() + 3600_000,
  scope: "openid profile",
  accountId: "acc-123",
  metadata: { email: "test@example.com" },
  obtainedAt: Date.now(),
};

let moduleVersion = 0;
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
let stubFetchResponse: { ok: boolean; status: number; body?: any } = {
  ok: true,
  status: 200,
  body: { ok: true, syncedAt: Date.now() },
};
let xaiFlowCalls: Array<"loopback" | "device-code"> = [];

const originalEnv = {
  NOLO_SERVER: process.env.NOLO_SERVER,
  AUTH_TOKEN: process.env.AUTH_TOKEN,
};

function restoreFlowModuleMocks() {
  mock.module("./flows/xai", () => realXaiFlow);
  mock.module("./flows/openai-codex", () => realOpenAiCodexFlow);
  mock.module("./flows/antigravity", () => realAntigravityFlow);
}

function createMemoryTokenStore(
  seed?: Partial<Record<OAuthProvider, OAuthCredential>>
): OAuthTokenStore {
  const memory = new Map<OAuthProvider, OAuthCredential>();
  if (seed) {
    for (const [provider, credential] of Object.entries(seed) as Array<
      [OAuthProvider, OAuthCredential]
    >) {
      memory.set(provider, credential);
    }
  }
  return {
    read: (provider) => memory.get(provider) ?? null,
    write: (provider, credential) => {
      memory.set(provider, credential);
    },
    remove: (provider) => {
      memory.delete(provider);
    },
  };
}

function withTokenStore(
  overrides: AuthProviderCommandDeps = {}
): AuthProviderCommandDeps {
  return {
    tokenStore: createMemoryTokenStore(),
    ...overrides,
  };
}

function loadAuthCommand() {
  moduleVersion++;
  xaiFlowCalls = [];

  // Mock the OAuth flows to return our fake credential immediately.
  // Spread the real public surface so concurrent importers never see a partial
  // mock (Bun shares the module registry across test files).
  mock.module("./flows/xai", () => ({
    ...realXaiFlow,
    runXaiOAuthLogin: async () => {
      xaiFlowCalls.push("loopback");
      return FAKE_CREDENTIAL;
    },
    runXaiOAuthDeviceCode: async () => {
      xaiFlowCalls.push("device-code");
      return FAKE_CREDENTIAL;
    },
    refreshXaiOAuthToken: async (credential: OAuthCredential) => credential,
    resolveXaiCredential: () => null,
    validateXAIEndpoint: (url: string) => url,
  }));
  mock.module("./flows/openai-codex", () => ({
    ...realOpenAiCodexFlow,
    runOpenAiCodexBrowserPkce: async () => FAKE_CREDENTIAL,
    runOpenAiCodexDeviceCode: async () => FAKE_CREDENTIAL,
  }));
  mock.module("./flows/antigravity", () => ({
    ...realAntigravityFlow,
    runAntigravityOAuthLogin: async () => FAKE_CREDENTIAL,
  }));

  // Do not mock.module("../client/profileConfig") — Bun shares the module
  // registry across test files and restore() does not fully un-poison it
  // (breaks client/profileConfig.test.ts). Sync resolution is injected via deps.

  // Mock fetch
  fetchCalls = [];
  const mockFetch = async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url, init });
    return new Response(JSON.stringify(stubFetchResponse.body), {
      status: stubFetchResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  return import(`./authCommand.ts?v=${moduleVersion}`).then((mod) => ({
    ...mod,
    mockFetch,
  }));
}

/** Force env-only sync resolution so host ~/.nolo profile never affects tests. */
function withIsolatedSync(
  overrides: AuthProviderCommandDeps = {}
): AuthProviderCommandDeps {
  return withTokenStore({
    resolveServerSyncConfig: () => {
      const serverOrigin =
        process.env.NOLO_SERVER?.trim() ||
        process.env.NOLO_SERVER_URL?.trim() ||
        process.env.BASE_URL?.trim() ||
        "";
      const authToken =
        process.env.AUTH_TOKEN?.trim() ||
        process.env.NOLO_AUTH_TOKEN?.trim() ||
        "";
      if (!serverOrigin || !authToken) return null;
      return { serverOrigin: serverOrigin.replace(/\/+$/, ""), authToken };
    },
    ...overrides,
  });
}

describe("authCommand --sync-to-server", () => {
  beforeEach(() => {
    fetchCalls = [];
    stubFetchResponse = { ok: true, status: 200, body: { ok: true, syncedAt: Date.now() } };
    process.env.NOLO_SERVER = "https://nolo.example.com";
    process.env.AUTH_TOKEN = "test-auth-token";
  });

  afterEach(() => {
    process.env.NOLO_SERVER = originalEnv.NOLO_SERVER;
    process.env.AUTH_TOKEN = originalEnv.AUTH_TOKEN;
    mock.restore();
    // mock.restore() does not clear mock.module — reinstall real flow exports
    // so packages/cli/oauth/flows/xai.test.ts is not stuck on fake-access-token.
    restoreFlowModuleMocks();
  });

  it("auto-syncs when server config is present even without --sync-to-server", async () => {
    const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      [],
      undefined,
      withIsolatedSync({
        fetchImpl: mockFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    expect(exitCode).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("https://nolo.example.com/api/oauth/xai/sync");
    expect(logs.some((l) => l.includes("Synced to https://nolo.example.com"))).toBe(true);
  });

  it("skips auto-sync when --no-sync-to-server is passed", async () => {
    const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--no-sync-to-server"],
      undefined,
      withIsolatedSync({
        fetchImpl: mockFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    expect(exitCode).toBe(0);
    expect(fetchCalls).toHaveLength(0);
    expect(logs.some((l) => l.includes("authorization saved"))).toBe(true);
  });

  it("skips auto-sync when NOLO_OAUTH_AUTO_SYNC=0", async () => {
    process.env.NOLO_OAUTH_AUTO_SYNC = "0";
    try {
      const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

      const logs: string[] = [];
      const exitCode = await runAuthXaiCommand(
        [],
        undefined,
        withIsolatedSync({
          fetchImpl: mockFetch as any,
          output: { log: (msg: string) => logs.push(msg) },
          error: console,
          openBrowser: async () => true,
        })
      );

      expect(exitCode).toBe(0);
      expect(fetchCalls).toHaveLength(0);
    } finally {
      delete process.env.NOLO_OAUTH_AUTO_SYNC;
    }
  });

  it("syncs to server when --sync-to-server is passed", async () => {
    const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--sync-to-server"],
      undefined,
      withIsolatedSync({
        fetchImpl: mockFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    expect(exitCode).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("https://nolo.example.com/api/oauth/xai/sync");

    // Verify request
    const init = fetchCalls[0].init!;
    expect((init.headers as any).Authorization).toBe("Bearer test-auth-token");
    const body = JSON.parse(init.body as string);
    expect(body.accessToken).toBe("fake-access-token");
    expect(body.refreshToken).toBe("fake-refresh-token");

    // Verify success message
    expect(logs.some((l) => l.includes("Synced to https://nolo.example.com"))).toBe(true);
  });

  it("prints warning on sync failure but does not fail login", async () => {
    stubFetchResponse = { ok: false, status: 503, body: { error: "server_not_configured_for_oauth_sync" } };
    const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--sync-to-server"],
      undefined,
      withIsolatedSync({
        fetchImpl: mockFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    // Login succeeds even when sync fails
    expect(exitCode).toBe(0);
    expect(logs.some((l) => l.includes("authorization saved"))).toBe(true);
    expect(logs.some((l) => l.includes("Warning: server sync failed (503"))).toBe(true);
  });

  it("prints warning on network error", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const networkErrorFetch = async () => {
      throw new Error("ECONNREFUSED");
    };

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--sync-to-server"],
      undefined,
      withIsolatedSync({
        fetchImpl: networkErrorFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    expect(exitCode).toBe(0);
    expect(logs.some((l) => l.includes("Warning: server sync failed (ECONNREFUSED)"))).toBe(true);
  });

  it("skips sync with warning when server/token not configured", async () => {
    delete process.env.NOLO_SERVER;
    delete process.env.AUTH_TOKEN;
    const { runAuthXaiCommand, mockFetch } = await loadAuthCommand();

    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--sync-to-server"],
      undefined,
      withIsolatedSync({
        fetchImpl: mockFetch as any,
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
        openBrowser: async () => true,
      })
    );

    expect(exitCode).toBe(0);
    expect(fetchCalls).toHaveLength(0);
    expect(logs.some((l) => l.includes("Skipping server sync"))).toBe(true);
  });
});

describe("authCommand xAI flow routing", () => {
  beforeEach(() => {
    process.env.NOLO_SERVER = "https://nolo.example.com";
    process.env.AUTH_TOKEN = "test-auth-token";
  });

  afterEach(() => {
    process.env.NOLO_SERVER = originalEnv.NOLO_SERVER;
    process.env.AUTH_TOKEN = originalEnv.AUTH_TOKEN;
    mock.restore();
    restoreFlowModuleMocks();
  });

  it("uses loopback PKCE by default (interactive desktop)", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const exitCode = await runAuthXaiCommand(
      [],
      undefined,
      withTokenStore({
        output: { log: () => {} },
        error: console,
        openBrowser: async () => true,
      })
    );
    expect(exitCode).toBe(0);
    expect(xaiFlowCalls).toEqual(["loopback"]);
  });

  it("uses loopback when --browser is set", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const exitCode = await runAuthXaiCommand(
      ["--browser"],
      undefined,
      withTokenStore({
        output: { log: () => {} },
        error: console,
        openBrowser: async () => true,
      })
    );
    expect(exitCode).toBe(0);
    expect(xaiFlowCalls).toEqual(["loopback"]);
  });

  it("routes --device-code to device authorization", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const exitCode = await runAuthXaiCommand(
      ["--device-code"],
      undefined,
      withTokenStore({
        output: { log: () => {} },
        error: console,
        openBrowser: async () => true,
      })
    );
    expect(exitCode).toBe(0);
    expect(xaiFlowCalls).toEqual(["device-code"]);
  });

  it("routes --no-browser to device authorization (not loopback)", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const exitCode = await runAuthXaiCommand(
      ["--no-browser"],
      undefined,
      withTokenStore({
        output: { log: () => {} },
        error: console,
        openBrowser: async () => true,
      })
    );
    expect(exitCode).toBe(0);
    expect(xaiFlowCalls).toEqual(["device-code"]);
  });

  it("--browser wins over --device-code / --no-browser", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const exitCode = await runAuthXaiCommand(
      ["--browser", "--device-code", "--no-browser"],
      undefined,
      withTokenStore({
        output: { log: () => {} },
        error: console,
        openBrowser: async () => true,
      })
    );
    expect(exitCode).toBe(0);
    expect(xaiFlowCalls).toEqual(["loopback"]);
  });

  it("help text documents device-code and headless routing", async () => {
    const { runAuthXaiCommand } = await loadAuthCommand();
    const logs: string[] = [];
    const exitCode = await runAuthXaiCommand(
      ["--help"],
      undefined,
      withTokenStore({
        output: { log: (msg: string) => logs.push(msg) },
        error: console,
      })
    );
    expect(exitCode).toBe(0);
    const help = logs.join("\n");
    expect(help).toContain("--device-code");
    expect(help).toContain("--no-browser");
    expect(help).toMatch(/device authorization|RFC 8628/i);
    expect(xaiFlowCalls).toEqual([]);
  });
});
