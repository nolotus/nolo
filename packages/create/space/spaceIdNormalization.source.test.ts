import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const spaceThunksSource = readFileSync(
  join(import.meta.dir, "spaceThunks.ts"),
  "utf-8",
);
const changeSpaceActionSource = readFileSync(
  join(import.meta.dir, "changeSpaceAction.ts"),
  "utf-8",
);
const fetchSpaceActionSource = readFileSync(
  join(import.meta.dir, "fetchSpaceAction.ts"),
  "utf-8",
);
const fetchSpaceSidebarStateActionSource = readFileSync(
  join(import.meta.dir, "fetchSpaceSidebarStateAction.ts"),
  "utf-8",
);
const spaceLayoutSource = readFileSync(
  join(import.meta.dir, "components", "SpaceLayout.tsx"),
  "utf-8",
);

describe("space id normalization source contract", () => {
  it("normalizes space ids before changeSpaceAction reads space data and sidebar state", () => {
    expect(changeSpaceActionSource).toContain(
      "const normalizedSpaceId = normalizeSpaceId(spaceId);",
    );
    // Local-first open: try fresh:false first, only block on fresh:true when cold.
    expect(changeSpaceActionSource).toContain(
      "fetchSpaceAction(\n      { spaceId: normalizedSpaceId, fresh: false },\n      thunkAPI,\n    )",
    );
    expect(changeSpaceActionSource).toContain(
      "fetchSpaceAction(\n      { spaceId: normalizedSpaceId, fresh: true },\n      thunkAPI,\n    )",
    );
    expect(changeSpaceActionSource).toContain(
      "fetchSpaceSidebarStateAction(\n    normalizedSpaceId,\n    thunkAPI,\n  )",
    );
    expect(changeSpaceActionSource).toContain("spaceId: normalizedSpaceId,");
    expect(changeSpaceActionSource).toContain("spaceData,");
    expect(changeSpaceActionSource).toContain("sidebarState,");
  });

  it("normalizes ids before fetchSpace and sidebar-state reads", () => {
    expect(fetchSpaceActionSource).toContain(
      "const spaceId = normalizeSpaceId(rawSpaceId);",
    );
    expect(fetchSpaceSidebarStateActionSource).toContain(
      "const normalizedSpaceId = normalizeSpaceId(spaceId);",
    );
    expect(fetchSpaceSidebarStateActionSource).toContain(
      "readStoredCollapsedCategories(",
    );
  });

  it("normalizes prefixed ids before changeSpace pending handles loading state", () => {
    // Wave E: spaceSlice 删除后 pending 副作用内联进 thunk 的 payload creator 开头，
    // 参数来源从 action.meta.arg 变为 thunk 的 arg，归一化行为不变。
    expect(spaceThunksSource).toContain(
      "const newSpaceId = normalizeSpaceId(arg);",
    );
  });

  it("normalizes the route spaceId before dispatching changeSpace from SpaceLayout", () => {
    expect(spaceLayoutSource).toContain(
      "const normalizedRouteSpaceId = normalizeSpaceId(spaceId);",
    );
    expect(spaceLayoutSource).toContain("changeSpace(normalizedRouteSpaceId)");
  });
});
