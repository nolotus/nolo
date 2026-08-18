/**
 * Pure adapter tests for Windows Credential Manager credential broker.
 * Uses an in-memory WindowsCredentialRunner mock — never touches real Cred* APIs.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWindowsCredentialPowerShellArgs,
  createWindowsCredentialManagerBroker,
  credentialRefToWindowsCredentialTarget,
  WIN_ERROR_NOT_FOUND,
  WINDOWS_CREDENTIAL_MANAGER_SCRIPT,
  WINDOWS_CREDENTIAL_TARGET_PREFIX,
  WINDOWS_CREDENTIAL_USERNAME,
  type WindowsCredentialRunner,
  type WindowsCredentialRunnerResult,
} from "./windowsCredentialManagerBroker";

const DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(DIR, "windowsCredentialManagerBroker.ts");

type MockCall = {
  args: string[];
  stdin?: string;
};

type MockWindowsCredentialApi = {
  runner: WindowsCredentialRunner;
  calls: MockCall[];
  store: Map<string, string>;
  failNextOp: "get" | "put" | "delete" | "has" | null;
  nextResult: WindowsCredentialRunnerResult | null;
};

function createMockWindowsCredentialRunner(): MockWindowsCredentialApi {
  const store = new Map<string, string>();
  const calls: MockCall[] = [];
  const api: MockWindowsCredentialApi = {
    calls,
    store,
    failNextOp: null as "get" | "put" | "delete" | "has" | null,
    nextResult: null as WindowsCredentialRunnerResult | null,
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

      let payload: {
        op?: string;
        target?: string;
        secret?: string;
      };
      try {
        payload = JSON.parse(input.stdin ?? "") as typeof payload;
      } catch {
        return { exitCode: 1, stdout: "", stderr: "invalid json" };
      }

      const op = payload.op;
      const target = payload.target ?? "";

      if (op === "get") {
        if (api.failNextOp === "get") {
          api.failNextOp = null;
          return {
            exitCode: 1,
            stdout: "",
            stderr: "simulated get error with secret sk-must-not-leak",
          };
        }
        const secret = store.get(target);
        if (secret === undefined) {
          return {
            exitCode: WIN_ERROR_NOT_FOUND,
            stdout: "",
            stderr: "Element not found.",
          };
        }
        return {
          exitCode: 0,
          stdout: JSON.stringify({ secret }),
          stderr: "",
        };
      }

      if (op === "has") {
        if (api.failNextOp === "has") {
          api.failNextOp = null;
          return { exitCode: 1, stdout: "", stderr: "simulated has error" };
        }
        if (!store.has(target)) {
          return {
            exitCode: WIN_ERROR_NOT_FOUND,
            stdout: "",
            stderr: "Element not found.",
          };
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      }

      if (op === "put") {
        if (api.failNextOp === "put") {
          api.failNextOp = null;
          return {
            exitCode: 1,
            stdout: "",
            stderr: "simulated put error with secret sk-must-not-leak",
          };
        }
        const secret = payload.secret ?? "";
        if (!secret) {
          return { exitCode: 1, stdout: "", stderr: "empty secret" };
        }
        store.set(target, secret);
        return { exitCode: 0, stdout: "", stderr: "" };
      }

      if (op === "delete") {
        if (api.failNextOp === "delete") {
          api.failNextOp = null;
          return {
            exitCode: 1,
            stdout: "",
            stderr: "simulated delete error",
          };
        }
        if (!store.has(target)) {
          return {
            exitCode: WIN_ERROR_NOT_FOUND,
            stdout: "",
            stderr: "Element not found.",
          };
        }
        store.delete(target);
        return { exitCode: 0, stdout: "", stderr: "" };
      }

      return { exitCode: 1, stdout: "", stderr: "unknown op" };
    }) as WindowsCredentialRunner,
  };
  return api;
}

describe("credentialRefToWindowsCredentialTarget", () => {
  test("uses stable nolo prefix and hex-encodes ref (no collision)", () => {
    const a = credentialRefToWindowsCredentialTarget("api-key:agent-foo");
    const b = credentialRefToWindowsCredentialTarget("api-key_agent-foo");
    expect(a.startsWith(`${WINDOWS_CREDENTIAL_TARGET_PREFIX}.`)).toBe(true);
    expect(b.startsWith(`${WINDOWS_CREDENTIAL_TARGET_PREFIX}.`)).toBe(true);
    expect(a).not.toBe(b);
    expect(credentialRefToWindowsCredentialTarget("api-key:agent-foo")).toBe(a);

    const unicode = credentialRefToWindowsCredentialTarget("api-key:智能体");
    const ascii = credentialRefToWindowsCredentialTarget("api-key:agent-foo");
    expect(unicode).not.toBe(ascii);
    expect(unicode.startsWith(`${WINDOWS_CREDENTIAL_TARGET_PREFIX}.`)).toBe(
      true,
    );
    // UTF-8 hex of the Unicode ref must not collide with another ref's hex.
    const unicode2 = credentialRefToWindowsCredentialTarget("api-key:智 能体");
    expect(unicode2).not.toBe(unicode);
  });

  test("rejects empty and path-like refs with stable invalid_ref (no ref echo)", () => {
    for (const bad of ["", "../escape", "a/b", "a\\b"]) {
      try {
        credentialRefToWindowsCredentialTarget(bad);
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

describe("createWindowsCredentialManagerBroker (mock runner)", () => {
  test("put/get/has/delete round-trip; secret only on stdin JSON, never argv", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const ref = "api-key:agent-demo";
    const target = credentialRefToWindowsCredentialTarget(ref);
    const secret = "sk-test-secret";

    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();

    await broker.put(ref, ` ${secret} `);
    expect(await broker.has(ref)).toBe(true);
    expect(await broker.get(ref)).toBe(secret);

    const putCall = mock.calls.find((c) => {
      try {
        return JSON.parse(c.stdin ?? "").op === "put";
      } catch {
        return false;
      }
    });
    expect(putCall).toBeDefined();
    // Secret must never appear in argv.
    expect(putCall!.args.join(" ")).not.toContain(secret);
    expect(putCall!.args.join(" ")).not.toContain(ref);
    const putPayload = JSON.parse(putCall!.stdin ?? "") as {
      op: string;
      target: string;
      secret: string;
    };
    expect(putPayload.op).toBe("put");
    expect(putPayload.target).toBe(target);
    expect(putPayload.secret).toBe(secret);

    // Static PowerShell flags present; no ad-hoc secret flags.
    expect(putCall!.args).toContain("-NoProfile");
    expect(putCall!.args).toContain("-EncodedCommand");
    expect(putCall!.args).not.toContain(secret);

    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();
  });

  test("put overwrite supports rotate", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const ref = "api-key:agent-rotate";

    await broker.put(ref, "sk-old");
    await broker.put(ref, "sk-new");
    expect(await broker.get(ref)).toBe("sk-new");
  });

  test("delete missing is idempotent; get miss returns null", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const ref = "api-key:never-stored";

    expect(await broker.get(ref)).toBeNull();
    await broker.delete(ref);
    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
  });

  test("rejects empty secrets", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    await expect(broker.put("api-key:ok", "   ")).rejects.toThrow(/empty/i);
  });

  test("hard errors throw stable codes without ref/secret/stderr", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
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

  test("get rejects non-machine-JSON stdout without splicing stderr", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const ref = "api-key:bad-stdout";

    mock.nextResult = {
      exitCode: 0,
      stdout: "not-json-secret-sk-leaky",
      stderr: "raw stderr must never be spliced sk-must-not-leak",
    };
    try {
      await broker.get(ref);
      throw new Error("expected get to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe("credential_broker_get_failed");
      expect(message).not.toContain("sk-must-not-leak");
      expect(message).not.toContain("not-json");
      expect(message).not.toContain("stderr");
    }

    mock.nextResult = {
      exitCode: 0,
      stdout: JSON.stringify({ password: "wrong-shape" }),
      stderr: "",
    };
    await expect(broker.get(ref)).rejects.toThrow("credential_broker_get_failed");
  });

  test("does not expose list-all secrets on the broker surface", () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const keys = Object.keys(broker).sort();
    expect(keys).toEqual(["delete", "get", "has", "put"]);
    expect(keys).not.toContain("list");
    expect(keys).not.toContain("dump");
  });

  test("Unicode refs produce distinct targets without collision", async () => {
    const mock = createMockWindowsCredentialRunner();
    const broker = createWindowsCredentialManagerBroker({
      runner: mock.runner,
    });
    const refA = "api-key:智能体";
    const refB = "api-key:エージェント";
    await broker.put(refA, "sk-unicode-a");
    await broker.put(refB, "sk-unicode-b");
    expect(await broker.get(refA)).toBe("sk-unicode-a");
    expect(await broker.get(refB)).toBe("sk-unicode-b");
    expect(credentialRefToWindowsCredentialTarget(refA)).not.toBe(
      credentialRefToWindowsCredentialTarget(refB),
    );
  });
});

describe("windowsCredentialManagerBroker source contract", () => {
  test("script embeds Cred* API constants and never places secret on argv", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    const script = WINDOWS_CREDENTIAL_MANAGER_SCRIPT;

    expect(script).toContain("CRED_TYPE_GENERIC = 1");
    expect(script).toContain("CRED_PERSIST_LOCAL_MACHINE = 2");
    expect(script).toContain("ERROR_NOT_FOUND = 1168");
    expect(script).toContain("CredWriteW");
    expect(script).toContain("CredReadW");
    expect(script).toContain("CredDeleteW");
    expect(script).toContain("CredFree");
    expect(script).toContain("advapi32");

    // Script must not build process argv from secret; stdin JSON only.
    expect(script).not.toMatch(/Start-Process[^\\n]*secret/i);
    expect(script).not.toMatch(/\$args.*secret/i);
    expect(source).toContain("requestStdin");
    expect(source).toContain("JSON.stringify");
    expect(source).toContain("buildWindowsCredentialPowerShellArgs");

    // EncodedCommand path is static (no secret interpolation into args).
    const args = buildWindowsCredentialPowerShellArgs();
    expect(args).toContain("-EncodedCommand");
    expect(args.join(" ")).not.toMatch(/sk-/i);
    expect(args.join(" ")).not.toContain("secret");
    expect(source).toContain(WINDOWS_CREDENTIAL_USERNAME);
    expect(source).toContain(WINDOWS_CREDENTIAL_TARGET_PREFIX);
    expect(source).toContain("credential_broker_");
    expect(source).not.toContain("createDesktopHostCredentialBroker");
  });
});
