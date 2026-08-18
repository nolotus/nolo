import { beforeEach, describe, expect, it, mock } from "bun:test";

import {
  bindSyncMappingClientDb,
  clearSyncMappings,
  getSyncMapping,
} from "database/sync/syncMapping";
import { MemoryDB } from "database-engine/MemoryDB";

/**
 * Adapter contract: dispatch(read/write) with account userId, no fetch/shadow store.
 * mock.module replaces dbSlice so dispatch receives plain {dbKey}/{data,userId} args.
 * Installed inside a loader (not top-level) for bun mock isolation.
 */
const loadAdapter = async () => {
  mock.module("database/dbSlice", () => ({
    read: (args: { dbKey: string }) => args,
    write: (args: {
      data: Record<string, unknown>;
      customKey?: string;
      userId?: string;
    }) => args,
  }));
  return import(`./runSyncStandaloneAgentToAccount.ts?test=${Date.now()}-${Math.random()}`);
};

const { runSyncStandaloneAgentToAccount } = await loadAdapter();

describe("runSyncStandaloneAgentToAccount production adapter", () => {
  beforeEach(() => {
    clearSyncMappings();
    bindSyncMappingClientDb(null);
  });

  it("calls db.write with account userId + sync snapshot; no auto path beyond explicit invoke", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);

    const localAgentKey = "agent-local-01ADAPTER";
    const localAgent = {
      dbKey: localAgentKey,
      id: "01ADAPTER",
      name: "Adapter local agent",
      type: "agent",
      userId: "local",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "sk-must-not-upload",
    };

    const writes: Array<{
      data: Record<string, unknown>;
      customKey?: string;
      userId?: string;
    }> = [];
    const reads: string[] = [];

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") {
          throw new Error("expected read/write arg object");
        }
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg)) {
          const key = String(arg.dbKey);
          reads.push(key);
          if (key === localAgentKey) return { ...localAgent };
          return null;
        }
        if ("data" in arg) {
          const w = {
            data: arg.data as Record<string, unknown>,
            customKey: arg.customKey as string | undefined,
            userId: arg.userId as string | undefined,
          };
          writes.push(w);
          const customKey =
            typeof w.customKey === "string"
              ? w.customKey
              : "agent-userA-remote";
          return {
            ...(w.data as object),
            dbKey: customKey,
            userId: w.userId,
          };
        }
        throw new Error(`unexpected arg: ${JSON.stringify(arg)}`);
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runSyncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      dispatch
    );

    expect(result.accountUserId).toBe("userA");
    expect(result.localDbKey).toBe(localAgentKey);
    expect(result.reused).toBe(false);
    expect(reads).toContain(localAgentKey);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.userId).toBe("userA");
    expect(writes[0]?.data).toMatchObject({ name: "Adapter local agent" });
    expect(writes[0]?.data).not.toHaveProperty("apiKey");
    expect(getSyncMapping(localAgentKey, "userA")?.remoteDbKey).toBe(
      result.remoteDbKey
    );
  });

  it("reuses existing mapping without a second account write (cold hydrate)", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);

    const localAgentKey = "agent-local-01IDEM";
    const remoteDbKey = "agent-userA-01IDEM";
    // Durable write-through so cold ensureSyncMappingsHydrated restores the pair.
    const { putSyncMappingDurable, clearSyncMappings: clearMem } = await import(
      "database/sync/syncMapping"
    );
    await putSyncMappingDurable({
      localDbKey: localAgentKey,
      remoteDbKey,
      accountUserId: "userA",
      contentType: "agent",
      updatedAt: 1,
    });
    // Simulate process restart: memory cleared, durable rows remain.
    clearMem();
    bindSyncMappingClientDb(db);

    const writes: unknown[] = [];
    const remote = {
      dbKey: remoteDbKey,
      name: "Already on account",
      userId: "userA",
      type: "agent",
    };

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (action && typeof action === "object" && "dbKey" in action) {
          const key = String((action as { dbKey: string }).dbKey);
          if (key === remoteDbKey) return remote;
          if (key === localAgentKey) {
            return {
              dbKey: localAgentKey,
              name: "Local",
              userId: "local",
              type: "agent",
            };
          }
          return null;
        }
        if (action && typeof action === "object" && "data" in action) {
          writes.push(action);
          return action;
        }
        return null;
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runSyncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      dispatch
    );

    expect(result.reused).toBe(true);
    expect(result.remoteDbKey).toBe(remoteDbKey);
    expect(writes).toHaveLength(0);
  });
});
