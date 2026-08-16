import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const source = readFileSync(join(import.meta.dir, "addSpaceAction.ts"), "utf-8");

describe("addSpaceAction source contract", () => {
  test("logs the current path without assuming browser location exists", () => {
    expect(source).toContain("const getCurrentPathForLog = () =>");
    expect(source).toContain('typeof window !== "undefined"');
    expect(source).toContain("typeof window.location?.pathname === \"string\"");
    expect(source).not.toContain('typeof window !== "undefined" ? window.location.pathname');
  });
});

test("passes boundFolder from input destructure to SpaceData and log", () => {
  // Destructure from input
  expect(source).toContain("boundFolder,\n  } = input");
  // Included in SpaceData object
  expect(source).toContain("boundFolder,\n    ownerId");
  // Logged in console.info
  expect(source).toContain("boundFolder,\n    memberSpaceCount");
});
