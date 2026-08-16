import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const messageSliceSource = readFileSync(
  join(import.meta.dir, "messageSlice.ts"),
  "utf-8"
);

describe("message read path source contract", () => {
  it("reuses fetchAndCacheMessages for init and older-message loading", () => {
    expect(messageSliceSource).toContain('fetchAndCacheMessages');
    expect(messageSliceSource).toContain("await fetchAndCacheMessages({");
    expect(messageSliceSource).not.toContain("fetchConvMsgs(server, token");
  });

  it("derives remote server planning from the runtime snapshot", () => {
    expect(messageSliceSource).toContain('import { getRuntimeServerContext } from "database/runtimeServerContext"');
    expect(messageSliceSource).toContain("getRuntimeServerContext(state)");
    expect(messageSliceSource).not.toContain('selectCurrentServer(state)');
    expect(messageSliceSource).not.toContain('selectSyncServers(state)');
  });
});
