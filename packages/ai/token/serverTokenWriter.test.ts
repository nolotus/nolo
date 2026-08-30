import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

import { MemoryDB } from "database-engine/MemoryDB";
import { createKey, createTokenKey } from "database/keys";
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

  it("uses the stable token record key to dedupe dialog projection while different calls accumulate", async () => {
    const dialogId = "dialog-stable-projection";
    const dialogKey = createKey(DataType.DIALOG, "user-stable", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });

    const { writeServerTokenRecord } = await loadWriterModule();
    const baseOpts = {
      userId: "user-stable",
      username: "stable",
      agentKey: "agent-stable",
      agentConfig: {
        model: "gpt-5.5",
        provider: "openai",
        inputPrice: 1_000,
        outputPrice: 2_000,
      },
      runId: dialogId,
    };

    const first = await writeServerTokenRecord({
      ...baseOpts,
      usageCallId: "provider-call-a",
      rawUsage: { input_tokens: 100, output_tokens: 20 } as any,
    });
    await writeServerTokenRecord({
      ...baseOpts,
      usageCallId: "provider-call-a",
      rawUsage: { input_tokens: 100, output_tokens: 20 } as any,
    });
    const second = await writeServerTokenRecord({
      ...baseOpts,
      usageCallId: "provider-call-b",
      rawUsage: { input_tokens: 40, output_tokens: 8 } as any,
    });

    expect(first.recordKey).not.toBe(second.recordKey);
    expect(await testDb.get(dialogKey)).toMatchObject({
      inputTokens: 140,
      outputTokens: 28,
      totalCost: Number((first.cost + second.cost).toFixed(6)),
    });
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
      pay: {},
      cost: 0,
      would_have_charged_credits: 0,
      absorbed_credits: 0,
      input_tokens: 0,
      output_tokens: 0,
      model: "deepseek-v4-flash",
      dialogId: "dialog-fail-1",
      errorMessage: "upstream 503: upstream request timed out",
    });
    expect(result.recordKey).toBe(
      createTokenKey.recordForFailedStableCall("user-fail", "provider-call-fail-1")
    );

    // Idempotent per usageCallId: writing again with the same key overwrites
    // the same record and does NOT double-increment failedCount.
    const again = await writeFailedTokenRecord({
      userId: "user-fail",
      agentKey: "agent-fail-1",
      agentConfig: { model: "deepseek-v4-flash", provider: "opencode-go" },
      runId: "dialog-fail-1",
      usageCallId: "provider-call-fail-1",
      errorMessage: "retry",
    });
    expect(again.recordKey).toBe(result.recordKey);

    const statsPrefix = createKey("token", "stats", "day", "user", "user-fail", "");
    let statsKey: string | null = null;
    for await (const [k] of testDb.iterator({ gte: statsPrefix, lte: `${statsPrefix}\uffff` })) {
      if (typeof k === "string" && k.startsWith(statsPrefix)) statsKey = k;
    }
    expect(statsKey).not.toBeNull();
    const stats = (await testDb.get(statsKey as string)) as any;
    expect(stats.total.failedCount).toBe(1);
    expect(stats.total.count).toBe(0);
  });

  it("writeServerTokenRecord with status=failed retains actual usage and catalog-rated credits while cost=0 and billable=false", async () => {
    const dialogId = "dialog-fail-usage-1";
    const dialogKey = createKey(DataType.DIALOG, "user-fail-usage", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });

    const { writeServerTokenRecord } = await loadWriterModule();
    const result = await writeServerTokenRecord({
      userId: "user-fail-usage",
      username: "fail-user",
      agentKey: "agent-fail-usage",
      agentConfig: {
        model: "deepseek-v4-flash",
        provider: "deepseek",
        inputPrice: 3.6,
        outputPrice: 10.8,
      },
      runId: dialogId,
      usageCallId: "call-fail-with-usage",
      status: "failed",
      errorMessage: "upstream connection reset mid-stream",
      rawUsage: {
        prompt_tokens: 200,
        completion_tokens: 80,
        total_tokens: 280,
        prompt_cache_hit_tokens: 50,
        prompt_cache_miss_tokens: 150,
      } as any,
    });

    expect(result.cost).toBe(0);
    expect(result.recordKey).toBe(
      createTokenKey.recordForFailedStableCall("user-fail-usage", "call-fail-with-usage")
    );
    expect(result.tokenRecord).toMatchObject({
      status: "failed",
      billable: false,
      pay: {},
      cost: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      observed_usage: {
        input_tokens: 200,
        output_tokens: 80,
        cache_read_input_tokens: 50,
        cache_creation_input_tokens: 150,
      },
      errorMessage: "upstream connection reset mid-stream",
    });
    expect(result.tokenRecord.would_have_charged_credits).toBeGreaterThan(0);
    expect(result.tokenRecord.absorbed_credits).toBe(result.tokenRecord.would_have_charged_credits);

    // Dialog totals must NOT be incremented for failed attempts
    const dialog = await testDb.get(dialogKey);
    expect(dialog.inputTokens).toBe(0);
    expect(dialog.outputTokens).toBe(0);
    expect(dialog.totalCost).toBe(0);

    // Daily stats must only increment failedCount
    const statsPrefix = createKey("token", "stats", "day", "user", "user-fail-usage", "");
    let statsKey: string | null = null;
    for await (const [k] of testDb.iterator({ gte: statsPrefix, lte: `${statsPrefix}\uffff` })) {
      if (typeof k === "string" && k.startsWith(statsPrefix)) statsKey = k;
    }
    expect(statsKey).not.toBeNull();
    const stats = (await testDb.get(statsKey as string)) as any;
    expect(stats.total.failedCount).toBe(1);
    expect(stats.total.count).toBe(0);
    expect(stats.total.tokens.input).toBe(0);
    expect(stats.total.tokens.output).toBe(0);
    expect(stats.total.cost).toBe(0);
  });

  it("same usageCallId failed then success preserves both audit records and projects stats/dialog correctly", async () => {
    const dialogId = "dialog-retry-same-id";
    const dialogKey = createKey(DataType.DIALOG, "user-retry", dialogId);
    await testDb.put(dialogKey, {
      id: dialogId,
      dbKey: dialogKey,
      type: DataType.DIALOG,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    });

    const { writeServerTokenRecord } = await loadWriterModule();
    const baseOpts = {
      userId: "user-retry",
      username: "retry-user",
      agentKey: "agent-retry",
      agentConfig: {
        model: "deepseek-v4-flash",
        provider: "deepseek",
        inputPrice: 3.6,
        outputPrice: 10.8,
      },
      runId: dialogId,
      usageCallId: "stable-call-retry-1",
    };

    // Attempt 1: Failed
    const failResult = await writeServerTokenRecord({
      ...baseOpts,
      status: "failed",
      errorMessage: "upstream 502 bad gateway",
      rawUsage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } as any,
    });
    expect(failResult.cost).toBe(0);
    expect(failResult.recordKey).toBe(
      createTokenKey.recordForFailedStableCall("user-retry", "stable-call-retry-1")
    );
    expect(failResult.tokenRecord.status).toBe("failed");
    expect(failResult.tokenRecord.billable).toBe(false);
    expect(failResult.tokenRecord.pay).toEqual({});

    // Duplicate failed write does not double-increment failedCount
    const duplicateFail = await writeServerTokenRecord({
      ...baseOpts,
      status: "failed",
      errorMessage: "upstream 502 bad gateway",
      rawUsage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } as any,
    });
    expect(duplicateFail.recordKey).toBe(failResult.recordKey);

    // Attempt 2: Success with same usageCallId
    const successResult = await writeServerTokenRecord({
      ...baseOpts,
      rawUsage: { prompt_tokens: 150, completion_tokens: 60, total_tokens: 210 } as any,
    });
    expect(successResult.recordKey).toBe(
      createTokenKey.recordForStableCall("user-retry", "stable-call-retry-1")
    );
    expect(successResult.recordKey).not.toBe(failResult.recordKey);
    expect(successResult.cost).toBeGreaterThan(0);
    expect(successResult.tokenRecord.status).toBeUndefined();
    expect(successResult.tokenRecord.billable).toBe(true);
    expect(successResult.tokenRecord.cost).toBe(successResult.cost);

    // Both failure audit record and success record are preserved in store
    const failedRecord = await testDb.get(failResult.recordKey);
    expect(failedRecord).toBeDefined();
    expect(failedRecord.status).toBe("failed");
    expect(failedRecord.billable).toBe(false);

    const successRecord = await testDb.get(successResult.recordKey);
    expect(successRecord).toBeDefined();
    expect(successRecord.billable).toBe(true);
    expect(successRecord.cost).toBe(successResult.cost);

    // Dialog totals are updated with the success attempt
    const dialog = await testDb.get(dialogKey);
    expect(dialog.inputTokens).toBe(150);
    expect(dialog.outputTokens).toBe(60);
    expect(dialog.totalCost).toBe(successResult.cost);

    // Daily stats has the success tokens/cost and preserved failedCount from attempt 1
    const statsPrefix = createKey("token", "stats", "day", "user", "user-retry", "");
    let statsKey: string | null = null;
    for await (const [k] of testDb.iterator({ gte: statsPrefix, lte: `${statsPrefix}\uffff` })) {
      if (typeof k === "string" && k.startsWith(statsPrefix)) statsKey = k;
    }
    expect(statsKey).not.toBeNull();
    const stats = (await testDb.get(statsKey as string)) as any;
    expect(stats.total.failedCount).toBe(1);
    expect(stats.total.count).toBe(1);
    expect(stats.total.tokens.input).toBe(150);
    expect(stats.total.tokens.output).toBe(60);
    expect(stats.total.cost).toBe(Number(successResult.cost.toFixed(6)));
  });
});
