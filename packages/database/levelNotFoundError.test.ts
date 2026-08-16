import { describe, expect, it } from "bun:test";
import { isLevelNotFoundError } from "./levelNotFoundError";

describe("isLevelNotFoundError pure seam", () => {
  it("returns false for non-objects and empty errors", () => {
    expect(isLevelNotFoundError(undefined)).toBe(false);
    expect(isLevelNotFoundError(null)).toBe(false);
    expect(isLevelNotFoundError("not found")).toBe(false);
    expect(isLevelNotFoundError(new Error("missing"))).toBe(false);
    expect(isLevelNotFoundError({})).toBe(false);
  });

  it("detects Level notFound flag", () => {
    expect(isLevelNotFoundError({ notFound: true })).toBe(true);
    expect(isLevelNotFoundError({ notFound: false })).toBe(false);
  });

  it("detects NotFoundError name", () => {
    expect(isLevelNotFoundError({ name: "NotFoundError" })).toBe(true);
    expect(isLevelNotFoundError({ name: "TypeError" })).toBe(false);
  });

  it("detects LEVEL_NOT_FOUND codes", () => {
    expect(isLevelNotFoundError({ code: "LEVEL_NOT_FOUND" })).toBe(true);
    expect(isLevelNotFoundError({ code: "LEVEL_NOT_FOUND_ERROR" })).toBe(true);
    expect(isLevelNotFoundError({ code: "EIO" })).toBe(false);
  });

  it("detects MemoryDB NotFound message shape", () => {
    expect(isLevelNotFoundError(new Error("NotFound"))).toBe(true);
    expect(isLevelNotFoundError({ message: "NotFound" })).toBe(true);
    expect(isLevelNotFoundError({ message: "Key not found" })).toBe(false);
    expect(isLevelNotFoundError({ message: "not found" })).toBe(false);
  });
});
