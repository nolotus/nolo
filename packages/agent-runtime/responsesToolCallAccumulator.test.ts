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
