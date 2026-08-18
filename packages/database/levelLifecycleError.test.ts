import { describe, expect, it } from "bun:test";
import { isLevelLifecycleError } from "./levelLifecycleError";

describe("isLevelLifecycleError pure seam", () => {
  it("returns false for non-objects and empty errors", () => {
    expect(isLevelLifecycleError(undefined)).toBe(false);
    expect(isLevelLifecycleError(null)).toBe(false);
    expect(isLevelLifecycleError("closed")).toBe(false);
    expect(isLevelLifecycleError(new Error("not open"))).toBe(false);
    expect(isLevelLifecycleError({})).toBe(false);
  });

  it("detects LEVEL_DATABASE_NOT_OPEN", () => {
    expect(isLevelLifecycleError({ code: "LEVEL_DATABASE_NOT_OPEN" })).toBe(
      true,
    );
  });

  it("detects LEVEL_ITERATOR_NOT_OPEN", () => {
    expect(isLevelLifecycleError({ code: "LEVEL_ITERATOR_NOT_OPEN" })).toBe(
      true,
    );
  });

  it("rejects other Level and unrelated codes", () => {
    expect(isLevelLifecycleError({ code: "LEVEL_NOT_FOUND" })).toBe(false);
    expect(isLevelLifecycleError({ code: "LEVEL_LOCKED" })).toBe(false);
    expect(isLevelLifecycleError({ code: "EIO" })).toBe(false);
    expect(isLevelLifecycleError({ notFound: true })).toBe(false);
  });
});
