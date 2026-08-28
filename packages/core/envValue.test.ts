import { describe, expect, it } from "bun:test";
import { parseEnvBoolean, parseEnvNumber } from "./envValue";

describe("parseEnvBoolean pure seam", () => {
  it("returns fallback for missing or empty values", () => {
    expect(parseEnvBoolean(undefined, true)).toBe(true);
    expect(parseEnvBoolean(undefined, false)).toBe(false);
    expect(parseEnvBoolean("", true)).toBe(true);
    expect(parseEnvBoolean("", false)).toBe(false);
  });

  it("treats common falsy env tokens as false", () => {
    expect(parseEnvBoolean("0", true)).toBe(false);
    expect(parseEnvBoolean("false", true)).toBe(false);
    expect(parseEnvBoolean("FALSE", true)).toBe(false);
    expect(parseEnvBoolean("off", true)).toBe(false);
    expect(parseEnvBoolean("No", true)).toBe(false);
  });

  it("treats other non-empty tokens as true", () => {
    expect(parseEnvBoolean("1", false)).toBe(true);
    expect(parseEnvBoolean("true", false)).toBe(true);
    expect(parseEnvBoolean("yes", false)).toBe(true);
    expect(parseEnvBoolean("on", false)).toBe(true);
  });
});

describe("parseEnvNumber pure seam", () => {
  it("returns fallback for missing or non-finite values", () => {
    expect(parseEnvNumber(undefined, 10)).toBe(10);
    expect(parseEnvNumber("abc", 10)).toBe(10);
    expect(parseEnvNumber("NaN", 10)).toBe(10);
    expect(parseEnvNumber("Infinity", 10)).toBe(10);
  });

  it("floors finite values and clamps to min (default 1)", () => {
    // Number("") === 0, which is finite → clamp to min (preserves prior env readers)
    expect(parseEnvNumber("", 10)).toBe(1);
    expect(parseEnvNumber("3.9", 10)).toBe(3);
    expect(parseEnvNumber("0", 10)).toBe(1);
    expect(parseEnvNumber("-5", 10)).toBe(1);
    expect(parseEnvNumber("42", 10)).toBe(42);
  });

  it("honors a custom min floor", () => {
    expect(parseEnvNumber("2", 10, 5)).toBe(5);
    expect(parseEnvNumber("9", 10, 5)).toBe(9);
    expect(parseEnvNumber("1.2", 10, 0)).toBe(1);
  });
});
