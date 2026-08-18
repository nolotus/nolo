import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 17) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions (main release-control doctor,
 * read space, upsert table meta, delete spaces, desktop downloads publisher,
 * httpReady/browserDebug helpers). Leaves remaining scripts pure clones,
 * stack||message variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/doctorMainReleaseControl.ts",
  "scripts/readSpace.ts",
  "scripts/upsertTableMeta.ts",
  "scripts/deleteSpaces.ts",
  "scripts/dev/httpReady.ts",
  "scripts/dev/browserDebug.ts",
] as const;

describe("toErrorMessage residual batch 17 consumers source contract", () => {
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
