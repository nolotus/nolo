export type GroupedRenderEntry =
  | { type: "single"; key: string; message: any }
  | {
      type: "tool-group";
      key: string;
      messages: any[];
      activityMessages?: any[];
    };

/**
 * tool 行常常只带 tool_call_id 而缺 toolName（CLI / 旧数据 / 漏带的写库链），
 * 导致折叠头兜底成「工具」。协议里 assistant.tool_calls 必带 function.name，
 * 且与 tool 行的 tool_call_id 一一对应——用它反查，显示不再依赖易丢的冗余字段。
 */
function buildToolCallNameIndex(entries: GroupedRenderEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const entry of entries) {
    if (entry.type !== "single") continue;
    const calls = entry.message?.tool_calls;
    if (entry.message?.role !== "assistant" || !Array.isArray(calls)) continue;
    for (const call of calls) {
      const id = typeof call?.id === "string" ? call.id : "";
      const name = typeof call?.function?.name === "string" ? call.function.name : "";
      if (id && name) index.set(id, name);
    }
  }
  return index;
}

/** Return a shallow copy with toolName filled from the call index when missing. */
function enrichToolMessageName(message: any, index: Map<string, string>): any {
  const existing = typeof message?.toolName === "string" ? message.toolName.trim() : "";
  if (existing) return message;
  const callId =
    (typeof message?.toolCallId === "string" && message.toolCallId.trim()) ||
    (typeof message?.tool_call_id === "string" ? message.tool_call_id.trim() : "");
  const resolved = callId ? index.get(callId) : undefined;
  if (!resolved) return message;
  return { ...message, toolName: resolved };
}

function hasActivitySignal(message: any): boolean {
  const activity = message?.metadata?.activity ?? message?.toolPayload?.activity;
  return !!activity && typeof activity === "object";
}

/**
 * 工具名清单：这些工具在 ToolMessageItem 里有独立的交互/导航渲染分支
 * （AskChoicePanelWeb 选项卡片、runStreamingAgent handoff 跳转卡片），
 * 但在 ToolMessageContent.RENDERERS 里没有登记。一旦被 groupToolEntries
 * 折进 tool-group，ToolMessageGroup 会用 ToolMessageContent 渲染，退化为
 * JSON dump，交互/导航能力丢失。所以这类工具必须保持 single entry。
 *
 * 新增此类工具时：先在 ToolMessageItem 加独立分支，再把名字加进这个 Set，
 * 不需要动 ToolMessageContent / ToolMessageGroup。
 */
const INTERACTIVE_TOOL_NAMES = new Set<string>(["ask_user", "runStreamingAgent"]);

function isInteractiveToolMessage(message: any): boolean {
  if (message?.role !== "tool") return false;
  const toolName =
    (typeof message?.toolName === "string" && message.toolName.trim()) || "";
  return INTERACTIVE_TOOL_NAMES.has(toolName);
}

function toolMessageKey(message: any): string {
  return (
    message?.id ??
    message?.dbKey ??
    message?.tool_call_id ??
    message?.toolCallId ??
    "tool-single"
  );
}

function isFinalActivityAssistant(
  entry: GroupedRenderEntry | undefined
): entry is { type: "single"; key: string; message: any } {
  return (
    entry?.type === "single" &&
    entry.message?.role === "assistant" &&
    !Array.isArray(entry.message?.tool_calls) &&
    hasActivitySignal(entry.message)
  );
}

/**
 * Group only truly consecutive tool rows.
 *
 * Stability contract (anti-flicker):
 * - Key is always `tool-group-<firstToolId>` so appending tools never remounts
 *   the group (and never restarts message-appear / list enter animations).
 * - Any non-empty tool buffer is a `tool-group` (including a single tool), so
 *   the component type does not flip from ToolMessageItem → ToolMessageGroup
 *   when the second tool arrives.
 *
 * Timeline rule:
 * - Any visible assistant narration is a hard boundary. This preserves the
 *   chronological product sequence: tools → narration → tools → narration.
 * - Final assistant rows with a structured activity signal add phase completion
 *   context to `activityMessages` while remaining visible as the answer bubble.
 * - User messages and assistant answers also remain hard boundaries.
 */
export function groupConsecutiveToolEntries(
  entries: GroupedRenderEntry[]
): GroupedRenderEntry[] {
  const toolCallNameById = buildToolCallNameIndex(entries);
  const result: GroupedRenderEntry[] = [];
  let currentGroupMessages: any[] = [];
  let currentActivityMessages: any[] = [];

  const flushGroup = () => {
    if (currentGroupMessages.length === 0) return;
    const firstToolId = toolMessageKey(currentGroupMessages[0]);
    const groupKey = `tool-group-${firstToolId}`;
    const groupEntry: GroupedRenderEntry = {
      type: "tool-group",
      key: groupKey,
      messages: [...currentGroupMessages],
      ...(currentActivityMessages.length > 0
        ? { activityMessages: [...currentActivityMessages] }
        : {}),
    };
    result.push(groupEntry);
    currentGroupMessages = [];
    currentActivityMessages = [];
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isTool = entry.type === "single" && entry.message?.role === "tool";

    // 交互型工具（ask_user）保持 single entry，走 ToolMessageItem 的
    // AskChoicePanelWeb 渲染，不折进 tool-group（否则退化为 JSON dump）。
    if (isTool && isInteractiveToolMessage(entry.message)) {
      flushGroup();
      result.push({
        type: "single",
        key: toolMessageKey(entry.message),
        message: enrichToolMessageName(entry.message, toolCallNameById),
      });
      continue;
    }

    if (isTool) {
      const toolMsg = enrichToolMessageName(entry.message, toolCallNameById);
      currentGroupMessages.push(toolMsg);
      if (hasActivitySignal(toolMsg)) {
        currentActivityMessages.push(toolMsg);
      }
      continue;
    }

    if (
      currentGroupMessages.length > 0 &&
      isFinalActivityAssistant(entry) &&
      i === entries.length - 1
    ) {
      currentActivityMessages.push(entry.message);
      flushGroup();
      result.push(entry);
      continue;
    }

    flushGroup();
    result.push(entry);
  }

  flushGroup();
  return result;
}
