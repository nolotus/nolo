import { getCurrentSpaceId } from "create/space/spaceCurrentStore";
import { callToolApi } from "./toolApiClient";
import type { RememberMemoryScope } from "ai/memory/remember";
import type { MemoryKind } from "ai/memory/types";

export interface RememberMemoryToolArgs {
  content: string;
  scope?: RememberMemoryScope;
  kind?: MemoryKind;
  recurrenceEvidence?: string;
}

// Schema 定义在无依赖的姊妹模块里，供 CLI/desktop 本地 runtime 复用
// （本模块 import 了 Redux，只有渲染进程能加载）。
export { rememberMemoryFunctionSchema } from "./rememberMemoryToolSchema";

export async function rememberMemoryFunc(
  args: RememberMemoryToolArgs,
  thunkApi: any
): Promise<{ rawData: unknown; displayData: string }> {
  const state = thunkApi.getState();
  const spaceId = getCurrentSpaceId() || undefined;
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
      ...(recurrenceEvidence ? { recurrenceEvidence } : {}),
    },
    { withAuth: true }
  );

  const scopeLabel =
    result.resolvedScopes?.[0]?.ownerType === "space" ? "当前空间" : "当前用户";

  const similar = result.similarMemories ?? [];
  const similarHint = similar.length
    ? `\n提示：已有 ${similar.length} 条语义相近的既有记忆（如 ${similar[0].id}："${similar[0].content.slice(0, 48)}…"）。若本条已取代它，请调用 deleteMemory 归档旧条，避免同主题版本堆积。`
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
