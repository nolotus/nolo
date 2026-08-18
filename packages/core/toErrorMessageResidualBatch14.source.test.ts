import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 14) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets non-verify scripts pure coercions (release-control setup,
 * dialog status CLI, platform builtin seed, nihaisha docs import,
 * agent health check CLI, nolo CI smoke, agent dialog skill create,
 * grant agent reference). Leaves remaining scripts pure clones,
 * stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/setupReleaseControlSpace.ts",
  "scripts/dialogStatus.ts",
  "scripts/seedPlatformBuiltinAgents.ts",
  "scripts/importNihaishaTcmDocs.ts",
  "scripts/agent-health-check.ts",
  "scripts/smokeNoloCi.ts",
  "scripts/createAgentDialogSkill.ts",
  "scripts/grantAgentReference.ts",
] as const;

describe("toErrorMessage residual batch 14 consumers source contract", () => {
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
