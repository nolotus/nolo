import { canonicalizeToolName } from "ai/tools/toolNameAliases";
import { projectDesktopToolUiContent } from "./projectDesktopToolUiContent";
import { createDialogMessageKeyAndId } from "database/keys";
import {
  messageStreaming,
  removeTransientMessage,
  updateToolMessage,
} from "chat/messages/messageSlice";

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

function normalizeToolSet(values: Iterable<string>): Set<string> {
  return new Set(
    [...values]
      .map((value) => canonicalizeToolName(value))
      .filter(Boolean),
  );
}

function isToolResultFailure(
  content: unknown,
  metadata?: Record<string, unknown>,
): boolean {
  if (metadata?.error) return true;
  if (typeof content !== "string" || !content.trim()) return false;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const record = parsed as Record<string, unknown>;
    return (
      Boolean(record.error) ||
      record.ok === false ||
      record.success === false ||
      record.status === "error"
    );
  } catch {
    return false;
  }
}

export function createServerOwnedToolProjection(args: {
  dialogId: string;
  dispatch: (action: any) => any;
  messageMetadata: Record<string, unknown>;
  supportedToolNames: Iterable<string>;
  keepReadOnlyUntilCanonical?: Iterable<string>;
}) {
  const supported = normalizeToolSet(args.supportedToolNames);
  const keepReadOnly = normalizeToolSet(args.keepReadOnlyUntilCanonical ?? []);
  const transientByCallId = new Map<string, any>();

  const handlePayload = (payload: any) => {
    if (!payload || typeof payload !== "object") return;

    if (payload.type === "assistant_tool_calls") {
      const calls = Array.isArray(payload.tool_calls) ? payload.tool_calls : [];
      for (const call of calls) {
        const callId = typeof call?.id === "string" ? call.id : "";
        const toolName = canonicalizeToolName(call?.function?.name ?? "");
        if (!callId || !toolName || !supported.has(toolName)) continue;
        if (transientByCallId.has(callId)) continue;

        const { key, messageId } = createDialogMessageKeyAndId(args.dialogId);
        const input = parseToolArgs(call?.function?.arguments);
        const content = toolName === "ask_user"
          ? JSON.stringify({ type: "ask_user", ...input })
          : "";
        const message = {
          id: messageId,
          dialogId: args.dialogId,
          dbKey: key,
          role: "tool" as const,
          content,
          isStreaming: true,
          toolName,
          toolCallId: callId,
          toolPayload: {
            toolName,
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

    if (payload.type !== "tool_result") return;

    const callId = typeof payload.toolCallId === "string" ? payload.toolCallId : "";
    if (!callId) return;
    const existing = transientByCallId.get(callId);
    const toolName = canonicalizeToolName(payload.toolName ?? existing?.toolName ?? "");
    if (!toolName || !supported.has(toolName)) return;

    const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata as Record<string, unknown>
      : undefined;
    // Generic failure detection applies to every tool, show_interaction included:
    // an {"error": ...} tool result must not be projected as succeeded. Read-only
    // interaction rows keep their status via keepReadOnlyUntilCanonical below, so
    // that semantic is unaffected by removing the forced failed=false.
    const failed = isToolResultFailure(payload.content, metadata);
    const content = toolName === "ask_user"
      ? (typeof payload.content === "string" ? payload.content : "")
      : projectDesktopToolUiContent({ toolName, content: payload.content, metadata });

    const base = existing ?? (() => {
      const { key, messageId } = createDialogMessageKeyAndId(args.dialogId);
      return {
        id: messageId,
        dialogId: args.dialogId,
        dbKey: key,
        role: "tool" as const,
        content: "",
        isStreaming: true,
        toolName,
        toolCallId: callId,
        toolPayload: {
          toolName,
          status: "running" as const,
          input: {},
          summary: "",
        },
        ...args.messageMetadata,
      };
    })();

    // A failed result must still settle: otherwise an {"error": ...} row would be
    // held running (isStreaming: true) forever by the read-only-until-canonical
    // rule. Successful and in-progress read-only rows keep their original status.
    const staysReadOnly = !failed && keepReadOnly.has(toolName);
    const toolPayload = {
      ...(base.toolPayload ?? {}),
      toolName,
      status: staysReadOnly
        ? "running" as const
        : failed
          ? "failed" as const
          : "succeeded" as const,
    };
    const message = {
      ...base,
      content,
      isStreaming: staysReadOnly,
      toolName,
      toolPayload,
    };
    transientByCallId.set(callId, message);

    if (staysReadOnly) {
      args.dispatch(messageStreaming(message));
      return;
    }

    if (!existing) {
      args.dispatch(messageStreaming(base));
    }
    args.dispatch(
      updateToolMessage({
        id: base.id,
        dialogId: args.dialogId,
        changes: {
          content,
          isStreaming: false,
          toolName,
          toolPayload,
        },
      }),
    );
  };

  const cleanup = () => {
    for (const message of transientByCallId.values()) {
      args.dispatch(removeTransientMessage({ id: message.id, dialogId: args.dialogId }));
    }
    transientByCallId.clear();
  };

  return { handlePayload, cleanup, transientByCallId };
}
