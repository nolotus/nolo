import { describe, expect, test } from "bun:test";

import { parseReferenceSpec } from "./verifyAgentDocWiring";

describe("verifyAgentDocWiring CLI helpers", () => {
  test("parses a typed reference spec", () => {
    expect(parseReferenceSpec("page-abc:instruction")).toEqual({
      dbKey: "page-abc",
      type: "instruction",
    });
  });

  test("parses an untyped reference spec", () => {
    expect(parseReferenceSpec(" page-abc ")).toEqual({
      dbKey: "page-abc",
    });
  });

  test("rejects an empty reference spec", () => {
    expect(() => parseReferenceSpec(":knowledge")).toThrow("missing dbKey");
  });
});
