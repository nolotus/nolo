import type { AgentRuntimeChatMessage } from "./types";

type DialogMessageRecord = Record<string, any>;

export function dialogMessageRecordToAgentRuntimeMessage(
  record: DialogMessageRecord
): AgentRuntimeChatMessage | null {
  if (!record || typeof record !== "object") return null;
  if (record.role !== "user" && record.role !== "assistant" && record.role !== "tool") return null;
  return {
    role: record.role,
    content: record.content ?? "",
    ...(record.contextReference !== undefined
      ? { context_reference: record.contextReference }
      : {}),
    ...(typeof record.reasoning_content === "string"
      ? { reasoning_content: record.reasoning_content }
      : {}),
    ...(typeof record.toolCallId === "string" ? { tool_call_id: record.toolCallId } : {}),
    ...(Array.isArray(record.tool_calls) ? { tool_calls: record.tool_calls } : {}),
    ...(typeof record.toolName === "string" ? { toolName: record.toolName } : {}),
    // 写侧（dialogWritePlan）把 tool_result_metadata 以 `metadata` 字段落库；
    // 回读必须还原，否则跨 turn 投影丢失 metadata 后缀，同一 tool 消息的字节
    // 在 turn 边界漂移 → provider 前缀缓存断裂（stable projection 契约，
    // 见 docs/plans/2026-09-05-tool-output-cache-stability.md）。
    ...(record.metadata && typeof record.metadata === "object"
      ? { tool_result_metadata: record.metadata as Record<string, unknown> }
      : {}),
    ...(() => {
      const raw = record.createdAt;
      const ms =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Date.parse(raw)
            : NaN;
      return Number.isFinite(ms) ? { createdAt: ms } : {};
    })(),
  };
}
