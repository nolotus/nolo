import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import {
  filterDialogsBySubjectRef,
  type SubjectRefDialogCandidate,
} from "../helpers/subjectRefLookup";

export type TaskThreadVerifierRowSummary = {
  dbKey: string | null;
  rowId: string | null;
  title: string | null;
  status: string | null;
  codeStatus: string | null;
  owner: unknown;
  notes: unknown;
};

export type TaskThreadActivityRef = {
  type: "dialog";
  dialogId: string;
  dialogKey?: string;
  role?: string;
  agentKey?: string;
  status?: string;
  updatedAt?: string;
};

export type TaskThreadDialogSummary = {
  dialogId: string;
  dialogKey: string | null;
  sourceRef?: TaskThreadActivityRef;
  readable: boolean;
  status: string | null;
  checkpointStatus: string | null;
  title: string | null;
  parentDialogId: string | null;
  rootDialogId: string | null;
  subjectRefs: unknown[];
  runtimeCheckpoint: {
    status: unknown;
    traceSummary: unknown;
    lastToolNames: unknown;
    workspaceProgress: unknown;
    errorMessage: unknown;
    updatedAt: unknown;
  } | null;
  artifacts: unknown;
  error?: string;
};

export type TaskThreadLoopVerification = {
  ok: boolean;
  row: TaskThreadVerifierRowSummary;
  activityRefs: TaskThreadActivityRef[];
  latestActivityRef: TaskThreadActivityRef | null;
  dialogs: TaskThreadDialogSummary[];
  assertions: {
    rowReadable: boolean;
    noMutationAttempted: boolean;
    rowStatusIsTaskTruth: boolean;
    dialogEvidenceIsExecutionTruth: boolean;
  };
};

type DialogReader = (dialogKey: string, dialogId: string) => Promise<unknown>;

function normalizeString(value: unknown): string | null {
  return asOptionalTrimmedString(value) ?? null;
}

function normalizeActivityRef(value: unknown): TaskThreadActivityRef | null {
  if (!isRecord(value)) return null;
  const dialogId = normalizeString(value.dialogId);
  if (value.type !== "dialog" || !dialogId) return null;
  return {
    type: "dialog",
    dialogId,
    ...(normalizeString(value.dialogKey) ? { dialogKey: normalizeString(value.dialogKey)! } : {}),
    ...(normalizeString(value.role) ? { role: normalizeString(value.role)! } : {}),
    ...(normalizeString(value.agentKey) ? { agentKey: normalizeString(value.agentKey)! } : {}),
    ...(normalizeString(value.status) ? { status: normalizeString(value.status)! } : {}),
    ...(normalizeString(value.updatedAt) ? { updatedAt: normalizeString(value.updatedAt)! } : {}),
  };
}

export function extractTaskThreadActivityRefs(row: unknown): {
  activityRefs: TaskThreadActivityRef[];
  latestActivityRef: TaskThreadActivityRef | null;
} {
  const meta = asRecordOrEmpty(asRecordOrEmpty(row).meta);
  const activityRefs = Array.isArray(meta.activityRefs)
    ? meta.activityRefs.map(normalizeActivityRef).filter((ref): ref is TaskThreadActivityRef => Boolean(ref))
    : [];
  const latestActivityRef = normalizeActivityRef(meta.latestActivityRef);
  const deduped = new Map<string, TaskThreadActivityRef>();
  for (const ref of activityRefs) deduped.set(ref.dialogId, ref);
  if (latestActivityRef) deduped.set(latestActivityRef.dialogId, latestActivityRef);
  return {
    activityRefs: Array.from(deduped.values()),
    latestActivityRef,
  };
}

function summarizeRow(row: unknown): TaskThreadVerifierRowSummary {
  const record = asRecordOrEmpty(row);
  const values = asRecordOrEmpty(record.values);
  const meta = asRecordOrEmpty(record.meta);
  return {
    dbKey: normalizeString(record.dbKey) ?? normalizeString(meta.dbKey),
    rowId: normalizeString(record.rowId) ?? normalizeString(record.id),
    title: normalizeString(values.title) ?? normalizeString(record.title) ?? normalizeString(values.name),
    status: normalizeString(values.status) ?? normalizeString(record.status),
    codeStatus: normalizeString(values.codeStatus) ?? normalizeString(record.codeStatus),
    owner: values.owner ?? record.owner ?? null,
    notes: values.notes ?? values.note ?? record.notes ?? null,
  };
}

function buildDialogKey(ref: TaskThreadActivityRef, tenantId?: string): string | null {
  if (ref.dialogKey) return ref.dialogKey;
  if (!tenantId?.trim()) return null;
  return `dialog-${tenantId.trim()}-${ref.dialogId}`;
}

function dialogIdFromKey(dbKey: string | null) {
  if (!dbKey) return null;
  const index = dbKey.lastIndexOf("-");
  return index >= 0 ? dbKey.slice(index + 1) : dbKey;
}

function summarizeRawDialog(
  rawDialog: unknown,
  ref: TaskThreadActivityRef,
  dialogKey: string | null,
): TaskThreadDialogSummary {
  const dialog = asRecordOrEmpty(rawDialog);
  const checkpoint = isRecord(dialog.runtimeCheckpoint) ? dialog.runtimeCheckpoint : null;
  return {
    dialogId: ref.dialogId,
    dialogKey,
    sourceRef: ref,
    readable: true,
    status: normalizeString(dialog.status),
    checkpointStatus: checkpoint ? normalizeString(checkpoint.status) : null,
    title: normalizeString(dialog.title),
    parentDialogId: normalizeString(dialog.parentDialogId),
    rootDialogId: normalizeString(dialog.rootDialogId),
    subjectRefs: Array.isArray(dialog.subjectRefs) ? dialog.subjectRefs : [],
    runtimeCheckpoint: checkpoint
      ? {
          status: checkpoint.status,
          traceSummary: checkpoint.traceSummary,
          lastToolNames: checkpoint.lastToolNames,
          workspaceProgress: checkpoint.workspaceProgress,
          errorMessage: checkpoint.errorMessage,
          updatedAt: checkpoint.updatedAt,
        }
      : null,
    artifacts: dialog.artifacts ?? null,
  };
}

async function summarizeDialog(
  ref: TaskThreadActivityRef,
  readDialog: DialogReader,
  tenantId?: string,
): Promise<TaskThreadDialogSummary> {
  const dialogKey = buildDialogKey(ref, tenantId);
  if (!dialogKey) {
    return {
      dialogId: ref.dialogId,
      dialogKey: null,
      sourceRef: ref,
      readable: false,
      status: null,
      checkpointStatus: null,
      title: null,
      parentDialogId: null,
      rootDialogId: null,
      subjectRefs: [],
      runtimeCheckpoint: null,
      artifacts: null,
      error: "missing dialogKey and tenantId",
    };
  }
  try {
    const rawDialog = await readDialog(dialogKey, ref.dialogId);
    return summarizeRawDialog(rawDialog, ref, dialogKey);
  } catch (error) {
    return {
      dialogId: ref.dialogId,
      dialogKey,
      sourceRef: ref,
      readable: false,
      status: null,
      checkpointStatus: null,
      title: null,
      parentDialogId: null,
      rootDialogId: null,
      subjectRefs: [],
      runtimeCheckpoint: null,
      artifacts: null,
      error: toErrorMessage(error),
    };
  }
}

function refFromSubjectDialogCandidate(candidate: SubjectRefDialogCandidate): TaskThreadActivityRef | null {
  const dialogKey = normalizeString(candidate.dbKey);
  const dialogId =
    normalizeString(candidate.dialogId) ??
    normalizeString(candidate.id) ??
    dialogIdFromKey(dialogKey);
  if (!dialogId) return null;
  return {
    type: "dialog",
    dialogId,
    ...(dialogKey ? { dialogKey } : {}),
    role: "subject-ref",
    ...(normalizeString(candidate.status) ? { status: normalizeString(candidate.status)! } : {}),
    ...(normalizeString(candidate.updatedAt) ? { updatedAt: normalizeString(candidate.updatedAt)! } : {}),
  };
}

function dialogDedupKey(dialog: TaskThreadDialogSummary) {
  return dialog.dialogKey ?? dialog.dialogId;
}

export async function verifyTaskThreadLoopReadOnly(args: {
  row: unknown;
  tenantId?: string;
  readDialog: DialogReader;
  subjectDialogCandidates?: SubjectRefDialogCandidate[];
}): Promise<TaskThreadLoopVerification> {
  const { activityRefs, latestActivityRef } = extractTaskThreadActivityRefs(args.row);
  const dialogs = [];
  for (const ref of activityRefs) {
    dialogs.push(await summarizeDialog(ref, args.readDialog, args.tenantId));
  }
  const rowSummary = summarizeRow(args.row);
  if (rowSummary.dbKey && args.subjectDialogCandidates?.length) {
    const matches = filterDialogsBySubjectRef(args.subjectDialogCandidates, {
      kind: "table-row",
      id: rowSummary.dbKey,
      role: "task",
    });
    const seen = new Set(dialogs.map(dialogDedupKey));
    for (const match of matches) {
      const candidate = args.subjectDialogCandidates.find((item) => {
        const ref = refFromSubjectDialogCandidate(item);
        return ref?.dialogId === match.dialogId || ref?.dialogKey === match.dialogKey;
      });
      if (!candidate) continue;
      const ref = refFromSubjectDialogCandidate(candidate);
      if (!ref) continue;
      const summary = summarizeRawDialog(candidate, ref, match.dialogKey);
      const key = dialogDedupKey(summary);
      if (seen.has(key)) continue;
      seen.add(key);
      dialogs.push(summary);
    }
  }
  return {
    ok: true,
    row: rowSummary,
    activityRefs,
    latestActivityRef,
    dialogs,
    assertions: {
      rowReadable: Boolean(args.row),
      noMutationAttempted: true,
      rowStatusIsTaskTruth: true,
      dialogEvidenceIsExecutionTruth: true,
    },
  };
}
