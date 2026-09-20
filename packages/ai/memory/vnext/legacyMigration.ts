import { createHash } from "crypto";
import type { MemoryItem, MemoryOwnerType } from "../types";
import type { MemoryEvidenceVNext } from "./types";

/**
 * Migration Slice 1: legacy `MemoryItem` -> vNext identity adapter.
 *
 * Pure functions only. Nothing here touches a database, a provider or the
 * production runtime, and nothing here maps legacy ontology onto the vNext
 * schema: `kind` / `visibility` / `subjectType` / `facet` / `resident` /
 * `importance` stay advisory hints for the migration Interpreter prompt and
 * never enter Evidence text or a core schema.
 *
 * Identity rules that the rest of the migration depends on:
 * - the principal is decided by `(ownerType, ownerId)` together, so
 *   `user:<id>` / `space:<id>` / `system:<id>` can never collide;
 * - Evidence identity is a deterministic SHA-256 of the legacy source identity
 *   only, so re-running a migration over unchanged identity is idempotent and a
 *   later content edit on the legacy side cannot mint a second Evidence id.
 */

/**
 * Identity of the legacy record's owner.
 *
 * `encodeURIComponent` escapes `:` (and `%` itself), while `ownerType` is a
 * closed enum that never contains `:`. So `principalId` is an injective
 * encoding of the pair: the separator cannot be forged by an ownerId, and
 * special characters (`a:b`, `a/b`, `a%b`, unicode) stay distinct from each
 * other and from other owners.
 */
export interface LegacyMemoryPrincipal {
  ownerType: MemoryOwnerType;
  ownerId: string;
  principalId: string;
}

/** The subset of a legacy record that decides persistent identity. */
export type LegacyMemoryIdentity = Pick<MemoryItem, "id" | "ownerType" | "ownerId">;

/** The subset of a legacy record that becomes vNext Evidence content. */
export type LegacyMemoryRecord = LegacyMemoryIdentity &
  Pick<MemoryItem, "content" | "confidence" | "createdAt">;

export const LEGACY_MEMORY_SOURCE_REF_PREFIX = "legacy-memory";
export const LEGACY_MEMORY_EVIDENCE_ID_PREFIX = "mem-legacy-";

export const resolveLegacyMemoryPrincipal = (
  item: Pick<MemoryItem, "ownerType" | "ownerId">
): LegacyMemoryPrincipal => ({
  ownerType: item.ownerType,
  ownerId: item.ownerId,
  principalId: `${item.ownerType}:${encodeURIComponent(item.ownerId)}`,
});

/**
 * Source pointer of the legacy record: principal identity + legacy item id.
 * Same records always produce the same string; different owners or different
 * item ids never do.
 */
export const buildLegacyMemorySourceRef = (item: LegacyMemoryIdentity): string => {
  const { principalId } = resolveLegacyMemoryPrincipal(item);
  return `${LEGACY_MEMORY_SOURCE_REF_PREFIX}:${principalId}:${encodeURIComponent(item.id)}`;
};

/** Unambiguous seed: JSON string escaping keeps `:` inside a value from shifting fields. */
const legacyEvidenceSeed = (principalId: string, itemId: string): string =>
  JSON.stringify([principalId, itemId]);

/**
 * Deterministic vNext Evidence id for a legacy record.
 *
 * Depends on the legacy source identity only — never on `content`, `confidence`
 * or any other mutable field — so an edited legacy record maps onto the same
 * Evidence (a new id per content edit would fragment one memory into N rows).
 * 32 hex chars (128 bit) keeps cross-owner collisions negligible while staying
 * readable; the prefix keeps this space distinguishable from runtime ULIDs.
 */
export const buildLegacyEvidenceId = (item: LegacyMemoryIdentity): string => {
  const { principalId } = resolveLegacyMemoryPrincipal(item);
  const digest = createHash("sha256").update(legacyEvidenceSeed(principalId, item.id)).digest("hex");
  return `${LEGACY_MEMORY_EVIDENCE_ID_PREFIX}${digest.slice(0, 32)}`;
};

/**
 * Clamp a legacy confidence into `[0, 1]`.
 *
 * Missing / non-numeric / non-finite legacy values fall back to `0` (claim
 * nothing) rather than to a confident default: the migration must not invent
 * certainty the legacy side never recorded.
 */
export const clampLegacyConfidence = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/**
 * Deterministic imported Evidence for a legacy record.
 *
 * `ownerId` is the legacy principal identity (`user:<id>` / `space:<id>` /
 * `system:<id>`), not a production vNext ownerId: slices 1–2 never write to a
 * production owner space, and carrying the principal here is what keeps a
 * `space` migration from inheriting a `user` space.
 */
export const buildLegacyMemoryEvidence = (item: LegacyMemoryRecord): MemoryEvidenceVNext => {
  const { principalId } = resolveLegacyMemoryPrincipal(item);
  return {
    id: buildLegacyEvidenceId(item),
    ownerId: principalId,
    text: item.content,
    sourceRef: buildLegacyMemorySourceRef(item),
    confidence: clampLegacyConfidence(item.confidence),
    createdAt: item.createdAt,
  };
};
