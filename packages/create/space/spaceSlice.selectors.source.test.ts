import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("space member dedupe guards", () => {
  const sliceSource = readFileSync(
    new URL("./spaceSlice.ts", import.meta.url),
    "utf8"
  );
  const membershipStoreSource = readFileSync(
    new URL("./spaceMembershipStore.ts", import.meta.url),
    "utf8"
  );

  test("module store dedupes memberSpaces before sorting", () => {
    // Wave C: dedupeMemberSpacesById 迁至 spaceMembershipStore，从 spaceSlice re-export。
    expect(sliceSource).toContain("export { dedupeMemberSpacesById }");
    expect(membershipStoreSource).toContain("export function dedupeMemberSpacesById");
    expect(membershipStoreSource).toContain(
      "const memberSpaces = dedupeMemberSpacesById(state.memberSpaces || []);"
    );
  });

  test("addMemberSpace dedupes duplicate memberships by spaceId", () => {
    // Wave C: addSpace fulfilled 改调 addMemberSpace（module store mutator），
    // 内部用 dedupeMemberSpacesById 去重。顺序与原 Redux 一致：[...existing, space]。
    expect(membershipStoreSource).toContain("export function addMemberSpace");
    expect(membershipStoreSource).toContain("dedupeMemberSpacesById([...existing, space])");
  });
});