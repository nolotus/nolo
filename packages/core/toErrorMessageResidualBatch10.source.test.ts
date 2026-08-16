import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 10) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets scripts/helpers pure coercions plus two verify CLI top-level
 * catches. Leaves remaining verify/probe pure clones, stack||message
 * variants, and non-String fallbacks for later.
 */
const REWIRED_SOURCES = [
  "scripts/helpers/apiHelpers.ts",
  "scripts/helpers/agentClosedLoopVerify.ts",
  "scripts/helpers/dialogDataHelpers.ts",
  "scripts/helpers/agentDataHelpers.ts",
  "scripts/helpers/agentHelpers.ts",
  "scripts/helpers/agentHealthCheck.ts",
  "scripts/verify/verifyAgentDocWiring.ts",
  "scripts/verify/verifyAgentCreationSpec.ts",
] as const;

describe("toErrorMessage residual batch 10 consumers source contract", () => {
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
