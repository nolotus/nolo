import { describe, expect, it } from "bun:test";
import { assertIsoTimestamp } from "./assertIsoTimestamp";

describe("assertIsoTimestamp pure seam", () => {
  it("accepts Date.parse-able ISO strings without throwing", () => {
    expect(() =>
      assertIsoTimestamp("createdAt", "2024-01-15T00:00:00.000Z"),
    ).not.toThrow();
    expect(() =>
      assertIsoTimestamp("effectiveFrom", "1970-01-01T00:00:00.000Z"),
    ).not.toThrow();
    expect(() => assertIsoTimestamp("createdAt", "2024-06-01")).not.toThrow();
  });

  it("throws with the field name on empty, whitespace, and garbage values", () => {
    expect(() => assertIsoTimestamp("createdAt", "")).toThrow(
      "createdAt must be an ISO timestamp",
    );
    expect(() => assertIsoTimestamp("effectiveAt", "   ")).toThrow(
      "effectiveAt must be an ISO timestamp",
    );
    expect(() => assertIsoTimestamp("effectiveTo", "not-a-date")).toThrow(
      "effectiveTo must be an ISO timestamp",
    );
    expect(() => assertIsoTimestamp("createdAt", "bogus")).toThrow(
      "createdAt must be an ISO timestamp",
    );
  });
});
