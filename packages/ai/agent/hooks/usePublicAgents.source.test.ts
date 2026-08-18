import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "usePublicAgents.ts"), "utf8");

describe("usePublicAgents source contract", () => {
  it("does not let SSR-hydrated previews skip the client refresh", () => {
    expect(source).not.toContain("skippedHydratedPreviewFetchRef");
    expect(source).not.toContain("canUseHydratedPreview");
    expect(source).toContain("fetchData();");
  });

  it("does not let stale local public-agent cache override newer remote records", () => {
    expect(source).toContain("planPublicAgentCatalogView");
  });

  it("keeps public agent catalog planning after local hydration and remote merge", () => {
    expect(source).toContain("planPublicAgentCatalogView");
  });

  it("keeps public-agent catalog planning shared after remote merge", () => {
    expect(source).toContain("planPublicAgentCatalogView");
  });

  it("uses the shared identity helpers for excluded matching and prune dbKey resolution", () => {
    expect(source).toContain("getPublicAgentId,");
    expect(source).toContain("getPublicAgentPruneDbKey");
    expect(source).toContain("matchesPublicAgentIdentifiers");
    expect(source).not.toContain("String(a.id) === id");
    expect(source).not.toContain("String(agent.id) === id");
    expect(source).not.toContain("toDeleteFilteredSet.has(String(a.id))");
  });
});
