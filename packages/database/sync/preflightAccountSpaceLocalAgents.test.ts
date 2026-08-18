import { describe, expect, test } from "bun:test";

import {
  buildRewrittenSpaceContents,
  buildSpaceContentsPatchChanges,
  isDeviceLocalContentKey,
  preflightAccountSpaceLocalAgents,
  type SpaceContentsLike,
} from "./preflightAccountSpaceLocalAgents";

const localAgentA = "agent-local-01AGENTA";
const localAgentB = "agent-local-01AGENTB";
const remoteAgent = "agent-userA-01REMOTEA";
const publicAgent = "agent-public-01PUBLICA";
const localDialog = "dialog-local-01DIALOGA";
const localPage = "page-local-01PAGEA";
const localFile = "file-local-01FILEA";
const localImage = "image-local-01IMAGEA";
const localApp = "app-local-01APPA";
const localTask = "task-local-01TASKA";
const localTable = "meta-local-01TABLEA";

const content = (
  contentKey: string,
  type: string,
  extra: Record<string, unknown> = {}
) => ({
  title: `t-${contentKey}`,
  type,
  contentKey,
  categoryId: "cat-1",
  pinned: false,
  createdAt: 100,
  updatedAt: 200,
  order: 1,
  tags: ["tag-a"],
  ...extra,
});

describe("isDeviceLocalContentKey", () => {
  test("detects agent/dialog prefixes and type-local-* keys", () => {
    expect(isDeviceLocalContentKey(localAgentA)).toBe(true);
    expect(isDeviceLocalContentKey(localDialog)).toBe(true);
    expect(isDeviceLocalContentKey(localPage)).toBe(true);
    expect(isDeviceLocalContentKey(localFile)).toBe(true);
    expect(isDeviceLocalContentKey(localTable)).toBe(true);
    expect(isDeviceLocalContentKey(remoteAgent)).toBe(false);
    expect(isDeviceLocalContentKey(publicAgent)).toBe(false);
    expect(isDeviceLocalContentKey("")).toBe(false);
  });
});

describe("preflightAccountSpaceLocalAgents", () => {
  test("pure matrix: queue local agents, preserve remotes, count tombstones", async () => {
    const contents: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent", { order: 3, pinned: true }),
      [localAgentB]: content(localAgentB, "agent"),
      [remoteAgent]: content(remoteAgent, "agent", { categoryId: "cat-remote" }),
      [publicAgent]: content(publicAgent, "agent"),
      "page-userA-01PAGE": content("page-userA-01PAGE", "page"),
      // null tombstones must not fail preflight
      "agent-local-01GONE": null,
      "orphan-tombstone": null,
    };

    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, { dbKey: localAgentA, userId: "local", type: "agent" }],
      [localAgentB, { dbKey: localAgentB, userId: "local", type: "agent" }],
      [remoteAgent, { dbKey: remoteAgent, userId: "userA", type: "agent" }],
      [publicAgent, { dbKey: publicAgent, userId: "public", type: "agent" }],
      [
        "page-userA-01PAGE",
        { dbKey: "page-userA-01PAGE", userId: "userA", type: "page" },
      ],
    ]);

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) => records.get(key) ?? null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.queuedLocalAgents).toEqual([
      { entryKey: localAgentA, contentKey: localAgentA, type: "agent" },
      { entryKey: localAgentB, contentKey: localAgentB, type: "agent" },
    ]);
    expect(result.preservedRemoteCount).toBe(3);
    expect(result.tombstoneCount).toBe(2);
    expect(result.nonNullCount).toBe(5);
    // Input not mutated.
    expect(contents[localAgentA]?.contentKey).toBe(localAgentA);
    expect(contents["agent-local-01GONE"]).toBeNull();
  });

  test("unsupported device-local non-agent types reject with stable type counts", async () => {
    const contents: SpaceContentsLike = {
      [localDialog]: content(localDialog, "dialog"),
      [localPage]: content(localPage, "page"),
      [localFile]: content(localFile, "file"),
      [localImage]: content(localImage, "image"),
      [localApp]: content(localApp, "app"),
      [localTask]: content(localTask, "task"),
      [localTable]: content(localTable, "table"),
      "weird-local-01X": content("weird-local-01X", "mystery"),
      // one supported agent so we prove mixed catalogs still reject wholly
      [localAgentA]: content(localAgentA, "agent"),
    };

    const records = new Map<string, Record<string, unknown>>([
      [localAgentA, { dbKey: localAgentA, userId: "local", type: "agent" }],
      [localDialog, { dbKey: localDialog, userId: "local", type: "dialog" }],
      [localPage, { dbKey: localPage, userId: "local", type: "page" }],
      [localFile, { dbKey: localFile, userId: "local", type: "file" }],
      [localImage, { dbKey: localImage, userId: "local", type: "image" }],
      [localApp, { dbKey: localApp, userId: "local", type: "app" }],
      [localTask, { dbKey: localTask, userId: "local", type: "task" }],
      [localTable, { dbKey: localTable, userId: "local", type: "table" }],
      [
        "weird-local-01X",
        { dbKey: "weird-local-01X", userId: "local", type: "mystery" },
      ],
    ]);

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) => records.get(key) ?? null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unsupported_local_content");
    expect(result.unsupportedByType).toMatchObject({
      dialog: 1,
      page: 1,
      file: 1,
      image: 1,
      app: 1,
      task: 1,
      table: 1,
      unknown: 1,
    });
    expect(result.details).toHaveLength(8);
    expect(
      result.details.every((d) => d.reason === "unsupported_device_local_content")
    ).toBe(true);
    // Local agent was classified as queueable but whole preflight still fails.
    expect(result.queuedLocalAgents).toEqual([
      { entryKey: localAgentA, contentKey: localAgentA, type: "agent" },
    ]);
  });

  test("missing local agent record rejects before success claim", async () => {
    const contents: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent"),
      [remoteAgent]: content(remoteAgent, "agent"),
    };

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) =>
        key === remoteAgent
          ? { dbKey: remoteAgent, userId: "userA", type: "agent" }
          : null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_or_tombstoned_record");
    expect(result.details).toEqual([
      {
        entryKey: localAgentA,
        contentKey: localAgentA,
        type: "agent",
        reason: "missing_or_tombstoned_record",
      },
    ]);
    expect(result.queuedLocalAgents).toEqual([]);
    expect(result.preservedRemoteCount).toBe(1);
  });

  test("tombstoned local agent rejects", async () => {
    const contents: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent"),
    };

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async () => ({
        dbKey: localAgentA,
        userId: "local",
        type: "agent",
        deleted: true,
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_or_tombstoned_record");
    expect(result.details[0]?.reason).toBe("missing_or_tombstoned_record");
  });

  test("never silently skips non-null local refs; null tombstones untouched", async () => {
    const contents: SpaceContentsLike = {
      [localDialog]: content(localDialog, "dialog"),
      "gone-key": null,
    };

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) =>
        key === localDialog
          ? { dbKey: localDialog, userId: "local", type: "dialog" }
          : null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.details).toHaveLength(1);
    expect(result.details[0]?.type).toBe("dialog");
    expect(result.details[0]?.reason).toBe("unsupported_device_local_content");
    expect(result.tombstoneCount).toBe(1);
    expect(contents["gone-key"]).toBeNull();
  });

  test("does not mutate input contents map or entry objects", async () => {
    const entry = content(localAgentA, "agent", { pinned: true });
    const contents: SpaceContentsLike = {
      [localAgentA]: entry,
      "t": null,
    };
    const frozen = JSON.stringify(contents);

    await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async () => ({
        dbKey: localAgentA,
        userId: "local",
        type: "agent",
      }),
    });

    expect(JSON.stringify(contents)).toBe(frozen);
    expect(contents[localAgentA]).toBe(entry);
  });

  test("mismatched local dialog key + type agent never queues as Agent", async () => {
    const contents: SpaceContentsLike = {
      // Malicious/stale catalog: dialog key labeled as agent
      [localDialog]: content(localDialog, "agent", {
        title: "looks like agent",
      }),
      [localAgentA]: content(localAgentA, "agent"),
    };

    const readKeys: string[] = [];
    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) => {
        readKeys.push(key);
        if (key === localDialog) {
          return { dbKey: localDialog, userId: "local", type: "dialog" };
        }
        if (key === localAgentA) {
          return { dbKey: localAgentA, userId: "local", type: "agent" };
        }
        return null;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("authoritative_type_mismatch");
    expect(result.details).toEqual([
      {
        entryKey: localDialog,
        contentKey: localDialog,
        type: "dialog",
        reason: "authoritative_type_mismatch",
      },
    ]);
    // Must not queue the dialog as an agent; real agent may still be classified.
    expect(result.queuedLocalAgents).toEqual([
      { entryKey: localAgentA, contentKey: localAgentA, type: "agent" },
    ]);
    expect(result.unsupportedByType).toMatchObject({ dialog: 1 });
    expect(readKeys).toContain(localDialog);
    expect(readKeys).toContain(localAgentA);
  });

  test("agent-looking key with non-Agent authoritative record rejects", async () => {
    const fakeAgentKey = "agent-local-01FAKEPAGE";
    const contents: SpaceContentsLike = {
      [fakeAgentKey]: content(fakeAgentKey, "agent"),
    };

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) =>
        key === fakeAgentKey
          ? {
              dbKey: fakeAgentKey,
              userId: "local",
              type: "page",
              title: "not really an agent",
            }
          : null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("authoritative_type_mismatch");
    expect(result.queuedLocalAgents).toEqual([]);
    expect(result.details).toEqual([
      {
        entryKey: fakeAgentKey,
        contentKey: fakeAgentKey,
        type: "page",
        reason: "authoritative_type_mismatch",
      },
    ]);
  });

  test("missing or tombstoned remote refs reject; valid remotes preserved", async () => {
    const missingRemote = "agent-userA-01MISSING";
    const tombstonedRemote = "page-userA-01TOMB";
    const liveRemote = "agent-userA-01LIVE";
    const publicLive = "agent-public-01LIVE";

    const contents: SpaceContentsLike = {
      [missingRemote]: content(missingRemote, "agent"),
      [tombstonedRemote]: content(tombstonedRemote, "page"),
      [liveRemote]: content(liveRemote, "agent"),
      [publicLive]: content(publicLive, "agent"),
      [localAgentA]: content(localAgentA, "agent"),
    };

    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) => {
        if (key === missingRemote) return null;
        if (key === tombstonedRemote) {
          return {
            dbKey: tombstonedRemote,
            userId: "userA",
            type: "page",
            deleted: true,
          };
        }
        if (key === liveRemote) {
          return { dbKey: liveRemote, userId: "userA", type: "agent" };
        }
        if (key === publicLive) {
          return { dbKey: publicLive, userId: "public", type: "agent" };
        }
        if (key === localAgentA) {
          return { dbKey: localAgentA, userId: "local", type: "agent" };
        }
        return null;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_or_tombstoned_record");
    expect(
      result.details.filter((d) => d.reason === "missing_or_tombstoned_record")
    ).toHaveLength(2);
    expect(
      result.details.map((d) => d.contentKey).sort()
    ).toEqual([missingRemote, tombstonedRemote].sort());
    // Valid remotes still counted as preserved; local agent still classified.
    expect(result.preservedRemoteCount).toBe(2);
    expect(result.queuedLocalAgents).toEqual([
      { entryKey: localAgentA, contentKey: localAgentA, type: "agent" },
    ]);
  });

  test("readRecord cache avoids duplicate reads of the same key", async () => {
    const sharedKey = localAgentA;
    const contents: SpaceContentsLike = {
      // Two catalog entries pointing at the same contentKey
      entryA: content(sharedKey, "agent", { order: 1 }),
      entryB: { ...content(sharedKey, "agent", { order: 2 }), contentKey: sharedKey },
    };

    let reads = 0;
    const result = await preflightAccountSpaceLocalAgents(contents, {
      readRecord: async (key) => {
        if (key === sharedKey) {
          reads += 1;
          return { dbKey: sharedKey, userId: "local", type: "agent" };
        }
        return null;
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.queuedLocalAgents).toHaveLength(2);
    expect(reads).toBe(1);
  });
});

describe("buildRewrittenSpaceContents", () => {
  test("rewrites only agent keys and preserves metadata/tombstones", () => {
    const contents: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent", {
        order: 7,
        pinned: true,
        categoryId: "cat-keep",
        tags: ["keep-me"],
      }),
      [localAgentB]: content(localAgentB, "agent", { order: 2 }),
      [remoteAgent]: content(remoteAgent, "agent", { categoryId: "already" }),
      "tombstone-key": null,
    };
    const originalA = contents[localAgentA]!;

    const remoteA = "agent-userA-01MAPA";
    const remoteB = "agent-userA-01MAPB";
    const { contents: next, collisions, rewrittenCount } =
      buildRewrittenSpaceContents({
        contents,
        rewrites: [
          { localKey: localAgentA, remoteKey: remoteA },
          { localKey: localAgentB, remoteKey: remoteB },
        ],
      });

    expect(collisions).toEqual([]);
    expect(rewrittenCount).toBe(2);
    expect(next[localAgentA]).toBeUndefined();
    expect(next[localAgentB]).toBeUndefined();
    expect(next[remoteA]).toMatchObject({
      title: `t-${localAgentA}`,
      type: "agent",
      contentKey: remoteA,
      order: 7,
      pinned: true,
      categoryId: "cat-keep",
      tags: ["keep-me"],
      createdAt: 100,
      updatedAt: 200,
    });
    expect(next[remoteB]?.contentKey).toBe(remoteB);
    expect(next[remoteAgent]?.contentKey).toBe(remoteAgent);
    expect(next["tombstone-key"]).toBeNull();
    // Source map and entry object unchanged.
    expect(contents[localAgentA]).toBe(originalA);
    expect(contents[localAgentA]?.contentKey).toBe(localAgentA);
  });

  test("detects collision when remote key already occupies a live entry", () => {
    const contents: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent"),
      [remoteAgent]: content(remoteAgent, "agent", { title: "existing" }),
    };

    const { collisions, rewrittenCount, contents: next } =
      buildRewrittenSpaceContents({
        contents,
        rewrites: [{ localKey: localAgentA, remoteKey: remoteAgent }],
      });

    expect(rewrittenCount).toBe(0);
    expect(collisions).toEqual([
      {
        localKey: localAgentA,
        remoteKey: remoteAgent,
        existingEntryKey: remoteAgent,
      },
    ]);
    // Collision must not partially rewrite.
    expect(next[localAgentA]?.contentKey).toBe(localAgentA);
    expect(next[remoteAgent]?.title).toBe("existing");
  });
});

describe("buildSpaceContentsPatchChanges", () => {
  test("emits null for removed local keys and new remote entries only", () => {
    const previous: SpaceContentsLike = {
      [localAgentA]: content(localAgentA, "agent", { order: 1 }),
      [remoteAgent]: content(remoteAgent, "agent"),
      "tomb": null,
    };
    const next: SpaceContentsLike = {
      "agent-userA-01MAPA": content("agent-userA-01MAPA", "agent", {
        order: 1,
        title: `t-${localAgentA}`,
      }),
      [remoteAgent]: content(remoteAgent, "agent"),
      "tomb": null,
    };

    const changes = buildSpaceContentsPatchChanges(previous, next);
    expect(changes[localAgentA]).toBeNull();
    expect(changes["agent-userA-01MAPA"]?.contentKey).toBe(
      "agent-userA-01MAPA"
    );
    expect(changes[remoteAgent]).toBeUndefined();
    expect(changes["tomb"]).toBeUndefined();
  });
});
