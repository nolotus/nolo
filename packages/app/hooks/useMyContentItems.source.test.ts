import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "useMyContentItems.ts"), "utf-8");

describe("useMyContentItems source contract", () => {
  it("uses hydrated cache strategy so warm recent data can render locally before refresh", () => {
    expect(source).toContain('partialDataStrategy: "hydrated-cache"');
  });

  it("requests lightweight remote summaries for recent content lists", () => {
    expect(source).toContain("remoteSummary: true");
  });

  it("queries device-local records independently of login state", () => {
    expect(source).toContain('localOnly: true');
    expect(source).toContain('useUserData(queriedTypes, "local", queryLimit,');
  });

  it("queries account records with the active user id", () => {
    expect(source).toContain('useUserData(queriedTypes, userId, queryLimit,');
  });

  it("deduplicates merged local and account records with explicit sync mappings", () => {
    expect(source).toContain("deduplicateContentRecordsWithMappings");
    expect(source).toContain('from "database/sync/syncMapping"');
    expect(source).toContain("listSyncMappings");
    expect(source).toContain("localRecords");
    expect(source).toContain("accountRecords");
  });

  it("hydrates durable mappings outside render and does not write during list", () => {
    expect(source).toContain("ensureSyncMappingsHydrated");
    expect(source).toContain("bindSyncMappingClientDb");
    expect(source).not.toContain("putSyncMapping(");
    expect(source).not.toContain("putSyncMappingDurable");
  });

  it("subscribes to mapping version outside render for deterministic dedupe recompute", () => {
    expect(source).toContain("useSyncExternalStore");
    expect(source).toContain("subscribeSyncMappingVersion");
    expect(source).toContain("getSyncMappingVersion");
    expect(source).toContain("mappingVersion");
    expect(source).not.toContain("setMappingHydrateEpoch");
  });
});
