import { describe, expect, test } from "bun:test";
import { ACTIVE_SUMMARY_TAIL_KEEP_COUNT } from "../ai/context/planCompression";

import {
  LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT,
  buildLocalAutoCompactionUserContent,
  extractFileOperations,
  formatFileOperations,
  maybeAutoCompactLocalHistory,
  projectHistoryWithSummary,
  toPlanCompressionMessages,
} from "./localAutoCompaction";
import type { AgentRuntimeHostAdapter, AgentRuntimeProvider } from "./hostAdapter";
import type { AgentRuntimeChatMessage } from "./types";
import { runLocalAgentTurn } from "./localLoop";

type StoredSummary = {
  summary: string;
  summarizedBeforeId?: string;
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

/** 20 条 × 100 tok；配合 contextWindow=2000 必触发压缩（与 planCompression 单测同口径）。 */
function oversizedHistory(count = 20): AgentRuntimeChatMessage[] {
  return Array.from({ length: count }, (_, i) =>
    msg(i % 2 === 0 ? "user" : "assistant", `message ${i}`, {
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
    }) => {
      byDialog.set(input.dialogId, {
        summary: input.summary,
        ...(input.summarizedBeforeId !== undefined
          ? { summarizedBeforeId: input.summarizedBeforeId }
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
  test("maps only the fields planCompression reads (id/role/content/tool_calls/usage)", () => {
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
        usage: { completion_tokens: 42 },
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
    expect(result.history[0]?.role).toBe("user");
    expect(String(result.history[0]?.content)).toContain("--- 历史对话摘要 ---");
    expect(String(result.history[0]?.content)).toContain("关键事实档案");
    expect(result.history.length).toBeLessThan(history.length);
    // 尾部来自原始历史
    expect(result.history[result.history.length - 1]).toBe(
      history[history.length - 1],
    );
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
    // 默认 fake-local → 256k 窗口；每条 15k tok × 20 超过 historyBudget，必走压缩路径。
    const history = Array.from({ length: 20 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", `big ${i}`, {
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
  test("buildLocalAutoCompactionUserContent includes prior memory, file ops, and new dialogue", () => {
    const content = buildLocalAutoCompactionUserContent(
      "old",
      "user: hi",
      "- 读取: src/index.ts",
    );
    expect(content).toContain("【现有记忆】：\nold");
    expect(content).toContain("【文件操作清单】：\n- 读取: src/index.ts");
    expect(content).toContain("【新增对话】：\nuser: hi");
  });

  test("extractFileOperations and formatFileOperations extract tool_calls path arguments correctly", () => {
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

    const ops = extractFileOperations(msgs);
    expect(ops).toEqual([
      { type: "read", path: "src/a.ts" },
      { type: "edit", path: "src/b.ts" },
      { type: "write", path: "src/c.ts" },
    ]);

    const formatted = formatFileOperations(msgs);
    expect(formatted).toBe("- 读取: src/a.ts\n- 编辑: src/b.ts\n- 写入: src/c.ts");
    const aliases = extractFileOperations([
      {
        id: "aliases",
        role: "assistant",
        content: "",
        tool_calls: [
          { function: { name: "read", arguments: JSON.stringify({ path: "src/legacy.ts" }) } },
          { function: { name: "edit", arguments: JSON.stringify({ path: "src/legacy.ts" }) } },
          { function: { name: "write", arguments: JSON.stringify({ path: "src/out.ts" }) } },
        ],
      },
    ] as any);
    expect(aliases).toEqual([
      { type: "read", path: "src/legacy.ts" },
      { type: "edit", path: "src/legacy.ts" },
      { type: "write", path: "src/out.ts" },
    ]);

    const ignored = extractFileOperations([
      {
        id: "ignored",
        role: "assistant",
        content: "",
        tool_calls: [
          { function: { name: "readDoc", arguments: JSON.stringify({ path: "docs/a.md" }) } },
          { function: { name: "writeRow", arguments: JSON.stringify({ path: "table/row" }) } },
        ],
      },
    ] as any);
    expect(ignored).toEqual([]);
  });

  test("formatFileOperations returns '无' when no file ops exist", () => {
    const msgs = [{ id: "1", role: "user" as const, content: "hello" }];
    expect(formatFileOperations(msgs)).toBe("无");
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
