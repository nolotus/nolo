import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createFileCredentialBroker,
  getApiKeyCredentialPath,
  getApiKeyCredentialsDir,
} from "./fileCredentialBroker";

const tempHomes: string[] = [];

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "nolo-cred-broker-"));
  tempHomes.push(home);
  return home;
}

afterEach(() => {
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) rmSync(home, { recursive: true, force: true });
  }
});

describe("fileCredentialBroker", () => {
  test("put/get/has/delete round-trip for api keys", async () => {
    const homeDir = makeHome();
    const broker = createFileCredentialBroker({ homeDir });
    const ref = "api-key:agent-demo";

    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();

    await broker.put(ref, " sk-test-secret ");
    expect(await broker.has(ref)).toBe(true);
    expect(await broker.get(ref)).toBe("sk-test-secret");

    const path = getApiKeyCredentialPath(ref, homeDir);
    expect(existsSync(path)).toBe(true);
    expect(path.startsWith(getApiKeyCredentialsDir(homeDir))).toBe(true);

    // Best-effort private mode (skip assert on platforms that never honor chmod).
    if (process.platform !== "win32") {
      const mode = statSync(path).mode & 0o777;
      expect(mode).toBe(0o600);
    }

    await broker.delete(ref);
    expect(await broker.has(ref)).toBe(false);
    expect(await broker.get(ref)).toBeNull();
    expect(existsSync(path)).toBe(false);
  });

  test("rejects empty secrets and path-like refs", async () => {
    const homeDir = makeHome();
    const broker = createFileCredentialBroker({ homeDir });

    expect(() => {
      void broker.put("api-key:ok", "   ");
    }).toThrow(/empty/i);

    expect(() => {
      void broker.put("../escape", "secret");
    }).toThrow();
  });

  test("does not expose list-all secrets on the broker surface", () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    const keys = Object.keys(broker).sort();
    expect(keys).toEqual(["delete", "get", "has", "put"]);
    expect(keys).not.toContain("list");
    expect(keys).not.toContain("dump");
    expect(keys).not.toContain("entries");
  });
});
