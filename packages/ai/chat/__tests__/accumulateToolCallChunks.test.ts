
import { describe, it, expect } from "bun:test";
import {
    accumulateToolCallChunks,
    ToolCallChunk,
    AccumulatedToolCall,
} from "../accumulateToolCallChunks";

describe("accumulateToolCallChunks", () => {
    it("should handle empty input", () => {
        const result = accumulateToolCallChunks([], []);
        expect(result).toEqual([]);
    });

    it("should accumulate chunks with index", () => {
        const chunks: ToolCallChunk[] = [
            {
                index: 0,
                id: "call_1",
                type: "function",
                function: { name: "test_tool", arguments: "" },
            },
            {
                index: 0,
                function: { arguments: '{"arg":' },
            },
            {
                index: 0,
                function: { arguments: "1}" },
            },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            id: "call_1",
            type: "function",
            // The slot's wire index rides back out so the next delta can still
            // tell parallel calls apart; callers never forward it.
            index: 0,
            function: { name: "test_tool", arguments: '{"arg":1}' },
        });
    });

    it("should handle multiple interleaved calls with index", () => {
        const chunks: ToolCallChunk[] = [
            { index: 0, id: "call_1", type: "function", function: { name: "tool1", arguments: "" } },
            { index: 1, id: "call_2", type: "function", function: { name: "tool2", arguments: "" } },
            { index: 0, function: { arguments: "args1" } },
            { index: 1, function: { arguments: "args2" } },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(2);
        expect(result[0].function.arguments).toBe("args1");
        expect(result[1].function.arguments).toBe("args2");
    });

    it("should handle non-indexed chunks (OpenAI stream style)", () => {
        // Scenario: First chunk has ID, subsequent chunks append to it
        const chunks: ToolCallChunk[] = [
            { id: "call_a", type: "function", function: { name: "tool_a", arguments: "" } },
            { function: { arguments: "part1" } },
            { function: { arguments: "part2" } },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("call_a");
        expect(result[0].function.arguments).toBe("part1part2");
    });

    it("should handle non-indexed chunks with new ID (multiple calls sequentially)", () => {
        const existing: AccumulatedToolCall[] = [{
            id: "call_a",
            type: "function",
            function: { name: "tool_a", arguments: "{}" }
        }];

        const chunks: ToolCallChunk[] = [
            { id: "call_b", type: "function", function: { name: "tool_b", arguments: "" } },
            { function: { arguments: "{}" } },
        ];

        const result = accumulateToolCallChunks(existing, chunks);
        expect(result).toHaveLength(2);
        expect(result[1].id).toBe("call_b");
    });

    it("should handle chunk with index but missing function field initially", () => {
        const chunks: ToolCallChunk[] = [
            { index: 0, id: "call_1", type: "function" }, // Missing function field
            { index: 0, function: { arguments: "arg" } },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(1);
        expect(result[0].function.arguments).toBe("arg");
    });

    it("should handle object arguments (overwrite behavior)", () => {
        const chunks: ToolCallChunk[] = [
            { index: 0, id: "call_obj", type: "function", function: { name: "test", arguments: { initial: 1 } } },
            { index: 0, function: { arguments: { updated: 2 } } },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(1);
        expect(result[0].function.arguments).toEqual({ updated: 2 });
    });

    // Captured from https://opencode.ai/zen/go/v1 (gpt-5.6-luna): parallel
    // calls all arrive as index 0 and are told apart only by id. Slotting them
    // by index alone merged them into one garbled call.
    it("should split calls that reuse index 0 but carry distinct ids", () => {
        const chunks: ToolCallChunk[] = [
            { index: 0, id: "fc_a", type: "function", function: { name: "get_weather", arguments: "" } },
            { index: 0, function: { arguments: '{"city":"Beijing"}' } },
            { index: 0, id: "fc_b", type: "function", function: { name: "get_weather", arguments: "" } },
            { index: 0, function: { arguments: '{"city":"Shanghai"}' } },
        ];

        const result = accumulateToolCallChunks([], chunks);
        expect(result).toHaveLength(2);
        expect(result.map((c) => c.id)).toEqual(["fc_a", "fc_b"]);
        expect(result.map((c) => c.function.arguments)).toEqual([
            '{"city":"Beijing"}',
            '{"city":"Shanghai"}',
        ]);
    });

    it("should split index-0 calls across separate deltas too", () => {
        const first = accumulateToolCallChunks([], [
            { index: 0, id: "fc_a", type: "function", function: { name: "a", arguments: "1" } },
        ]);
        const second = accumulateToolCallChunks(first, [
            { index: 0, id: "fc_b", type: "function", function: { name: "b", arguments: "" } },
        ]);
        const third = accumulateToolCallChunks(second, [{ index: 0, function: { arguments: "2" } }]);

        expect(third).toHaveLength(2);
        expect(third.map((c) => c.function.arguments)).toEqual(["1", "2"]);
    });

    it("should keep a slot that has no name yet (still arriving)", () => {
        const result = accumulateToolCallChunks([], [
            { index: 0, id: "call_1", type: "function", function: { arguments: "{}" } },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0].function.name).toBe("");
    });

    it("should not mutate the snapshot it was given", () => {
        const existing = accumulateToolCallChunks([], [
            { index: 0, id: "call_1", type: "function", function: { name: "a", arguments: "1" } },
        ]);
        const snapshot = JSON.parse(JSON.stringify(existing));

        accumulateToolCallChunks(existing, [{ index: 0, function: { arguments: "2" } }]);

        expect(existing).toEqual(snapshot);
    });
});
