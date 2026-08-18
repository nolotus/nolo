import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveDesktopRuntimeEntrypoint,
  DESKTOP_ENTRYPOINT_ENV_VAR,
} from "./desktopRuntimeEntrypoint";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

describe("desktop runtime entrypoint resolution", () => {
  const originalEnvValue = process.env[DESKTOP_ENTRYPOINT_ENV_VAR];

  beforeEach(() => {
    delete process.env[DESKTOP_ENTRYPOINT_ENV_VAR];
  });

  afterEach(() => {
    if (originalEnvValue === undefined) {
      delete process.env[DESKTOP_ENTRYPOINT_ENV_VAR];
    } else {
      process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = originalEnvValue;
    }
  });

  it("uses NOLO_DESKTOP_APP_ENTRY when set", () => {
    const customPath = "/Applications/Nolo Desktop.app/Contents/Resources/app/bun/index.js";
    process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = customPath;
    expect(resolveDesktopRuntimeEntrypoint()).toBe(customPath);
  });

  it("trims whitespace from NOLO_DESKTOP_APP_ENTRY", () => {
    const customPath = "/opt/nolo/desktop/index.js";
    process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = `  ${customPath}  `;
    expect(resolveDesktopRuntimeEntrypoint()).toBe(customPath);
  });

  it("falls back to CLI index.ts when NOLO_DESKTOP_APP_ENTRY is not set", () => {
    delete process.env[DESKTOP_ENTRYPOINT_ENV_VAR];
    const entrypoint = resolveDesktopRuntimeEntrypoint();
    expect(entrypoint).toContain("cli/index.ts");
    // The fallback resolves relative to this file (packages/agent-runtime/)
    // CLI index is at packages/cli/index.ts
    expect(entrypoint).toBe(
      join(THIS_DIR, "../cli/index.ts")
    );
  });

  it("falls back when NOLO_DESKTOP_APP_ENTRY is empty string", () => {
    process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = "";
    const entrypoint = resolveDesktopRuntimeEntrypoint();
    expect(entrypoint).toContain("cli/index.ts");
  });

  it("falls back when NOLO_DESKTOP_APP_ENTRY is whitespace only", () => {
    process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = "   ";
    const entrypoint = resolveDesktopRuntimeEntrypoint();
    expect(entrypoint).toContain("cli/index.ts");
  });

  it("exports the env var name as a constant", () => {
    expect(DESKTOP_ENTRYPOINT_ENV_VAR).toBe("NOLO_DESKTOP_APP_ENTRY");
  });
});
