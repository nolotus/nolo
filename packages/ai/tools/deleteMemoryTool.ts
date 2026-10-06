import { callToolApi } from "./toolApiClient";
import type { MemoryKind } from "ai/memory/types";

/**
 * Public id shape of a vNext current state (mirrors VNEXT_STATE_ID_PREFIX in
 * ai/memory/delete). A matched item carrying this prefix is retired in place —
 * record preserved for audit, no longer recalled — instead of being physically
 * deleted. Counting these separately is what lets the preview/confirm copy
 * avoid claiming a retire was a physical delete.
 */
const VNEXT_STATE_ID_PREFIX = "vnext-state-";

export interface DeleteMemoryToolArgs {
  ids?: string[];
  contentKeyword?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  confirmed?: boolean;
  deletionToken?: string;
  reason: string;
}

// Schema 定义在无依赖的姊妹模块里，供 CLI/desktop 本地 runtime 复用。
export { deleteMemoryFunctionSchema } from "./deleteMemoryToolSchema";

export async function deleteMemoryFunc(
  args: DeleteMemoryToolArgs,
  thunkApi: any
): Promise<{ rawData: unknown; displayData: string }> {
  const reason = String(args.reason ?? "").trim();
  if (!reason && !args.ids?.length && !args.contentKeyword && !args.tags?.length) {
    throw new Error("deleteMemory 需要提供明确的删除原因与至少一项过滤条件（ids、contentKeyword 或 tags）。");
  }

  const isConfirmed = args.confirmed === true;
  if (isConfirmed && !args.deletionToken?.trim()) {
    throw new Error(
      "deleteMemory 在确认删除阶段（confirmed: true）必须提供预检阶段获取的 deletionToken。请先调用本工具进行预检预览。"
    );
  }

  const result = await callToolApi<{
    success: boolean;
    dryRun?: boolean;
    matchedCount: number;
    deletedCount: number;
    /** Combined total of physical deletes + retires (backward compatible). */
    deletedIds: string[];
    /** Ids of vNext states retired in place (records preserved). */
    retiredIds?: string[];
    deletionToken?: string;
    preview?: Array<{ id: string; content: string; kind: string }>;
  }>(
    thunkApi,
    "/api/memory/delete",
    {
      ids: args.ids,
      contentSubstring: args.contentKeyword,
      kinds: args.kinds,
      tags: args.tags,
      dryRun: !isConfirmed,
      deletionToken: args.deletionToken,
      reason,
    },
    { withAuth: true }
  );

  if (!result || result.success === false) {
    throw new Error("删除长期记忆请求未成功完成。");
  }

  if (!isConfirmed) {
    const matched = result.matchedCount ?? 0;
    if (matched === 0) {
      return {
        rawData: result,
        displayData: "未找到匹配的记忆，无需删除。",
      };
    }
    // Preview phase: nothing has been written yet, so the retire count is an
    // estimate derived from the matched items whose id carries the
    // `vnext-state-` prefix. The handler projects `retiredIds` for dry runs;
    // fall back to the displayed preview slice for older/shaped responses.
    const retiredCount =
      result.retiredIds?.length ??
      (result.preview ?? []).filter((item) =>
        item.id.startsWith(VNEXT_STATE_ID_PREFIX)
      ).length;
    const physicalCount = Math.max(0, matched - retiredCount);
    const previewList = (result.preview ?? [])
      .map((item, idx) => `${idx + 1}. [${item.kind}] ${item.content}`)
      .join("\n");
    return {
      rawData: result,
      displayData: [
        `【待用户确认】匹配到 ${matched} 条符合条件的记忆：物理删除 ${physicalCount} 条，退役 ${retiredCount} 条（退役仅表示停止召回，记录本身保留）。`,
        previewList ? `预览前 ${result.preview?.length} 条：\n${previewList}` : "",
        `这是不可逆操作。请向用户展示上述预览并获得明确确认。确认后，请传入 confirmed: true${result.deletionToken ? ` 与 deletionToken: "${result.deletionToken}"` : ""} 再次调用本工具。`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const count = result.deletedCount ?? 0;
  // `deletedCount` stays a combined total (physical + retired) so existing
  // callers keep working; `retiredIds` isolates the in-place retires so the
  // copy can state "retire, not physical deletion".
  const retiredCount = result.retiredIds?.length ?? 0;
  const physicalCount = Math.max(0, count - retiredCount);
  return {
    rawData: result,
    displayData: `已在用户权限范围内确认并执行：物理删除 ${physicalCount} 条记忆，退役 ${retiredCount} 条（记录保留、不再召回）。`,
  };
}
