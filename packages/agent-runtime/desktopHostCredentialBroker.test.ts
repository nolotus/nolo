/**
 * Desktop host broker factory tests — mock Keychain / CredMan + file,
 * never touch real system credential stores.
 */
import { describe, expect, test } from "bun:test";

import type { CredentialBroker } from "./credentialBroker";
import { createDesktopHostCredentialBroker } from "./desktopHostCredentialBroker";

function memoryBroker(
  store = new Map<string, string>(),
  opts: {
    failPut?: boolean;
    failDelete?: boolean;
    onPut?: (ref: string, secret: string) => void;
    onDelete?: (ref: string) => void;
  } = {},
): CredentialBroker & { store: Map<string, string> } {
  const broker: CredentialBroker & { store: Map<string, string> } = {
    store,
    async get(ref) {
      return store.get(ref) ?? null;
    },
    async put(ref, secret) {
      if (opts.failPut) {
        throw new Error("credential_broker_put_failed");
      }
      const value = secret.trim();
      if (!value) throw new Error("Cannot store an empty credential secret.");
      store.set(ref, value);
      opts.onPut?.(ref, value);
    },
    async delete(ref) {
      if (opts.failDelete) {
        throw new Error("credential_broker_delete_failed");
      }
      store.delete(ref);
      opts.onDelete?.(ref);
    },
    async has(ref) {
      return store.has(ref);
    },
  };
  return broker;
}

describe("createDesktopHostCredentialBroker", () => {
  test("linux keeps file broker", async () => {
    const file = memoryBroker(new Map([["api-key:a", "sk-file"]]));
    const keychain = memoryBroker();
    const windows = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "linux",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
      windowsCredentialBroker: windows,
    });

    expect(await broker.get("api-key:a")).toBe("sk-file");
    await broker.put("api-key:b", "sk-new");
    expect(file.store.get("api-key:b")).toBe("sk-new");
    expect(keychain.store.size).toBe(0);
    expect(windows.store.size).toBe(0);
  });

  test("NOLO_DESKTOP_CREDENTIAL_STORE=file forces file even on darwin", async () => {
    const file = memoryBroker(new Map([["api-key:a", "sk-file"]]));
    const keychain = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: { NOLO_DESKTOP_CREDENTIAL_STORE: "file" },
      fileBroker: file,
      keychainBroker: keychain,
    });

    expect(await broker.get("api-key:a")).toBe("sk-file");
    await broker.put("api-key:b", "sk-new");
    expect(file.store.get("api-key:b")).toBe("sk-new");
    expect(keychain.store.size).toBe(0);
  });

  test("NOLO_DESKTOP_CREDENTIAL_STORE=file forces file even on win32", async () => {
    const file = memoryBroker(new Map([["api-key:a", "sk-file"]]));
    const windows = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: { NOLO_DESKTOP_CREDENTIAL_STORE: "file" },
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    expect(await broker.get("api-key:a")).toBe("sk-file");
    await broker.put("api-key:b", "sk-new");
    expect(file.store.get("api-key:b")).toBe("sk-new");
    expect(windows.store.size).toBe(0);
  });

  test("darwin get hits Keychain first", async () => {
    const file = memoryBroker(new Map([["api-key:a", "sk-file"]]));
    const keychain = memoryBroker(new Map([["api-key:a", "sk-keychain"]]));
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    expect(await broker.get("api-key:a")).toBe("sk-keychain");
    // Keychain is authoritative; retry cleanup of a stale legacy file copy.
    expect(file.store.has("api-key:a")).toBe(false);
  });

  test("darwin get miss promotes file → Keychain then deletes file", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-legacy"]]));
    const keychain = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
    expect(keychain.store.get("api-key:legacy")).toBe("sk-legacy");
    expect(file.store.has("api-key:legacy")).toBe(false);

    // Second get uses Keychain only.
    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
  });

  test("darwin promote put failure returns file secret and keeps file", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-legacy"]]));
    const keychain = memoryBroker(new Map(), { failPut: true });
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
    expect(file.store.get("api-key:legacy")).toBe("sk-legacy");
    expect(keychain.store.has("api-key:legacy")).toBe(false);
  });

  test("darwin put writes Keychain only; put failure does not write file", async () => {
    const file = memoryBroker();
    const keychain = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    await broker.put("api-key:new", "sk-new");
    expect(keychain.store.get("api-key:new")).toBe("sk-new");
    expect(file.store.has("api-key:new")).toBe(false);

    const failingKeychain = memoryBroker(new Map(), { failPut: true });
    const failingBroker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: failingKeychain,
    });
    await expect(failingBroker.put("api-key:fail", "sk-fail")).rejects.toThrow(
      "credential_broker_put_failed",
    );
    expect(file.store.has("api-key:fail")).toBe(false);
    expect(failingKeychain.store.has("api-key:fail")).toBe(false);
  });

  test("darwin has sees either store; delete is idempotent on both", async () => {
    const file = memoryBroker(new Map([["api-key:file-only", "sk-f"]]));
    const keychain = memoryBroker(new Map([["api-key:kc-only", "sk-k"]]));
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    expect(await broker.has("api-key:file-only")).toBe(true);
    expect(await broker.has("api-key:kc-only")).toBe(true);
    expect(await broker.has("api-key:missing")).toBe(false);

    await broker.delete("api-key:file-only");
    await broker.delete("api-key:kc-only");
    await broker.delete("api-key:missing");

    expect(await broker.has("api-key:file-only")).toBe(false);
    expect(await broker.has("api-key:kc-only")).toBe(false);
    expect(file.store.size).toBe(0);
    expect(keychain.store.size).toBe(0);
  });

  test("darwin delete attempts file cleanup even when Keychain delete fails", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-file"]]));
    const keychain = memoryBroker(
      new Map([["api-key:legacy", "sk-keychain"]]),
      { failDelete: true },
    );
    const broker = createDesktopHostCredentialBroker({
      platform: "darwin",
      env: {},
      fileBroker: file,
      keychainBroker: keychain,
    });

    await expect(broker.delete("api-key:legacy")).rejects.toThrow(
      "credential_broker_delete_failed",
    );
    expect(file.store.has("api-key:legacy")).toBe(false);
    expect(keychain.store.has("api-key:legacy")).toBe(true);
  });

  test("win32 get hits Credential Manager first", async () => {
    const file = memoryBroker(new Map([["api-key:a", "sk-file"]]));
    const windows = memoryBroker(new Map([["api-key:a", "sk-credman"]]));
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    expect(await broker.get("api-key:a")).toBe("sk-credman");
    // CredMan is authoritative; retry cleanup of a stale legacy file copy.
    expect(file.store.has("api-key:a")).toBe(false);
  });

  test("win32 get miss promotes file → CredMan then deletes file", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-legacy"]]));
    const windows = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
    expect(windows.store.get("api-key:legacy")).toBe("sk-legacy");
    expect(file.store.has("api-key:legacy")).toBe(false);

    // Second get uses CredMan only.
    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
  });

  test("win32 promote put failure returns file secret and keeps file", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-legacy"]]));
    const windows = memoryBroker(new Map(), { failPut: true });
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    expect(await broker.get("api-key:legacy")).toBe("sk-legacy");
    expect(file.store.get("api-key:legacy")).toBe("sk-legacy");
    expect(windows.store.has("api-key:legacy")).toBe(false);
  });

  test("win32 put writes CredMan only; put failure does not write file", async () => {
    const file = memoryBroker();
    const windows = memoryBroker();
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    await broker.put("api-key:new", "sk-new");
    expect(windows.store.get("api-key:new")).toBe("sk-new");
    expect(file.store.has("api-key:new")).toBe(false);

    const failingWindows = memoryBroker(new Map(), { failPut: true });
    const failingBroker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: failingWindows,
    });
    await expect(failingBroker.put("api-key:fail", "sk-fail")).rejects.toThrow(
      "credential_broker_put_failed",
    );
    expect(file.store.has("api-key:fail")).toBe(false);
    expect(failingWindows.store.has("api-key:fail")).toBe(false);
  });

  test("win32 has sees either store; delete is idempotent on both", async () => {
    const file = memoryBroker(new Map([["api-key:file-only", "sk-f"]]));
    const windows = memoryBroker(new Map([["api-key:cm-only", "sk-c"]]));
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    expect(await broker.has("api-key:file-only")).toBe(true);
    expect(await broker.has("api-key:cm-only")).toBe(true);
    expect(await broker.has("api-key:missing")).toBe(false);

    await broker.delete("api-key:file-only");
    await broker.delete("api-key:cm-only");
    await broker.delete("api-key:missing");

    expect(await broker.has("api-key:file-only")).toBe(false);
    expect(await broker.has("api-key:cm-only")).toBe(false);
    expect(file.store.size).toBe(0);
    expect(windows.store.size).toBe(0);
  });

  test("win32 delete attempts file cleanup even when CredMan delete fails", async () => {
    const file = memoryBroker(new Map([["api-key:legacy", "sk-file"]]));
    const windows = memoryBroker(
      new Map([["api-key:legacy", "sk-credman"]]),
      { failDelete: true },
    );
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      windowsCredentialBroker: windows,
    });

    await expect(broker.delete("api-key:legacy")).rejects.toThrow(
      "credential_broker_delete_failed",
    );
    expect(file.store.has("api-key:legacy")).toBe(false);
    expect(windows.store.has("api-key:legacy")).toBe(true);
  });

  test("win32 uses createWindowsCredentialBroker factory when not injected", async () => {
    const file = memoryBroker();
    const windows = memoryBroker();
    let factoryCalls = 0;
    const broker = createDesktopHostCredentialBroker({
      platform: "win32",
      env: {},
      fileBroker: file,
      createWindowsCredentialBroker: () => {
        factoryCalls += 1;
        return windows;
      },
    });

    await broker.put("api-key:factory", "sk-factory");
    expect(factoryCalls).toBe(1);
    expect(windows.store.get("api-key:factory")).toBe("sk-factory");
    expect(file.store.has("api-key:factory")).toBe(false);
  });
});
