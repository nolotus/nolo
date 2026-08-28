/**
 * Source-level contract tests for the Runtime Compatibility Matrix.
 *
 * Validates that the matrix document exists, lists all five target platforms,
 * and that source code conforms to the declared runtime contracts:
 *   - Web/RN do NOT support local runtime
 *   - CLI/Desktop DO support local runtime
 *   - Desktop/CLI local runtime do NOT dispatch Redux messageStreamEnd
 *   - Web/RN stream lifecycle uses messageStreamEnd
 *   - desktopRuntimeEntrypoint lives in packages/agent-runtime
 *   - server handler does NOT reverse-import from packages/desktop/src
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

const AGENT_RUNTIME_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(AGENT_RUNTIME_DIR, "../..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRepoRelative(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Matrix document existence and platform coverage
// ---------------------------------------------------------------------------

describe("runtime compatibility matrix document", () => {
  const matrixPath = join(REPO_ROOT, "docs/runtime-compatibility-matrix.md");
  const matrix = readFileSync(matrixPath, "utf8");

  it("matrix document exists", () => {
    expect(existsSync(matrixPath)).toBe(true);
  });

  it("lists all five target platforms", () => {
    expect(matrix).toContain("Web/browser chat");
    expect(matrix).toContain("CLI local runtime");
    expect(matrix).toContain("Desktop packaged macOS");
    expect(matrix).toContain("Desktop packaged Windows");
    expect(matrix).toContain("React Native");
  });

  it("declares Web/RN do NOT support local runtime", () => {
    // Look for the local runtime runnable row and check Web/RN columns
    expect(matrix).toContain("Local runtime runnable");
    // Web column should be ❌
    expect(matrix).toMatch(/Local runtime runnable.*❌.*always server/);
    // RN column should be ❌
    expect(matrix).toMatch(/RN local runtime.*Not supported/);
  });

  it("declares CLI/Desktop DO support local runtime", () => {
    // CLI and Desktop should show ✅ for local runtime runnable
    // Check the table row for local runtime
    const localRuntimeSection = matrix.split("Local runtime runnable")[1]?.split("\n")[0] || "";
    expect(localRuntimeSection).toContain("✅");
  });

  it("has correct date (2026-06-02)", () => {
    expect(matrix).toContain("2026-06-02");
    expect(matrix).not.toContain("2026-06-14");
  });
});

// ---------------------------------------------------------------------------
// 2. Desktop/CLI local runtime does NOT dispatch Redux messageStreamEnd
// ---------------------------------------------------------------------------

describe("local runtime does not dispatch Redux message lifecycle", () => {
  const localLoopSource = readRepoRelative("packages/agent-runtime/localLoop.ts");
  const desktopTurnService = readRepoRelative(
    "packages/desktop-runtime/handlers/desktopAgentRuntimeTurnService.ts"
  );

  it("localLoop.ts does not dispatch messageStreamEnd", () => {
    expect(localLoopSource).not.toContain("messageStreamEnd");
  });

  it("localLoop.ts does not dispatch messageStreaming", () => {
    expect(localLoopSource).not.toContain("messageStreaming");
  });

  it("desktop agent runtime turn service does not dispatch messageStreamEnd", () => {
    expect(desktopTurnService).not.toContain("messageStreamEnd");
  });

  it("desktop agent runtime turn service does not dispatch messageStreaming", () => {
    expect(desktopTurnService).not.toContain("messageStreaming");
  });
});

// ---------------------------------------------------------------------------
// 3. Web/RN stream lifecycle uses messageStreamEnd
// ---------------------------------------------------------------------------

describe("web/RN stream lifecycle uses messageStreamEnd", () => {
  const messageSlice = readRepoRelative("packages/chat/messages/messageSlice.ts");
  const streamAgent = readRepoRelative("packages/ai/agent/streamAgentChatTurn.ts");

  it("messageSlice defines messageStreamEnd as asyncThunk", () => {
    expect(messageSlice).toContain("messageStreamEnd");
    expect(messageSlice).toContain("messageStreamEnd: create.asyncThunk");
  });

  it("messageStreamEnd sets isStreaming to false", () => {
    expect(messageSlice).toContain("isStreaming: false");
  });

  it("streamAgentChatTurn dispatches messageStreamEnd", () => {
    expect(streamAgent).toContain("messageStreamEnd");
  });
});

// ---------------------------------------------------------------------------
// 4. Desktop entrypoint helper is in packages/agent-runtime
// ---------------------------------------------------------------------------

describe("desktop entrypoint helper location", () => {
  const entrypointPath = join(
    AGENT_RUNTIME_DIR,
    "desktopRuntimeEntrypoint.ts"
  );

  it("desktopRuntimeEntrypoint.ts exists in packages/agent-runtime", () => {
    expect(existsSync(entrypointPath)).toBe(true);
  });

  it("exports resolveDesktopRuntimeEntrypoint", () => {
    const src = readFileSync(entrypointPath, "utf8");
    expect(src).toContain("export function resolveDesktopRuntimeEntrypoint");
  });

  it("exports DESKTOP_ENTRYPOINT_ENV_VAR constant", () => {
    const src = readFileSync(entrypointPath, "utf8");
    expect(src).toContain("export const DESKTOP_ENTRYPOINT_ENV_VAR");
  });
});

// ---------------------------------------------------------------------------
// 5. Server handler does NOT reverse-import from packages/desktop/src
// ---------------------------------------------------------------------------

describe("server handler import boundaries", () => {
  const serverDir = join(REPO_ROOT, "packages/server");
  const desktopSrcDir = "packages/desktop/src";

  it("server handlers do not import from packages/desktop/src", () => {
    // Read the specific handler file
    const turnService = readRepoRelative(
      "packages/desktop-runtime/handlers/desktopAgentRuntimeTurnService.ts"
    );
    // Should NOT have any import from desktop/src
    expect(turnService).not.toMatch(/from\s+["']\.\.\/\.\.\/desktop\/src/);
    expect(turnService).not.toMatch(/from\s+["'].*desktop\/src/);
  });

  it("server handler imports stay within runtime/server tool boundaries", () => {
    const turnService = readRepoRelative(
      "packages/desktop-runtime/handlers/desktopAgentRuntimeTurnService.ts"
    );
    const fromLines = turnService
      .split("\n")
      .filter((line) => /from\s+["']/.test(line));
    for (const line of fromLines) {
      expect(line).toMatch(
        /from\s+["'](agent-runtime|ai|database|\.\.\/\.\.\/agent-runtime|\.\.\/\.\.\/database|\.\/|node:|\.\.\/\.\.\/ai\/tools|\.\.\/\.\.\/ai\/policy|\.\.\/\.\.\/ai\/skills|\.\.\/\.\.\/desktop-chrome-connector|core\/)/
      );
    }
  });
});
