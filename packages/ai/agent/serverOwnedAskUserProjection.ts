import { createDialogMessageKeyAndId } from "database/keys";
import {
  messageStreaming,
  removeTransientMessage,
} from "chat/messages/messageSlice";
import { canonicalizeToolName } from "ai/tools/toolNameAliases";

function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * Live projection for the first durable Web tool slice (`ask_user`).
 *
 * Important ownership rule: projected rows are never authoritative and never
 * become interactive. Even after tool_result arrives they stay isStreaming=true
 * until the server sends done and the caller reloads canonical persisted rows.
 * This prevents a click racing against terminal persistence on a transient dbKey.
 */
export function createServerOwnedAskUserProjection(args: {
  dialogId: string;
  dispatch: (action: any) => any;
  messageMetadata: Record<string, unknown>;
}) {
  const transientByCallId = new Map<string, any>();

  const handlePayload = (payload: any) => {
    if (!payload || typeof payload !== "object") return;

    if (payload.type === "assistant_tool_calls") {
      const calls = Array.isArray(payload.tool_calls) ? payload.tool_calls : [];
      for (const call of calls) {
        const callId = typeof call?.id === "string" ? call.id : "";
        const toolName = canonicalizeToolName(call?.function?.name ?? "");
        if (!callId || toolName !== "ask_user") continue;
        if (transientByCallId.has(callId)) continue;

        const { key, messageId } = createDialogMessageKeyAndId(args.dialogId);
        const input = parseToolArgs(call?.function?.arguments);
        const message = {
          id: messageId,
          dialogId: args.dialogId,
          dbKey: key,
          role: "tool" as const,
          // Pending args, not a tool result: the panel renders the question card
          // from `content`, so a single-question call (question + choices, no
          // `questions`) would otherwise render as an empty row until the
          // tool_result arrives. The canonical payload replaces this on done.
          content: JSON.stringify({ type: "ask_user", ...input }),
          isStreaming: true,
          toolName: "ask_user",
          toolCallId: callId,
          toolPayload: {
            toolName: "ask_user",
            status: "running" as const,
            input,
            rawToolCall: call,
            summary: "",
          },
          ...args.messageMetadata,
        };
        transientByCallId.set(callId, message);
        args.dispatch(messageStreaming(message));
      }
      return;
    }

    if (payload.type === "tool_result") {
      const callId = typeof payload.toolCallId === "string" ? payload.toolCallId : "";
      const existing = transientByCallId.get(callId);
      if (!existing || canonicalizeToolName(payload.toolName ?? existing.toolName) !== "ask_user") {
        return;
      }
      const message = {
        ...existing,
        content: typeof payload.content === "string" ? payload.content : "",
        // Keep read-only until canonical server persistence is reloaded.
        isStreaming: true,
        toolPayload: {
          ...(existing.toolPayload ?? {}),
          status: "running" as const,
        },
      };
      transientByCallId.set(callId, message);
      args.dispatch(messageStreaming(message));
    }
  };

  const cleanup = () => {
    for (const message of transientByCallId.values()) {
      args.dispatch(
        removeTransientMessage({ id: message.id, dialogId: args.dialogId }),
      );
    }
    transientByCallId.clear();
  };

  return { handlePayload, cleanup, transientByCallId };
}
