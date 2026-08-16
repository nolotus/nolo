import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";

export type SubjectRefIndexRef = {
  kind: string;
  id: string;
};

export type SubjectRefIndexOp = {
  type: "put";
  key: string;
  value: string;
};

const SUBJECT_INDEX_PREFIX = "subjectidx";
const SUBJECT_KIND_ALIASES = new Map<string, string>([
  ["tableRow", "table-row"],
  ["table-row", "table-row"],
]);

function pickString(value: unknown): string | null {
  return asOptionalTrimmedString(value) ?? null;
}

function normalizeKind(value: string) {
  return SUBJECT_KIND_ALIASES.get(value) ?? value;
}

function encodeIndexPart(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function normalizeSubjectRef(value: unknown): SubjectRefIndexRef | null {
  if (!isRecord(value)) return null;
  const kind = pickString(value.kind);
  const id = pickString(value.id);
  if (!kind || !id) return null;
  return { kind: normalizeKind(kind), id };
}

export function normalizeSubjectRefsForIndex(value: unknown): SubjectRefIndexRef[] {
  if (!Array.isArray(value)) return [];
  const refs = new Map<string, SubjectRefIndexRef>();
  for (const item of value) {
    const ref = normalizeSubjectRef(item);
    if (!ref) continue;
    refs.set(`${ref.kind}\n${ref.id}`, ref);
  }
  return Array.from(refs.values());
}

export function buildSubjectRefIndexRange(ownerId: string, ref: SubjectRefIndexRef) {
  const normalized = normalizeSubjectRef(ref);
  if (!ownerId.trim() || !normalized) return { start: "", end: "" };
  const start = [
    SUBJECT_INDEX_PREFIX,
    encodeIndexPart(ownerId.trim()),
    encodeIndexPart(normalized.kind),
    encodeIndexPart(normalized.id),
    "",
  ].join("-");
  return { start, end: `${start}\uffff` };
}

export function buildSubjectRefIndexKey(args: {
  ownerId: string;
  subjectRef: SubjectRefIndexRef;
  recordKey: string;
}) {
  const range = buildSubjectRefIndexRange(args.ownerId, args.subjectRef);
  if (!range.start || !args.recordKey.trim()) return "";
  return `${range.start}${encodeIndexPart(args.recordKey.trim())}`;
}

export function buildSubjectRefIndexPutOps(args: {
  ownerId: string;
  recordKey: string;
  record: { subjectRefs?: unknown };
}): SubjectRefIndexOp[] {
  if (!args.ownerId.trim() || !args.recordKey.trim()) return [];
  return normalizeSubjectRefsForIndex(args.record?.subjectRefs).flatMap((subjectRef) => {
    const key = buildSubjectRefIndexKey({
      ownerId: args.ownerId,
      subjectRef,
      recordKey: args.recordKey,
    });
    return key ? [{ type: "put" as const, key, value: args.recordKey }] : [];
  });
}
