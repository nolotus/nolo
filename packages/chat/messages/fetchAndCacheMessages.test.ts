import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "fetchAndCacheMessages.ts"), "utf-8");

describe("fetchAndCacheMessages tombstone merge source contract", () => {
  it("loads local messages with deleted records so tombstones can win merges", () => {
    expect(source).toContain("includeDeleted: true");
    expect(source).toContain("localMsgs");
    expect(source).toContain("uniqueMap.set(m.id, m)");
  });

  it("uses shared tombstone replacement and filters tombstones from visible results", () => {
    expect(source).toContain("isTombstoneRecord");
    expect(source).toContain("shouldReplaceWithNextRecord");
    expect(source).toContain("shouldReplaceWithNextRecord(m, existing)");
    expect(source).toContain(".filter((message) => !isTombstoneRecord(message))");
  });
});

describe("fetchAndCacheMessages concurrent stream re-read contract", () => {
  it("re-reads local messages after remote settles so stream-end writes survive revalidate", () => {
    expect(source).toContain("freshLocalMsgs");
    expect(source).toContain("fetchLocalMessages(db, dialogId");
    // initial local + fresh local both seed uniqueMap
    expect(source.match(/localMsgs\.forEach/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(source).toContain("freshLocalMsgs.forEach");
  });
});
