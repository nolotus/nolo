import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  bindSyncMappingClientDb,
  clearSyncMappings,
  getSyncMapping,
} from "database/sync/syncMapping";
import { MemoryDB } from "database-engine/MemoryDB";
import { SpaceLocalAgentsSyncError } from "database/sync/syncAccountSpaceLocalAgentsToAccount";

// Value-copy snapshot — Bun mock.restore() does not clear mock.module.
const realDbSlice = { ...(await import("database/dbSlice")) };

/**
 * Adapter contract: dispatch(read/write/patch) same spaceKey; no fetch/shadow store.
 * mock.module replaces dbSlice so dispatch receives plain arg objects.
 * Installed inside a loader (not top-level) for bun mock isolation.
 * Full surface: incomplete dbSlice mocks leak and strip removeCachedEntity for
 * sibling suites (bun mock.module is not fully isolated across files).
 */
const loadAdapter = async () => {
  const act = (type: string) => (payload: any) => ({
    type,
    payload,
    meta: { arg: payload },
  });
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    write: (args: {
      data: Record<string, unknown>;
      customKey?: string;
      userId?: string;
    }) => args,
    patch: (args: {
      dbKey: string;
      changes: Record<string, unknown>;
    }) => args,
    read: (args: { dbKey: string }) => args,
    remove: act("db/remove"),
    readAndWait: act("db/readAndWait"),
    purge: act("db/purge"),
    upsert: act("db/upsert"),
    upload: act("db/upload"),
    readFileContent: act("db/readFileContent"),
    share: act("db/share"),
    upsertSSREntity: act("db/upsertSSREntity"),
    removeCachedEntity: act("db/removeCachedEntity"),
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({}) },
    default: () => null,
  }));
  return import(
    `./runSyncAccountSpaceLocalAgentsToAccount.ts?test=${Date.now()}-${Math.random()}`
  );
};

const {
  runPreflightAccountSpaceLocalAgents,
  runSyncAccountSpaceLocalAgentsToAccount,
} = await loadAdapter();

afterAll(() => {
  mock.module("database/dbSlice", () => realDbSlice);
});

type DispatchFn = {
  (action: unknown): { unwrap: () => Promise<unknown> };
};

const emptyWriteTrackingDispatch = (
  records: Map<string, Record<string, unknown> | null>
): {
  dispatch: DispatchFn;
  writes: unknown[];
  patches: unknown[];
} => {
  const writes: unknown[] = [];
  const patches: unknown[] = [];
  const dispatch = ((action: unknown) => ({
    unwrap: async () => {
      if (!action || typeof action !== "object") return null;
      const arg = action as Record<string, unknown>;
      if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
        const key = String(arg.dbKey);
        return records.has(key) ? records.get(key) : null;
      }
      if ("data" in arg) {
        writes.push(arg);
        return arg;
      }
      if ("changes" in arg) {
        patches.push(arg);
        return arg;
      }
      return null;
    },
  })) as DispatchFn;
  return { dispatch, writes, patches };
};

const accountUserId = "userA";
const spaceKey = "space-userA-01SPACEUI";
const localAgentKey = "agent-local-01SPACUI";

const makeLocalAgent = () => ({
  dbKey: localAgentKey,
  id: "01SPACUI",
  name: "Space UI local agent",
  type: "agent",
  userId: "local",
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "sk-must-not-upload",
});

const makeSpace = (contents: Record<string, unknown | null>) => ({
  id: "01SPACEUI",
  type: "space",
  name: "Account Space",
  ownerId: accountUserId,
  userId: accountUserId,
  visibility: "private",
  members: [accountUserId],
  categories: {},
  contents,
  createdAt: 1,
  updatedAt: 1,
  dbKey: spaceKey,
});

describe("runSyncAccountSpaceLocalAgentsToAccount production adapter", () => {
  beforeEach(() => {
    clearSyncMappings();
    bindSyncMappingClientDb(null);
  });

  it("read-only preflight uses db.read only (no write/patch)", async () => {
    const localAgent = makeLocalAgent();
    const space = makeSpace({
      [localAgentKey]: {
        title: "A",
        type: "agent",
        contentKey: localAgentKey,
      },
    });

    const reads: string[] = [];
    const writes: unknown[] = [];
    const patches: unknown[] = [];

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") {
          throw new Error("expected arg object");
        }
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
          const key = String(arg.dbKey);
          reads.push(key);
          if (key === spaceKey) return { ...space };
          if (key === localAgentKey) return { ...localAgent };
          return null;
        }
        if ("data" in arg) {
          writes.push(arg);
          return arg;
        }
        if ("changes" in arg) {
          patches.push(arg);
          return arg;
        }
        throw new Error(`unexpected: ${JSON.stringify(arg)}`);
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runPreflightAccountSpaceLocalAgents(
      { spaceKey, accountUserId },
      dispatch
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.queuedLocalAgents).toHaveLength(1);
      expect(result.queuedLocalAgents[0]?.contentKey).toBe(localAgentKey);
    }
    expect(reads).toContain(spaceKey);
    expect(reads).toContain(localAgentKey);
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("preflight rejects unsupported local content with type counts; still no writes", async () => {
    const localDialog = "dialog-local-01DIAL";
    const space = makeSpace({
      [localDialog]: {
        title: "D",
        type: "dialog",
        contentKey: localDialog,
      },
    });

    const writes: unknown[] = [];
    const patches: unknown[] = [];

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") return null;
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
          const key = String(arg.dbKey);
          if (key === spaceKey) return { ...space };
          if (key === localDialog) {
            return {
              dbKey: localDialog,
              type: "dialog",
              userId: "local",
            };
          }
          return null;
        }
        if ("data" in arg) writes.push(arg);
        if ("changes" in arg) patches.push(arg);
        return arg;
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runPreflightAccountSpaceLocalAgents(
      { spaceKey, accountUserId },
      dispatch
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported_local_content");
      expect(result.unsupportedByType.dialog).toBe(1);
    }
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("missing Space throws SPACE_NOT_FOUND; no writes and no ok/noop", async () => {
    const { dispatch, writes, patches } = emptyWriteTrackingDispatch(
      new Map()
    );

    await expect(
      runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId },
        dispatch
      )
    ).rejects.toMatchObject({
      name: "SpaceLocalAgentsSyncError",
      code: "SPACE_NOT_FOUND",
    });
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("tombstoned Space throws SPACE_NOT_FOUND; no writes", async () => {
    const { dispatch, writes, patches } = emptyWriteTrackingDispatch(
      new Map([
        [
          spaceKey,
          {
            ...makeSpace({}),
            deleted: true,
          },
        ],
      ])
    );

    try {
      await runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId },
        dispatch
      );
      expect.unreachable("expected SPACE_NOT_FOUND");
    } catch (err) {
      expect(err).toBeInstanceOf(SpaceLocalAgentsSyncError);
      expect((err as SpaceLocalAgentsSyncError).code).toBe("SPACE_NOT_FOUND");
    }
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("wrong owner throws SPACE_NOT_WRITABLE before contents classify; no writes", async () => {
    const { dispatch, writes, patches } = emptyWriteTrackingDispatch(
      new Map([
        [
          spaceKey,
          {
            ...makeSpace({
              [localAgentKey]: {
                title: "A",
                type: "agent",
                contentKey: localAgentKey,
              },
            }),
            ownerId: "other-user",
            userId: "other-user",
          },
        ],
        [
          localAgentKey,
          {
            dbKey: localAgentKey,
            type: "agent",
            userId: "local",
          },
        ],
      ])
    );

    await expect(
      runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId },
        dispatch
      )
    ).rejects.toMatchObject({
      name: "SpaceLocalAgentsSyncError",
      code: "SPACE_NOT_WRITABLE",
    });
    // Must not have read content keys — validation fails on Space first.
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("non-canonical key and explicit non-space type throw INVALID_SPACE_KEY; no writes", async () => {
    const pageKey = "page-userA-01PAGE";
    const { dispatch: d1, writes: w1, patches: p1 } =
      emptyWriteTrackingDispatch(
        new Map([
          [
            pageKey,
            {
              dbKey: pageKey,
              type: "page",
              ownerId: accountUserId,
              userId: accountUserId,
              contents: {},
            },
          ],
        ])
      );

    await expect(
      runPreflightAccountSpaceLocalAgents(
        { spaceKey: pageKey, accountUserId },
        d1
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });
    expect(w1).toHaveLength(0);
    expect(p1).toHaveLength(0);

    const { dispatch: d2, writes: w2, patches: p2 } =
      emptyWriteTrackingDispatch(
        new Map([
          [
            spaceKey,
            {
              ...makeSpace({}),
              type: "page",
            },
          ],
        ])
      );

    await expect(
      runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId },
        d2
      )
    ).rejects.toMatchObject({ code: "INVALID_SPACE_KEY" });
    expect(w2).toHaveLength(0);
    expect(p2).toHaveLength(0);
  });

  it("valid legacy Space (omit type) still preflights ok", async () => {
    const localAgent = makeLocalAgent();
    const legacySpace = {
      id: "01SPACEUI",
      // no type field — legacy
      name: "Legacy Space",
      ownerId: accountUserId,
      userId: accountUserId,
      visibility: "private",
      members: [accountUserId],
      categories: {},
      contents: {
        [localAgentKey]: {
          title: "A",
          type: "agent",
          contentKey: localAgentKey,
        },
      },
      createdAt: 1,
      updatedAt: 1,
      dbKey: spaceKey,
    };

    const writes: unknown[] = [];
    const patches: unknown[] = [];
    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") return null;
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
          const key = String(arg.dbKey);
          if (key === spaceKey) return { ...legacySpace };
          if (key === localAgentKey) return { ...localAgent };
          return null;
        }
        if ("data" in arg) writes.push(arg);
        if ("changes" in arg) patches.push(arg);
        return arg;
      },
    })) as DispatchFn;

    const result = await runPreflightAccountSpaceLocalAgents(
      { spaceKey, accountUserId },
      dispatch
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.queuedLocalAgents).toHaveLength(1);
    }
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("confirm path uses read/write/patch on the same spaceKey", async () => {
    const db = new MemoryDB();
    bindSyncMappingClientDb(db);

    const localAgent = makeLocalAgent();
    const space = makeSpace({
      [localAgentKey]: {
        title: "A",
        type: "agent",
        contentKey: localAgentKey,
        categoryId: "cat-1",
        order: 3,
        pinned: true,
      },
    });

    const records = new Map<string, Record<string, unknown>>([
      [spaceKey, { ...space }],
      [localAgentKey, { ...localAgent }],
    ]);

    const writes: Array<{
      data: Record<string, unknown>;
      customKey?: string;
      userId?: string;
    }> = [];
    const patches: Array<{
      dbKey: string;
      changes: Record<string, unknown>;
    }> = [];
    let remoteSeq = 0;

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") {
          throw new Error("expected arg object");
        }
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
          const key = String(arg.dbKey);
          return records.get(key) ?? null;
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
              : `agent-${accountUserId}-01R${++remoteSeq}`;
          const written = {
            ...(w.data as object),
            dbKey: customKey,
            userId: w.userId,
          };
          records.set(customKey, written);
          return written;
        }
        if ("changes" in arg) {
          const p = {
            dbKey: String(arg.dbKey),
            changes: arg.changes as Record<string, unknown>,
          };
          patches.push(p);
          const current = records.get(p.dbKey) ?? {};
          const nextContents = {
            ...((current.contents as Record<string, unknown>) ?? {}),
          };
          const contentChanges = (p.changes.contents ?? {}) as Record<
            string,
            unknown
          >;
          for (const [k, v] of Object.entries(contentChanges)) {
            if (v === null) delete nextContents[k];
            else nextContents[k] = v;
          }
          const next = {
            ...current,
            contents: nextContents,
            updatedAt: p.changes.updatedAt ?? current.updatedAt,
            dbKey: p.dbKey,
          };
          records.set(p.dbKey, next);
          return next;
        }
        throw new Error(`unexpected: ${JSON.stringify(arg)}`);
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runSyncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      dispatch
    );

    expect(result.noop).toBe(false);
    expect(result.spaceKey).toBe(spaceKey);
    expect(result.rewrittenCount).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.userId).toBe(accountUserId);
    expect(writes[0]?.data).not.toHaveProperty("apiKey");
    expect(patches).toHaveLength(1);
    expect(patches[0]?.dbKey).toBe(spaceKey);
    expect(patches[0]?.changes).toHaveProperty("contents");
    expect(getSyncMapping(localAgentKey, accountUserId)?.remoteDbKey).toBe(
      result.agentResults[0]?.remoteDbKey
    );
  });

  it("zero local Agents is honest no-op (no write/patch)", async () => {
    const remote = "agent-userA-01REMOTE";
    const space = makeSpace({
      [remote]: {
        title: "Remote",
        type: "agent",
        contentKey: remote,
      },
    });

    const writes: unknown[] = [];
    const patches: unknown[] = [];

    const dispatch = ((action: unknown) => ({
      unwrap: async () => {
        if (!action || typeof action !== "object") return null;
        const arg = action as Record<string, unknown>;
        if ("dbKey" in arg && !("data" in arg) && !("changes" in arg)) {
          const key = String(arg.dbKey);
          if (key === spaceKey) return { ...space };
          if (key === remote) {
            return {
              dbKey: remote,
              userId: accountUserId,
              type: "agent",
            };
          }
          return null;
        }
        if ("data" in arg) writes.push(arg);
        if ("changes" in arg) patches.push(arg);
        return arg;
      },
    })) as { (action: unknown): { unwrap: () => Promise<unknown> } };

    const result = await runSyncAccountSpaceLocalAgentsToAccount(
      { spaceKey, accountUserId },
      dispatch
    );

    expect(result.noop).toBe(true);
    expect(result.rewrittenCount).toBe(0);
    expect(writes).toHaveLength(0);
    expect(patches).toHaveLength(0);
  });

  it("adapter source never auto-invokes from login/onboarding", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(import.meta.dir, "./runSyncAccountSpaceLocalAgentsToAccount.ts"),
      "utf8"
    );
    expect(source).toContain("Never auto-invoked");
    expect(source).toContain("read, write, patch");
    expect(source).toContain("syncAccountSpaceLocalAgentsToAccount");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("createSyncMappingStore");
  });
});
