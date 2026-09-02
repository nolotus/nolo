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

// Pattern: mov bx, 50000 (0xC350) -> 66 bb 50 c3
// Patched:  mov bx, 50001 (0xC351) -> 66 bb 51 c3
// Windows port 50000 can be blocked by system-administered exclusions or hyper-v,
// causing WSAEACCES (10013 / AccessDenied) on bind. Electrobun's Zig websocket
// listener only catches AddressInUse and crashes on AccessDenied. Shifting base port
// to 50001 avoids the reserved port crash.
export const WEBSOCKET_PORT_BYTES = Buffer.from([0x66, 0xbb, 0x50, 0xc3]);
export const PATCHED_WEBSOCKET_PORT_BYTES = Buffer.from([0x66, 0xbb, 0x51, 0xc3]);
const REPLACEMENT_PORT_LOW = 0x51;

/**
 * Replace every `mov bx, 50000` occurrence with `mov bx, 50001` in a DLL buffer,
 * in place. Returns the number of occurrences patched. Exported without the
 * platform/filesystem gates so the byte-patch invariant stays unit-testable on
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
  return count;
}

export function patchElectrobunWindowsCore(dllPath: string = defaultDllPath): boolean {
  if (process.platform !== "win32") return false;
  if (!existsSync(dllPath)) return false;

  const buffer = readFileSync(dllPath);
  const patchedCount = patchWebsocketPortInBuffer(buffer);
  if (patchedCount === 0) {
    if (buffer.indexOf(PATCHED_WEBSOCKET_PORT_BYTES) !== -1) {
      // Already patched by a previous pass (pre-build patches the node_modules
      // copy; packaging scripts then see the already-patched payload copy).
      return false;
    }
    // Fail loudly: shipping this DLL would reintroduce the WSAEACCES crash on
    // bind. Likely an Electrobun core version bump changed the binary layout.
    throw new Error(
      `[desktop] ${dllPath} does not contain the Electrobun websocket base port 50000 pattern ` +
        "(66 bb 50 c3) nor the already-patched 50001 pattern. The Electrobun core version " +
        "may have changed — update patch-electrobun-windows-core.ts, or set " +
        "NOLO_DESKTOP_SKIP_ELECTROBUN_CORE=1 to bypass in pre-build.",
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
