import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

/**
 * Residual pure-clone rewires under packages/ai/tools must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 */
const REWIRED_SOURCES = [
  "./readTool.ts",
  "./listUserSpacesTool.ts",
  "./updateDocTool.ts",
  "./noloWorkspaceReadTools.ts",
  "./toolRunStore.ts",
  "./agent/runLlmTool.ts",
] as const;

describe("toErrorMessage residual consumers source contract", () => {
  it("routes rewired tool error coercions through core/errorMessage", () => {
    for (const relativePath of REWIRED_SOURCES) {
      const source = readSource(relativePath);
      expect(source).toContain('from "core/errorMessage"');
      expect(source).toContain("toErrorMessage(");
      expect(source).not.toMatch(/\w+\?\.message\s*\|\|\s*String\(\w+\)/);
    }
  });
});
