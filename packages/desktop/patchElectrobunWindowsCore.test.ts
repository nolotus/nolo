import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  patchElectrobunWindowsCore,
  patchWebsocketPortInBuffer,
} from "./scripts/patch-electrobun-windows-core";

describe("patchWebsocketPortInBuffer", () => {
  it("patches the 50000 port constant to 50001", () => {
    const buffer = Buffer.from([0x90, 0x66, 0xbb, 0x50, 0xc3, 0x90]);
    expect(patchWebsocketPortInBuffer(buffer)).toBe(1);
    expect(buffer).toEqual(Buffer.from([0x90, 0x66, 0xbb, 0x51, 0xc3, 0x90]));
  });

  it("reports zero patches for an already-patched buffer", () => {
    const buffer = Buffer.from([0x90, 0x66, 0xbb, 0x51, 0xc3, 0x90]);
    expect(patchWebsocketPortInBuffer(buffer)).toBe(0);
  });

  it("patches every occurrence", () => {
    const buffer = Buffer.from([
      0x66, 0xbb, 0x50, 0xc3, 0x00, 0x66, 0xbb, 0x50, 0xc3,
    ]);
    expect(patchWebsocketPortInBuffer(buffer)).toBe(2);
    expect(buffer).toEqual(Buffer.from([0x66, 0xbb, 0x51, 0xc3, 0x00, 0x66, 0xbb, 0x51, 0xc3]));
  });

  it("reports zero patches when the pattern is absent", () => {
    expect(patchWebsocketPortInBuffer(Buffer.alloc(16))).toBe(0);
  });
});

describe("patchElectrobunWindowsCore", () => {
  it("patches the DLL file and is idempotent on win32", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "patch-win-core-test-"));
    const dummyDll = join(tempDir, "ElectrobunCore.dll");
    try {
      writeFileSync(dummyDll, Buffer.from([0x90, 0x66, 0xbb, 0x50, 0xc3, 0x90]));

      if (process.platform === "win32") {
        expect(patchElectrobunWindowsCore(dummyDll)).toBe(true);
        expect(readFileSync(dummyDll)).toEqual(Buffer.from([0x90, 0x66, 0xbb, 0x51, 0xc3, 0x90]));

        // Second pass should be a no-op (already-patched pattern detected)
        expect(patchElectrobunWindowsCore(dummyDll)).toBe(false);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("gracefully ignores non-existent DLL path", () => {
    const result = patchElectrobunWindowsCore("C:\\non-existent-path\\ElectrobunCore.dll");
    expect(result).toBe(false);
  });
});
