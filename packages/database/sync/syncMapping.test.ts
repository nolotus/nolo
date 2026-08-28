import { beforeEach, describe, expect, test } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import { resolveAuthorityReplicationServers } from "database/actions/replication";

import {
  areSyncMappingsHydrated,
  bindSyncMappingClientDb,
  clearSyncMappings,
  createSyncMappingStore,
  ensureSyncMappingsHydrated,
  getSyncMapping,
  getSyncMappingVersion,
  listSyncMappings,
  normalizeSyncMapping,
  putSyncMapping,
  putSyncMappingDurable,
  removeSyncMapping,
  subscribeSyncMappingVersion,
} from "./syncMapping";
import { deduplicateContentRecordsWithMappings } from "app/utils/myContentItems";
import {
  buildSyncMappingRecordKey,
  isSyncMappingRecordKey,
  SYNC_MAPPING_KEY_PREFIX,
  SYNC_MAPPING_RECORD_TYPE,
} from "./syncMappingKeys";
import {
  loadSyncMappingsFromDb,
  persistSyncMappingToDb,
  toDurableSyncMappingRecord,
} from "./syncMappingDurable";

describe("syncMapping", () => {
  beforeEach(() => {
    clearSyncMappings();
    bindSyncMappingClientDb(null);
  });

  test("normalizes and requires distinct local/remote keys and non-local account", () => {
    const mapping = normalizeSyncMapping({
      localDbKey: "  agent-local-a1  ",
      remoteDbKey: " agent-user1-a1 ",
      accountUserId: " user1 ",
      contentType: "agent",
      updatedAt: 100,
    });

    expect(mapping).toEqual({
      localDbKey: "agent-local-a1",
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 100,
    });

    expect(() =>
      normalizeSyncMapping({
        localDbKey: "same",
        remoteDbKey: "same",
        accountUserId: "user1",
        contentType: "agent",
      })
    ).toThrow(/must differ/);

    expect(() =>
      normalizeSyncMapping({
        localDbKey: "agent-local-a1",
        remoteDbKey: "agent-user1-a1",
        accountUserId: "local",
        contentType: "agent",
      })
    ).toThrow(/non-local/);
  });

  test("put/get/list/remove round-trip with account filter", () => {
    const store = createSyncMappingStore({ now: () => 1_700_000_000_000 });

    store.put({
      localDbKey: "agent-local-a1",
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      contentType: "agent",
    });
    store.put({
      localDbKey: "dialog-local-d1",
      remoteDbKey: "dialog-user2-d1",
      accountUserId: "user2",
      contentType: "dialog",
      updatedAt: 99,
    });

    expect(store.get("agent-local-a1", "user1")).toMatchObject({
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      updatedAt: 1_700_000_000_000,
    });
    expect(store.get("agent-local-a1", "user2")).toBeNull();
    expect(store.getByRemoteDbKey("dialog-user2-d1")?.localDbKey).toBe(
      "dialog-local-d1"
    );
    expect(store.list({ accountUserId: "user1" })).toHaveLength(1);
    expect(store.list({ contentType: "dialog" })).toHaveLength(1);
    expect(store.size()).toBe(2);

    expect(store.remove("agent-local-a1", "user1")).toBe(true);
    expect(store.get("agent-local-a1", "user1")).toBeNull();
    expect(store.getByRemoteDbKey("agent-user1-a1")).toBeNull();
    expect(store.size()).toBe(1);

    store.clear();
    expect(store.list()).toEqual([]);
  });

  test("account-scoped pairs allow same local key under A and B", () => {
    const store = createSyncMappingStore();
    store.put({
      localDbKey: "agent-local-shared",
      remoteDbKey: "agent-userA-r1",
      accountUserId: "userA",
      contentType: "agent",
      updatedAt: 1,
    });
    store.put({
      localDbKey: "agent-local-shared",
      remoteDbKey: "agent-userB-r1",
      accountUserId: "userB",
      contentType: "agent",
      updatedAt: 2,
    });

    expect(store.get("agent-local-shared", "userA")?.remoteDbKey).toBe(
      "agent-userA-r1"
    );
    expect(store.get("agent-local-shared", "userB")?.remoteDbKey).toBe(
      "agent-userB-r1"
    );
    expect(store.list({ accountUserId: "userA" })).toHaveLength(1);
    expect(store.list({ accountUserId: "userB" })).toHaveLength(1);
  });

  test("replacing a remote key displaces the previous mapping", () => {
    const store = createSyncMappingStore();
    store.put({
      localDbKey: "agent-local-old",
      remoteDbKey: "agent-user1-shared",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 1,
    });
    store.put({
      localDbKey: "agent-local-new",
      remoteDbKey: "agent-user1-shared",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 2,
    });

    expect(store.get("agent-local-old", "user1")).toBeNull();
    expect(store.getByRemoteDbKey("agent-user1-shared")?.localDbKey).toBe(
      "agent-local-new"
    );
  });

  test("durable keys stay outside content type prefixes", () => {
    const key = buildSyncMappingRecordKey("user1", "agent-local-a1");
    expect(key.startsWith(SYNC_MAPPING_KEY_PREFIX)).toBe(true);
    expect(isSyncMappingRecordKey(key)).toBe(true);
    expect(key.startsWith("agent-")).toBe(false);
    expect(key.startsWith("dialog-")).toBe(false);
    expect(key.startsWith("meta-")).toBe(false);
  });

  test("persistence round-trip / restart simulation via MemoryDB", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);

    await putSyncMappingDurable({
      localDbKey: "agent-local-a1",
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 42,
    });

    // Simulate process restart: clear memory, keep durable rows.
    clearSyncMappings();
    expect(areSyncMappingsHydrated()).toBe(false);
    expect(listSyncMappings()).toEqual([]);

    const didLoad = await ensureSyncMappingsHydrated(db);
    expect(didLoad).toBe(true);
    expect(areSyncMappingsHydrated()).toBe(true);
    expect(getSyncMapping("agent-local-a1", "user1")).toMatchObject({
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      updatedAt: 42,
    });

    // Second hydrate is a no-op load.
    expect(await ensureSyncMappingsHydrated(db)).toBe(false);
  });

  test("durable mapping records are non-replicated (owner local)", async () => {
    const record = toDurableSyncMappingRecord({
      localDbKey: "agent-local-a1",
      remoteDbKey: "agent-user1-a1",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 1,
    });
    expect(record.userId).toBe("local");
    expect(record.type).toBe(SYNC_MAPPING_RECORD_TYPE);

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: record.dbKey,
      record,
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: { user1: "https://self.example.com" },
        },
      },
    });
    expect(servers).toEqual([]);
  });

  test("auth-reset clear drops memory but durable A rows rehydrate", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);
    await putSyncMappingDurable({
      localDbKey: "agent-local-a1",
      remoteDbKey: "agent-userA-a1",
      accountUserId: "userA",
      contentType: "agent",
    });
    await putSyncMappingDurable({
      localDbKey: "agent-local-b1",
      remoteDbKey: "agent-userB-b1",
      accountUserId: "userB",
      contentType: "agent",
    });

    // Account switch: clear process memory only.
    clearSyncMappings();
    expect(listSyncMappings({ accountUserId: "userA" })).toEqual([]);
    expect(listSyncMappings({ accountUserId: "userB" })).toEqual([]);

    // Durable rows still on device.
    const durable = await loadSyncMappingsFromDb(db);
    expect(durable).toHaveLength(2);

    await ensureSyncMappingsHydrated(db);
    expect(listSyncMappings({ accountUserId: "userA" })).toHaveLength(1);
    expect(listSyncMappings({ accountUserId: "userB" })).toHaveLength(1);
    // Account B filter never returns A remote keys.
    expect(
      listSyncMappings({ accountUserId: "userB" }).map((m) => m.remoteDbKey)
    ).toEqual(["agent-userB-b1"]);
  });

  test("default put stays in-memory when no db bound", () => {
    putSyncMapping({
      localDbKey: "agent-local-x",
      remoteDbKey: "agent-user1-x",
      accountUserId: "user1",
      contentType: "agent",
    });
    expect(getSyncMapping("agent-local-x", "user1")?.remoteDbKey).toBe(
      "agent-user1-x"
    );
  });

  test("persist helper writes owner-local record", async () => {
    const db = new MemoryDB();
    const record = await persistSyncMappingToDb(db, {
      localDbKey: "agent-local-z",
      remoteDbKey: "agent-user1-z",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 9,
    });
    const stored = await db.get(record.dbKey);
    expect(stored).toMatchObject({
      type: SYNC_MAPPING_RECORD_TYPE,
      userId: "local",
      localDbKey: "agent-local-z",
      accountUserId: "user1",
    });
  });

  test("putSyncMappingDurable fails closed when no client DB is bound", async () => {
    bindSyncMappingClientDb(null);
    await expect(
      putSyncMappingDurable({
        localDbKey: "agent-local-nodb",
        remoteDbKey: "agent-user1-nodb",
        accountUserId: "user1",
        contentType: "agent",
      })
    ).rejects.toThrow(/bound client DB|memory-only durability/);
    expect(getSyncMapping("agent-local-nodb", "user1")).toBeNull();
    expect(listSyncMappings()).toEqual([]);
  });

  test("mapping version notifies only on consumer-visible put/remove/clear changes", () => {
    const versions: number[] = [];
    const unsub = subscribeSyncMappingVersion(() => {
      versions.push(getSyncMappingVersion());
    });
    const v0 = getSyncMappingVersion();

    putSyncMapping({
      localDbKey: "agent-local-notify",
      remoteDbKey: "agent-user1-notify",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 1,
    });
    expect(getSyncMappingVersion()).toBeGreaterThan(v0);
    expect(versions.length).toBe(1);

    // Same consumer-visible mapping (only updatedAt differs) → no notify.
    putSyncMapping({
      localDbKey: "agent-local-notify",
      remoteDbKey: "agent-user1-notify",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 99,
    });
    expect(versions.length).toBe(1);

    // Remote key change → notify.
    putSyncMapping({
      localDbKey: "agent-local-notify",
      remoteDbKey: "agent-user1-notify-v2",
      accountUserId: "user1",
      contentType: "agent",
    });
    expect(versions.length).toBe(2);

    expect(removeSyncMapping("agent-local-notify", "user1")).toBe(true);
    expect(versions.length).toBe(3);

    // Empty remove → no notify.
    expect(removeSyncMapping("agent-local-notify", "user1")).toBe(false);
    expect(versions.length).toBe(3);

    putSyncMapping({
      localDbKey: "agent-local-notify2",
      remoteDbKey: "agent-user1-notify2",
      accountUserId: "user1",
      contentType: "agent",
    });
    expect(versions.length).toBe(4);
    clearSyncMappings();
    expect(versions.length).toBe(5);

    // Second clear on empty store → no notify.
    clearSyncMappings();
    expect(versions.length).toBe(5);

    unsub();
  });

  test("mapping put notification allows merged list to recompute; cold hydrate notifies without render writes", async () => {
    const localKey = "agent-local-merge";
    const remoteKey = "agent-user1-merge";
    const local = {
      dbKey: localKey,
      userId: "local",
      type: "agent",
      name: "Local",
    };
    const remote = {
      dbKey: remoteKey,
      userId: "user1",
      type: "agent",
      name: "Remote",
    };

    let mappingVersion = getSyncMappingVersion();
    const unsub = subscribeSyncMappingVersion(() => {
      mappingVersion = getSyncMappingVersion();
    });

    // Before mapping: both rows remain.
    let merged = deduplicateContentRecordsWithMappings(
      [local, remote],
      listSyncMappings({ accountUserId: "user1" })
    );
    expect(merged).toHaveLength(2);

    putSyncMapping({
      localDbKey: localKey,
      remoteDbKey: remoteKey,
      accountUserId: "user1",
      contentType: "agent",
    });
    // Subscription saw the put (version advanced outside render).
    expect(mappingVersion).toBe(getSyncMappingVersion());

    merged = deduplicateContentRecordsWithMappings(
      [local, remote],
      listSyncMappings({ accountUserId: "user1" })
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.dbKey).toBe(remoteKey);

    // Cold hydrate: clear memory, reload durable → notify once load commits.
    const memDb = new MemoryDB();
    bindSyncMappingClientDb(memDb);
    await putSyncMappingDurable({
      localDbKey: localKey,
      remoteDbKey: remoteKey,
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 5,
    });
    clearSyncMappings();
    expect(getSyncMapping(localKey, "user1")).toBeNull();

    const versionBeforeHydrate = getSyncMappingVersion();
    const didLoad = await ensureSyncMappingsHydrated(memDb);
    expect(didLoad).toBe(true);
    expect(getSyncMappingVersion()).toBeGreaterThan(versionBeforeHydrate);
    expect(getSyncMapping(localKey, "user1")?.remoteDbKey).toBe(remoteKey);

    unsub();
  });

  test("stale in-flight hydrate is ignored after clear/bind epoch bump", async () => {
    /**
     * Deferred iterator: old DB hydrate resolves after clear + new bind.
     * Generation guard must drop old rows and not mark hydrated for new binding
     * until the current DB is loaded.
     */
    const oldDb = new MemoryDB();
    const newDb = new MemoryDB();

    await persistSyncMappingToDb(oldDb, {
      localDbKey: "agent-local-old",
      remoteDbKey: "agent-user1-old",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 1,
    });
    await persistSyncMappingToDb(newDb, {
      localDbKey: "agent-local-new",
      remoteDbKey: "agent-user1-new",
      accountUserId: "user1",
      contentType: "agent",
      updatedAt: 2,
    });

    let releaseOldIterator: (() => void) | undefined;
    const oldIteratorGate = new Promise<void>((resolve) => {
      releaseOldIterator = resolve;
    });

    const deferredOldDb = {
      get: (key: string) => oldDb.get(key),
      put: (key: string, value: unknown) => oldDb.put(key, value),
      del: (key: string) => oldDb.del(key),
      iterator: (options?: {
        gte?: string;
        lte?: string;
        lt?: string;
        reverse?: boolean;
      }) => {
        const inner = oldDb.iterator(options);
        return {
          async *[Symbol.asyncIterator]() {
            await oldIteratorGate;
            for await (const entry of inner as AsyncIterable<unknown>) {
              yield entry;
            }
          },
        };
      },
    };

    bindSyncMappingClientDb(deferredOldDb);
    const staleHydrate = ensureSyncMappingsHydrated();

    // Reset/switch before old iterator yields.
    clearSyncMappings();
    bindSyncMappingClientDb(newDb);

    releaseOldIterator?.();
    const staleDidLoad = await staleHydrate;
    expect(staleDidLoad).toBe(false);
    expect(areSyncMappingsHydrated()).toBe(false);
    expect(getSyncMapping("agent-local-old", "user1")).toBeNull();
    expect(listSyncMappings()).toEqual([]);

    // Current binding loads normally after stale resolve.
    const currentDidLoad = await ensureSyncMappingsHydrated();
    expect(currentDidLoad).toBe(true);
    expect(areSyncMappingsHydrated()).toBe(true);
    expect(getSyncMapping("agent-local-old", "user1")).toBeNull();
    expect(getSyncMapping("agent-local-new", "user1")).toMatchObject({
      remoteDbKey: "agent-user1-new",
      accountUserId: "user1",
      updatedAt: 2,
    });
  });
});
