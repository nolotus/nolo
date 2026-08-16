import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "../../../scripts/reconcileProviderBilling.ts"),
  "utf-8"
);

describe("reconcileProviderBilling script source", () => {
  it("supports fixture dry-runs without opening the local DB at module load", () => {
    expect(source).toContain('readOption("--fixture")');
    expect(source).toContain('await import("database-engine/db")');
    expect(source).not.toContain('import serverDb, { ensureServerDbOpen } from "database-engine/db"');
  });

  it("fetches and merges OpenAI usage and costs for live reconciliation", () => {
    expect(source).toContain("normalizeOpenAICostsResponse");
    expect(source).toContain("mergeOpenAIUsageAndCostBuckets");
    expect(source).toContain("/v1/organization/costs");
  });

  it("can enrich DeepInfra reconciliation with request-cost evidence", () => {
    expect(source).toContain("collectDeepInfraRequestIds");
    expect(source).toContain("normalizeDeepInfraRequestCostsResponse");
    expect(source).toContain("/v1/request-costs");
    expect(source).toContain('readOption("--request-costs")');
  });

  it("tries DeepInfra request-costs before falling back to monthly payment usage", () => {
    expect(source).toContain("loadDeepInfraRequestCostBuckets");
    expect(source).toContain("loadDeepInfraMonthlyUsageBuckets");
    expect(source.indexOf("await loadDeepInfraRequestCostBuckets")).toBeLessThan(
      source.indexOf("await loadDeepInfraMonthlyUsageBuckets")
    );
  });
});
