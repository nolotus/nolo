/**
 * Pure adapter tests for the RN Keychain credential broker.
 * Runs under Bun with an in-memory KeychainLike mock (no native module).
 */
import { describe, expect, test } from "bun:test";

import {
  createFileCredentialBroker,
  credentialRefToKeychainService,
  RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX,
  type KeychainLike,
} from "./fileCredentialBroker.native";

function createMemoryKeychain(): KeychainLike & {
  store: Map<string, { username: string; password: string }>;
  failNextOp: "get" | "put" | "delete" | "has" | null;
} {
  const store = new Map<string, { username: string; password: string }>();
  const api: KeychainLike & {
    store: typeof store;
    failNextOp: "get" | "put" | "delete" | "has" | null;
  } = {
    store,
    failNextOp: null,
    async setGenericPassword(username, password, options) {
      if (api.failNextOp === "put") {
        api.failNextOp = null;
        throw new Error("simulated keychain put error");
      }
      const service = options?.service ?? "default";
      store.set(service, { username, password });
      return { service, storage: "mock" };
    },
    async getGenericPassword(options) {
      if (api.failNextOp === "get") {
        api.failNextOp = null;
        throw new Error("simulated keychain get error");
      }
      const service = options?.service ?? "default";
      const entry = store.get(service);
      if (!entry) return false;
      return {
        username: entry.username,
        password: entry.password,
        service,
        storage: "mock",
      };
    },
    async resetGenericPassword(options) {
      if (api.failNextOp === "delete") {
        api.failNextOp = null;
        throw new Error("simulated keychain delete error");
      }
      const service = options?.service ?? "default";
      return store.delete(service);
    },
    async hasGenericPassword(options) {
      if (api.failNextOp === "has") {
        api.failNextOp = null;
        throw new Error("simulated keychain has error");
      }
      const service = options?.service ?? "default";
      return store.has(service);
    },
  };
  return api;
}

describe("credentialRefToKeychainService", () => {
  test("uses stable isolated prefix and hex-encodes ref (no collision)", () => {
    const a = credentialRefToKeychainService("api-key:agent-foo");
    const b = credentialRefToKeychainService("api-key_agent-foo");
    expect(a.startsWith(`${RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX}.`)).toBe(true);
    expect(b.startsWith(`${RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX}.`)).toBe(true);
    expect(a).not.toBe(b);
    // Deterministic across calls (restart-safe mapping).
    expect(credentialRefToKeychainService("api-key:agent-foo")).toBe(a);
  });

  test("rejects empty and path-like refs with stable invalid_ref (no ref echo)", () => {
    for (const bad of ["", "../escape", "a/b"]) {
      try {
        credentialRefToKeychainService(bad);
        throw new Error(`expected throw for ${JSON.stringify(bad)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toBe("invalid_ref");
        if (bad) {
          expect(message).not.toContain(bad);
        }
        expect(message).not.toContain("..");
        expect(message).not.toContain("a/b");
      }
    }
  });
});

describe("fileCredentialBroker.native (mock Keychain)", () => {
  test("put → new broker instance get (simulates process restart)", async () => {
    const keychain = createMemoryKeychain();
    const ref = "api-key:agent-demo";

    const broker1 = createFileCredentialBroker({ keychain });
    expect(await broker1.has(ref)).toBe(false);
    expect(await broker1.get(ref)).toBeNull();

    await broker1.put(ref, " sk-test-secret ");
    expect(await broker1.has(ref)).toBe(true);
    expect(await broker1.get(ref)).toBe("sk-test-secret");

    // New factory instance shares durable store (Keychain), not module memory.
    const broker2 = createFileCredentialBroker({ keychain });
    expect(await broker2.get(ref)).toBe("sk-test-secret");
    expect(await broker2.has(ref)).toBe(true);
  });

  test("put overwrite supports rotate", async () => {
    const keychain = createMemoryKeychain();
    const broker = createFileCredentialBroker({ keychain });
    const ref = "api-key:agent-rotate";

    await broker.put(ref, "sk-old");
    await broker.put(ref, "sk-new");
    expect(await broker.get(ref)).toBe("sk-new");
  });

  test("delete removes secret; missing get returns null", async () => {
    const keychain = createMemoryKeychain();
    const broker = createFileCredentialBroker({ keychain });
    const ref = "api-key:agent-del";

    await broker.put(ref, "sk-del");
    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();

    // Idempotent delete of missing
    await broker.delete(ref);
    expect(await broker.get("api-key:never-stored")).toBeNull();
  });

  test("rejects empty secrets", async () => {
    const broker = createFileCredentialBroker({ keychain: createMemoryKeychain() });
    await expect(broker.put("api-key:ok", "   ")).rejects.toThrow(/empty/i);
  });

  test("Keychain errors throw stable codes without ref/native message", async () => {
    const keychain = createMemoryKeychain();
    const broker = createFileCredentialBroker({ keychain });
    const ref = "api-key:agent-err";

    keychain.failNextOp = "put";
    await expect(broker.put(ref, "sk-must-not-fake")).rejects.toThrow(
      "credential_broker_put_failed",
    );
    expect(await broker.has(ref)).toBe(false);

    await broker.put(ref, "sk-ok");
    keychain.failNextOp = "get";
    try {
      await broker.get(ref);
      throw new Error("expected get to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe("credential_broker_get_failed");
      expect(message).not.toContain(ref);
      expect(message).not.toContain("simulated");
    }

    keychain.failNextOp = "has";
    await expect(broker.has(ref)).rejects.toThrow("credential_broker_has_failed");

    keychain.failNextOp = "delete";
    await expect(broker.delete(ref)).rejects.toThrow(
      "credential_broker_delete_failed",
    );
  });

  test("setGenericPassword false is treated as put failure", async () => {
    const keychain = createMemoryKeychain();
    keychain.setGenericPassword = async () => false;
    const broker = createFileCredentialBroker({ keychain });
    await expect(broker.put("api-key:agent-false", "sk-x")).rejects.toThrow(
      "credential_broker_put_failed",
    );
  });

  test("namespace isolation: different prefixes do not share secrets", async () => {
    const keychain = createMemoryKeychain();
    const ref = "api-key:shared-shape";

    const a = createFileCredentialBroker({
      keychain,
      servicePrefix: "nolo.credentials.keys.test-a",
    });
    const b = createFileCredentialBroker({
      keychain,
      servicePrefix: "nolo.credentials.keys.test-b",
    });

    await a.put(ref, "sk-a");
    expect(await a.get(ref)).toBe("sk-a");
    expect(await b.get(ref)).toBeNull();

    await b.put(ref, "sk-b");
    expect(await a.get(ref)).toBe("sk-a");
    expect(await b.get(ref)).toBe("sk-b");
  });

  test("does not use login-token or onboarding service names", async () => {
    const keychain = createMemoryKeychain();
    // Pre-seed auth and onboarding-like services that must not be cleared.
    keychain.store.set("app_tokens", {
      username: "tokens",
      password: JSON.stringify(["login-token-secret"]),
    });
    keychain.store.set("nolo.localFirst.prefs", {
      username: "prefs",
      password: JSON.stringify({ dismissed: "1" }),
    });

    const broker = createFileCredentialBroker({ keychain });
    await broker.put("api-key:agent-ns", "sk-api");
    await broker.delete("api-key:agent-ns");

    expect(keychain.store.get("app_tokens")?.password).toContain("login-token-secret");
    expect(keychain.store.get("nolo.localFirst.prefs")?.password).toContain(
      "dismissed",
    );
    // Only credential services under our prefix were written/deleted.
    for (const service of keychain.store.keys()) {
      if (service !== "app_tokens" && service !== "nolo.localFirst.prefs") {
        expect(service.startsWith(RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX)).toBe(
          true,
        );
      }
    }
  });

  test("does not expose list-all secrets on the broker surface", () => {
    const broker = createFileCredentialBroker({
      keychain: createMemoryKeychain(),
    });
    const keys = Object.keys(broker).sort();
    expect(keys).toEqual(["delete", "get", "has", "put"]);
    expect(keys).not.toContain("list");
    expect(keys).not.toContain("dump");
    expect(keys).not.toContain("entries");
  });
});
