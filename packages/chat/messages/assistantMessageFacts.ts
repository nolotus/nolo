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
  if (typeof msg.content === "string") return msg.content.trim().length > 0;
  if (Array.isArray(msg.content)) return msg.content.length > 0;
  return false;
}
