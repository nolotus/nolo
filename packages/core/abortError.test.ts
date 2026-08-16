import { describe, expect, it } from "bun:test";
import { isAbortError } from "./abortError";

describe("isAbortError pure seam", () => {
  it("rejects non-objects and non-abort names", () => {
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(new Error("aborted"))).toBe(false);
    expect(isAbortError({ name: "TimeoutError" })).toBe(false);
    expect(isAbortError({})).toBe(false);
  });

  it("detects Error and DOMException AbortError names", () => {
    const err = new Error("The operation was aborted.");
    err.name = "AbortError";
    expect(isAbortError(err)).toBe(true);
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
  });

  it("detects plain object abort shapes", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
  });
});
