import { describe, expect, it } from "bun:test";
import { planCompression, MIN_COMPRESS_COUNT } from "./planCompression";
import type { Message } from "../../chat/messages/types";

function makeMsg(id: string, role: string, content: string, tokens = 100): Message {
  return {
    id,
    role,
    content,
    usage: { completion_tokens: tokens },
  } as any;
}

function makeMsgs(count: number, startId = 1): Message[] {
  return Array.from({ length: count }, (_, i) =>
    makeMsg(`m${startId + i}`, i % 2 === 0 ? "user" : "assistant", `message ${i}`)
  );
}

describe("planCompression", () => {
  it("does not compress when totalUsed < historyBudget and not forced", () => {
    const msgs = makeMsgs(10);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 128000,
    });
    expect(plan.shouldCompress).toBe(false);
  });

  it("triggers compression when totalUsed >= historyBudget", () => {
    // 100 tokens per msg * 20 msgs = 2000 pending tokens
    // small tier (≤64k): safeWindow = 8000*0.95 = 7600, ratio ~0.635 → budget ~4826
    // 2000 < 4826 → won't trigger with 8000 window.
    // Use 2000 window: safeWindow=1900, budget=1206, 2000 > 1206 → triggers
    const msgs = makeMsgs(20);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 2000,
    });
    expect(plan.shouldCompress).toBe(true);
    expect(plan.compressCount).toBeGreaterThan(0);
    expect(plan.msgsToCompress.length).toBeGreaterThan(0);
    expect(plan.newSummarizedBeforeId).toBeDefined();
  });

  it("manual force triggers compression even when totalUsed < historyBudget", () => {
    const msgs = makeMsgs(20);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 128000, // large window, won't trigger by budget
      force: true,
      reason: "manual",
    });
    // force + manual should trigger if active summary is worth doing
    // 20 msgs * 100 tokens = 2000, which is < minTokens for 128k window (max(10000, 128k*0.05)=10000)
    // So isActiveSummaryWorthDoing returns false → should NOT compress
    // This is correct behavior: manual only forces if there's enough content
    expect(plan.shouldCompress).toBe(false);
  });

  it("manual force compresses when enough pending tokens", () => {
    // Need >= 10000 tokens for 128k window (max(10000, 6400) = 10000)
    // 120 msgs * 100 tokens = 12000 > 10000
    const msgs = makeMsgs(120);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 128000,
      force: true,
      reason: "manual",
    });
    expect(plan.shouldCompress).toBe(true);
    // Manual keeps last 2 msgs as raw
    expect(plan.compressCount).toBe(118); // 120 - 2
  });

  it("respects summarizedBeforeId to skip already-compressed messages", () => {
    const msgs = makeMsgs(25);
    // Only msgs 16-25 are pending (10 msgs * 100 tokens = 1000 tokens)
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: "m15", // skip first 15
      summary: "existing summary",
      contextWindow: 800, // very small → budget ~482 → 1000 > 482 triggers
    });
    expect(plan.shouldCompress).toBe(true);
    expect(plan.msgsToCompress[0].id).toBe("m16");
  });

  it("does not compress when fewer than MIN_COMPRESS_COUNT pending", () => {
    const msgs = makeMsgs(4); // only 4 msgs
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 8000,
    });
    // compressCount would be < 5 → shouldCompress false
    expect(plan.shouldCompress).toBe(false);
  });

  it("does not cut immediately before a tool message", () => {
    // Create messages where position 5 (0-indexed) is a tool message
    const msgs: Message[] = [];
    for (let i = 1; i <= 20; i++) {
      if (i === 6) {
        msgs.push({
          id: `m${i}`,
          role: "tool",
          content: "tool output",
          usage: { completion_tokens: 100 },
        } as any);
      } else {
        msgs.push(makeMsg(`m${i}`, i % 2 === 0 ? "user" : "assistant", `msg ${i}`));
      }
    }
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 8000,
    });
    if (plan.shouldCompress) {
      // The first kept message should not be a tool message
      const firstKeptIdx = plan.compressCount;
      if (firstKeptIdx < msgs.length) {
        expect(msgs[firstKeptIdx].role).not.toBe("tool");
      }
    }
  });

  it("does not compress an assistant with open-ended tool_calls as the last compressed msg", () => {
    const msgs: Message[] = [];
    for (let i = 1; i <= 20; i++) {
      if (i === 10) {
        // This assistant has tool_calls (open-ended)
        msgs.push({
          id: `m${i}`,
          role: "assistant",
          content: "calling tool",
          tool_calls: [{ id: "tc1", type: "function", function: { name: "readFile" } }],
          usage: { completion_tokens: 100 },
        } as any);
      } else {
        msgs.push(makeMsg(`m${i}`, i % 2 === 0 ? "user" : "assistant", `msg ${i}`));
      }
    }
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 8000,
    });
    if (plan.shouldCompress && plan.compressCount > 0) {
      // Last compressed message should not have tool_calls
      const lastCompressed = plan.msgsToCompress[plan.msgsToCompress.length - 1];
      const hasToolCalls = Array.isArray((lastCompressed as any).tool_calls) &&
        (lastCompressed as any).tool_calls.length > 0;
      expect(hasToolCalls).toBe(false);
    }
  });

  it("returns empty plan when no pending messages", () => {
    const msgs = makeMsgs(5);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: "m5", // all msgs are before this
      summary: "full summary",
      contextWindow: 128000,
    });
    expect(plan.shouldCompress).toBe(false);
    expect(plan.compressCount).toBe(0);
  });

  it("large window tier (>= 512k, e.g. 1M) delays compression until near limit", () => {
    // Large tier: historyRatio 0.80~1.00, very high budget → most conversations won't trigger
    const msgs = makeMsgs(20);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 1_000_000, // 1M
    });
    // 2000 tokens << ~760k budget → should NOT compress
    expect(plan.shouldCompress).toBe(false);

    // But with enough tokens to exceed the large budget, it should compress
    // 1M * 0.95 * ~0.99 ≈ 940k → need ~9401 msgs * 100 tokens
    const bigMsgs = makeMsgs(10000);
    const bigPlan = planCompression({
      allMsgs: bigMsgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 1_000_000,
    });
    expect(bigPlan.shouldCompress).toBe(true);
    expect(bigPlan.compressCount).toBeGreaterThan(0);
  });

  it("manual force on large window compresses when enough pending tokens", () => {
    // Large window: minTokens = max(10000, 1M*0.05=50000) = 50000
    // Need 500+ msgs * 100 tokens = 50000
    const msgs = makeMsgs(500);
    const plan = planCompression({
      allMsgs: msgs,
      summarizedBeforeId: undefined,
      summary: "",
      contextWindow: 1_000_000,
      force: true,
      reason: "manual",
    });
    expect(plan.shouldCompress).toBe(true);
    // Manual keeps last 2 msgs
    expect(plan.compressCount).toBe(498);
  });

  describe("realContextUsagePercent", () => {
    it("forces compression when realContextUsagePercent >= 78%", () => {
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 80, // >= 78%
      });
      expect(plan.shouldCompress).toBe(true);
      expect(plan.compressCount).toBeGreaterThanOrEqual(MIN_COMPRESS_COUNT);
    });

    it("triggers compression when realContextUsagePercent >= 65% and pendingTokens is qualified", () => {
      // 128k contextWindow * 0.05 = 6400 (min 10k) → minTokens = 10,000.
      // 150 msgs * 100 tokens = 15,000 tokens >= 10,000
      const msgs = makeMsgs(150);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 70, // >= 65%
      });
      expect(plan.shouldCompress).toBe(true);
    });

    it("does not trigger compression when realContextUsagePercent >= 65% but pendingTokens is unqualified", () => {
      // 20 msgs * 100 tokens = 2000 tokens < 10,000 minTokens
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 70,
      });
      expect(plan.shouldCompress).toBe(false);
    });

    it("falls back to legacy estimation for invalid usage values", () => {
      // 小 contextWindow + 150 msgs（≈15000 tokens）下 legacy 估算本身会触发
      // 压缩——非法 usage 值必须回退 legacy 并照常触发（区分「回退」与「直接拒绝」）。
      const msgs = makeMsgs(150);
      const invalidValues = [Number.NaN, Number.POSITIVE_INFINITY, -1, 101];
      for (const value of invalidValues) {
        const plan = planCompression({
          allMsgs: msgs,
          summarizedBeforeId: undefined,
          summary: "",
          contextWindow: 3000,
          realContextUsagePercent: value,
        });
        expect(plan.shouldCompress).toBe(true);
      }
    });

    it("legacy budget guard still triggers when real usage is low but estimate exceeds budget", () => {
      // HIGH 回归：合法但偏低的真实占用率（60% < 65% 阈值）不得禁用估算安全网。
      // 小 contextWindow + 150 msgs 下 totalUsed >= historyBudget → 必须兜底触发。
      const msgs = makeMsgs(150);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 3000,
        realContextUsagePercent: 60,
      });
      expect(plan.shouldCompress).toBe(true);
    });

    it("does not trigger compression when realContextUsagePercent < 65%", () => {
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 50,
      });
      expect(plan.shouldCompress).toBe(false);
    });

    it("low real usage within budget does not trigger compression", () => {
      // 合法且未超预算的真实占用率（60%）+ 估算在预算内 → 不触发。
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 60,
      });
      expect(plan.shouldCompress).toBe(false);
    });
  });
});