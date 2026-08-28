import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 20) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets remaining scripts pure coercions (agent reference probe +
 * browser provider benchmark). Leaves stack||message variants,
 * non-String fallbacks, webview.js, and CJS probe clones for later.
 */
const REWIRED_SOURCES = [
  "scripts/probes/agentReference.ts",
  "scripts/benchmarks/benchmarkBrowserProviders.ts",
] as const;

describe("toErrorMessage residual batch 20 consumers source contract", () => {
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
