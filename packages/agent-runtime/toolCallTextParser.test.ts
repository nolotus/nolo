import { describe, expect, test } from "bun:test";
import {
  createToolCallTextParserState,
  processToolCallTextChunk,
  processContentChunkWithToolCallStripping,
  flushToolCallTextParser,
  tryParseToolCallText,
} from "./toolCallTextParser";

const OPEN = "\u003ctool_call\u003e";
const CLOSE = "\u003c/tool_call\u003e";

describe("processToolCallTextChunk", () => {
  test("passes through plain content unchanged", () => {
    const state = createToolCallTextParserState();
    const result = processToolCallTextChunk("hello world", state);
    expect(result.content).toBe("hello world");
    expect(result.toolCallTexts).toEqual([]);
  });

  test("strips a complete tool-call block from visible content", () => {
    const state = createToolCallTextParserState();
    const payload = OPEN + '{"name":"get_weather","arguments":"{}"}' + CLOSE;
    const result = processToolCallTextChunk("before " + payload + " after", state);
    expect(result.content).toBe("before  after");
    expect(result.toolCallTexts).toEqual(['{"name":"get_weather","arguments":"{}"}']);
  });

  test("handles tag split across chunk boundaries", () => {
    const state = createToolCallTextParserState();
    // First chunk ends mid-open-tag
    const r1 = processToolCallTextChunk("text " + OPEN.slice(0, 5), state);
    expect(r1.content).toBe("text ");
    // Second chunk completes the tag and the payload
    const r2 = processToolCallTextChunk(
      OPEN.slice(5) + '{"name":"fn","arguments":"{}"}' + CLOSE + " tail",
      r1.state,
    );
    expect(r2.toolCallTexts).toEqual(['{"name":"fn","arguments":"{}"}']);
    expect(r2.content).toBe(" tail");
  });

  test("buffers tool-call JSON payload split across chunk boundaries", () => {
    const state = createToolCallTextParserState();
    const payload = '{"name":"get_weather","arguments":"{}"}';
    // Chunk 1: open tag + first half of the JSON payload
    const r1 = processToolCallTextChunk(OPEN + payload.slice(0, 12), state);
    // Nothing parseable yet -- the payload is incomplete and must stay buffered,
    // NOT emitted as a partial fragment.
    expect(r1.toolCallTexts).toEqual([]);
    expect(r1.content).toBe("");
    // Chunk 2: rest of the payload + close tag
    const r2 = processToolCallTextChunk(payload.slice(12) + CLOSE + " done", r1.state);
    expect(r2.toolCallTexts).toEqual([payload]);
    expect(r2.content).toBe(" done");
  });

  test("delivers a tool call whose payload spans three chunks", () => {
    const state = createToolCallTextParserState();
    const payload = '{"name":"multi","arguments":"{}"}';
    const r1 = processToolCallTextChunk(OPEN + payload.slice(0, 5), state);
    const r2 = processToolCallTextChunk(payload.slice(5, 20), r1.state);
    const r3 = processToolCallTextChunk(payload.slice(20) + CLOSE, r2.state);
    expect(r1.toolCallTexts).toEqual([]);
    expect(r2.toolCallTexts).toEqual([]);
    expect(r3.toolCallTexts).toEqual([payload]);
  });

  test("handles multiple tool-call blocks in one chunk", () => {
    const state = createToolCallTextParserState();
    const block1 = OPEN + '{"name":"a","arguments":"{}"}' + CLOSE;
    const block2 = OPEN + '{"name":"b","arguments":"{}"}' + CLOSE;
    const result = processToolCallTextChunk("x" + block1 + "y" + block2 + "z", state);
    expect(result.content).toBe("xyz");
    expect(result.toolCallTexts).toEqual([
      '{"name":"a","arguments":"{}"}',
      '{"name":"b","arguments":"{}"}',
    ]);
  });

  test("buffers content-only tail that could be a partial tag", () => {
    const state = createToolCallTextParserState();
    // "hello<" — the "<" at the end could be the start of OPEN_TAG
    // so the parser keeps it in buffer (keep=1)
    const result = processToolCallTextChunk("hello<", state);
    expect(result.content).toBe("hello");
    expect(result.state.buffer).toBe("<");
  });
});

describe("flushToolCallTextParser", () => {
  test("flushes remaining content buffer when in content mode", () => {
    const state = createToolCallTextParserState();
    // "hello " — no suffix is a prefix of OPEN_TAG (which starts with "<"),
    // so the entire chunk goes to visible content and buffer is empty.
    processToolCallTextChunk("hello ", state);
    const flushed = flushToolCallTextParser(state);
    // Buffer was already emptied during processing, flush returns empty
    expect(flushed.content).toBe("");
    expect(flushed.toolCallTexts).toEqual([]);
  });

  test("flushes remaining tool-call text when toolcall block is unterminated", () => {
    // Feed a chunk that ends with "<" which could be the start of CLOSE_TAG.
    // The parser keeps "<" in buffer (keep=1), then flush returns it as toolCallText.
    const state = createToolCallTextParserState();
    const OPEN = "\u003ctool_call\u003e";
    const r = processToolCallTextChunk(OPEN + '{"name":"x","arguments":"{}"}<', state);
    // No close tag yet: the entire payload stays buffered (nothing emitted
    // mid-stream), including the trailing "<" that could start CLOSE_TAG.
    expect(r.toolCallTexts).toEqual([]);
    expect(r.state.buffer).toBe('{"name":"x","arguments":"{}"}<');
    expect(r.state.mode).toBe("toolcall");
    const flushed = flushToolCallTextParser(r.state);
    expect(flushed.content).toBe("");
    // Flush strips the trailing partial close-tag prefix and emits the JSON
    // so a stream cut right before the closing tag still delivers the call.
    expect(flushed.toolCallTexts).toEqual(['{"name":"x","arguments":"{}"}']);
  });
});

describe("tryParseToolCallText", () => {
  test("parses valid tool-call JSON with string arguments", () => {
    const result = tryParseToolCallText('{"name":"get_weather","arguments":"{\\"city\\":\\"Beijing\\"}"}');
    expect(result).not.toBeNull();
    expect(result!.name).toBe("get_weather");
  });

  test("parses valid tool-call JSON with object arguments", () => {
    const result = tryParseToolCallText('{"name":"get_weather","arguments":{"city":"Beijing"}}');
    expect(result).not.toBeNull();
    expect(result!.name).toBe("get_weather");
    expect(result!.arguments).toBe('{"city":"Beijing"}');
  });

  test("returns null for invalid JSON", () => {
    expect(tryParseToolCallText("not json")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(tryParseToolCallText("")).toBeNull();
    expect(tryParseToolCallText("   ")).toBeNull();
  });

  test("returns null when name field is missing", () => {
    expect(tryParseToolCallText('{"arguments":"{}"}')).toBeNull();
  });
});

describe("processContentChunkWithToolCallStripping", () => {
  test("fires the tool call exactly once when its JSON spans chunks", () => {
    const calls: Array<{ name: string; args: string }> = [];
    const onToolCall = (name: string, args: string) => calls.push({ name, args });
    const payload = '{"name":"search","arguments":"{}"}';

    let state = createToolCallTextParserState();
    const r1 = processContentChunkWithToolCallStripping("pre " + OPEN + payload.slice(0, 8), state, onToolCall);
    expect(calls).toEqual([]);
    expect(r1.cleanedContent).toBe("pre ");

    const r2 = processContentChunkWithToolCallStripping(payload.slice(8), r1.state, onToolCall);
    expect(calls).toEqual([]);

    const r3 = processContentChunkWithToolCallStripping(CLOSE + " post", r2.state, onToolCall);
    expect(calls).toEqual([{ name: "search", args: "{}" }]);
    expect(r3.cleanedContent).toBe(" post");
  });
});
