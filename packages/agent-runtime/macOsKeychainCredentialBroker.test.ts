/**
 * Pure adapter tests for macOS Keychain credential broker.
 * Uses an in-memory SecurityRunner mock — never touches real Keychain.
 */
import { describe, expect, test } from "bun:test";

import {
  createMacOsKeychainCredentialBroker,
  credentialRefToMacOsKeychainService,
  MACOS_KEYCHAIN_ACCOUNT,
  MACOS_KEYCHAIN_SERVICE_PREFIX,
  SECURITY_ITEM_NOT_FOUND_EXIT,
  type SecurityRunner,
  type SecurityRunnerResult,
} from "./macOsKeychainCredentialBroker";

type MockCall = {
  args: string[];
  stdin?: string;
};

type MockSecurityApi = {
  runner: SecurityRunner;
  calls: MockCall[];
  store: Map<string, string>;
  failNextOp: "get" | "put" | "delete" | "has" | null;
  nextResult: SecurityRunnerResult | null;
};

function createMockSecurityRunner(): {
  runner: SecurityRunner;
  calls: MockCall[];
  store: Map<string, string>;
  failNextOp: "get" | "put" | "delete" | "has" | null;
  nextResult: SecurityRunnerResult | null;
} {
  const store = new Map<string, string>();
  const calls: MockCall[] = [];
  const api: MockSecurityApi = {
    calls,
    store,
    failNextOp: null as "get" | "put" | "delete" | "has" | null,
    nextResult: null as SecurityRunnerResult | null,
    runner: (async (input) => {
      calls.push({
        args: [...input.args],
        ...(input.stdin !== undefined ? { stdin: input.stdin } : {}),
      });

      if (api.nextResult) {
        const result = api.nextResult;
        api.nextResult = null;
        return result;
      }

      const cmd = input.args[0];
      const accountIdx = input.args.indexOf("-a");
      const serviceIdx = input.args.indexOf("-s");
      const account =
        accountIdx >= 0 ? input.args[accountIdx + 1] : MACOS_KEYCHAIN_ACCOUNT;
      const service = serviceIdx >= 0 ? input.args[serviceIdx + 1] : "";
      const key = `${account}\0${service}`;

      if (cmd === "find-generic-password") {
        const wantsPassword = input.args.includes("-w");
        if (api.failNextOp === (wantsPassword ? "get" : "has")) {
          api.failNextOp = null;
          return { exitCode: 1, stdout: "", stderr: "simulated security error" };
        }
        const secret = store.get(key);
        if (secret === undefined) {
          return {
            exitCode: SECURITY_ITEM_NOT_FOUND_EXIT,
            stdout: "",
            stderr: "The specified item could not be found in the keychain.",
          };
        }
        if (wantsPassword) {
          return { exitCode: 0, stdout: `${secret}\n`, stderr: "" };
        }
        return { exitCode: 0, stdout: "keychain: mock\n", stderr: "" };
      }

      if (cmd === "add-generic-password") {
        if (api.failNextOp === "put") {
          api.failNextOp = null;
          return {
            exitCode: 1,
            stdout: "",
            stderr: "simulated put error with secret sk-must-not-leak",
          };
        }
        // Simulate security interactive -w last: password\\nretype\\n
        const stdin = input.stdin ?? "";
        const lines = stdin.split("\n");
        const password = lines[0] ?? "";
        const retype = lines[1] ?? "";
        if (!password || password !== retype) {
          return {
            exitCode: 1,
            stdout: "",
            stderr: "passwords don't match",
          };
        }
        store.set(key, password);
        return { exitCode: 0, stdout: "", stderr: "" };
      }

      if (cmd === "delete-generic-password") {
        if (api.failNextOp === "delete") {
          api.failNextOp = null;
          return { exitCode: 1, stdout: "", stderr: "simulated delete error" };
        }
        if (!store.has(key)) {
          return {
            exitCode: SECURITY_ITEM_NOT_FOUND_EXIT,
            stdout: "",
            stderr: "The specified item could not be found in the keychain.",
          };
        }
        store.delete(key);
        return { exitCode: 0, stdout: "password has been deleted.\n", stderr: "" };
      }

      return { exitCode: 1, stdout: "", stderr: "unknown command" };
    }) as SecurityRunner,
  };
  return api;
}

describe("credentialRefToMacOsKeychainService", () => {
  test("uses stable nolo prefix and hex-encodes ref (no collision)", () => {
    const a = credentialRefToMacOsKeychainService("api-key:agent-foo");
    const b = credentialRefToMacOsKeychainService("api-key_agent-foo");
    expect(a.startsWith(`${MACOS_KEYCHAIN_SERVICE_PREFIX}.`)).toBe(true);
    expect(b.startsWith(`${MACOS_KEYCHAIN_SERVICE_PREFIX}.`)).toBe(true);
    expect(a).not.toBe(b);
    expect(credentialRefToMacOsKeychainService("api-key:agent-foo")).toBe(a);
    expect(credentialRefToMacOsKeychainService("api-key:智能体")).not.toBe(
      credentialRefToMacOsKeychainService("api-key:agent-foo"),
    );
  });

  test("rejects empty and path-like refs with stable invalid_ref (no ref echo)", () => {
    for (const bad of ["", "../escape", "a/b"]) {
      try {
        credentialRefToMacOsKeychainService(bad);
        throw new Error(`expected throw for ${JSON.stringify(bad)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toBe("invalid_ref");
        if (bad) {
          expect(message).not.toContain(bad);
        }
      }
    }
  });
});

describe("createMacOsKeychainCredentialBroker (mock runner)", () => {
  test("put/get/has/delete round-trip; put uses -w last and secret only on stdin", async () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    const ref = "api-key:agent-demo";
    const service = credentialRefToMacOsKeychainService(ref);

    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();

    await broker.put(ref, " sk-test-secret ");
    expect(await broker.has(ref)).toBe(true);
    expect(await broker.get(ref)).toBe("sk-test-secret");

    const putCall = mock.calls.find((c) => c.args[0] === "add-generic-password");
    expect(putCall).toBeDefined();
    expect(putCall!.args[putCall!.args.length - 1]).toBe("-w");
    expect(putCall!.args).toContain("-U");
    expect(putCall!.args).toContain("-a");
    expect(putCall!.args).toContain(MACOS_KEYCHAIN_ACCOUNT);
    expect(putCall!.args).toContain("-s");
    expect(putCall!.args).toContain(service);
    // Secret must never appear in argv.
    expect(putCall!.args.join(" ")).not.toContain("sk-test-secret");
    expect(putCall!.stdin).toBe("sk-test-secret\nsk-test-secret\n");

    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();
  });

  test("put overwrite supports rotate", async () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    const ref = "api-key:agent-rotate";

    await broker.put(ref, "sk-old");
    await broker.put(ref, "sk-new");
    expect(await broker.get(ref)).toBe("sk-new");
  });

  test("delete missing is idempotent; get miss returns null", async () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    const ref = "api-key:never-stored";

    expect(await broker.get(ref)).toBeNull();
    await broker.delete(ref);
    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
  });

  test("rejects empty secrets", async () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    await expect(broker.put("api-key:ok", "   ")).rejects.toThrow(/empty/i);
  });

  test("hard errors throw stable codes without ref/secret/stderr", async () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    const ref = "api-key:agent-err";
    const secret = "sk-must-not-appear-in-errors";

    mock.failNextOp = "put";
    try {
      await broker.put(ref, secret);
      throw new Error("expected put to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe("credential_broker_put_failed");
      expect(message).not.toContain(ref);
      expect(message).not.toContain(secret);
      expect(message).not.toContain("simulated");
      expect(message).not.toContain("stderr");
    }

    await broker.put(ref, secret);
    mock.failNextOp = "get";
    try {
      await broker.get(ref);
      throw new Error("expected get to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe("credential_broker_get_failed");
      expect(message).not.toContain(ref);
      expect(message).not.toContain(secret);
    }

    mock.failNextOp = "has";
    await expect(broker.has(ref)).rejects.toThrow("credential_broker_has_failed");

    mock.failNextOp = "delete";
    await expect(broker.delete(ref)).rejects.toThrow(
      "credential_broker_delete_failed",
    );
  });

  test("does not expose list-all secrets on the broker surface", () => {
    const mock = createMockSecurityRunner();
    const broker = createMacOsKeychainCredentialBroker({ runner: mock.runner });
    const keys = Object.keys(broker).sort();
    expect(keys).toEqual(["delete", "get", "has", "put"]);
    expect(keys).not.toContain("list");
    expect(keys).not.toContain("dump");
  });
});
