import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const nativeApiPath = join(
  repoRoot,
  "node_modules",
  "electrobun",
  "dist",
  "api",
  "bun",
  "proc",
  "native.ts"
);

const replacements: Array<[string, string]> = [
  [
    `\t\t\tactivateWindow: {
\t\t\t\targs: [
\t\t\t\t\tFFIType.ptr, // window ptr
\t\t\t\t],
\t\t\t\treturns: FFIType.void,
\t\t\t},
\t\t\thideWindow: {
\t\t\t\targs: [FFIType.ptr],
\t\t\t\treturns: FFIType.void,
\t\t\t},
`,
    "",
  ],
  [
    `\t\t\t\tsetWindowButtonPosition: {
\t\t\t\t\targs: [FFIType.ptr, FFIType.f64, FFIType.f64],
\t\t\t\t\treturns: FFIType.void,
\t\t\t\t},
`,
    "",
  ],
  [
    `\t\t\tnative_.symbols.activateWindow(windowPtr);`,
    `\t\t\tnative_.symbols.showWindow(windowPtr, true);`,
  ],
  [
    `\t\t\tnative_.symbols.hideWindow(windowPtr);`,
    `\t\t\tconsole.warn("[electrobun] hideWindow is unavailable in this native wrapper build");`,
  ],
  [
    `\t\t\t\tnative_.symbols.setWindowButtonPosition(windowPtr, x, y);`,
    `\t\t\t\tconsole.warn("[electrobun] setWindowButtonPosition is unavailable in this native wrapper build");`,
  ],
];

export const patchElectrobunMacosFfi = () => {
  if (process.platform !== "darwin") return;
  if (!existsSync(nativeApiPath)) {
    throw new Error(`Missing Electrobun native API source: ${nativeApiPath}`);
  }

  let source = readFileSync(nativeApiPath, "utf8");
  let changed = false;

  for (const [before, after] of replacements) {
    if (!source.includes(before)) continue;
    source = source.replace(before, after);
    changed = true;
  }

  // Newer Electrobun (1.18.4+) restructured the native API (winId-based u32
  // args, core_.symbols) and may already provide these symbols natively.
  // Only enforce the old-API invariant when the legacy symbols are still
  // present in the shape this patch was written for.
  const hasLegacyActivateWindow = source.includes("activateWindow: {\n\t\t\t\targs: [FFIType.ptr]");
  const hasLegacySetWindowButtonPosition = source.includes(
    "setWindowButtonPosition: {\n\t\t\t\targs: [FFIType.ptr, FFIType.f64, FFIType.f64]",
  );
  if (hasLegacyActivateWindow || hasLegacySetWindowButtonPosition) {
    throw new Error("Electrobun macOS FFI patch did not remove all unavailable symbol declarations");
  }

  if (changed) {
    if (!source.includes("native_.symbols.showWindow(windowPtr, true)")) {
      throw new Error("Electrobun macOS FFI patch did not install activateWindow fallback");
    }
    writeFileSync(nativeApiPath, source);
    console.log("[desktop] patched Electrobun macOS FFI declarations for bundled native wrapper");
  } else {
    console.log("[desktop] no Electrobun macOS FFI patch needed (new API structure)");
  }
};
