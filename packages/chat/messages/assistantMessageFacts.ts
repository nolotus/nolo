// Pure assistant-message predicates shared by the runtime conversation
// projection and web pending logic. No React, no i18n, no Redux, no web
// presentation imports — keep this module dependency-free.

import { isHiddenOrchestratorToolMessage } from "./toolPresentation";

/** Assistant 占位行：有 tool_calls 但没有任何可见正文。 */
export const isAssistantToolStub = (msg: any) =>
  msg?.role === "assistant" &&
  (msg.content == null ||
    (typeof msg.content === "string" && msg.content.trim().length === 0) ||
    (Array.isArray(msg.content) && msg.content.length === 0)) &&
  Array.isArray(msg?.tool_calls) &&
  msg.tool_calls.length > 0;

/** Assistant 行是否有可见正文（stub / 隐藏 orchestrator 行不算）。 */
export function hasVisibleAssistantContent(msg: any): boolean {
  if (!msg || msg.role !== "assistant") return false;
  if (isAssistantToolStub(msg)) return false;
  if (isHiddenOrchestratorToolMessage(msg)) return false;
  return hasVisibleAssistantContentValue(msg.content);
}

/** Whether a Content value contains actual user-visible assistant output. */
export function hasVisibleAssistantContentValue(content: unknown): boolean {
  if (typeof content === "string") return content.trim().length > 0;
  if (!Array.isArray(content)) return false;

  return content.some((part) => {
    if (!part || typeof part !== "object") return false;
    if ((part as { type?: unknown }).type === "text") {
      return typeof (part as { text?: unknown }).text === "string" &&
        (part as { text: string }).text.trim().length > 0;
    }
    return (part as { type?: unknown }).type === "image_url" &&
      typeof (part as { image_url?: unknown }).image_url === "object" &&
      (part as { image_url: { url?: unknown } }).image_url?.url != null;
  });
}
