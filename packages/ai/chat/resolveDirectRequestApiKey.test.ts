import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createFileCredentialBroker as createBrowserBroker,
  __resetBrowserCredentialBrokerMemoryForTests,
} from "../../agent-runtime/fileCredentialBroker.browser.stub";
import { createFileCredentialBroker as createNativeBroker } from "../../agent-runtime/fileCredentialBroker.native";
import type { KeychainLike } from "../../agent-runtime/fileCredentialBroker.native";
import { createFileCredentialBroker as createNodeBroker } from "../../agent-runtime/fileCredentialBroker";
import {
  DIRECT_API_KEY_UNAVAILABLE_MESSAGE,
  DirectApiKeyResolutionError,
  resolveDirectRequestApiKey,
  setDirectRequestCredentialBrokerFactoryForTests,
} from "./resolveDirectRequestApiKey";

afterEach(() => {
  setDirectRequestCredentialBrokerFactoryForTests(null);
  __resetBrowserCredentialBrokerMemoryForTests();
});

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
      return {
        username: "api-key",
        password,
        service,
      };
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

describe("resolveDirectRequestApiKey", () => {
  it("prefers raw/transient apiKey over credentialRef (legacy compat)", async () => {
    let getCalls = 0;
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        getCalls += 1;
        return "sk-from-broker";
      },
      async put() {},
      async delete() {},
      async has() {
        return true;
      },
    }));

    const key = await resolveDirectRequestApiKey({
      apiKey: "  sk-raw-legacy  ",
      credentialRef: "api-key:agent-x",
    });
    expect(key).toBe("sk-raw-legacy");
    expect(getCalls).toBe(0);
  });

  it("loads secret from browser memory broker when only credentialRef is set", async () => {
    const broker = createBrowserBroker({ desktop: false });
    await broker.put("api-key:agent-web", "sk-browser-secret");
    setDirectRequestCredentialBrokerFactoryForTests(() =>
      createBrowserBroker({ desktop: false }),
    );

    const key = await resolveDirectRequestApiKey({
      credentialRef: "api-key:agent-web",
    });
    expect(key).toBe("sk-browser-secret");
  });

  it("loads secret from native Keychain mock when only credentialRef is set", async () => {
    const keychain = makeMemoryKeychain();
    const broker = createNativeBroker({ keychain });
    await broker.put("api-key:agent-rn", "sk-native-secret");
    setDirectRequestCredentialBrokerFactoryForTests(() =>
      createNativeBroker({ keychain }),
    );

    const key = await resolveDirectRequestApiKey({
      credentialRef: "api-key:agent-rn",
    });
    expect(key).toBe("sk-native-secret");
  });

  it("loads secret from node file broker when only credentialRef is set", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-direct-key-"));
    try {
      const broker = createNodeBroker({ homeDir });
      await broker.put("api-key:agent-node", "sk-node-secret");
      setDirectRequestCredentialBrokerFactoryForTests(() =>
        createNodeBroker({ homeDir }),
      );

      const key = await resolveDirectRequestApiKey({
        credentialRef: "api-key:agent-node",
      });
      expect(key).toBe("sk-node-secret");
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("throws a clear ref/secret-free error when credentialRef is missing in broker", async () => {
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
      await resolveDirectRequestApiKey({
        credentialRef: "api-key:agent-missing",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DirectApiKeyResolutionError);
    const message = (caught as Error).message;
    expect(message).toBe(DIRECT_API_KEY_UNAVAILABLE_MESSAGE);
    expect(message).not.toContain("api-key:agent-missing");
    expect(message).not.toMatch(/sk-/i);
  });

  it("throws a clear ref/secret-free error when broker.get fails", async () => {
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        throw new Error("Keychain get failed for ref: api-key:agent-boom");
      },
      async put() {},
      async delete() {},
      async has() {
        return true;
      },
    }));

    await expect(
      resolveDirectRequestApiKey({ credentialRef: "api-key:agent-boom" }),
    ).rejects.toMatchObject({
      name: "DirectApiKeyResolutionError",
      message: DIRECT_API_KEY_UNAVAILABLE_MESSAGE,
    });
  });

  it("uses broker before remembered provider key and sync fallback", async () => {
    const calls: string[] = [];
    const brokerFactory = () => ({
      async get() { calls.push("broker"); return "broker-key"; },
      async put() {}, async delete() {}, async has() { return true; },
    });
    const key = await resolveDirectRequestApiKey(
      { credentialRef: "provider-key:openai-api", credentialSynced: true },
      {
        brokerFactory,
        providerSecretFetcher: async () => { calls.push("remembered"); return "remembered-key"; },
        syncFetcher: async () => { calls.push("sync"); return "synced-key"; },
      },
    );
    expect(key).toBe("broker-key");
    expect(calls).toEqual(["broker"]);

    const fallbackBroker = () => ({
      async get() { calls.push("broker-miss"); return null; },
      async put() {}, async delete() {}, async has() { return false; },
    });
    const remembered = await resolveDirectRequestApiKey(
      { credentialRef: "provider-key:openai-api", credentialSynced: true },
      {
        brokerFactory: fallbackBroker,
        providerSecretFetcher: async () => { calls.push("remembered"); return "remembered-key"; },
        syncFetcher: async () => { calls.push("sync"); return "synced-key"; },
      },
    );
    expect(remembered).toBe("remembered-key");
    expect(calls.slice(-2)).toEqual(["broker-miss", "remembered"]);

    const empty = await resolveDirectRequestApiKey(
      { credentialRef: "api-key:agent-x", credentialSynced: true },
      {
        brokerFactory: fallbackBroker,
        syncFetcher: async () => { calls.push("sync"); return "synced-key"; },
      },
    );
    expect(empty).toBe("synced-key");
    expect(calls.at(-1)).toBe("sync");
  });

  it("returns undefined when no raw key and no credentialRef (anonymous allowed)", async () => {
    let getCalls = 0;
    setDirectRequestCredentialBrokerFactoryForTests(() => ({
      async get() {
        getCalls += 1;
        return "should-not-run";
      },
      async put() {},
      async delete() {},
      async has() {
        return false;
      },
    }));

    const key = await resolveDirectRequestApiKey({});
    expect(key).toBeUndefined();
    expect(getCalls).toBe(0);
  });
});
