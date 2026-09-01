import { describe, expect, test } from "bun:test";
import type { AgentRuntimeChatMessage, AgentRuntimeToolCall } from "./types";
import { sanitizeOutboundHistory, sanitizeForOutbound, downgradeUnparsableToolCalls } from "./outboundHistorySanitize";

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

describe("unparsable-JSON-arguments poison defense", () => {
  // 真实案例（2026-09-01，RunInfra GLM 5.3 Flash）：并行双 tool_call 流式输出时，
  // 前一个 call 的 arguments 被截断（缺结尾 `"}]}`），JSON.parse 报 Unterminated
  // string。坏消息入存储历史后每轮请求被网关 400（messages[N].tool_calls[0].
  // function.arguments invalid JSON string）拒绝，dialog 永久死锁。
  const TRUNCATED_ARGS = JSON.stringify({ agentKey: "agent-x", task: "review the diff" }).slice(0, -3);

  test("downgradeUnparsableToolCalls: truncated call downgraded to text, healthy sibling kept", () => {
    const msgs = [
      user("dispatch review + optimization"),
      assistant("", {
        tool_calls: [
          { id: "call_bad", type: "function", function: { name: "startAgentRun", arguments: TRUNCATED_ARGS } },
          { id: "call_ok", type: "function", function: { name: "startAgentRun", arguments: '{"agentKey":"agent-y","task":"optimize ttft"}' } },
        ],
      }),
      tool("call_bad", "startAgentRun failed: 缺少 agentKey 参数。", "startAgentRun"),
      tool("call_ok", "run started #ip7vii", "startAgentRun"),
      user("继续"),
    ];
    const { messages: out, downgraded } = downgradeUnparsableToolCalls(msgs);
    expect(downgraded).toBe(1);
    // Bad call rendered as text, good call kept structural.
    const asst = out[1];
    expect(asst.tool_calls).toHaveLength(1);
    expect(asst.tool_calls?.[0]?.id).toBe("call_ok");
    expect(String(asst.content)).toContain("[tool_call: startAgentRun(");
    expect(String(asst.content)).toContain("review the dif");
    // Result of the downgraded call becomes an orphan → assistant text.
    expect(out[2].role).toBe("assistant");
    expect(String(out[2].content)).toContain("[tool_result: startAgentRun: startAgentRun failed");
    // Healthy result keeps its structural shape.
    expect(out[3].role).toBe("tool");
    expect(out[3].tool_call_id).toBe("call_ok");
  });

  test("no poison returns the input array by reference (zero-cost pass-through)", () => {
    const msgs = [
      user("hi"),
      assistant("", { tool_calls: toolCall("call_1", "exec_command", '{"command":"ls"}') }),
      tool("call_1", "ok", "exec_command"),
    ];
    const out = downgradeUnparsableToolCalls(msgs);
    expect(out.messages).toBe(msgs);
    expect(out.downgraded).toBe(0);
  });

  test("empty-string arguments pass through (parameterless calls are legitimate)", () => {
    const msgs = [
      assistant("", {
        tool_calls: [{ id: "c1", type: "function", function: { name: "no_args", arguments: "" } }],
      }),
      tool("c1", "done", "no_args"),
    ];
    const out = downgradeUnparsableToolCalls(msgs);
    expect(out.downgraded).toBe(0);
    expect(out.messages).toBe(msgs);
  });

  test("double-encoded JSON (parses to a string, not an object) is poison too", () => {
    const doubleEncoded = JSON.stringify(JSON.stringify({ path: "src/app.ts" }));
    const msgs = [
      assistant("", { tool_calls: toolCall("c1", "readFile", doubleEncoded) }),
      tool("c1", "contents", "readFile"),
    ];
    const { messages: out, downgraded } = downgradeUnparsableToolCalls(msgs);
    expect(downgraded).toBe(1);
    expect(out[0].tool_calls).toBeUndefined();
    expect(String(out[0].content)).toContain("[tool_call: readFile(");
    expect(out[1].role).toBe("assistant");
  });

  test("idempotent: second pass is a no-op", () => {
    const msgs = [
      assistant("", {
        tool_calls: [
          { id: "call_bad", type: "function", function: { name: "startAgentRun", arguments: TRUNCATED_ARGS } },
          { id: "call_ok", type: "function", function: { name: "startAgentRun", arguments: '{"task":"x"}' } },
        ],
      }),
      tool("call_bad", "err", "startAgentRun"),
      tool("call_ok", "ok", "startAgentRun"),
    ];
    const first = downgradeUnparsableToolCalls(msgs);
    const second = downgradeUnparsableToolCalls(first.messages);
    expect(second.downgraded).toBe(0);
    expect(second.messages).toEqual(first.messages);
  });

  test("sanitizeOutboundHistory also downgrades truncated arguments (cross-provider replay seam)", () => {
    const msgs = [
      assistant("", { tool_calls: toolCall("call_bad", "startAgentRun", TRUNCATED_ARGS) }),
      tool("call_bad", "err", "startAgentRun"),
    ];
    const out = sanitizeOutboundHistory(msgs);
    expect(out.find((m) => Array.isArray(m.tool_calls) && m.tool_calls.length > 0)).toBeUndefined();
    const allText = out.map((m) => (typeof m.content === "string" ? m.content : "")).join("\n");
    expect(allText).toContain("[tool_call: startAgentRun(");
    expect(allText).toContain("[tool_result: startAgentRun: err]");
  });

  test("sanitize keeps the healthy sibling of a poisoned call (no collateral downgrade)", () => {
    const msgs = [
      assistant("", {
        tool_calls: [
          { id: "call_bad", type: "function", function: { name: "startAgentRun", arguments: TRUNCATED_ARGS } },
          { id: "call_ok", type: "function", function: { name: "startAgentRun", arguments: '{"task":"optimize"}' } },
        ],
      }),
      tool("call_bad", "err", "startAgentRun"),
      tool("call_ok", "ok", "startAgentRun"),
    ];
    const out = sanitizeOutboundHistory(msgs);
    const asst = out[0];
    expect(asst.tool_calls).toHaveLength(1);
    expect(asst.tool_calls?.[0]?.id).toBe("call_ok");
    expect(String(asst.content)).toContain("[tool_call: startAgentRun(");
  });

  test("id-less poisoned call still pairs its result via the stable sanitize id", () => {
    const msgs = [
      user("dispatch"),
      assistant("", {
        tool_calls: [
          { type: "function", function: { name: "startAgentRun", arguments: TRUNCATED_ARGS } },
        ],
      }),
      tool("call_sanitize_1_0", "err", "startAgentRun"),
      user("继续"),
    ];
    const { messages: out, downgraded } = downgradeUnparsableToolCalls(msgs);
    expect(downgraded).toBe(1);
    expect(out[1].tool_calls).toBeUndefined();
    expect(String(out[1].content)).toContain("[tool_call: startAgentRun(");
    // Result paired through the derived stable id → downgraded, not dangling.
    expect(out[2].role).toBe("assistant");
    expect(String(out[2].content)).toContain("[tool_result: startAgentRun: err]");
  });

  test("non-string scalar arguments (number/boolean/null) are poison at the send seam", () => {
    const msgs = [
      assistant("", {
        tool_calls: [
          { id: "c1", type: "function", function: { name: "t", arguments: 42 as unknown as string } },
          { id: "c2", type: "function", function: { name: "t", arguments: null as unknown as string } },
          { id: "c3", type: "function", function: { name: "t", arguments: true as unknown as string } },
        ],
      }),
      tool("c1", "r1", "t"),
      tool("c2", "r2", "t"),
      tool("c3", "r3", "t"),
    ];
    const { messages: out, downgraded } = downgradeUnparsableToolCalls(msgs);
    expect(downgraded).toBe(3);
    expect(out[0].tool_calls).toBeUndefined();
    expect(out[1].role).toBe("assistant");
    expect(out[2].role).toBe("assistant");
    expect(out[3].role).toBe("assistant");
  });

  test("object-form and absent arguments pass through (normalized downstream)", () => {
    const msgs = [
      assistant("", {
        tool_calls: [
          { id: "c1", type: "function", function: { name: "t", arguments: { a: 1 } as unknown as string } },
          { id: "c2", type: "function", function: { name: "t", arguments: undefined as unknown as string } },
        ],
      }),
      tool("c1", "r1", "t"),
      tool("c2", "r2", "t"),
    ];
    const out = downgradeUnparsableToolCalls(msgs);
    expect(out.downgraded).toBe(0);
    expect(out.messages).toBe(msgs);
  });
});