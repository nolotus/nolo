import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readActionSource = readFileSync(join(import.meta.dir, "read.ts"), "utf-8");

describe("readAction source contract", () => {
  it("delegates remote record selection to the pure resolution helper", () => {
    const helperCalls =
      readActionSource.match(/pickBestSettledRemoteRecord\(\{/g) ?? [];

    expect(helperCalls.length).toBe(2);
  });

  it("uses replication scheduling directly instead of routing remote backfill through writeAction", () => {
    expect(readActionSource).toContain("scheduleExistingRecordReplication");
    expect(readActionSource).toContain("shouldReplicateLocalRecord");
    expect(readActionSource).not.toContain('from "./write"');
    expect(readActionSource).not.toContain("writeAction(");
  });

  it("returns local data before blocking on preferred-server fetches", () => {
    const localBranchIndex = readActionSource.indexOf("if (localData) {");
    const preferredFetchIndex = readActionSource.indexOf("if (preferredServer) {");

    expect(localBranchIndex).toBeGreaterThan(-1);
    expect(preferredFetchIndex).toBeGreaterThan(-1);
    expect(localBranchIndex).toBeLessThan(preferredFetchIndex);
    expect(readActionSource).toContain(
      "orderedServersForLocalHit.map((server)"
    );
  });
});
