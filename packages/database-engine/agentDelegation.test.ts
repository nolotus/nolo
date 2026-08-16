import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { MemoryDB } from "./MemoryDB";
import { createTestAuthorityStore } from "./testAuthorityStore";

const testDb = new MemoryDB();
const authorityStore = createTestAuthorityStore(testDb as any);
const forbiddenLegacyDb = {
  get: async () => {
    throw new Error("legacy serverDb.get should not be used");
  },
};
let moduleVersion = 0;

const loadModule = async () => {
  mock.module("./db", () => ({
    default: forbiddenLegacyDb,
    getServerAuthorityStore: () => authorityStore,
    ensureServerDbOpen: async () => {},
  }));
  return import(`./agentDelegation.ts`);
};

describe("agentDelegation", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("loads delegations through the authority store", async () => {
    const { agentDelegationKey, loadAgentDelegation } = await loadModule();

    await testDb.put(agentDelegationKey("user-1", "agent-1"), {
      principalUserId: "user-1",
      agentId: "agent-1",
      scopes: ["db:read"],
      resourcePrefixes: ["dialog-user-1-"],
    });

    await expect(loadAgentDelegation("user-1", "agent-1")).resolves.toEqual(
      expect.objectContaining({
        principalUserId: "user-1",
        agentId: "agent-1",
      })
    );
  });
});
