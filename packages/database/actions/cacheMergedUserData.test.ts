import { describe, expect, it } from "bun:test";

import { shouldUpdateLocalUserDataCache } from "./cacheMergedUserData";

describe("shouldUpdateLocalUserDataCache", () => {
  it("writes when there is no local cached record", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T00:00:00.000Z",
        },
        null
      )
    ).toBe(true);
  });

  it("writes when the merged record is newer than local cache", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T01:00:00.000Z",
        },
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T00:00:00.000Z",
        }
      )
    ).toBe(true);
  });

  it("writes when merged metadata adds serverOrigin on tied timestamps", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T01:00:00.000Z",
          serverOrigin: "https://us.nolo.chat",
        },
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T01:00:00.000Z",
        }
      )
    ).toBe(true);
  });

  it("skips writes when local cache is already as new or newer", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T00:00:00.000Z",
        },
        {
          dbKey: "page-u1-1",
          updatedAt: "2026-03-23T01:00:00.000Z",
          serverOrigin: "https://nolo.chat",
        }
      )
    ).toBe(false);
  });

  it("skips active cache writes when local cache has a tombstone", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-2",
          updatedAt: "2026-03-23T03:00:00.000Z",
        },
        {
          dbKey: "page-u1-2",
          updatedAt: "2026-03-23T02:00:00.000Z",
          deletedAt: "2026-03-23T02:00:00.000Z",
        }
      )
    ).toBe(false);
  });


  it("skips active cache writes with serverOrigin when local cache has a tombstone", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-2b",
          updatedAt: "2026-03-23T03:00:00.000Z",
          serverOrigin: "https://us.nolo.chat",
        },
        {
          dbKey: "page-u1-2b",
          updatedAt: "2026-03-23T02:00:00.000Z",
          deletedAt: "2026-03-23T02:00:00.000Z",
        }
      )
    ).toBe(false);
  });
  it("allows explicit restore cache writes over a local tombstone", () => {
    expect(
      shouldUpdateLocalUserDataCache(
        {
          dbKey: "page-u1-3",
          updatedAt: "2026-03-23T03:00:00.000Z",
          restoredAt: "2026-03-23T03:00:00.000Z",
        },
        {
          dbKey: "page-u1-3",
          updatedAt: "2026-03-23T02:00:00.000Z",
          deletedAt: "2026-03-23T02:00:00.000Z",
        }
      )
    ).toBe(true);
  });
});
