import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

import { MemoryDB } from "database-engine/MemoryDB";
import { createKey } from "database/keys";
import { createTestAuthorityStore } from "database-engine/testAuthorityStore";
import { DataType } from "create/types";

const testDb = new MemoryDB();
const chargeTokenUsageWithLedgerMock = mock(async () => ({
  success: true,
  status: "charged",
  txId: "token-test",
  amountCredits: 0,
  balance: 100,
}));
const EXTERNAL_TOOL_COST_PATH = fileURLToPath(
  new URL("./externalToolCost.ts", import.meta.url)
);
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
  mock.module("billing", () => ({
    chargeTokenUsageWithLedger: chargeTokenUsageWithLedgerMock,
  }));
  return import(`${EXTERNAL_TOOL_COST_PATH}?authorityStore=${moduleVersion++}`);
}

describe("externalToolCost authority store defaults", () => {
  beforeEach(() => {
    testDb.clear();
    chargeTokenUsageWithLedgerMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("uses the authority store for usage records and dialog projection updates", async () => {
    const userId = "user-1";
    const dialogId = "01TESTEXTERNALTOOLAUTH0001";
    const dialogKey = createKey(DataType.DIALOG, userId, dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 1.5,
    });

    const { chargeExternalTool } = await loadModule();
    const result = await chargeExternalTool({
      userId,
      toolId: "gpt-image-2",
      dialogId,
      count: 1,
      reason: "openai_image:gpt-image-2",
    });

    expect(result).toEqual({ cost: 0.42384, skipped: false });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        userId,
        reason: "openai_image:gpt-image-2",
      })
    );
    const dialog = await testDb.get(dialogKey);
    expect(dialog.totalCost).toBe(1.92384);
  });
});
