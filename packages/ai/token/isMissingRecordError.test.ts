import { describe, expect, it } from "bun:test";
import { isMissingRecordError } from "./isMissingRecordError";

describe("isMissingRecordError pure seam", () => {
  it("returns false for non-objects and empty errors", () => {
    expect(isMissingRecordError(undefined)).toBe(false);
    expect(isMissingRecordError(null)).toBe(false);
    expect(isMissingRecordError("not found")).toBe(false);
    expect(isMissingRecordError(new Error("missing"))).toBe(false);
    expect(isMissingRecordError({})).toBe(false);
  });

  it("detects LEVEL_NOT_FOUND and NOT_FOUND codes", () => {
    expect(isMissingRecordError({ code: "LEVEL_NOT_FOUND" })).toBe(true);
    expect(isMissingRecordError({ code: "NOT_FOUND" })).toBe(true);
    expect(isMissingRecordError({ code: "EIO" })).toBe(false);
    expect(isMissingRecordError({ code: "LEVEL_NOT_FOUND_ERROR" })).toBe(false);
  });

  it("detects NotFound message used by some store shims", () => {
    expect(isMissingRecordError({ message: "NotFound" })).toBe(true);
    expect(isMissingRecordError({ message: "Key not found" })).toBe(false);
    expect(isMissingRecordError({ message: "not found" })).toBe(false);
  });

  it("accepts combined code + message shapes", () => {
    expect(
      isMissingRecordError({ code: "LEVEL_NOT_FOUND", message: "NotFound" }),
    ).toBe(true);
    expect(
      isMissingRecordError({ code: "OTHER", message: "something else" }),
    ).toBe(false);
  });
});
