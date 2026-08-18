import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  createFileCredentialBroker as createBrowserBroker,
  __resetBrowserCredentialBrokerMemoryForTests,
} from "../../agent-runtime/fileCredentialBroker.browser.stub";
import { createFileCredentialBroker as createNativeBroker } from "../../agent-runtime/fileCredentialBroker.native";
import type { KeychainLike } from "../../agent-runtime/fileCredentialBroker.native";
import {
  DIRECT_API_KEY_UNAVAILABLE_MESSAGE,
  setDirectRequestCredentialBrokerFactoryForTests,
} from "./resolveDirectRequestApiKey";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

type PerformFetchRequest = typeof import("./fetchUtils").performFetchRequest;

const originalFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];
let fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let performFetchRequest: PerformFetchRequest;
let moduleVersion = 0;

function makeMemoryKeychain(): KeychainLike {
  const store = new Map<string, string>();
  return {
    async setGenericPassword(_u, password, options) {
      const service = options?.service ?? "default";
      store.set(service, password);
      return { service };
    },
    async getGenericPassword(options) {
      const service = options?.service ?? "default";
      const password = store.get(service);
      if (password === undefined) return false;
      return { username: "api-key", password, service };
    },
    async resetGenericPassword(options) {
      const service = options?.service ?? "default";
      store.delete(service);
      return true;
    },
    async hasGenericPassword(options) {
      const service = options?.service ?? "default";
      return store.has(service);
    },
  };
}

function baseAgent(overrides: Record<string, unknown> = {}) {
  return {
    provider: "custom",
    model: "test-model",
    apiSource: "custom",
    useServerProxy: false,
    customProviderUrl: "http://127.0.0.1:11434/v1",
    dbKey: "agent-local-1",
    userId: "local",
    ...overrides,
  } as any;
}

const bodyData = {
  model: "test-model",
  messages: [{ role: "user", content: "hi" }],
  stream: false,
};

beforeEach(async () => {
  // Prior suites often leave `ai/chat/fetchUtils` mocked; restore + cache-bust.
  mock.restore();
  fetchCalls = [];
  fetchImpl = async (input, init) => {
    fetchCalls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    fetchImpl(input, init)) as typeof fetch;

  const mod = await import(`./fetchUtils.ts?credentialRef=${moduleVersion++}`);
  performFetchRequest = mod.performFetchRequest;
  setDirectRequestCredentialBrokerFactoryForTests(null);
  __resetBrowserCredentialBrokerMemoryForTests();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  setDirectRequestCredentialBrokerFactoryForTests(null);
  __resetBrowserCredentialBrokerMemoryForTests();
  mock.restore();
});

describe("performFetchRequest credentialRef (direct path)", () => {
  it("credentialRef-only (browser broker) → Authorization Bearer on direct fetch", async () => {
    const broker = createBrowserBroker({ desktop: false });
    await broker.put("api-key:agent-web", "sk-browser-direct");
    setDirectRequestCredentialBrokerFactoryForTests(() =>
      createBrowserBroker({ desktop: false }),
    );

    await performFetchRequest({
      agentConfig: baseAgent({ credentialRef: "api-key:agent-web" }),
      api: "http://127.0.0.1:11434/v1/chat/completions",
      bodyData,
      currentServer: "https://nolo.example",
      token: "user-jwt",
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
    const headers = new Headers(fetchCalls[0].init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer sk-browser-direct");
    const body = JSON.parse(String(fetchCalls[0].init?.body ?? "{}"));
    expect(body.KEY).toBeUndefined();
  });

  it("credentialRef-only (native Keychain mock) → Authorization Bearer on direct fetch", async () => {
    const keychain = makeMemoryKeychain();
    const broker = createNativeBroker({ keychain });
    await broker.put("api-key:agent-rn", "sk-native-direct");
    setDirectRequestCredentialBrokerFactoryForTests(() =>
      createNativeBroker({ keychain }),
    );

    await performFetchRequest({
      agentConfig: baseAgent({ credentialRef: "api-key:agent-rn" }),
      api: "http://127.0.0.1:11434/v1/chat/completions",
      bodyData,
      currentServer: "https://nolo.example",
      token: "user-jwt",
    });

    expect(fetchCalls).toHaveLength(1);
    const headers = new Headers(fetchCalls[0].init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer sk-native-direct");
  });

  it("raw apiKey wins over credentialRef (legacy compat)", async () => {
    let getCalls = 0;
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        getCalls += 1;
        return "sk-should-not-use";
      },
      async put() {},
      async delete() {},
      async has() {
        return true;
      },
    }));

    await performFetchRequest({
      agentConfig: baseAgent({
        apiKey: "sk-raw-preferred",
        credentialRef: "api-key:agent-x",
      }),
      api: "http://127.0.0.1:11434/v1/chat/completions",
      bodyData,
      currentServer: "https://nolo.example",
      token: "user-jwt",
    });

    expect(getCalls).toBe(0);
    const headers = new Headers(fetchCalls[0].init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer sk-raw-preferred");
  });

  it("honors apiKeyHeader truth (non-Bearer) for direct requests", async () => {
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        return "sk-header-custom";
      },
      async put() {},
      async delete() {},
      async has() {
        return true;
      },
    }));

    await performFetchRequest({
      agentConfig: baseAgent({
        credentialRef: "api-key:agent-anthropic",
        apiKeyHeader: "x-api-key",
      }),
      api: "http://127.0.0.1:11434/v1/messages",
      bodyData,
      currentServer: "https://nolo.example",
      token: "user-jwt",
    });

    const headers = new Headers(fetchCalls[0].init?.headers);
    expect(headers.get("x-api-key")).toBe("sk-header-custom");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("missing credentialRef secret does not fetch and surfaces clean error", async () => {
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        return null;
      },
      async put() {},
      async delete() {},
      async has() {
        return false;
      },
    }));

    let caught: unknown;
    try {
      await performFetchRequest({
        agentConfig: baseAgent({ credentialRef: "api-key:agent-missing" }),
        api: "http://127.0.0.1:11434/v1/chat/completions",
        bodyData,
        currentServer: "https://nolo.example",
        token: "user-jwt",
      });
    } catch (error) {
      caught = error;
    }

    expect(fetchCalls).toHaveLength(0);
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain(DIRECT_API_KEY_UNAVAILABLE_MESSAGE);
    expect(message).not.toContain("api-key:agent-missing");
    expect(message).not.toMatch(/sk-/i);
  });

  it("server-proxy does not hydrate KEY from broker", async () => {
    let getCalls = 0;
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        getCalls += 1;
        return "sk-must-not-enter-proxy-key";
      },
      async put() {},
      async delete() {},
      async has() {
        return true;
      },
    }));

    await performFetchRequest({
      agentConfig: baseAgent({
        useServerProxy: true,
        credentialRef: "api-key:agent-proxy",
        // no raw apiKey
      }),
      api: "https://api.example.com/v1/chat/completions",
      bodyData,
      currentServer: "https://nolo.example",
      token: "user-jwt",
    });

    expect(getCalls).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toMatch(/\/api\/v1\/chat$/);
    const body = JSON.parse(String(fetchCalls[0].init?.body ?? "{}"));
    expect(body.KEY).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("sk-must-not-enter-proxy-key");
  });

  it("no credentials keeps anonymous direct request (no Authorization)", async () => {
    let getCalls = 0;
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        getCalls += 1;
        return "nope";
      },
      async put() {},
      async delete() {},
      async has() {
        return false;
      },
    }));

    await performFetchRequest({
      agentConfig: baseAgent({}),
      api: "http://127.0.0.1:11434/v1/chat/completions",
      bodyData,
      currentServer: "https://nolo.example",
      token: "",
    });

    expect(getCalls).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    const headers = new Headers(fetchCalls[0].init?.headers);
    expect(headers.get("Authorization")).toBeNull();
  });
});
