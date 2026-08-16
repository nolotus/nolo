import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

import { MemoryDB } from "database-engine/MemoryDB";
import { createKey } from "database/keys";
import { createTestAuthorityStore } from "database-engine/testAuthorityStore";
import { DataType } from "create/types";

const testDb = new MemoryDB();
const WRITER_PATH = fileURLToPath(new URL("./serverTokenWriter.ts", import.meta.url));
let moduleVersion = 0;

const legacyDbError = () => {
  throw new Error("legacy serverDb should not be used");
};

async function loadModule() {
  mock.module("database-engine/db", () => ({
    default: {
      get: legacyDbError,
      batch: legacyDbError,
      put: legacyDbError,
    },
    getServerAuthorityStore: () => createTestAuthorityStore(testDb as any),
    ensureServerDbOpen: async () => {},
  }));
  mock.module("database-engine/db.js", () => ({
    default: {
      get: legacyDbError,
      batch: legacyDbError,
      put: legacyDbError,
    },
    getServerAuthorityStore: () => createTestAuthorityStore(testDb as any),
    ensureServerDbOpen: async () => {},
  }));
  return import(`${WRITER_PATH}?authorityStore=${moduleVersion++}`);
}

describe("serverTokenWriter authority store defaults", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("uses the authority store for token writes and dialog projection updates", async () => {
    const dialogId = "01TESTSERVERTOKENAUTH0001";
    const dialogKey = createKey(DataType.DIALOG, "user-1", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 1,
      outputTokens: 2,
      totalCost: 1,
    });

    const { writeServerTokenRecord } = await loadModule();
    await writeServerTokenRecord({
      userId: "user-1",
      username: "tester",
      agentKey: "agent-user-1",
      agentConfig: {
        model: "gpt-5.5",
        provider: "openai",
        inputPrice: 1_000,
        outputPrice: 2_000,
      },
      runId: dialogId,
      rawUsage: {
        input_tokens: 3,
        output_tokens: 4,
      } as any,
    });

    const dialog = await testDb.get(dialogKey);
    expect(dialog.inputTokens).toBe(4);
    expect(dialog.outputTokens).toBe(6);
    expect(dialog.totalCost).toBeGreaterThan(1);
  });
});
