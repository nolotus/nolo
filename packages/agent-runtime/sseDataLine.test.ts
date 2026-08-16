import { describe, expect, it } from "bun:test";
import { parseSseDataLineJson, parseSseDataLineObject } from "./sseDataLine";

describe("parseSseDataLineJson pure seam", () => {
  it("parses JSON objects from data lines", () => {
    expect(parseSseDataLineJson('data: {"choices":[{"delta":{"content":"hi"}}]}')).toEqual({
      choices: [{ delta: { content: "hi" } }],
    });
  });

  it("tolerates leading whitespace and space after data:", () => {
    expect(parseSseDataLineJson('  data: {"a":1}  ')).toEqual({ a: 1 });
    expect(parseSseDataLineJson("data:{\"b\":2}")).toEqual({ b: 2 });
  });

  it("returns null for non-data lines, blank payloads, and [DONE]", () => {
    expect(parseSseDataLineJson("event: message")).toBeNull();
    expect(parseSseDataLineJson("id: 1")).toBeNull();
    expect(parseSseDataLineJson("")).toBeNull();
    expect(parseSseDataLineJson("   ")).toBeNull();
    expect(parseSseDataLineJson("data:")).toBeNull();
    expect(parseSseDataLineJson("data:   ")).toBeNull();
    expect(parseSseDataLineJson("data: [DONE]")).toBeNull();
    expect(parseSseDataLineJson("data:[DONE]")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseSseDataLineJson("data: {not-json")).toBeNull();
    expect(parseSseDataLineJson("data: {")).toBeNull();
  });

  it("preserves non-object JSON values", () => {
    expect(parseSseDataLineJson('data: "hello"')).toBe("hello");
    expect(parseSseDataLineJson("data: 42")).toBe(42);
    expect(parseSseDataLineJson("data: true")).toBe(true);
    expect(parseSseDataLineJson("data: []")).toEqual([]);
  });
});

describe("parseSseDataLineObject pure seam", () => {
  it("returns objects and arrays, rejects primitives and invalid lines", () => {
    expect(parseSseDataLineObject('data: {"type":"response.completed"}')).toEqual({
      type: "response.completed",
    });
    expect(parseSseDataLineObject("data: []")).toEqual([]);
    expect(parseSseDataLineObject("data: 42")).toBeNull();
    expect(parseSseDataLineObject('data: "x"')).toBeNull();
    expect(parseSseDataLineObject("data: [DONE]")).toBeNull();
    expect(parseSseDataLineObject("event: ping")).toBeNull();
  });
});
