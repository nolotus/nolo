import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { MemoryDB } from "./MemoryDB";
import { createTestAuthorityStore } from "./testAuthorityStore";

const testDb = new MemoryDB();
const authorityStore = createTestAuthorityStore(testDb as any);
let moduleVersion = 0;
const forbiddenLegacyDb = {
  get: async () => {
    throw new Error("legacy serverDb.get should not be used");
  },
};

const loadModule = async () => {
  mock.module("./db", () => ({
    default: forbiddenLegacyDb,
    getServerAuthorityStore: () => authorityStore,
    ensureServerDbOpen: async () => {},
  }));
  return import(`./spaceMemberAuthority.ts`);
};

describe("spaceMemberAuthority", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("allows an existing space member to add another space member record", async () => {
    await testDb.put("space-spacea", {
      dbKey: "space-spacea",
      ownerId: "owner-1",
      members: ["owner-1", "member-1"],
    });

    const { canWriteSpaceMemberRecord } = await loadModule();

    await expect(
      canWriteSpaceMemberRecord({
        dbKey: "space-member-user-2-spacea",
        actionUserId: "member-1",
      })
    ).resolves.toBe(true);
  });

  it("allows the target member to delete their own membership record", async () => {
    const { canDeleteSpaceMemberRecord } = await loadModule();

    await expect(
      canDeleteSpaceMemberRecord({
        dbKey: "space-member-user-2-spacea",
        actionUserId: "user-2",
      })
    ).resolves.toBe(true);
  });
});
