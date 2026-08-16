import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("space member dedupe guards", () => {
  const source = readFileSync(
    new URL("./spaceSlice.ts", import.meta.url),
    "utf8"
  );
  const thunkSource = readFileSync(
    new URL("./spaceThunks.ts", import.meta.url),
    "utf8"
  );

  test("selector dedupes memberSpaces before sorting", () => {
    expect(source).toContain("export const dedupeMemberSpacesById");
    expect(source).toContain(
      "const memberSpaces = dedupeMemberSpacesById(space.memberSpaces || []);"
    );
  });

  test("addSpace fulfilled dedupes duplicate memberships by spaceId", () => {
    expect(thunkSource).toContain("const dedupeMemberSpaces =");
    expect(thunkSource).toContain("state.memberSpaces = dedupeMemberSpaces([");
  });
});
