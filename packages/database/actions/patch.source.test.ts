import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const patchActionSource = readFileSync(new URL("./patch.ts", import.meta.url), "utf8");

describe("patchAction source contract", () => {
  it("delegates remote scheduling to replication helpers", () => {
    expect(patchActionSource).toContain("scheduleConfiguredPatchReplication");
    expect(patchActionSource).not.toContain("resolveReplicationServers(");
    expect(patchActionSource).not.toContain("schedulePatchReplication(");
  });
});

