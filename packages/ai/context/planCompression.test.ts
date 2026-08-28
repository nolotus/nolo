import { describe, expect, it } from "bun:test";
import { planCompression, MIN_COMPRESS_COUNT } from "./planCompression";
import type { Message } from "../../chat/messages/types";

function makeMsg(id: string, role: string, content: string, tokens = 100): Message {
  // 估算规则：英文 4 字符 ≈ 1 token。用 padding 把 content 填到目标 token 数，
  // 避免依赖 usage.completion_tokens（修复后 getMessageTokenCount 不再读它）。
  const padChars = Math.max(0, tokens * 4 - content.length);
  const padded = padChars > 0 ? content + "x".repeat(padChars) : content;
  return {
    id,
    role,
    content: padded,
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

  describe("token estimation correctness (P-1 fix)", () => {
    it("ignores usage.completion_tokens and estimates from content", () => {
      // Regression for HIGH bug: getMessageTokenCount previously returned
      // usage.completion_tokens (output-side), severely underestimating
      // a large tool result whose content is 50k chars (~12.5k tokens) but
      // whose completion_tokens would be 0 or absent.
      // Build: 1 small user msg + 5 large tool results + 1 small assistant.
      const largeToolContent = "x".repeat(50_000); // ~12.5k tokens
      const msgs: Message[] = [
        makeMsg("u1", "user", "query"),
        ...Array.from({ length: 5 }, (_, i) =>
          makeMsg(`t${i}`, "tool", largeToolContent),
        ),
        makeMsg("a1", "assistant", "done"),
      ];
      // 5 tool results * ~12.5k tokens = ~62.5k pending tokens.
      // contextWindow=8000 (small tier) → safeWindow=7600, budget ~4826.
      // 62.5k >> 4826 → must trigger compression.
      // Before fix: completion_tokens=0 for tool msgs → pendingTokens ~ small
      // → would NOT trigger (BUG).
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
      });
      expect(plan.shouldCompress).toBe(true);
    });

    it("counts tool_calls structure tokens, not just content", () => {
      // An assistant message with a long tool_call arguments JSON should
      // count its arguments tokens, not only the content text.
      const longArgs = JSON.stringify({ path: "x".repeat(8000) });
      const msgs: Message[] = [
        makeMsg("u1", "user", "query"),
        ...Array.from({ length: 6 }, (_, i) =>
          ({
            id: `a${i}`,
            role: "assistant",
            content: "ok",
            tool_calls: [
              {
                function: {
                  name: "readFile",
                  arguments: longArgs,
                },
              },
            ],
          } as any),
        ),
      ];
      // 6 assistant msgs, each ~2k tokens from arguments alone.
      // contextWindow=8000 → budget ~4826, 6*2k=12k > 4826 → triggers.
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
      });
      expect(plan.shouldCompress).toBe(true);
    });
  });

  describe("death spiral guard (P0-1, lastCompactedTokenCount)", () => {
    it("does not re-trigger when totalUsed barely grew since last compaction", () => {
      // 20 msgs * 100 tokens = 2000 pending; contextWindow=2000 → triggers normally.
      const msgs = makeMsgs(20);
      // First compression triggers (no guard).
      const first = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 2000,
      });
      expect(first.shouldCompress).toBe(true);

      // Second call with same msgs but lastCompactedTokenCount=2000:
      // totalUsed (2000) < 2000 + minNewTokens (5000) → guard blocks.
      const second = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 2000,
        lastCompactedTokenCount: 2000,
      });
      expect(second.shouldCompress).toBe(false);
    });

    it("re-triggers when enough new content arrived since last compaction", () => {
      // Use small window so budget is small enough to trigger.
      // contextWindow=8000 → safeWindow=7600, budget ~4826 (small tier).
      // 120 msgs * 100 tokens = 12000 pending. totalUsed=12000 > 4826 → triggers.
      // minNewTokens = max(5000, 8000*0.03=240) = 5000.
      // lastCompactedTokenCount=6000 → 12000 >= 6000+5000=11000 → guard passes.
      const msgs = makeMsgs(120);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
        lastCompactedTokenCount: 6000,
      });
      expect(plan.shouldCompress).toBe(true);
    });

    it("force=true bypasses the guard even with high lastCompactedTokenCount", () => {
      // 120 msgs * 100 tokens = 12000. contextWindow=128000.
      // isActiveSummaryWorthDoing: min(40000, max(10000, 6400)) = 10000. 12000 > 10000 ✓
      // force + manual → shouldRunActiveSummary = true, guard bypassed.
      const msgs = makeMsgs(120);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        force: true,
        reason: "manual",
        lastCompactedTokenCount: 11000, // high enough to block non-force
      });
      expect(plan.shouldCompress).toBe(true);
    });

    it("realContextUsagePercent >= 78% bypasses the guard", () => {
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 128000,
        realContextUsagePercent: 80,
        lastCompactedTokenCount: 100000, // very high, would block normally
      });
      // 80% → shouldTriggerByUsage = true; guard checks usageRatio >= 0.78 → bypassed
      expect(plan.shouldCompress).toBe(true);
    });

    it("ignores invalid lastCompactedTokenCount values", () => {
      const msgs = makeMsgs(20);
      // NaN, Infinity, negative → guard should not activate (treated as no guard)
      for (const bad of [NaN, Infinity, -1]) {
        const plan = planCompression({
          allMsgs: msgs,
          summarizedBeforeId: undefined,
          summary: "",
          contextWindow: 2000,
          lastCompactedTokenCount: bad,
        });
        // With bad guard value, should behave like no guard → triggers normally
        expect(plan.shouldCompress).toBe(true);
      }
    });

    it("lastCompactedTokenCount=0 still guards (no content = no re-trigger)", () => {
      // 0 is a valid number. totalUsed (2000) < 0 + 5000 = 5000 → guard blocks.
      const msgs = makeMsgs(20);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 2000,
        lastCompactedTokenCount: 0,
      });
      expect(plan.shouldCompress).toBe(false);
    });
  });

  describe("tool stub tier (老工具输出 stub 档)", () => {
    // 早期 tool 结果很大（~8k token），最近 3 条 tool 结果很小。
    // 这样 stub 早期大 tool 能显著节省、保留最近 3 条原文，从而回到预算内。
    function bigOldToolMsgs(pairCount: number): Message[] {
      const hugeTool = "y".repeat(32_000); // ~8k token
      const smallTool = "z".repeat(40); // 极小
      const out: Message[] = [];
      for (let i = 0; i < pairCount; i++) {
        out.push(makeMsg(`a${i}`, "assistant", `ask ${i}`));
        // 早期 tool 用大 content，最近 3 条用极小 content
        out.push(makeMsg(`t${i}`, "tool", i < pairCount - 3 ? hugeTool : smallTool));
      }
      out.push(makeMsg("final", "assistant", "done"));
      return out;
    }

    it("≥4 条 tool 结果且 stub 后可回预算 → 触发 stub 档（不生成摘要）", () => {
      // 4 对：前 1 条 tool 大（~8k），后 3 条小。stub 前 1 条大 tool 即回到预算。
      const msgs = bigOldToolMsgs(4);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
      });
      expect(plan.shouldCompress).toBe(true);
      expect(plan.stub).toBeDefined();
      // 保留最近 3 条 tool 原文，stub 第 4 倒数第 3 条之前那 1 条（t0）
      expect(plan.stub!.stubbedCount).toBe(1);
      // beforeId = 第一条被 stub 的 tool 结果 id
      expect(plan.stub!.beforeId).toBe("t0");
      // 摘要路径未占用
      expect(plan.newSummarizedBeforeId).toBeUndefined();
    });

    it("tool 结果 ≤3 条 → 不触发 stub 档", () => {
      const msgs = bigOldToolMsgs(3);
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
      });
      // 3 条 tool 结果 ≤ STUB_KEEP_COUNT → 不 stub
      expect(plan.stub).toBeUndefined();
    });

    it("节省不足回落到 summary 档（stub 不命中）", () => {
      // 大量超预算来自不可 stub 的 user 长消息；tool 结果小 → stub 省不够，
      // 即便触发压缩也不走 stub 档（stub 档要求 savedTokens 足以回到预算）。
      const smallTool = "z".repeat(40);
      const hugeUser = "u".repeat(64_000); // ~16k token，stub 动不了它
      const msgs: Message[] = [
        makeMsg("u0", "user", hugeUser),
        ...Array.from({ length: 5 }, (_, i) => [
          makeMsg(`a${i}`, "assistant", `ask ${i}`),
          makeMsg(`t${i}`, "tool", smallTool),
        ]).flat(),
        makeMsg("a5", "assistant", "done"),
      ];
      const plan = planCompression({
        allMsgs: msgs,
        summarizedBeforeId: undefined,
        summary: "",
        contextWindow: 8000,
      });
      // stub 掉小 tool 结果省不了多少，仍超预算 → 不返回 stub 档
      expect(plan.stub).toBeUndefined();
    });

    it("stub 不触碰 summarizedBeforeId 之前已入摘要的区间", () => {
      // 摘要边界在 old2；pending 内才有 ≥4 条 tool 结果，stub 只发生在 pending 内。
      const pendingTool = bigOldToolMsgs(5); // 5 对 + final
      const allMsgs = [
        makeMsg("old1", "user", "old"),
        makeMsg("old2", "assistant", "old2"),
        ...pendingTool,
      ];
      const plan = planCompression({
        allMsgs,
        summarizedBeforeId: "old2",
        summary: "已有摘要",
        contextWindow: 8000,
      });
      expect(plan.stub).toBeDefined();
      // pending 内第一条 tool 是 t0，保留最后 3 条（t2,t3,t4），stub t0,t1 → beforeId=t1
      expect(plan.stub!.beforeId).toBe("t1");
    });
  });
});