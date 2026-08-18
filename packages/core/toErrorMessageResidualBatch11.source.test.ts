import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 11) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets scripts/probes pure coercions (packaged desktop X probes,
 * processRunner, playwright CRUD/quick-chat probes, paired AB probe,
 * visualProbeRunner). Leaves remaining verify/probe pure clones,
 * stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/probes/x/probePackagedDesktopXRuntime.ts",
  "scripts/probes/x/probePackagedDesktopQuickChatXUi.ts",
  "scripts/probes/helpers/processRunner.ts",
  "scripts/probes/playwrightSpaceFileProbe.ts",
  "scripts/probes/playwrightQuickChatProbe.ts",
  "scripts/probes/pairedQuickChatAgentABProbe.ts",
  "scripts/probes/playwrightTableCrudProbe.ts",
  "scripts/probes/visualProbeRunner.ts",
] as const;

describe("toErrorMessage residual batch 11 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+\)/,
      );
    }
  });
});
