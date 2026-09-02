import { describe, expect, test, beforeEach } from "bun:test";
import { getEventListeners } from "node:events";
import { Duration, Effect, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";

import {
  LOCAL_TURN_ABORTED_CODE,
  resolveEmptyAssistantOutcome,
  runLocalAgentTurn,
  summarizeHistoricalToolContent,
} from "./localLoop";
import {
  MAX_REASONING_ONLY_REPAIRS,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_REASONING_MARKER,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  STREAM_TRUNCATED_REASONING_MARKER,
} from "./emptyAssistantRepair";
import type { AgentRuntimeHostAdapter, AgentRuntimeSaveTurnInput } from "./hostAdapter";
import type { AgentRuntimeChatMessage } from "./types";
import { FRESH_TOOL_OUTPUT_MAX_CHARS } from "../ai/agent/toolOutputPolicy";
import { prepareTokenUsageData } from "../ai/token/prepareTokenUsageData";

describe("runLocalAgentTurn", () => {
  test("runs a text-only local turn without server fetch", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Local Frontend Agent",
        prompt: "You fix UI polish.",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [
        { role: "user", content: "previous request" },
        { role: "assistant", content: "previous answer" },
      ],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-local-1" };
      },
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "fake-local",
        complete: async (messages) => ({
          content: `fake local ok: ${messages.at(-1)?.content}`,
          model: agentConfig.model ?? "fake-local",
          trace: messages,
        }),
      }),
      executeTool: async () => {
        throw new Error("tools should not run for a text-only turn");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "polish the notification panel",
      continueDialogId: "dialog-existing",
    });

    expect(result).toMatchObject({
      // mock echo 末尾 user content = 时间块(turn-scope) + "\n\n" + input
      content: expect.stringContaining("polish the notification panel"),
      model: "fake-local",
      dialogId: "dialog-local-1",
    });
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]?.continueDialogId).toBe("dialog-existing");
    expect(savedTurns[0]?.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  // Billing attribution: the platform proxy writes options.dialogId into the
  // token record; without it every runtime call collapses into the server's
  // "chat-proxy" fallback bucket.
  test("passes continueDialogId to provider.complete for billing attribution", async () => {
    const seenOptions: Array<Record<string, unknown> | undefined> = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-local-1" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "fake-local",
        complete: async (messages, options) => {
          seenOptions.push(options as Record<string, unknown> | undefined);
          return {
            content: "ok",
            model: agentConfig.model ?? "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run for a text-only turn");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "second turn",
      continueDialogId: "01M0ERANJR3DRKSPN5XMSS040V",
    });
    expect(seenOptions[0]?.dialogId).toBe("01M0ERANJR3DRKSPN5XMSS040V");

    // A brand-new dialog has no id yet at LLM-call time.
    seenOptions.length = 0;
    await runLocalAgentTurn({ adapter, agentRef: "frontend", input: "first turn" });
    expect(seenOptions[0]?.dialogId).toBeUndefined();
  });

  test("does not duplicate plain context blocks when scoped blocks are provided", async () => {
    const sessionBlock = "unique session context for deduplication";
    const turnBlock = "unique turn context for deduplication";
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-context-dedup" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return { content: "ok", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "context-dedup",
      input: "hello",
      contextBlocks: [sessionBlock, turnBlock],
      contextBlockScopes: [
        { content: sessionBlock, cacheScope: "session" },
        { content: turnBlock, cacheScope: "turn" },
      ],
    });

    const systemMessage = providerMessages.find((message) => message.role === "system");
    const systemContent = String(systemMessage?.content);
    expect(systemContent.split(sessionBlock).length - 1).toBe(1);
    // 前缀缓存契约：turn-scope 动态块不再进 system（system 每轮逐秒变化会切断
    // 其身后全部历史的前缀缓存），改并入末尾 user 消息头部。
    expect(systemContent.includes(turnBlock)).toBe(false);
    const lastUserMessage = [...providerMessages].reverse().find((message) => message.role === "user");
    const lastUserContent = String(lastUserMessage?.content);
    expect(lastUserContent.split(turnBlock).length - 1).toBe(1);
    expect(lastUserContent.indexOf(turnBlock)).toBeLessThan(lastUserContent.indexOf("hello"));
    const stablePrefixChars = systemMessage?.stable_prefix_chars ?? 0;
    expect(stablePrefixChars).toBeGreaterThan(0);
    // 整个 system 都是稳定前缀（动态块已移出），缓存断点可覆盖全部 system。
    expect(stablePrefixChars).toBe(systemContent.length);
    expect(systemContent.slice(0, stablePrefixChars)).toContain(sessionBlock);
  });

  test("turn-scope block with structured input: dynamic prefix keeps image parts intact", async () => {
    const turnBlock = "turn-scope-structured-input-block";
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-turn-scope-structured" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return { content: "ok", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    const imageInput: AgentRuntimeMessageContent = [
      { type: "text", text: "看这张图" },
      { type: "image_url", image_url: { url: "data:image/png;base64,QUJD" } },
    ];
    await runLocalAgentTurn({
      adapter,
      agentRef: "turn-scope-structured",
      input: imageInput,
      contextBlocks: [turnBlock],
      contextBlockScopes: [{ content: turnBlock, cacheScope: "turn" }],
    });

    const lastUser = [...providerMessages].reverse().find((message) => message.role === "user");
    const parts = Array.isArray(lastUser?.content) ? lastUser!.content : [];
    expect(parts.length).toBe(3);
    // dynamic 区 = 运行时注入的时间块 + caller 的 turn-scope 块（\n\n 连接后并入 user 头部）
    expect(String(parts[0]?.text)).toContain("--- 当前时间 ---");
    expect(String(parts[0]?.text)).toContain(turnBlock);
    expect(parts[1]).toEqual({ type: "text", text: "看这张图" });
    expect(parts[2]).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,QUJD" } });
  });

  test("legacy contextBlocks fallback: caller supplies only plain blocks, content still reaches the prompt", async () => {
    const legacyBlock = "legacy-only-context-block";
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-legacy-fallback" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return { content: "ok", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "legacy-fallback",
      input: "hello",
      contextBlocks: [legacyBlock],
    });

    const systemContent = String(
      providerMessages.find((message) => message.role === "system")?.content,
    );
    // The legacy block must appear exactly once — not dropped, not duplicated.
    // 前缀缓存契约：plain blocks 归一为 turn-scope，进末尾 user 头部（不在 system）。
    const legacyLastUser = [...providerMessages].reverse().find((message) => message.role === "user");
    expect(String(legacyLastUser?.content).split(legacyBlock).length - 1).toBe(1);
  });

  test("legacy fallback: plain contextBlocks with no scopes appear once each as turn-scope", async () => {
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-legacy-fallback" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return { content: "ok", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "legacy-fallback",
      input: "hello",
      contextBlocks: ["A", "B"],
    });

    const systemContent = String(
      providerMessages.find((message) => message.role === "system")?.content,
    );
    // A and B must appear exactly once each (turn-scope → 末尾 user 头部).
    const plainLastUser = [...providerMessages].reverse().find((message) => message.role === "user");
    expect(String(plainLastUser?.content).split("A").length - 1).toBe(1);
    expect(String(plainLastUser?.content).split("B").length - 1).toBe(1);
  });

  test("injects the agent identity block (incl. subscribed model) into the system prompt", async () => {
    let providerMessages: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        dbKey: agentRef,
        name: "Qwen3.8 Max",
        model: "qwen3.8-max",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-identity" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "qwen3.8-max",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return {
            content: "ok",
            model: agentConfig.model ?? "qwen3.8-max",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run for this test");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "agent-qwen-subscribed",
      input: "hello",
    });

    const systemMessage = providerMessages.find((m) => m.role === "system");
    expect(systemMessage).toBeDefined();
    expect(systemMessage?.content).toContain("--- 身份信息 ---");
    expect(systemMessage?.content).toContain("名称: Qwen3.8 Max");
    expect(systemMessage?.content).toContain("ID: agent-qwen-subscribed");
    expect(systemMessage?.content).toContain("模型: qwen3.8-max");
  });

  test("truncates large historical tool results before the next provider call", async () => {
    const largeToolContent = JSON.stringify({
      ok: true,
      result: {
        title: "Large page",
        text: "A".repeat(8000),
      },
    });
    let providerMessages: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "desktop",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Desktop Browser Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [
        { role: "user", content: "read the page" },
        {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call-read-page",
            type: "function",
            function: { name: "chrome_read_page", arguments: "{\"tabId\":\"1\"}" },
          }],
        },
        { role: "tool", tool_call_id: "call-read-page", content: largeToolContent },
      ],
      saveTurn: async () => ({ dialogId: "dialog-browser" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return {
            content: "ready for next browser step",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "browser",
      input: "now fill the form",
      continueDialogId: "dialog-browser",
    });

    const historicalToolMessage = providerMessages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-read-page"
    );
    expect(historicalToolMessage?.content).toContain("historical tool result truncated");
    expect(historicalToolMessage?.content).toContain(`originalChars=${largeToolContent.length}`);
    expect(String(historicalToolMessage?.content).length).toBeLessThan(2600);
  });

  test("T3: same 20000-char readFile content is NOT truncated as in-turn fresh but IS truncated as historical", async () => {
    // Direct A/B regression for the fresh vs historical budget split.
    // The exact same 20000-char readFile result:
    //   - as an in-turn (fresh) tool result: preserved (length == 20000)
    //   - as a historical tool result: clipped to the tight historical bound (< 2600)
    const sharedContent = "FILE_HEAD:" + "X".repeat(19990) + ":FILE_TAIL"; // 20000 chars
    const buildAdapter = (history: AgentRuntimeChatMessage[]): AgentRuntimeHostAdapter => ({
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => history,
      saveTurn: async () => ({ dialogId: "dialog-t3-ab" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          capturedMessages = messages as AgentRuntimeChatMessage[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => ({ content: sharedContent }),
    });
    let capturedMessages: AgentRuntimeChatMessage[] = [];

    // Case A: in-turn (fresh) — tool runs during this turn.
    let completeCallsA = 0;
    const adapterA: AgentRuntimeHostAdapter = {
      ...buildAdapter([]),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCallsA += 1;
          if (completeCallsA === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-t3-fresh",
                type: "function",
                function: { name: "readFile", arguments: "{\"path\":\"big.txt\"}" },
              }],
            } as any;
          }
          capturedMessages = messages as AgentRuntimeChatMessage[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
    };
    await runLocalAgentTurn({ adapter: adapterA, agentRef: "t3-fresh", input: "read big file" });
    const freshToolMessage = capturedMessages.find((m) => m.role === "tool" && m.tool_call_id === "call-t3-fresh");
    expect(String(freshToolMessage?.content)).not.toContain("in-turn tool result truncated");
    expect(String(freshToolMessage?.content)).toContain("FILE_HEAD:");
    expect(String(freshToolMessage?.content).length).toBe(sharedContent.length);

    // Case B: historical — same content already in loaded history.
    capturedMessages = [];
    const adapterB: AgentRuntimeHostAdapter = {
      ...buildAdapter([
        { role: "user", content: "read the file" },
        {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call-t3-hist",
            type: "function",
            function: { name: "readFile", arguments: "{\"path\":\"big.txt\"}" },
          }],
        },
        { role: "tool", tool_call_id: "call-t3-hist", content: sharedContent },
      ]),
    };
    await runLocalAgentTurn({
      adapter: adapterB,
      agentRef: "t3-hist",
      input: "continue",
      continueDialogId: "dialog-t3-ab",
    });
    const historicalToolMessage = capturedMessages.find((m) => m.role === "tool" && m.tool_call_id === "call-t3-hist");
    expect(historicalToolMessage?.content).toContain("historical tool result truncated");
    expect(String(historicalToolMessage?.content).length).toBeLessThan(2600);
  });

  test("truncates large in-turn tool results before the next provider call but keeps full content in saved turn", async () => {
    // T3: in-turn (fresh) tool results now use the wide FRESH_TOOL_OUTPUT_MAX_CHARS
    // budget, so a 9013-char readFile result stays intact for the next provider
    // call (previously it was clipped to the readFile profile of 4800 chars).
    const largeToolContent = "MATCH_AT_END:" + "x".repeat(9000);
    let secondProviderMessages: any[] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-in-turn-truncate" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-read-large",
                type: "function",
                function: { name: "readFile", arguments: "{\"path\":\"big.txt\"}" },
              }],
            } as any;
          }
          secondProviderMessages = messages as any[];
          return {
            content: "done",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({ content: largeToolContent }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "reader",
      input: "read big file",
    });

    const providerToolMessage = secondProviderMessages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-read-large"
    );
    // Fresh budget (32_000) >> 9013, so the in-turn result is NOT truncated.
    expect(String(providerToolMessage?.content)).not.toContain("in-turn tool result truncated");
    expect(String(providerToolMessage?.content)).toContain("MATCH_AT_END:");
    expect(String(providerToolMessage?.content).length).toBe(largeToolContent.length);

    const savedToolMessage = savedTurns[0]?.messages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-read-large"
    );
    expect(savedToolMessage?.content).toBe(largeToolContent);
  });

  test("in-turn fresh budget still truncates when content exceeds FRESH_TOOL_OUTPUT_MAX_CHARS and maxChars is a real hard cap", async () => {
    // T3 regression: a tool result larger than the fresh budget must still be
    // clipped, and the projected length must not exceed maxChars (metadata +
    // diagnostic included). Uses execShell so the headRatio is preserved.
    const overFresh = "H:" + "z".repeat(FRESH_TOOL_OUTPUT_MAX_CHARS + 5000) + ":T";
    let secondProviderMessages: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
        toolNames: ["execShell"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-fresh-hard-cap" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-over-fresh",
                type: "function",
                function: { name: "execShell", arguments: "{}" },
              }],
            } as any;
          }
          secondProviderMessages = messages as any[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => ({ content: overFresh }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "fresh-cap",
      input: "run huge command",
    });

    const providerToolMessage = secondProviderMessages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-over-fresh"
    );
    expect(String(providerToolMessage?.content)).toContain("in-turn tool result truncated");
    expect(String(providerToolMessage?.content)).toContain("spillFile=");
    expect(String(providerToolMessage?.content)).toContain("totalLines=");
    // maxChars is a real hard upper bound including metadata + diagnostic.
    expect(String(providerToolMessage?.content).length).toBeLessThanOrEqual(FRESH_TOOL_OUTPUT_MAX_CHARS);
  });

  test("tool prune + spill: spills full content to disk when truncated, allowing subsequent recovery", async () => {
    const rawLargeOutput = "HEADER_LINE\n" + "x".repeat(40000) + "\nFOOTER_LINE\n";
    let secondProviderMessages: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
        toolNames: ["execShell"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-spill-test" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-spill-exec",
                type: "function",
                function: { name: "execShell", arguments: "{\"command\":\"build\"}" },
              }],
            } as any;
          }
          secondProviderMessages = messages as any[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => ({ content: rawLargeOutput }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "spill-tester",
      input: "run build",
    });

    const toolMsg = secondProviderMessages.find((msg) => msg.role === "tool" && msg.tool_call_id === "call-spill-exec");
    const content = String(toolMsg?.content);
    expect(content).toContain("spillFile=");
    const match = content.match(/spillFile=([^;\s\]]+)/);
    expect(match).not.toBeNull();
    const spillFilePath = match![1];

    // Verify file actually exists and contains full unpruned content byte-for-byte
    const { existsSync, readFileSync } = await import("node:fs");
    expect(existsSync(spillFilePath)).toBe(true);
    expect(readFileSync(spillFilePath, "utf-8")).toBe(rawLargeOutput);
  });

  test("T3 multi-round: only the last round keeps the fresh budget; earlier in-turn rounds are pressed back to the profile cap", async () => {
    // T3 regression for the fresh-vs-earlier split within ONE turn.
    // Two readFile calls inside the same turn:
    //   round 1 -> call-early  (20000 chars)  -> earlier in-turn round -> profile cap (4800)
    //   round 2 -> call-latest (20000 chars)  -> latest in-turn round  -> fresh budget (32000)
    // The latest tail-run of consecutive tool messages is treated as fresh;
    // everything before it is pressed back to resolveToolOutputProfile.maxChars.
    // This also proves context does not scale to fresh × rounds.
    const sharedContent = "FILE_HEAD:" + "X".repeat(19990) + ":FILE_TAIL"; // 20000 chars
    let completeCalls = 0;
    let lastProviderMessages: AgentRuntimeChatMessage[] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-t3-multi" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          lastProviderMessages = messages as AgentRuntimeChatMessage[];
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-early",
                type: "function",
                function: { name: "readFile", arguments: "{\"path\":\"a.txt\"}" },
              }],
            } as any;
          }
          if (completeCalls === 2) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-latest",
                type: "function",
                function: { name: "readFile", arguments: "{\"path\":\"b.txt\"}" },
              }],
            } as any;
          }
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => ({ content: sharedContent }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "t3-multi",
      input: "read two files in two rounds",
    });

    // Two provider calls with tool results happened (round 1 and round 2),
    // plus the final text-only call. The last provider call carries BOTH
    // tool messages projected for the provider.
    const earlyMessage = lastProviderMessages.find(
      (m) => m.role === "tool" && m.tool_call_id === "call-early",
    );
    const latestMessage = lastProviderMessages.find(
      (m) => m.role === "tool" && m.tool_call_id === "call-latest",
    );

    // Earlier in-turn round: pressed back to the readFile profile (4800), so
    // it IS truncated and fits under the profile cap (+ metadata suffix).
    expect(String(earlyMessage?.content)).toContain("in-turn tool result truncated");
    expect(String(earlyMessage?.content)).toContain("FILE_HEAD:");
    expect(String(earlyMessage?.content).length).toBeLessThanOrEqual(4800);

    // Latest in-turn round: keeps the fresh budget, 20000 < 32000 so NOT truncated.
    expect(String(latestMessage?.content)).not.toContain("in-turn tool result truncated");
    expect(String(latestMessage?.content)).toContain("FILE_HEAD:");
    expect(String(latestMessage?.content).length).toBe(sharedContent.length);

    // Context does NOT scale to fresh × rounds: total projected tool chars
    // is bounded by (profile cap) + (fresh cap), not fresh × 2.
    const totalProjectedToolChars =
      String(earlyMessage?.content).length + String(latestMessage?.content).length;
    expect(totalProjectedToolChars).toBeLessThan(
      FRESH_TOOL_OUTPUT_MAX_CHARS + 4800 + 200, // headroom for metadata/diagnostic
    );
    expect(totalProjectedToolChars).toBeLessThan(FRESH_TOOL_OUTPUT_MAX_CHARS * 2);

    // Full content of BOTH rounds is preserved in the durable saved turn.
    const savedEarly = savedTurns[0]?.messages.find(
      (m) => m.role === "tool" && m.tool_call_id === "call-early",
    );
    const savedLatest = savedTurns[0]?.messages.find(
      (m) => m.role === "tool" && m.tool_call_id === "call-latest",
    );
    expect(savedEarly?.content).toBe(sharedContent);
    expect(savedLatest?.content).toBe(sharedContent);
  });

  test("emits context projection metrics and preserves the full tool result for persistence", async () => {
    // T3: content (5014 chars) is below the fresh budget (32_000), so the
    // in-turn result is NOT truncated. Metadata is still projected (so the
    // projected char count includes the metadata suffix), but
    // truncatedToolResults stays 0 and the durable saved content is intact.
    const largeToolContent = "HEAD:" + "h".repeat(5000) + "\nTAIL:keep-me";
    const events: any[] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    let secondProviderMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when needed.",
        model: "fake-local",
        toolNames: ["execShell"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-context-metrics" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-metrics-shell",
                type: "function",
                function: { name: "execShell", arguments: "{}" },
              }],
            } as any;
          }
          secondProviderMessages = messages as AgentRuntimeChatMessage[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => ({
        content: largeToolContent,
        metadata: { exitCode: 0, status: "completed" },
      }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "metrics",
      input: "run the command",
      onLoopEvent: (event) => events.push(event),
    });

    const secondLlmStart = events.filter((event) => event.kind === "llm-start")[1];
    expect(secondLlmStart?.context).toMatchObject({
      toolMessageCount: 1,
      truncatedToolResults: 0,
      stableContextChars: expect.any(Number),
      dynamicContextChars: expect.any(Number),
    });
    // Not truncated, so raw and projected content chars are equal (metadata
    // suffix is appended but rawToolContentChars counts the pre-projection
    // sanitized content; projected adds the metadata suffix).
    expect(secondLlmStart.context.truncatedToolResults).toBe(0);
    const projectedToolMessage = secondProviderMessages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-metrics-shell"
    );
    // Fresh budget (32_000) >> 5014, so the body is preserved and only the
    // metadata projection suffix is appended.
    expect(String(projectedToolMessage?.content)).toContain("HEAD:");
    expect(String(projectedToolMessage?.content)).toContain("TAIL:keep-me");
    expect(String(projectedToolMessage?.content)).toContain('"exitCode":0');
    expect(String(projectedToolMessage?.content)).toContain('"status":"completed"');
    expect(String(projectedToolMessage?.content).length).toBeLessThanOrEqual(FRESH_TOOL_OUTPUT_MAX_CHARS);
    const savedToolMessage = savedTurns[0]?.messages.find((message) =>
      message.role === "tool" && message.tool_call_id === "call-metrics-shell"
    );
    expect(savedToolMessage?.content).toBe(largeToolContent);
  });

  test("keeps a compact user reference for the provider while persisting expanded input", async () => {
    let providerUserContent: unknown;
    let savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-persisted-input" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerUserContent = messages.at(-1)?.content;
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };
    const compactReference = "[paste #1 · 200 lines · 2.0 KB; full content available via readPastedText(pasteId=1)]";
    const expandedInput = `${"line\n".repeat(200)}end`;

    await runLocalAgentTurn({
      adapter,
      agentRef: "persisted-input",
      input: compactReference,
      persistedInput: expandedInput,
      persistedInputReference: compactReference,
    });

    expect(providerUserContent).toContain("--- 当前时间 ---");
    expect(String(providerUserContent).endsWith(compactReference)).toBe(true);
    expect(savedTurns[0]?.messages.find((message) => message.role === "user")?.content).toBe(
      expandedInput,
    );
    expect(
      savedTurns[0]?.messages.find((message) => message.role === "user")?.context_reference,
    ).toBe(compactReference);
  });

  test("replays a persisted context reference for CLI history without sending the durable body", async () => {
    let providerMessages: any[] = [];
    const durableBody = "full pasted body that stays in the dialog";
    const compactReference = "[paste #2 · 300 lines · 3.0 KB; full content available via readPastedText(pasteId=2)]";
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [
        { role: "user", content: durableBody, context_reference: compactReference },
        { role: "assistant", content: "previous answer" },
      ],
      saveTurn: async () => ({ dialogId: "dialog-history-reference" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "history-reference",
      input: "continue",
      continueDialogId: "dialog-history-reference",
      contextReferenceResolver: () => true,
    });

    expect(providerMessages.some((message) => message.content === durableBody)).toBe(false);
    expect(providerMessages.some((message) => message.content === compactReference)).toBe(true);
    expect(providerMessages.some((message) => "context_reference" in message)).toBe(false);
  });

  test("executes provider tool calls and continues the local loop", async () => {
    const toolCalls: any[] = [];
    const toolEvents: any[] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["execShell"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-tools" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: `tool said: ${messages.at(-1)?.content}`,
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async (call) => {
        toolCalls.push(call);
        return { content: "shell:/repo" };
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect cwd",
      onToolEvent: (event) => toolEvents.push(event),
    });

    expect(result).toMatchObject({
      content: "tool said: shell:/repo",
      dialogId: "dialog-tools",
      toolCallCount: 1,
    });
    expect(toolCalls).toEqual([{
      id: "call-1",
      name: "execShell",
      arguments: "{\"cmd\":\"pwd\"}",
      userInput: "inspect cwd",
    }]);
    expect(toolEvents).toMatchObject([
      {
        type: "tool-call",
        round: 0,
        toolCallId: "call-1",
        toolName: "execShell",
        argumentsPreview: "pwd",
      },
      {
        type: "tool-result",
        round: 0,
        toolCallId: "call-1",
        toolName: "execShell",
        summary: expect.stringContaining("shell:/repo"),
      },
    ]);
    expect(savedTurns[0]?.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(savedTurns[0]?.messages[1]?.tool_calls?.[0]?.id).toBe("call-1");
    expect(savedTurns[0]?.messages[2]?.tool_call_id).toBe("call-1");
  });

  test("surfaces globFiles metadata in the tool message shown to the model", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["globFiles"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-list-metadata" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-list",
                type: "function",
                function: { name: "globFiles", arguments: "{\"path\":\"docs\"}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: String(messages.at(-1)?.content),
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({
        content: "docs/workflow.md\ndocs/deploy-runbook.md",
        metadata: {
          path: "docs",
          count: 2,
          maxDepth: 2,
          entryType: "directories",
          truncated: false,
          limitedByMaxResults: false,
          limitedByMaxDepth: true,
          visitedEntries: 12,
          maxResults: 12,
        },
      }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect docs",
    });

    expect(result.content).toContain("docs/workflow.md");
    expect(result.content).toContain("[tool metadata]");
    expect(result.content).toContain("\"limitedByMaxDepth\":true");
    expect(result.content).toContain("\"visitedEntries\":12");
    expect(savedTurns[0]?.messages[2]?.content).toBe(result.content);
    expect(savedTurns[0]?.messages[2]?.tool_result_metadata).toMatchObject({
      limitedByMaxDepth: true,
      visitedEntries: 12,
    });
  });

  test("stamps toolExecMs into persisted metadata without changing model-visible content", async () => {
    // 不变量：toolExecMs 是纯观测字段——只进 tool_result_metadata，
    // 绝不进发给模型的 content（否则会改变 globFiles/codeSearch/readFile
    // 三个白名单工具的 prompt 字节）。
    const savedTurns: any[] = [];
    const makeAdapter = (visibleMetadata?: Record<string, unknown>) => ({
      host: "cli" as const,
      capabilities: ["local-provider", "local-persistence", "local-tools"] as any,
      loadAgentConfig: async (agentRef: string) => ({
        key: agentRef,
        name: "Probe",
        prompt: "p",
        model: "fake-local",
        toolNames: ["globFiles"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input: any) => {
        savedTurns.push(input);
        return { dialogId: "dialog-duration" };
      },
      resolveProvider: async () => {
        let n = 0;
        return {
          model: "fake-local",
          complete: async (messages: any[]) => {
            n += 1;
            if (n === 1) {
              return {
                content: "",
                model: "fake-local",
                tool_calls: [{
                  id: "call-1",
                  type: "function",
                  function: { name: "globFiles", arguments: "{\"path\":\"docs\"}" },
                }],
              } as any;
            }
            return { content: "done", model: "fake-local" } as any;
          },
        };
      },
      executeTool: async () => ({
        content: "docs/a.md",
        ...(visibleMetadata ? { metadata: visibleMetadata } : {}),
      }),
    }) as any;

    // 情形 1：工具本来就有可见 metadata → 内容里必须有 [tool metadata]，
    // 但其 JSON 里不能出现 toolExecMs。
    savedTurns.length = 0;
    await runLocalAgentTurn({
      adapter: makeAdapter({ path: "docs", count: 1 }),
      agentRef: "probe",
      input: "go",
    });
    const withMeta = savedTurns[0]?.messages?.find((m: any) => m.role === "tool");
    expect(withMeta.content).toContain("[tool metadata]");
    expect(withMeta.content).not.toContain("toolExecMs");
    expect(withMeta.content).toContain("\"count\":1");
    expect(typeof withMeta.tool_result_metadata?.toolExecMs).toBe("number");
    expect(withMeta.tool_result_metadata.toolExecMs).toBeGreaterThanOrEqual(0);
    expect(withMeta.tool_result_metadata.count).toBe(1);

    // 情形 2：工具本来没有 metadata → 只剩观测字段时，内容必须与「无 metadata」
    // 完全一致，不能凭空多出一个空的 [tool metadata] 块。
    savedTurns.length = 0;
    await runLocalAgentTurn({
      adapter: makeAdapter(undefined),
      agentRef: "probe",
      input: "go",
    });
    const noMeta = savedTurns[0]?.messages?.find((m: any) => m.role === "tool");
    expect(noMeta.content).toBe("docs/a.md");
    expect(noMeta.content).not.toContain("[tool metadata]");
    expect(typeof noMeta.tool_result_metadata?.toolExecMs).toBe("number");
  });

  test("surfaces globFiles metadata in the tool message shown to the model", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["globFiles"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-glob-metadata" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-glob",
                type: "function",
                function: { name: "globFiles", arguments: "{\"pattern\":\"**/*.ts\",\"maxResults\":2}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: String(messages.at(-1)?.content),
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({
        content: "src/a.ts\nsrc/b.ts",
        metadata: {
          pattern: "**/*.ts",
          effectivePattern: "**/*.ts",
          path: ".",
          searchedPath: ".",
          count: 2,
          truncated: true,
          limitedByMaxResults: true,
          maxResults: 2,
        },
      }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "find ts files",
    });

    expect(result.content).toContain("src/a.ts");
    expect(result.content).toContain("[tool metadata]");
    expect(result.content).toContain("\"effectivePattern\":\"**/*.ts\"");
    expect(result.content).toContain("\"limitedByMaxResults\":true");
    expect(savedTurns[0]?.messages[2]?.tool_result_metadata).toMatchObject({
      effectivePattern: "**/*.ts",
      limitedByMaxResults: true,
    });
  });

  test("surfaces codeSearch metadata in the tool message shown to the model", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["codeSearch"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-search-metadata" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-search",
                type: "function",
                function: { name: "codeSearch", arguments: "{\"query\":\"TODO\",\"path\":\"src\"}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: String(messages.at(-1)?.content),
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({
        content: "src/a.ts:2:TODO: fix",
        metadata: {
          query: "TODO",
          path: "src",
          searchedPath: "src",
          count: 1,
          matchCount: 1,
          matchedFiles: ["src/a.ts"],
          truncated: false,
          limitedByMaxResults: false,
        },
      }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "find TODO",
    });

    expect(result.content).toContain("src/a.ts:2:TODO: fix");
    expect(result.content).toContain("[tool metadata]");
    expect(result.content).toContain("\"matchCount\":1");
    expect(result.content).toContain("\"matchedFiles\":[\"src/a.ts\"]");
    expect(savedTurns[0]?.messages[2]?.tool_result_metadata).toMatchObject({
      matchCount: 1,
      matchedFiles: ["src/a.ts"],
    });
  });

  test("surfaces readFile metadata in the tool message shown to the model", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-read-metadata" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-read",
                type: "function",
                function: { name: "readFile", arguments: "{\"path\":\"docs/a.md\",\"startLine\":10,\"endLine\":12}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: String(messages.at(-1)?.content),
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({
        content: "line ten\nline eleven\nline twelve",
        metadata: {
          path: "docs/a.md",
          bytes: 31,
          totalBytes: 1200,
          startLine: 10,
          endLine: 12,
          totalLines: 80,
          truncated: true,
        },
      }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "read range",
    });

    expect(result.content).toContain("line eleven");
    expect(result.content).toContain("[tool metadata]");
    expect(result.content).toContain("\"startLine\":10");
    expect(result.content).toContain("\"truncated\":true");
    expect(savedTurns[0]?.messages[2]?.tool_result_metadata).toMatchObject({
      startLine: 10,
      endLine: 12,
      totalLines: 80,
      truncated: true,
    });
  });

  test("passes the current user input into tool execution context", async () => {
    const toolCalls: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools when useful.",
        model: "fake-local",
        toolNames: ["execShell"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-tools-user-input" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: "ok",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async (call) => {
        toolCalls.push(call);
        return { content: "shell:/repo" };
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect cwd but don't delete files",
    });

    expect(toolCalls[0]).toMatchObject({
      id: "call-1",
      name: "execShell",
      arguments: "{\"cmd\":\"pwd\"}",
      userInput: "inspect cwd but don't delete files",
    });
  });

  test("continues tool loops until the provider returns final text", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools to complete coding tasks.",
        model: "fake-local",
        toolNames: ["readFile", "writeFile", "editFile", "codeSearch"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-coding" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls <= 64) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: `call-${completeCalls}`,
                type: "function",
                function: {
                  name: "readFile",
                  arguments: JSON.stringify({ path: "README.md" }),
                },
              }],
              trace: messages,
            } as any;
          }
          return {
            content: "coding workflow complete",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async (call) => ({ content: `ok:${call.id}` }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "make a small code change",
    });

    expect(result).toMatchObject({
      content: "coding workflow complete",
      dialogId: "dialog-coding",
      toolCallCount: 64,
    });
    expect(savedTurns[0]?.messages.filter((message) => message.role === "tool")).toHaveLength(64);
  });

  test("replays assistant reasoning content with tool calls", async () => {
    const providerMessages: any[][] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-reasoning" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages.push(messages.map((message) => ({ ...message })));
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              reasoning_content: "inspect repo first",
              tool_calls: [{
                id: "call-status",
                type: "function",
                function: { name: "readFile", arguments: JSON.stringify({ path: "README.md" }) },
              }],
              trace: messages,
            };
          }
          return {
            content: "done",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({ content: "clean" }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect cwd",
    });

    expect(providerMessages[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          reasoning_content: "inspect repo first",
          tool_calls: expect.any(Array),
        }),
      ]),
    );
  });

  test("returns tool execution errors to the provider so the agent can recover", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const toolEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "fake-local",
        toolNames: ["editFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-tool-error" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-bad-edit",
                type: "function",
                function: { name: "editFile", arguments: "{\"path\":\"README.md\",\"oldText\":\"x\",\"newText\":\"y\"}" },
              }],
              trace: messages,
            };
          }
          expect(messages.at(-1)).toMatchObject({
            role: "tool",
            tool_call_id: "call-bad-edit",
            tool_result_metadata: { error: true, toolName: "editFile" },
          });
          expect(String(messages.at(-1)?.content)).toContain("editFile failed: corrupt edit");
          return {
            content: "recovered after tool error",
            model: "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("corrupt edit");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "edit a file",
      onToolEvent: (event) => toolEvents.push(event),
    });

    expect(result.content).toBe("recovered after tool error");
    expect(toolEvents).toMatchObject([
      {
        type: "tool-call",
        round: 0,
        toolCallId: "call-bad-edit",
        toolName: "editFile",
        argumentsPreview: "README.md",
      },
      {
        type: "tool-error",
        round: 0,
        toolCallId: "call-bad-edit",
        toolName: "editFile",
        message: "corrupt edit",
      },
    ]);
    expect(savedTurns[0]?.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
  });

  test("fails fast on tool execution errors when the adapter has no local tool capability", async () => {
    const adapter: AgentRuntimeHostAdapter = {
      host: "desktop",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Text-only runtime.",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-should-not-save" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => ({
          content: "",
          model: "fake-local",
          tool_calls: [{
            id: "call-shell",
            type: "function",
            function: { name: "execShell", arguments: "{}" },
          }],
        }),
      }),
      executeTool: async () => {
        throw new Error("text-only runtime cannot execute tools");
      },
    };

    await expect(runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "use a tool",
    })).rejects.toThrow("text-only runtime cannot execute tools");
  });

  test("saves dialog with error metadata when provider throws (timeout)", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Timeout Agent",
        prompt: "You are a test agent.",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-timeout-1" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          throw new Error("agent run timed out after 600000ms");
        },
      }),
      executeTool: async () => {
        throw new Error("timeout test adapter has no tools");
      },
    };

    await expect(runLocalAgentTurn({
      adapter,
      agentRef: "timeout-agent",
      input: "do something slow",
    })).rejects.toThrow("agent run timed out after 600000ms");

    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]?.result).toMatchObject({
      error: true,
      errorMessage: "agent run timed out after 600000ms",
    });
    expect(savedTurns[0]?.messages.map((m) => m.role)).toEqual(["user"]);
  });

  test("emits llm-start/llm-end once for a text-only turn in the right order", async () => {
    const loopEvents: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-loop-text" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => ({ content: "hi", model: "fake-local" }),
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hello",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(loopEvents.map((e) => e.kind)).toEqual(["llm-start", "llm-end"]);
    expect(loopEvents[0]).toMatchObject({ kind: "llm-start", round: 0 });
    expect(loopEvents[1]).toMatchObject({ kind: "llm-end", round: 0, ok: true });
  });

  test("emits llm/tool loop events in order for a single-tool turn", async () => {
    const loopEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", toolNames: ["execShell"] }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-loop-tool" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
              }],
            } as any;
          }
          return { content: "done", model: "fake-local" };
        },
      }),
      executeTool: async () => ({ content: "shell:/repo" }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect cwd",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(loopEvents.map((e) => e.kind)).toEqual([
      "llm-start",
      "llm-end",
      "tool-start",
      "tool-end",
      "llm-start",
      "llm-end",
    ]);
    expect(loopEvents[0]).toMatchObject({ kind: "llm-start", round: 0 });
    expect(loopEvents[1]).toMatchObject({ kind: "llm-end", round: 0, ok: true });
    expect(loopEvents[2]).toMatchObject({
      kind: "tool-start",
      round: 0,
      toolCallId: "call-1",
      toolName: "execShell",
    });
    expect(loopEvents[3]).toMatchObject({
      kind: "tool-end",
      round: 0,
      toolCallId: "call-1",
      toolName: "execShell",
      ok: true,
    });
    expect(loopEvents[4]).toMatchObject({ kind: "llm-start", round: 1 });
    expect(loopEvents[5]).toMatchObject({ kind: "llm-end", round: 1, ok: true });
  });

  test("times out once without duplicating a non-cancellable provider call", async () => {
    const loopEvents: any[] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-loop-timeout" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          return new Promise(() => {}); // never resolves
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const start = Date.now();
    await expect(runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hang forever",
      llmRequestTimeoutMs: 50,
      onLoopEvent: (event) => loopEvents.push(event),
    })).rejects.toThrow("timed out");
    const elapsed = Date.now() - start;

    const llmStarts = loopEvents.filter((e) => e.kind === "llm-start");
    expect(llmStarts).toHaveLength(1);
    const llmEnds = loopEvents.filter((e) => e.kind === "llm-end");
    expect(llmEnds).toHaveLength(1);
    expect(llmEnds.every((e) => e.ok === false)).toBe(true);
    expect(completeCalls).toBe(1);
    expect(elapsed).toBeLessThan(2000);
    // Failure path still saves a dialog for forensics
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]?.result).toMatchObject({ error: true });
    expect(savedTurns[0]?.result.errorMessage).toContain("timed out after 50ms (round 0)");
  });

  test("llm start/end pair by round and carry cache + context metrics", async () => {
    const loopEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", provider: "nolo" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-llm-metrics" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "fake-local",
        complete: async () => {
          completeCalls += 1;
          return {
            content: "done",
            model: "fake-local",
            provider: "nolo",
            usage: {
              input_tokens: 100,
              output_tokens: 20,
              cache_read_input_tokens: 60,
              cache_creation_input_tokens: 40,
              provider_call_id: "req-abc-123",
            },
          };
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hello",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(result.content).toBe("done");
    const starts = loopEvents.filter((e) => e.kind === "llm-start");
    const ends = loopEvents.filter((e) => e.kind === "llm-end");
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
    // round 配对：start/end 同 round
    expect(starts[0].round).toBe(0);
    expect(ends[0].round).toBe(0);
    // provider/model 透传
    expect(starts[0]).toMatchObject({ kind: "llm-start", provider: "nolo", model: "fake-local" });
    expect(ends[0]).toMatchObject({ provider: "nolo", model: "fake-local", providerCallId: "req-abc-123" });
    // context metrics 只在 start 上
    expect(starts[0].context).toMatchObject({
      messageCount: expect.any(Number),
      contentChars: expect.any(Number),
    });
    expect(ends[0].context).toBeUndefined();
    // cache metrics 在 end 上
    expect(ends[0].cache).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      cacheHitTokens: 60,
      cacheMissTokens: 40,
      hitRatio: 0.6,
    });
  });

  test("tool start/end pair by toolCallId (not by toolName)", async () => {
    const loopEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", toolNames: ["execShell"] }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-tool-pair" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          if (completeCalls === 1) {
            // 同一 round 内连续两个 execShell 调用（call-A / call-B）
            return {
              content: "",
              model: "fake-local",
              tool_calls: [
                { id: "call-A", type: "function", function: { name: "execShell", arguments: "{\"cmd\":\"echo A\"}" } },
                { id: "call-B", type: "function", function: { name: "execShell", arguments: "{\"cmd\":\"echo B\"}" } },
              ],
            } as any;
          }
          return { content: "done", model: "fake-local" };
        },
      }),
      executeTool: async ({ id }) => ({ content: `result:${id}` }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "run both",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(result.content).toBe("done");
    const starts = loopEvents.filter((e) => e.kind === "tool-start");
    const ends = loopEvents.filter((e) => e.kind === "tool-end");
    expect(starts).toHaveLength(2);
    expect(ends).toHaveLength(2);
    // 同一 round、同一 toolName，仅靠 toolCallId 区分 A / B
    expect(starts[0]).toMatchObject({ kind: "tool-start", round: 0, toolCallId: "call-A", toolName: "execShell" });
    expect(starts[1]).toMatchObject({ kind: "tool-start", round: 0, toolCallId: "call-B", toolName: "execShell" });
    expect(ends[0]).toMatchObject({ kind: "tool-end", round: 0, toolCallId: "call-A", toolName: "execShell", ok: true });
    expect(ends[1]).toMatchObject({ kind: "tool-end", round: 0, toolCallId: "call-B", toolName: "execShell", ok: true });
    // 每个 tool 都带 elapsedMs 且非负
    for (const end of ends) {
      expect(typeof end.elapsedMs).toBe("number");
      expect(end.elapsedMs).toBeGreaterThanOrEqual(0);
    }
    // 时序：A-start < A-end < B-start < B-end
    expect(starts[0].atMs).toBeLessThanOrEqual(ends[0].atMs);
    expect(ends[0].atMs).toBeLessThanOrEqual(starts[1].atMs);
    expect(starts[1].atMs).toBeLessThanOrEqual(ends[1].atMs);
  });

  test("tool error keeps original toolCallId with ok:false and errorMessage", async () => {
    const loopEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", toolNames: ["execShell"] }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-tool-err-pair" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [
                { id: "call-err", type: "function", function: { name: "execShell", arguments: "{\"cmd\":\"boom\"}" } },
              ],
            } as any;
          }
          return { content: "recovered", model: "fake-local" };
        },
      }),
      executeTool: async () => { throw new Error("boom exploded"); },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "run risky",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(result.content).toBe("recovered");
    const errEnds = loopEvents.filter((e) => e.kind === "tool-end" && e.ok === false);
    expect(errEnds).toHaveLength(1);
    // 错误关联原始 toolCallId，带 ok:false 与 errorMessage
    expect(errEnds[0]).toMatchObject({
      kind: "tool-end",
      round: 0,
      toolCallId: "call-err",
      toolName: "execShell",
      ok: false,
      errorMessage: "boom exploded",
    });
  });

  test("onLoopEvent observer throwing does not break the agent loop (fail-open)", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", toolNames: ["execShell"] }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-fail-open" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [
                { id: "call-1", type: "function", function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" } },
              ],
            } as any;
          }
          return { content: "done despite observer crash", model: "fake-local" };
        },
      }),
      executeTool: async () => ({ content: "shell:/repo" }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "inspect",
      onLoopEvent: () => {
        throw new Error("observer bug");
      },
    });

    // observer 抛错被吞掉，loop 正常走完两轮并返回最终 content
    expect(result.content).toBe("done despite observer crash");
    expect(completeCalls).toBe(2);
  });

  test("tool-end canonical event filters out sensitive / raw metadata fields", async () => {
    const loopEvents: any[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local", toolNames: ["execShell"] }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-safe-meta" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          if (completeCalls === 1) {
            return {
              content: "",
              model: "fake-local",
              tool_calls: [
                { id: "call-meta", type: "function", function: { name: "execShell", arguments: "{\"command\":\"ls\"}" } },
              ],
            } as any;
          }
          return { content: "finished", model: "fake-local" };
        },
      }),
      executeTool: async () => ({
        content: "file.txt",
        metadata: {
          exitCode: 0,
          command: "ls " + "x".repeat(500),
          secretApiKey: "sk-should-not-leak",
          internalBuffers: { raw: Buffer.from("payload") },
          lineCount: 1,
        },
      }),
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "list",
      onLoopEvent: (event) => loopEvents.push(event),
    });

    const end = loopEvents.find((e) => e.kind === "tool-end");
    expect(end).toBeDefined();
    expect(end.metadata.exitCode).toBe(0);
    expect(end.metadata.lineCount).toBe(1);
    expect(typeof end.metadata.command).toBe("string");
    expect(end.metadata.command.length).toBeLessThanOrEqual(240);
    expect((end.metadata as any).secretApiKey).toBeUndefined();
    expect((end.metadata as any).internalBuffers).toBeUndefined();
  });

  test("inherits the overall turn timeout when no per-request override is set", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-turn-timeout" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          completeCalls += 1;
          return new Promise(() => {});
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    await expect(runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hang until the turn budget",
      timeoutMs: 25,
    })).rejects.toThrow("timed out after 25ms");
    expect(completeCalls).toBe(1);
  }, 1_000);

  test("swallows onLoopEvent exceptions so they do not affect the turn result", async () => {
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-loop-throw" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => ({ content: "survived", model: "fake-local" }),
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hello",
      onLoopEvent: () => { throw new Error("observer boom"); },
    });

    expect(result.content).toBe("survived");
  });

  test("abortSignal stops the loop mid-provider-call and still saves the turn", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const controller = new AbortController();
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Slow Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-aborted" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        // Never resolves: simulates a long-running provider request.
        complete: () => new Promise(() => {}),
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    const turn = runLocalAgentTurn({
      adapter,
      agentRef: "slow",
      input: "take forever",
      abortSignal: controller.signal,
    });
    setTimeout(() => controller.abort(), 10);

    await expect(turn).rejects.toMatchObject({ code: "LOCAL_TURN_ABORTED" });
    // The aborted turn is persisted so the dialog can still be reviewed.
    expect(savedTurns).toHaveLength(1);
  });

  test("resolveProvider failure still saveTurn()s so the next message can continue", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Broken Provider Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-provider-init-fail" };
      },
      resolveProvider: async () => {
        throw new Error("OAuth credential not found locally");
      },
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await expect(
      runLocalAgentTurn({
        adapter,
        agentRef: "broken",
        input: "review this code",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("OAuth credential"),
      dialogId: "dialog-provider-init-fail",
    });
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]?.messages.some((m) => m.role === "user")).toBe(true);
    expect(savedTurns[0]?.result.error).toBe(true);
  });

  test("loadDialogHistory failure still parks the user message on continueDialogId", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "History Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => {
        throw new Error("dialog store unavailable");
      },
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: input.continueDialogId ?? "dialog-history-fail" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => ({ content: "should not run", model: "fake-local" }),
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    await expect(
      runLocalAgentTurn({
        adapter,
        agentRef: "history",
        input: "继续",
        continueDialogId: "dialog-existing",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("dialog store unavailable"),
      dialogId: "dialog-existing",
    });
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]?.continueDialogId).toBe("dialog-existing");
    expect(savedTurns[0]?.messages).toEqual([
      { role: "user", content: "继续" },
    ]);
  });

  test("pre-aborted signal short-circuits before any provider call", async () => {
    const controller = new AbortController();
    controller.abort();
    let providerCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-x" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          providerCalls += 1;
          return { content: "should not happen", model: "m" };
        },
      }),
      executeTool: async () => {
        throw new Error("no tools");
      },
    };

    await expect(
      runLocalAgentTurn({
        adapter,
        agentRef: "a",
        input: "hi",
        abortSignal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "LOCAL_TURN_ABORTED" });
    expect(providerCalls).toBe(0);
  });

  describe("tool execution abort race", () => {
    // 构造一个第一轮返回 tool_calls、第二轮可自定义的 adapter。
    // complete 缺省时第二轮直接给最终答案。
    function buildToolLoopAdapter(opts: {
      toolName: string;
      executeTool: () => Promise<unknown>;
      complete?: (
        messages: AgentRuntimeChatMessage[],
        call: number,
      ) => Promise<{
        content: string;
        model: string;
        tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
      }>;
    }): AgentRuntimeHostAdapter {
      let calls = 0;
      return {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-tool-abort" }),
        resolveProvider: async () => ({
          model: "m",
          complete: async (messages) => {
            calls += 1;
            if (opts.complete) return opts.complete(messages, calls);
            if (calls === 1) {
              return {
                content: "calling tool",
                model: "m",
                tool_calls: [
                  { id: "call-1", type: "function", function: { name: opts.toolName, arguments: "{}" } },
                ],
              };
            }
            return { content: "final answer", model: "m" };
          },
        }),
        executeTool: opts.executeTool,
      };
    }

    test("abort mid-tool rejects the turn in ms instead of waiting for the tool", async () => {
      const controller = new AbortController();
      let toolStarted = false;
      let abortAt = 0;
      const adapter = buildToolLoopAdapter({
        toolName: "never_finish",
        executeTool: async () => {
          toolStarted = true;
          return new Promise(() => {}); // 永不 resolve：没有 race 就会挂住
        },
      });
      const turn = runLocalAgentTurn({
        adapter,
        agentRef: "a",
        input: "run it",
        abortSignal: controller.signal,
      });
      setTimeout(() => {
        abortAt = Date.now();
        controller.abort();
      }, 20);
      await expect(turn).rejects.toMatchObject({ code: "LOCAL_TURN_ABORTED" });
      const settledAt = Date.now();
      expect(toolStarted).toBe(true);
      // 毫秒级返回：race 在 abort 事件同步 reject，而不是等工具自然结束。
      // 去掉 race 后本测试会因工具永不 resolve 而挂到 bun:test 超时（红）。
      expect(settledAt - abortAt).toBeLessThan(500);
    });

    test("aborted error carries pendingToolName of the in-flight tool", async () => {
      const controller = new AbortController();
      const adapter = buildToolLoopAdapter({
        toolName: "capture_screenshot",
        executeTool: async () => new Promise(() => {}),
      });
      const turn = runLocalAgentTurn({
        adapter,
        agentRef: "a",
        input: "go",
        abortSignal: controller.signal,
      });
      setTimeout(() => controller.abort(), 20);
      let caught: unknown;
      try {
        await turn;
      } catch (error) {
        caught = error;
      }
      expect((caught as { code?: string } | undefined)?.code).toBe("LOCAL_TURN_ABORTED");
      // 上层（TUI）据此提示「中止时 <toolName> 仍在进行，它可能已经完成」。
      expect((caught as { pendingToolName?: string } | undefined)?.pendingToolName).toBe(
        "capture_screenshot",
      );
    });

    test("a rejected abandoned tool promise does not surface as unhandled rejection", async () => {
      const controller = new AbortController();
      let rejectTool!: (error: Error) => void;
      const toolPromise = new Promise<never>((_resolve, reject) => {
        rejectTool = reject;
      });
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => {
        unhandled.push(reason);
      };
      process.on("unhandledRejection", onUnhandled);
      try {
        const adapter = buildToolLoopAdapter({
          toolName: "slow_tool",
          executeTool: async () => toolPromise,
        });
        const turn = runLocalAgentTurn({
          adapter,
          agentRef: "a",
          input: "go",
          abortSignal: controller.signal,
        });
        setTimeout(() => controller.abort(), 20);
        await expect(turn).rejects.toMatchObject({ code: "LOCAL_TURN_ABORTED" });
        // turn 已结束，被放弃的工具此时才 reject。若实现没挂 .catch(() => {})，
        // bun:test 会把 unhandled rejection 判为本测试失败（红）。
        rejectTool(new Error("late tool failure"));
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(unhandled).toHaveLength(0);
      } finally {
        process.removeListener("unhandledRejection", onUnhandled);
      }
    });

    test("normal path unchanged: tool result still feeds the next provider round", async () => {
      const providerMessages: AgentRuntimeChatMessage[][] = [];
      const adapter = buildToolLoopAdapter({
        toolName: "read_file",
        executeTool: async () => ({ content: "file contents", metadata: undefined }),
        complete: async (messages) => {
          providerMessages.push(messages);
          if (providerMessages.length === 1) {
            return {
              content: "reading",
              model: "m",
              tool_calls: [
                { id: "call-1", type: "function", function: { name: "read_file", arguments: "{}" } },
              ],
            };
          }
          return { content: "final answer", model: "m" };
        },
      });
      const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "read it" });
      expect(result.content).toBe("final answer");
      expect(providerMessages).toHaveLength(2);
      const toolMessage = providerMessages[1]?.find((m) => m.role === "tool");
      expect(toolMessage).toBeDefined();
      expect(String(toolMessage?.content)).toContain("file contents");
    });

    test("no abort listeners leak after a multi-tool turn", async () => {
      const controller = new AbortController();
      const adapter = buildToolLoopAdapter({
        toolName: "tool_a",
        executeTool: async () => ({ content: "ok", metadata: undefined }),
        complete: async (messages) => {
          const toolMessages = messages.filter((m) => m.role === "tool");
          if (toolMessages.length < 2) {
            return {
              content: "calling two tools",
              model: "m",
              tool_calls: [
                { id: "call-1", type: "function", function: { name: "tool_a", arguments: "{}" } },
                { id: "call-2", type: "function", function: { name: "tool_b", arguments: "{}" } },
              ],
            };
          }
          return { content: "done", model: "m" };
        },
      });
      await runLocalAgentTurn({
        adapter,
        agentRef: "a",
        input: "go",
        abortSignal: controller.signal,
      });
      // LLM 阶段（runCompleteWithTimeout）与工具阶段（runAbortableToolTask）的 listener
      // 都必须在 ensuring / cleanup 清理；残留即泄漏。
      expect(getEventListeners(controller.signal as any, "abort")).toHaveLength(0);
    });
  });

  test("empty turn → repair retry → second round has content → success", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const providerCalls: AgentRuntimeChatMessage[][] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-repair" };
      },
      resolveProvider: async () => ({
        model: "m",
        complete: async (messages) => {
          completeCalls += 1;
          providerCalls.push(messages);
          // commit 6ce5be672 后 reasoning_content 计入可见输出：
          // 第一轮只有 reasoning、无 content/tool_calls → 现在视为有可见输出，
          // 不触发 repair，直接结束。这里改成真正空轮（无 reasoning、无 content）
          // 以继续覆盖 repair 路径。
          if (completeCalls === 1) {
            return { content: "", reasoning_content: "", model: "m" } as any;
          }
          return { content: "final answer", model: "m" };
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    expect(result.content).toBe("final answer");
    expect(completeCalls).toBe(2);
    // repair 消息注入到第二轮请求（role:user + EMPTY_ASSISTANT_REPAIR_PROMPT）
    expect(providerCalls).toHaveLength(2);
    const repairInjected = providerCalls[1].some(
      (m) => m.role === "user" && typeof m.content === "string" && m.content.includes("请给出明确的文字回答或执行下一步"),
    );
    expect(repairInjected).toBe(true);
    // 只重试一次：第二轮拿到内容即结束，没有第三轮
    expect(completeCalls).toBe(2);
    expect(savedTurns).toHaveLength(1);
  });

  test("two empty rounds → fallback message ends the turn without throwing", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-fallback" };
      },
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          completeCalls += 1;
          // 真正空轮：无 reasoning、无 content、无 tool_calls。
          // finish_reason 必须是 "stop"——模型确实正常收尾了，只是没话说；
          // 缺了它就变成「流被截断」，那是另一种成因、另一句文案。
          return { content: "", reasoning_content: "", finish_reason: "stop", model: "m" } as any;
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    // 不抛错；content 为 fallback 诊断文案
    expect(result.content).toBe("模型连续返回空消息，当前任务未完成。请重试当前步骤，或给出更具体的修改范围。");
    // 第一轮空 → repair；第二轮仍空 → fallback 结束
    expect(completeCalls).toBe(2);
    expect(savedTurns).toHaveLength(1);
  });

  test("length truncated turn with reasoning logs reasoning tail with marker and returns fallback message", async () => {
    const origWarn = console.warn;
    const warns: string[] = [];
    console.warn = (...args: any[]) => {
      warns.push(args.join(" "));
    };

    try {
      const savedTurns: AgentRuntimeSaveTurnInput[] = [];
      const reasoningSample = "Detailed reasoning: The review found 2 issues. Overall status: APPROVE. " + "x".repeat(3000);
      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence"],
        loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
        loadDialogHistory: async () => [],
        saveTurn: async (input) => {
          savedTurns.push(input);
          return { dialogId: "dialog-length-trunc" };
        },
        resolveProvider: async () => ({
          model: "m",
          complete: async () => ({
            content: "",
            reasoning_content: reasoningSample,
            finish_reason: "length",
            model: "m",
          } as any),
        }),
        executeTool: async () => { throw new Error("no tools"); },
      };

      const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "review this code" });

      // Fallback message is unchanged
      expect(result.content).toBe(LENGTH_TRUNCATED_FALLBACK_MESSAGE);
      expect(savedTurns).toHaveLength(1);

      // Warning logs contain the marker and reasoning tail clipped to 2000 chars
      const matchingWarn = warns.find((w) => w.includes(LENGTH_TRUNCATED_REASONING_MARKER));
      expect(matchingWarn).toBeDefined();
      expect(matchingWarn).toContain(reasoningSample.slice(-2000));
      expect(matchingWarn).not.toContain("Detailed reasoning: The review found 2 issues.");
    } finally {
      console.warn = origWarn;
    }
  });

  test("脏历史经过 prepareMessagesForProviderCall 配对护栏：孤儿 tool 与悬空 tool_calls 不进 provider", async () => {
    const providerCalls: AgentRuntimeChatMessage[][] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [
        // 事故原型：user / assistant(无 tool_calls) / tool×3(孤儿) / assistant(tool_calls×3, 悬空) / user
        { role: "user", content: "u1" },
        { role: "assistant", content: "plain" },
        { role: "tool", content: "r0", tool_call_id: "call_00" },
        { role: "tool", content: "r1", tool_call_id: "call_01" },
        { role: "tool", content: "r2", tool_call_id: "call_02" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "call_00", type: "function", function: { name: "x", arguments: "{}" } },
            { id: "call_01", type: "function", function: { name: "x", arguments: "{}" } },
            { id: "call_02", type: "function", function: { name: "x", arguments: "{}" } },
          ],
        },
        { role: "user", content: "u2" },
      ],
      saveTurn: async () => ({ dialogId: "dialog-pairing" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async (messages) => {
          completeCalls += 1;
          providerCalls.push(messages);
          return { content: "ok", model: "m" };
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "now", continueDialogId: "d1" });

    expect(result.content).toBe("ok");
    expect(completeCalls).toBe(1);
    const sent = providerCalls[0];
    const roles = sent.map((m) => m.role);
    // 期望序列（含 system prompt 缺省，所以开头是 user）：user / assistant / assistant / tool×3 / user / user(input)
    // 关键断言：紧接带 tool_calls 的 assistant 之后是 tool×3，且没有孤儿 tool 出现在 plain assistant 后
    const asstWithCallsIdx = roles.indexOf("assistant") + 1; // 第二个 assistant（带 tool_calls）
    // 找带 tool_calls 的 assistant
    const callsAsstIdx = sent.findIndex(
      (m) => m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0,
    );
    expect(callsAsstIdx).toBeGreaterThan(0);
    // 紧接着必须是 tool×3
    expect(sent[callsAsstIdx + 1]).toMatchObject({ role: "tool", tool_call_id: "call_00" });
    expect(sent[callsAsstIdx + 2]).toMatchObject({ role: "tool", tool_call_id: "call_01" });
    expect(sent[callsAsstIdx + 3]).toMatchObject({ role: "tool", tool_call_id: "call_02" });
    // plain assistant 后面不应紧接 tool（孤儿被挪走了）
    const plainAsstIdx = sent.findIndex(
      (m) => m.role === "assistant" && !(Array.isArray(m.tool_calls) && m.tool_calls.length > 0),
    );
    expect(plainAsstIdx).toBeGreaterThan(0);
    expect(sent[plainAsstIdx + 1]).not.toMatchObject({ role: "tool" });
    // 末尾是本轮 user input（turn-scope 时间块并入其头部，input 在最后）
    expect(sent[sent.length - 1]).toMatchObject({ role: "user" });
    expect(String(sent[sent.length - 1]?.content).endsWith("now")).toBe(true);
  });

  test("exposes the last round's finish_reason across a multi-round tool loop", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-finish" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          completeCalls += 1;
          if (completeCalls === 1) {
            // 第一轮：要求调工具，finish_reason=tool_calls
            return {
              content: "",
              model: "fake-local",
              finish_reason: "tool_calls",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "readFile", arguments: JSON.stringify({ path: "README.md" }) },
              }],
              trace: messages,
            } as any;
          }
          // 最后一轮：被 length 砍断（话没说完），finish_reason=length
          return {
            content: "bun-nolo 是一个工程成熟度远超",
            model: "fake-local",
            finish_reason: "length",
            trace: messages,
          } as any;
        },
      }),
      executeTool: async (call) => ({ content: `ok:${call.id}` }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "make a small code change",
    });

    expect(completeCalls).toBe(2);
    expect(result).toMatchObject({
      content: "bun-nolo 是一个工程成熟度远超",
      dialogId: "dialog-finish",
      toolCallCount: 1,
      finish_reason: "length",
    });
  });

  // —— Task B：localLoop reasoning-only 空轮判定对齐服务端 ——
  // 旧代码把非空 reasoning_content 当作可见输出，reasoning-only 时直接 break、
  // 既不 repair 也不 fallback，用户只看到空串。新语义：reasoning 不算可见输出，
  // reasoning-only 且无 tool_calls 视为空轮，走 repair/fallback，与服务端一致。

  test("reasoning-only 且无 tool_calls → 触发 repair 重试（旧代码会直接 break 不重试）", async () => {
    const providerCalls: AgentRuntimeChatMessage[][] = [];
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-reasoning-repair" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async (messages) => {
          completeCalls += 1;
          providerCalls.push(messages);
          if (completeCalls === 1) {
            // 第一轮：只有 7446 字 reasoning、content 为空、无 tool_calls。
            // 旧代码：reasoning 计入可见输出 → 直接 break，completeCalls 停在 1。
            // 新代码：reasoning 不算可见输出 → repair，completeCalls 会到 2。
            return { content: "", reasoning_content: "思考了很久但没产出正文".repeat(200), model: "m" } as any;
          }
          return { content: "修好了", model: "m" } as any;
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    // 关键断言：repair 被触发，provider 被调了两次（旧代码只调一次）。
    expect(completeCalls).toBe(2);
    expect(result.content).toBe("修好了");
    const repairInjected = providerCalls[1].some(
      (m) => m.role === "user" && typeof m.content === "string" && m.content.includes("请给出明确的文字回答或执行下一步"),
    );
    expect(repairInjected).toBe(true);
  });

  test("repair 后仍 reasoning-only → 最终 content 是 EMPTY_ASSISTANT_FALLBACK_MESSAGE，不是空串", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-reasoning-fallback" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          completeCalls += 1;
          // 两轮都是 reasoning-only、无 content、无 tool_calls，但流本身正常收尾
          // （finish_reason=stop）——这是模型真的没出正文，不是流被切断。
          return {
            content: "",
            reasoning_content: "还在思考但不出正文".repeat(100),
            finish_reason: "stop",
            model: "m",
          } as any;
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    // reasoning-only 空轮：模型有思考但没落正文，给最多 MAX_REASONING_ONLY_REPAIRS 次
    // repair（提示输出正文），仍只思考才 fallback。故 provider 被调 MAX_REASONING_ONLY_REPAIRS+1 次。
    expect(completeCalls).toBe(MAX_REASONING_ONLY_REPAIRS + 1);
    // 关键断言：用户拿到的是诊断文案，不是空串（旧代码会给空串）。
    expect(result.content).toBe("模型连续返回空消息，当前任务未完成。请重试当前步骤，或给出更具体的修改范围。");
  });

  test("finish_reason=length 且无可见输出 → 直接得到 LENGTH_TRUNCATED_FALLBACK_MESSAGE，且不走 repair（provider 只调一次）", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-length-trunc" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          completeCalls += 1;
          // 真实事故复现：content=""、reasoning 7446 字、finish_reason=length、无 tool_calls。
          return {
            content: "",
            reasoning_content: "话没说完就被 length 截断了".repeat(300),
            finish_reason: "length",
            model: "m",
          } as any;
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    // 关键断言：length 截断不走 repair，provider 只被调用一次。
    expect(completeCalls).toBe(1);
    // 用户拿到的是 length 截断诊断文案，不是空串。
    expect(result.content).toBe("输出达到长度上限被截断，建议缩短任务或提高输出上限。");
  });

  // 真实事故第二种成因：上游把流正常关闭但没发结束标记，服务端一条错误都没有。
  // 客户端只能靠「完全没有 finish_reason」认出来——健康的 OpenAI 兼容流最后一个
  // chunk 必带它。不区分的话，一次网络级截断会伪装成「模型返回空内容」。
  test("repair 后仍空且始终没有 finish_reason → 得到 STREAM_TRUNCATED_FALLBACK_MESSAGE 而不是空轮文案", async () => {
    let completeCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-stream-trunc" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          completeCalls += 1;
          // 流在收尾前断掉：有 reasoning，但既无 content、无 tool_calls，
          // 也**没有 finish_reason**（正常收尾一定会带）。
          return {
            content: "",
            reasoning_content: "想到一半流就断了".repeat(50),
            model: "m",
          } as any;
        },
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "do it" });

    // 截断是瞬时故障，重试一次是对的：repair 走了，所以 provider 被调两次。
    expect(completeCalls).toBe(2);
    // 关键断言：文案指向「流被中断」，不是「模型连续返回空消息」。
    expect(result.content).toBe(
      "上游响应流在收尾前被中断（未收到结束标记），本轮输出不完整。请重试当前步骤。",
    );
  });

  // 真实事故：TUI /switch 后切到 hasVision:false 的 agent（如 glm-5.2），
  // local loop 把带 image_url 的消息原样发给 platform chat proxy → 400
  // "this model does not support image input" → local 判失败 → fallback 到没有
  // local code 工具的 server → agent 报 blocker。这里验证 image_url parts 在
  // 发给 provider 前按 vision 能力被剥离。
  // fixture 约定：本用例要求 resolveAgentImageInputSupport 解析出 false。
  // 这里刻意用 provider: "custom" + 非 catalog 模型名，使能力查表落空并回退到
  // 显式的 hasVision: false（见 agentCapabilities.ts 的 catalogHasVision →
  // agent.hasVision 回退链）。不要改回真实模型名：真实模型会随 catalog 更新
  // 或 providers.ts 的别名映射（如曾经的 glm-5.2 → glm-5.3）而获得视觉能力，
  // 导致剥离逻辑不触发、本用例静默失效。
  test("模型不支持图片时，剥离 image_url part 为占位文本", async () => {
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const loopEvents: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "mock-text-only-model",
        provider: "custom",
        hasVision: false,
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-no-vision" }),
      resolveProvider: async (agentConfig) => {
        return {
          model: agentConfig.model ?? "mock-text-only-model",
          complete: async (messages) => {
            providerMessages = messages as AgentRuntimeChatMessage[];
            return {
              content: "ok without image",
              model: agentConfig.model ?? "mock-text-only-model",
              trace: messages,
            };
          },
        };
      },
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "no-vision",
      input: [
        { type: "text", text: "describe this" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      ],
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(result.content).toBe("ok without image");
    // 关键断言：provider 收到的消息里没有任何 image_url part。
    for (const msg of providerMessages) {
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          expect(part?.type).not.toBe("image_url");
        }
      }
    }
    // text part 必须保留——过滤不能把文字也丢掉。
    const userInput = providerMessages.find((m) => m.role === "user");
    const userContent = userInput?.content;
    const hasText = Array.isArray(userContent)
      ? userContent.some((p) => p?.type === "text")
      : typeof userContent === "string" && userContent.length > 0;
    expect(hasText).toBe(true);
    // 不再产生 image-preprocessed（vision 预处理已删除）；只降级为 image-downgraded
    const preprocessedEvents = loopEvents.filter((e) => e.kind === "image-preprocessed");
    expect(preprocessedEvents.length).toBe(0);
    const downgradeEvents = loopEvents.filter((e) => e.kind === "image-downgraded");
    expect(downgradeEvents.length).toBe(1);
    expect(downgradeEvents[0]?.reason).toBe("no-vision");
  });

  test("模型支持图片时，image_url parts 保留", async () => {
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const loopEvents: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "kimi-k2.6",
        provider: "nolo",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-vision" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "kimi-k2.6",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return {
            content: "ok with image",
            model: agentConfig.model ?? "kimi-k2.6",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "vision",
      input: [
        { type: "text", text: "describe this" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      ],
      onLoopEvent: (event) => loopEvents.push(event),
    });

    expect(result.content).toBe("ok with image");
    // 关键断言：provider 收到的 user 消息里仍有 image_url part。
    const userInput = providerMessages.find((m) => m.role === "user");
    const userContent = userInput?.content;
    const hasImage = Array.isArray(userContent)
      ? userContent.some((p) => p?.type === "image_url")
      : false;
    expect(hasImage).toBe(true);
    // 反向断言：模型支持图片时不触发降级事件。
    expect(loopEvents.some((e) => e.kind === "image-downgraded")).toBe(false);
  });

  // 纯图片消息（无 text part）过滤后不能变成空串——主流 Provider API 要求
  // user 消息 content 非空，空串会触发 400，又回到误 fallback 的老问题。
  // 占位文本保证 content 非空，让 local 轮能正常完成。
  // fixture 约定同上：provider: "custom" + 非 catalog 模型名 + hasVision: false，
  // 避免依赖真实模型的 catalog 能力（会随别名映射/能力升级而漂移）。
  test("纯图片消息过滤后变占位文本而非空串", async () => {
    let providerMessages: AgentRuntimeChatMessage[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "mock-text-only-model",
        provider: "custom",
        hasVision: false,
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-image-only" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "mock-text-only-model",
        complete: async (messages) => {
          providerMessages = messages as AgentRuntimeChatMessage[];
          return {
            content: "ok placeholder",
            model: agentConfig.model ?? "mock-text-only-model",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "image-only",
      input: [
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      ],
    });

    expect(result.content).toBe("ok placeholder");
    // 关键断言：provider 收到的 user 消息 content 非空（占位文本），不是 ""。
    const userInput = providerMessages.find((m) => m.role === "user");
    const userContent = userInput?.content;
    const contentText =
      typeof userContent === "string"
        ? userContent
        : Array.isArray(userContent)
          ? userContent.map((p: any) => p?.text ?? "").join("")
          : "";
    expect(contentText.length).toBeGreaterThan(0);
    // 不能有任何残留 image_url part。
    if (Array.isArray(userContent)) {
      for (const part of userContent) {
        expect(part?.type).not.toBe("image_url");
      }
    }
  });

  test("output blocks: provider 发 mid-stream onToolEvent → localLoop 不重复发 tool 事件", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const toolEvents: any[] = [];
    let completeCalls = 0;
    let executeToolCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "cursor-fake",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-midstream" };
      },
      resolveProvider: async () => ({
        model: "cursor-fake",
        complete: async (messages, options) => {
          completeCalls += 1;
          const toolCall = {
            id: "midstream-tc-1",
            type: "function" as const,
            function: {
              name: "readFile",
              arguments: JSON.stringify({ path: "/tmp/a" }),
            },
          };
          // 模拟 cursor provider：在 streamCursorChat 内（即 complete 返回前）
          // 通过 options.onToolEvent 同步发 tool-call + tool-result。
          options?.onToolEvent?.({
            type: "tool-call",
            round: options.toolEventRound ?? 0,
            toolCallId: toolCall.id,
            toolName: "readFile",
            argumentsPreview: JSON.stringify({ path: "/tmp/a" }),
          });
          options?.onToolEvent?.({
            type: "tool-result",
            round: options.toolEventRound ?? 0,
            toolCallId: toolCall.id,
            toolName: "readFile",
            content: "file contents",
          });
          return {
            content: "",
            model: "cursor-fake",
            provider: "cursor",
            tool_calls: [toolCall],
            output: [
              { type: "text", text: "Let me read the file." },
              {
                type: "toolCall",
                toolCall,
                result: { content: "file contents" },
              },
              { type: "text", text: "Done." },
            ],
            trace: messages,
          } as any;
        },
      }),
      executeTool: async () => {
        executeToolCalls += 1;
        throw new Error("executeTool should NOT be called when output block has result");
      },
    };
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "read /tmp/a",
      onToolEvent: (event) => toolEvents.push(event),
    });

    expect(completeCalls).toBe(1);
    expect(executeToolCalls).toBe(0);
    // 关键断言：localLoop 不重复发——恰好 1 tool-call + 1 tool-result。
    const calls = toolEvents.filter((e) => e.type === "tool-call");
    const results = toolEvents.filter((e) => e.type === "tool-result");
    expect(calls).toHaveLength(1);
    expect(results).toHaveLength(1);
    expect(calls[0].toolCallId).toBe("midstream-tc-1");
    expect(results[0].content).toBe("file contents");
    // toolEventRound 透传：localLoop 传 round=0（首轮）。
    expect(calls[0].round).toBe(0);
    // OpenAI 消息形状仍正确。
    const msgs = savedTurns[0]?.messages ?? [];
    expect(msgs.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(msgs[1].content).toBe("Let me read the file.");
    expect(msgs[1].tool_calls?.[0]?.id).toBe("midstream-tc-1");
    expect(msgs[2].tool_call_id).toBe("midstream-tc-1");
    expect(msgs[3].content).toBe("Done.");
    expect(result.toolCallCount).toBe(1);
  });

  test("output blocks 中带 result 的 toolCall 不跑 executeTool", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let completeCalls = 0;
    let executeToolCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "cursor-fake",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-cursor-blocks" };
      },
      resolveProvider: async () => ({
        model: "cursor-fake",
        complete: async (messages) => {
          completeCalls += 1;
          // 模拟 cursor provider 通过 canonical output 返回有序 block 序列：
          // toolCall block 的 result 已填充 = 流内已执行，content 为空串（文本已通过 onTextDelta 推完）。
          const toolCall = {
            id: "cursor-tc-blocks-1",
            type: "function" as const,
            function: { name: "readFile", arguments: JSON.stringify({ path: "/tmp/a" }) },
          };
          return {
            content: "",
            model: "cursor-fake",
            provider: "cursor",
            tool_calls: [toolCall],
            output: [
              { type: "text", text: "Let me read the file." },
              { type: "toolCall", toolCall, result: { content: "file contents" } },
              { type: "text", text: "Done." },
            ],
            trace: messages,
          } as any;
        },
      }),
      executeTool: async () => {
        executeToolCalls += 1;
        throw new Error("executeTool should NOT be called when output block has result");
      },
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "read /tmp/a",
    });

    // provider 只被调用一次（不进下一轮重调）
    expect(completeCalls).toBe(1);
    // executeTool 没被重复调用（toolCall block 带 result → 流内已执行）
    expect(executeToolCalls).toBe(0);
    // result.content 为空串（文本已由 onTextDelta 推完，skipFinalAppend 生效）
    expect(result.content).toBe("");
    expect(result.toolCallCount).toBe(1);
    // output blocks 展开为 OpenAI 扁平消息序列：
    // user → assistant(text_before + tool_calls) → tool(tool_call_id) → assistant(trailing text)
    const msgs = savedTurns[0]?.messages ?? [];
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].content).toBe("Let me read the file.");
    expect(msgs[1].tool_calls?.[0]?.id).toBe("cursor-tc-blocks-1");
    expect(msgs[2].role).toBe("tool");
    expect(msgs[2].tool_call_id).toBe("cursor-tc-blocks-1");
    expect(typeof msgs[2].content).toBe("string");
    expect((msgs[2].content as string).includes("file contents")).toBe(true);
    expect(msgs[3].role).toBe("assistant");
    expect(msgs[3].content).toBe("Done.");
    expect(msgs[3].tool_calls).toBeUndefined();
  });

  test("output blocks: 连续两个 toolCall 合并进同一 assistant 再接 trailing text", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let executeToolCalls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Use tools.",
        model: "cursor-fake",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-cursor-blocks-multi" };
      },
      resolveProvider: async () => ({
        model: "cursor-fake",
        complete: async () => {
          const tc1 = {
            id: "cursor-tc-multi-1",
            type: "function" as const,
            function: { name: "readFile", arguments: JSON.stringify({ path: "/tmp/a" }) },
          };
          const tc2 = {
            id: "cursor-tc-multi-2",
            type: "function" as const,
            function: { name: "readFile", arguments: JSON.stringify({ path: "/tmp/b" }) },
          };
          return {
            content: "",
            model: "cursor-fake",
            provider: "cursor",
            tool_calls: [tc1, tc2],
            output: [
              { type: "toolCall", toolCall: tc1, result: { content: "a contents" } },
              { type: "toolCall", toolCall: tc2, result: { content: "b contents" } },
              { type: "text", text: "Both done." },
            ],
          } as any;
        },
      }),
      executeTool: async () => {
        executeToolCalls += 1;
        throw new Error("executeTool should NOT be called when output block has result");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "read /tmp/a and /tmp/b",
    });

    expect(executeToolCalls).toBe(0);
    const msgs = savedTurns[0]?.messages ?? [];
    // 两个连续 toolCall 无中间 text → 同一条 assistant 持两个 tool_calls，
    // 紧跟两条 tool，再接一条 trailing text assistant。
    expect(msgs.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "tool",
      "assistant",
    ]);
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].content).toBeNull();
    expect(msgs[1].tool_calls?.length).toBe(2);
    expect(msgs[1].tool_calls?.[0]?.id).toBe("cursor-tc-multi-1");
    expect(msgs[1].tool_calls?.[1]?.id).toBe("cursor-tc-multi-2");
    expect(msgs[2].role).toBe("tool");
    expect(msgs[2].tool_call_id).toBe("cursor-tc-multi-1");
    expect(msgs[3].role).toBe("tool");
    expect(msgs[3].tool_call_id).toBe("cursor-tc-multi-2");
    expect(msgs[4].role).toBe("assistant");
    expect(msgs[4].content).toBe("Both done.");
    expect(msgs[4].tool_calls).toBeUndefined();
  });

  test("injects runtime guidance and current-time blocks into the system message", async () => {
    let providerMessages: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "desktop",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Tool Agent",
        prompt: "You are a coding agent.",
        model: "fake-local",
        // bash→execShell, edit→editFile, fetchWebpage 触发 startup-protocol
        // 与 web-research-tool-policy guidance。
        toolNames: ["bash", "edit", "fetchWebpage"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-guidance" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "fake-local",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return {
            content: "ok",
            model: agentConfig.model ?? "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run for a text-only turn");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "tool-agent",
      input: "check the env",
    });

    const systemMessage = providerMessages.find((m) => m.role === "system");
    expect(systemMessage).toBeDefined();
    const systemContent = String(systemMessage?.content ?? "");
    // startup-protocol guidance 块标记。
    expect(systemContent).toContain("--- 启动协议 ---");
    // 前缀缓存契约：current-time 是 turn-scope，不再进 system（会切断其身后
    // 全部历史的前缀缓存），改并入末尾 user 头部。
    expect(systemContent).not.toContain("--- 当前时间 ---");
    const guidanceLastUser = [...providerMessages].reverse().find((m) => m.role === "user");
    const guidanceLastUserContent = String(guidanceLastUser?.content ?? "");
    expect(guidanceLastUserContent).toContain("--- 当前时间 ---");
    expect(guidanceLastUserContent).toContain(`当前日期: ${new Date().toISOString().slice(0, 10)}`);
    // execShell + fetchWebpage 时，网页研究工具策略由 webAccess 段承载
    // （生产环境勿用 execShell 抓网页）。
    expect(systemContent).toContain("不要用 execShell 调 curl/grep/sed");
    expect(systemContent).toContain("llms.txt");
  });

  test("does not inject tool-gated guidance blocks when the agent has no relevant tools", async () => {
    let providerMessages: any[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Toolless Agent",
        prompt: "You chat with the user.",
        model: "fake-local",
        // 无任何工具：email-registration / web-research 等 tool-gated 块应为空。
        toolNames: [],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-toolless" }),
      resolveProvider: async (agentConfig) => ({
        model: agentConfig.model ?? "fake-local",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return {
            content: "ok",
            model: agentConfig.model ?? "fake-local",
            trace: messages,
          };
        },
      }),
      executeTool: async () => {
        throw new Error("no tools");
      },
    };

    await runLocalAgentTurn({
      adapter,
      agentRef: "toolless-agent",
      input: "hi",
    });

    const systemMessage = providerMessages.find((m) => m.role === "system");
    expect(systemMessage).toBeDefined();
    const systemContent = String(systemMessage?.content ?? "");
    // current-time 仍然注入（与工具无关）——前缀缓存契约下在末尾 user 头部。
    const noToolsLastUser = [...providerMessages].reverse().find((m) => m.role === "user");
    expect(String(noToolsLastUser?.content)).toContain("--- 当前时间 ---");
    // tool-gated guidance 块未被触发，不注入空内容。
    expect(systemContent).not.toContain("--- 邮箱验证码注册流程 ---");
    expect(systemContent).not.toContain("不要用 execShell 调 curl/grep/sed");
  });

  test("injects ask_user interaction guidance only when the agent exposes ask_user", async () => {
    let providerMessages: any[] = [];
    const runTurn = async (toolNames: string[]) => {
      providerMessages = [];
      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Ask Agent",
          prompt: "You help the user.",
          model: "fake-local",
          toolNames,
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-ask" }),
        resolveProvider: async (agentConfig) => ({
          model: agentConfig.model ?? "fake-local",
          complete: async (messages) => {
            providerMessages = messages as any[];
            return { content: "ok", model: agentConfig.model ?? "fake-local", trace: messages };
          },
        }),
        executeTool: async () => {
          throw new Error("no tools run on text-only turn");
        },
      };
      await runLocalAgentTurn({ adapter, agentRef: "ask-agent", input: "hi" });
      const system = providerMessages.find((m) => m.role === "system");
      return String(system?.content ?? "");
    };

    // 暴露 ask_user → 注入交互说明。
    const withAsk = await runTurn(["ask_user", "readFile"]);
    expect(withAsk).toContain("--- 交互说明 ---");
    expect(withAsk).toContain("何时调用 ask_user");
    // 未暴露 ask_user → 不注入。
    const withoutAsk = await runTurn(["readFile"]);
    expect(withoutAsk).not.toContain("--- 交互说明 ---");
  });

  test("tool projection produces byte-for-byte expected outputs using shared toolOutputPolicy", () => {
    // T3: with the fresh budget (32_000), a 10_020-char readFile result is no
    // longer clipped to the readFile profile (4800). The body is preserved
    // byte-for-byte and only the metadata projection suffix is appended.
    const readFileOutput = "LINE_START\n" + "A".repeat(10000) + "\nLINE_END";
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        prompt: "Read file",
        model: "fake-local",
        toolNames: ["readFile"],
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-proj" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          if (messages.some((m) => m.role === "tool")) {
            const toolMsg = messages.find((m) => m.role === "tool");
            return {
              content: `tool content length: ${(toolMsg?.content as string).length}`,
              model: "fake-local",
              trace: messages,
            };
          }
          return {
            content: "",
            model: "fake-local",
            tool_calls: [{
              id: "call-rf",
              type: "function",
              function: { name: "readFile", arguments: JSON.stringify({ path: "test.txt" }) },
            }],
            trace: messages,
          };
        },
      }),
      executeTool: async () => ({
        content: readFileOutput,
        metadata: { path: "test.txt", totalBytes: 10019 },
      }),
    };

    return runLocalAgentTurn({
      adapter,
      agentRef: "rf-agent",
      input: "read it",
    }).then((result) => {
      // Body preserved (not clipped to 4800); only the metadata projection
      // suffix is appended on top of the full 10_020-char body.
      expect(result.content).toContain("tool content length: 1");
      // The projected length must exceed the old 4800-char profile bound,
      // proving the fresh budget is in effect, and stay under the fresh cap.
      const reportedLength = Number(result.content.replace("tool content length: ", ""));
      expect(reportedLength).toBeGreaterThan(4800);
      expect(reportedLength).toBeLessThanOrEqual(FRESH_TOOL_OUTPUT_MAX_CHARS);
    });
  });
});

const emptyTurn = {
  hasToolCalls: false,
  hasVisibleOutput: false,
  repairUsed: true,
};

describe("local turn usage accounting", () => {
  test("persists every provider call while keeping context usage as the last snapshot", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let calls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "gpt-5.5",
        provider: "openai",
        apiSource: "platform",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-usage-loop" };
      },
      resolveProvider: async () => ({
        model: "gpt-5.5",
        complete: async () => {
          calls += 1;
          if (calls === 1) {
            return {
              content: "",
              model: "gpt-5.5",
              provider: "openai",
              usage: {
                input_tokens: 100,
                output_tokens: 10,
                server_billed: true,
                provider_call_id: "call-1",
              },
              tool_calls: [{
                id: "tool-1",
                type: "function",
                function: { name: "execShell", arguments: "{}" },
              }],
            } as any;
          }
          return {
            content: "done",
            model: "gpt-5.5",
            provider: "openai",
            usage: {
              input_tokens: 140,
              output_tokens: 20,
              server_billed: true,
              provider_call_id: "call-2",
            },
          };
        },
      }),
      executeTool: async () => ({ content: "ok" }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "agent-user-1-platform",
      input: "run",
    });

    expect(result.usage).toMatchObject({ input_tokens: 140, output_tokens: 20 });
    expect(savedTurns[0]?.result.usage).toMatchObject({
      input_tokens: 140,
      output_tokens: 20,
    });
    expect(savedTurns[0]?.accountingUsage).toMatchObject({
      input_tokens: 240,
      output_tokens: 30,
    });
    expect(savedTurns[0]?.usageRecords?.map((item) => item.usage.provider_call_id)).toEqual([
      "call-1",
      "call-2",
    ]);
    expect(savedTurns[0]?.billingConfig).toMatchObject({
      apiSource: "platform",
      provider: "openai",
      model: "gpt-5.5",
    });
  });

  test("two consecutive LLM calls (prompt 1000 -> 1500) snapshots last usage (1500) instead of summing (2500) while accumulating cost across usageRecords", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let calls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "deepseek-v4-flash",
        provider: "nolo",
        apiSource: "platform",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-multi-call-usage" };
      },
      resolveProvider: async () => ({
        model: "deepseek-v4-flash",
        complete: async () => {
          calls += 1;
          if (calls === 1) {
            return {
              content: "",
              model: "deepseek-v4-flash",
              provider: "nolo",
              usage: {
                input_tokens: 1000,
                output_tokens: 100,
                provider_call_id: "call-step-1",
              },
              tool_calls: [{
                id: "tool-step-1",
                type: "function",
                function: { name: "execShell", arguments: "{}" },
              }],
            } as any;
          }
          return {
            content: "done with multi-call turn",
            model: "deepseek-v4-flash",
            provider: "nolo",
            usage: {
              input_tokens: 1500,
              output_tokens: 200,
              provider_call_id: "call-step-2",
            },
          };
        },
      }),
      executeTool: async () => ({ content: "step 1 ok" }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "agent-user-multi-call",
      input: "execute sequence",
    });

    // 1. Snapshot assertions: run level usage MUST be the last call (1500, 200), NOT sum (2500, 300)
    expect(result.usage).toEqual({
      input_tokens: 1500,
      output_tokens: 200,
      provider_call_id: "call-step-2",
    });
    expect(savedTurns[0]?.result.usage).toEqual({
      input_tokens: 1500,
      output_tokens: 200,
      provider_call_id: "call-step-2",
    });

    // 2. Accounting usage preserves sum semantics
    expect(savedTurns[0]?.accountingUsage).toMatchObject({
      input_tokens: 2500,
      output_tokens: 300,
    });

    // 3. usageRecords contains per-call evidence for both calls
    expect(savedTurns[0]?.usageRecords).toHaveLength(2);
    expect(savedTurns[0]?.usageRecords?.[0]?.usage).toMatchObject({
      input_tokens: 1000,
      output_tokens: 100,
      provider_call_id: "call-step-1",
    });
    expect(savedTurns[0]?.usageRecords?.[1]?.usage).toMatchObject({
      input_tokens: 1500,
      output_tokens: 200,
      provider_call_id: "call-step-2",
    });

    // 4. Cost calculation: verify each call's cost is computed and sum matches combined cost
    const billingConfig = savedTurns[0]?.billingConfig;
    const records = savedTurns[0]?.usageRecords ?? [];
    const costs = records.map((record) => {
      const prepared = prepareTokenUsageData({
        rawUsage: record.usage,
        agentConfig: {
          ...(billingConfig ?? {}),
          model: record.model || billingConfig?.model || "deepseek-v4-flash",
          ...(record.provider ? { provider: record.provider } : {}),
        },
        userId: "user-1",
        agentId: "agent-user-multi-call",
        dialogId: "dialog-multi-call-usage",
        timestamp: Date.now(),
        entry_path: "cli-local",
      });
      return prepared.tokenData.cost;
    });

    expect(costs[0]).toBeGreaterThan(0);
    expect(costs[1]).toBeGreaterThan(0);
    const sumOfIndividualCosts = costs[0] + costs[1];

    const preparedTotal = prepareTokenUsageData({
      rawUsage: savedTurns[0]?.accountingUsage as any,
      agentConfig: {
        ...(billingConfig ?? {}),
        model: billingConfig?.model || "deepseek-v4-flash",
      },
      userId: "user-1",
      agentId: "agent-user-multi-call",
      dialogId: "dialog-multi-call-usage",
      timestamp: Date.now(),
      entry_path: "cli-local",
    });
    expect(sumOfIndividualCosts).toBeCloseTo(preparedTotal.tokenData.cost, 5);
  });

  test("out-of-band compaction summary call does not pollute context snapshot but is included in accountingUsage and billing usageRecords", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const history: AgentRuntimeChatMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "长对话历史记录内容测试。".repeat(3000),
    }));

    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-compact-model",
        prompt: "system prompt",
      }),
      loadDialogHistory: async () => history,
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-compact-usage" };
      },
      loadDialogSummary: async () => null,
      saveDialogSummary: async () => {},
      resolveProvider: async () => ({
        model: "fake-compact-model",
        complete: async (messages) => {
          const isCompactionCall = messages.some((m) =>
            typeof m.content === "string" && (m.content.includes("对话上下文压缩器") || m.content.includes("精炼记忆要点")),
          );
          if (isCompactionCall) {
            return {
              content: "关键事实档案\n- 已压缩要点",
              model: "fake-compact-model",
              usage: {
                input_tokens: 3000,
                output_tokens: 200,
                provider_call_id: "call-compaction-summary",
              },
            };
          }
          return {
            content: "主循环回复",
            model: "fake-compact-model",
            usage: {
              input_tokens: 1200,
              output_tokens: 50,
              provider_call_id: "call-main-loop",
            },
          };
        },
      }),
      executeTool: async () => ({ content: "ok" }),
    };

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "agent-compact-test",
      input: "new user turn",
      continueDialogId: "dialog-compact-usage",
    });

    // 1. Snapshot: run usage must be the main loop call (1200), NOT polluted by compaction (3000)
    expect(result.usage).toEqual({
      input_tokens: 1200,
      output_tokens: 50,
      provider_call_id: "call-main-loop",
    });
    expect(savedTurns[0]?.result.usage).toEqual({
      input_tokens: 1200,
      output_tokens: 50,
      provider_call_id: "call-main-loop",
    });

    // 2. Accounting: accountingUsage sums both main loop and out-of-band compaction (1200 + 3000 = 4200)
    expect(savedTurns[0]?.accountingUsage).toMatchObject({
      input_tokens: 4200,
      output_tokens: 250,
    });

    // 3. usageRecords: includes both compaction summary and main loop calls
    expect(savedTurns[0]?.usageRecords).toHaveLength(2);
    expect(savedTurns[0]?.usageRecords?.[0]?.usage).toMatchObject({
      input_tokens: 3000,
      output_tokens: 200,
      provider_call_id: "call-compaction-summary",
    });
    expect(savedTurns[0]?.usageRecords?.[1]?.usage).toMatchObject({
      input_tokens: 1200,
      output_tokens: 50,
      provider_call_id: "call-main-loop",
    });
  });
});

describe("compaction observation event (localLoop → onLoopEvent)", () => {
  const oversizedHistory: AgentRuntimeChatMessage[] = Array.from(
    { length: 20 },
    (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "长对话历史记录内容测试。".repeat(3000),
    }),
  );

  function makeAdapter(overrides?: {
    loadDialogSummary?: AgentRuntimeHostAdapter["loadDialogSummary"];
  }): AgentRuntimeHostAdapter {
    return {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        model: "fake-compact-model",
        prompt: "system prompt",
      }),
      loadDialogHistory: async () => oversizedHistory,
      saveTurn: async () => ({ dialogId: "dialog-compact-ev" }),
      loadDialogSummary: overrides?.loadDialogSummary,
      saveDialogSummary: async () => {},
      resolveProvider: async () => ({
        model: "fake-compact-model",
        complete: async (messages) => {
          const isCompactionCall = messages.some(
            (m) =>
              typeof m.content === "string" &&
              m.content.includes("对话上下文压缩器"),
          );
          if (isCompactionCall) {
            return { content: "关键事实档案\n- 已压缩要点", model: "fake" };
          }
          return { content: "主循环回复", model: "fake" };
        },
      }),
      executeTool: async () => ({ content: "ok" }),
    };
  }

  test("summary path: emits one compaction event with summaryGenerated=true", async () => {
    const loopEvents: any[] = [];
    const result = await runLocalAgentTurn({
      adapter: makeAdapter({ loadDialogSummary: async () => null }),
      agentRef: "agent-compact-test",
      input: "new user turn",
      continueDialogId: "dialog-compact-ev",
      onLoopEvent: (event) => loopEvents.push(event),
    });
    expect(result.content).toBe("主循环回复");
    const compactions = loopEvents.filter((e) => e.kind === "compaction");
    expect(compactions.length).toBe(1);
    expect(compactions[0]?.reason).toBe("context_budget");
    expect(compactions[0]?.summaryGenerated).toBe(true);
    expect(compactions[0]?.compressed).toBe(true);
    expect(compactions[0]?.beforeTokens).toBeGreaterThan(0);
    expect(compactions[0]?.afterTokens).toBeGreaterThan(0);
  });

  test("under threshold: no compaction event emitted", async () => {
    const loopEvents: any[] = [];
    const smallHistory: AgentRuntimeChatMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    const adapter: AgentRuntimeHostAdapter = {
      ...makeAdapter({ loadDialogSummary: async () => null }),
      loadDialogHistory: async () => smallHistory,
    };
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "agent-compact-test",
      input: "new user turn",
      continueDialogId: "dialog-compact-ev",
      onLoopEvent: (event) => loopEvents.push(event),
    });
    expect(result.content).toBe("主循环回复");
    expect(loopEvents.filter((e) => e.kind === "compaction").length).toBe(0);
  });
});

describe("resolveEmptyAssistantOutcome", () => {
  test("visible output or tool calls short-circuit to ok", () => {
    // 正常收尾（finish_reason=stop）：零行为变化
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, hasVisibleOutput: true, finishReason: "stop" })).toEqual({
      kind: "ok",
    });
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, hasToolCalls: true })).toEqual({
      kind: "ok",
    });
    // 有可见正文但流未收尾（无 finish_reason、无收尾帧）→ 半截输出截断告警
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, hasVisibleOutput: true })).toEqual({
      kind: "ok_with_warning",
      reason: "stream_truncated",
    });
  });

  test("repairs once before falling back", () => {
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, repairUsed: false })).toEqual({
      kind: "repair",
    });
  });

  test("length truncation wins over repair", () => {
    expect(
      resolveEmptyAssistantOutcome({ ...emptyTurn, repairUsed: false, finishReason: "length" }),
    ).toEqual({ kind: "fallback", reason: "length_truncated" });
  });

  test("no finish_reason and no terminator still reads as a cut stream", () => {
    expect(resolveEmptyAssistantOutcome(emptyTurn)).toEqual({
      kind: "fallback",
      reason: "stream_truncated",
    });
  });

  // OpenCode Go's gpt-5.6-luna never sends finish_reason and never sends
  // [DONE]; it does send a closing usage frame. Without that evidence an empty
  // turn there was always misreported as an interrupted stream.
  test("a completed stream reads as empty_completion even without finish_reason", () => {
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, streamComplete: true })).toEqual({
      kind: "fallback",
      reason: "empty_completion",
    });
  });

  test("a finish_reason alone is still enough", () => {
    expect(resolveEmptyAssistantOutcome({ ...emptyTurn, finishReason: "stop" })).toEqual({
      kind: "fallback",
      reason: "empty_completion",
    });
  });
});

test("cross-turn projection keeps read-family results at the ledger retention cap", () => {
  // The read ledgers treat persisted deliveries <= 4800 chars as "still in
  // context"; the cross-turn projection must keep the same bytes intact or
  // the dedup notice would claim context the model no longer has.
  const readContent = "R".repeat(4800);
  const projected = summarizeHistoricalToolContent(readContent, "readFile");
  const text = typeof projected === "string" ? projected : JSON.stringify(projected);
  expect(text.length).toBeGreaterThanOrEqual(4800);
  expect(text.startsWith("R".repeat(200))).toBe(true);

  // Unprofiled tools keep the flat historical budget.
  const shellProjected = summarizeHistoricalToolContent("S".repeat(4000), "execShell");
  const shellText = typeof shellProjected === "string" ? shellProjected : JSON.stringify(shellProjected);
  expect(shellText.length).toBeLessThan(4000);
});

test("cross-turn projection of unchanged tool output is byte-identical across turns", () => {
  // Prefix-cache invariant. Every provider call re-projects the whole history,
  // so projecting the same historical tool result twice MUST produce the same
  // bytes. When the spill filename carried a Date.now() segment, the injected
  // spillFile= note changed every turn, moving the prefix and forcing a full
  // re-read of a 200k+ token context on every single turn.
  const oversized = "X".repeat(200_000);

  const firstTurn = summarizeHistoricalToolContent(oversized, "execShell");
  // Cross a millisecond boundary so a timestamped spill path cannot pass by
  // landing in the same millisecond as the previous call.
  const spinUntil = Date.now() + 2;
  while (Date.now() < spinUntil) {
    /* busy-wait */
  }
  const secondTurn = summarizeHistoricalToolContent(oversized, "execShell");

  expect(secondTurn).toBe(firstTurn);

  const text = typeof firstTurn === "string" ? firstTurn : JSON.stringify(firstTurn);
  expect(text).toContain("spillFile=");
});

describe("empty assistant fallback marker (runLocalAgentTurn)", () => {
  function makeTruncAdapter(opts: { callCount: number; finishReason?: string }) {
    let calls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Local Agent",
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-trunc" }),
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          calls += 1;
          if (calls <= opts.callCount) {
            // 空正文且 finish_reason 指向截断 → resolveEmptyAssistantOutcome 直接 fallback
            return {
              content: "",
              finish_reason: opts.finishReason ?? "length",
              model: "fake-local",
              trace: messages,
            } as unknown as AgentRuntimeChatMessage & {
              content: string;
              finish_reason?: string;
            } as any;
          }
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };
    return adapter;
  }

  test("sets emptyAssistantFallbackReason when the provider is length-truncated", async () => {
    const adapter = makeTruncAdapter({ callCount: 1, finishReason: "length" });
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "do something huge",
    });
    // 兜底文案收尾、不抛错（exitCode 语义由上层决定），但标记要如实带上成因。
    expect(result.emptyAssistantFallbackReason).toBe("length_truncated");
    expect(result.content).toContain("截断");
  });

  test("does NOT set the marker on a normal completed turn", async () => {
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Local Agent",
        prompt: "base prompt",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-normal" }),
      resolveProvider: async () => ({
        model: "fake-local",
        // 正常流必须带 finish_reason（任务语义：finishReason="stop" 的流
        // 零行为变化）；缺 finish_reason 的输出会被判为半截输出截断。
        complete: async () => ({ content: "all good", model: "fake-local", finish_reason: "stop" }),
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    };
    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "frontend",
      input: "hello",
    });
    expect(result.emptyAssistantFallbackReason).toBeUndefined();
    expect(result.content).toBe("all good");
  });

  test("stream_truncated after reasoning-only repair persists reasoning tail with stream marker (K3 incident shape)", async () => {
    const origWarn = console.warn;
    const warns: string[] = [];
    console.warn = (...args: any[]) => {
      warns.push(args.join(" "));
    };
    try {
      const savedTurns: AgentRuntimeSaveTurnInput[] = [];
      let completeCalls = 0;
      // 事故原型（dialog-1c2b14b968，平台托管 kimi-k3）：长思考（reasoning-only，
      // 无正文无 tool_calls）+ 无 finish_reason 的断流。repair 一次仍断流 → fallback。
      const reasoningSample = "窗台场景 / 书签页签 / 信纸邮票 / 字体选型，完整方案已想清楚。";
      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence"],
        loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
        loadDialogHistory: async () => [],
        saveTurn: async (input) => {
          savedTurns.push(input);
          return { dialogId: "dialog-stream-trunc" };
        },
        resolveProvider: async () => ({
          model: "m",
          complete: async () => {
            completeCalls += 1;
            return {
              content: "",
              reasoning_content: reasoningSample,
              // 无 finish_reason、无收尾帧 → stream_truncated
              finish_reason: undefined,
              stream_complete: false,
              model: "m",
            } as any;
          },
        }),
        executeTool: async () => { throw new Error("no tools"); },
      };

      const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "design it" });

      // repair 一次后仍断流 → fallback，两轮调用
      expect(completeCalls).toBe(2);
      expect(result.content).toBe(STREAM_TRUNCATED_FALLBACK_MESSAGE);
      expect(result.emptyAssistantFallbackReason).toBe("stream_truncated");
      expect(result.emptyAssistantRepairUsed).toBe(true);

      // reasoning 尾部落盘：run 日志带 stream 专属 marker
      const matchingWarn = warns.find((w) => w.includes(STREAM_TRUNCATED_REASONING_MARKER));
      expect(matchingWarn).toBeDefined();
      expect(matchingWarn).toContain(reasoningSample);
      expect(matchingWarn).not.toContain(LENGTH_TRUNCATED_REASONING_MARKER);

      // reasoning 尾部落盘：saveTurn 的最终 assistant 消息带 thinkContent
      // （web 思考折叠只读 thinkContent），完整思维链仍在 reasoning_content。
      const finalAssistant = savedTurns[0]?.messages.filter((m) => m.role === "assistant").at(-1);
      expect(finalAssistant?.reasoning_content).toBe(reasoningSample);
      expect(finalAssistant?.thinkContent).toBe(
        `[nolo] ${STREAM_TRUNCATED_REASONING_MARKER}\n${reasoningSample}`,
      );
    } finally {
      console.warn = origWarn;
    }
  });

  test("partial visible output with no finish_reason is warned, kept, and marked (no silent success)", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const partialText = "function fixWidget() {\n  // 半截实现……";
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-partial-trunc" };
      },
      resolveProvider: async () => ({
        model: "m",
        complete: async () => ({
          // 半截正文 + 流未收尾（无 finish_reason、无收尾帧）
          content: partialText,
          finish_reason: undefined,
          stream_complete: false,
          model: "m",
        } as any),
      }),
      executeTool: async () => {
        throw new Error("tools should not run on a cut stream");
      },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "write code" });

    // 部分输出保留原文，不替换为兜底文案、不重试
    expect(result.content).toBe(partialText);
    expect(result.content).not.toBe(STREAM_TRUNCATED_FALLBACK_MESSAGE);
    // 截断标记可观测（编排者/子 run 结算按截断语义接力）
    expect(result.emptyAssistantFallbackReason).toBe("stream_truncated");
    expect(result.errorMessage).toBe(STREAM_TRUNCATED_FALLBACK_MESSAGE);

    const finalAssistant = savedTurns[0]?.messages.filter((m) => m.role === "assistant").at(-1);
    expect(finalAssistant?.content).toBe(partialText);
  });

  test("healthy stop stream with visible output keeps ok semantics and persists no thinkContent", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-healthy" };
      },
      resolveProvider: async () => ({
        model: "m",
        complete: async () => ({
          content: "完整正文",
          finish_reason: "stop",
          model: "m",
        } as any),
      }),
      executeTool: async () => { throw new Error("no tools"); },
    };

    const result = await runLocalAgentTurn({ adapter, agentRef: "a", input: "hello" });

    expect(result.emptyAssistantFallbackReason).toBeUndefined();
    expect(result.emptyAssistantRepairUsed).toBeUndefined();
    expect(result.content).toBe("完整正文");
    const finalAssistant = savedTurns[0]?.messages.filter((m) => m.role === "assistant").at(-1);
    expect(finalAssistant?.thinkContent).toBeUndefined();
  });

  describe("progress guard & repetition circuit breaker in localLoop", () => {
    test("does NOT trip guard on legitimate polling when assistant narrative is identical but tool results change (12 rounds)", async () => {
      let callCount = 0;

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Polling Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["execShell"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-polling-ok" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            if (callCount <= 12) {
              // 12 rounds of identical assistant narration and identical tool call
              return {
                content: "Waiting for long-running build process, let me check status again...",
                model: "fake-local",
                tool_calls: [
                  {
                    id: `call-poll-${callCount}`,
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: '{"command":"check-build-progress"}',
                    },
                  },
                ],
              };
            }
            // Round 13: build finishes
            return {
              content: "Build completed successfully after 12 checks.",
              model: "fake-local",
              finish_reason: "stop", // 健康收尾：否则缺 finish_reason 会被判为半截输出截断
            };
          },
        }),
        executeTool: async () => ({
          // Tool results change on every single check (progress advances)
          content: `build progress: ${callCount * 8}% done`,
          metadata: { progress: callCount * 8 },
        }),
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "monitor build",
        progressGuardConfig: {
          maxConsecutiveIdenticalRounds: 5,
          maxConsecutiveStagnantToolRounds: 8,
        },
      });

      // 12 poll rounds + 1 final round = 13 rounds completed cleanly
      expect(callCount).toBe(13);
      expect(result.emptyAssistantFallbackReason).toBeUndefined();
      expect(result.content).toBe("Build completed successfully after 12 checks.");
      expect(result.dialogId).toBe("dialog-polling-ok");
    });

    test("trips circuit breaker on repetition loop and persists dialog evidence", async () => {
      let callCount = 0;
      let savedTurnInput: AgentRuntimeSaveTurnInput | null = null;
      const loopEvents: any[] = [];

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Loop Guard Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["execShell"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async (input) => {
          savedTurnInput = input;
          return { dialogId: "dialog-stalled-repetition" };
        },
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            // Model keeps returning identical content and identical tool call
            return {
              content: "I am thinking about running git status...",
              model: "fake-local",
              tool_calls: [
                {
                  id: `call-repeat-${callCount}`,
                  type: "function",
                  function: {
                    name: "execShell",
                    arguments: '{"command":"git status"}',
                  },
                },
              ],
            };
          },
        }),
        executeTool: async () => ({
          content: "On branch alpha\nnothing to commit",
        }),
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "start task",
        progressGuardConfig: {
          maxConsecutiveIdenticalRounds: 4,
        },
        onLoopEvent: (event) => loopEvents.push(event),
      });

      // Exactly 4 rounds executed before tripping on round 4
      expect(callCount).toBe(4);
      expect(result.emptyAssistantFallbackReason).toBe("repetition_loop");
      expect(result.content).toContain("死循环");
      expect(result.dialogId).toBe("dialog-stalled-repetition");

      // Verify that loop-stalled event was emitted
      const stallEvent = loopEvents.find((e) => e.kind === "loop-stalled");
      expect(stallEvent).toBeDefined();
      expect(stallEvent?.reason).toBe("repetition_loop");

      // Verify dialog persistence kept the evidence
      expect(savedTurnInput).not.toBeNull();
      expect(savedTurnInput!.messages.length).toBeGreaterThan(1);
    });

    test("trips circuit breaker on stagnant tool calls with unchanged results", async () => {
      let callCount = 0;
      let savedTurnInput: AgentRuntimeSaveTurnInput | null = null;
      const loopEvents: any[] = [];

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Loop Guard Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["readFile"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async (input) => {
          savedTurnInput = input;
          return { dialogId: "dialog-stalled-tools" };
        },
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            // Content varies slightly, but tool calls are identical
            return {
              content: `Round ${callCount}: let me read again`,
              model: "fake-local",
              tool_calls: [
                {
                  id: `call-read-${callCount}`,
                  type: "function",
                  function: {
                    name: "readFile",
                    arguments: '{"path":"unchanged.txt"}',
                  },
                },
              ],
            };
          },
        }),
        executeTool: async () => ({
          content: "file content never changes",
          metadata: { size: 26 },
        }),
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "read repeatedly",
        progressGuardConfig: {
          maxConsecutiveStagnantToolRounds: 3,
        },
        onLoopEvent: (event) => loopEvents.push(event),
      });

      // 3 rounds of identical tool call + identical result -> trips
      expect(callCount).toBe(3);
      expect(result.emptyAssistantFallbackReason).toBe("stagnant_tool_calls");
      expect(result.content).toContain("无实质进展");
      expect(result.dialogId).toBe("dialog-stalled-tools");

      const stallEvent = loopEvents.find((e) => e.kind === "loop-stalled");
      expect(stallEvent).toBeDefined();
      expect(stallEvent?.reason).toBe("stagnant_tool_calls");
    });

    test("stagnation guard still trips when tool execution time varies per round", async () => {
      // 回归防线：toolExecMs 是每次执行必然抖动的毫秒数，一旦它混进喂给
      // progressGuard 的 metadata，buildToolResultsSignature 的指纹将永不重复，
      // repetition_loop / stagnant_tool_calls 两条熔断会对**所有**死循环场景
      // 静默失效。上面那个用例抓不到：mock 工具瞬时返回，每轮耗时都是 0ms，
      // 签名反而是稳定的。这里强制让每轮耗时不同，把真实生产条件复现出来。
      let callCount = 0;
      let execCount = 0;
      const loopEvents: any[] = [];

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Loop Guard Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["readFile"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-stalled-jitter" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            return {
              content: `Round ${callCount}: let me read again`,
              model: "fake-local",
              tool_calls: [
                {
                  id: `call-read-${callCount}`,
                  type: "function",
                  function: {
                    name: "readFile",
                    arguments: '{"path":"unchanged.txt"}',
                  },
                },
              ],
            };
          },
        }),
        executeTool: async () => {
          // 每轮真实耗时递增，保证 toolExecMs 逐轮不同。
          execCount += 1;
          await new Promise((resolve) => setTimeout(resolve, execCount * 12));
          return { content: "file content never changes", metadata: { size: 26 } };
        },
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "read repeatedly",
        progressGuardConfig: {
          maxConsecutiveStagnantToolRounds: 3,
        },
        onLoopEvent: (event) => loopEvents.push(event),
      });

      expect(callCount).toBe(3);
      expect(result.emptyAssistantFallbackReason).toBe("stagnant_tool_calls");
      const stallEvent = loopEvents.find((e) => e.kind === "loop-stalled");
      expect(stallEvent?.reason).toBe("stagnant_tool_calls");
    });

    test("does NOT trip guard on legitimate multi-round coding task with 15 rounds of varying work", async () => {
      let callCount = 0;
      let executedToolPaths: string[] = [];

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Legit Multi Round Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["readFile", "editFile", "execShell"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-legit-long-task" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            if (callCount <= 12) {
              // Alternating legitimate steps: reading files, editing, running tests
              const stepType = callCount % 3;
              if (stepType === 1) {
                return {
                  content: `Inspecting step ${callCount}`,
                  model: "fake-local",
                  tool_calls: [
                    {
                      id: `call-${callCount}`,
                      type: "function",
                      function: {
                        name: "readFile",
                        arguments: JSON.stringify({ path: `src/module_${callCount}.ts` }),
                      },
                    },
                  ],
                };
              }
              if (stepType === 2) {
                return {
                  content: `Refactoring step ${callCount}`,
                  model: "fake-local",
                  tool_calls: [
                    {
                      id: `call-${callCount}`,
                      type: "function",
                      function: {
                        name: "editFile",
                        arguments: JSON.stringify({
                          path: `src/module_${callCount - 1}.ts`,
                          oldText: "foo",
                          newText: "bar",
                        }),
                      },
                    },
                  ],
                };
              }
              return {
                content: `Verifying step ${callCount}`,
                model: "fake-local",
                tool_calls: [
                  {
                    id: `call-${callCount}`,
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: JSON.stringify({
                        command: `bun test src/module_${callCount - 2}.test.ts`,
                      }),
                    },
                  },
                ],
              };
            }
            // Final conclusion round
            return {
              content: "All 12 refactoring steps completed successfully and verified.",
              model: "fake-local",
              finish_reason: "stop", // 健康收尾
            };
          },
        }),
        executeTool: async (toolCall) => {
          const parsed = JSON.parse(toolCall.arguments);
          if (parsed.path) executedToolPaths.push(parsed.path);
          return {
            content: `Execution output for ${toolCall.name} at round ${callCount}`,
            metadata: { round: callCount },
          };
        },
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "run full refactoring suite",
        // Using default thresholds (5 identical, 8 stagnant)
      });

      // Must complete normally without being killed
      expect(callCount).toBe(13);
      expect(result.emptyAssistantFallbackReason).toBeUndefined();
      expect(result.content).toBe(
        "All 12 refactoring steps completed successfully and verified.",
      );
      expect(result.dialogId).toBe("dialog-legit-long-task");
      expect(executedToolPaths.length).toBe(8);
    });

    test("allows legitimate short polling/retries (e.g. 3 times) before changing strategy without false positive", async () => {
      let callCount = 0;

      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence", "local-tools"],
        loadAgentConfig: async (agentRef) => ({
          key: agentRef,
          name: "Retry Agent",
          prompt: "test",
          model: "fake-local",
          toolNames: ["execShell"],
        }),
        loadDialogHistory: async () => [],
        saveTurn: async () => ({ dialogId: "dialog-retry-ok" }),
        resolveProvider: async () => ({
          model: "fake-local",
          complete: async () => {
            callCount += 1;
            // 3 identical poll requests
            if (callCount <= 3) {
              return {
                content: "Polling build status...",
                model: "fake-local",
                tool_calls: [
                  {
                    id: `call-poll-${callCount}`,
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: '{"command":"check-build-status"}',
                    },
                  },
                ],
              };
            }
            // Round 4: strategy changes
            if (callCount === 4) {
              return {
                content: "Build is taking too long, canceling build process.",
                model: "fake-local",
                tool_calls: [
                  {
                    id: "call-cancel",
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: '{"command":"cancel-build"}',
                    },
                  },
                ],
              };
            }
            // Round 5: finished
            return {
              content: "Build was canceled cleanly.",
              model: "fake-local",
              finish_reason: "stop", // 健康收尾：否则缺 finish_reason 会被判为半截输出截断
            };
          },
        }),
        executeTool: async () => ({
          content: "status: running",
        }),
      };

      const result = await runLocalAgentTurn({
        adapter,
        agentRef: "frontend",
        input: "watch build",
        // Default threshold is 5 for identical and 8 for stagnant
      });

      expect(callCount).toBe(5);
      expect(result.emptyAssistantFallbackReason).toBeUndefined();
      expect(result.content).toBe("Build was canceled cleanly.");
    });
  });
});

describe("session file-write gate (onActionGate)", () => {
  // 门控集成测试：fake adapter + onActionGate stub。
  // 保密/确认契约：normal（交互宿主）的会话首次 writeFile 必须先过门；
  // gate completed = 会话级放行（二次写静默）；cancelled/undefined =
  // fail-closed（executeTool 不执行，且 undefined 不得意外放行）。
  function buildGateHarness(
    onActionGate: (gate: unknown) => Promise<unknown> | unknown,
    options?: { fileWriteGateEnabled?: boolean },
  ) {
    let executeToolCalls = 0;
    let gateCalls = 0;
    let calls = 0;
    const adapter: any = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence", "local-tools"],
      loadAgentConfig: async (agentRef: string) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async () => ({ dialogId: "dialog-gate" }),
      resolveProvider: async () => ({
        model: "m",
        complete: async () => {
          // 前两轮各返回一次 writeFile tool-call，第三轮收尾
          calls += 1;
          if (calls > 2) return { content: "final answer", model: "m" };
          return { content: "calling write", model: "m", tool_calls: [
            { id: `call-${calls}`, type: "function", function: { name: "writeFile", arguments: '{"path":"a.ts","content":"x"}' } },
          ] };
        },
      }),
      executeTool: async () => {
        executeToolCalls += 1;
        return { ok: true };
      },
    };
    const runTurn = (input: string) =>
      runLocalAgentTurn({
        adapter,
        agentRef: "a",
        input,
        ...(options?.fileWriteGateEnabled !== undefined
          ? { fileWriteGateEnabled: options.fileWriteGateEnabled }
          : {}),
        onActionGate: (gate: unknown) => {
          gateCalls += 1;
          return onActionGate(gate);
        },
      } as any);
    return { adapter, run: runTurn, callsOf: () => executeToolCalls, gatesOf: () => gateCalls };
  }

  test("gate completed → write executes and the session stays approved", async () => {
    const h = buildGateHarness(() => ({
      content: "approved",
      metadata: { actionGateResult: { status: "completed" } },
    }));
    await h.run("write it");
    // 两轮写都执行，但门只问一次（会话级放行的直接证明）
    expect(h.callsOf()).toBe(2);
    expect(h.gatesOf()).toBe(1);
  });

  test("gate cancelled → write rejected and the next write asks again", async () => {
    const h = buildGateHarness(() => ({
      content: "denied",
      metadata: { actionGateResult: { status: "cancelled" } },
    }));
    await h.run("write it");
    expect(h.callsOf()).toBe(0);
    expect(h.gatesOf()).toBe(2);
  });

  test("gate returning undefined → fail-closed (write rejected, tool not executed)", async () => {
    const h = buildGateHarness(() => undefined);
    await h.run("write it");
    expect(h.callsOf()).toBe(0);
    expect(h.gatesOf()).toBe(2);
  });

  test("a fresh adapter session asks again (session approval is per-adapter)", async () => {
    const h1 = buildGateHarness(() => ({
      metadata: { actionGateResult: { status: "completed" } },
    }));
    await h1.run("write it");
    expect(h1.callsOf()).toBe(2);
    const h2 = buildGateHarness(() => ({
      metadata: { actionGateResult: { status: "completed" } },
    }));
    await h2.run("write it");
    // 新 adapter = 新会话：重新询问
    expect(h2.gatesOf()).toBe(1);
    expect(h2.callsOf()).toBe(2);
  });

  // NOLO_CLI_WRITE_GATE=off 逃生口：CLI 层解析后经 fileWriteGateEnabled 向下
  // 传递（agent-runtime 本身不读 process.env，见 fileWriteGateEnabled 的字段
  // 文档）。fail-safe 契约：未显式传 false，门必须保持开启——不管是完全不传
  // 这个字段（默认路径），还是显式传 true。
  test("fileWriteGateEnabled: false skips the gate entirely (writes execute directly)", async () => {
    const h = buildGateHarness(() => {
      throw new Error("gate must not be invoked when fileWriteGateEnabled is false");
    }, { fileWriteGateEnabled: false });
    await h.run("write it");
    expect(h.gatesOf()).toBe(0);
    expect(h.callsOf()).toBe(2);
  });

  test("fileWriteGateEnabled: true keeps the gate active (same as the default)", async () => {
    const h = buildGateHarness(() => ({
      metadata: { actionGateResult: { status: "completed" } },
    }), { fileWriteGateEnabled: true });
    await h.run("write it");
    expect(h.gatesOf()).toBe(1);
    expect(h.callsOf()).toBe(2);
  });

  test("omitting fileWriteGateEnabled (unset) keeps the gate active — fail-safe default", async () => {
    const h = buildGateHarness(() => ({
      metadata: { actionGateResult: { status: "completed" } },
    }));
    await h.run("write it");
    expect(h.gatesOf()).toBe(1);
    expect(h.callsOf()).toBe(2);
  });
});

// ── 回合内注入（drainInjections）───────────────────────────────────────────
//
// TUI 的后台 run 终态唤醒在当前 turn 正跑时不再进 chat 队列，而是直投正在
// 执行的 loop。这里锁住 localLoop 侧的两个注入点契约。
describe("runLocalAgentTurn drainInjections (回合内注入)", () => {
  /**
   * 构造一个可编排的 loop：providerScript 逐轮给出返回值，requests 记录每轮
   * 实际发给 provider 的请求消息。
   */
  function buildInjectionHarness(options: {
    providerScript: Array<{ content: string; tool_calls?: any[] }>;
    injections: string[][];
    /**
     * completion-boundary seam：在第 roundIndex 轮 provider return 前的
     * 同一同步帧把 child completion 投进动态收件箱（race 构造用，无 sleep）。
     * 事件循环上这是「已拿到 no-tool 结果、准备结束」时刻能构造的最晚
     * 确定性投递点——再晚一格就属于 turn 结束后的新 turn 了。
     */
    injectBeforeReturn?: (roundIndex: number, dynamicInbox: string[]) => void;
    /**
     * seal 刀：透传给 runLocalAgentTurn 的 onBeforeFinalInjectionDrain。
     * 在「provider #1 已 resolve、no-tool result 已确定、final drain 之前」
     * 的缝隙里执行——测试在此断言 inbox 仍空并投递迟到 injection。
     */
    onCompletionBoundary?: () => Promise<void> | void;
  }) {
    const requests: AgentRuntimeChatMessage[][] = [];
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const pendingInjections = [...options.injections];
    // 动态收件箱：injectBeforeReturn 在 provider return 前同帧投递的条目。
    const dynamicInbox: string[] = [];
    let round = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef: string) => ({
        key: agentRef,
        name: "Injection Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input: AgentRuntimeSaveTurnInput) => {
        savedTurns.push(input);
        return { dialogId: "dialog-injection" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages: AgentRuntimeChatMessage[]) => {
          requests.push(messages.map((m) => ({ ...m })));
          const scripted = options.providerScript[round] ??
            options.providerScript.at(-1)!;
          round += 1;
          // completion boundary：return（resolve）前的同一同步帧投递，
          // parent 恢复执行时条目必已在收件箱——无真实 sleep 的 race 构造
          //（Deferred/Ref/Queue 的 Promise 版最小等价物，投递先于 resolve）。
          options.injectBeforeReturn?.(round - 1, dynamicInbox);
          // finish_reason/stream_complete 必须给全：缺省会被空轮判定当成
          // stream_truncated 提前收尾，测不到注入点。
          return {
            finish_reason: "stop",
            stream_complete: true,
            ...scripted,
            model: "fake-local",
          } as any;
        },
      }),
      executeTool: async (call: any) => ({
        content: `tool ${call.name} ok`,
      }),
    } as any;

    const run = () =>
      runLocalAgentTurn({
        adapter,
        agentRef: "injector",
        input: "original user input",
        // 每次 drain 取走一批注入（模拟收件箱）：预编排队列批 + race seam
        // 同帧投递的动态批。现有测试不用动态批，行为不变。
        drainInjections: () => {
          const queued = pendingInjections.shift() ?? [];
          return [...queued, ...dynamicInbox.splice(0)];
        },
        ...(options.onCompletionBoundary
          ? { onBeforeFinalInjectionDrain: options.onCompletionBoundary }
          : {}),
      } as any);

    return { run, requests, savedTurns, dynamicInbox };
  }

  // a) loop 进行中注入 → 下一轮 provider 请求消息里必须出现注入的 user 消息。
  test("注入在 loop 进行中到达时，下一轮 provider 调用即可见", async () => {
    const h = buildInjectionHarness({
      // 第 1 轮调工具（保证还有第 2 轮），第 2 轮正常收尾。
      providerScript: [
        {
          content: "",
          tool_calls: [
            { id: "c1", type: "function", function: { name: "noop", arguments: "{}" } },
          ],
        },
        { content: "done after seeing the injection" },
      ],
      // 第 1 轮开头无注入；第 2 轮开头注入一条。
      injections: [[], ["后台 run run-x 已到终态 done"]],
    });

    await h.run();

    expect(h.requests.length).toBeGreaterThanOrEqual(2);
    const secondRequest = h.requests[1]!;
    const injected = secondRequest.filter(
      (m) => m.role === "user" && String(m.content).includes("run-x"),
    );
    expect(injected).toHaveLength(1);
    expect(String(injected[0]!.content)).toContain("终态");
  });

  // b) 模型给出无 tool_calls 的最终响应时恰好有注入 → 不结束 turn，多跑一轮，
  //    且注入消息进入下一轮上下文。
  test("最终响应前到达的注入会让 loop 继续一轮而不是结束", async () => {
    const h = buildInjectionHarness({
      // 两轮都是「无 tool_calls 的最终响应」。若不拦截，第 1 轮就 break。
      providerScript: [
        { content: "first final answer" },
        { content: "second answer after injection" },
      ],
      // 第 1 轮开头无注入；第 1 轮收尾前 drain 到一条 → 必须继续；
      // 第 2 轮开头无注入；第 2 轮收尾前也无 → 正常结束。
      injections: [[], ["run-y 已完成，请接着处理"], [], []],
    });

    const result = await h.run();

    // 没有在第一轮结束：provider 被调用了两次。
    expect(h.requests).toHaveLength(2);
    const secondRequest = h.requests[1]!;
    // 第 1 轮的 assistant 回复 + 注入的 user 消息都进了第 2 轮上下文。
    expect(
      secondRequest.some(
        (m) => m.role === "assistant" && String(m.content) === "first final answer",
      ),
    ).toBe(true);
    expect(
      secondRequest.some(
        (m) => m.role === "user" && String(m.content).includes("run-y"),
      ),
    ).toBe(true);
    // 最终结果来自续跑的那一轮。
    expect(result.content).toBe("second answer after injection");

    // 持久化：注入的 user 消息必须随本轮 saveTurn 落盘，否则下一 turn 重建
    // 上下文时丢失。
    const saved = h.savedTurns[0]!;
    expect(
      saved.messages.some(
        (m) => m.role === "user" && String(m.content).includes("run-y"),
      ),
    ).toBe(true);
    // 不能重复追加 assistant 消息（收尾路径只应保留各轮各一条）。
    expect(
      saved.messages.filter(
        (m) => m.role === "assistant" && String(m.content) === "first final answer",
      ),
    ).toHaveLength(1);
  });

  // c) completion boundary race：no-tool 结果返回的同一同步帧，child completion
  //    恰好到达。parent 必须消费它并续跑一轮，不能提前 complete。
  //    构造：provider 在 return（resolve）前的同一帧把 child completion 投进
  //    收件箱——事件循环允许的最晚确定性投递点，无真实 sleep。
  test("completion boundary race: no-tool resolve 同帧到达的 child completion 被消费", async () => {
    let round1InjectionDelivered = false;
    const h = buildInjectionHarness({
      providerScript: [
        { content: "round 1 final answer" },
        { content: "round 2 answer after child completion" },
      ],
      injections: [],
      injectBeforeReturn: (roundIndex, dynamicInbox) => {
        if (roundIndex === 0) {
          // Round 1 已拿到 no-tool 文本、正准备 return——此刻 child run 到达
          // 终态，TUI 把 completion 直投收件箱。投递先于 resolve，顺序钉死。
          round1InjectionDelivered = true;
          dynamicInbox.push("child run run-race 已完成: 报告内容");
        }
      },
    });

    const result = await h.run();

    // race 真的发生了：Round 1 resolve 前注入已投递。
    expect(round1InjectionDelivered).toBe(true);
    // Round 1 没有提前结束：provider 被调用了两次。
    expect(h.requests).toHaveLength(2);
    const secondRequest = h.requests[1]!;
    // 注入进入真实 history/input：第 2 轮 provider 请求里，Round 1 的
    // assistant 回复之后必须紧跟注入的 user 消息（确定性位置断言，
    // 而非 findIndex 的弱存在性检查——review WARNING 修复）。
    const assistantIdx = secondRequest.map((m) => m.role).lastIndexOf("assistant");
    expect(assistantIdx).toBeGreaterThanOrEqual(0);
    expect(secondRequest[assistantIdx + 1]).toMatchObject({ role: "user" });
    expect(String(secondRequest[assistantIdx + 1]!.content)).toContain("run-race");
    expect(String(secondRequest[assistantIdx + 1]!.content)).toContain("报告内容");
    // 最终结果来自 Round 2。
    expect(result.content).toBe("round 2 answer after child completion");
    // 注入随 saveTurn 落盘（真实 history 不丢事件，下一 turn 上下文不缺块）。
    const saved = h.savedTurns[0]!;
    expect(
      saved.messages.some(
        (m) => m.role === "user" && String(m.content).includes("run-race"),
      ),
    ).toBe(true);
  });

  // e) completion-boundary race（seal）：injection 在 provider #1 已 resolve、
  //    localLoop 已拿到 no-tool result、final drain 之前才到达——比 c) 更晚的
  //    窗口。c) 的 injectBeforeReturn 只能表达「resolve 前同帧投递」；本用例借
  //    production completion-boundary 缝隙（onBeforeFinalInjectionDrain）在该
  //    同步段内精确投递，证明 parent 仍不提前结束、final drain 消费它。
  test("completion-boundary race (seal): provider resolve 之后才到达的 injection 仍被 final drain 消费", async () => {
    let provider1Returned = false;
    let boundaryReached = false;
    const h = buildInjectionHarness({
      providerScript: [
        { content: "round 1 final answer" },
        { content: "round 2 answer after late injection" },
      ],
      injections: [],
      injectBeforeReturn: (roundIndex) => {
        // 只记录 provider #1 已走到 return（不投递——本用例的 injection 在
        // resolve 之后才到，与 c) 区分）。
        if (roundIndex === 0) provider1Returned = true;
      },
      onCompletionBoundary: async () => {
        // seam 在每轮 no-tool 完成路径都触发；只处理 Round 1 的 boundary
        //（Round 2 收尾时 inbox 已空、不该再投递）。
        if (boundaryReached) return;
        // 此刻的确定性：能进到这个缝隙 = parent 的 await continuation 已恢复
        // = provider #1 promise 已 resolve、no-tool result 已在手、final drain
        // 尚未执行。此处断言时序三要素，然后才投递 injection。
        boundaryReached = true;
        expect(provider1Returned).toBe(true);
        expect(h.requests).toHaveLength(1);
        expect(h.dynamicInbox).toHaveLength(0);
        // 时序钉死后才注入 child completion。
        h.dynamicInbox.push("child run run-seal 已完成: 迟到的完成通知");
      },
    });

    const result = await h.run();

    expect(boundaryReached).toBe(true);
    // Round 1 没有提前结束：final drain 消费了迟到 injection，进入 Round 2。
    expect(h.requests).toHaveLength(2);
    const secondRequest = h.requests[1]!;
    const assistantIdx = secondRequest.map((m) => m.role).lastIndexOf("assistant");
    expect(assistantIdx).toBeGreaterThanOrEqual(0);
    // Round 2 history 明确包含 injection：assistant 之后紧跟注入的 user 消息。
    expect(secondRequest[assistantIdx + 1]).toMatchObject({ role: "user" });
    expect(String(secondRequest[assistantIdx + 1]!.content)).toContain("run-seal");
    expect(String(secondRequest[assistantIdx + 1]!.content)).toContain("迟到");
    // 最终正常结束，结果来自 Round 2。
    expect(result.content).toBe("round 2 answer after late injection");
    // 注入随 saveTurn 落盘，真实 history 完整：user → assistant(R1) → user(injection) → assistant(R2)。
    const saved = h.savedTurns[0]!;
    expect(saved.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(
      saved.messages.some(
        (m) => m.role === "user" && String(m.content).includes("run-seal"),
      ),
    ).toBe(true);
  });

  // d) baseline：收件箱机制在线（drainInjections 已提供）但整个 turn 无注入
  //    → Round 1 正常结束，provider 恰好只调用一次，不会因收件箱存在多跑一轮。
  test("baseline: 收件箱在线但无注入时 Round 1 正常结束且 provider 只调用一次", async () => {
    const h = buildInjectionHarness({
      providerScript: [{ content: "only round answer" }],
      injections: [[]],
    });

    const result = await h.run();

    expect(h.requests).toHaveLength(1);
    expect(result.content).toBe("only round answer");
    const saved = h.savedTurns[0]!;
    expect(saved.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(String(saved.messages[1]!.content)).toBe("only round answer");
  });

  // 回归：没有 drainInjections 时行为完全不变（单轮结束、消息不重复）。
  test("未提供 drainInjections 时行为不变", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    let calls = 0;
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef: string) => ({ key: agentRef, model: "fake-local" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input: AgentRuntimeSaveTurnInput) => {
        savedTurns.push(input);
        return { dialogId: "dialog-no-injection" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async () => {
          calls += 1;
          return {
            content: "plain answer",
            model: "fake-local",
            finish_reason: "stop",
            stream_complete: true,
          };
        },
      }),
      executeTool: async () => ({ content: "" }),
    } as any;

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "plain",
      input: "hi",
    } as any);

    expect(calls).toBe(1);
    expect(result.content).toBe("plain answer");
    expect(savedTurns[0]!.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("poisoned tool_call arguments (upstream stream truncation)", () => {
  const baseAdapter = (
    overrides: Partial<AgentRuntimeHostAdapter>,
  ): AgentRuntimeHostAdapter => ({
    host: "cli",
    capabilities: ["local-provider", "local-persistence", "local-tools"],
    loadAgentConfig: async (agentRef) => ({
      key: agentRef,
      model: "fake-local",
    }),
    saveTurn: async () => ({ dialogId: "dialog-poison" }),
    ...overrides,
  });

  test("self-heal: stored truncated tool_call is downgraded to text before the provider call", async () => {
    // 复刻真实事故形状：GLM 并行双 tool_call，前一个 arguments 丢结尾 `"}]}`。
    const truncatedArgs = JSON.stringify({ agentKey: "agent-x", task: "review the diff" }).slice(0, -3);
    let providerMessages: any[] = [];
    const adapter = baseAdapter({
      loadDialogHistory: async () => [
        { role: "user", content: "dispatch two reviews" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "call-bad", type: "function", function: { name: "startAgentRun", arguments: truncatedArgs } },
            { id: "call-ok", type: "function", function: { name: "startAgentRun", arguments: '{"agentKey":"agent-y"}' } },
          ],
        },
        { role: "tool", tool_call_id: "call-bad", content: "startAgentRun failed: 缺少 agentKey 参数。", toolName: "startAgentRun" },
        { role: "tool", tool_call_id: "call-ok", content: "run started #ip7vii", toolName: "startAgentRun" },
      ],
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          providerMessages = messages as any[];
          return { content: "ack", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run");
      },
    });

    await runLocalAgentTurn({
      adapter,
      agentRef: "poison-heal",
      input: "继续",
      continueDialogId: "dialog-poison-self-heal",
    });

    // 毒丸 call 降级为文本，健康 sibling 结构保留
    const asst = providerMessages.find((m) => m.role === "assistant" && Array.isArray(m.tool_calls));
    expect((asst?.tool_calls ?? []).map((c: any) => c.id)).toEqual(["call-ok"]);
    expect(String(asst?.content)).toContain("[tool_call: startAgentRun(");
    expect(String(asst?.content)).toContain("review the dif");
    // 毒丸 result 不再以结构化 tool 消息出现（否则网关仍会 400）
    expect(providerMessages.find((m) => m.role === "tool" && m.tool_call_id === "call-bad")).toBeUndefined();
    expect(providerMessages.some((m) =>
      m.role === "assistant" && String(m.content).includes("[tool_result: startAgentRun: startAgentRun failed"),
    )).toBe(true);
    // 健康 result 结构保留
    expect(providerMessages.find((m) => m.role === "tool" && m.tool_call_id === "call-ok")).toBeDefined();
  });

  test("in-turn interception: truncated arguments never reach the executor, result tells the model to retry", async () => {
    const truncatedArgs = JSON.stringify({ command: "ls" }).slice(0, -2);
    let executed = 0;
    let round2Messages: any[] = [];
    let callCount = 0;
    const adapter = baseAdapter({
      loadDialogHistory: async () => [{ role: "user", content: "run ls" }],
      resolveProvider: async () => ({
        model: "fake-local",
        complete: async (messages) => {
          callCount++;
          if (callCount === 1) {
            return {
              content: null,
              tool_calls: [{
                id: "call-trunc",
                type: "function",
                function: { name: "exec_command", arguments: truncatedArgs },
              }],
              model: "fake-local",
              trace: messages,
            };
          }
          round2Messages = messages as any[];
          return { content: "done", model: "fake-local", trace: messages };
        },
      }),
      executeTool: async () => {
        executed++;
        return { content: "should not execute" };
      },
    });

    const result = await runLocalAgentTurn({
      adapter,
      agentRef: "poison-turn",
      input: "run ls",
      continueDialogId: "dialog-poison-turn",
    });

    expect(executed).toBe(0);
    expect(result.content).toBe("done");
    const toolMsg = round2Messages.find((m) => m.role === "tool" && m.tool_call_id === "call-trunc");
    expect(String(toolMsg?.content)).toContain("exec_command failed");
    expect(String(toolMsg?.content)).toContain("不是合法 JSON");
    expect(String(toolMsg?.content)).toContain("疑似上游流式截断");
    expect(String(toolMsg?.content)).toContain("重新完整调用");
  });
});

// ── 第二刀：timeout + abort deterministic world（Effect v4 kernel）──────────
//
// timeout/abort 收敛进 runAbortableWithTimeout（Effect kernel）：timeout 走
// Effect Clock，测试注入 ManagedRuntime(TestClock.layer()) 用 TestClock.adjust
// 虚拟推进——9999ms 不触发 / +1ms 精确触发，全程零真实 sleep。abort 由外部
// AbortSignal 桥接 raceFirst interruption，pending 中立即终止。所有被放弃的
// provider promise 不取消（无取消契约），其后续 settle 由 kernel 吸收，无悬挂。
describe("runLocalAgentTurn timeout/abort (Effect kernel deterministic world)", () => {
  /** 微任务级 settle 探测（无真实 sleep）：已 settle 立即可见，否则仍 pending。 */
  async function isPending(p: Promise<unknown>): Promise<boolean> {
    return await Promise.race([
      p.then(
        () => false,
        () => false,
      ),
      Promise.resolve(null).then(() => true),
    ]);
  }

  /** 等 turn 进入 provider pending（微任务自旋，无真实 sleep）。 */
  async function waitForProviderCall(providerCalls: unknown[], runtime: ManagedRuntime.ManagedRuntime<never, never>) {
    let spins = 0;
    while (providerCalls.length === 0 && spins < 1_000) {
      await runtime.runPromise(Effect.yieldNow);
      spins += 1;
    }
    expect(providerCalls.length).toBe(1);
  }

  function makeHangingAdapter(options: {
    savedTurns: AgentRuntimeSaveTurnInput[];
    providerCalls: number[];
    provider1?: Promise<AgentRuntimeResult>;
  }) {
    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({
        key: agentRef,
        name: "Hanging Agent",
        model: "fake-local",
      }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        options.savedTurns.push(input);
        return { dialogId: "dialog-hang" };
      },
      resolveProvider: async () => ({
        model: "fake-local",
        // Never resolves: simulates a long-running provider request.
        complete: (messages: AgentRuntimeChatMessage[]) => {
          options.providerCalls.push(messages.map((m) => ({ ...m })));
          return options.provider1 ?? new Promise<AgentRuntimeResult>(() => {});
        },
      }),
      executeTool: async () => {
        throw new Error("tools should not run in this scenario");
      },
    };
    return adapter;
  }

  test("timeout kernel: TestClock 推进 9999ms 不触发、再 +1ms 精确触发", async () => {
    const runtime = ManagedRuntime.make(TestClock.layer());
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const providerCalls: AgentRuntimeChatMessage[][] = [];
    let resolvePending!: (value: AgentRuntimeResult) => void;
    const provider1 = new Promise<AgentRuntimeResult>((resolve) => {
      resolvePending = resolve;
    });
    const adapter = makeHangingAdapter({ savedTurns, providerCalls, provider1 });

    const turnPromise = runLocalAgentTurn({
      adapter,
      agentRef: "timeout-kernel",
      input: "hang until the turn budget",
      timeoutMs: 10_000,
      effectRuntime: runtime,
    } as any).then(
      (r) => ({ kind: "fulfilled" as const, r }),
      (e) => ({ kind: "rejected" as const, e }),
    );

    await waitForProviderCall(providerCalls, runtime);

    // +9999ms：仍未 timeout，turn 仍 pending，无额外动作。
    await runtime.runPromise(TestClock.adjust(Duration.millis(9_999)));
    expect(await isPending(turnPromise)).toBe(true);
    expect(providerCalls).toHaveLength(1);

    // 再 +1ms：精确 timeout（code LLM_REQUEST_TIMEOUT，message 保留旧语义）。
    await runtime.runPromise(TestClock.adjust(Duration.millis(1)));
    const settled = await turnPromise;
    expect(settled.kind).toBe("rejected");
    const err = settled.e as Error & { code?: string };
    expect(err.code).toBe("LLM_REQUEST_TIMEOUT");
    expect(err.message).toBe("LLM request timed out after 10000ms (round 0)");
    // timeout round 没被当正常完成：saveTurn 仍落盘（loopError 留档），
    // 但没有 assistant 终稿。
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]!.messages.at(-1)!.role).toBe("user"); // 无 assistant 终稿

    // cleanup：timeout 后继续大幅推进虚拟时间（+100s），无悬挂动作。
    await runtime.runPromise(TestClock.adjust(Duration.millis(100_000)));
    expect(providerCalls).toHaveLength(1);
    expect(savedTurns).toHaveLength(1);

    // 迟到结果不产生重复 terminal：provider 后续 resolve 被吸收，不再落盘。
    resolvePending({ content: "迟到内容", model: "fake-local" } as AgentRuntimeResult);
    for (let i = 0; i < 10; i++) await runtime.runPromise(Effect.yieldNow);
    expect(savedTurns).toHaveLength(1);
    expect(JSON.stringify(savedTurns[0]!.messages)).not.toContain("迟到内容");

    await runtime.dispose();
  });

  test("abort kernel: provider pending 时外部 abort 立即终止，无下一轮", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const providerCalls: AgentRuntimeChatMessage[][] = [];
    const controller = new AbortController();
    const adapter = makeHangingAdapter({ savedTurns, providerCalls });

    const turnPromise = runLocalAgentTurn({
      adapter,
      agentRef: "abort-kernel",
      input: "take forever",
      abortSignal: controller.signal,
    }).then(
      (r) => ({ kind: "fulfilled" as const, r }),
      (e) => ({ kind: "rejected" as const, e }),
    );

    // 等 turn 进入 provider pending（微任务级，无真实 sleep；abort 场景不依赖
    // TestClock，走生产默认 runtime）。
    let spins = 0;
    while (providerCalls.length === 0 && spins < 1_000) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      spins += 1;
    }
    expect(providerCalls).toHaveLength(1);

    controller.abort();
    const settled = await turnPromise;

    expect(settled.kind).toBe("rejected");
    expect((settled.e as Error & { code?: string }).code).toBe(LOCAL_TURN_ABORTED_CODE);
    // 不会继续下一轮 / 不会继续调用 provider。
    expect(providerCalls).toHaveLength(1);
    // aborted round 不当正常完成：无 content 终稿，仅留档。
    expect(savedTurns).toHaveLength(1);
    expect(savedTurns[0]!.messages.at(-1)!.role).toBe("user");
  });

  test("tool abort deterministic: tool pending 时外部 abort 立即终止，无下一轮且语义完整", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const providerMessages: AgentRuntimeChatMessage[][] = [];
    const loopEvents: any[] = [];
    let toolExecutionCount = 0;
    const controller = new AbortController();

    let resolveTool!: (value: { content: string }) => void;
    const toolPromise = new Promise<{ content: string }>((resolve) => {
      resolveTool = resolve;
    });

    const adapter: AgentRuntimeHostAdapter = {
      host: "cli",
      capabilities: ["local-provider", "local-persistence"],
      loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
      loadDialogHistory: async () => [],
      saveTurn: async (input) => {
        savedTurns.push(input);
        return { dialogId: "dialog-tool-abort" };
      },
      resolveProvider: async () => ({
        model: "m",
        complete: async (messages) => {
          providerMessages.push(messages);
          if (providerMessages.length === 1) {
            return {
              content: "calling tool",
              model: "m",
              tool_calls: [
                {
                  id: "call-det-1",
                  type: "function" as const,
                  function: { name: "pending_tool", arguments: "{}" },
                },
              ],
            };
          }
          return { content: "second round answer", model: "m" };
        },
      }),
      executeTool: async () => {
        toolExecutionCount += 1;
        return toolPromise;
      },
    };

    const turnPromise = runLocalAgentTurn({
      adapter,
      agentRef: "tool-abort-det",
      input: "call pending tool",
      abortSignal: controller.signal,
      onLoopEvent: (event) => loopEvents.push(event as any),
    }).then(
      (r) => ({ kind: "fulfilled" as const, r }),
      (e) => ({ kind: "rejected" as const, e }),
    );

    // 等待 tool-start 发生（微任务轮询，确定性无真实 sleep）
    let spins = 0;
    while (toolExecutionCount === 0 && spins < 1_000) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      spins += 1;
    }
    expect(toolExecutionCount).toBe(1);
    expect(loopEvents.some((e) => e.kind === "tool-start")).toBe(true);

    // 触发外部中止
    controller.abort();
    const settled = await turnPromise;

    // 1. turn 终止并保持 LOCAL_TURN_ABORTED 语义与 pendingToolName
    expect(settled.kind).toBe("rejected");
    if (settled.kind === "rejected") {
      const err = settled.e as Error & { code?: string; pendingToolName?: string };
      expect(err.code).toBe(LOCAL_TURN_ABORTED_CODE);
      expect(err.pendingToolName).toBe("pending_tool");
    }

    // 2. 不会重复 executeTool
    expect(toolExecutionCount).toBe(1);

    // 3. 不会继续下一轮 / 不会继续调用 provider
    expect(providerMessages).toHaveLength(1);

    // 4. 不会产出正常 tool-result 给 provider
    const hasToolResultInMessages = providerMessages.some((round) =>
      round.some((m) => m.role === "tool" && String(m.content).includes("late resolved content")),
    );
    expect(hasToolResultInMessages).toBe(false);

    // 5. saveTurn 仅留档用户消息与 tool call 尝试，无第二轮正常 content
    expect(savedTurns).toHaveLength(1);

    // 清理 pending tool 防止挂起
    resolveTool({ content: "late resolved content" });
  });

  test("tool cleanup deterministic: abort 后原 pending tool 迟到 resolve/reject 不触发重复事件、无 unhandledRejection 且 listener 清理", async () => {
    const savedTurns: AgentRuntimeSaveTurnInput[] = [];
    const loopEvents: any[] = [];
    const controller = new AbortController();

    let resolveTool!: (value: { content: string }) => void;
    let rejectTool!: (error: Error) => void;
    const toolPromise1 = new Promise<{ content: string }>((resolve, reject) => {
      resolveTool = resolve;
      rejectTool = reject;
    });

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    (process as any).on("unhandledRejection", onUnhandled);

    try {
      const adapter: AgentRuntimeHostAdapter = {
        host: "cli",
        capabilities: ["local-provider", "local-persistence"],
        loadAgentConfig: async (agentRef) => ({ key: agentRef, name: "A", model: "m" }),
        loadDialogHistory: async () => [],
        saveTurn: async (input) => {
          savedTurns.push(input);
          return { dialogId: "dialog-tool-cleanup" };
        },
        resolveProvider: async () => ({
          model: "m",
          complete: async () => ({
            content: "calling slow tool",
            model: "m",
            tool_calls: [
              {
                id: "call-clean-1",
                type: "function" as const,
                function: { name: "slow_cleanup_tool", arguments: "{}" },
              },
            ],
          }),
        }),
        executeTool: async () => toolPromise1,
      };

      const turnPromise = runLocalAgentTurn({
        adapter,
        agentRef: "tool-cleanup-det",
        input: "run slow tool",
        abortSignal: controller.signal,
        onLoopEvent: (event) => loopEvents.push(event),
      }).then(
        (r) => ({ kind: "fulfilled" as const, r }),
        (e) => ({ kind: "rejected" as const, e }),
      );

      // 等待进入 tool 执行
      let spins = 0;
      while (!loopEvents.some((e) => e.kind === "tool-start") && spins < 1_000) {
        await new Promise<void>((resolve) => setImmediate(resolve));
        spins += 1;
      }

      // 中止
      controller.abort();
      const settled = await turnPromise;
      expect(settled.kind).toBe("rejected");
      if (settled.kind === "rejected") {
        expect((settled.e as any)?.code).toBe(LOCAL_TURN_ABORTED_CODE);
      }

      const toolEndCountBefore = loopEvents.filter((e) => e.kind === "tool-end").length;
      const saveTurnCountBefore = savedTurns.length;

      // 迟到 resolve
      resolveTool({ content: "late resolved content" });
      await new Promise<void>((resolve) => setImmediate(resolve));

      // 断言：无重复 tool-end、无额外 saveTurn
      const toolEndCountAfterResolve = loopEvents.filter((e) => e.kind === "tool-end").length;
      expect(toolEndCountAfterResolve).toBe(toolEndCountBefore);
      expect(savedTurns.length).toBe(saveTurnCountBefore);

      // 迟到 reject 测试：再跑一个 abort 后 late reject 的场景
      const controller2 = new AbortController();
      let lateRejectTool!: (error: Error) => void;
      const toolPromise2 = new Promise<{ content: string }>((_resolve, reject) => {
        lateRejectTool = reject;
      });

      const adapter2: AgentRuntimeHostAdapter = {
        ...adapter,
        executeTool: async () => toolPromise2,
      };

      const turnPromise2 = runLocalAgentTurn({
        adapter: adapter2,
        agentRef: "tool-cleanup-reject",
        input: "run slow tool reject",
        abortSignal: controller2.signal,
      }).then(
        (r) => ({ kind: "fulfilled" as const, r }),
        (e) => ({ kind: "rejected" as const, e }),
      );

      let spins2 = 0;
      while (spins2 < 1_000) {
        await new Promise<void>((resolve) => setImmediate(resolve));
        spins2 += 1;
        if (spins2 > 5) break; // 微任务让 turn 进入 executeTool
      }

      controller2.abort();
      const settled2 = await turnPromise2;
      expect(settled2.kind).toBe("rejected");

      // 迟到 reject
      lateRejectTool(new Error("late tool explosion"));
      await new Promise<void>((resolve) => setImmediate(resolve));

      // 无 unhandledRejection
      expect(unhandled).toHaveLength(0);

      // AbortSignal listener 均已清理
      expect(getEventListeners(controller.signal as any, "abort")).toHaveLength(0);
      expect(getEventListeners(controller2.signal as any, "abort")).toHaveLength(0);
    } finally {
      (process as any).removeListener("unhandledRejection", onUnhandled);
    }
  });
});
