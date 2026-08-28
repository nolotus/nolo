import { beforeEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;
const readMock = mock(async (_arg?: any) => null as any);
const readAndWaitMock = mock(async (_arg?: any) => null as any);

const loadResolvePreferredSpaceId = async () => {
  // Register inside the loader so the shared-module mock is not a top-level
  // side effect that leaks into sibling test files in the same bun process.
  mock.module("database/dbSlice", () => ({
    read: (arg: any) => ({
      unwrap: async () => readMock(arg),
    }),
    readAndWait: (key: string) => ({
      unwrap: async () => readAndWaitMock(key),
    }),
  }));
  const module = await import(`./resolvePreferredSpaceId.ts`);
  const { resetSpaceMembershipState, setMemberSpaces } = await import("./spaceMembershipStore");
  return { resolvePreferredSpaceId: module.resolvePreferredSpaceId, resetSpaceMembershipState, setMemberSpaces };
};

describe("resolvePreferredSpaceId", () => {
  beforeEach(() => {
    readMock.mockClear();
    readAndWaitMock.mockClear();
  });

  it("returns currentSpaceId when already selected", async () => {
    const { resolvePreferredSpaceId, resetSpaceMembershipState } = await loadResolvePreferredSpaceId();
    resetSpaceMembershipState();
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: "space-live",
          },
        }) as any,
    });
    expect(result).toBe("space-live");
    expect(readMock).not.toHaveBeenCalled();
  });

  it("falls back to first readable membership when no current space", async () => {
    const { resolvePreferredSpaceId, resetSpaceMembershipState, setMemberSpaces } = await loadResolvePreferredSpaceId();
    resetSpaceMembershipState();
    // Wave C: memberSpaces 在 module store，通过 setMemberSpaces 设置
    setMemberSpaces([{ spaceId: "space-a" }, { spaceId: "space-b" }] as any);
    readMock.mockResolvedValueOnce({ id: "space-a" });
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: null,
          },
        }) as any,
    });
    expect(result).toBe("space-a");
  });

  it("returns null when no memberships are readable", async () => {
    const { resolvePreferredSpaceId, resetSpaceMembershipState, setMemberSpaces } = await loadResolvePreferredSpaceId();
    resetSpaceMembershipState();
    setMemberSpaces([{ spaceId: "space-gone" }] as any);
    readMock.mockRejectedValue(new Error("miss"));
    readAndWaitMock.mockRejectedValue(new Error("miss"));
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: null,
          },
        }) as any,
    });
    expect(result).toBeNull();
  });
});