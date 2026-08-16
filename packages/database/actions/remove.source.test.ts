import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const removeActionSource = readFileSync(new URL("./remove.ts", import.meta.url), "utf8");

describe("removeAction source contract", () => {
  it("keeps background remote deletes inside replication helpers", () => {
    expect(removeActionSource).toContain("scheduleDeleteReplication");
    expect(removeActionSource).not.toContain("resolveReplicationServers(");
    expect(removeActionSource).not.toContain("deleteFromReplicationServers(");
  });
});
