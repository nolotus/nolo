import { describe, expect, test } from "bun:test";
import {
  accumulateToolCallDelta,
  createToolCallAccumulator,
  finalizeAccumulatedToolCalls,
} from "./toolCallAccumulator";
import {
  applyChatCompletionDelta,
  flushChatCompletionStream,
  type ChatCompletionStreamState,
} from "./processChatCompletionDelta";
import { createThinkParserState } from "./thinkTagParser";
import { createToolCallTextParserState } from "./toolCallTextParser";

function makeState(
  overrides: Partial<ChatCompletionStreamState> = {},
): ChatCompletionStreamState {
  return {
    content: "",
    reasoning: "",
    usage: undefined,
    accumulatedToolCalls: createToolCallAccumulator(),
    thinkState: createThinkParserState(),
    toolCallTextState: createToolCallTextParserState(),
    ...overrides,
  };
}

describe("toolCallAccumulator", () => {
  test("concatenates function.name across chunks (superset of take-first)", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { index: 0, id: "c1", type: "function", function: { name: "read", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [
      { index: 0, function: { name: "File", arguments: "" } },
    ]);
    expect(acc.slots[0].function.name).toBe("readFile");
  });

  test("accumulates arguments in order and finalizes only named calls", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { index: 0, function: { name: "foo", arguments: '{"a":' } },
    ]);
    accumulateToolCallDelta(acc, [
      { index: 0, function: { arguments: "1}" } },
    ]);
    const out = finalizeAccumulatedToolCalls(acc);
    expect(out).toEqual([
      { id: "", type: "function", function: { name: "foo", arguments: '{"a":1}' } },
    ]);
  });

  test("disambiguates concurrent calls by index", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [{ index: 0, function: { name: "a", arguments: "" } }]);
    accumulateToolCallDelta(acc, [{ index: 1, function: { name: "b", arguments: "" } }]);
    expect(finalizeAccumulatedToolCalls(acc).map((c) => c.function.name)).toEqual(["a", "b"]);
  });

  test("disambiguates concurrent calls by id when upstream omits index", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { id: "fc_1", type: "function", function: { name: "loadSkill", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [{ function: { arguments: '{"name":"plan"}' } }]);
    accumulateToolCallDelta(acc, [
      { id: "fc_2", type: "function", function: { name: "loadSkill", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [{ function: { arguments: '{"name":"review"}' } }]);

    expect(finalizeAccumulatedToolCalls(acc)).toEqual([
      {
        id: "fc_1",
        type: "function",
        function: { name: "loadSkill", arguments: '{"name":"plan"}' },
      },
      {
        id: "fc_2",
        type: "function",
        function: { name: "loadSkill", arguments: '{"name":"review"}' },
      },
    ]);
  });

  // Captured from https://opencode.ai/zen/go/v1 (gpt-5.6-luna): every parallel
  // call streams as index 0, only the id changes, and the argument fragment
  // that follows carries neither a name nor an id.
  test("splits calls that reuse index 0 but carry distinct ids", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { index: 0, id: "fc_a", type: "function", function: { name: "get_weather", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [
      { index: 0, function: { arguments: '{"city":"Beijing"}' } },
    ]);
    accumulateToolCallDelta(acc, [
      { index: 0, id: "fc_b", type: "function", function: { name: "get_weather", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [
      { index: 0, function: { arguments: '{"city":"Shanghai"}' } },
    ]);

    expect(finalizeAccumulatedToolCalls(acc)).toEqual([
      {
        id: "fc_a",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Beijing"}' },
      },
      {
        id: "fc_b",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Shanghai"}' },
      },
    ]);
  });

  test("keeps interleaved indexed calls apart", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { index: 0, id: "fc_a", function: { name: "a", arguments: '{"x":' } },
      { index: 1, id: "fc_b", function: { name: "b", arguments: '{"y":' } },
    ]);
    accumulateToolCallDelta(acc, [{ index: 1, function: { arguments: "2}" } }]);
    accumulateToolCallDelta(acc, [{ index: 0, function: { arguments: "1}" } }]);

    expect(finalizeAccumulatedToolCalls(acc).map((c) => c.function.arguments)).toEqual([
      '{"x":1}',
      '{"y":2}',
    ]);
  });

  test("keeps the first id for a slot instead of overwriting it", () => {
    const acc = createToolCallAccumulator();
    accumulateToolCallDelta(acc, [
      { index: 0, id: "fc_1", function: { name: "read", arguments: "" } },
    ]);
    accumulateToolCallDelta(acc, [{ index: 0, id: "fc_1", function: { arguments: "{}" } }]);
    expect(acc.slots[0].id).toBe("fc_1");
  });
});

describe("applyChatCompletionDelta", () => {
  test("reads reasoning_content (DeepSeek) and invokes onReasoningDelta", () => {
    const reasoning: string[] = [];
    const state = makeState({ onReasoningDelta: (c) => reasoning.push(c) });
    applyChatCompletionDelta(
      { choices: [{ delta: { content: null, reasoning_content: "think" } }] },
      state,
    );
    expect(state.reasoning).toBe("think");
    expect(reasoning).toEqual(["think"]);
    expect(state.content).toBe("");
  });

  test("reads reasoning (Ollama/Qwen3)", () => {
    const state = makeState();
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "", reasoning: "ana" } }] },
      state,
    );
    expect(state.reasoning).toBe("ana");
  });

  test("splits inline <think> tags in content", () => {
    const reasoning: string[] = [];
    const state = makeState({ onReasoningDelta: (c) => reasoning.push(c) });
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "<think>reasoning</think>visible" } }] },
      state,
    );
    expect(state.reasoning).toBe("reasoning");
    expect(state.content).toBe("visible");
    expect(reasoning).toEqual(["reasoning"]);
  });

  test("accumulates tool calls", () => {
    const state = makeState();
    applyChatCompletionDelta(
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "x", function: { name: "f", arguments: "{}" } }] } }] },
      state,
    );
    expect(finalizeAccumulatedToolCalls(state.accumulatedToolCalls).length).toBe(1);
  });

  test("captures usage", () => {
    const state = makeState();
    applyChatCompletionDelta({ usage: { total_tokens: 5 }, choices: [{ delta: { content: "hi" } }] }, state);
    expect(state.usage).toEqual({ total_tokens: 5 });
  });

  test("returns false for objects without a delta", () => {
    const state = makeState();
    expect(applyChatCompletionDelta({ usage: {} }, state)).toBe(false);
  });
});

describe("flushChatCompletionStream", () => {
  test("flushes a trailing unclosed <think> buffer as reasoning", () => {
    const reasoning: string[] = [];
    const state = makeState({ onReasoningDelta: (c) => reasoning.push(c) });
    applyChatCompletionDelta({ choices: [{ delta: { content: "<think>unfinished" } }] }, state);
    flushChatCompletionStream(state);
    expect(state.reasoning).toBe("unfinished");
    expect(state.content).toBe("");
    expect(reasoning).toEqual(["unfinished"]);
  });
});
describe("applyChatCompletionDelta — Qwen3 tool-call text stripping", () => {
  const OPEN = "\u003ctool_call\u003e";
  const CLOSE = "\u003c/tool_call\u003e";
  const TOOL_CALL_JSON = '{"name":"get_weather","arguments":"{}"}';

  test("strips tool-call text markers from visible content", () => {
    const text: string[] = [];
    const state = makeState({ onTextDelta: (c) => text.push(c) });
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "before " + OPEN + TOOL_CALL_JSON + CLOSE + " after" } }] },
      state,
    );
    expect(state.content).toBe("before  after");
    // The tool call should be accumulated
    const finalized = finalizeAccumulatedToolCalls(state.accumulatedToolCalls);
    expect(finalized.length).toBe(1);
    expect(finalized[0].function.name).toBe("get_weather");
  });

  test("strips tool-call markers split across chunks", () => {
    const text: string[] = [];
    const state = makeState({ onTextDelta: (c) => text.push(c) });
    // Chunk 1: "answer " + partial open tag
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "answer " + OPEN.slice(0, 5) } }] },
      state,
    );
    // Chunk 2: rest of open tag + payload + close tag + " tail"
    applyChatCompletionDelta(
      { choices: [{ delta: { content: OPEN.slice(5) + TOOL_CALL_JSON + CLOSE + " tail" } }] },
      state,
    );
    flushChatCompletionStream(state);
    expect(state.content).toBe("answer  tail");
  });

  test("does not interfere with normal content without tool-call markers", () => {
    const text: string[] = [];
    const state = makeState({ onTextDelta: (c) => text.push(c) });
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "just normal text" } }] },
      state,
    );
    expect(state.content).toBe("just normal text");
    expect(text).toEqual(["just normal text"]);
  });

  test("still handles think tags alongside tool-call markers", () => {
    const text: string[] = [];
    const reasoning: string[] = [];
    const state = makeState({
      onTextDelta: (c) => text.push(c),
      onReasoningDelta: (c) => reasoning.push(c),
    });
    applyChatCompletionDelta(
      { choices: [{ delta: { content: "\u003cthink\u003ethinking\u003c/think\u003e " + OPEN + TOOL_CALL_JSON + CLOSE + " done" } }] },
      state,
    );
    flushChatCompletionStream(state);
    expect(state.reasoning).toBe("thinking");
    expect(state.content).toBe("  done");
  });
});

describe("applyChatCompletionDelta — multiple tool-call text blocks get distinct slots", () => {
  const OPEN = "\u003ctool_call\u003e";
  const CLOSE = "\u003c/tool_call\u003e";

  test("two consecutive tool-call blocks produce two separate tool calls", () => {
    const state = makeState();
    const block1 = OPEN + '{"name":"first","arguments":"{}"}' + CLOSE;
    const block2 = OPEN + '{"name":"second","arguments":"{}"}' + CLOSE;
    applyChatCompletionDelta(
      { choices: [{ delta: { content: block1 + block2 } }] },
      state,
    );
    const finalized = finalizeAccumulatedToolCalls(state.accumulatedToolCalls);
    expect(finalized.length).toBe(2);
    expect(finalized[0].function.name).toBe("first");
    expect(finalized[1].function.name).toBe("second");
  });
});
