import { describe, expect, it } from "bun:test";

import { createUserPreferenceKey } from "../keys";
import type { AuthorityStore } from "database-engine/authorityStoreTypes";
import {
  collectUserAuthorityMoveRecords,
  importUserAuthorityMoveRecords,
  runUserAuthorityMovePipeline,
  stampMovedAuthorityRecord,
  writeUserAuthorityHomeCutover,
} from "./userAuthorityMove";

const createMapAuthorityStore = (records: Record<string, unknown> = {}): AuthorityStore => {
  const data = new Map(Object.entries(records));
  const store: AuthorityStore = {
    location: "memory://move-test",
    status: "open",
    async open() {},
    async close() {},
    async get(key: string): Promise<any> {
      if (!data.has(key)) {
        const error: any = new Error("NotFound");
        error.notFound = true;
        throw error;
      }
      return data.get(key);
    },
    async put(key: string, value: unknown) {
      data.set(key, value);
    },
    async del(key: string) {
      data.delete(key);
    },
    async batchWrite(ops) {
      for (const op of ops) {
        if (op.type === "put") data.set(op.key, op.value);
        if (op.type === "del") data.delete(op.key);
      }
    },
    createBatch() {
      const ops: Array<{ type: "put"; key: string; value: unknown } | { type: "del"; key: string }> = [];
      return {
        put(key: string, value: unknown) {
          ops.push({ type: "put", key, value });
        },
        del(key: string) {
          ops.push({ type: "del", key });
        },
        async write() {
          await store.batchWrite(ops as any);
        },
      };
    },
    async *iterator(options = {}) {
      const entries = [...data.entries()].sort(([left], [right]) => left.localeCompare(right));
      for (const [key, value] of entries) {
        if (options.gte && key < options.gte) continue;
        if (options.lte && key > options.lte) continue;
        if (options.lt && key >= options.lt) continue;
        yield [key, value];
      }
    },
  };
  return store;
};

describe("user authority move planning", () => {
  it("collects key-owned records and flags record-owner-only records for manual review", async () => {
    const store = createMapAuthorityStore({
      "user:user-1": { userId: "user-1", username: "alice" },
      "user-1-settings": { userId: "user-1", showThinking: false },
      "user-1-profile": { userId: "user-1", nickname: "Alice" },
      "page-user-1-doc-1": { userId: "user-1", title: "Doc" },
      "share-public-token": { userId: "user-1", title: "Public share" },
      "agent-pub-01PUBLIC": { userId: "user-1", isPublic: true },
      "page-user-2-doc-1": { userId: "user-2", title: "Other" },
    });

    const plan = await collectUserAuthorityMoveRecords({
      store,
      userId: "user-1",
    });

    expect(plan.moveableRecords.map((record) => record.dbKey).sort()).toEqual([
      "page-user-1-doc-1",
      "user-1-profile",
      "user-1-settings",
      "user:user-1",
    ]);
    expect(plan.manualReviewRecords.map((record) => record.dbKey).sort()).toEqual([
      "agent-pub-01PUBLIC",
      "share-public-token",
    ]);
    expect(plan.skippedRecordCount).toBe(1);
  });

  it("stamps moved records with target authority while preserving source provenance metadata", () => {
    const stamped = stampMovedAuthorityRecord({
      dbKey: "page-user-1-doc-1",
      record: {
        dbKey: "page-user-1-doc-1",
        userId: "user-1",
        title: "Doc",
        serverOrigin: "https://source.example.com",
      },
      moveId: "move-1",
      sourceServer: "https://source.example.com/",
      targetServer: "https://target.example.com/",
      movedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(stamped).toEqual({
      dbKey: "page-user-1-doc-1",
      userId: "user-1",
      title: "Doc",
      authorityServer: "https://target.example.com",
      serverOrigin: "https://target.example.com",
      authorityMove: {
        moveId: "move-1",
        sourceServer: "https://source.example.com",
        targetServer: "https://target.example.com",
        movedAt: "2026-05-31T00:00:00.000Z",
        previousServerOrigin: "https://source.example.com",
      },
    });
  });

  it("imports moveable records and writes the register-backed authority cutover", async () => {
    const targetStore = createMapAuthorityStore();

    await importUserAuthorityMoveRecords({
      targetStore,
      userId: "user-1",
      moveId: "move-1",
      sourceServer: "https://source.example.com",
      targetServer: "https://target.example.com",
      movedAt: "2026-05-31T00:00:00.000Z",
      records: [
        {
          dbKey: "page-user-1-doc-1",
          record: { dbKey: "page-user-1-doc-1", userId: "user-1", title: "Doc" },
        },
      ],
    });

    expect(await targetStore.get("page-user-1-doc-1")).toEqual(
      expect.objectContaining({
        authorityServer: "https://target.example.com",
        authorityMove: expect.objectContaining({ moveId: "move-1" }),
      })
    );
    expect(await targetStore.get(createUserPreferenceKey.authorityHome("user-1"))).toEqual(
      expect.objectContaining({
        preferenceName: "authority_home",
        value: "https://target.example.com",
        userId: "user-1",
      })
    );
  });

  it("writes a source-side authority-home cutover without touching source records", async () => {
    const sourceStore = createMapAuthorityStore({
      "page-user-1-doc-1": { dbKey: "page-user-1-doc-1", userId: "user-1", title: "Doc" },
    });

    await writeUserAuthorityHomeCutover({
      store: sourceStore,
      userId: "user-1",
      authorityServer: "https://target.example.com/",
    });

    expect(await sourceStore.get("page-user-1-doc-1")).toEqual({
      dbKey: "page-user-1-doc-1",
      userId: "user-1",
      title: "Doc",
    });
    expect(await sourceStore.get(createUserPreferenceKey.authorityHome("user-1"))).toEqual(
      expect.objectContaining({
        preferenceName: "authority_home",
        value: "https://target.example.com",
      })
    );
  });

  it("dry-runs a user authority move without writing target imports or source cutover", async () => {
    const sourceStore = createMapAuthorityStore({
      "page-user-1-doc-1": { dbKey: "page-user-1-doc-1", userId: "user-1", title: "Doc" },
      "share-public-token": { userId: "user-1", title: "Public share" },
      "page-user-2-doc-1": { userId: "user-2", title: "Other" },
    });
    const targetStore = createMapAuthorityStore();

    const result = await runUserAuthorityMovePipeline({
      mode: "dry-run",
      sourceStore,
      targetStore,
      userId: "user-1",
      sourceServer: "https://source.example.com/",
      targetServer: "https://target.example.com/",
      moveId: "move-1",
      movedAt: "2026-05-31T00:00:00.000Z",
      cutoverSource: true,
    });

    expect(result).toEqual({
      mode: "dry-run",
      userId: "user-1",
      moveId: "move-1",
      movedAt: "2026-05-31T00:00:00.000Z",
      sourceServer: "https://source.example.com",
      targetServer: "https://target.example.com",
      moveableCount: 1,
      manualReviewCount: 1,
      skippedRecordCount: 1,
      importedCount: 0,
      sourceCutoverWritten: false,
      moveableRecordKeys: ["page-user-1-doc-1"],
      manualReviewRecordKeys: ["share-public-token"],
    });
    await expect(targetStore.get("page-user-1-doc-1")).rejects.toThrow("NotFound");
    await expect(sourceStore.get(createUserPreferenceKey.authorityHome("user-1"))).rejects.toThrow(
      "NotFound"
    );
  });

  it("refuses apply when manual-review records exist unless explicitly allowed", async () => {
    const sourceStore = createMapAuthorityStore({
      "page-user-1-doc-1": { dbKey: "page-user-1-doc-1", userId: "user-1", title: "Doc" },
      "share-public-token": { userId: "user-1", title: "Public share" },
    });
    const targetStore = createMapAuthorityStore();

    await expect(
      runUserAuthorityMovePipeline({
        mode: "apply",
        sourceStore,
        targetStore,
        userId: "user-1",
        sourceServer: "https://source.example.com",
        targetServer: "https://target.example.com",
        moveId: "move-1",
        movedAt: "2026-05-31T00:00:00.000Z",
      })
    ).rejects.toThrow("manual-review records");

    await expect(targetStore.get("page-user-1-doc-1")).rejects.toThrow("NotFound");
    await expect(sourceStore.get(createUserPreferenceKey.authorityHome("user-1"))).rejects.toThrow(
      "NotFound"
    );
  });

  it("applies moveable records and writes source cutover when requested", async () => {
    const sourceStore = createMapAuthorityStore({
      "page-user-1-doc-1": {
        dbKey: "page-user-1-doc-1",
        userId: "user-1",
        title: "Doc",
        serverOrigin: "https://source.example.com",
      },
      "page-user-2-doc-1": { dbKey: "page-user-2-doc-1", userId: "user-2", title: "Other" },
    });
    const targetStore = createMapAuthorityStore();

    const result = await runUserAuthorityMovePipeline({
      mode: "apply",
      sourceStore,
      targetStore,
      userId: "user-1",
      sourceServer: "https://source.example.com/",
      targetServer: "https://target.example.com/",
      moveId: "move-1",
      movedAt: "2026-05-31T00:00:00.000Z",
      cutoverSource: true,
    });

    expect(result).toEqual({
      mode: "apply",
      userId: "user-1",
      moveId: "move-1",
      movedAt: "2026-05-31T00:00:00.000Z",
      sourceServer: "https://source.example.com",
      targetServer: "https://target.example.com",
      moveableCount: 1,
      manualReviewCount: 0,
      skippedRecordCount: 1,
      importedCount: 1,
      sourceCutoverWritten: true,
      targetAuthorityHomeKey: createUserPreferenceKey.authorityHome("user-1"),
      sourceAuthorityHomeKey: createUserPreferenceKey.authorityHome("user-1"),
      moveableRecordKeys: ["page-user-1-doc-1"],
      manualReviewRecordKeys: [],
    });
    expect(await targetStore.get("page-user-1-doc-1")).toEqual(
      expect.objectContaining({
        authorityServer: "https://target.example.com",
        serverOrigin: "https://target.example.com",
        authorityMove: expect.objectContaining({
          moveId: "move-1",
          sourceServer: "https://source.example.com",
          targetServer: "https://target.example.com",
        }),
      })
    );
    expect(await targetStore.get(createUserPreferenceKey.authorityHome("user-1"))).toEqual(
      expect.objectContaining({
        preferenceName: "authority_home",
        value: "https://target.example.com",
      })
    );
    expect(await sourceStore.get(createUserPreferenceKey.authorityHome("user-1"))).toEqual(
      expect.objectContaining({
        preferenceName: "authority_home",
        value: "https://target.example.com",
      })
    );
    expect(await sourceStore.get("page-user-1-doc-1")).toEqual({
      dbKey: "page-user-1-doc-1",
      userId: "user-1",
      title: "Doc",
      serverOrigin: "https://source.example.com",
    });
  });
});
