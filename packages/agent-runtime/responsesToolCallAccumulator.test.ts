import { describe, expect, test } from "bun:test";
import {
  applyResponsesToolEvent,
  createResponsesToolAccumulator,
  finalizeResponsesToolCalls,
} from "./responsesToolCallAccumulator";

describe("Responses tool-call accumulator", () => {
  test("ignores events without an identifier and filters nameless calls", () => {
    const calls = createResponsesToolAccumulator();
    applyResponsesToolEvent(calls, { type: "response.output_item.added", item: {} });
    expect(finalizeResponsesToolCalls(calls)).toEqual([]);
  });


  test("normalizes complete object arguments from output_item.done", () => {
    const calls = createResponsesToolAccumulator();
    applyResponsesToolEvent(calls, {
      type: "response.output_item.done",
      item: {
        id: "item-2",
        call_id: "call-2",
        type: "function_call",
        name: "execShell",
        arguments: { command: "printf 'TOOL_PROBE_OK\\n'" },
      },
    });
    expect(finalizeResponsesToolCalls(calls)).toEqual([{
      id: "call-2",
      type: "function",
      function: {
        name: "execShell",
        arguments: JSON.stringify({ command: "printf 'TOOL_PROBE_OK\\n'" }),
      },
    }]);
  });

  test("accepts complete object arguments on the arguments.done event", () => {
    const calls = createResponsesToolAccumulator();
    applyResponsesToolEvent(calls, {
      type: "response.output_item.added",
      item: { id: "item-3", call_id: "call-3", name: "execShell" },
    });
    applyResponsesToolEvent(calls, {
      type: "response.function_call_arguments.done",
      item_id: "item-3",
      arguments: { command: "pwd" },
    });
    expect(finalizeResponsesToolCalls(calls)[0]?.function.arguments).toBe(
      '{"command":"pwd"}',
    );
  });

  test("accepts item_id and top-level call_id argument events", () => {
    const calls = createResponsesToolAccumulator();
    applyResponsesToolEvent(calls, {
      type: "response.output_item.added",
      item: { id: "item-1", call_id: "call-1", name: "readFile" },
    });
    applyResponsesToolEvent(calls, {
      type: "response.function_call_arguments.delta",
      item_id: "item-1",
      delta: '{"path":"README.md"}',
    });
    expect(finalizeResponsesToolCalls(calls)).toEqual([{
      id: "call-1",
      type: "function",
      function: { name: "readFile", arguments: '{"path":"README.md"}' },
    }]);
  });
});
