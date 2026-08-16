import { describe, expect, test } from "bun:test";
import {
  createDsmlParserState,
  finishDsml,
  parseDsml,
  pushDsmlChunk,
} from "./deepseekDsmlParser";

describe("deepseek DSML parser", () => {
  test("parses readFile file alias and removes protocol markers", () => {
    expect(parseDsml(
      'before <｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="readFile"><｜｜DSML｜｜parameter string="true" name="file">README.md</｜｜DSML｜｜parameter></｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>',
    )).toEqual({
      content: "before ",
      toolCalls: [{ name: "readFile", arguments: '{"path":"README.md"}' }],
    });
  });

  test("handles tags split across chunks", () => {
    const state = createDsmlParserState();
    expect(pushDsmlChunk("hello <｜｜DSML｜｜tool_", state)).toEqual({
      content: "hello ",
      toolCalls: [],
    });
    expect(pushDsmlChunk("calls><｜｜DSML｜｜invoke name=\"ping\"></｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>", state)).toEqual({
      content: "",
      toolCalls: [{ name: "ping", arguments: "{}" }],
    });
    expect(finishDsml(state)).toEqual({ content: "", toolCalls: [] });
  });
});
