import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";

export type DialogStatusSnapshot = {
  dialogId: string;
  dialogKey?: string;
  base?: string;
  title?: string | null;
  status?: string | null;
  parentDialogId?: string | null;
  rootDialogId?: string | null;
  subjectRefs?: Array<{ kind?: string; id?: string; role?: string }>;
  runtimeCheckpoint?: Record<string, any> | null;
  artifacts?: any;
  writtenFiles?: string[];
  toolsUsed?: string[];
  toolErrors?: string[];
  durationMs?: number | null;
  updatedAt?: string | number | null;
  finishedAt?: string | number | null;
};

const ACTIVE_STALE_AFTER_MS = 5 * 60_000;

function compact(value: unknown, max = 180) {
  const text = asTrimmedString(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function list(values: unknown, max = 8) {
  return asTrimmedNonEmptyStringArray(values).slice(0, max);
}

function artifactFiles(artifacts: any) {
  if (!artifacts || typeof artifacts !== "object") return [];
  return list(artifacts.changedFiles ?? artifacts.writtenFiles ?? artifacts.files);
}

function formatSubjectRefs(refs: DialogStatusSnapshot["subjectRefs"], max = 8) {
  if (!Array.isArray(refs)) return [];
  return refs
    .map((ref) => {
      const kind = asTrimmedString(ref?.kind);
      const id = asTrimmedString(ref?.id);
      if (!kind || !id) return "";
      const rolePart = asOptionalTrimmedString(ref?.role);
      const role = rolePart ? `#${rolePart}` : "";
      return `${kind}:${id}${role}`;
    })
    .filter(Boolean)
    .slice(0, max);
}

export function resolveDialogTerminalState(snapshot: DialogStatusSnapshot) {
  const checkpointStatus =
    typeof snapshot.runtimeCheckpoint?.status === "string"
      ? snapshot.runtimeCheckpoint.status
      : null;
  if (checkpointStatus === "done" || checkpointStatus === "completed") return "done";
  if (checkpointStatus === "failed" || checkpointStatus === "error") return "failed";

  const status = snapshot.status ?? checkpointStatus ?? "unknown";
  if (status === "done" || status === "completed") return "done";
  if (status === "failed" || status === "error") return "failed";
  if (status === "running" || status === "pending" || status === "queued") return "active";
  return "unknown";
}

function parseTimeMs(value: unknown): number | null {
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== undefined) return asNumber;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveDialogActiveHealth(snapshot: DialogStatusSnapshot, nowMs = Date.now()) {
  if (resolveDialogTerminalState(snapshot) !== "active") return null;
  const checkpointUpdatedAt = parseTimeMs(snapshot.runtimeCheckpoint?.updatedAt);
  const dialogUpdatedAt = parseTimeMs(snapshot.updatedAt);
  const latest = checkpointUpdatedAt ?? dialogUpdatedAt;
  if (!snapshot.runtimeCheckpoint) return "no-checkpoint";
  if (!checkpointUpdatedAt) return "checkpoint-without-updatedAt";
  if (latest && nowMs - latest > ACTIVE_STALE_AFTER_MS) return "stale-running";
  return "running";
}

export function renderDialogStatus(snapshot: DialogStatusSnapshot) {
  const checkpoint = snapshot.runtimeCheckpoint ?? {};
  const files = list(snapshot.writtenFiles).length
    ? list(snapshot.writtenFiles)
    : artifactFiles(snapshot.artifacts);
  const tools = list(snapshot.toolsUsed).length
    ? list(snapshot.toolsUsed)
    : list(checkpoint.lastToolNames);
  const errors = list(snapshot.toolErrors);
  const errorMessage = compact(checkpoint.errorMessage ?? (snapshot as any).errorMessage);
  const subjectRefs = formatSubjectRefs(snapshot.subjectRefs);
  const terminal = resolveDialogTerminalState(snapshot);
  const activeHealth = resolveDialogActiveHealth(snapshot);
  const lines = [
    `dialog: ${snapshot.dialogId}`,
    ...(snapshot.base ? [`base: ${snapshot.base}`] : []),
    ...(snapshot.title ? [`title: ${snapshot.title}`] : []),
    ...(snapshot.parentDialogId ? [`parentDialogId: ${snapshot.parentDialogId}`] : []),
    ...(snapshot.rootDialogId ? [`rootDialogId: ${snapshot.rootDialogId}`] : []),
    `status: ${snapshot.status ?? "unknown"}`,
    ...(typeof checkpoint.status === "string" ? [`checkpoint: ${checkpoint.status}`] : []),
    `state: ${terminal}`,
    ...(activeHealth ? [`activeHealth: ${activeHealth}`] : []),
    ...(typeof snapshot.durationMs === "number" ? [`durationMs: ${snapshot.durationMs}`] : []),
    ...(snapshot.updatedAt ? [`updatedAt: ${snapshot.updatedAt}`] : []),
    ...(snapshot.finishedAt ? [`finishedAt: ${snapshot.finishedAt}`] : []),
    ...(compact(checkpoint.lastUserInput) ? [`lastUserInput: ${compact(checkpoint.lastUserInput)}`] : []),
    ...(compact(checkpoint.lastAssistantText) ? [`lastAssistantText: ${compact(checkpoint.lastAssistantText)}`] : []),
    ...(errorMessage ? [`error: ${errorMessage}`] : []),
    ...(tools.length ? [`tools: ${tools.join(", ")}`] : []),
    ...(files.length ? [`files: ${files.join(", ")}`] : []),
    ...(subjectRefs.length ? [`subjects: ${subjectRefs.join(", ")}`] : []),
    ...(errors.length ? [`toolErrors: ${errors.join(", ")}`] : []),
    "",
    "next:",
    `- read full dialog: nolo dialog read ${snapshot.dialogId} 120`,
  ];

  if (terminal === "active") {
    lines.push(`- poll again: nolo dialog status ${snapshot.dialogId}`);
  } else if (terminal === "failed") {
    lines.push(`- inspect failure and rerun/continue with: nolo agent run <agent> --continue ${snapshot.dialogId} --msg "..."`);
  } else if (terminal === "done") {
    lines.push("- use artifacts/files above for review, handoff, or alpha integration.");
  } else {
    lines.push("- inspect meta/messages before deciding whether to continue or rerun.");
  }

  return `${lines.join("\n")}\n`;
}
