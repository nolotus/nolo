import {
  resolveMemoryToolContext,
  type MemoryToolExecutionContext,
} from "./memoryToolContext";
import { dialogMessageKey } from "database/dialogKey";
import { isTombstoneRecord } from "database/tombstones";
import { callToolApi } from "./toolApiClient";
import { formatWorkContextWriteNotice } from "ai/memory/vnext/workContextWriteNotice";
import type { RememberMemoryScope } from "ai/memory/remember";
import type { MemoryKind, MemoryProvenance } from "ai/memory/types";

export interface RememberMemoryToolArgs {
  content?: string;
  mode?: "work";
  storage?: "local" | "server";
  itemKey?: string;
  activityId?: string;
  expectedRevision?: number;
  changeId?: string;
  patch?: Record<string, unknown>;
  scope?: RememberMemoryScope;
  kind?: MemoryKind;
  recurrenceEvidence?: string;
  provenance?: MemoryProvenance;
}

// Schema 定义在无依赖的姊妹模块里，供 CLI/desktop 本地 runtime 复用
// （本模块 import 了 Redux，只有渲染进程能加载）。
export { rememberMemoryFunctionSchema } from "./rememberMemoryToolSchema";

export async function rememberMemoryFunc(
  args: RememberMemoryToolArgs,
  thunkApi: any,
  context?: MemoryToolExecutionContext
): Promise<{ rawData: unknown; displayData: string }> {
  if (args.mode === "work") {
    if (args.storage === "local") throw new Error("Web work memory only supports server storage");
    const dialogId = context?.dialogId;
    const messageId = context?.userMessageId;
    if (!dialogId || !messageId) throw new Error("work memory requires a bound persisted user message");
    const key = dialogMessageKey(dialogId, messageId);
    const db = thunkApi.extra?.db;
    if (!db || typeof db.get !== "function") throw new Error("work memory requires a bound persisted user message");
    let persisted: any;
    try { persisted = await db.get(key); } catch { throw new Error("work memory requires a bound persisted user message"); }
    if (!persisted || persisted.dbKey !== key || persisted.id !== messageId || persisted.role !== "user" || persisted.metadata?.queueState === "pending" || isTombstoneRecord(persisted) || typeof persisted.content !== "string") throw new Error("work memory requires a bound persisted user message");
    resolveMemoryToolContext(thunkApi.getState(), context);
    const result: any = await callToolApi(thunkApi, "/api/memory/remember", { mode: "work", dialogId, userMessageId: persisted.id, itemKey: args.itemKey, activityId: args.activityId, expectedRevision: args.expectedRevision, changeId: args.changeId, patch: args.patch }, { withAuth: true });
    if (result?.error) throw new Error(result.error.message ?? "work memory rejected");
    // 冲突（revision 过期 / scope mismatch / changeId 复用）是正常返回，不是 error：
    // 裸丢 JSON 会让模型把「没写进去」当成「已记住」，所以这句话必须同时出现在
    // 模型可见的 rawData.notice 与展示用 displayData 里。
    const notice = formatWorkContextWriteNotice(result);
    return {
      rawData: { ...result, notice: [notice, result?.notice].filter(Boolean).join("\n") },
      displayData: notice,
    };
  }
  // 归属只认执行上下文（本次调用所属对话），不认界面上当前打开的对话。
  const { spaceId, dialogId, agentKey } = resolveMemoryToolContext(
    thunkApi.getState(),
    context
  );
  const content = String(args.content ?? "").trim();
  const scope = args.scope ?? "auto";
  const kind = args.kind ?? "episodic";
  const recurrenceEvidence = String(args.recurrenceEvidence ?? "").trim();

  if (!content) {
    throw new Error("rememberMemory 需要非空 content。");
  }

  const result = await callToolApi<{
    success: boolean;
    content: string;
    requestedScope: RememberMemoryScope;
    savedKind?: MemoryKind;
    kindDowngradeReason?: string;
    resolvedScopes: Array<{ ownerType: string; ownerId: string }>;
    similarMemories?: Array<{ id: string; content: string; kind: string; createdAt: string }>;
  }>(
    thunkApi,
    "/api/memory/remember",
    {
      content,
      scope,
      kind,
      spaceId,
      ...(dialogId ? { dialogId } : {}),
      ...(agentKey ? { agentKey } : {}),
      source: "agent-inferred",
      ...(recurrenceEvidence ? { recurrenceEvidence } : {}),
      ...(args.provenance ? { provenance: args.provenance } : {}),
    },
    { withAuth: true }
  );

  const scopeLabel =
    result.resolvedScopes?.[0]?.ownerType === "space" ? "当前空间" : "当前用户";

  const similar = result.similarMemories ?? [];
  const similarHint = similar.length
    ? `\n提示：已有 ${similar.length} 条语义相近的既有记忆（如 ${similar[0].id}："${similar[0].content.slice(0, 48)}…"）。不得自行删除或归档旧条；仅在用户明确要求且符合删除权限时才处理。`
    : "";

  // 降级必须回传给模型：否则它以为写进了 runbook，实际按 episodic 存了。
  const downgradeHint = result.kindDowngradeReason
    ? `\n注意：${result.kindDowngradeReason}`
    : "";

  return {
    rawData: result,
    displayData: `已记住这条${scopeLabel}记忆。${downgradeHint}${similarHint}`,
  };
}
