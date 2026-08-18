import { describe, expect, it } from "bun:test";
import { compactWorkspacePath } from "./compactWorkspacePath";

// compactWorkspacePath is a re-export of core/foldHomePath; full behavior is
// covered by packages/core/foldHomePath.test.ts. Keep a smoke here to guard
// the re-export wiring and the name the Desktop UI imports.
describe("compactWorkspacePath (re-export smoke)", () => {
  it("folds home prefix to ~", () => {
    expect(compactWorkspacePath("/Users/nolotus/bun-nolo")).toBe("~/bun-nolo");
  });

  it("accepts an optional explicit home", () => {
    expect(compactWorkspacePath("/Users/nolotus", "/Users/nolotus")).toBe("~");
  });

  it("leaves non-home paths unchanged", () => {
    expect(compactWorkspacePath("/tmp/x")).toBe("/tmp/x");
  });
});