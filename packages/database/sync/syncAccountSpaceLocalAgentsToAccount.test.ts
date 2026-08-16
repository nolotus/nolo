import { beforeEach, describe, expect, test } from "bun:test";

import { createSyncMappingStore } from "./syncMapping";
import { createSyncJobRegistry } from "./syncJobRegistry";
import {
  SpaceLocalAgentsSyncError,
  syncAccountSpaceLocalAgentsToAccount,
} from "./syncAccountSpaceLocalAgentsToAccount";

const accountUserId = "userA";
const otherUserId = "userB";
const spaceKey = "space-userA-01SPACE";
const localAgentA = "agent-local-01AGENTA";
const localAgentB = "agent-local-01AGENTB";
const remoteExisting = "agent-userA-01EXISTING";
const localDialog = "dialog-local-01DIALOGA";

const makeLocalAgent = (key: string, name: string) => ({
  id: key.split("-").pop(),
  type: "agent",
  userId: "local",
  dbKey: key,
  name,
  provider: "openai",
  model: "gpt-test",
  apiKey: "sk-never-upload",
  credentialRef: `api-key:${key}`,
  dialogs: [{ id: "d1" }],
  messages: [{ id: "m1" }],
});

const makeSpace = (contents: Record<string, unknown | null>, owner = accountUserId) => ({
  id: "01SPACE",
  type: "space",
  name: "Account Space",
  ownerId: owner,
  userId: owner,
  visibility: "private",
  members: [owner],
  categories: {
    "cat-1": { name: "Work", order: 0, updatedAt: 1 },
  },
  contents,
  createdAt: 1,
  updatedAt: 1,
  dbKey: spaceKey,
});

const spaceContent = (
  contentKey: string,
  type: string,
  extra: Record<string, unknown> = {}
) => ({
  title: `Title ${contentKey}`,
  type,
  contentKey,
  categoryId: "cat-1",
  pinned: type === "agent",
  createdAt: 10,
  updatedAt: 20,
  order: 5,
  tags: ["meta"],
  ...extra,
});

describe("syncAccountSpaceLocalAgentsToAccount", () => {
  beforeEach(() => {
    // no shared default store side-effects; tests inject mappingStore
  });

  test("happy path: two local agents rewrite; preserve metadata/tombstones/remotes", async () => {
    const store = createSyncMappingStore({ now: () => 50 });
    const registry = createSyncJobRegistry();
    let idSeq = 0;
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [localAgentB, makeLocalAgent(localAgentB, "B")],
      [
        remoteExisting,
        { dbKey: remoteExisting, userId: accountUserId, type: "agent" },
      ],
      [
        "page-userA-01P",
        { dbKey: "page-userA-01P", userId: accountUserId, type: "page" },
      ],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent", {
            order: 3,
            pinned: true,
            categoryId: "cat-1",
            tags: ["keep"],
          }),
          [localAgentB]: spaceContent(localAgentB, "agent", { order: 9 }),
          [remoteExisting]: spaceContent(remoteExisting, "agent", {
            categoryId: null,
          }),
          "page-userA-01P": spaceContent("page-userA-01P", "page"),
          "gone-agent": null,
        }),
      ],
    ]);

    const agentWrites: string[] = [];
    const spacePatches: Array<{
      dbKey: string;
      changes: Record<string, unknown>;
    }> = [];

    const result = await syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      {
        mappingStore: store,
        persistMappingDurable: false,
        jobRegistry: registry,
        createId: () => `01REMOTE${++idSeq}`,
        now: () => 99,
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          expect(userId).toBe(accountUserId);
          expect(data.apiKey).toBeUndefined();
          expect(data.dialogs).toBeUndefined();
          expect(data.messages).toBeUndefined();
          const written = { ...data, dbKey: customKey, userId };
          agentWrites.push(customKey);
          records.set(customKey, written);
          return written;
        },
        patchSpace: async ({ dbKey, changes }) => {
          expect(dbKey).toBe(spaceKey);
          spacePatches.push({ dbKey, changes: changes as Record<string, unknown> });
          const prev = records.get(spaceKey)!;
          const prevContents = {
            ...((prev.contents as Record<string, unknown>) ?? {}),
          };
          for (const [k, v] of Object.entries(changes.contents)) {
            if (v === null) delete prevContents[k];
            else prevContents[k] = v;
          }
          const next = {
            ...prev,
            contents: prevContents,
            updatedAt: changes.updatedAt ?? 99,
          };
          records.set(spaceKey, next);
          return next;
        },
      }
    );

    expect(result.noop).toBe(false);
    expect(result.spaceKey).toBe(spaceKey);
    expect(result.rewrittenCount).toBe(2);
    expect(result.agentResults).toHaveLength(2);
    expect(agentWrites).toHaveLength(2);
    expect(spacePatches).toHaveLength(1);
    // Same Space key only — no new Space creation / Space mapping.
    expect(spacePatches[0]?.dbKey).toBe(spaceKey);

    const patched = records.get(spaceKey)!;
    const contents = patched.contents as Record<string, any>;
    expect(contents[localAgentA]).toBeUndefined();
    expect(contents[localAgentB]).toBeUndefined();
    expect(contents["agent-userA-01REMOTE1"]).toMatchObject({
      contentKey: "agent-userA-01REMOTE1",
      order: 3,
      pinned: true,
      categoryId: "cat-1",
      tags: ["keep"],
      title: `Title ${localAgentA}`,
    });
    expect(contents["agent-userA-01REMOTE2"]?.order).toBe(9);
    expect(contents[remoteExisting]?.contentKey).toBe(remoteExisting);
    expect(contents["page-userA-01P"]?.type).toBe("page");
    expect(contents["gone-agent"]).toBeNull();
    // Categories untouched on space body (patch only contents).
    expect(patched.categories).toEqual({
      "cat-1": { name: "Work", order: 0, updatedAt: 1 },
    });
    expect(registry.size()).toBe(0);
  });

  test("unsupported local dialog rejects before any account writes", async () => {
    const store = createSyncMappingStore();
    const registry = createSyncJobRegistry();
    let agentWrites = 0;
    let spacePatches = 0;
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
          [localDialog]: spaceContent(localDialog, "dialog"),
        }),
      ],
    ]);

    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: store,
          persistMappingDurable: false,
          jobRegistry: registry,
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            agentWrites += 1;
            throw new Error("should not write agent");
          },
          patchSpace: async () => {
            spacePatches += 1;
            throw new Error("should not patch space");
          },
        }
      )
    ).rejects.toMatchObject({
      code: "PREFLIGHT_REJECTED",
      name: "SpaceLocalAgentsSyncError",
    });

    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
    expect(store.size()).toBe(0);
    expect(registry.size()).toBe(0);
  });

  test("missing/tombstoned local agent rejects before writes", async () => {
    let agentWrites = 0;
    let spacePatches = 0;
    const records = new Map<string, Record<string, unknown>>([
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
        }),
      ],
      // agent body intentionally absent
    ]);

    try {
      await syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          jobRegistry: createSyncJobRegistry(),
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            agentWrites += 1;
            throw new Error("no");
          },
          patchSpace: async () => {
            spacePatches += 1;
            throw new Error("no");
          },
        }
      );
      throw new Error("expected reject");
    } catch (err) {
      expect(err).toBeInstanceOf(SpaceLocalAgentsSyncError);
      expect((err as SpaceLocalAgentsSyncError).code).toBe("PREFLIGHT_REJECTED");
      expect((err as SpaceLocalAgentsSyncError).preflight?.reason).toBe(
        "missing_or_tombstoned_record"
      );
    }
    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
  });

  test("remote refs preserved; zero local agents is honest no-op (no patch)", async () => {
    const records = new Map<string, Record<string, unknown>>([
      [
        remoteExisting,
        { dbKey: remoteExisting, userId: accountUserId, type: "agent" },
      ],
      [
        "page-userA-01P",
        { dbKey: "page-userA-01P", userId: accountUserId, type: "page" },
      ],
      [
        spaceKey,
        makeSpace({
          [remoteExisting]: spaceContent(remoteExisting, "agent"),
          "page-userA-01P": spaceContent("page-userA-01P", "page"),
          "tomb": null,
        }),
      ],
    ]);
    let agentWrites = 0;
    let spacePatches = 0;

    const result = await syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      {
        mappingStore: createSyncMappingStore(),
        persistMappingDurable: false,
        jobRegistry: createSyncJobRegistry(),
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async () => {
          agentWrites += 1;
          throw new Error("no");
        },
        patchSpace: async () => {
          spacePatches += 1;
          throw new Error("no");
        },
      }
    );

    expect(result.noop).toBe(true);
    expect(result.rewrittenCount).toBe(0);
    expect(result.agentResults).toEqual([]);
    expect(result.spaceKey).toBe(spaceKey);
    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
  });

  test("content key collision fails safely with no Space patch after agents may exist", async () => {
    const store = createSyncMappingStore();
    const remoteTarget = remoteExisting;
    let idSeq = 0;
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [
        remoteTarget,
        { dbKey: remoteTarget, userId: accountUserId, type: "agent" },
      ],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
          [remoteTarget]: spaceContent(remoteTarget, "agent", {
            title: "Already there",
          }),
        }),
      ],
    ]);
    let spacePatches = 0;

    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: store,
          persistMappingDurable: false,
          jobRegistry: createSyncJobRegistry(),
          // Force mapped remote key to collide with existing catalog entry.
          createId: () => "01EXISTING",
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async ({ data, customKey, userId }) => {
            const written = { ...data, dbKey: customKey, userId };
            records.set(customKey, written);
            return written;
          },
          patchSpace: async () => {
            spacePatches += 1;
            throw new Error("should not patch on collision");
          },
        }
      )
    ).rejects.toMatchObject({
      code: "CONTENT_KEY_COLLISION",
    });

    expect(spacePatches).toBe(0);
    // Partial: agent mapping may already exist (documented).
    expect(store.get(localAgentA, accountUserId)?.remoteDbKey).toBe(
      "agent-userA-01EXISTING"
    );
    // Space catalog still has local key.
    const space = records.get(spaceKey)!;
    expect((space.contents as any)[localAgentA]?.contentKey).toBe(localAgentA);
    void idSeq;
  });

  test("abort cancels parent job and leaves registry empty", async () => {
    const registry = createSyncJobRegistry();
    const controller = new AbortController();
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
        }),
      ],
    ]);

    const pending = syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId, signal: controller.signal },
      {
        mappingStore: createSyncMappingStore(),
        persistMappingDurable: false,
        jobRegistry: registry,
        log: () => undefined,
        readRecord: async (key) => {
          if (key === spaceKey) {
            controller.abort(new Error("logout"));
            return records.get(key) ?? null;
          }
          return records.get(key) ?? null;
        },
        writeRecord: async () => {
          throw new Error("should not write after abort");
        },
        patchSpace: async () => {
          throw new Error("should not patch after abort");
        },
      }
    );

    await expect(pending).rejects.toThrow(/aborted/);
    expect(registry.size()).toBe(0);
  });

  test("rejects local/invalid account and non-owned space", async () => {
    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId: "local" },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => null,
          writeRecord: async () => {
            throw new Error("no");
          },
          patchSpace: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_ACCOUNT" });

    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey: "", accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async () => null,
          writeRecord: async () => {
            throw new Error("no");
          },
          patchSpace: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });

    const records = new Map<string, Record<string, unknown>>([
      [
        remoteExisting,
        { dbKey: remoteExisting, userId: otherUserId, type: "agent" },
      ],
      [
        spaceKey,
        makeSpace(
          { [remoteExisting]: spaceContent(remoteExisting, "agent") },
          otherUserId
        ),
      ],
    ]);

    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            throw new Error("no");
          },
          patchSpace: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toMatchObject({ code: "SPACE_NOT_WRITABLE" });
  });

  test("rejects non-canonical space keys and page/user records as Space", async () => {
    let agentWrites = 0;
    let spacePatches = 0;
    const depsBase = {
      mappingStore: createSyncMappingStore(),
      persistMappingDurable: false as const,
      jobRegistry: createSyncJobRegistry(),
      log: () => undefined,
      writeRecord: async () => {
        agentWrites += 1;
        throw new Error("no agent write");
      },
      patchSpace: async () => {
        spacePatches += 1;
        throw new Error("no space patch");
      },
    };

    // page-* key must never be treated as Space identity.
    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey: "page-userA-01PAGE", accountUserId },
        {
          ...depsBase,
          readRecord: async () => ({
            dbKey: "page-userA-01PAGE",
            type: "page",
            ownerId: accountUserId,
            userId: accountUserId,
            contents: {},
          }),
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });

    // agent-* key also rejected before any read/write.
    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey: "agent-userA-01AGENT", accountUserId },
        {
          ...depsBase,
          readRecord: async () => {
            throw new Error("should not read non-space key");
          },
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });

    // Canonical space-* key but authoritative body is explicitly non-Space.
    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          ...depsBase,
          readRecord: async (key) =>
            key === spaceKey
              ? {
                  dbKey: spaceKey,
                  type: "page",
                  ownerId: accountUserId,
                  userId: accountUserId,
                  contents: {
                    [localAgentA]: spaceContent(localAgentA, "agent"),
                  },
                }
              : null,
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });

    // Legacy Space may omit type when key is canonical and owner matches.
    const legacySpace = {
      id: "01SPACE",
      // no type field
      name: "Legacy Space",
      ownerId: accountUserId,
      userId: accountUserId,
      contents: {
        [remoteExisting]: spaceContent(remoteExisting, "agent"),
      },
      dbKey: spaceKey,
    };
    const legacyRecords = new Map<string, Record<string, unknown>>([
      [spaceKey, legacySpace],
      [
        remoteExisting,
        { dbKey: remoteExisting, userId: accountUserId, type: "agent" },
      ],
    ]);
    const legacyOk = await syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      {
        ...depsBase,
        readRecord: async (key) => legacyRecords.get(key) ?? null,
      }
    );
    expect(legacyOk.noop).toBe(true);
    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
  });

  test("mismatched dialog-as-agent catalog rejects before any account writes", async () => {
    let agentWrites = 0;
    let spacePatches = 0;
    const records = new Map<string, Record<string, unknown>>([
      [
        localDialog,
        { dbKey: localDialog, userId: "local", type: "dialog", title: "d" },
      ],
      [
        spaceKey,
        makeSpace({
          [localDialog]: spaceContent(localDialog, "agent"),
        }),
      ],
    ]);

    try {
      await syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          jobRegistry: createSyncJobRegistry(),
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            agentWrites += 1;
            throw new Error("no");
          },
          patchSpace: async () => {
            spacePatches += 1;
            throw new Error("no");
          },
        }
      );
      throw new Error("expected reject");
    } catch (err) {
      expect(err).toBeInstanceOf(SpaceLocalAgentsSyncError);
      expect((err as SpaceLocalAgentsSyncError).code).toBe("PREFLIGHT_REJECTED");
      expect((err as SpaceLocalAgentsSyncError).preflight?.reason).toBe(
        "authoritative_type_mismatch"
      );
      expect(
        (err as SpaceLocalAgentsSyncError).preflight?.details[0]
      ).toMatchObject({
        contentKey: localDialog,
        type: "dialog",
        reason: "authoritative_type_mismatch",
      });
    }
    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
  });

  test("missing remote catalog ref rejects before writes (Space-as-unit)", async () => {
    let agentWrites = 0;
    let spacePatches = 0;
    const deadRemote = "page-userA-01DEAD";
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
          [deadRemote]: spaceContent(deadRemote, "page"),
          [remoteExisting]: spaceContent(remoteExisting, "agent"),
        }),
      ],
      [
        remoteExisting,
        { dbKey: remoteExisting, userId: accountUserId, type: "agent" },
      ],
      // deadRemote intentionally absent
    ]);

    try {
      await syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          jobRegistry: createSyncJobRegistry(),
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            agentWrites += 1;
            throw new Error("no");
          },
          patchSpace: async () => {
            spacePatches += 1;
            throw new Error("no");
          },
        }
      );
      throw new Error("expected reject");
    } catch (err) {
      expect(err).toBeInstanceOf(SpaceLocalAgentsSyncError);
      expect((err as SpaceLocalAgentsSyncError).code).toBe("PREFLIGHT_REJECTED");
      expect((err as SpaceLocalAgentsSyncError).preflight?.reason).toBe(
        "missing_or_tombstoned_record"
      );
    }
    expect(agentWrites).toBe(0);
    expect(spacePatches).toBe(0);
  });

  test("A/B isolation: mappings for A are not reused when syncing as B", async () => {
    const store = createSyncMappingStore();
    let n = 0;
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
    ]);

    const runFor = async (account: string, ownerSpaceKey: string) => {
      records.set(
        ownerSpaceKey,
        makeSpace(
          { [localAgentA]: spaceContent(localAgentA, "agent") },
          account
        )
      );
      // overwrite dbKey on space to match
      const space = records.get(ownerSpaceKey)!;
      records.set(ownerSpaceKey, { ...space, dbKey: ownerSpaceKey });

      return syncAccountSpaceLocalAgentsToAccount(
        { spaceKey: ownerSpaceKey, accountUserId: account },
        {
          mappingStore: store,
          persistMappingDurable: false,
          jobRegistry: createSyncJobRegistry(),
          createId: () => `01${account}${++n}`,
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async ({ data, customKey, userId }) => {
            const written = { ...data, dbKey: customKey, userId };
            records.set(customKey, written);
            return written;
          },
          patchSpace: async ({ dbKey, changes }) => {
            const prev = records.get(dbKey)!;
            const prevContents = {
              ...((prev.contents as Record<string, unknown>) ?? {}),
            };
            for (const [k, v] of Object.entries(changes.contents)) {
              if (v === null) delete prevContents[k];
              else prevContents[k] = v;
            }
            const next = { ...prev, contents: prevContents };
            records.set(dbKey, next);
            return next;
          },
        }
      );
    };

    const a = await runFor("userA", "space-userA-01SPA");
    const b = await runFor("userB", "space-userB-01SPB");

    expect(a.agentResults[0]?.remoteDbKey).not.toBe(
      b.agentResults[0]?.remoteDbKey
    );
    expect(store.get(localAgentA, "userA")?.remoteDbKey).toBe(
      a.agentResults[0]?.remoteDbKey
    );
    expect(store.get(localAgentA, "userB")?.remoteDbKey).toBe(
      b.agentResults[0]?.remoteDbKey
    );
  });

  test("second attempt after agent success + space patch failure reuses mappings and patches once", async () => {
    const store = createSyncMappingStore();
    let idSeq = 0;
    let agentWriteCount = 0;
    let patchAttempts = 0;
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [localAgentB, makeLocalAgent(localAgentB, "B")],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent", { order: 1 }),
          [localAgentB]: spaceContent(localAgentB, "agent", { order: 2 }),
        }),
      ],
    ]);

    const deps = {
      mappingStore: store,
      persistMappingDurable: false as const,
      jobRegistry: createSyncJobRegistry(),
      createId: () => `01RETRY${++idSeq}`,
      now: () => 42,
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
        agentWriteCount += 1;
        const written = { ...data, dbKey: customKey, userId };
        records.set(customKey, written);
        return written;
      },
      patchSpace: async ({
        dbKey,
        changes,
      }: {
        dbKey: string;
        changes: {
          contents: Record<string, unknown | null>;
          updatedAt?: number | string;
        };
      }) => {
        patchAttempts += 1;
        if (patchAttempts === 1) {
          throw new Error("space patch failed");
        }
        const prev = records.get(dbKey)!;
        const prevContents = {
          ...((prev.contents as Record<string, unknown>) ?? {}),
        };
        for (const [k, v] of Object.entries(changes.contents)) {
          if (v === null) delete prevContents[k];
          else prevContents[k] = v;
        }
        const next = {
          ...prev,
          contents: prevContents,
          updatedAt: changes.updatedAt ?? 42,
        };
        records.set(dbKey, next);
        return next;
      },
    };

    await expect(
      syncAccountSpaceLocalAgentsToAccount({ spaceKey, accountUserId }, deps)
    ).rejects.toThrow(/space patch failed/);

    // Agents already written/mapped on first attempt.
    expect(agentWriteCount).toBe(2);
    expect(store.list({ accountUserId })).toHaveLength(2);
    // Space still has local keys.
    expect(
      (records.get(spaceKey)!.contents as any)[localAgentA]?.contentKey
    ).toBe(localAgentA);

    const second = await syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      deps
    );

    // Idempotent reuse: no additional agent writes.
    expect(agentWriteCount).toBe(2);
    expect(second.agentResults.every((r) => r.reused)).toBe(true);
    expect(second.noop).toBe(false);
    expect(second.rewrittenCount).toBe(2);
    // Exactly one successful patch (second attempt).
    expect(patchAttempts).toBe(2);
    expect(second.spaceKey).toBe(spaceKey);

    const contents = records.get(spaceKey)!.contents as Record<string, any>;
    expect(contents[localAgentA]).toBeUndefined();
    expect(contents[localAgentB]).toBeUndefined();
    expect(Object.keys(contents).every((k) => !k.includes("-local-"))).toBe(
      true
    );
  });

  test("parent job unregisters even when preflight rejects", async () => {
    const registry = createSyncJobRegistry();
    const records = new Map<string, Record<string, unknown>>([
      [
        spaceKey,
        makeSpace({
          [localDialog]: spaceContent(localDialog, "dialog"),
        }),
      ],
    ]);

    await expect(
      syncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId },
        {
          mappingStore: createSyncMappingStore(),
          persistMappingDurable: false,
          jobRegistry: registry,
          log: () => undefined,
          readRecord: async (key) => records.get(key) ?? null,
          writeRecord: async () => {
            throw new Error("no");
          },
          patchSpace: async () => {
            throw new Error("no");
          },
        }
      )
    ).rejects.toMatchObject({ code: "PREFLIGHT_REJECTED" });

    expect(registry.size()).toBe(0);
  });

  test("does not create a new Space key or Space-level mapping", async () => {
    const store = createSyncMappingStore();
    const spaceKeysPatched: string[] = [];
    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, makeLocalAgent(localAgentA, "A")],
      [
        spaceKey,
        makeSpace({
          [localAgentA]: spaceContent(localAgentA, "agent"),
        }),
      ],
    ]);

    await syncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      {
        mappingStore: store,
        persistMappingDurable: false,
        jobRegistry: createSyncJobRegistry(),
        createId: () => "01ONLYAGENT",
        log: () => undefined,
        readRecord: async (key) => records.get(key) ?? null,
        writeRecord: async ({ data, customKey, userId }) => {
          // Only agent keys may be written — never a new space-*.
          expect(customKey.startsWith("agent-")).toBe(true);
          expect(customKey.startsWith("space-")).toBe(false);
          const written = { ...data, dbKey: customKey, userId };
          records.set(customKey, written);
          return written;
        },
        patchSpace: async ({ dbKey, changes }) => {
          spaceKeysPatched.push(dbKey);
          expect(dbKey).toBe(spaceKey);
          const prev = records.get(dbKey)!;
          const prevContents = {
            ...((prev.contents as Record<string, unknown>) ?? {}),
          };
          for (const [k, v] of Object.entries(changes.contents)) {
            if (v === null) delete prevContents[k];
            else prevContents[k] = v;
          }
          const next = { ...prev, contents: prevContents };
          records.set(dbKey, next);
          return next;
        },
      }
    );

    expect(spaceKeysPatched).toEqual([spaceKey]);
    // Mapping store only has agent contentType entries, never space.
    expect(
      store.list({ accountUserId }).every((m) => m.contentType === "agent")
    ).toBe(true);
    expect(store.list({ accountUserId }).every((m) => m.localDbKey === localAgentA)).toBe(
      true
    );
  });
});
