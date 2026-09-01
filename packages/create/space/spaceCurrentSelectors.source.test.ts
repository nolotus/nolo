import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("space member dedupe guards", () => {
  const selectorsSource = readFileSync(
    new URL("./spaceCurrentSelectors.ts", import.meta.url),
    "utf8",
  );
  const membershipStoreSource = readFileSync(
    new URL("./spaceMembershipStore.ts", import.meta.url),
    "utf8",
  );

  test("module store dedupes memberSpaces before sorting", () => {
    // Wave E: spaceSlice 已删除，dedupeMemberSpacesById 的唯一归属是 spaceMembershipStore
    // （原先的 slice re-export 一并移除）。过渡 selector 现居 spaceCurrentSelectors。
    expect(selectorsSource).toContain("export const selectCurrentSpaceId");
    expect(membershipStoreSource).toContain(
      "export function dedupeMemberSpacesById",
    );
    expect(membershipStoreSource).toContain(
      "const memberSpaces = dedupeMemberSpacesById(state.memberSpaces || []);",
    );
  });

  test("addMemberSpace dedupes duplicate memberships by spaceId", () => {
    // Wave C: addSpace fulfilled 改调 addMemberSpace（module store mutator），
    // 内部用 dedupeMemberSpacesById 去重。顺序与原 Redux 一致：[...existing, space]。
    expect(membershipStoreSource).toContain("export function addMemberSpace");
    expect(membershipStoreSource).toContain(
      "dedupeMemberSpacesById([...existing, space])",
    );
  });
});
