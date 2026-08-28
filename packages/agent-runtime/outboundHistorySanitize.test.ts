import { describe, expect, test } from "bun:test";
import type { AgentRuntimeChatMessage, AgentRuntimeToolCall } from "./types";
import { sanitizeOutboundHistory, sanitizeForOutbound } from "./outboundHistorySanitize";

const toolCall = (
  id: string,
  name: string,
  args: string | object = "{}",
): AgentRuntimeToolCall[] => {
  return [
    {
      id,
      type: "function",
      function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) },
    },
  ];
};

function assistant(content: string, extra: Partial<AgentRuntimeChatMessage> = {}): AgentRuntimeChatMessage {
  return { role: "assistant", content, ...extra };
}
function user(content: string): AgentRuntimeChatMessage {
  return { role: "user", content };
}
function tool(id: string, content: string, name = "tool"): AgentRuntimeChatMessage {
  return { role: "tool", content, tool_call_id: id, toolName: name };
}

describe("sanitizeOutboundHistory", () => {
  test("passes through plain user/assistant messages unchanged", () => {
    const msgs = [user("hi"), assistant("hello")];
    expect(sanitizeOutboundHistory(msgs)).toEqual(msgs);
  });

  test("preserves reasoning_content (strip is the wire converter's job, not sanitize's)", () => {
    const msgs = [user("q"), assistant("a", { reasoning_content: "thinking..." })];
    // sanitize never strips reasoning_content — the wire converter
    // (toOpenAiCompatibleMessages / convertMessagesToResponsesInput) applies
    // the per-provider policy. Here it is always preserved regardless of
    // declaredToolNames.
    const out = sanitizeOutboundHistory(msgs);
    expect(out[1].reasoning_content).toBe("thinking...");
  });

  test("downgrades undeclared tool_calls to text (ollama reject #2)", () => {
    // History has a web_search tool_call, but the current request declares no
    // tools (or a different toolset). ollama rejects unknown tool names on
    // inbound history with 400. The call must be downgraded to text.
    const msgs = [
      user("search for qubits"),
      assistant("", { tool_calls: toolCall("call_1", "web_search", '{"query":"qubit"}') }),
      tool("call_1", '{"result":"qubits are quantum bits"}', "web_search"),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(), // empty set = no tools declared this turn
    });
    // No structural tool_calls remain.
    expect(out.find((m) => Array.isArray(m.tool_calls) && m.tool_calls.length > 0)).toBeUndefined();
    // The tool_call and its result are rendered as readable text.
    const allText = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).toContain("[tool_call: web_search(");
    expect(allText).toContain("[tool_result: web_search:");
    // No role:tool message remains.
    expect(out.find((m) => m.role === "tool")).toBeUndefined();
  });

  test("keeps declared tool_calls structurally (name in declaredToolNames)", () => {
    const msgs = [
      user("search for qubits"),
      assistant("", { tool_calls: toolCall("call_1", "web_search", '{"query":"qubit"}') }),
      tool("call_1", '{"result":"qubits"}', "web_search"),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["web_search"]),
    });
    const asst = out.find((m) => m.role === "assistant" && Array.isArray(m.tool_calls));
    expect(asst).toBeDefined();
    expect(asst?.tool_calls?.[0].function.name).toBe("web_search");
    expect(out.find((m) => m.role === "tool")).toBeDefined();
    expect(out.find((m) => m.role === "tool")?.tool_call_id).toBe("call_1");
  });

  test("normalizes object arguments to string (ollama expects string arguments)", () => {
    const callWithObjectArgs = [
      {
        id: "call_1",
        type: "function",
        function: { name: "web_search", arguments: { query: "qubit" } },
      },
    ];
    const msgs = [
      user("q"),
      assistant("", { tool_calls: callWithObjectArgs as any }),
      tool("call_1", "{}", "web_search"),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["web_search"]),
    });
    const asst = out.find((m) => Array.isArray(m.tool_calls))!;
    expect(typeof asst.tool_calls![0].function.arguments).toBe("string");
    expect(asst.tool_calls![0].function.arguments).toBe('{"query":"qubit"}');
  });

  test("tool_call missing id with no idable tool result is downgraded to text (dangling)", () => {
    const callNoId = [
      { type: "function", function: { name: "web_search", arguments: "{}" } },
    ];
    const msgs = [
      user("q"),
      assistant("", { tool_calls: callNoId as any }),
      // tool result ALSO missing id — no reliable pairing key, so the call is
      // dangling and must be downgraded to text (not kept structurally).
      { role: "tool", content: "{}", toolName: "web_search" } as AgentRuntimeChatMessage,
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["web_search"]),
    });
    // No structural tool_calls remain (dangling → text).
    expect(out.find((m) => Array.isArray(m.tool_calls))).toBeUndefined();
    expect(out.find((m) => m.role === "tool")).toBeUndefined();
    const text = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(text).toContain("[tool_call: web_search(");
    expect(text).toContain("[tool_result: web_search:");
  });

  test("mints stable id for tool_call missing id when the result carries the same stable id", () => {
    // If the tool result ALSO lacks an id but the producer stored the pairing
    // via the same stable-id convention, the pairing still works. This is the
    // rare happy path; the common missing-id case is the downgrade above.
    const callNoId = [
      { type: "function", function: { name: "web_search", arguments: "{}" } },
    ];
    const stableId = "call_sanitize_1_0"; // asst index 1, call index 0
    const msgs = [
      user("q"),
      assistant("", { tool_calls: callNoId as any }),
      { role: "tool", content: "{}", tool_call_id: stableId, toolName: "web_search" } as AgentRuntimeChatMessage,
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["web_search"]),
    });
    const asst = out.find((m) => Array.isArray(m.tool_calls))!;
    expect(asst.tool_calls![0].id).toBe(stableId);
    const toolMsg = out.find((m) => m.role === "tool")!;
    expect(toolMsg.tool_call_id).toBe(stableId);
  });

  test("downgrades orphan tool result (no matching tool_call) to text", () => {
    const msgs = [
      user("q"),
      assistant("a"),
      // tool result with no preceding tool_call and unknown id
      tool("orphan_1", '{"x":1}', "calc"),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["calc"]),
    });
    expect(out.find((m) => m.role === "tool")).toBeUndefined();
    const text = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(text).toContain("[tool_result: calc:");
  });

  test("downgrades ALL history tool_calls when tools is an empty array (the /switch 400 root cause)", () => {
    // The exact root-cause scenario: after /switch to a model whose current
    // request declares NO tools (tools: []), every history tool_call must be
    // downgraded to text. extractDeclaredToolNames([]) returns an empty Set
    // (NOT undefined), so sanitize filters every call. ollama would otherwise
    // reject the structural tool_calls with 400 invalid tool call arguments.
    const msgs = [
      user("search qubits"),
      assistant("", { tool_calls: toolCall("call_1", "web_search", '{"q":"qubit"}') }),
      tool("call_1", '{"r":"qubits"}', "web_search"),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(), // empty set = no tools declared
    });
    expect(out.find((m) => Array.isArray(m.tool_calls) && m.tool_calls.length > 0)).toBeUndefined();
    expect(out.find((m) => m.role === "tool")).toBeUndefined();
    const text = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(text).toContain("[tool_call: web_search(");
    expect(text).toContain("[tool_result: web_search:");
  });

  test("downgrades kept tool_call when its matching tool result is missing (ollama mismatch 400)", () => {
    // A declared tool_call (in declaredToolNames) with NO following tool result
    // would leave a structural tool_calls with no result — ollama rejects with
    // "mismatch between tool calls and tool results". Downgrade the dangling
    // call to text so the history stays gateway-safe.
    const msgs = [
      user("q"),
      assistant("", { tool_calls: toolCall("call_1", "web_search", '{"q":"x"}') }),
      // NO tool result follows — dangling.
      assistant("based on the search, ..."),
    ];
    const out = sanitizeOutboundHistory(msgs, {
      declaredToolNames: new Set(["web_search"]),
    });
    expect(out.find((m) => Array.isArray(m.tool_calls))).toBeUndefined();
    const text = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(text).toContain("[tool_call: web_search(");
  });

  test("idempotent: sanitize(sanitize(x)) === sanitize(x)", () => {
    const msgs = [
      user("search qubits"),
      assistant("", { reasoning_content: "thinking", tool_calls: toolCall("call_1", "web_search", '{"q":"qubit"}') }),
      tool("call_1", '{"r":"qubits"}', "web_search"),
      assistant("done"),
      // orphan
      tool("orphan", "{}", "calc"),
    ];
    const opts = { declaredToolNames: new Set(["web_search"]) };
    const once = sanitizeOutboundHistory(msgs, opts);
    const twice = sanitizeOutboundHistory(once, opts);
    expect(twice).toEqual(once);
  });

  test("empty input returns empty", () => {
    expect(sanitizeOutboundHistory([])).toEqual([]);
  });

  test("sanitizeForOutbound combines extractDeclaredToolNames + sanitize (empty tools array downgrades all)", () => {
    // The high-level wrapper used by all 3 outbound seams. An empty tools
    // array means "no tools declared" → every history tool_call downgrades.
    // (extractDeclaredToolNames([]) returns empty Set, not undefined.)
    const msgs = [
      user("q"),
      assistant("", { tool_calls: toolCall("c1", "web_search", '{"q":"x"}') }),
      tool("c1", "{}", "web_search"),
    ];
    const out = sanitizeForOutbound(msgs, []);
    expect(out.find((m) => Array.isArray(m.tool_calls))).toBeUndefined();
    expect(out.find((m) => m.role === "tool")).toBeUndefined();
    const text = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(text).toContain("[tool_call: web_search(");
  });

  test("sanitizeForOutbound with undefined tools keeps declared-by-name calls (pass-through)", () => {
    const msgs = [
      user("q"),
      assistant("", { tool_calls: toolCall("c1", "web_search", '{"q":"x"}') }),
      tool("c1", '{"r":"x"}', "web_search"),
    ];
    // undefined tools = caller has no tools concept → no name filter.
    const out = sanitizeForOutbound(msgs, undefined);
    expect(out.find((m) => Array.isArray(m.tool_calls))).toBeDefined();
  });
});