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
  return module.resolvePreferredSpaceId;
};

describe("resolvePreferredSpaceId", () => {
  beforeEach(() => {
    readMock.mockClear();
    readAndWaitMock.mockClear();
  });

  it("returns currentSpaceId when already selected", async () => {
    const resolvePreferredSpaceId = await loadResolvePreferredSpaceId();
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: "space-live",
            memberSpaces: [{ spaceId: "space-other" }],
          },
        }) as any,
    });
    expect(result).toBe("space-live");
    expect(readMock).not.toHaveBeenCalled();
  });

  it("falls back to first readable membership when no current space", async () => {
    const resolvePreferredSpaceId = await loadResolvePreferredSpaceId();
    readMock.mockResolvedValueOnce({ id: "space-a" });
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: null,
            memberSpaces: [{ spaceId: "space-a" }, { spaceId: "space-b" }],
          },
        }) as any,
    });
    expect(result).toBe("space-a");
  });

  it("returns null when no memberships are readable", async () => {
    const resolvePreferredSpaceId = await loadResolvePreferredSpaceId();
    readMock.mockRejectedValue(new Error("miss"));
    readAndWaitMock.mockRejectedValue(new Error("miss"));
    const result = await resolvePreferredSpaceId({
      dispatch: (x: any) => x,
      getState: () =>
        ({
          space: {
            currentSpaceId: null,
            memberSpaces: [{ spaceId: "space-gone" }],
          },
        }) as any,
    });
    expect(result).toBeNull();
  });
});
