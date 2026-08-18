import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 18) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions (platform-agents / worktrees /
 * revenue-share audits, file-blob plan+apply cleanup, skill runtime demo,
 * dialog image-url migrate ops). Leaves remaining scripts pure clones,
 * stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/audits/auditPlatformAgents.ts",
  "scripts/audits/planFileBlobCleanup.ts",
  "scripts/audits/auditWorktrees.ts",
  "scripts/audits/reportRevenueShare.ts",
  "scripts/audits/applyFileBlobCleanup.ts",
  "scripts/experiments/skillRuntimeDemo.ts",
  "scripts/ops/migrateDialogImageUrlPayloadsViaApi.ts",
] as const;

describe("toErrorMessage residual batch 18 consumers source contract", () => {
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
