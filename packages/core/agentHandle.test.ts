import { describe, expect, it } from "bun:test";
import { normalizeAgentHandle } from "./agentHandle";

describe("normalizeAgentHandle pure seam", () => {
  it("rejects non-strings", () => {
    expect(normalizeAgentHandle(undefined)).toBeUndefined();
    expect(normalizeAgentHandle(null)).toBeUndefined();
    expect(normalizeAgentHandle(0)).toBeUndefined();
    expect(normalizeAgentHandle(1)).toBeUndefined();
    expect(normalizeAgentHandle(true)).toBeUndefined();
    expect(normalizeAgentHandle({})).toBeUndefined();
    expect(normalizeAgentHandle([])).toBeUndefined();
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(normalizeAgentHandle("")).toBeUndefined();
    expect(normalizeAgentHandle(" ")).toBeUndefined();
    expect(normalizeAgentHandle("\t\n")).toBeUndefined();
  });

  it("lowercases and collapses interior whitespace", () => {
    expect(normalizeAgentHandle("Alice")).toBe("alice");
    expect(normalizeAgentHandle("  Alice  ")).toBe("alice");
    expect(normalizeAgentHandle("Foo   Bar")).toBe("foo bar");
    expect(normalizeAgentHandle("FOO\t\tBAR\nBAZ")).toBe("foo bar baz");
  });
});
