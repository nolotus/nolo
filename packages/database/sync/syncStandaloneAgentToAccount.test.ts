import { beforeEach, describe, expect, test } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import {
  deduplicateContentRecordsWithMappings,
} from "app/utils/myContentItems";

import {
  bindSyncMappingClientDb,
  clearSyncMappings,
  createSyncMappingStore,
  ensureSyncMappingsHydrated,
  getSyncMapping,
  listSyncMappings,
  putSyncMappingDurable,
} from "./syncMapping";
import { createSyncJobRegistry } from "./syncJobRegistry";
import {
  agentSnapshotContainsSecrets,
  stripAgentForAccountSync,
} from "./stripAgentForAccountSync";
import { syncStandaloneAgentToAccount } from "./syncStandaloneAgentToAccount";

const localAgentKey = "agent-local-01LOCALAGENT";

const makeLocalAgent = (overrides: Record<string, unknown> = {}) => ({
  id: "01LOCALAGENT",
  type: "agent",
  userId: "local",
  dbKey: localAgentKey,
  name: "Local Coder",
  provider: "openai",
  model: "gpt-test",
  prompt: "be helpful",
  apiKey: "sk-secret-raw-key-should-never-upload",
  apiKeyRef: "openai",
  credentialRef: "api-key:agent-local-01LOCALAGENT",
  password: "super-secret",
  accessToken: "tok_live_should_strip",
  runtimeBinding: {
    machineId: "machine-1",
    ownerUserId: "local",
    localBrokerPath: "/Users/me/.nolo/credentials",
  },
  dialogs: [{ id: "dialog-local-1", title: "private chat" }],
  messages: [{ id: "m1", content: "secret history" }],
  dialogCount: 3,
  messageCount: 12,
  ...overrides,
});

describe("stripAgentForAccountSync", () => {
  test("strips secrets, dialog/history, credentialRef, and non-OAuth apiKeyRef", () => {
    const snapshot = stripAgentForAccountSync({
      localAgent: makeLocalAgent({ apiKeyHeader: "Authorization" }),
      accountUserId: "userA",
      agentId: "01REMOTEAGENT",
      now: 1000,
    });

    expect(snapshot.userId).toBe("userA");
    expect(snapshot.dbKey).toBe("agent-userA-01REMOTEAGENT");
    expect(snapshot.isPublic).toBe(false);
    expect(snapshot.name).toBe("Local Coder");
    expect(snapshot.apiKey).toBeUndefined();
    expect(snapshot.password).toBeUndefined();
    expect(snapshot.accessToken).toBeUndefined();
    expect(snapshot.runtimeBinding).toBeUndefined();
    expect(snapshot.dialogs).toBeUndefined();
    expect(snapshot.messages).toBeUndefined();
    expect(snapshot.dialogCount).toBe(0);
    expect(snapshot.messageCount).toBe(0);
    // Non-OAuth apiKeyRef and unsynced machine-local credentialRef stay local.
    expect(snapshot.apiKeyRef).toBeUndefined();
    expect(snapshot.credentialRef).toBeUndefined();
    expect(snapshot.apiKeyHeader).toBe("Authorization");
    expect(agentSnapshotContainsSecrets(snapshot)).toBe(false);
  });

  test("preserves only provider OAuth apiKeyRef (chatgpt/xai/antigravity)", () => {
    for (const ref of ["chatgpt", "XAI", "antigravity"] as const) {
      const snapshot = stripAgentForAccountSync({
        localAgent: makeLocalAgent({
          apiKeyRef: ref,
          credentialRef: "api-key:agent-local-01LOCALAGENT",
        }),
        accountUserId: "userA",
        agentId: `01OAUTH${ref}`,
        now: 1000,
      });
      expect(snapshot.apiKeyRef).toBe(ref.toLowerCase());
      expect(snapshot.credentialRef).toBeUndefined();
    }

    const brokerRef = stripAgentForAccountSync({
      localAgent: makeLocalAgent({
        apiKeyRef: "api-key:agent-local-01LOCALAGENT",
      }),
      accountUserId: "userA",
      agentId: "01BROKERREF",
      now: 1000,
    });
    expect(brokerRef.apiKeyRef).toBeUndefined();
    expect(brokerRef.credentialRef).toBeUndefined();
  });

  test("keeps credentialRef for synced custom API key, strips otherwise", () => {
    // Synced custom agent: credentialRef is a stable non-secret lookup ref,
    // the raw key stays in the owner-scoped server credential store.
    const synced = stripAgentForAccountSync({
      localAgent: makeLocalAgent({
        apiSource: "custom",
        credentialSynced: true,
        credentialRef: "api-key:agent-local-01LOCALAGENT",
      }),
      accountUserId: "userA",
      agentId: "01SYNCEDCUSTOM",
      now: 1000,
    });
    expect(synced.credentialRef).toBe("api-key:agent-local-01LOCALAGENT");
    expect(agentSnapshotContainsSecrets(synced)).toBe(false);

    // Unsynced custom agent: credentialRef stays machine-local, never uploaded.
    const unsynced = stripAgentForAccountSync({
      localAgent: makeLocalAgent({
        apiSource: "custom",
        credentialSynced: false,
        credentialRef: "api-key:agent-local-01LOCALAGENT",
      }),
      accountUserId: "userA",
      agentId: "01UNSYNCEDCUSTOM",
      now: 1000,
    });
    expect(unsynced.credentialRef).toBeUndefined();

    // Malformed credentialRef is never kept, even when synced.
    const malformed = stripAgentForAccountSync({
      localAgent: makeLocalAgent({
        apiSource: "custom",
        credentialSynced: true,
        credentialRef: "not-a-valid-ref",
      }),
      accountUserId: "userA",
      agentId: "01MALFORMED",
      now: 1000,
    });
    expect(malformed.credentialRef).toBeUndefined();
  });
});

describe("syncStandaloneAgentToAccount", () => {
  beforeEach(() => {
    clearSyncMappings();
    bindSyncMappingClientDb(null);
  });

  test("happy path: writes distinct account agent, mapping only after success", async () => {
    const store = createSyncMappingStore({ now: () => 50 });
    const writes: Array<{ customKey: string; data: Record<string, unknown> }> =
      [];
    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
    ]);

    const result = await syncStandaloneAgentToAccount(
      {
        accountUserId: "userA",
        localAgentKey,
        includeDialogs: false,
      },
      {
        mappingStore: store,
        persistMappingDurable: false,
        createId: () => "01REMOTEAGENT",
        now: () => 50,
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          expect(userId).toBe("userA");
          // Mapping must not exist before write completes.
          expect(store.get(localAgentKey, "userA")).toBeNull();
          expect(agentSnapshotContainsSecrets(data)).toBe(false);
          expect(data.dialogs).toBeUndefined();
          expect(data.messages).toBeUndefined();
          const written = { ...data, dbKey: customKey, userId };
          writes.push({ customKey, data: written });
          records.set(customKey, written);
          return written;
        },
      }
    );

    expect(result.reused).toBe(false);
    expect(result.remoteDbKey).toBe("agent-userA-01REMOTEAGENT");
    expect(writes).toHaveLength(1);
    expect(store.get(localAgentKey, "userA")).toMatchObject({
      remoteDbKey: "agent-userA-01REMOTEAGENT",
      accountUserId: "userA",
      contentType: "agent",
    });
    // Local agent unchanged.
    expect(records.get(localAgentKey)?.apiKey).toBe(
      "sk-secret-raw-key-should-never-upload"
    );
  });

  test("write failure leaves no mapping", async () => {
    const store = createSyncMappingStore();
    await expect(
      syncStandaloneAgentToAccount(
        { accountUserId: "userA", localAgentKey },
        {
          mappingStore: store,
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => makeLocalAgent(),
          writeRecord: async () => {
            throw new Error("account write failed");
          },
        }
      )
    ).rejects.toThrow(/account write failed/);
    expect(store.get(localAgentKey, "userA")).toBeNull();
    expect(store.size()).toBe(0);
  });

  test("abort before write cancels and leaves no mapping", async () => {
    const store = createSyncMappingStore();
    const registry = createSyncJobRegistry();
    const controller = new AbortController();

    const pending = syncStandaloneAgentToAccount(
      {
        accountUserId: "userA",
        localAgentKey,
        signal: controller.signal,
      },
      {
        mappingStore: store,
        jobRegistry: registry,
        persistMappingDurable: false,
        log: () => undefined,
        readRecord: async () => {
          controller.abort(new Error("auth switch"));
          return makeLocalAgent();
        },
        writeRecord: async () => {
          throw new Error("should not write after abort");
        },
      }
    );

    await expect(pending).rejects.toThrow(/aborted/);
    expect(store.size()).toBe(0);
    expect(registry.size()).toBe(0);
  });

  test("idempotent: second call reuses mapping and does not create second remote", async () => {
    const store = createSyncMappingStore();
    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
    ]);
    let writeCount = 0;
    let idSeq = 0;

    const deps = {
      mappingStore: store,
      persistMappingDurable: false as const,
      createId: () => `01REMOTE${++idSeq}`,
      log: () => undefined,
      readRecord: async (key: string) => records.get(key) ?? null,
      writeRecord: async ({
        data,
        customKey,
        userId,
      }: {
        data: Record<string, unknown>;
        customKey: string;
        userId: string;
      }) => {
        writeCount += 1;
        const written = { ...data, dbKey: customKey, userId };
        records.set(customKey, written);
        return written;
      },
    };

    const first = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      deps
    );
    const second = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      deps
    );

    expect(writeCount).toBe(1);
    expect(second.reused).toBe(true);
    expect(second.remoteDbKey).toBe(first.remoteDbKey);
    expect(store.list({ accountUserId: "userA" })).toHaveLength(1);
  });

  test("rejects includeDialogs=true rather than pretending support", async () => {
    await expect(
      syncStandaloneAgentToAccount(
        {
          accountUserId: "userA",
          localAgentKey,
          includeDialogs: true,
        },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => makeLocalAgent(),
          writeRecord: async () => {
            throw new Error("should not write");
          },
        }
      )
    ).rejects.toThrow(/includeDialogs/);
  });

  test("rejects non-local account and non-local agent", async () => {
    await expect(
      syncStandaloneAgentToAccount(
        { accountUserId: "local", localAgentKey },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => makeLocalAgent(),
          writeRecord: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toThrow(/non-local accountUserId/);

    await expect(
      syncStandaloneAgentToAccount(
        {
          accountUserId: "userA",
          localAgentKey: "agent-userB-01OTHER",
        },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => ({
            id: "01OTHER",
            userId: "userB",
            type: "agent",
            name: "Account agent",
          }),
          writeRecord: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toThrow(/not device-local/);
  });

  test("A/B isolation: B does not consume A mappings or remote keys", async () => {
    const store = createSyncMappingStore();
    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
    ]);
    let n = 0;
    const depsFor = (account: string) => ({
      mappingStore: store,
      persistMappingDurable: false as const,
      createId: () => `01R${account}${++n}`,
      log: () => undefined,
      readRecord: async (key: string) => records.get(key) ?? null,
      writeRecord: async ({
        data,
        customKey,
        userId,
      }: {
        data: Record<string, unknown>;
        customKey: string;
        userId: string;
      }) => {
        const written = { ...data, dbKey: customKey, userId };
        records.set(customKey, written);
        return written;
      },
    });

    const a = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      depsFor("A")
    );
    const b = await syncStandaloneAgentToAccount(
      { accountUserId: "userB", localAgentKey },
      depsFor("B")
    );

    expect(a.remoteDbKey).not.toBe(b.remoteDbKey);
    expect(store.get(localAgentKey, "userA")?.remoteDbKey).toBe(a.remoteDbKey);
    expect(store.get(localAgentKey, "userB")?.remoteDbKey).toBe(b.remoteDbKey);
    expect(
      store.list({ accountUserId: "userB" }).every(
        (m) => m.accountUserId === "userB" && m.remoteDbKey === b.remoteDbKey
      )
    ).toBe(true);
  });

  test("no dialog upload fields on written account agent", async () => {
    const writtenPayloads: Record<string, unknown>[] = [];
    await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      {
        mappingStore: createSyncMappingStore(),
        persistMappingDurable: false,
        createId: () => "01NODIALOG",
        log: () => undefined,
        readRecord: async () => makeLocalAgent(),
        writeRecord: async ({ data, customKey, userId }) => {
          writtenPayloads.push(data);
          return { ...data, dbKey: customKey, userId };
        },
      }
    );
    const payload = writtenPayloads[0]!;
    expect(payload.dialogs).toBeUndefined();
    expect(payload.messages).toBeUndefined();
    expect(payload.attachments).toBeUndefined();
    expect(payload.dialogCount).toBe(0);
    expect(payload.messageCount).toBe(0);
  });

  test("durable mapping participates in content dedupe after restart hydrate", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);

    const remoteKey = "agent-userA-01DEDUPEREMOTE";
    await putSyncMappingDurable({
      localDbKey: localAgentKey,
      remoteDbKey: remoteKey,
      accountUserId: "userA",
      contentType: "agent",
      updatedAt: 10,
    });

    clearSyncMappings();
    await ensureSyncMappingsHydrated(db);
    const mappings = listSyncMappings({ accountUserId: "userA" });
    expect(mappings).toHaveLength(1);

    const local = {
      dbKey: localAgentKey,
      name: "Local",
      updatedAt: 1,
    };
    const remote = {
      dbKey: remoteKey,
      name: "Account",
      updatedAt: 2,
    };
    const merged = deduplicateContentRecordsWithMappings(
      [local, remote],
      mappings
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.dbKey).toBe(remoteKey);
  });

  test("production path write-through: sync then restart still has mapping", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);
    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
    ]);

    const result = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      {
        // Default mapping store + durable persist (no injected store).
        createId: () => "01DURABLESYNC",
        now: () => 77,
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          const written = { ...data, dbKey: customKey, userId };
          records.set(customKey, written);
          return written;
        },
      }
    );

    expect(result.remoteDbKey).toBe("agent-userA-01DURABLESYNC");
    expect(getSyncMapping(localAgentKey, "userA")?.remoteDbKey).toBe(
      result.remoteDbKey
    );

    clearSyncMappings();
    expect(getSyncMapping(localAgentKey, "userA")).toBeNull();
    await ensureSyncMappingsHydrated(db);
    expect(getSyncMapping(localAgentKey, "userA")).toMatchObject({
      remoteDbKey: result.remoteDbKey,
      accountUserId: "userA",
      contentType: "agent",
      updatedAt: 77,
    });
  });

  test("unregister job in finally after success", async () => {
    const registry = createSyncJobRegistry();
    await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      {
        mappingStore: createSyncMappingStore(),
        jobRegistry: registry,
        persistMappingDurable: false,
        createId: () => "01JOBCLEAN",
        log: () => undefined,
        readRecord: async () => makeLocalAgent(),
        writeRecord: async ({ data, customKey, userId }) => ({
          ...data,
          dbKey: customKey,
          userId,
        }),
      }
    );
    expect(registry.size()).toBe(0);
  });

  test("cold-start command hydrates durable mappings before idempotent reuse", async () => {
    // Simulates: prior sync wrote durable mapping; process memory empty;
    // no useMyContentItems mount — direct explicit sync must reuse remote.
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);
    const remoteKey = "agent-userA-01COLDSTART";
    await putSyncMappingDurable({
      localDbKey: localAgentKey,
      remoteDbKey: remoteKey,
      accountUserId: "userA",
      contentType: "agent",
      updatedAt: 11,
    });

    clearSyncMappings();
    expect(getSyncMapping(localAgentKey, "userA")).toBeNull();
    // DB stays bound (production app keeps client DB after restart).
    bindSyncMappingClientDb(db);

    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
      [
        remoteKey,
        {
          id: "01COLDSTART",
          dbKey: remoteKey,
          userId: "userA",
          type: "agent",
          name: "Prior remote",
        },
      ],
    ]);
    let writeCount = 0;
    let idSeq = 0;

    const result = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      {
        // Default store + durable (no injected mappingStore).
        createId: () => `01NEW${++idSeq}`,
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          writeCount += 1;
          const written = { ...data, dbKey: customKey, userId };
          records.set(customKey, written);
          return written;
        },
      }
    );

    expect(result.reused).toBe(true);
    expect(result.remoteDbKey).toBe(remoteKey);
    expect(writeCount).toBe(0);
    expect(idSeq).toBe(0);
    expect(getSyncMapping(localAgentKey, "userA")?.remoteDbKey).toBe(remoteKey);
  });

  test("production durable path fails closed with no bound DB (zero account writes)", async () => {
    // No bindSyncMappingClientDb — must not silently write account agent.
    bindSyncMappingClientDb(null);
    let writeCount = 0;

    await expect(
      syncStandaloneAgentToAccount(
        { accountUserId: "userA", localAgentKey },
        {
          createId: () => "01SHOULDNOT",
          log: () => undefined,
          readRecord: async () => makeLocalAgent(),
          writeRecord: async ({ data, customKey, userId }) => {
            writeCount += 1;
            return { ...data, dbKey: customKey, userId };
          },
        }
      )
    ).rejects.toThrow(/bound client DB|durability downgrade/);

    expect(writeCount).toBe(0);
    expect(getSyncMapping(localAgentKey, "userA")).toBeNull();
    expect(listSyncMappings()).toEqual([]);
  });

  test("putSyncMappingDurable refuses durability claim without bound DB", async () => {
    bindSyncMappingClientDb(null);
    await expect(
      putSyncMappingDurable({
        localDbKey: localAgentKey,
        remoteDbKey: "agent-userA-01NODB",
        accountUserId: "userA",
        contentType: "agent",
      })
    ).rejects.toThrow(/bound client DB|memory-only durability/);
    expect(getSyncMapping(localAgentKey, "userA")).toBeNull();
  });

  test("abort after account write before mapping leaves unmapped remote; retry does not roll back", async () => {
    /**
     * Known limitation: we cannot safely roll back a completed account write.
     * Abort between write and mapping → remote snapshot exists without mapping.
     * Retry has no mapping to reuse and may create a second remote Agent.
     */
    const store = createSyncMappingStore();
    const records = new Map<string, Record<string, unknown>>([
      [localAgentKey, makeLocalAgent()],
    ]);
    const controller = new AbortController();
    let writeCount = 0;
    let idSeq = 0;

    await expect(
      syncStandaloneAgentToAccount(
        {
          accountUserId: "userA",
          localAgentKey,
          signal: controller.signal,
        },
        {
          mappingStore: store,
          persistMappingDurable: false,
          createId: () => `01ABORT${++idSeq}`,
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async ({ data, customKey, userId }) => {
            writeCount += 1;
            const written = { ...data, dbKey: customKey, userId };
            records.set(customKey, written);
            // Abort after write succeeds, before mapping put.
            controller.abort(new Error("abort-after-write"));
            return written;
          },
        }
      )
    ).rejects.toThrow(/aborted.*after-account-write|abort-after-write/);

    expect(writeCount).toBe(1);
    expect(store.get(localAgentKey, "userA")).toBeNull();
    const firstRemote = "agent-userA-01ABORT1";
    expect(records.has(firstRemote)).toBe(true);

    // Retry without mapping → second remote (no pretend rollback of first).
    const second = await syncStandaloneAgentToAccount(
      { accountUserId: "userA", localAgentKey },
      {
        mappingStore: store,
        persistMappingDurable: false,
        createId: () => `01ABORT${++idSeq}`,
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          writeCount += 1;
          const written = { ...data, dbKey: customKey, userId };
          records.set(customKey, written);
          return written;
        },
      }
    );

    expect(writeCount).toBe(2);
    expect(second.reused).toBe(false);
    expect(second.remoteDbKey).toBe("agent-userA-01ABORT2");
    expect(second.remoteDbKey).not.toBe(firstRemote);
    expect(records.has(firstRemote)).toBe(true);
    expect(store.get(localAgentKey, "userA")?.remoteDbKey).toBe(
      second.remoteDbKey
    );
  });
});
