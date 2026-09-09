import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const defaultDllPath = join(
  repoRoot,
  "node_modules",
  "electrobun",
  "dist-win-x64",
  "ElectrobunCore.dll"
);

// Electrobun v1 (≤0.12.0-beta.x) encoded the websocket base port as
// `mov bx, 50000` -> 66 bb 50 c3 (patched form: 66 bb 51 c3).
// Electrobun v2 (2.0.x) recompiled it as `mov ax, 50000` -> 66 b8 50 c3
// (patched form: 66 b8 51 c3), immediately followed by
// `mov di, 65535` -> 66 bf ff ff (the websocket_port_range_start/end
// pair in package/src/core/main.zig:119-120).
//
// The byte-patch is still required in v2: the Zig listener
// (startHostTransportServer, main.zig:1256-1305) retries on
// error.AddressInUse but returns false for every other bind error —
// including AccessDenied/WSAEACCES from Hyper-V reserved port ranges.
// The TS SDK then throws (sdks/main/proc/native.ts:138-146, ensure-
// WebviewRuntimeConfigured), so the process still dies on startup.
// Shifting the base port to 50001 avoids the reserved port crash.
//
// The v1 pattern is kept for older cached/locked DLLs; the v2 pattern
// + range-end anchor is what ships in 2.0.x payloads.
export const WEBSOCKET_PORT_BYTES = Buffer.from([0x66, 0xbb, 0x50, 0xc3]);
export const PATCHED_WEBSOCKET_PORT_BYTES = Buffer.from([0x66, 0xbb, 0x51, 0xc3]);
const REPLACEMENT_PORT_LOW = 0x51;

// v2: mov ax, 50000 + mov di, 65535 — the range-end anchor rules out
// coincidental `66 b8 50 c3` sequences elsewhere in the binary.
export const WEBSOCKET_PORT_BYTES_V2 = Buffer.from([
  0x66, 0xb8, 0x50, 0xc3, 0x66, 0xbf, 0xff, 0xff,
]);
export const PATCHED_WEBSOCKET_PORT_BYTES_V2 = Buffer.from([
  0x66, 0xb8, 0x51, 0xc3, 0x66, 0xbf, 0xff, 0xff,
]);

/**
 * Replace every `mov bx, 50000` (v1) / `mov ax, 50000` (v2) occurrence
 * with its 50001 counterpart in a DLL buffer, in place. Returns the
 * number of occurrences patched. Exported without the platform/
 * filesystem gates so the byte-patch invariant stays unit-testable on
 * every platform.
 */
export function patchWebsocketPortInBuffer(buffer: Buffer): number {
  let count = 0;
  let index = buffer.indexOf(WEBSOCKET_PORT_BYTES);
  while (index !== -1) {
    buffer[index + 2] = REPLACEMENT_PORT_LOW;
    count += 1;
    index = buffer.indexOf(WEBSOCKET_PORT_BYTES, index + 1);
  }
  index = buffer.indexOf(WEBSOCKET_PORT_BYTES_V2);
  while (index !== -1) {
    buffer[index + 2] = REPLACEMENT_PORT_LOW;
    count += 1;
    index = buffer.indexOf(WEBSOCKET_PORT_BYTES_V2, index + 1);
  }
  return count;
}

export function patchElectrobunWindowsCore(dllPath: string = defaultDllPath): boolean {
  if (process.platform !== "win32") return false;
  if (!existsSync(dllPath)) return false;

  const buffer = readFileSync(dllPath);
  const patchedCount = patchWebsocketPortInBuffer(buffer);
  if (patchedCount === 0) {
    if (
      buffer.indexOf(PATCHED_WEBSOCKET_PORT_BYTES) !== -1 ||
      buffer.indexOf(PATCHED_WEBSOCKET_PORT_BYTES_V2) !== -1
    ) {
      // Already patched by a previous pass (pre-build patches the node_modules
      // copy; packaging scripts then see the already-patched payload copy).
      return false;
    }
    // Fail loudly: shipping this DLL would reintroduce the WSAEACCES crash on
    // bind. Likely an Electrobun core version bump changed the binary layout
    // (e.g. v1 `mov bx` -> v2 `mov ax` recompilation).
    throw new Error(
      `[desktop] ${dllPath} does not contain the Electrobun websocket base port 50000 pattern ` +
        "(v1: 66 bb 50 c3; v2: 66 b8 50 c3 + 66 bf ff ff) nor an already-patched 50001 pattern. " +
        "The Electrobun core version may have changed — update patch-electrobun-windows-core.ts, " +
        "or set NOLO_DESKTOP_SKIP_ELECTROBUN_CORE=1 to bypass in pre-build.",
    );
  }
  if (patchedCount > 1) {
    console.warn(
      `[desktop] patched ${patchedCount} occurrences of the websocket base port in ${dllPath}; ` +
        "verify all of them are the listener bind port.",
    );
  }
  writeFileSync(dllPath, buffer);
  console.log(`[desktop] patched Electrobun Windows Core websocket base port in ${dllPath}`);
  return true;
}

if (import.meta.main) {
  patchElectrobunWindowsCore();
}