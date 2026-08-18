import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const typesSource = readFileSync(join(import.meta.dir, "types.ts"), "utf-8");
const updateSource = readFileSync(join(import.meta.dir, "updateSpaceAction.ts"), "utf-8");
const appTypesSource = readFileSync(join(import.meta.dir, "../../app/types.ts"), "utf-8");

describe("boundFolder data model", () => {
  test("CreateSpaceRequest has optional boundFolder", () => {
    expect(typesSource).toContain("boundFolder?: string");
  });

  test("SpaceData has optional boundFolder", () => {
    expect(appTypesSource).toContain("boundFolder?: string");
  });
});

describe("updateSpaceAction boundFolder contract", () => {
  test("input type includes boundFolder", () => {
    expect(updateSource).toContain("boundFolder?: string");
  });

  test("destructures boundFolder from input", () => {
    expect(updateSource).toContain("const { spaceId, name, description, visibility, boundFolder } = input");
  });

  test("compares and sets boundFolder in changes", () => {
    expect(updateSource).toContain("(boundFolder || undefined) !== (spaceData.boundFolder || undefined)");
    expect(updateSource).toContain("changes.boundFolder = boundFolder || undefined");
  });
});
