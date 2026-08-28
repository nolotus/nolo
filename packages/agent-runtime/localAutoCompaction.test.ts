import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { ACTIVE_SUMMARY_TAIL_KEEP_COUNT } from "../ai/context/planCompression";
import {
  COMPACTION_SUMMARY_SYSTEM_PROMPT,
  COMPACTION_SUMMARY_SCHEMA_VERSION,
  buildCompactionUserContent,
  formatFileOperationsFromMessages,
} from "../ai/context/compactionShared";
import {
  LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT,
  maybeAutoCompactLocalHistory,
  projectHistoryWithSummary,
  toPlanCompressionMessages,
  validateStoredSummary,
  hashSummarySourceSlice,
} from "./localAutoCompaction";
import type { AgentRuntimeHostAdapter, AgentRuntimeProvider } from "./hostAdapter";
import type { AgentRuntimeChatMessage } from "./types";
import { runLocalAgentTurn } from "./localLoop";

type StoredSummary = {
  summary: string;
  summarizedBeforeId?: string;
  stubbedBeforeId?: string;
  sourceHash?: string;
  sourceCount?: number;
  schemaVersion?: number;
};

function msg(
  role: "user" | "assistant" | "tool",
  content: string,
  extra?: Partial<AgentRuntimeChatMessage> & {
    usage?: { completion_tokens?: number };
  },
): AgentRuntimeChatMessage {
  return { role, content, ...(extra as any) };
}

/** 20 条 × ~100 tok（content padding 模拟）；配合 contextWindow=2000 必触发压缩。 */
function oversizedHistory(count = 20): AgentRuntimeChatMessage[] {
  return Array.from({ length: count }, (_, i) =>
    msg(i % 2 === 0 ? "user" : "assistant", "x".repeat(400), {
      usage: { completion_tokens: 100 },
    } as any),
  );
}

function createSummaryStore() {
  const byDialog = new Map<string, StoredSummary>();
  return {
    byDialog,
    load: async (dialogId: string) => byDialog.get(dialogId) ?? null,
    save: async (input: {
      dialogId: string;
      summary: string;
      summarizedBeforeId?: string;
      stubbedBeforeId?: string;
      sourceHash?: string;
      sourceCount?: number;
      schemaVersion?: number;
    }) => {
      byDialog.set(input.dialogId, {
        summary: input.summary,
        ...(input.summarizedBeforeId !== undefined
          ? { summarizedBeforeId: input.summarizedBeforeId }
          : {}),
        stubbedBeforeId: input.stubbedBeforeId,
        ...(input.sourceHash !== undefined
          ? { sourceHash: input.sourceHash }
          : {}),
        ...(input.sourceCount !== undefined
          ? { sourceCount: input.sourceCount }
          : {}),
        ...(input.schemaVersion !== undefined
          ? { schemaVersion: input.schemaVersion }
          : {}),
      });
    },
  };
}

function createAdapter(args: {
  history?: AgentRuntimeChatMessage[];
  loadSummary?: AgentRuntimeHostAdapter["loadDialogSummary"];
  saveSummary?: AgentRuntimeHostAdapter["saveDialogSummary"];
  complete?: AgentRuntimeProvider["complete"];
  onComplete?: (messages: AgentRuntimeChatMessage[]) => void;
}): AgentRuntimeHostAdapter {
  return {
    host: "cli",
    capabilities: ["local-provider", "local-persistence"],
    loadAgentConfig: async (agentRef) => ({
      key: agentRef,
      prompt: "test agent",
      model: "fake-local",
    }),
    loadDialogHistory: async () => args.history ?? [],
    saveTurn: async () => ({ dialogId: "dialog-test" }),
    resolveProvider: async () => ({
      model: "fake-local",
      complete: async (messages, options) => {
        args.onComplete?.(messages as AgentRuntimeChatMessage[]);
        if (args.complete) return args.complete(messages, options);
        return {
          content: `ok:${String(messages.at(-1)?.content ?? "").slice(0, 40)}`,
          model: "fake-local",
          trace: messages as AgentRuntimeChatMessage[],
        };
      },
    }),
    executeTool: async () => ({ content: "tool ok" }),
    ...(args.loadSummary ? { loadDialogSummary: args.loadSummary } : {}),
    ...(args.saveSummary ? { saveDialogSummary: args.saveSummary } : {}),
  };
}

describe("toPlanCompressionMessages bridge", () => {
  test("maps only the fields planCompression reads (id/role/content/tool_calls)", () => {
    const history = [
      msg("assistant", "call tool", {
        tool_calls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "readFile", arguments: "{}" },
          },
        ],
        usage: { completion_tokens: 42 },
      } as any),
      msg("user", "hello"),
    ];
    const bridged = toPlanCompressionMessages(history);
    expect(bridged).toEqual([
      {
        id: "local-0",
        role: "assistant",
        content: "call tool",
        tool_calls: [
          {
            id: "tc1",
            type: "function",
            function: { name: "readFile", arguments: "{}" },
          },
        ],
      },
      {
        id: "local-1",
        role: "user",
        content: "hello",
      },
    ]);
  });
});

describe("maybeAutoCompactLocalHistory", () => {
  test("1. under threshold: no summary generation, no provider call, history unchanged", async () => {
    const store = createSummaryStore();
    let providerCalls = 0;
    const history = [
      msg("user", "hi"),
      msg("assistant", "hello"),
    ];
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      model: "fake-local",
      contextWindow: 256_000,
      resolveProvider: async () => {
        providerCalls += 1;
        return {
          model: "fake",
          complete: async () => {
            throw new Error("provider should not be called");
          },
        };
      },
    });

    expect(result.summaryGenerated).toBe(false);
    expect(result.compressed).toBe(false);
    expect(result.history).toBe(history);
    expect(providerCalls).toBe(0);
    expect(store.byDialog.size).toBe(0);
  });

  test("2. over threshold: generate once, persist once, history becomes summary + kept tail", async () => {
    const store = createSummaryStore();
    let completeCalls = 0;
    const history = oversizedHistory(20);
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async (messages) => {
          completeCalls += 1;
          expect(messages[0]?.content).toBe(LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT);
          // P0-3: 验证 prompt 含第一人称 handoff 要素
          expect(String(messages[0]?.content)).toContain("第一人称");
          expect(String(messages[0]?.content)).toContain("待验证");
          expect(String(messages[1]?.content)).toContain("【新增对话】");
          return {
            content:
              "关键事实档案\n- 已压缩事实\n对话进展与待办\n- 下一步继续",
            model: "fake",
          };
        },
      }),
    });

    expect(completeCalls).toBe(1);
    expect(result.summaryGenerated).toBe(true);
    expect(result.compressed).toBe(true);
    expect(store.byDialog.get("d1")?.summary).toContain("关键事实档案");
    expect(store.byDialog.get("d1")?.summarizedBeforeId).toMatch(/^local-\d+$/);
    // 新生成摘要落盘携带当前 schema 版本
    expect(store.byDialog.get("d1")?.schemaVersion).toBe(COMPACTION_SUMMARY_SCHEMA_VERSION);
    expect(result.history[0]?.role).toBe("user");
    expect(String(result.history[0]?.content)).toContain("--- 历史对话摘要 ---");
    expect(String(result.history[0]?.content)).toContain("关键事实档案");
    expect(result.history.length).toBeLessThan(history.length);
    // 尾部来自原始历史
    expect(result.history[result.history.length - 1]).toBe(
      history[history.length - 1],
    );
    // P1-8: 验证 metrics 透出
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.reason).toBe("context_budget");
    expect(result.metrics?.compressedCount).toBeGreaterThan(0);
    expect(result.metrics?.retainedCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics?.newSummaryTokens).toBeGreaterThan(0);
    expect(result.metrics?.hadPreviousSummary).toBe(false); // 首次压缩
    // 观测事件字段：摘要路径透出 reason / before-after（savedTokens 缺省，避免重计算）
    expect(result.reason).toBe("context_budget");
    expect(result.beforeTokens).toBeGreaterThan(0);
    expect(result.afterTokens).toBeGreaterThan(0);
  });

  test("3. summary stability: second turn under new compress point does not regenerate; prefix byte-identical", async () => {
    const store = createSummaryStore();
    let summaryCompleteCalls = 0;
    const history = oversizedHistory(20);

    const resolveProvider = async (): Promise<AgentRuntimeProvider> => ({
      model: "fake",
      complete: async () => {
        summaryCompleteCalls += 1;
        return {
          content: "关键事实档案\n- stable facts\n对话进展与待办\n- keep going",
          model: "fake",
        };
      },
    });

    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const first = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      contextWindow: 2000,
      resolveProvider,
    });
    expect(first.summaryGenerated).toBe(true);
    expect(summaryCompleteCalls).toBe(1);

    // 第二轮：同一对话追加两条小消息，仍低于新压缩点
    const historyTurn2 = [
      ...history,
      msg("user", "follow up", { usage: { completion_tokens: 10 } } as any),
      msg("assistant", "ack", { usage: { completion_tokens: 10 } } as any),
    ];
    const second = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history: historyTurn2,
      contextWindow: 2000,
      resolveProvider,
    });

    expect(second.summaryGenerated).toBe(false);
    expect(summaryCompleteCalls).toBe(1); // 不得再调 provider 生成摘要
    expect(second.compressed).toBe(true);

    // 投影前缀与第一轮逐字节相同（前缀缓存命中的前提）
    const prefix = second.history.slice(0, first.history.length);
    expect(JSON.stringify(prefix)).toBe(JSON.stringify(first.history));
  });

  test("4. adapter without optional summary methods: behavior unchanged", async () => {
    const history = oversizedHistory(20);
    let providerCalls = 0;
    const adapter = createAdapter({}); // no load/saveDialogSummary

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      contextWindow: 2000,
      resolveProvider: async () => {
        providerCalls += 1;
        return {
          model: "fake",
          complete: async () => ({ content: "should not run", model: "fake" }),
        };
      },
    });

    expect(result.history).toBe(history);
    expect(result.compressed).toBe(false);
    expect(result.summaryGenerated).toBe(false);
    expect(providerCalls).toBe(0);
  });

  test("5. summary generation throws: returns prior/raw history so turn can continue into trim fallback", async () => {
    const store = createSummaryStore();
    const history = oversizedHistory(20);
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => {
          throw new Error("summary LLM timeout");
        },
      }),
    });

    expect(result.summaryGenerated).toBe(false);
    expect(result.compressed).toBe(false);
    expect(result.history).toBe(history);
    expect(store.byDialog.size).toBe(0);
  });
});

describe("runLocalAgentTurn auto-compaction wiring", () => {
  test("adapter without summary methods still completes the turn", async () => {
    const history = oversizedHistory(20);
    const adapter = createAdapter({ history });
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "continue",
      continueDialogId: "dialog-existing",
    });
    expect(result.content).toContain("ok:");
    expect(result.dialogId).toBe("dialog-test");
  });

  test("5b. summary generation throw does not fail the user turn (full loop)", async () => {
    const store = createSummaryStore();
    // 默认 fake-local → 256k 窗口；每条 ~15k tok（content padding）× 20 超过 historyBudget，必走压缩路径。
    const history = Array.from({ length: 20 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", "x".repeat(60_000), {
        usage: { completion_tokens: 15_000 },
      } as any),
    );
    let sawSummaryAttempt = false;
    let sawUserTurn = false;
    const adapter = createAdapter({
      history,
      loadSummary: store.load,
      saveSummary: store.save,
      complete: async (messages) => {
        const first = messages[0];
        const isSummaryCall =
          first?.role === "system" &&
          first.content === LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT;
        if (isSummaryCall) {
          sawSummaryAttempt = true;
          throw new Error("summary LLM timeout");
        }
        sawUserTurn = true;
        return {
          content: "user turn ok after summary failure",
          model: "fake-local",
          trace: messages as AgentRuntimeChatMessage[],
        };
      },
    });

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "continue please",
      continueDialogId: "dialog-existing",
    });

    expect(sawSummaryAttempt).toBe(true);
    expect(sawUserTurn).toBe(true);
    expect(result.content).toBe("user turn ok after summary failure");
    expect(store.byDialog.size).toBe(0);
  });

  test("throwing loadDialogSummary does not fail the user turn", async () => {
    const adapter = createAdapter({
      history: [msg("user", "prev"), msg("assistant", "prev-a")],
      loadSummary: async () => {
        throw new Error("disk read failed");
      },
      saveSummary: async () => {},
    });

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "next",
      continueDialogId: "dialog-existing",
    });
    expect(result.content).toContain("ok:");
  });
});

describe("projectHistoryWithSummary / prompt helpers", () => {
  test("buildCompactionUserContent includes prior memory, file ops, and new dialogue", () => {
    const content = buildCompactionUserContent({
      previousSummary: "old",
      messagesText: "user: hi",
      fileOpsText: "- 读取: src/index.ts",
    });
    expect(content).toContain("【现有记忆】：\nold");
    expect(content).toContain("【文件操作清单】：\n- 读取: src/index.ts");
    expect(content).toContain("【新增对话】：\nuser: hi");
  });

  test("formatFileOperationsFromMessages extracts tool_calls path arguments correctly", () => {
    const canonicalize = (name: string) => name;
    const msgs = [
      {
        id: "1",
        role: "assistant" as const,
        content: "",
        tool_calls: [
          {
            function: {
              name: "readFile",
              arguments: JSON.stringify({ path: "src/a.ts" }),
            },
          },
          {
            function: {
              name: "editFile",
              arguments: { path: "src/b.ts" },
            },
          },
          {
            function: {
              name: "writeFile",
              arguments: JSON.stringify({ path: "src/c.ts" }),
            },
          },
          {
            function: {
              name: "readFile",
              arguments: JSON.stringify({ path: "src/a.ts" }), // Duplicate
            },
          },
        ],
      },
    ];

    const formatted = formatFileOperationsFromMessages(msgs, canonicalize);
    expect(formatted).toBe("- 读取: src/a.ts\n- 编辑: src/b.ts\n- 写入: src/c.ts");

    // Non-file tools (readDoc/writeRow) should be ignored.
    const ignored = formatFileOperationsFromMessages(
      [
        {
          id: "ignored",
          role: "assistant" as const,
          content: "",
          tool_calls: [
            { function: { name: "readDoc", arguments: JSON.stringify({ path: "docs/a.md" }) } },
            { function: { name: "writeRow", arguments: JSON.stringify({ path: "table/row" }) } },
          ],
        },
      ],
      canonicalize,
    );
    expect(ignored).toBe("无");
  });

  test("formatFileOperationsFromMessages returns '无' when no file ops exist", () => {
    const canonicalize = (name: string) => name;
    const msgs = [{ id: "1", role: "user" as const, content: "hello" }];
    expect(formatFileOperationsFromMessages(msgs, canonicalize)).toBe("无");
  });

  test("projectHistoryWithSummary drops messages through summarizedBeforeId", () => {
    const history = [
      msg("user", "a"),
      msg("assistant", "b"),
      msg("user", "c"),
      msg("assistant", "d"),
    ];
    const projected = projectHistoryWithSummary({
      history,
      summary: "facts",
      summarizedBeforeId: "local-1",
    });
    expect(String(projected[0]?.content)).toContain("facts");
    expect(projected.slice(1)).toEqual([history[2], history[3]]);
  });
});

  test("6. 压缩后保留的是连续尾部，且条数不少于 planCompression 的 tail 下限", async () => {
    const store = createSummaryStore();
    const history = oversizedHistory(20);
    const adapter = createAdapter({ loadSummary: store.load, saveSummary: store.save });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d1",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => ({ content: "关键事实档案\n- x", model: "fake" }),
      }),
    });

    // history[0] 是注入的摘要消息，其余应当是原始历史的「连续尾部」
    const kept = result.history.slice(1);
    expect(kept.length).toBeGreaterThanOrEqual(ACTIVE_SUMMARY_TAIL_KEEP_COUNT);

    // 逐条按引用比对：kept 必须等于 history 的最后 kept.length 条，顺序一致
    const expectedTail = history.slice(history.length - kept.length);
    expect(kept.length).toBe(expectedTail.length);
    kept.forEach((m, i) => {
      expect(m).toBe(expectedTail[i]);
    });
  });

  test("7. stub 档：老 tool 结果被替换为 stub 文本，canonical 历史不变，摘要不被调用", async () => {
    // 早期 3 条 tool 结果超大（stub 可省）、最近 3 条 tool 结果极小 → stub 档命中。
    const huge = "y".repeat(32_000); // ~8k token
    const small = "z".repeat(40);
    const history: AgentRuntimeChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(msg("assistant", `ask ${i}`));
      history.push(
        msg("tool", i < 3 ? huge : small, {
          toolName: `tool_${i}`,
          tool_call_id: `tc_${i}`,
        } as any),
      );
    }
    history.push(msg("assistant", "done"));

    let completeCalled = false;
    const store = createSummaryStore();
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
      complete: async () => {
        completeCalled = true;
        return { content: "SHOULD NOT BE CALLED", model: "fake" };
      },
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-stub",
      history,
      contextWindow: 8000,
      resolveProvider: async () => ({ model: "fake", complete: async () => ({ content: "x", model: "fake" }) }),
    });

    // stub 档命中：不生成摘要、不调 LLM
    expect(result.summaryGenerated).toBe(false);
    expect(completeCalled).toBe(false);
    expect(result.compressed).toBe(true);
    expect(result.metrics?.reason).toBe("tool_stub");

    // 观测事件字段：stub 路径透出 reason / stubbedCount / savedTokens / before-after
    expect(result.reason).toBe("tool_stub");
    expect(result.stubbedCount).toBe(3);
    expect(typeof result.savedTokens).toBe("number");
    expect(result.savedTokens).toBeGreaterThan(0);
    expect(result.beforeTokens).toBeGreaterThan(0);
    expect(result.afterTokens).toBeGreaterThan(0);

    // 投影后：stub 区间内的 tool 结果 content 被替换为 stub 文本
    const projectedTools = result.history.filter((m) => m.role === "tool");
    expect(projectedTools.length).toBe(6);
    // 保留最近 3 条原文（small），更早 3 条被 stub
    const stubbed = projectedTools.slice(0, 3);
    const kept = projectedTools.slice(3);
    stubbed.forEach((m) => expect(String(m.content)).toContain("[tool output cleared"));
    kept.forEach((m) => expect(String(m.content)).toBe(small));
    // role / tool_calls / 其余字段不变
    expect(stubbed[0].toolName).toBe("tool_0");
    expect(stubbed[0].tool_call_id).toBe("tc_0");

    // canonical 历史永远不被修改
    history.forEach((m) => {
      if (m.role === "tool" && m.content === huge) {
        expect(String(m.content)).toBe(huge);
      }
    });

    // stub 状态随 dialog summary 持久化
    // 保留最后 3 条 tool 原文（abs idx 7,9,11），第一条被 stub 的 tool 在 abs idx 5
    expect(store.byDialog.get("d-stub")?.stubbedBeforeId).toBe("local-5");
    // stub-only 持久化也携带当前 schema 版本
    expect(store.byDialog.get("d-stub")?.schemaVersion).toBe(COMPACTION_SUMMARY_SCHEMA_VERSION);
  });

  test("8. 旧记录无 stubbedBeforeId 字段 → 兼容，不 stub", async () => {
    // 旧记录只有 summary + summarizedBeforeId，无 stubbedBeforeId
    const store = createSummaryStore();
    // summarizedBeforeId=local-1 → 保留 idx2 起（含 tool）
    store.byDialog.set("d-old", { summary: "旧摘要", summarizedBeforeId: "local-1" });

    const history = [
      msg("user", "a"),
      msg("assistant", "b"),
      msg("tool", "big tool result here", { toolName: "t1" } as any),
      msg("assistant", "c"),
    ];
    const adapter = createAdapter({ loadSummary: store.load, saveSummary: store.save });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-old",
      history,
      contextWindow: 8000,
      resolveProvider: async () => ({ model: "fake", complete: async () => ({ content: "x", model: "fake" }) }),
    });

    // 无 stubbedBeforeId → 不 stub（tool 内容保持原文）
    const projectedTool = result.history.find((m) => m.role === "tool");
    expect(String(projectedTool?.content)).toBe("big tool result here");
  });

  test("9. 生成新 summary 后，旧 stale stub 边界被清除", async () => {
    // 先造一个带 stubbedBeforeId 的旧记录
    const store = createSummaryStore();
    store.byDialog.set("d-clear", {
      summary: "旧摘要",
      summarizedBeforeId: "local-0",
      stubbedBeforeId: "local-3",
    });

    // 无 tool 的历史，pending 足够大以通过死亡螺旋守卫（minNewTokens=5000）
    const history: AgentRuntimeChatMessage[] = Array.from({ length: 30 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", "x".repeat(1000)),
    );
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
      complete: async () => ({ content: "新的关键事实摘要", model: "fake" }),
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-clear",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({ model: "fake", complete: async () => ({ content: "x", model: "fake" }) }),
    });

    // 走摘要路径（无 tool，stub 不命中）→ 生成新 summary
    expect(result.summaryGenerated).toBe(true);
    // 旧 stub 边界被清空
    const stored = store.byDialog.get("d-clear");
    expect(stored?.stubbedBeforeId).toBeUndefined();
    expect(stored?.summarizedBeforeId).toBeDefined();
  });

  test("10. HIGH-1: 已 stub 但本轮不触发压缩 → 老 tool 内容仍以 stub 重发（summary 为空也生效）", async () => {
    // 已持久化 stub 边界（local-2 即 idx2 的 tool 被 stub），且无摘要。
    const store = createSummaryStore();
    store.byDialog.set("d-h1", { summary: "", stubbedBeforeId: "local-2" });
    const history = [
      msg("user", "a"),
      msg("assistant", "b"),
      msg("tool", "big tool result", { toolName: "t1" } as any),
      msg("assistant", "c"),
    ];
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-h1",
      history,
      contextWindow: 256_000, // 低于阈值 → 本轮不触发压缩，走 projectExisting
      resolveProvider: async () => ({ model: "fake", complete: async () => ({ content: "x", model: "fake" }) }),
    });

    // 不生成摘要、不调 LLM
    expect(result.summaryGenerated).toBe(false);
    // 老 tool 输出仍以 stub 重发，而不是 canonical 原文
    const tool = result.history.find((m) => m.role === "tool");
    expect(String(tool?.content)).toContain("[tool output cleared");
    // summary 为空 → 不 prepend 空摘要消息；history[0] 是原始 user 消息
    expect(String(result.history[0]?.content)).not.toContain("--- 历史对话摘要 ---");
    expect(String(result.history[0]?.content)).toBe("a");
    // 投影发生（stub 生效），compressed=true
    expect(result.compressed).toBe(true);
  });

  test("11. HIGH-2: 已有 stubbedBeforeId 的次轮规划 → 已 stub 内容不再重复计入 savings，能过渡到摘要档", async () => {
    const store = createSummaryStore();
    const huge = "y".repeat(32_000); // ~8k token
    const small = "z".repeat(40);
    const history: AgentRuntimeChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(msg("assistant", `ask ${i}`));
      history.push(msg("tool", i < 3 ? huge : small, { toolName: `t${i}` } as any));
    }
    history.push(msg("assistant", "done"));
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
      complete: async () => ({ content: "关键事实摘要", model: "fake" }),
    });
    const resolveProvider = async (): Promise<AgentRuntimeProvider> => ({
      model: "fake",
      complete: async () => ({ content: "关键事实摘要", model: "fake" }),
    });

    // 第 1 轮：命中 stub 档，持久化 stubbedBeforeId（local-5），不生成摘要。
    const first = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-h2",
      history,
      contextWindow: 8000,
      resolveProvider,
    });
    expect(first.metrics?.reason).toBe("tool_stub");
    expect(store.byDialog.get("d-h2")?.stubbedBeforeId).toBe("local-5");
    expect(store.byDialog.get("d-h2")?.summary).toBe("");

    // 第 2 轮：追加一条超大 assistant 消息（~16k token）→ 即便旧工具已被 stub，
    // 也因新内容超预算必须走到摘要档。若无 HIGH-2 修复，规划输入用 canonical
    // 历史会把已 stub 的 3 条 huge 工具重复计入 savings → 反复选中 stub 档、
    // 延误摘要。断言 summaryGenerated=true 验证修复生效。
    const history2 = [...history, msg("assistant", "q".repeat(64_000))];
    const second = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-h2",
      history: history2,
      contextWindow: 8000,
      resolveProvider,
    });
    expect(second.summaryGenerated).toBe(true);
    expect(second.metrics?.reason).toBe("context_budget");
  });

  test("12. MEDIUM: 无已有摘要、首次进 stub 档 → 不 prepend 空摘要消息，stub 生效", async () => {
    const store = createSummaryStore(); // 无任何已存摘要 / stub
    const huge = "y".repeat(32_000);
    const small = "z".repeat(40);
    const history: AgentRuntimeChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      history.push(msg("assistant", `ask ${i}`));
      history.push(msg("tool", i < 3 ? huge : small, { toolName: `t${i}` } as any));
    }
    history.push(msg("assistant", "done"));
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });

    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-med",
      history,
      contextWindow: 8000,
      resolveProvider: async () => ({ model: "fake", complete: async () => ({ content: "x", model: "fake" }) }),
    });

    expect(result.summaryGenerated).toBe(false);
    expect(result.metrics?.reason).toBe("tool_stub");
    // stub 生效：老 tool 被 stub、最近 3 条保留原文
    const projectedTools = result.history.filter((m) => m.role === "tool");
    expect(projectedTools.length).toBe(6);
    expect(String(projectedTools[0]?.content)).toContain("[tool output cleared");
    expect(String(projectedTools[3]?.content)).toBe(small);
    // 关键：summary 为空 → 不 prepend 空摘要消息；history[0] 是原始 assistant 消息
    expect(String(result.history[0]?.content)).not.toContain("--- 历史对话摘要 ---");
    expect(String(result.history[0]?.content)).toBe("ask 0");
  });

describe("source-hash summary validation", () => {
  function historyWithTool(): AgentRuntimeChatMessage[] {
    return oversizedHistory(20);
  }

  /** 首轮触发压缩并落盘（写入 sourceHash/sourceCount）。 */
  async function seedSummary(store: ReturnType<typeof createSummaryStore>) {
    const history = historyWithTool();
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-hash",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => ({
          content: "关键事实档案\n- seeded facts\n对话进展与待办\n- go",
          model: "fake",
        }),
      }),
    });
    expect(result.summaryGenerated).toBe(true);
    const stored = store.byDialog.get("d-hash")!;
    expect(stored.sourceHash).toBeTruthy();
    expect(stored.sourceCount).toBeGreaterThan(0);
    return { history, stored };
  }

  test("a. normal round-trip: reload projects from summary (hash matches)", async () => {
    const store = createSummaryStore();
    const { history, stored } = await seedSummary(store);
    const anchorIdx = stored.summarizedBeforeId
      ? Number(stored.summarizedBeforeId.slice("local-".length))
      : -1;

    // 下一轮追加新消息（不触碰锚点切片）
    const history2 = [...history, msg("user", "follow up")];
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-hash",
      history: history2,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => ({ content: "x", model: "fake" }),
      }),
    });

    // 摘要仍有效：不重新压缩、投影使用摘要
    expect(result.summaryGenerated).toBe(false);
    expect(result.compressed).toBe(true);
    expect(String(result.history[0]?.content)).toContain("seeded facts");
    // 投影保留锚点之后的尾部
    expect(result.history.length).toBe(history2.length - (anchorIdx + 1) + 1);
  });

  test("b. history edited before anchor → summary invalidated, re-compress without old summary", async () => {
    const store = createSummaryStore();
    const { history, stored } = await seedSummary(store);

    // 在 summarizedBeforeId 之前修改一条消息 → 切片哈希变化
    const anchorIdx = stored.summarizedBeforeId
      ? Number(stored.summarizedBeforeId.slice("local-".length))
      : -1;
    const edited = [...history];
    edited[0] = { ...history[0], content: "EDITED-PREFIX-CONTENT" };
    // 保持与 seed 同样的锚点位置（消息数不变），只改内容
    edited[anchorIdx] = { ...history[anchorIdx], content: "changed" };

    let summaryCalls = 0;
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-hash",
      history: edited,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => {
          summaryCalls += 1;
          return {
            content: "关键事实档案\n- RE-COMPRESSED\n对话进展与待办\n- new",
            model: "fake",
          };
        },
      }),
    });

    // 摘要被判无效 → 重新压缩
    expect(result.summaryGenerated).toBe(true);
    expect(summaryCalls).toBe(1);
    // 校验失效触发的重压缩必须携带 invalid_summary 原因（与普通预算压缩可区分）
    expect(result.reason).toBe("invalid_summary");
    expect(result.metrics?.reason).toBe("invalid_summary");
    // 新投影不含旧摘要内容
    expect(String(result.history[0]?.content)).toContain("RE-COMPRESSED");
    expect(String(result.history[0]?.content)).not.toContain("seeded facts");
    // 新摘要已用新锚点切片哈希覆盖旧值
    const after = store.byDialog.get("d-hash")!;
    expect(after.sourceHash).toBeTruthy();
    expect(after.sourceHash).not.toBe(stored.sourceHash);
  });

  test("c. anchor id not found → summary invalidated, no 'summary+full-history' stacking", async () => {
    const store = createSummaryStore();
    const { history, stored } = await seedSummary(store);
    const anchorIdx = stored.summarizedBeforeId
      ? Number(stored.summarizedBeforeId.slice("local-".length))
      : -1;

    // 锚点在历史中不存在（历史被裁剪到锚点之前 / fork 重排）
    const truncated = history.slice(0, Math.max(1, anchorIdx));
    let summaryCalls = 0;
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-hash",
      history: truncated,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => {
          summaryCalls += 1;
          return { content: "新摘要", model: "fake" };
        },
      }),
    });

    expect(result.summaryGenerated).toBe(true);
    expect(summaryCalls).toBe(1);
    // 投影是「新摘要 + 尾部」，不含旧摘要
    expect(String(result.history[0]?.content)).not.toContain("seeded facts");
    // 投影长度受控（不是摘要+全量历史叠加）
    expect(result.history.length).toBeLessThanOrEqual(truncated.length + 1);
  });

  test("d. legacy record without sourceHash/sourceCount → behavior identical to today", async () => {
    const store = createSummaryStore();
    // 造一条旧记录：只有 summary + summarizedBeforeId，无 sourceHash
    const history = historyWithTool();
    store.byDialog.set("d-old", {
      summary: "旧摘要",
      summarizedBeforeId: "local-1",
    });

    let summaryCalls = 0;
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-old",
      history,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => {
          summaryCalls += 1;
          return { content: "新摘要", model: "fake" };
        },
      }),
    });

    // 不触发重新压缩：行为与旧版一致（摘要 + 保留尾部）
    expect(summaryCalls).toBe(0);
    expect(result.summaryGenerated).toBe(false);
    expect(result.compressed).toBe(true);
    expect(String(result.history[0]?.content)).toContain("旧摘要");
  });

  test("e. stub scenario: invalidated hash also discards stubbedBeforeId", async () => {
    const store = createSummaryStore();
    const { history, stored } = await seedSummary(store);

    // 编辑锚点前内容 → 哈希失效
    const edited = [...history];
    edited[0] = { ...history[0], content: "EDITED-FOR-STUB" };

    // 先造一个带 stubbedBeforeId 的记录（模拟 stub 档 + 已有摘要哈希）
    store.byDialog.set("d-hash", {
      ...stored,
      stubbedBeforeId: "local-3",
    });

    let summaryCalls = 0;
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    const result = await maybeAutoCompactLocalHistory({
      adapter,
      dialogId: "d-hash",
      history: edited,
      contextWindow: 2000,
      resolveProvider: async () => ({
        model: "fake",
        complete: async () => {
          summaryCalls += 1;
          return { content: "关键事实档案\n- NEW\n对话进展与待办\n- x", model: "fake" };
        },
      }),
    });

    // 摘要失效（含 stub）→ 重新压缩
    expect(result.summaryGenerated).toBe(true);
    expect(summaryCalls).toBe(1);
    // 新摘要已清空旧 stubbedBeforeId
    const after = store.byDialog.get("d-hash")!;
    expect(after.stubbedBeforeId).toBeUndefined();
    expect(after.summary).toContain("NEW");
  });

  test("f. future schemaVersion → summary invalidated, re-compress without old summary, warn schema-version-mismatch", async () => {
    const store = createSummaryStore();
    const { history, stored } = await seedSummary(store);

    // 内容哈希完全一致，仅把版本号改成未来值（模拟生成逻辑已改版）
    store.byDialog.set("d-hash", {
      ...stored,
      schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION + 1,
    });

    let summaryCalls = 0;
    const warns: string[] = [];
    const origWarn = console.warn;
    console.warn = (...a: any[]) => { warns.push(a.join(" ")); };
    const adapter = createAdapter({
      loadSummary: store.load,
      saveSummary: store.save,
    });
    try {
      const result = await maybeAutoCompactLocalHistory({
        adapter,
        dialogId: "d-hash",
        history,
        contextWindow: 2000,
        resolveProvider: async () => ({
          model: "fake",
          complete: async () => {
            summaryCalls += 1;
            return { content: "关键事实档案\n- REBUILT\n对话进展与待办\n- x", model: "fake" };
          },
        }),
      });

      // 摘要判无效 → 重新压缩
      expect(result.summaryGenerated).toBe(true);
      expect(summaryCalls).toBe(1);
      // 投影不含旧摘要
      expect(String(result.history[0]?.content)).toContain("REBUILT");
      expect(String(result.history[0]?.content)).not.toContain("seeded facts");
      // warn 含 dialogId 与 schema-version-mismatch 原因
      const warnLine = warns.find((w) => w.includes("invalidated dialog summary for d-hash"));
      expect(warnLine).toBeTruthy();
      expect(warnLine).toContain("schema-version-mismatch");
      // 重新落盘带当前版本
      expect(store.byDialog.get("d-hash")?.schemaVersion).toBe(COMPACTION_SUMMARY_SCHEMA_VERSION);
    } finally {
      console.warn = origWarn;
    }
  });

  test("validateStoredSummary unit: rules (a)/(b)/(c) + legacy undefined", () => {
    const history = historyWithTool();
    const anchor = "local-5";
    const goodHash = hashSummarySourceSlice(history, anchor)!;
    expect(goodHash).toBeTruthy();

    // 无 sourceHash（旧记录）→ undefined（保持现有行为）
    expect(
      validateStoredSummary({ history, stored: { summarizedBeforeId: anchor } }),
    ).toBeUndefined();

    // 正常 → true
    expect(
      validateStoredSummary({
        history,
        stored: { summarizedBeforeId: anchor, sourceHash: goodHash, sourceCount: 6 },
      }),
    ).toBe(true);

    // (a) 锚点找不到 → false
    expect(
      validateStoredSummary({
        history,
        stored: { summarizedBeforeId: "local-999", sourceHash: goodHash, sourceCount: 6 },
      }),
    ).toBe(false);

    // (b) 内容被编辑 → 哈希不匹配 → false
    const edited = [...history];
    edited[0] = { ...history[0], content: "changed-content" };
    expect(
      validateStoredSummary({
        history: edited,
        stored: { summarizedBeforeId: anchor, sourceHash: goodHash, sourceCount: 6 },
      }),
    ).toBe(false);

    // (c) history 比 sourceCount 短 → false
    const truncated = history.slice(0, 3);
    expect(
      validateStoredSummary({
        history: truncated,
        stored: { summarizedBeforeId: anchor, sourceHash: goodHash, sourceCount: 6 },
      }),
    ).toBe(false);

    // hashSummarySourceSlice 对找不到锚点返回 undefined
    expect(hashSummarySourceSlice(history, "local-999")).toBeUndefined();
  });

  test("schema version: 缺失（旧记录）→ 保持有效（按 v1 处理，零迁移）", async () => {
    const history = historyWithTool();
    const anchor = "local-5";
    const goodHash = hashSummarySourceSlice(history, anchor)!;
    // 无 schemaVersion（旧记录）→ 与今天行为逐位一致：有效，正常投影
    expect(
      validateStoredSummary({
        history,
        stored: { summarizedBeforeId: anchor, sourceHash: goodHash, sourceCount: 6 },
      }),
    ).toBe(true);
    // 无 schemaVersion 且无 sourceHash → undefined（保持原行为）
    expect(
      validateStoredSummary({ history, stored: { summarizedBeforeId: anchor } }),
    ).toBeUndefined();
  });

  test("schema version: 未来值 → 摘要判无效（schema-version-mismatch）", async () => {
    const history = historyWithTool();
    const anchor = "local-5";
    const goodHash = hashSummarySourceSlice(history, anchor)!;
    // 内容哈希仍匹配，但版本未来值 → 生成逻辑已改版 → 无效
    expect(
      validateStoredSummary({
        history,
        stored: {
          summarizedBeforeId: anchor,
          sourceHash: goodHash,
          sourceCount: 6,
          schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION + 1,
        },
      }),
    ).toBe(false);
    // 与当前版本一致 → 有效
    expect(
      validateStoredSummary({
        history,
        stored: {
          summarizedBeforeId: anchor,
          sourceHash: goodHash,
          sourceCount: 6,
          schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION,
        },
      }),
    ).toBe(true);
  });

  test("schema version: 畸形值（null / 字符串数字 / 非数字）→ 判无效，不静默按 v1 信任", async () => {
    const history = historyWithTool();
    const anchor = "local-5";
    const goodHash = hashSummarySourceSlice(history, anchor)!;
    const base = {
      summarizedBeforeId: anchor,
      sourceHash: goodHash,
      sourceCount: 6,
    };

    // null → 字段存在但非法 → 无效（不能再被当成缺失按 v1 信任）
    expect(
      validateStoredSummary({ history, stored: { ...base, schemaVersion: null } }),
    ).toBe(false);
    // 字符串数字 "2" → 非 number → 无效
    expect(
      validateStoredSummary({ history, stored: { ...base, schemaVersion: "2" } }),
    ).toBe(false);
    // 布尔值等非数字 → 无效
    expect(
      validateStoredSummary({ history, stored: { ...base, schemaVersion: true } }),
    ).toBe(false);

    // 真缺失（无该键）→ 仍按 v1 有效
    expect(validateStoredSummary({ history, stored: base })).toBe(true);
  });
});
