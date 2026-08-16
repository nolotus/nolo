import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 12) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets scripts/verify pure coercions (agent creation closed loop,
 * xhs human diff, subject-ref lookup/query, authority-move dry-run,
 * nihaisha docs, multi-turn eval, public ready). Leaves remaining
 * verify/desktop pure clones, stack||message variants, and non-String
 * fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/verify/verifyAgentCreationClosedLoop.ts",
  "scripts/verify/verifyXhsHumanDiff.ts",
  "scripts/verify/verifySubjectRefTaskDialogLookup.ts",
  "scripts/verify/verifySubjectRefQuery.ts",
  "scripts/verify/verifyUserAuthorityMoveDryRun.ts",
  "scripts/verify/verifyNihaishaAgentFromExistingDocs.ts",
  "scripts/verify/verifyAgentMultiTurnEval.ts",
  "scripts/verify/verifyAgentPublicReady.ts",
] as const;

describe("toErrorMessage residual batch 12 consumers source contract", () => {
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
