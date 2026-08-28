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

    // Cost depends on the Beijing peak/off-peak window at run time.
    // billing fallback 用 DeepSeek 官方 catalog 价覆盖 agent 快照。
    // DeepSeek 人民币计价，经 CNY_UPSTREAM_MULTIPLIER(1.2) 加价：
    // inputPrice ¥3×1.2=3.6 / outputPrice ¥9×1.2=10.8。
    expect(writeResult.cost).toBeGreaterThan(0);
    expect(writeResult.tokenRecord).toMatchObject({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      billing_provider: "deepseek",
      billing_model: "deepseek-v4-flash",
      inputPrice: 3.6,
      outputPrice: 10.8,
    });
  });

  it("snapshots cache unit prices from the billed catalog (US-3.2)", async () => {
    // fireworks minimax-m3 catalog: input 2.4 / output 9.6 / cachingRead 0.48 (credits).
    const { writeServerTokenRecord } = await loadWriterModule();
    const writeResult = await writeServerTokenRecord({
      userId: "user-cache",
      username: "cache-user",
      agentKey: "agent-cache-1",
      agentConfig: {
        model: "accounts/fireworks/models/minimax-m3",
        provider: "fireworks",
        id: "agent-cache-1",
      },
      runId: "dialog-cache-1",
      rawUsage: {
        prompt_tokens: 1_000,
        completion_tokens: 500,
        total_tokens: 1_500,
        prompt_cache_hit_tokens: 400,
        prompt_cache_miss_tokens: 600,
        billing_provider: "fireworks",
        billing_model: "accounts/fireworks/models/minimax-m3",
      } as any,
    });

    expect(writeResult.tokenRecord).toMatchObject({
      model: "accounts/fireworks/models/minimax-m3",
      provider: "fireworks",
      inputPrice: 2.4,
      outputPrice: 9.6,
      // cachingRead 归一化为 inputCacheHitPrice（与 calculatePrice 解析一致）
      inputCacheHitPrice: 0.48,
    });
    // cachingWrite 未声明 → 不写该字段（可选快照）
    expect((writeResult.tokenRecord as any).cacheWritePrice).toBeUndefined();
  });

  it("serializes concurrent writes for the same dialog", async () => {
    const dialogId = "01TESTSERVERTOKEN00000002";    const dialogKey = createKey(DataType.DIALOG, "user-1", dialogId);
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

  // 回归：服务端权威投影后，同一 stable call 的重试/重复转发不得把 stats
  // 再累计一次。细节记录（recordForStableCall）幂等覆盖写无害，但 stats 的
  // inc 必须只发生在首次投影（HIGH #2 幂等护栏）。
  it("同一 usageCallId 重复投影时 stats 只累计一次", async () => {
    const { writeServerTokenRecord } = await loadWriterModule();
    const baseOpts = {
      userId: "user-idem",
      username: "idem",
      agentKey: "agent-idem",
      agentConfig: { model: "glm-5.3", provider: "zai", inputPrice: 2, outputPrice: 8 },
      usageCallId: "stable-call-001",
      rawUsage: { input_tokens: 100, output_tokens: 50 } as any,
    };

    // 第一次：首次投影，stats 应累计 100/50。
    await writeServerTokenRecord(baseOpts as any);
    // 第二次：同一 stable call 的重试，stats 不得再 +，细节仍覆盖写。
    await writeServerTokenRecord(baseOpts as any);

    const statsPrefix = createKey("token", "stats", "day", "user", "user-idem", "");
    let statsKey: string | null = null;
    for await (const [k] of testDb.iterator({ gte: statsPrefix, lte: `${statsPrefix}\uffff` })) {
      if (typeof k === "string" && k.startsWith(statsPrefix)) statsKey = k;
    }
    expect(statsKey).not.toBeNull();
    const stats = (await testDb.get(statsKey as string)) as any;
    expect(stats.total.tokens.input).toBe(100);
    expect(stats.total.tokens.output).toBe(50);

    // 细节记录只有一条（幂等覆盖写，不产生重复明细）。
    const recPrefix = createKey("token", "user-idem", "call", "stable-call-001");
    let recCount = 0;
    for await (const [k] of testDb.iterator({ gte: recPrefix, lte: `${recPrefix}\uffff` })) {
      if (typeof k === "string" && k.startsWith(recPrefix)) recCount++;
    }
    expect(recCount).toBe(1);
  });
  it("writes a failed-call record as not-charged with error message (US-3.3)", async () => {
    const { writeFailedTokenRecord } = await loadWriterModule();
    const result = await writeFailedTokenRecord({
      userId: "user-fail",
      username: "fail-user",
      agentKey: "agent-fail-1",
      agentConfig: {
        model: "deepseek-v4-flash",
        provider: "opencode-go",
        id: "agent-fail-1",
      },
      runId: "dialog-fail-1",
      usageCallId: "provider-call-fail-1",
      errorMessage: "upstream 503: upstream request timed out",
    });

    expect(result.tokenRecord).toMatchObject({
      status: "failed",
      billable: false,
      cost: 0,
      input_tokens: 0,
      output_tokens: 0,
      model: "deepseek-v4-flash",
      dialogId: "dialog-fail-1",
      errorMessage: "upstream 503: upstream request timed out",
    });

    // Idempotent per usageCallId: writing again with the same key overwrites
    // the same record rather than adding a second one.
    const again = await writeFailedTokenRecord({
      userId: "user-fail",
      agentKey: "agent-fail-1",
      agentConfig: { model: "deepseek-v4-flash", provider: "opencode-go" },
      runId: "dialog-fail-1",
      usageCallId: "provider-call-fail-1",
      errorMessage: "retry",
    });
    expect(again.recordKey).toBe(result.recordKey);
  });

});
