import { describe, expect, it, mock } from "bun:test";

const callToolApiMock = mock(async () => ({
  success: true,
  content: "在复杂问题里，这个用户更喜欢先看结论。",
  requestedScope: "auto",
  resolvedScopes: [{ ownerType: "user", ownerId: "user-1" }],
}));

const selectCurrentSpaceIdMock = mock(() => "space-1");

let moduleVersion = 0;

async function loadRememberMemoryTool() {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
  }));
  mock.module("create/space/spaceSlice", () => ({
    selectCurrentSpaceId: selectCurrentSpaceIdMock,
  }));
  const mod = await import(`./rememberMemoryTool`);
  mock.restore();
  return mod;
}

describe("rememberMemoryTool", () => {
  it("persists remembered content through the memory api", async () => {
    const { rememberMemoryFunc } = await loadRememberMemoryTool();
    callToolApiMock.mockClear();

    const result = await rememberMemoryFunc(
      {
        content: "在复杂问题里，这个用户更喜欢先看结论。",
      },
      { getState: () => ({}) }
    );

    expect(callToolApiMock).toHaveBeenCalledTimes(1);
    expect((callToolApiMock.mock.calls as any[])[0]?.[1]).toBe("/api/memory/remember");
    expect((callToolApiMock.mock.calls as any[])[0]?.[2]).toEqual({
      content: "在复杂问题里，这个用户更喜欢先看结论。",
      scope: "auto",
      kind: "episodic",
      spaceId: "space-1",
    });
    expect(result.displayData).toBe("已记住这条当前用户记忆。");
  });

  it("rejects empty content", async () => {
    const { rememberMemoryFunc } = await loadRememberMemoryTool();
    await expect(
      rememberMemoryFunc(
        {
          content: "   ",
        },
        { getState: () => ({}) }
      )
    ).rejects.toThrow("rememberMemory 需要非空 content");
  });

  it("passes procedural kind to the memory api", async () => {
    const { rememberMemoryFunc } = await loadRememberMemoryTool();
    callToolApiMock.mockClear();

    await rememberMemoryFunc(
      {
        content: "重复排障流程：先看 selectedItems，再看 system message 组装。",
        scope: "space",
        kind: "procedural",
      },
      { getState: () => ({}) }
    );

    expect((callToolApiMock.mock.calls as any[])[0]?.[2]).toEqual({
      content: "重复排障流程：先看 selectedItems，再看 system message 组装。",
      scope: "space",
      kind: "procedural",
      spaceId: "space-1",
    });
  });
});
