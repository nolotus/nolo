import { describe, expect, it } from "bun:test";
import { foldHomePath } from "./foldHomePath";

describe("foldHomePath", () => {
  it("folds macOS home prefix with explicit home", () => {
    expect(foldHomePath("/Users/nolotus/bun-nolo", "/Users/nolotus")).toBe("~/bun-nolo");
  });

  it("folds linux home prefix with explicit home", () => {
    expect(foldHomePath("/home/dev/repo", "/home/dev")).toBe("~/repo");
  });

  it("collapses exact home to ~", () => {
    expect(foldHomePath("/Users/nolotus", "/Users/nolotus")).toBe("~");
  });

  it("falls back to regex when home not provided (macOS, with subdir)", () => {
    expect(foldHomePath("/Users/nolotus/bun-nolo")).toBe("~/bun-nolo");
  });

  it("falls back to regex when home not provided (macOS, exact home)", () => {
    expect(foldHomePath("/Users/nolotus")).toBe("~");
  });

  it("falls back to regex when home not provided (linux, with subdir)", () => {
    expect(foldHomePath("/home/dev/repo")).toBe("~/repo");
  });

  it("falls back to regex when home not provided (linux, exact home)", () => {
    expect(foldHomePath("/home/dev")).toBe("~");
  });

  it("leaves non-home paths unchanged", () => {
    expect(foldHomePath("/tmp/some-workspace")).toBe("/tmp/some-workspace");
  });

  it("returns empty string unchanged", () => {
    expect(foldHomePath("")).toBe("");
  });

  it("tolerates a trailing slash on home (e.g. HOME=/home/dev/)", () => {
    expect(foldHomePath("/home/dev/repo", "/home/dev/")).toBe("~/repo");
    expect(foldHomePath("/home/dev", "/home/dev/")).toBe("~");
  });
});