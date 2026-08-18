import { describe, expect, it } from "bun:test";
import { isTransientNetworkError } from "./transientNetworkError";

describe("isTransientNetworkError pure seam", () => {
  it("rejects non-objects and empty errors", () => {
    expect(isTransientNetworkError(undefined)).toBe(false);
    expect(isTransientNetworkError(null)).toBe(false);
    expect(isTransientNetworkError("AbortError")).toBe(false);
    expect(isTransientNetworkError(new Error("network down"))).toBe(false);
    expect(isTransientNetworkError({})).toBe(false);
  });

  it("accepts AbortError by name (including DOMException-like shapes)", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(isTransientNetworkError(abort)).toBe(true);
    expect(isTransientNetworkError({ name: "AbortError" })).toBe(true);
  });

  it("accepts TypeError connection failures", () => {
    expect(isTransientNetworkError(new TypeError("fetch failed"))).toBe(true);
    expect(isTransientNetworkError(new TypeError("network error"))).toBe(true);
  });

  it("rejects other named errors", () => {
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    expect(isTransientNetworkError(timeout)).toBe(false);
    expect(isTransientNetworkError({ name: "Error" })).toBe(false);
  });
});
