import { describe, expect, it } from "bun:test";
import { toErrorMessage } from "./errorMessage";

describe("toErrorMessage pure seam", () => {
  it("returns Error.message for Error instances", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
    expect(toErrorMessage(new TypeError("bad type"))).toBe("bad type");
  });

  it("stringifies non-Error values", () => {
    expect(toErrorMessage("plain")).toBe("plain");
    expect(toErrorMessage(42)).toBe("42");
    expect(toErrorMessage(null)).toBe("null");
    expect(toErrorMessage(undefined)).toBe("undefined");
    expect(toErrorMessage(true)).toBe("true");
  });

  it("stringifies plain objects without message via String()", () => {
    expect(toErrorMessage({ code: "X" })).toBe("[object Object]");
  });

  it("prefers duck-typed string message on plain objects (ApiError shape)", () => {
    expect(
      toErrorMessage({
        code: "internal",
        message: "Cloudflare email route did not become ingress-ready in time",
      })
    ).toBe("Cloudflare email route did not become ingress-ready in time");
    expect(toErrorMessage({ message: 42 })).toBe("[object Object]");
    expect(toErrorMessage({ message: null })).toBe("[object Object]");
  });
});
