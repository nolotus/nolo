import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildUserDataHydrationKey,
  buildUserDataTombstoneSafeHydrationKey,
  type PartialDataStrategy,
  resolveEffectiveUserId,
  shouldUsePartialLocalData,
} from "./useUserData";
import { mergeAndDedupUserData } from "../userDataMerge";
import { getUserDataLoadDecision } from "../userDataLoadDecision";

const source = readFileSync(join(import.meta.dir, "useUserData.ts"), "utf-8");

describe("useUserData source contract", () => {
  it("reloads when user data update events fire", () => {
    expect(source).toContain('window.addEventListener("nolo-user-data-updated", refresh);');
    expect(source).toContain('window.removeEventListener("nolo-user-data-updated", refresh);');
    expect(source).toContain("const pendingRefreshRef = useRef(false);");
    expect(source).toContain('void loadData({ forceRefresh: true });');
  });
  it("optimistically removes a deleted record before reload completes", () => {
    expect(source).toContain("deletedDbKey");
    expect(source).toContain("getItemKey(item) !== deletedDbKey");
    expect(source).toContain("void loadData({ forceRefresh: true });");
  });
  it("persists tombstones to local cache even in summary mode to avoid stale record resurrection", () => {
    expect(source).toContain("isTombstoneRecord(item)");
    expect(source).toContain("recordsToCache");
    expect(source).toContain("cacheMergedUserDataThunk({ records: recordsToCache })");
  });
  it("uses a v2 tombstone-safe hydration key for remote summary partial rendering", () => {
    expect(source).toContain("buildUserDataTombstoneSafeHydrationKey(keyParts)");
    expect(source).toContain("buildUserDataHydrationKey(keyParts)");
    expect(source).toContain("remoteSummary");
  });
  it("persists explicit restore facts in summary mode so old tombstones do not hide restored records", () => {
    // summary 模式现在缓存全部 merged 记录（含 restore），不再单独 filter。
    expect(source).toContain("recordsToCache");
    expect(source).toContain("mergedDataWithDeleted");
  });

  it("queries remote user data using the requested limit directly", () => {
    expect(source).toContain("limit,");
    expect(source).not.toContain("getRemoteUserDataLimit");
    expect(source).not.toContain("remoteQueryLimit");
  });

  it("derives remote server scope from runtime selectors instead of rebuilding it inline", () => {
    expect(source).toContain("selectRuntimeRemoteServers");
    expect(source).toContain("useAppSelector(selectRuntimeRemoteServers)");
    expect(source).not.toContain("getAllServers(");
  });

  it("supports localOnly to keep device-local queries independent of login state", () => {
    expect(source).toContain("localOnly?: boolean");
    expect(source).toContain("resolveEffectiveUserId");
    expect(source).toContain("localOnly || (userId === \"local\" && !currentToken)");
  });
});

describe("getUserDataLoadDecision", () => {
  it("queues forced refreshes while a load is already in flight", () => {
    expect(
      getUserDataLoadDecision({
        loading: true,
        sameParams: true,
        forceRefresh: true,
      })
    ).toBe("queue");
  });

  it("loads immediately for forced refreshes when idle", () => {
    expect(
      getUserDataLoadDecision({
        loading: false,
        sameParams: true,
        forceRefresh: true,
      })
    ).toBe("load");
  });

  it("skips duplicate non-forced loads with unchanged params", () => {
    expect(
      getUserDataLoadDecision({
        loading: false,
        sameParams: true,
      })
    ).toBe("skip");
  });
});

describe("hydrated partial data strategy", () => {
  it("builds hydration keys from user, type, and server scope", () => {
    expect(
      buildUserDataHydrationKey({
        userId: "user-1",
        typesKey: "app,dialog,page",
        serverKey: "https://nolo.chat,https://us.nolo.chat",
      })
    ).toBe(
      "nolo-user-data-hydrated:user-1:app,dialog,page:https://nolo.chat,https://us.nolo.chat"
    );
  });

  it("builds a distinct v2 summary tombstone-safe hydration key", () => {
    const keyParts = {
      userId: "user-1",
      typesKey: "app,dialog,page",
      serverKey: "https://nolo.chat",
    };

    expect(buildUserDataTombstoneSafeHydrationKey(keyParts)).toBe(
      "nolo-user-data-hydrated:v2:summary-tombstone-safe:user-1:app,dialog,page:https://nolo.chat"
    );
    expect(buildUserDataTombstoneSafeHydrationKey(keyParts)).not.toBe(
      buildUserDataHydrationKey(keyParts)
    );
  });

  it("only uses hydrated partial local data when cache is warmed and non-empty", () => {
    const cases: [PartialDataStrategy, boolean, number, boolean][] = [
      ["always", false, 0, true],
      ["never", true, 12, false],
      ["hydrated-cache", false, 12, false],
      ["hydrated-cache", true, 0, false],
      ["hydrated-cache", true, 12, true],
    ];

    for (const [strategy, hasHydratedCache, localItemCount, expected] of cases) {
      expect(
        shouldUsePartialLocalData({
          strategy,
          hasHydratedCache,
          localItemCount,
        })
      ).toBe(expected);
    }
  });
});

describe("mergeAndDedupData", () => {
  it("lets a newer tombstone hide an older active record from another source", () => {
    const merged = mergeAndDedupUserData(
      [],
      [
        {
          data: {
            data: [
              {
                dbKey: "page-u1-1",
                id: "page-u1-1",
                type: "page",
                userId: "u1",
                updatedAt: "2026-03-20T10:00:00.000Z",
              },
            ],
          },
        },
        {
          data: {
            data: [
              {
                dbKey: "page-u1-1",
                id: "page-u1-1",
                type: "page",
                userId: "u1",
                updatedAt: "2026-03-20T11:00:00.000Z",
                deletedAt: "2026-03-20T11:00:00.000Z",
              },
            ],
          },
        },
      ]
    );

    expect(merged).toEqual([]);
  });

  it("keeps a tombstone over a newer active record unless restore is explicit", () => {
    const merged = mergeAndDedupUserData(
      [
        {
          dbKey: "page-u1-restore",
          id: "page-u1-restore",
          type: "page",
          userId: "u1",
          updatedAt: "2026-03-20T10:00:00.000Z",
          deletedAt: "2026-03-20T10:00:00.000Z",
        },
      ],
      [
        {
          data: {
            data: [
              {
                dbKey: "page-u1-restore",
                id: "page-u1-restore",
                type: "page",
                userId: "u1",
                updatedAt: "2026-03-20T11:00:00.000Z",
              },
            ],
          },
        },
      ],
      { includeDeleted: true }
    );

    expect(merged).toEqual([
      expect.objectContaining({
        dbKey: "page-u1-restore",
        deletedAt: "2026-03-20T10:00:00.000Z",
      }),
    ]);
  });

  it("allows an explicit restore to replace a tombstone", () => {
    const merged = mergeAndDedupUserData(
      [
        {
          dbKey: "page-u1-restored",
          id: "page-u1-restored",
          type: "page",
          userId: "u1",
          updatedAt: "2026-03-20T10:00:00.000Z",
          deletedAt: "2026-03-20T10:00:00.000Z",
        },
      ],
      [
        {
          data: {
            data: [
              {
                dbKey: "page-u1-restored",
                id: "page-u1-restored",
                type: "page",
                userId: "u1",
                updatedAt: "2026-03-20T11:00:00.000Z",
                restoredAt: "2026-03-20T11:00:00.000Z",
              },
            ],
          },
        },
      ],
      { includeDeleted: true }
    );

    expect(merged).toEqual([
      expect.objectContaining({
        dbKey: "page-u1-restored",
        restoredAt: "2026-03-20T11:00:00.000Z",
      }),
    ]);
    expect(merged[0]).not.toHaveProperty("deletedAt");
  });

  it("preserves remote server origin when a local cached copy ties on timestamp", () => {
    const merged = mergeAndDedupUserData(
      [
        {
          dbKey: "page-u1-2",
          id: "page-u1-2",
          type: "page",
          userId: "u1",
          updatedAt: "2026-03-20T11:00:00.000Z",
        },
      ],
      [
        {
          data: {
            data: [
              {
                dbKey: "page-u1-2",
                id: "page-u1-2",
                type: "page",
                userId: "u1",
                updatedAt: "2026-03-20T11:00:00.000Z",
                serverOrigin: "https://us.nolo.chat",
              },
            ],
          },
        },
      ]
    );

    expect(merged).toEqual([
      expect.objectContaining({
        dbKey: "page-u1-2",
        serverOrigin: "https://us.nolo.chat",
      }),
    ]);
  });
});

describe("resolveEffectiveUserId", () => {
  it("keeps local owner when localOnly is true even if logged in", () => {
    expect(
      resolveEffectiveUserId({
        requestedUserId: "local",
        currentUserId: "user1",
        currentToken: "token",
        localOnly: true,
      })
    ).toBe("local");
  });

  it("maps local to current account when logged in and not localOnly", () => {
    expect(
      resolveEffectiveUserId({
        requestedUserId: "local",
        currentUserId: "user1",
        currentToken: "token",
        localOnly: false,
      })
    ).toBe("user1");
  });

  it("keeps local owner when logged out", () => {
    expect(
      resolveEffectiveUserId({
        requestedUserId: "local",
        currentUserId: null,
        currentToken: null,
        localOnly: false,
      })
    ).toBe("local");
  });

  it("passes through an explicit account userId", () => {
    expect(
      resolveEffectiveUserId({
        requestedUserId: "user1",
        currentUserId: "user2",
        currentToken: "token",
        localOnly: false,
      })
    ).toBe("user1");
  });

  it("keeps local owner when localOnly is true regardless of requested userId", () => {
    expect(
      resolveEffectiveUserId({
        requestedUserId: "user1",
        currentUserId: "user2",
        currentToken: "token",
        localOnly: true,
      })
    ).toBe("local");
  });
});
