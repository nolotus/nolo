import { describe, expect, it } from "bun:test";
import { applyDelta } from "./sendOpenAICompletionsRequest.native";
import { createThinkParserState } from "agent-runtime/thinkTagParser";
import { createToolCallTextParserState } from "agent-runtime/toolCallTextParser";

/**
 * Providers disagree on the field name for streamed thinking:
 *   DeepSeek official -> delta.reasoning_content
 *   Ollama Cloud, Qwen3 -> delta.reasoning
 *
 * The native path previously read only the first, so every platform-hosted
 * model's thinking was silently dropped on React Native while the web path
 * showed it. These tests pin both spellings.
 */
const baseState = () => ({
  contentBuffer: [],
  totalUsage: null,
  accumulatedToolCalls: [],
  reasoningBuffer: "",
  thinkState: createThinkParserState(),
  toolCallTextState: createToolCallTextParserState(),
  assistantToolCalls: undefined,
  hasHandedOff: false,
  hasProcessedToolCalls: false,
  alreadyFinalized: false,
  finishReason: null,
});

describe("applyDelta reasoning field", () => {
  it("accumulates DeepSeek's reasoning_content", () => {
    const { state } = applyDelta(baseState() as any, {
      reasoning_content: "step one",
    });
    expect(state.reasoningBuffer).toBe("step one");
  });

  it("accumulates Ollama's reasoning", () => {
    const { state } = applyDelta(baseState() as any, { reasoning: "step one" });
    expect(state.reasoningBuffer).toBe("step one");
  });

  it("appends across chunks rather than replacing", () => {
    const first = applyDelta(baseState() as any, { reasoning: "abc" }).state;
    const second = applyDelta(first, { reasoning: "def" }).state;
    expect(second.reasoningBuffer).toBe("abcdef");
  });

  it("prefers reasoning_content when a provider sends both", () => {
    const { state } = applyDelta(baseState() as any, {
      reasoning_content: "canonical",
      reasoning: "duplicate",
    });
    expect(state.reasoningBuffer).toBe("canonical");
  });

  it("leaves the buffer untouched when neither field is present", () => {
    const { state } = applyDelta(baseState() as any, { content: "hello" });
    expect(state.reasoningBuffer).toBe("");
  });

  it("treats an empty reasoning string as nothing to append", () => {
    const { state } = applyDelta(baseState() as any, { reasoning: "" });
    expect(state.reasoningBuffer).toBe("");
  });
});
