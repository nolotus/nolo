import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";

import {
  FIREWORKS_KIMI_CURRENT_MODEL,
  FIREWORKS_KIMI_LATEST_MODEL,
} from "ai/llm/kimi";

let moduleVersion = 0;
let promptVersion = 0;

const loadGenerateOpenAIRequestBody = async () => {
  const actualGeneratePrompt = await import(
    new URL(`../../ai/agent/generatePrompt.ts?actual=${promptVersion++}`, import.meta.url).href
  );
  mock.module("ai/agent/generatePrompt", () => actualGeneratePrompt);
  return import(`./generateOpenAIRequestBody`);
};

beforeAll(() => {
  (globalThis as any).navigator = { language: "en-US" };
});

afterEach(() => {
  mock.restore();
});

describe("generateOpenAIRequestBody", () => {
  it("preserves dynamic system messages after the agent prompt", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "fireworks",
        model: "accounts/fireworks/models/kimi-k2p6",
        prompt: "你是一个测试助手。",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "fireworks",
      [
        { role: "system", content: "这是用户 policy。" } as any,
        { role: "system", content: "这是 memory overlay。" } as any,
        { role: "user", content: "你记得吗？" } as any,
      ],
    );

    expect(body.messages).toHaveLength(4);
    expect(body.messages[0]?.role).toBe("system");
    expect(body.messages[0]?.content).not.toBe("这是用户 policy。");
    expect(body.messages[1]).toMatchObject({
      role: "system",
      content: "这是用户 policy。",
    });
    expect(body.messages[2]).toMatchObject({
      role: "system",
      content: "这是 memory overlay。",
    });
    expect(body.messages[3]).toMatchObject({
      role: "user",
      content: "你记得吗？",
    });
  });

  it("strips internal runtime metadata from chat-completions messages", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "fireworks",
        model: "accounts/fireworks/models/kimi-k2p6",
        prompt: "",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "fireworks",
      [
        {
          role: "assistant",
          content: "branch answer",
          cybotKey: "agent-1",
          agentKey: "agent-1",
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "toolA", arguments: "{}" },
            },
          ],
        } as any,
        {
          role: "tool",
          content: "{\"ok\":true}",
          tool_call_id: "call_1",
          parentMessageId: "msg-parent",
        } as any,
      ],
    );

    expect(body.messages).toEqual([
      {
        role: "assistant",
        content: "branch answer",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "toolA", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: "{\"ok\":true}",
        tool_call_id: "call_1",
      },
    ]);
  });

  it("preserves empty assistant reasoning_content and tool replay for Moonshot kimi-k3", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "moonshot",
        model: "kimi-k3",
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
        prompt: "",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "moonshot",
      [
        {
          role: "assistant",
          content: "",
          reasoning_content: "",
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "toolA", arguments: "{}" },
            },
          ],
        } as any,
        { role: "tool", content: "{\"ok\":true}", tool_call_id: "call_1" } as any,
      ],
    );

    // assistant reasoning_content 空字符串也保留；tool_calls / tool_call_id 完整回传。
    expect(body.messages).toEqual([
      {
        role: "assistant",
        content: "",
        reasoning_content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "toolA", arguments: "{}" },
          },
        ],
      },
      { role: "tool", content: "{\"ok\":true}", tool_call_id: "call_1" },
    ]);

    // kimi-k3 出站参数清洗：采样参数移除，max_tokens → max_completion_tokens。
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("max_tokens");
    expect(body.max_completion_tokens).toBe(2048);
  });

  it("passes llama.cpp qwen thinking toggle for localhost custom providers", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "custom",
        model: "Qwen3.6-27B-UD-IQ3_XXS.gguf",
        customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
        enableThinking: false,
        prompt: "",
        userId: "user1",
        useServerProxy: false,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "custom" as any,
      [{ role: "user", content: "hello" } as any],
    );

    expect(body.chat_template_kwargs).toEqual({
      enable_thinking: false,
    });
  });

  it("does not send llama.cpp thinking toggle to non-local custom providers", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "custom",
        model: "Qwen3.6-27B-UD-IQ3_XXS.gguf",
        customProviderUrl: "https://example.com/v1/chat/completions",
        enableThinking: false,
        prompt: "",
        userId: "user1",
        useServerProxy: false,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "custom" as any,
      [{ role: "user", content: "hello" } as any],
    );

    expect(body.chat_template_kwargs).toBeUndefined();
  });

  it("skips prepending the generated system prompt when requested", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "fireworks",
        model: "accounts/fireworks/models/kimi-k2p6",
        prompt: "你是一个测试助手。",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "fireworks",
      [{ role: "system", content: "RUNTIME_PROMPT" } as any, { role: "user", content: "hi" } as any],
      undefined,
      [],
      false
    );

    expect(body.messages).toEqual([
      { role: "system", content: "RUNTIME_PROMPT" },
      { role: "user", content: "hi" },
    ]);
  });

  it("normalizes fireworks kimi-latest to the current upstream model name", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "fireworks",
        model: FIREWORKS_KIMI_LATEST_MODEL,
        prompt: "",
        userId: "user1",
        useServerProxy: false,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "fireworks",
      [{ role: "user", content: "hi" } as any],
    );

    expect(body.model).toBe(FIREWORKS_KIMI_CURRENT_MODEL);
  });

  it("disables Kimi thinking only when the agent explicitly opts out", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "deepinfra",
        model: "moonshotai/Kimi-K2.6",
        enableThinking: false,
        prompt: "",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "deepinfra",
      [{ role: "user", content: "hi" } as any],
    );

    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.reasoning_effort).toBe("none");
    expect(body.reasoning).toEqual({ enabled: false });
  });

  it("uses Fireworks-compatible Kimi thinking opt-out fields", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "fireworks",
        model: FIREWORKS_KIMI_CURRENT_MODEL,
        enableThinking: false,
        prompt: "",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "fireworks",
      [{ role: "user", content: "hi" } as any],
    );

    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.reasoning).toBeUndefined();
  });

  it("keeps Kimi default thinking when the agent has not opted out", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "deepinfra",
        model: "moonshotai/Kimi-K2.6",
        prompt: "",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "deepinfra",
      [{ role: "user", content: "hi" } as any],
    );

    expect(body.thinking).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.reasoning).toBeUndefined();
  });

  // --- Cache split: Claude system prompt should be split into stable
  // prefix (with cache_control) and dynamic suffix (without) ---

  it("splits Claude system prompt into cached stable prefix + uncached dynamic suffix", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        prompt: "你是测试助手。",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "anthropic",
      [{ role: "user", content: "hi" } as any],
      // contexts with dialogSummary — a turn-scope layer that should
      // land in the dynamic suffix, NOT the cached stable prefix.
      {
        dialogSummary: "上次讨论了缓存优化方案。",
        historyContext: "",
        currentInputContext: null,
        editingContext: null,
        appWorkingMemory: null,
        memoryOverlay: null,
        referenceKeys: [],
      } as any,
    );

    expect(body.messages.length).toBeGreaterThanOrEqual(2);
    const systemMsg = body.messages[0];
    expect(systemMsg.role).toBe("system");

    // Claude: content should be an array of parts.
    expect(Array.isArray(systemMsg.content)).toBe(true);
    const parts = systemMsg.content as any[];

    // First part has cache_control: ephemeral (stable prefix).
    expect(parts[0].cache_control).toEqual({ type: "ephemeral" });
    // Stable prefix should NOT contain the dialog summary.
    expect(parts[0].text).not.toContain("历史对话摘要");
    expect(parts[0].text).not.toContain("上次讨论了缓存优化方案");

    // Last part should NOT have cache_control (dynamic suffix).
    const lastPart = parts[parts.length - 1];
    expect(lastPart.cache_control).toBeUndefined();

    // Dynamic suffix should contain the dialog summary.
    const dynamicText = parts.map((p: any) => p.text).join("\n");
    expect(dynamicText).toContain("历史对话摘要");
    expect(dynamicText).toContain("上次讨论了缓存优化方案");
  });

  it("keeps non-Claude system prompt as a single string (DeepSeek auto cache)", async () => {
    const { generateOpenAIRequestBody } = await loadGenerateOpenAIRequestBody();
    const body = generateOpenAIRequestBody(
      {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        prompt: "你是测试助手。",
        userId: "user1",
        useServerProxy: true,
        createdAt: 0,
        updatedAt: "2026-04-16T00:00:00.000Z",
        isPublic: false,
      } as any,
      "deepseek",
      [{ role: "user", content: "hi" } as any],
      {
        dialogSummary: "上次讨论了缓存优化方案。",
        historyContext: "",
        currentInputContext: null,
        editingContext: null,
        appWorkingMemory: null,
        memoryOverlay: null,
        referenceKeys: [],
      } as any,
    );

    const systemMsg = body.messages[0];
    expect(systemMsg.role).toBe("system");
    // Non-Claude: content stays as a plain string.
    expect(typeof systemMsg.content).toBe("string");
    // The summary is present in the string.
    expect(systemMsg.content).toContain("历史对话摘要");
    expect(systemMsg.content).toContain("上次讨论了缓存优化方案");
  });
});
