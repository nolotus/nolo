import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

import { MemoryDB } from "database-engine/MemoryDB";
import { createKey, createTokenStatsKey } from "database/keys";
import { createTestAuthorityStore } from "database-engine/testAuthorityStore";
import { DataType } from "create/types";

const testDb = new MemoryDB();
const deductUserBalanceMock = mock(async () => ({ success: true, txId: "legacy-test" }));
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

const loadExternalToolCostModule = async () => {
  const authorityStore = createTestAuthorityStore(testDb as any);
  mock.module("database-engine/db", () => ({
    default: testDb,
    getServerAuthorityStore: () => authorityStore,
    ensureServerDbOpen: async () => {},
  }));
  mock.module("database-engine/db.js", () => ({
    default: testDb,
    getServerAuthorityStore: () => authorityStore,
    ensureServerDbOpen: async () => {},
  }));

  mock.module("auth/server/deduct", () => ({
    deductUserBalance: deductUserBalanceMock,
  }));
  mock.module("billing", () => ({
    chargeTokenUsageWithLedger: chargeTokenUsageWithLedgerMock,
  }));

  const mod = await import(`${EXTERNAL_TOOL_COST_PATH}`);
  mock.restore();
  return mod;
};

describe("chargeExternalTool", () => {
  beforeEach(() => {
    testDb.clear();
    deductUserBalanceMock.mockClear();
    chargeTokenUsageWithLedgerMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("patches dialog totals when a dialog-scoped tool charge is recorded", async () => {
    const userId = "user-1";
    const dialogId = "01TESTEXTERNALTOOL0000001";
    const dialogKey = createKey(DataType.DIALOG, userId, dialogId);

    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 1.5,
    });

    const { chargeExternalTool } = await loadExternalToolCostModule();
    const result = await chargeExternalTool({
      userId,
      toolId: "gpt-image-2",
      dialogId,
      count: 2,
      reason: "openai_image:gpt-image-2",
    });

    expect(result).toEqual({
      cost: 0.84768, // 0.42384 * 2
      skipped: false,
    });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        userId,
        reason: "openai_image:gpt-image-2",
        tokenRecord: expect.objectContaining({
          userId,
          agentId: "external_tool",
          cybotId: "external_tool",
          model: "gpt-image-2",
          dialogId,
          cost: 0.84768,
        }),
      })
    );
    const chargeArgs = (chargeTokenUsageWithLedgerMock.mock.calls as any[])[0]?.[0];
    expect(chargeArgs.txId).toBe(`token-${chargeArgs.tokenKey}`);

    const dialog = await testDb.get(dialogKey);
    expect(dialog.totalCost).toBe(2.34768);
    expect(dialog.inputTokens).toBe(10);
    expect(dialog.outputTokens).toBe(20);

    const today = new Date().toISOString().slice(0, 10);
    const stats = await testDb.get(createTokenStatsKey(userId, today));
    expect(stats.total.cost).toBe(0.84768);

    const usageRecord = Object.values(testDb.dump()).find(
      (record: any) => record?.model === "gpt-image-2"
    );
    expect(usageRecord?.dialogId).toBe(dialogId);
    expect(usageRecord?.cost).toBe(0.84768);
  });

  it("charges registered openai image tools as per-call pricing", async () => {
    const { chargeExternalTool } = await loadExternalToolCostModule();
    const result = await chargeExternalTool({
      userId: "user-1",
      toolId: "gpt-image-2",
      count: 1,
      reason: "openai_image:gpt-image-2",
    });

    expect(result).toEqual({
      cost: 0.42384,
      skipped: false,
    });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        userId: "user-1",
        reason: "openai_image:gpt-image-2",
        tokenRecord: expect.objectContaining({
          userId: "user-1",
          agentId: "external_tool",
          cybotId: "external_tool",
          model: "gpt-image-2",
          cost: 0.42384,
        }),
      })
    );
  });

  it("charges OpenAI image generations as a registered external tool", async () => {
    const userId = "user-openai-image";
    const dialogId = "01TESTOPENAIIMAGE000001";
    const dialogKey = createKey(DataType.DIALOG, userId, dialogId);

    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });

    const { chargeExternalTool } = await loadExternalToolCostModule();
    const result = await chargeExternalTool({
      userId,
      toolId: "gpt-image-1.5",
      dialogId,
      count: 2,
      reason: "openai_image:gpt-image-1.5",
    });

    expect(result).toEqual({
      cost: 0.544,
      skipped: false,
    });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        userId,
        reason: "openai_image:gpt-image-1.5",
        tokenRecord: expect.objectContaining({
          userId,
          agentId: "external_tool",
          cybotId: "external_tool",
          model: "gpt-image-1.5",
          dialogId,
          cost: 0.544,
        }),
      })
    );

    const dialog = await testDb.get(dialogKey);
    expect(dialog.totalCost).toBe(0.544);

    const usageRecord = Object.values(testDb.dump()).find(
      (record: any) => record?.model === "gpt-image-1.5"
    );
    expect(usageRecord?.dialogId).toBe(dialogId);
    expect(usageRecord?.cost).toBe(0.544);
  });

  it("charges Google Document AI OCR by processed page count", async () => {
    const { chargeExternalTool } = await loadExternalToolCostModule();
    const result = await chargeExternalTool({
      userId: "user-google-ocr",
      toolId: "google/document-ai-enterprise-ocr",
      pages: 3,
      reason: "google_document_ocr",
    });

    expect(result).toEqual({
      cost: 0.036,
      skipped: false,
    });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-google-ocr",
        reason: "google_document_ocr",
        tokenRecord: expect.objectContaining({
          userId: "user-google-ocr",
          agentId: "external_tool",
          cybotId: "external_tool",
          model: "google/document-ai-enterprise-ocr",
          provider: "google",
          cost: 0.036,
        }),
      })
    );
  });

  it("charges taobaoTmallProductScraper with actor-specific pricing after 2026-07-02 price hike", async () => {
    const { chargeExternalTool } = await loadExternalToolCostModule();
    const result = await chargeExternalTool({
      userId: "user-taobao",
      toolId: "sian.agency~taobao-tmall-product-scraper",
      reason: "apify_actor:sian.agency~taobao-tmall-product-scraper",
    });

    expect(result).toEqual({
      cost: 2.88,
      skipped: false,
    });
    expect(chargeTokenUsageWithLedgerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-taobao",
        reason: "apify_actor:sian.agency~taobao-tmall-product-scraper",
        tokenRecord: expect.objectContaining({
          userId: "user-taobao",
          agentId: "external_tool",
          cybotId: "external_tool",
          model: "sian.agency~taobao-tmall-product-scraper",
          provider: "apify",
          cost: 2.88,
        }),
      })
    );
  });
});
