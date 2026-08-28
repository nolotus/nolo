import { describe, expect, test } from "bun:test";

import { parseToolArgumentsJson } from "./parseToolArguments";

describe("parseToolArgumentsJson", () => {
  test("parses a plain object payload", () => {
    expect(parseToolArgumentsJson('{"command":"ls","path":"/tmp"}')).toEqual({
      command: "ls",
      path: "/tmp",
    });
  });

  test("returns empty object for nullish or blank input", () => {
    expect(parseToolArgumentsJson(undefined)).toEqual({});
    expect(parseToolArgumentsJson(null)).toEqual({});
    expect(parseToolArgumentsJson("")).toEqual({});
    expect(parseToolArgumentsJson("   ")).toEqual({});
  });

  test("rejects non-object JSON (arrays, primitives, null)", () => {
    expect(parseToolArgumentsJson("[]")).toEqual({});
    expect(parseToolArgumentsJson('"hello"')).toEqual({});
    expect(parseToolArgumentsJson("42")).toEqual({});
    expect(parseToolArgumentsJson("null")).toEqual({});
    expect(parseToolArgumentsJson("true")).toEqual({});
  });

  test("returns empty object on malformed JSON", () => {
    expect(parseToolArgumentsJson("{not-json")).toEqual({});
    expect(parseToolArgumentsJson("{")).toEqual({});
  });
});
