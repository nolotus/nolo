import { describe, expect, test } from "bun:test";

import { trail } from "./colors";

describe("trail theme", () => {
  test("exposes outdoor accent tokens separate from semantic colors", () => {
    expect(trail.light.accentTrail).toBe("#C9924E");
    expect(trail.light.accentMoss).toBe("#7A9B6E");
    expect(trail.light.accentTrail).not.toBe(trail.light.warning);
    expect(trail.light.accentMoss).not.toBe(trail.light.success);
    expect(trail.dark.accentTrail).toBe("#D4A96A");
    expect(trail.dark.accentMoss).toBe("#8FB896");
  });
});