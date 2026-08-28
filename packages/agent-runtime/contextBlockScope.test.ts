import { describe, expect, test } from "bun:test";
import {
  normalizeContextBlockScopes,
  type ContextBlockScope,
} from "./contextBlockScope";

describe("normalizeContextBlockScopes", () => {
  test("scoped blocks are authoritative and ignore legacy contextBlocks", () => {
    const scopes: ContextBlockScope[] = [
      { content: "session-block", cacheScope: "session" },
      { content: "turn-block", cacheScope: "turn" },
    ];
    const result = normalizeContextBlockScopes(
      ["legacy-should-be-ignored"],
      scopes,
    );
    expect(result).toEqual(scopes);
    expect(result).not.toContain(
      expect.objectContaining({ content: "legacy-should-be-ignored" }),
    );
  });

  test("legacy contextBlocks are converted to turn-scope blocks", () => {
    const result = normalizeContextBlockScopes(["A", "B"]);
    expect(result).toEqual([
      { content: "A", cacheScope: "turn" },
      { content: "B", cacheScope: "turn" },
    ]);
  });

  test("does not duplicate content when both are provided", () => {
    // When scoped blocks are present, legacy blocks are ignored entirely,
    // so content from legacy blocks never appears even if duplicated.
    const result = normalizeContextBlockScopes(["dup", "dup"], [
      { content: "dup", cacheScope: "session" },
    ]);
    // Only one occurrence (from the scoped input).
    expect(result.filter((b) => b.content === "dup")).toHaveLength(1);
  });

  test("filters empty and whitespace-only content", () => {
    const result = normalizeContextBlockScopes(["  ", "", "valid"]);
    expect(result).toEqual([{ content: "valid", cacheScope: "turn" }]);

    const scopedResult = normalizeContextBlockScopes(undefined, [
      { content: "  ", cacheScope: "session" },
      { content: "valid-scoped", cacheScope: "turn" },
    ]);
    expect(scopedResult).toEqual([
      { content: "valid-scoped", cacheScope: "turn" },
    ]);
  });

  test("returns empty array when neither is provided", () => {
    expect(normalizeContextBlockScopes()).toEqual([]);
    expect(normalizeContextBlockScopes([], [])).toEqual([]);
    expect(normalizeContextBlockScopes(undefined, undefined)).toEqual([]);
  });

  test("ignores malformed boundary entries instead of throwing", () => {
    const result = normalizeContextBlockScopes(
      ["legacy-valid", null as unknown as string],
      [
        null as unknown as ContextBlockScope,
        { content: 42, cacheScope: "turn" },
        { content: "scoped-valid", cacheScope: "session" },
      ] as unknown as ContextBlockScope[],
    );

    expect(result).toEqual([
      { content: "scoped-valid", cacheScope: "session" },
    ]);
  });
});
