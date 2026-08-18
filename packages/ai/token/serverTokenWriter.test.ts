import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

import { MemoryDB } from "database-engine/MemoryDB";
import { createKey } from "database/keys";
import { createTestAuthorityStore } from "database-engine/testAuthorityStore";
import { DataType } from "create/types";

const testDb = new MemoryDB();
const WRITER_PATH = fileURLToPath(
  new URL("./serverTokenWriter.ts", import.meta.url),
);

let moduleVersion = 0;

const loadWriterModule = async () => {
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
  return import(`${WRITER_PATH}?test=${moduleVersion++}`);
};

describe("writeServerTokenRecord", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("patches dialog token totals alongside server-side usage records", async () => {
    const dialogId = "01TESTSERVERTOKEN00000001";
    const dialogKey = createKey(DataType.DIALOG, "user-1", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 1.5,
    });

    const { writeServerTokenRecord } = await loadWriterModule();
    const writeResult = await writeServerTokenRecord({
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
        provider_response_ids: ["resp_server_1"],
        provider_request_ids: ["req_server_1"],
      } as any,
    });

    expect(writeResult.tokenRecord.provider_response_ids).toEqual(["resp_server_1"]);
    expect(writeResult.tokenRecord.provider_request_ids).toEqual(["req_server_1"]);
    expect(writeResult.tokenRecord.agentId).toBe("agent-user-1");
    expect(writeResult.tokenRecord.cybotId).toBe("agent-user-1");

    const dialog = await testDb.get(dialogKey);
    expect(dialog.inputTokens).toBe(13);
    expect(dialog.outputTokens).toBe(24);
    expect(dialog.totalCost).toBeGreaterThan(1.5);
  });

  // 回归：此处曾只转发 entry_path，漏掉两个前缀字段，导致 agent-run 路径静默
  // 丢掉稳定前缀指纹——prefix churn 观测因此拿不到任何数据。三个缓存归因字段
  // 必须一起落库。
  it("落库缓存归因三字段：entry_path 与两个稳定前缀字段", async () => {
    const { writeServerTokenRecord } = await loadWriterModule();
    const writeResult = await writeServerTokenRecord({
      userId: "user-prefix",
      username: "tester",
      agentKey: "agent-user-prefix",
      agentConfig: { model: "gpt-5.5", provider: "openai", inputPrice: 1, outputPrice: 2 },
      runId: "dialog-prefix-1",
      rawUsage: { input_tokens: 3, output_tokens: 4 } as any,
      stablePrefixHash: "deadbeef",
      stablePrefixEstimatedTokens: 710,
    });

    expect(writeResult.tokenRecord.entry_path).toBe("agent-run");
    expect(writeResult.tokenRecord.stable_prefix_hash).toBe("deadbeef");
    expect(writeResult.tokenRecord.stable_prefix_estimated_tokens).toBe(710);

    const persisted = await testDb.get(writeResult.recordKey);
    expect(persisted.stable_prefix_hash).toBe("deadbeef");
    expect(persisted.stable_prefix_estimated_tokens).toBe(710);
  });

  it("未提供前缀字段时不写入这些键（老调用方不受影响）", async () => {
    const { writeServerTokenRecord } = await loadWriterModule();
    const writeResult = await writeServerTokenRecord({
      userId: "user-noprefix",
      username: "tester",
      agentKey: "agent-user-noprefix",
      agentConfig: { model: "gpt-5.5", provider: "openai", inputPrice: 1, outputPrice: 2 },
      runId: "dialog-noprefix-1",
      rawUsage: { input_tokens: 3, output_tokens: 4 } as any,
    });

    expect("stable_prefix_hash" in writeResult.tokenRecord).toBe(false);
    expect("stable_prefix_estimated_tokens" in writeResult.tokenRecord).toBe(false);
    expect(writeResult.tokenRecord.entry_path).toBe("agent-run");
  });

  it("persists served billing_provider and DeepSeek list cost after Flash fallback", async () => {
    // Consumer path: agentRun resolveAgentRunBilledUsage stamps billing_* then
    // writeServerTokenRecord → prepareTokenUsageData charges official catalog.
    const { writeServerTokenRecord } = await loadWriterModule();
    const writeResult = await writeServerTokenRecord({
      userId: "user-flash",
      username: "flash-user",
      agentKey: "agent-flash-1",
      agentConfig: {
        model: "deepseek-v4-flash",
        provider: "deepseek",
        // Agent snapshot may still carry Ollama list prices.
        inputPrice: 0.03,
        outputPrice: 0.16,
        id: "agent-flash-1",
      },
      runId: "dialog-flash-1",
      rawUsage: {
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
        total_tokens: 2_000_000,
        prompt_cache_hit_tokens: 0,
        prompt_cache_miss_tokens: 0,
        billing_provider: "deepseek",
        billing_model: "deepseek-v4-flash",
      } as any,
    });

    expect(writeResult.cost).toBe(3);
    expect(writeResult.tokenRecord).toMatchObject({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      billing_provider: "deepseek",
      billing_model: "deepseek-v4-flash",
      inputPrice: 1,
      outputPrice: 2,
      cost: 3,
    });
  });

  it("serializes concurrent writes for the same dialog", async () => {
    const dialogId = "01TESTSERVERTOKEN00000002";
    const dialogKey = createKey(DataType.DIALOG, "user-1", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 1,
    });

    const { writeServerTokenRecord } = await loadWriterModule();

    await Promise.all([
      writeServerTokenRecord({
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
      }),
      writeServerTokenRecord({
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
          input_tokens: 5,
          output_tokens: 6,
        } as any,
      }),
    ]);

    const dialog = await testDb.get(dialogKey);
    expect(dialog.inputTokens).toBe(18);
    expect(dialog.outputTokens).toBe(30);
    expect(dialog.totalCost).toBeGreaterThan(1);
  });
});
