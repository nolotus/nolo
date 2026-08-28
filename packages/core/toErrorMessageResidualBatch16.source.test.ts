import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 16) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions (memory delete/read CLIs,
 * unpublish agent, agent workspace doctor, list spaces, PR reviewer
 * approve helper, agent dialogs query). Leaves remaining scripts pure
 * clones, stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/deleteMemory.ts",
  "scripts/unpublishAgent.ts",
  "scripts/readMemory.ts",
  "scripts/doctorAgentWorkspace.ts",
  "scripts/listSpaces.ts",
  "scripts/approvePrAsReviewer.ts",
  "scripts/queryAgentDialogs.ts",
] as const;

describe("toErrorMessage residual batch 16 consumers source contract", () => {
  it("routes pure error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*\w+\.message\s*:\s*String\(\w+\)/,
      );
      expect(source).not.toMatch(
        /\w+\s+instanceof\s+Error\s*\?\s*`失败: \$\{\w+\.message\}`\s*:\s*`失败: \$\{String\(\w+\)\}`/,
      );
    }
  });
});
