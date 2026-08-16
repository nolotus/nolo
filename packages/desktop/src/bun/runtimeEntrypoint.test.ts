import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach } from "bun:test";

import {
  resolveDesktopRuntimeEntrypoint,
  DESKTOP_ENTRYPOINT_ENV_VAR,
} from "../../../../packages/agent-runtime/desktopRuntimeEntrypoint";

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
    // The fallback now resolves relative to agent-runtime, not this file
    expect(entrypoint).toBe(
      join(THIS_DIR, "../../../../packages/cli/index.ts")
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

describe("desktop runtime entrypoint contract", () => {
  it("desktop index.ts sets NOLO_DESKTOP_APP_ENTRY to its own path", () => {
    const source = readFileSync(
      join(THIS_DIR, "index.ts"),
      "utf8"
    );
    // The desktop entry must set the env var before any server code runs
    // It uses DESKTOP_ENTRYPOINT_ENV_VAR constant, so check for that
    expect(source).toContain("DESKTOP_ENTRYPOINT_ENV_VAR");
    expect(source).toContain('join(import.meta.dir, "index.js")');
    // Must be set before server bootstrap
    expect(source.indexOf("DESKTOP_ENTRYPOINT_ENV_VAR")).toBeLessThan(
      source.indexOf("bootstrapServer")
    );
    // Must be set before BrowserWindow creation
    expect(source.indexOf("DESKTOP_ENTRYPOINT_ENV_VAR")).toBeLessThan(
      source.indexOf("new BrowserWindow")
    );
  });

  it("server desktop runtime turn service imports from agent-runtime, not desktop", () => {
    const source = readFileSync(
      join(THIS_DIR, "../../../server/handlers/desktopAgentRuntimeTurnService.ts"),
      "utf8"
    );
    // Must import from agent-runtime (shared), not desktop (would be reverse dependency)
    expect(source).toContain('from "../../agent-runtime/desktopRuntimeEntrypoint"');
    expect(source).toContain("resolveDesktopRuntimeEntrypoint");
    // Must NOT import from desktop package
    expect(source).not.toContain('from "../../desktop/');
  });

  it("desktop CLI command roots are a superset of common workspace commands", () => {
    const source = readFileSync(
      join(THIS_DIR, "index.ts"),
      "utf8"
    );
    // These commands must be available in the packaged desktop app
    const requiredCommands = ["agent", "dialog", "table", "whoami"];
    for (const cmd of requiredCommands) {
      expect(source).toContain(`"${cmd}"`);
    }
    // The command roots must be checked before server bootstrap
    expect(source.indexOf("DESKTOP_CLI_COMMAND_ROOTS")).toBeLessThan(
      source.indexOf("bootstrapServer")
    );
  });
});
