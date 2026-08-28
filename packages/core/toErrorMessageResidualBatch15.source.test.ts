import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 15) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions (share resource CLI local
 * clone, skill summary backfill, model-runtime autostart/supervisor
 * wrappers, llama server supervisor, local CLI agent setup, main
 * release-control reader). Leaves remaining scripts pure clones,
 * stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/shareResource.ts",
  "scripts/backfillSkillSummaries.ts",
  "scripts/runtime/setupLocalCliAgent.ts",
  "scripts/readMainReleaseControl.ts",
] as const;

describe("toErrorMessage residual batch 15 consumers source contract", () => {
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
