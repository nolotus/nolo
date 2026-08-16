import { describe, expect, it } from "bun:test";
import { isVersionGreater } from "./applyCliVersion";

describe("isVersionGreater", () => {
  it("0.1.59 > 0.1.58", () => {
    expect(isVersionGreater("0.1.59", "0.1.58")).toBe(true);
  });

  it("0.2.0 > 0.1.58", () => {
    expect(isVersionGreater("0.2.0", "0.1.58")).toBe(true);
  });

  it("1.0.0 > 0.9.9", () => {
    expect(isVersionGreater("1.0.0", "0.9.9")).toBe(true);
  });

  it("0.1.58 is not greater than 0.1.58 (equal)", () => {
    expect(isVersionGreater("0.1.58", "0.1.58")).toBe(false);
  });

  it("0.1.57 is not greater than 0.1.58 (downgrade)", () => {
    expect(isVersionGreater("0.1.57", "0.1.58")).toBe(false);
  });

  it("0.1.58 is not greater than 0.2.0 (multi-digit minor)", () => {
    expect(isVersionGreater("0.1.58", "0.2.0")).toBe(false);
  });

  // Prerelease comparisons (semver spec ordering).
  it("0.6.1-alpha.1 > 0.6.0 (prerelease of higher core)", () => {
    expect(isVersionGreater("0.6.1-alpha.1", "0.6.0")).toBe(true);
  });

  it("0.6.1-alpha.2 > 0.6.1-alpha.1 (prerelease increment)", () => {
    expect(isVersionGreater("0.6.1-alpha.2", "0.6.1-alpha.1")).toBe(true);
  });

  it("0.6.1-alpha.1 is not greater than 0.6.1-alpha.1 (equal prerelease)", () => {
    expect(isVersionGreater("0.6.1-alpha.1", "0.6.1-alpha.1")).toBe(false);
  });

  it("0.6.1 > 0.6.1-alpha.1 (release > prerelease of same core)", () => {
    expect(isVersionGreater("0.6.1", "0.6.1-alpha.1")).toBe(true);
  });

  it("0.6.1-alpha.1 is not greater than 0.6.1 (prerelease < release of same core)", () => {
    expect(isVersionGreater("0.6.1-alpha.1", "0.6.1")).toBe(false);
  });

  it("0.6.1-beta.1 > 0.6.1-alpha.2 (lexicographic prerelease tag)", () => {
    expect(isVersionGreater("0.6.1-beta.1", "0.6.1-alpha.2")).toBe(true);
  });

  it("0.6.1-rc-2 > 0.6.1-rc-1 (hyphenated prerelease identifier)", () => {
    expect(isVersionGreater("0.6.1-rc-2", "0.6.1-rc-1")).toBe(true);
  });
});