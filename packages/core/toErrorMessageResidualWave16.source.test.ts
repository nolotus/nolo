import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (wave16) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets static-string / String() pure clones in agent inbox/settings,
 * desktop runtime settings UI, and chat file processor. machineInstallAssets
 * daemon script is standalone-served JS and hosts a local toErrorMessage
 * helper rather than a package import.
 */
const REWIRED_IMPORT_SOURCES = [
  "packages/ai/agent/web/AgentInboxPage.tsx",
  "packages/ai/agent/web/AdvancedSettingsTab.tsx",
  "packages/chat/web/fileProcessor.ts",
] as const;

describe("toErrorMessage residual wave16 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_IMPORT_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*["'`]/,
      );
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+/,
      );
    }
  });

  it("embeds a local toErrorMessage helper in the machine install daemon script", () => {
    const source = readSource(
      "packages/server/handlers/machines/machineInstallAssets.ts",
    );
    expect(source).toContain("function toErrorMessage(error)");
    expect(source).toContain("toErrorMessage(error)");
    expect(source).not.toMatch(
      /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+\)/,
    );
  });
});
