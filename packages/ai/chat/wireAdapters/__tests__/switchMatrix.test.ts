import { describe, expect, test } from "bun:test";
import { responsesAdapter, completionsAdapter } from "../index";
import { anthropicAdapter } from "../anthropicAdapter";
import { codexAdapter } from "../codexAdapter";

const neutralMessages = [
  {
    role: "user",
    content: "Explain quantum computing",
  },
  {
    role: "assistant",
    content: "Quantum computing uses qubits...",
    reasoning_content: "First analyze superposition and entanglement...",
    tool_calls: [
      {
        id: "call_abc123",
        type: "function",
        function: {
          name: "web_search",
          arguments: '{"query":"qubit"}',
        },
      },
    ],
  },
  {
    role: "tool",
    tool_call_id: "call_abc123",
    content: '{"result":"qubits are quantum bits"}',
  },
];

describe("wireAdapters switch matrix", () => {
  test("responsesAdapter formats input array with reasoning item content", () => {
    const req = responsesAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "nolo", model: "deepseek-v4-flash" },
    });
    expect(Array.isArray(req.input)).toBe(true);

    const reasoningItem = (req.input as any[]).find((item) => item.type === "reasoning");
    expect(reasoningItem).toBeDefined();
    expect(reasoningItem.content).toEqual([
      {
        type: "reasoning_text",
        text: "First analyze superposition and entanglement...",
      },
    ]);
  });

  test("completionsAdapter formats messages array, stripping reasoning_content for deepseek models", () => {
    // DeepSeek model -> strip reasoning_content
    const dsReq = completionsAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "nolo", model: "deepseek-v4-flash" },
    });
    expect(Array.isArray(dsReq.messages)).toBe(true);
    const dsAssistantMsg = (dsReq.messages as any[]).find((m) => m.role === "assistant");
    expect(dsAssistantMsg.reasoning_content).toBeUndefined();

    // Non-DeepSeek model (openai) -> preserve reasoning_content
    const openAiReq = completionsAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "openai", model: "gpt-4o" },
    });
    const openAiAssistantMsg = (openAiReq.messages as any[]).find((m) => m.role === "assistant");
    expect(openAiAssistantMsg.reasoning_content).toBe(
      "First analyze superposition and entanglement...",
    );
  });

  test("completionsAdapter downgrades history tool_calls not in the current tools array", () => {
    // History has a web_search tool_call, but the current request declares a
    // different toolset (only `calculator`). ollama-like gateways reject
    // unknown tool names on inbound history with 400; the adapter must
    // downgrade the unmatched call + its result to text instead.
    const req = completionsAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "openai", model: "gpt-4o" },
      tools: [{ type: "function", function: { name: "calculator", parameters: {} } }],
    });
    const asst = (req.messages as any[]).find((m) => m.role === "assistant");
    // No structural tool_calls remain (web_search is not in the declared tools).
    expect(asst.tool_calls).toBeUndefined();
    // The tool_call and result are rendered as readable text.
    const allText = (req.messages as any[])
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    expect(allText).toContain("[tool_call: web_search(");
    expect(allText).toContain("[tool_result: ");
    // No role:tool message remains.
    expect((req.messages as any[]).find((m) => m.role === "tool")).toBeUndefined();
  });

  test("anthropicAdapter formats messages and system structure", () => {
    const req = anthropicAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "anthropic", model: "claude-3-5-sonnet-20241022", prompt: "Be helpful" },
    });
    expect(Array.isArray(req.system)).toBe(true);
    expect(Array.isArray(req.messages)).toBe(true);
    const assistantMsg = (req.messages as any[]).find((m) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.role).toBe("assistant");
  });

  test("responsesAdapter downgrades history tool_calls not in the current tools array", () => {
    // Same /switch replay scenario as completionsAdapter: history has a
    // web_search tool_call, but the current request declares only `calculator`.
    // The Responses wire (deepseek responses API) must not receive a
    // function_call for an undeclared tool — sanitizeForOutbound downgrades it
    // to text before convertMessagesToResponsesInput runs.
    const req = responsesAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "nolo", model: "deepseek-v4-flash" },
      tools: [{ type: "function", function: { name: "calculator", parameters: {} } }],
    });
    expect(Array.isArray(req.input)).toBe(true);
    const input = req.input as any[];
    // No structural function_call for the undeclared web_search
    const functionCalls = input.filter((i) => i.type === "function_call");
    expect(functionCalls).toHaveLength(0);
    // No orphan function_call_output for the now-downgraded tool result
    const functionOutputs = input.filter((i) => i.type === "function_call_output");
    expect(functionOutputs).toHaveLength(0);
    // The assistant message survives as text (downgraded), not dropped
    const assistantMessages = input.filter(
      (i) => i.type === "message" && i.role === "assistant",
    );
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  test("responsesAdapter preserves paired tool_call when tool is declared", () => {
    // When the current request DOES declare web_search, the paired
    // tool_call + tool result must survive sanitization structurally.
    const req = responsesAdapter.buildRequest({
      messages: neutralMessages,
      agent: { provider: "nolo", model: "deepseek-v4-flash" },
      tools: [{ type: "function", function: { name: "web_search", parameters: {} } }],
    });
    const input = req.input as any[];
    const functionCalls = input.filter((i) => i.type === "function_call");
    expect(functionCalls).toHaveLength(1);
    expect(functionCalls[0].name).toBe("web_search");
    const functionOutputs = input.filter((i) => i.type === "function_call_output");
    expect(functionOutputs).toHaveLength(1);
    expect(functionOutputs[0].call_id).toBe(functionCalls[0].call_id);
  });

  test("codexAdapter formats input array", () => {
    const req = codexAdapter.buildRequest({
      messages: neutralMessages,
      agent: { cliProvider: "codex", model: "gpt-5.5" },
    });
    expect(Array.isArray(req.input)).toBe(true);
  });

  test("normalizeUsage returns consistent output across all 4 adapters", () => {
    const rawResponsesUsage = { input_tokens: 120, output_tokens: 45 };
    const rawCompletionsUsage = { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 };
    const rawAnthropicUsage = { usage: { input_tokens: 120, output_tokens: 45 } };
    const rawCodexUsage = { input_tokens: 120, output_tokens: 45 };

    const normResponses = responsesAdapter.normalizeUsage(rawResponsesUsage);
    const normCompletions = completionsAdapter.normalizeUsage(rawCompletionsUsage);
    const normAnthropic = anthropicAdapter.normalizeUsage(rawAnthropicUsage);
    const normCodex = codexAdapter.normalizeUsage(rawCodexUsage);

    for (const norm of [normResponses, normCompletions, normAnthropic, normCodex]) {
      expect(norm).toBeDefined();
      expect(norm.prompt_tokens).toBe(120);
      expect(norm.completion_tokens).toBe(45);
    }
  });
});
