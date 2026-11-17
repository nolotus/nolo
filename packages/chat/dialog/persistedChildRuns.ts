import { parseDialogKey, parseDialogMessageKey } from "database/dialogKey";
import type { Message } from "chat/messages/types";
import { extractTextFromContent } from "chat/messages/extractTextFromContent";
import { describeContextualNotice, matchContextualFragment } from "chat/messages/contextualFragment";
import { normalizeToolDisplaySummary } from "chat/messages/toolPresentation";
import { resolveAgentRunStatusKind } from "core/agentRunStatusKind";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asOptionalTrimmedString } from "core/optionalString";

export type PersistedChildRun = {
  runId: string;
  agentKey?: string;
  agentName?: string;
  title?: string;
  status?: string;
  childDialogId?: string;
  dialogKey?: string;
};
const text = (value: unknown) => asOptionalTrimmedString(value);
const terminal = (status?: string) => {
  const kind = resolveAgentRunStatusKind(status);
  return kind === "succeeded" || kind === "abnormal";
};
const statusValue = (value: unknown) => {
  const status = text(value);
  return status && resolveAgentRunStatusKind(status) !== "unknown" ? status : undefined;
};

/** Current loaded slice only. Completion recognition covers wrapped TUI notices,
 * not the server-owned unwrapped wake prose (outside this projection contract). */
export function projectPersistedChildRuns(messages: readonly Message[], dialogKey: string): PersistedChildRun[] {
  const runs = new Map<string, PersistedChildRun>();
  const parentId = parseDialogKey(dialogKey)?.dialogId;
  if (!parentId) return [];
  for (const message of messages) {
    const identity = typeof message.dbKey === "string" ? parseDialogMessageKey(message.dbKey) : null;
    const explicitDialogId = text((message as Message & { dialogId?: unknown }).dialogId);
    if (explicitDialogId && explicitDialogId !== parentId) continue;
    if (!identity) continue;
    const legacySuffix = parentId.includes("-") && identity.dialogId === parentId.split("-").at(-1);
    if (identity.dialogId !== parentId && !(legacySuffix && explicitDialogId === parentId)) continue;
    if (message.role === "tool" && ["startAgentRun", "controlAgentRun"].includes(message.toolName ?? "")) {
      let parsed: unknown = message.content;
      if (typeof parsed === "string") { try { parsed = JSON.parse(parsed); } catch { continue; } }
      const envelope = asRecordOrEmpty(parsed);
      const data = asRecordOrEmpty(envelope.rawData ?? envelope);
      // Tool inputs and succeeded tool-call metadata are not run evidence.
      const records = Array.isArray(data.runs) ? data.runs : [data];
      for (const record of records) {
        const raw = asRecordOrEmpty(record);
        const runId = text(raw.runId);
        if (!runId || raw.error || raw.ok === false || raw.found === false) continue;
        const previous = runs.get(runId);
        if (!previous && message.toolName !== "startAgentRun") continue;
        const status = statusValue(raw.status);
        const dialog = text(raw.dialogKey);
        runs.set(runId, {
          ...previous,
          runId,
          ...(text(raw.agentKey) ? { agentKey: text(raw.agentKey) } : {}),
          ...(text(raw.agentName) ? { agentName: text(raw.agentName) } : {}),
          ...(text(raw.title) || text(raw.taskPreview) ? { title: normalizeToolDisplaySummary({ title: text(raw.title) ?? text(raw.taskPreview) }, "startAgentRun") } : {}),
          ...(status && (!terminal(previous?.status) || terminal(status)) ? { status } : {}),
          ...((text(raw.childDialogId) ?? text(message.toolPayload?.subDialogId)) ? { childDialogId: text(raw.childDialogId) ?? text(message.toolPayload?.subDialogId) } : {}),
          ...(dialog?.startsWith("dialog-") && !dialog.includes("-msg-") ? { dialogKey: dialog } : {}),
        });
      }
    } else if (message.role === "user") {
      const content = extractTextFromContent(message.content);
      if (matchContextualFragment(content) !== "background_run_completion") continue;
      // Same exact wrapped machine-notice contract used by production message rendering.
      for (const task of describeContextualNotice(content)?.tasks ?? []) {
        if (!task.identifier) continue;
        const previous = runs.get(task.identifier);
        // Completion applies only to a run actually launched in this conversation.
        if (!previous) continue;
        const status = statusValue(task.runStatus);
        if (!status) continue;
        runs.set(task.identifier, { ...previous, status, ...(task.childDialogId ? { childDialogId: task.childDialogId } : {}) });
      }
    }
  }
  return [...runs.values()];
}
