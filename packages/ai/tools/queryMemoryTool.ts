import {
  resolveMemoryToolContext,
  type MemoryToolExecutionContext,
} from "./memoryToolContext";
import { callToolApi } from "./toolApiClient";

export { queryMemoryFunctionSchema } from "./queryMemoryToolSchema";

export async function queryMemoryFunc(
  args: { query?: string; source?: "archive"; limit?: number; cursor?: string; mode?: "work"; storage?: "local" | "server"; activityId?: string; status?: string; discovery?: string },
  thunkApi: any,
  context?: MemoryToolExecutionContext,
): Promise<{ rawData: unknown; displayData: string }> {
  if (args.mode === "work") {
    if (args.storage === "local") throw new Error("Web work memory only supports server storage");
    if (!context?.dialogId) throw new Error("work memory requires a bound dialog");
    const { dialogId } = resolveMemoryToolContext(thunkApi.getState(), context);
    const result: any = await callToolApi(thunkApi, "/api/memory/query", { mode: "work", dialogId, query: args.query, activityId: args.activityId, status: args.status, discovery: args.discovery, limit: args.limit }, { withAuth: true });
    if (result?.error) throw new Error(result.error.message ?? "work memory rejected");
    return { rawData: result, displayData: JSON.stringify(result) };
  }
  const query = String(args.query ?? "").trim();
  if (!query) throw new Error("queryMemory 需要非空 query。");

  if (args.source !== undefined && args.source !== "archive") throw new Error("Invalid memory source");
  if (args.source === undefined && (args.limit !== undefined || args.cursor !== undefined)) throw new Error("Pagination requires source archive");
  // 归属只认执行上下文（本次调用所属对话），不认界面上当前打开的对话。
  const { agentKey, spaceId } = resolveMemoryToolContext(thunkApi.getState(), context);
  const result = await callToolApi(
    thunkApi,
    "/api/memory/query",
    {
      agentKey,
      userInput: query,
      ...(args.source === "archive" ? {
        source: args.source,
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.cursor !== undefined ? { cursor: args.cursor } : {}),
      } : {}),
      ...(args.source !== "archive" && spaceId
        ? { spaceId }
        : {}),
    },
    { withAuth: true },
  );

  const selectedItems = Array.isArray(result?.selectedItems)
    ? result.selectedItems
    : [];
  const displayData = selectedItems.length
    ? selectedItems
        .map((item: any) => String(item?.content ?? "").trim())
        .filter(Boolean)
        .join("\n")
    : "没有找到相关长期记忆。";
  return { rawData: result, displayData: args.source === "archive"
    ? `历史 archive（仅当前用户，不含 Space 历史；不代表当前结论）：\n${JSON.stringify(result)}`
    : displayData };
}
