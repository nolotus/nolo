import { describe, expect, test } from "bun:test";
import fixture from "./fixtures/public-single-post.json";
import { parseXPostFixture } from "./fixtureParser";

describe("parseXPostFixture", () => {
  test("normalizes a sanitized public post fixture", () => {
    const result = parseXPostFixture(fixture, {
      backend: "fixture",
      fetchedAt: "2026-05-06T02:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.data.id).toBe("2051832734533013575");
    expect(result.data.author.handle).toBe("karminski3");
    expect(result.data.text).toContain("reasoning_content");
    expect(result.data.media).toEqual([]);
    expect(result.data.sourceBackend).toBe("fixture");
    expect(result.data.fetchedAt).toBe("2026-05-06T02:00:00.000Z");
  });

  test("returns parse_error for missing required fields", () => {
    const result = parseXPostFixture(
      { text: "missing id" },
      {
        backend: "fixture",
        fetchedAt: "2026-05-06T02:00:00.000Z",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "parse_error",
      backend: "fixture",
    });
  });
});
