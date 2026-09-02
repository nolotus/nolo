import { describe, expect, test } from "bun:test";

import { asFetch } from "./testFetchMock";
import {
  ANTHROPIC_OAUTH_BETA_HEADER,
  CLAUDE_CODE_SYSTEM_INSTRUCTION,
  CLAUDE_CODE_USER_AGENT,
  buildAnthropicMessagesBody,
  fetchAnthropicMessagesCompletion,
} from "./anthropicMessagesProvider";

const agent = {
  key: "claude-agent",
  apiKeyRef: "claude",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  prompt: "Be concise.",
};

// extended thinking(enabled) 模型（官方 Adaptive=No，走 budget_tokens）
const enabledAgent = {
  key: "claude-agent",
  apiKeyRef: "claude",
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  prompt: "Be concise.",
};

// adaptive thinking 模型（5 代，走 output_config.effort）
const adaptiveAgent = {
  key: "claude-agent",
  apiKeyRef: "claude",
  provider: "anthropic",
  model: "claude-sonnet-5",
  prompt: "Be concise.",
};

describe("Anthropic Messages adapter", () => {
  test("maps system, tools, tool calls, and tool results", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: agent,
      openAiBody: {
        messages: [
          { role: "system", content: "System rule" },
          { role: "user", content: "Check it" },
          {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "read", arguments: "{\"path\":\"a.txt\"}" },
            }],
          },
          { role: "tool", tool_call_id: "call-1", content: "hello" },
        ],
        tools: [{
          type: "function",
          function: {
            name: "read",
            description: "Read a file",
            parameters: { type: "object", properties: { path: { type: "string" } } },
          },
        }],
      },
    });
    expect(body.tools).toEqual([
      {
        name: "read",
        description: "Read a file",
        input_schema: { type: "object", properties: { path: { type: "string" } } },
        cache_control: { type: "ephemeral" },
      },
    ]);
    expect(body.system).toEqual([
      { type: "text", text: CLAUDE_CODE_SYSTEM_INSTRUCTION },
      { type: "text", text: "Be concise." },
      { type: "text", text: "System rule", cache_control: { type: "ephemeral" } },
    ]);
    expect(body.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "Check it" }] },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "call-1", name: "read", input: { path: "a.txt" } }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "call-1", content: "hello", cache_control: { type: "ephemeral" } }],
      },
    ]);
  });

  test("injects cache_control only on the last tool when multiple tools are provided", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: agent,
      openAiBody: {
        messages: [{ role: "user", content: "Hi" }],
        tools: [
          {
            type: "function",
            function: {
              name: "read",
              description: "Read a file",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "write",
              description: "Write a file",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
    });
    expect(body.tools).toEqual([
      {
        name: "read",
        description: "Read a file",
        input_schema: { type: "object", properties: {} },
      },
      {
        name: "write",
        description: "Write a file",
        input_schema: { type: "object", properties: {} },
        cache_control: { type: "ephemeral" },
      },
    ]);
  });

  test("does not duplicate Claude Code identity when already present", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...agent, prompt: CLAUDE_CODE_SYSTEM_INSTRUCTION },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.system).toEqual([
      { type: "text", text: CLAUDE_CODE_SYSTEM_INSTRUCTION, cache_control: { type: "ephemeral" } },
    ]);
  });

  test("drops empty text blocks that would trigger HTTP 400", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: agent,
      openAiBody: {
        messages: [
          { role: "user", content: "Hello" },
          // assistant produced only a tool call — empty text content
          { role: "assistant", content: "" },
          // array form with an empty text part mixed with a real one
          { role: "assistant", content: [{ type: "text", text: "" }, { type: "text", text: "real" }] },
          { role: "user", content: [{ type: "text", text: "" }] },
        ],
      },
    });
    // No message should carry an empty-text block; the all-empty user message
    // is dropped entirely (pushMessage skips length-0 content arrays).
    const messages = (body as { messages: any[] }).messages;
    for (const msg of messages) {
      const content = (msg as any).content as unknown[];
      expect(content.length).toBeGreaterThan(0);
      for (const block of content) {
        if ((block as any).type === "text") expect((block as any).text.length).toBeGreaterThan(0);
      }
    }
  });

  test("sends OAuth fingerprint headers and maps Anthropic response to chat.completion", async () => {
    let headers = new Headers();
    let requestBody: any = null;
    const result = await fetchAnthropicMessagesCompletion({
      agentConfig: agent,
      accessToken: "oauth-secret",
      openAiBody: { messages: [{ role: "user", content: "Hello" }] },
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        headers = new Headers(init?.headers);
        requestBody = JSON.parse(String(init?.body ?? "{}"));
        return new Response(JSON.stringify({
          id: "msg_1",
          model: "claude-sonnet-4-6",
          content: [
            { type: "text", text: "Done" },
            { type: "tool_use", id: "toolu_1", name: "read", input: { path: "a" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 2 },
        }));
      }) as typeof fetch,
    });
    expect(headers.get("authorization")).toBe("Bearer oauth-secret");
    expect(headers.get("anthropic-beta")).toBe(ANTHROPIC_OAUTH_BETA_HEADER);
    expect(headers.get("user-agent")).toBe(CLAUDE_CODE_USER_AGENT);
    expect(headers.get("x-app")).toBe("cli");
    expect(requestBody.system).toEqual([
      { type: "text", text: CLAUDE_CODE_SYSTEM_INSTRUCTION },
      { type: "text", text: "Be concise.", cache_control: { type: "ephemeral" } },
    ]);
    expect(result.status).toBe(200);
    expect((result.body.choices as any)[0]).toMatchObject({
      finish_reason: "tool_calls",
      message: { content: "Done", tool_calls: [{ function: { name: "read" } }] },
    });
    expect(result.body.usage).toEqual({
      prompt_tokens: 12,
      input_tokens: 12,
      completion_tokens: 4,
      output_tokens: 4,
      total_tokens: 16,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 2,
    });
  });

  test("injects ephemeral cache_control on the last system block", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...agent, prompt: "System A" },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    const last = (body.system as any[]).at(-1);
    expect(last).toEqual({ type: "text", text: "System A", cache_control: { type: "ephemeral" } });
    expect((body.system as any[]).slice(0, -1).some((b) => b.cache_control)).toBe(false);
  });

  test("injects ephemeral cache_control on the last content block of the last message", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: agent,
      openAiBody: {
        messages: [
          { role: "user", content: "First" },
          { role: "assistant", content: "Second" },
          { role: "user", content: "Third" },
        ],
      },
    });
    const lastMessage = (body.messages as any[]).at(-1);
    expect(lastMessage).toEqual({
      role: "user",
      content: [{ type: "text", text: "Third", cache_control: { type: "ephemeral" } }],
    });
    for (let i = 0; i < (body.messages as any[]).length - 1; i++) {
      for (const block of ((body.messages as any[])[i] as any).content) {
        expect(block.cache_control).toBeUndefined();
      }
    }
  });

  test("keeps the cache breakpoint on the stable system prefix", () => {
    const stable = "stable rules";
    const dynamic = "dynamic time and memory";
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...agent, prompt: undefined },
      openAiBody: {
        messages: [{
          role: "system",
          content: `${stable}\n\n${dynamic}`,
          stable_prefix_chars: stable.length,
        }],
      },
    });
    const system = body.system as Array<Record<string, unknown>>;
    expect(system.find((block) => block.text === stable)?.cache_control)
      .toEqual({ type: "ephemeral" });
    const dynamicBlock = system.find((block) => block.text === `\n\n${dynamic}`);
    expect(dynamicBlock?.cache_control).toBeUndefined();
    expect(`${String(system.find((block) => block.text === stable)?.text ?? "")}${String(dynamicBlock?.text ?? "")}`)
      .toBe(`${stable}\n\n${dynamic}`);
  });

  test("preserves cache usage without double-counting total input", async () => {
    const result = await fetchAnthropicMessagesCompletion({
      agentConfig: agent,
      accessToken: "token",
      openAiBody: { messages: [{ role: "user", content: "hello" }] },
      fetchImpl: asFetch(async () => new Response(JSON.stringify({
        id: "msg_1",
        model: agent.model,
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          cache_creation_input_tokens: 20,
          cache_read_input_tokens: 70,
          output_tokens: 5,
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } })),
    });
    expect(result.body.usage).toEqual(expect.objectContaining({
      prompt_tokens: 100,
      input_tokens: 100,
      total_tokens: 105,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 70,
    }));
  });

  test("does not duplicate cache_control when already present from upstream", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...agent, prompt: "Agent prompt" },
      openAiBody: {
        messages: [
          { role: "system", content: { type: "text", text: "Custom system", cache_control: { type: "ephemeral" } } },
          { role: "user", content: [{ type: "text", text: "Hi", cache_control: { type: "ephemeral" } }] },
        ],
      },
    });
    expect((body.system as any[]).at(-1).cache_control).toEqual({ type: "ephemeral" });
    const lastMessage = (body.messages as any[]).at(-1);
    expect((lastMessage.content as any[]).at(-1).cache_control).toEqual({ type: "ephemeral" });
  });

  test("injects extended thinking with default medium budget when effort unset", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: enabledAgent,
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
    // Anthropic hard constraints: temperature must be 1, max_tokens > budget.
    expect(body.temperature).toBe(1);
    expect(body.max_tokens).toBe(8193);
  });

  test("maps reasoning_effort to budget_tokens", () => {
    for (const [effort, budget] of [
      ["minimal", 2048],
      ["low", 4096],
      ["medium", 8192],
      ["high", 16384],
      ["xhigh", 32000],
      ["max", 32000],
    ] as const) {
      const body = buildAnthropicMessagesBody({
        agentConfig: { ...enabledAgent, reasoning_effort: effort },
        openAiBody: { messages: [{ role: "user", content: "Hi" }] },
      });
      expect(body.thinking).toEqual({ type: "enabled", budget_tokens: budget });
    }
  });

  test("openAiBody reasoning_effort wins over agentConfig", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...enabledAgent, reasoning_effort: "low" },
      openAiBody: { reasoning_effort: "high", messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 16384 });
  });

  test("explicit none/off disables thinking and keeps original max_tokens", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...enabledAgent, reasoning_effort: "none" },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toBeUndefined();
    expect(body.max_tokens).toBe(8192);
  });

  test("forcibly clamps temperature to 1 when thinking enabled", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...enabledAgent, reasoning_effort: "medium", temperature: 0.7 },
      openAiBody: { temperature: 0.2, messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.temperature).toBe(1);
  });

  test("keeps a max_tokens larger than the budget untouched", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...enabledAgent, reasoning_effort: "medium", max_tokens: 20000 },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 8192 });
    expect(body.max_tokens).toBe(20000);
  });

  test("respects an upstream-injected thinking block when effort unset", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: enabledAgent,
      openAiBody: {
        thinking: { type: "enabled", budget_tokens: 16000 },
        messages: [{ role: "user", content: "Hi" }],
      },
    });
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 16000 });
    expect(body.max_tokens).toBe(16001);
  });

  test("respects enableThinking + thinkingBudget when effort unset", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...enabledAgent, enableThinking: true, thinkingBudget: 12000 } as any,
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 12000 });
  });

  // ── adaptive 模型（5 代 + 4.6/4.7/4.8 系）──
  test("adaptive model uses adaptive thinking + output_config.effort (default medium)", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: adaptiveAgent,
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(body.output_config).toEqual({ effort: "medium" });
    // adaptive 无 budget 约束：不强改 max_tokens / temperature
    expect(body.max_tokens).toBe(8192);
  });

  test("adaptive model maps effort to output_config and keeps temperature", () => {
    for (const effort of ["low", "medium", "high"]) {
      const body = buildAnthropicMessagesBody({
        agentConfig: { ...adaptiveAgent, reasoning_effort: effort, temperature: 0.7 },
        openAiBody: { temperature: 0.2, messages: [{ role: "user", content: "Hi" }] },
      });
      expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
      expect(body.output_config).toEqual({ effort });
      expect(body.temperature).toBe(0.2); // 不强改
    }
  });

  test("adaptive model maps minimal to Anthropic's lowest effort (low)", () => {
    // Anthropic output_config.effort 枚举无 minimal（只有 max/xhigh/high/medium/low），
    // 必须映射到 low，否则 API 400。
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...adaptiveAgent, reasoning_effort: "minimal" },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
  });

  test("adaptive model with none/off sends thinking disabled", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: { ...adaptiveAgent, reasoning_effort: "none" },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toBeUndefined();
  });

  test("4.6-gen models (sonnet-4-6) also use adaptive thinking", () => {
    const body = buildAnthropicMessagesBody({
      agentConfig: agent, // claude-sonnet-4-6
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(body.output_config).toEqual({ effort: "medium" });
  });

  test("default model (claude-sonnet-5) uses adaptive thinking", () => {
    // 默认模型 = claude-sonnet-5（adaptive），思考可见
    const body = buildAnthropicMessagesBody({
      agentConfig: { key: "default-agent", apiKeyRef: "claude" },
      openAiBody: { messages: [{ role: "user", content: "Hi" }] },
    });
    expect(body.model).toBe("claude-sonnet-5");
    expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(body.output_config).toEqual({ effort: "medium" });
  });
});
