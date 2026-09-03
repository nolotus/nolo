import { beforeEach, describe, expect, it, mock } from "bun:test";

// 对齐 deleteMemoryFunc 内 callToolApi<T> 的返回契约（dryRun 预检 / 确认删除两种形态），
// 避免 mock 返回类型推断过窄导致 mockResolvedValueOnce 无法传入 dryRun 等字段。
type DeleteMemoryApiResult = {
  success: boolean;
  dryRun?: boolean;
  matchedCount?: number;
  deletedCount?: number;
  deletedIds?: string[];
  deletionToken?: string;
  preview?: Array<{ id: string; content: string; kind: string }>;
};

const callToolApiMock = mock(async (): Promise<DeleteMemoryApiResult> => ({
  success: true,
  deletedCount: 1,
  deletedIds: ["m1"],
}));

const loadDeleteMemoryTool = async () => {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
  }));

  const mod = await import(`./deleteMemoryTool`);
  mock.restore();
  return mod;
};

describe("deleteMemoryTool", () => {
  beforeEach(() => {
    callToolApiMock.mockClear();
  });

  it("returns preview and confirmation prompt when unconfirmed", async () => {
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      dryRun: true,
      matchedCount: 2,
      deletedCount: 0,
      deletedIds: [],
      preview: [
        { id: "m1", content: "用户称呼为小明", kind: "semantic" },
        { id: "m2", content: "小明偏好先看结论", kind: "episodic" },
      ],
      deletionToken: "tok-test-1",
    });
    const { deleteMemoryFunc } = await loadDeleteMemoryTool();
    const result = await deleteMemoryFunc(
      {
        contentKeyword: "小明",
        reason: "用户想删除名字记忆",
      },
      {} as any
    );

    expect(callToolApiMock).toHaveBeenCalledWith(
      expect.anything(),
      "/api/memory/delete",
      {
        ids: undefined,
        contentSubstring: "小明",
        kinds: undefined,
        tags: undefined,
        dryRun: true,
        deletionToken: undefined,
        reason: "用户想删除名字记忆",
      },
      { withAuth: true }
    );
    expect(result.displayData).toContain("【待用户确认】匹配到 2 条符合条件的记忆");
    expect(result.displayData).toContain("1. [semantic] 用户称呼为小明");
    expect(result.displayData).toContain('deletionToken: "tok-test-1"');
    expect(result.displayData).toContain("confirmed: true");
  });

  it("executes actual deletion when confirmed: true", async () => {
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      dryRun: false,
      matchedCount: 2,
      deletedCount: 2,
      deletedIds: ["m1", "m2"],
      deletionToken: "tok-test-1",
    });
    const { deleteMemoryFunc } = await loadDeleteMemoryTool();
    const result = await deleteMemoryFunc(
      {
        contentKeyword: "小明",
        confirmed: true,
        deletionToken: "tok-test-1",
        reason: "用户明确确认删除",
      },
      {} as any
    );

    expect(callToolApiMock).toHaveBeenCalledWith(
      expect.anything(),
      "/api/memory/delete",
      {
        ids: undefined,
        contentSubstring: "小明",
        kinds: undefined,
        tags: undefined,
        dryRun: false,
        deletionToken: "tok-test-1",
        reason: "用户明确确认删除",
      },
      { withAuth: true }
    );
    expect(result.displayData).toContain("已在用户权限范围内确认并物理删除 2 条记忆。");
  });

  it("throws when confirmed: true but deletionToken is missing", async () => {
    const { deleteMemoryFunc } = await loadDeleteMemoryTool();
    await expect(
      deleteMemoryFunc(
        {
          contentKeyword: "小明",
          confirmed: true,
          reason: "确认删除",
        },
        {} as any
      )
    ).rejects.toThrow("必须提供预检阶段获取的 deletionToken");
  });

  it("throws when callToolApi returns success: false", async () => {
    callToolApiMock.mockResolvedValueOnce({ success: false });
    const { deleteMemoryFunc } = await loadDeleteMemoryTool();
    await expect(
      deleteMemoryFunc(
        {
          contentKeyword: "小明",
          reason: "预检",
        },
        {} as any
      )
    ).rejects.toThrow("删除长期记忆请求未成功完成");
  });

  it("throws when no reason and no filters provided", async () => {
    const { deleteMemoryFunc } = await loadDeleteMemoryTool();
    await expect(
      deleteMemoryFunc({ reason: "" } as any, {} as any)
    ).rejects.toThrow("deleteMemory 需要提供明确的删除原因与至少一项过滤条件");
  });
});
