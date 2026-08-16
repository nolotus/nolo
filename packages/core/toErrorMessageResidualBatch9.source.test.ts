import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf-8");

/**
 * Residual pure-clone rewires (batch 9) must stay on the shared
 * core/errorMessage seam so Error vs non-Error handling cannot drift.
 *
 * Targets billing audit CLI top-level catch coercions. Leaves remaining
 * audit/verify/probe pure clones and custom-fallback UI strings for later.
 */
const REWIRED_SOURCES = [
  "scripts/audits/reportBillingUsage.ts",
  "scripts/audits/repairRemoteBillingLedgerDeletedUserProjections.ts",
  "scripts/audits/syncBillingLedgerWitness.ts",
  "scripts/audits/auditRemoteBillingLedger.ts",
  "scripts/audits/reportCreatorEarnings.ts",
  "scripts/audits/simulateBillingFullChain.ts",
  "scripts/audits/reportBillingOverview.ts",
  "scripts/audits/reportCreatorSettlement.ts",
] as const;

describe("toErrorMessage residual batch 9 consumers source contract", () => {
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
