import { buildLegacyMemoryEvidence, type LegacyMemoryRecord } from "./legacyMigration";
import { getMemoryEvidenceVNextStrict, putMemoryEvidenceVNext } from "./store";
import type { MemoryEvidenceVNext } from "./types";

export type ApplyLegacyMemoryEvidenceResult =
  | { status: "created"; evidence: MemoryEvidenceVNext }
  | { status: "already_exists"; evidence: MemoryEvidenceVNext }
  | {
      status: "conflict";
      existing: MemoryEvidenceVNext;
      incoming: MemoryEvidenceVNext;
    };

/**
 * Exact persisted-shape equality for one deterministic legacy Evidence record.
 *
 * Do not use generic JSON equality here: these six fields are the vNext Evidence
 * contract and are intentionally the only fields that decide replay vs conflict.
 */
export const isSameLegacyMemoryEvidence = (
  left: MemoryEvidenceVNext,
  right: MemoryEvidenceVNext
): boolean =>
  left.id === right.id &&
  left.ownerId === right.ownerId &&
  left.text === right.text &&
  left.sourceRef === right.sourceRef &&
  left.confidence === right.confidence &&
  left.createdAt === right.createdAt;

/**
 * Controlled Migration Slice 3 write seam.
 *
 * Imports exactly one legacy MemoryItem as deterministic vNext Evidence. It does
 * not create Entity / State / Relation records and is not connected to recall or
 * runtime paths.
 *
 * The deterministic Evidence is immutable once persisted:
 * - absent -> persist it (`created`)
 * - identical -> no write (`already_exists`)
 * - same identity with a different payload -> no write (`conflict`)
 *
 * Store failures are allowed to throw; they are infrastructure failures, not
 * migration conflicts.
 */
export const applyLegacyMemoryEvidence = async (
  db: any,
  item: LegacyMemoryRecord
): Promise<ApplyLegacyMemoryEvidenceResult> => {
  const incoming = buildLegacyMemoryEvidence(item);
  const existing = await getMemoryEvidenceVNextStrict(db, incoming.ownerId, incoming.id);

  if (existing) {
    return isSameLegacyMemoryEvidence(existing, incoming)
      ? { status: "already_exists", evidence: existing }
      : { status: "conflict", existing, incoming };
  }

  await putMemoryEvidenceVNext(db, incoming);
  return { status: "created", evidence: incoming };
};
