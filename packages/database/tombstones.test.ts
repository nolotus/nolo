import { describe, expect, it } from "bun:test";

import {
  buildRestorePatch,
  canPhysicallyPurgeTombstoneRecord,
  compactTombstoneRecord,
  shouldReplaceWithNextRecord,
} from "./tombstones";

describe("tombstone merge policy", () => {
  it("keeps tombstone over a newer ordinary active record", () => {
    expect(
      shouldReplaceWithNextRecord(
        {
          dbKey: "page-user-1",
          type: "page",
          updatedAt: "2026-03-20T12:00:00.000Z",
        },
        {
          dbKey: "page-user-1",
          type: "page",
          deletedAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        }
      )
    ).toBe(false);
  });

  it("allows explicit restore newer than tombstone", () => {
    expect(
      shouldReplaceWithNextRecord(
        {
          dbKey: "page-user-1",
          type: "page",
          restoredAt: "2026-03-20T12:00:00.000Z",
          updatedAt: "2026-03-20T12:00:00.000Z",
        },
        {
          dbKey: "page-user-1",
          type: "page",
          deletedAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:00:00.000Z",
        }
      )
    ).toBe(true);
  });

  it("builds restore patches with restore and update timestamps", () => {
    expect(buildRestorePatch("2026-03-20T12:00:00.000Z")).toEqual({
      deletedAt: null,
      restoredAt: "2026-03-20T12:00:00.000Z",
      updatedAt: "2026-03-20T12:00:00.000Z",
    });
  });
});

describe("tombstone compaction and purge policy", () => {
  it("compacts heavy tombstones without deleting the deletion fact", () => {
    const compacted = compactTombstoneRecord({
      dbKey: "page-user-2",
      type: "page",
      userId: "user-1",
      title: "Deleted page",
      body: "heavy body that should not stay in a compact tombstone",
      deletedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    expect(compacted).toMatchObject({
      dbKey: "page-user-2",
      type: "page",
      userId: "user-1",
      title: "Deleted page",
      deletedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    expect(compacted).not.toHaveProperty("body");
  });

  it("refuses age-only physical purge", () => {
    const tombstone = {
      dbKey: "page-user-3",
      deletedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(canPhysicallyPurgeTombstoneRecord(tombstone)).toBe(false);
    expect(canPhysicallyPurgeTombstoneRecord(tombstone, { explicitPurge: true })).toBe(true);
    expect(canPhysicallyPurgeTombstoneRecord(tombstone, { explicitPurge: false })).toBe(false);
  });

  it("never physically purges active records", () => {
    expect(
      canPhysicallyPurgeTombstoneRecord(
        { dbKey: "page-user-4", type: "page", updatedAt: "2026-06-01T00:00:00.000Z" },
        { explicitPurge: true }
      )
    ).toBe(false);
  });
});
