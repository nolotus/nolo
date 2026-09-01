// Wave E: 从 spaceSlice.runtime.test.ts 迁入。
// 原测试通过 spaceReducer + 手工构造的 fetchUserSpaceMemberships.pending/fulfilled/rejected
// action 驱动 case reducer；slice 删除后副作用已内联进 thunk 的 payload creator，
// 因此这里改为直接驱动 module store mutator（thunk 现在调用的正是这些函数），
// Wave E: thunk 与 mutator 的接线由 spaceThunks.runtime.test.ts 覆盖。
import { describe, expect, test, beforeEach } from "bun:test";

import {
  getMemberSpaces,
  getAllMemberSpaces,
  getSpaceLoading,
  getMembershipStatus,
  getSpaceError,
  setMemberSpaces,
  setMembershipLoading,
  setMembershipRejected,
  hydrateMemberSpacesFromLocal,
  appendRecoveredMemberships,
  resetSpaceMembershipState,
} from "./spaceMembershipStore";
import { isSpaceMembershipRemoteUnavailableError } from "./member/isSpaceMembershipRemoteUnavailableError";
import { resetSpace } from "./spaceReset";
import { getFavoritesCollapsed, resetSpaceUiState } from "./spaceUiStore";
import { getViewMode, resetSpaceCurrentState } from "./spaceCurrentStore";
import { resetSpaceDialogState } from "./spaceDialogStore";

const rejectWith = (message: string): void => {
  const error = { name: "Error", message };
  setMembershipRejected(
    error.message,
    isSpaceMembershipRemoteUnavailableError(error)
  );
};

beforeEach(() => {
  resetSpaceUiState();
  resetSpaceDialogState();
  resetSpaceMembershipState();
  resetSpaceCurrentState();
});

describe("space membership status", () => {
  test("pending keeps cached rows; offline reject preserves them and marks offline", () => {
    expect(getMembershipStatus()).toBe("idle");

    setMembershipLoading();
    expect(getSpaceLoading()).toBe(true);
    expect(getMembershipStatus()).toBe("loading");
    expect(getMemberSpaces()).toBeNull();

    hydrateMemberSpacesFromLocal([
      {
        userId: "user1",
        spaceId: "stale",
        spaceName: "Stale",
        role: "member",
      } as any,
    ]);
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["stale"]);
    expect(getMembershipStatus()).toBe("loading");

    rejectWith(
      "space_membership_remote_unavailable: unable to refresh memberships"
    );

    expect(getSpaceLoading()).toBe(false);
    expect(getMembershipStatus()).toBe("offline");
    expect(getSpaceError()).toContain("space_membership_remote_unavailable");
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["stale"]);
  });

  test("hydrate releases loading once local rows fill (stale-while-revalidate)", () => {
    setMembershipLoading();
    expect(getSpaceLoading()).toBe(true);

    hydrateMemberSpacesFromLocal([
      { userId: "user1", spaceId: "cached", spaceName: "Cached" } as any,
    ]);
    // 本地列表已可用：立刻停止转圈；远端校验仍在后台进行。
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["cached"]);
    expect(getSpaceLoading()).toBe(false);
    expect(getMembershipStatus()).toBe("loading");
  });

  test("hydrate keeps loading when it cannot fill (empty payload or existing rows)", () => {
    setMembershipLoading();

    // 空 payload 不释放 loading
    hydrateMemberSpacesFromLocal([]);
    expect(getSpaceLoading()).toBe(true);
    expect(getMemberSpaces()).toBeNull();

    // 已有列表时不覆盖
    hydrateMemberSpacesFromLocal([
      { userId: "user1", spaceId: "first", spaceName: "First" } as any,
    ]);
    hydrateMemberSpacesFromLocal([
      { userId: "user1", spaceId: "second", spaceName: "Second" } as any,
    ]);
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["first"]);
  });

  test("fulfilled clears remote-unavailable error and marks fresh", () => {
    hydrateMemberSpacesFromLocal([{ spaceId: "stale" } as any]);
    rejectWith("space_membership_remote_unavailable: previous");
    expect(getMembershipStatus()).toBe("offline");

    setMemberSpaces([{ spaceId: "fresh", spaceName: "Fresh" }] as any);

    expect(getMembershipStatus()).toBe("fresh");
    expect(getSpaceError()).toBeUndefined();
    expect(getSpaceLoading()).toBe(false);
    expect(getMemberSpaces()).toEqual([
      { spaceId: "fresh", spaceName: "Fresh" },
    ] as any);
  });

  test("unrelated membership reject does not mark offline", () => {
    rejectWith("some other error");

    expect(getMembershipStatus()).not.toBe("offline");
    expect(getSpaceError()).toContain("some other error");
  });

  test("resetSpace clears membership status so account switches cannot inherit it", () => {
    setMembershipLoading();
    expect(getMembershipStatus()).toBe("loading");

    resetSpace();
    expect(getMembershipStatus()).toBe("idle");
    // Also resets the UI module store (Wave A).
    expect(getViewMode()).toBe("all");
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("getMembershipStatus returns idle on fresh module store state", () => {
    resetSpaceMembershipState();
    expect(getMembershipStatus()).toBe("idle");
  });
});

describe("appendRecoveredMemberships", () => {
  test("initializes memberSpaces when null (cold list after resetSpace)", () => {
    appendRecoveredMemberships([
      { userId: "u", spaceId: "rec", spaceName: "Rec", role: "member" } as any,
    ]);
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["rec"]);
  });

  test("unions and dedupes by spaceId via dedupeMemberSpacesById", () => {
    hydrateMemberSpacesFromLocal([
      { userId: "u", spaceId: "dup", spaceName: "Local", role: "member" } as any,
      { userId: "u", spaceId: "keep", spaceName: "Keep", role: "member" } as any,
    ]);
    appendRecoveredMemberships([
      {
        userId: "u",
        spaceId: "dup",
        spaceName: "Recovered",
        role: "member",
      } as any,
    ]);
    const ids = getAllMemberSpaces().map((s) => s.spaceId);
    expect(ids.filter((id) => id === "dup").length).toBe(1);
    expect(ids).toContain("keep");
  });

  test("sorts by joinedAt desc, tolerating ISO string dates (NaN-safe)", () => {
    hydrateMemberSpacesFromLocal([
      {
        userId: "u",
        spaceId: "old",
        spaceName: "Old",
        role: "member",
        joinedAt: "2026-01-01T00:00:00.000Z",
      } as any,
      {
        userId: "u",
        spaceId: "mid",
        spaceName: "Mid",
        role: "member",
        joinedAt: 1,
      } as any,
      {
        userId: "u",
        spaceId: "new",
        spaceName: "New",
        role: "member",
        joinedAt: "2026-06-01T00:00:00.000Z",
      } as any,
    ]);
    appendRecoveredMemberships([
      {
        userId: "u",
        spaceId: "rec-iso",
        spaceName: "Rec ISO",
        role: "member",
        joinedAt: "2026-03-01T00:00:00.000Z",
      } as any,
    ]);
    // ISO strings must not produce NaN; order is by parsed timestamp desc.
    const ids = getAllMemberSpaces().map((s) => s.spaceId);
    expect(ids?.indexOf("new")).toBeLessThanOrEqual(1);
    expect(ids?.indexOf("rec-iso")).toBeGreaterThan(ids?.indexOf("new") ?? 0);
    // No NaN corruption: all entries present and ordered, no undefined slots
    expect(getAllMemberSpaces().length).toBe(4);
  });

  test("empty payload is a no-op", () => {
    hydrateMemberSpacesFromLocal([
      { userId: "u", spaceId: "keep", spaceName: "Keep", role: "member" } as any,
    ]);
    appendRecoveredMemberships([]);
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["keep"]);
  });
});
