import { describe, expect, it } from "bun:test";

import { formatCredits } from "./credits";

describe("formatCredits", () => {
  it("formats finite numbers with the requested precision", () => {
    expect(formatCredits(12.3456, "credits", 4)).toBe("12.3456 credits");
  });

  it("falls back to zero for invalid values", () => {
    expect(formatCredits(undefined, "积分", 2)).toBe("0.00 积分");
  });
});
