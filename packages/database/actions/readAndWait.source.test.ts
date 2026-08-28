import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readAndWaitActionSource = readFileSync(
  join(import.meta.dir, "readAndWait.ts"),
  "utf-8"
);

describe("readAndWaitAction source contract", () => {
  it("uses replication scheduling directly instead of routing remote backfill through writeAction", () => {
    expect(readAndWaitActionSource).toContain("scheduleExistingRecordReplication");
    expect(readAndWaitActionSource).not.toContain('from "./write"');
    expect(readAndWaitActionSource).not.toContain("writeAction(");
  });

  it("keeps public builtin agent reads out of remote backfill writes", () => {
    expect(readAndWaitActionSource).not.toContain("noloWriteRequest(");
    expect(readAndWaitActionSource).not.toContain('dbKey.startsWith("agent-pub-")');
  });

  it("adds builtin platform fallback servers before issuing remote reads", () => {
    expect(readAndWaitActionSource).toContain("resolveAgentReadServers");
    expect(readAndWaitActionSource).toContain("configuredServers");
  });

  it("honors caller-provided preferred server origin when planning remote reads", () => {
    expect(readAndWaitActionSource).toContain("preferredServerOrigin");
    expect(readAndWaitActionSource).toContain(
      "getRuntimeServerContext(state, preferredServerOrigin)"
    );
  });

  it("delegates remote record selection to the pure resolution helper", () => {
    expect(readAndWaitActionSource).toContain("pickBestSettledRemoteRecord");
    expect(readAndWaitActionSource).toContain(
      "compareRemoteRecordsByComparableTime"
    );
  });
});
