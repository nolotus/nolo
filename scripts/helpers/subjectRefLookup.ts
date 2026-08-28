import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";

export type SubjectRefTarget = {
  kind: string;
  id: string;
  role?: string;
};

export type SubjectRefDialogCandidate = {
  dbKey?: unknown;
  id?: unknown;
  dialogId?: unknown;
  title?: unknown;
  status?: unknown;
  updatedAt?: unknown;
  subjectRefs?: unknown;
  runtimeCheckpoint?: unknown;
  artifacts?: unknown;
};

export type SubjectRefDialogMatch = {
  dialogId: string | null;
  dialogKey: string | null;
  title: string | null;
  status: string | null;
  updatedAt: string | number | null;
  matchedSubjectRefs: SubjectRefTarget[];
  checkpointStatus: string | null;
  hasArtifacts: boolean;
};

const SUBJECT_KIND_ALIASES = new Map<string, string>([
  ["tableRow", "table-row"],
  ["table-row", "table-row"],
]);

function pickString(value: unknown): string | null {
  return asOptionalTrimmedString(value) ?? null;
}

function normalizeKind(kind: string) {
  return SUBJECT_KIND_ALIASES.get(kind) ?? kind;
}

export function normalizeSubjectRef(value: unknown): SubjectRefTarget | null {
  if (!isRecord(value)) return null;
  const kind = pickString(value.kind);
  const id = pickString(value.id);
  if (!kind || !id) return null;
  const role = pickString(value.role);
  return {
    kind: normalizeKind(kind),
    id,
    ...(role ? { role } : {}),
  };
}

export function extractDialogSubjectRefs(dialog: unknown): SubjectRefTarget[] {
  if (!isRecord(dialog) || !Array.isArray(dialog.subjectRefs)) return [];
  return dialog.subjectRefs
    .map(normalizeSubjectRef)
    .filter((ref): ref is SubjectRefTarget => Boolean(ref));
}

export function dialogMatchesSubjectRef(dialog: unknown, target: SubjectRefTarget) {
  const normalizedTarget = normalizeSubjectRef(target);
  if (!normalizedTarget) return false;
  return extractDialogSubjectRefs(dialog).some(
    (ref) => ref.kind === normalizedTarget.kind && ref.id === normalizedTarget.id
  );
}

function dialogIdFromKey(dbKey: string | null) {
  if (!dbKey) return null;
  const index = dbKey.lastIndexOf("-");
  return index >= 0 ? dbKey.slice(index + 1) : dbKey;
}

function hasArtifacts(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return Boolean(value);
}

export function summarizeSubjectRefDialogMatch(
  dialog: SubjectRefDialogCandidate,
  target: SubjectRefTarget
): SubjectRefDialogMatch | null {
  const normalizedTarget = normalizeSubjectRef(target);
  if (!normalizedTarget) return null;
  const matchedSubjectRefs = extractDialogSubjectRefs(dialog).filter(
    (ref) => ref.kind === normalizedTarget.kind && ref.id === normalizedTarget.id
  );
  if (matchedSubjectRefs.length === 0) return null;

  const dialogKey = pickString(dialog.dbKey);
  const checkpoint = asRecordOrEmpty(dialog.runtimeCheckpoint);
  return {
    dialogId: pickString(dialog.dialogId) ?? pickString(dialog.id) ?? dialogIdFromKey(dialogKey),
    dialogKey,
    title: pickString(dialog.title),
    status: pickString(dialog.status),
    updatedAt:
      typeof dialog.updatedAt === "string" || typeof dialog.updatedAt === "number"
        ? dialog.updatedAt
        : null,
    matchedSubjectRefs,
    checkpointStatus: pickString(checkpoint.status),
    hasArtifacts: hasArtifacts(dialog.artifacts),
  };
}

export function filterDialogsBySubjectRef(
  dialogs: SubjectRefDialogCandidate[],
  target: SubjectRefTarget
): SubjectRefDialogMatch[] {
  return dialogs
    .map((dialog) => summarizeSubjectRefDialogMatch(dialog, target))
    .filter((match): match is SubjectRefDialogMatch => Boolean(match));
}
