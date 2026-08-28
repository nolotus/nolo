import { describe, expect, test } from "bun:test";

import {
  createThinkParserState,
  extractThinkContent,
  flushThinkParser,
  processThinkChunk,
  type ThinkParseState,
} from "./thinkTagParser";

describe("extractThinkContent", () => {
  test("returns content unchanged when no think tags are present", () => {
    expect(extractThinkContent("hello world")).toEqual({
      content: "hello world",
    });
  });

  test("extracts a single think block and strips it from content", () => {
    const input = "<think>\nreasoning\n</think>\nanswer";
    expect(extractThinkContent(input)).toEqual({
      content: "answer",
      reasoning: "\nreasoning\n",
    });
  });

  test("extracts multiple think blocks joined by newlines", () => {
    const input = "<think>a</think> <think>b</think>";
    expect(extractThinkContent(input)).toEqual({
      content: " ",
      reasoning: "a\nb",
    });
  });

  test("trims only one leading newline from visible content", () => {
    expect(extractThinkContent("<think></think>\n\nhi")).toEqual({
      content: "\nhi",
      reasoning: "",
    });
  });
});

describe("processThinkChunk", () => {
  test("emits content before any think tag", () => {
    const state = createThinkParserState();
    expect(processThinkChunk("hello ", state)).toEqual({
      content: "hello ",
      reasoning: "",
      state: { mode: "content", buffer: "", trimNextVisible: false },
    });
  });

  test("routes content inside think tags to reasoning", () => {
    let state = createThinkParserState();
    state = processThinkChunk("<think>", state).state;
    const result = processThinkChunk("reasoning</think>\nanswer", state);
    expect(result).toEqual({
      content: "answer",
      reasoning: "reasoning",
      state: { mode: "content", buffer: "", trimNextVisible: false },
    });
  });

  test("buffers partial open tags across chunks", () => {
    let state = createThinkParserState();
    state = processThinkChunk("hello <thi", state).state;
    expect(state).toEqual({ mode: "content", buffer: "<thi", trimNextVisible: false });
    const result = processThinkChunk("nk>reason", state);
    expect(result.reasoning).toBe("reason");
    expect(result.content).toBe("");
  });

  test("buffers partial close tags across chunks", () => {
    let state = createThinkParserState();
    const first = processThinkChunk("<think>reason</thi", state);
    expect(first.reasoning).toBe("reason");
    expect(first.state.mode).toBe("reasoning");
    const second = processThinkChunk("nk>\nvisible", first.state);
    expect(second.reasoning).toBe("");
    expect(second.content).toBe("visible");
  });

  test("trims leading newline only right after closing think tag", () => {
    let state = createThinkParserState();
    state = processThinkChunk("<think></think>", state).state;
    expect(state.trimNextVisible).toBe(true);
    const result = processThinkChunk("\n\nhello", state);
    expect(result.content).toBe("\nhello");
    expect(result.state.trimNextVisible).toBe(false);
  });

  test("does not trim leading newline for normal content", () => {
    const state = createThinkParserState();
    const result = processThinkChunk("\nhello", state);
    expect(result.content).toBe("\nhello");
  });
});
describe("flushThinkParser", () => {
  test("flushes remaining visible content", () => {
    const state: ThinkParseState = { mode: "content", buffer: "hello", trimNextVisible: false };
    expect(flushThinkParser(state)).toEqual({
      content: "hello",
      reasoning: "",
      state: { mode: "content", buffer: "", trimNextVisible: false },
    });
  });

  test("flushes remaining reasoning content", () => {
    const state: ThinkParseState = { mode: "reasoning", buffer: "reason", trimNextVisible: false };
    expect(flushThinkParser(state)).toEqual({
      content: "",
      reasoning: "reason",
      state: { mode: "content", buffer: "", trimNextVisible: false },
    });
  });

  test("applies trim flag when flushing visible content", () => {
    const state: ThinkParseState = { mode: "content", buffer: "\n", trimNextVisible: true };
    expect(flushThinkParser(state)).toEqual({
      content: "",
      reasoning: "",
      state: { mode: "content", buffer: "", trimNextVisible: false },
    });
  });
});
