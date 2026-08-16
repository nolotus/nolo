/**
 * Pure preflight for reconciling device-local Agent references inside an
 * existing account Space catalog (explicit-sync Space slice).
 *
 * Reads SpaceData.contents semantics only — no UI, category thunks, or
 * Space creation. Classifies every non-null content reference; never
 * silently skips a local reference.
 *
 * Supported in this slice:
 * - device-local Agent references → queued for account snapshot sync
 * - already non-local / account / public remote references → preserved
 *
 * Unsupported (reject whole preflight before any account writes):
 * - device-local dialog / page / doc / table / file / image / app / task /
 *   unknown local records
 * - SpaceContent.type/metadata claiming "agent" without authoritative Agent
 *   record identity (key + record type)
 * - missing or tombstoned records when readRecord is supplied (all non-null
 *   refs, including remote/public/current-account)
 *
 * Null content/category tombstones are left untouched and do not fail preflight.
 */

import { asTrimmedString } from "core/trimmedString";
import {
  isDeviceLocalDbKey,
  isDeviceLocalOwnerId,
} from "database/authority/deviceLocal";
import { isAgentKey } from "database/keys";

/** Minimal Space content shape (avoids importing UI/category modules). */
export type SpaceContentLike = {
  title?: string;
  type?: string;
  contentKey?: string;
  categoryId?: string | null;
  pinned?: boolean;
  createdAt?: number;
  updatedAt?: number;
  order?: number;
  tags?: string[];
  [key: string]: unknown;
};

export type SpaceContentsLike = Record<string, SpaceContentLike | null>;

export type QueuedLocalAgentRef = {
  /** Map key under Space.contents */
  entryKey: string;
  /** Authoritative contentKey (dbKey) to sync */
  contentKey: string;
  /** Normalized type: "agent" */
  type: "agent";
};

export type UnsupportedLocalContentDetail = {
  entryKey: string;
  contentKey: string;
  /** Stable content type string for UI (dialog/page/file/unknown/…). */
  type: string;
  reason: string;
};

export type PreflightAccountSpaceLocalAgentsOk = {
  ok: true;
  queuedLocalAgents: QueuedLocalAgentRef[];
  preservedRemoteCount: number;
  tombstoneCount: number;
  /** Total non-null entries inspected. */
  nonNullCount: number;
};

export type PreflightAccountSpaceLocalAgentsReject = {
  ok: false;
  reason:
    | "unsupported_local_content"
    | "missing_or_tombstoned_record"
    | "authoritative_type_mismatch";
  /** Counts by type for UI summary chips. */
  unsupportedByType: Record<string, number>;
  details: UnsupportedLocalContentDetail[];
  queuedLocalAgents: QueuedLocalAgentRef[];
  preservedRemoteCount: number;
  tombstoneCount: number;
  nonNullCount: number;
};

export type PreflightAccountSpaceLocalAgentsResult =
  | PreflightAccountSpaceLocalAgentsOk
  | PreflightAccountSpaceLocalAgentsReject;

export type PreflightAccountSpaceLocalAgentsDeps = {
  /**
   * Authoritative record read. When supplied:
   * - every non-null content reference is read (local + remote/public)
   * - missing/tombstoned refs reject before any success claim
   * - local Agent queue requires non-tombstoned local Agent identity
   * Metadata (SpaceContent.type) is only a hint.
   */
  readRecord?: (dbKey: string) => Promise<Record<string, unknown> | null>;
};

const AGENT_TYPES = new Set(["agent"]);

const UNSUPPORTED_LOCAL_TYPES = new Set([
  "dialog",
  "page",
  "doc",
  "table",
  "file",
  "image",
  "app",
  "task",
  "unknown",
]);

const clean = (value: unknown): string => asTrimmedString(value);

const isTombstoneRecord = (
  record: Record<string, unknown> | null | undefined
): boolean => {
  if (!record) return true;
  if (record.deleted === true) return true;
  if (record.isTombstone === true) return true;
  if (typeof record.deletedAt === "string" && record.deletedAt.trim()) {
    return true;
  }
  return false;
};

/**
 * True when a dbKey looks device-local by prefix or `*-local-*` owner segment.
 * Broader than agent/dialog-only helpers so page/file/table/app local keys
 * are never silently treated as remote.
 */
export const isDeviceLocalContentKey = (dbKey: unknown): boolean => {
  const key = clean(dbKey);
  if (!key) return false;
  if (isDeviceLocalDbKey(key)) return true;
  const parts = key.split("-");
  // type-local-id… (e.g. page-local-…, file-local-…, app-local-…, meta-local-…)
  if (parts.length >= 3 && parts[1] === "local") return true;
  return false;
};

const normalizeContentType = (
  rawType: unknown,
  contentKey: string
): string => {
  const t = clean(rawType).toLowerCase();
  if (t) {
    // SpaceContent historically used "page" for docs.
    if (t === "doc") return "page";
    return t;
  }
  if (isAgentKey(contentKey)) {
    return "agent";
  }
  const prefix = contentKey.split("-")[0]?.toLowerCase() ?? "";
  if (prefix === "meta") return "table";
  if (prefix === "doc") return "page";
  if (
    prefix === "dialog" ||
    prefix === "page" ||
    prefix === "file" ||
    prefix === "image" ||
    prefix === "app" ||
    prefix === "task" ||
    prefix === "agent" ||
    prefix === "table"
  ) {
    return prefix === "table" ? "table" : prefix;
  }
  return "unknown";
};

const stableUnsupportedType = (type: string): string =>
  UNSUPPORTED_LOCAL_TYPES.has(type) ? type : "unknown";

/**
 * Detail type for missing/tombstoned refs. Keep agent (and key-inferred
 * agent identity) instead of collapsing them through the unsupported-only set.
 */
const detailTypeForMissingOrTombstone = (
  metaType: string,
  contentKey: string
): string => {
  if (AGENT_TYPES.has(metaType) || isAgentKey(contentKey)) {
    return "agent";
  }
  return stableUnsupportedType(metaType);
};

const bump = (counts: Record<string, number>, type: string) => {
  counts[type] = (counts[type] ?? 0) + 1;
};

const recordOwnerId = (record: Record<string, unknown>): string => {
  const userId = clean(record.userId);
  if (userId) return userId;
  return clean(record.ownerId);
};

const recordDbKey = (
  record: Record<string, unknown>,
  fallback: string
): string => {
  const key = clean(record.dbKey);
  return key || fallback;
};

/**
 * Canonical Agent identity from the authoritative record body + key.
 * SpaceContent.type is intentionally ignored here (metadata is only a hint).
 *
 * - Key must be a canonical agent dbKey.
 * - Explicit record.type, when present, must be agent.
 * - Missing record.type is allowed when the key is a canonical agent dbKey
 *   (legacy bodies).
 */
const authoritativeAgentType = (
  record: Record<string, unknown>,
  contentKey: string
): "agent" | null => {
  const key = recordDbKey(record, contentKey);
  if (!isAgentKey(contentKey) && !isAgentKey(key)) {
    return null;
  }
  const recordType = clean(record.type).toLowerCase();
  if (recordType) {
    if (recordType === "doc") {
      return null;
    }
    if (!AGENT_TYPES.has(recordType)) {
      return null;
    }
    return "agent";
  }
  // Legacy: no type on body — trust canonical agent key only.
  return "agent";
};

const isRecordDeviceLocal = (
  record: Record<string, unknown>,
  contentKey: string
): boolean => {
  const owner = recordOwnerId(record);
  const key = recordDbKey(record, contentKey);
  return (
    isDeviceLocalOwnerId(owner) ||
    isDeviceLocalContentKey(key) ||
    isDeviceLocalContentKey(contentKey)
  );
};

/**
 * Classify every entry in Space.contents without mutating the input map.
 */
export async function preflightAccountSpaceLocalAgents(
  contents: SpaceContentsLike | null | undefined,
  deps: PreflightAccountSpaceLocalAgentsDeps = {}
): Promise<PreflightAccountSpaceLocalAgentsResult> {
  const map = contents ?? {};
  const queuedLocalAgents: QueuedLocalAgentRef[] = [];
  const details: UnsupportedLocalContentDetail[] = [];
  const unsupportedByType: Record<string, number> = {};
  let preservedRemoteCount = 0;
  let tombstoneCount = 0;
  let nonNullCount = 0;
  let missingOrTombstoned = false;
  let typeMismatch = false;

  // Small per-call cache: same contentKey may appear under multiple entry keys.
  const readCache = new Map<string, Record<string, unknown> | null>();
  const readCached = async (
    dbKey: string
  ): Promise<Record<string, unknown> | null | undefined> => {
    if (!deps.readRecord) return undefined;
    if (readCache.has(dbKey)) {
      return readCache.get(dbKey) ?? null;
    }
    const record = await deps.readRecord(dbKey);
    readCache.set(dbKey, record);
    return record;
  };

  // Prefetch authoritative records so the classification loop hits cache only.
  if (deps.readRecord) {
    const uniqueKeys = new Set<string>();
    for (const entryKey of Object.keys(map)) {
      const entry = map[entryKey];
      if (entry === null || entry === undefined) {
        continue;
      }
      const contentKey = clean(entry.contentKey) || clean(entryKey);
      if (contentKey) {
        uniqueKeys.add(contentKey);
      }
    }
    await Promise.all(Array.from(uniqueKeys).map((k) => readCached(k)));
  }

  // Stable iteration order for deterministic details (Object key order).
  for (const entryKey of Object.keys(map)) {
    const entry = map[entryKey];
    if (entry === null) {
      tombstoneCount += 1;
      continue;
    }
    if (entry === undefined) {
      continue;
    }

    nonNullCount += 1;
    const contentKey = clean(entry.contentKey) || clean(entryKey);
    if (!contentKey) {
      missingOrTombstoned = true;
      const type = "unknown";
      bump(unsupportedByType, type);
      details.push({
        entryKey,
        contentKey: entryKey,
        type,
        reason: "empty_content_key",
      });
      continue;
    }

    // Metadata type is a hint only — never sufficient to queue as Agent.
    const metaType = normalizeContentType(entry.type, contentKey);
    let isLocal =
      isDeviceLocalContentKey(contentKey) || isDeviceLocalContentKey(entryKey);

    // When authority is available, read every non-null reference once
    // (local + remote/public/current-account). Dead refs fail closed.
    if (deps.readRecord) {
      const record = await readCached(contentKey);
      if (isTombstoneRecord(record)) {
        missingOrTombstoned = true;
        const type = detailTypeForMissingOrTombstone(metaType, contentKey);
        bump(unsupportedByType, type);
        details.push({
          entryKey,
          contentKey,
          type,
          reason: "missing_or_tombstoned_record",
        });
        continue;
      }

      // record is non-null non-tombstone here
      const body = record as Record<string, unknown>;
      if (isRecordDeviceLocal(body, contentKey)) {
        isLocal = true;
      } else {
        // Authoritative remote/public/account body — preserve unchanged.
        preservedRemoteCount += 1;
        continue;
      }

      // Device-local with authoritative body: only queue proven Agents.
      const agentType = authoritativeAgentType(body, contentKey);
      if (agentType) {
        // Extra locality gate: body must still be device-local (not only key).
        if (!isRecordDeviceLocal(body, contentKey)) {
          preservedRemoteCount += 1;
          continue;
        }
        queuedLocalAgents.push({
          entryKey,
          contentKey,
          type: agentType,
        });
        continue;
      }

      // Not an authoritative Agent. If catalog metadata/key looked agent-like,
      // surface a stable type-mismatch rather than silently queue/upload.
      const bodyType = stableUnsupportedType(
        normalizeContentType(body.type, contentKey)
      );
      const metaLookedAgent =
        AGENT_TYPES.has(metaType) || isAgentKey(contentKey);
      if (metaLookedAgent) {
        typeMismatch = true;
        bump(unsupportedByType, bodyType);
        details.push({
          entryKey,
          contentKey,
          type: bodyType,
          reason: "authoritative_type_mismatch",
        });
        continue;
      }

      bump(unsupportedByType, bodyType);
      details.push({
        entryKey,
        contentKey,
        type: bodyType,
        reason: "unsupported_device_local_content",
      });
      continue;
    }

    // No readRecord: classify from key/metadata only (no authority proof).
    // Cannot queue Agents without authoritative record proof.
    if (!isLocal) {
      preservedRemoteCount += 1;
      continue;
    }

    // Device-local without authority: never queue as Agent (metadata is a hint).
    const stableType = stableUnsupportedType(metaType);
    if (AGENT_TYPES.has(metaType) || isAgentKey(contentKey)) {
      // Would have been an agent candidate — refuse without proof.
      missingOrTombstoned = true;
      bump(unsupportedByType, stableType === "unknown" && isAgentKey(contentKey)
        ? "agent"
        : stableType);
      details.push({
        entryKey,
        contentKey,
        type:
          AGENT_TYPES.has(metaType) || isAgentKey(contentKey)
            ? "agent"
            : stableType,
        reason: "missing_or_tombstoned_record",
      });
      continue;
    }

    bump(unsupportedByType, stableType);
    details.push({
      entryKey,
      contentKey,
      type: stableType,
      reason: "unsupported_device_local_content",
    });
  }

  if (details.length > 0) {
    // Precedence: missing/tombstone > type mismatch > unsupported local.
    const hasMissing =
      missingOrTombstoned ||
      details.some(
        (d) =>
          d.reason === "missing_or_tombstoned_record" ||
          d.reason === "empty_content_key"
      );
    const hasTypeMismatch =
      typeMismatch ||
      details.some((d) => d.reason === "authoritative_type_mismatch");
    return {
      ok: false,
      reason: hasMissing
        ? "missing_or_tombstoned_record"
        : hasTypeMismatch
          ? "authoritative_type_mismatch"
          : "unsupported_local_content",
      unsupportedByType: { ...unsupportedByType },
      details: details.map((d) => ({ ...d })),
      queuedLocalAgents: queuedLocalAgents.map((q) => ({ ...q })),
      preservedRemoteCount,
      tombstoneCount,
      nonNullCount,
    };
  }

  return {
    ok: true,
    queuedLocalAgents: queuedLocalAgents.map((q) => ({ ...q })),
    preservedRemoteCount,
    tombstoneCount,
    nonNullCount,
  };
}

/**
 * Build a new contents map rewriting local Agent entry keys → remote keys.
 * Preserves every metadata field, null tombstones, and non-rewritten entries.
 * Does not mutate the input.
 *
 * Returns collision details when a remote key already occupies a different
 * non-null entry (safe fail; caller must not patch).
 */
export function buildRewrittenSpaceContents(input: {
  contents: SpaceContentsLike | null | undefined;
  /** local contentKey/entryKey → remote dbKey */
  rewrites: ReadonlyArray<{ localKey: string; remoteKey: string }>;
}): {
  contents: SpaceContentsLike;
  collisions: Array<{ localKey: string; remoteKey: string; existingEntryKey: string }>;
  rewrittenCount: number;
} {
  const source = input.contents ?? {};
  // Shallow-clone map; clone non-null entries so callers cannot mutate source.
  const next: SpaceContentsLike = {};
  for (const [key, value] of Object.entries(source)) {
    next[key] = value === null ? null : { ...value };
  }

  const collisions: Array<{
    localKey: string;
    remoteKey: string;
    existingEntryKey: string;
  }> = [];
  let rewrittenCount = 0;

  const findEntry = (
    localKey: string
  ): { entryKey: string; content: SpaceContentLike } | null => {
    const direct = next[localKey];
    if (direct) return { entryKey: localKey, content: direct };
    for (const [entryKey, item] of Object.entries(next)) {
      if (!item) continue;
      if (clean(item.contentKey) === localKey) {
        return { entryKey, content: item };
      }
    }
    return null;
  };

  for (const { localKey, remoteKey } of input.rewrites) {
    const local = clean(localKey);
    const remote = clean(remoteKey);
    if (!local || !remote || local === remote) continue;

    const found = findEntry(local);
    if (!found) continue;

    // Collision: remote key already exists as a different live entry.
    const existingAtRemote = next[remote];
    if (existingAtRemote && found.entryKey !== remote) {
      collisions.push({
        localKey: local,
        remoteKey: remote,
        existingEntryKey: remote,
      });
      continue;
    }
    // Also collide if another entry's contentKey equals remote.
    for (const [entryKey, item] of Object.entries(next)) {
      if (!item || entryKey === found.entryKey) continue;
      if (clean(item.contentKey) === remote || entryKey === remote) {
        collisions.push({
          localKey: local,
          remoteKey: remote,
          existingEntryKey: entryKey,
        });
        break;
      }
    }
    if (collisions.some((c) => c.localKey === local && c.remoteKey === remote)) {
      continue;
    }

    const rewritten: SpaceContentLike = {
      ...found.content,
      contentKey: remote,
    };
    // Remove old entry key; place under remote key.
    if (found.entryKey !== remote) {
      delete next[found.entryKey];
    }
    next[remote] = rewritten;
    rewrittenCount += 1;
  }

  return { contents: next, collisions, rewrittenCount };
}

/**
 * Diff source → rewritten for patchAction deepMerge semantics:
 * - null for removed local keys
 * - full SpaceContent for new/updated remote keys
 * - omit unchanged keys
 * Does not include keys that stay identical.
 */
export function buildSpaceContentsPatchChanges(
  previous: SpaceContentsLike | null | undefined,
  next: SpaceContentsLike
): Record<string, SpaceContentLike | null> {
  const prev = previous ?? {};
  const changes: Record<string, SpaceContentLike | null> = {};

  for (const key of Object.keys(prev)) {
    if (!(key in next)) {
      changes[key] = null;
    }
  }
  for (const [key, value] of Object.entries(next)) {
    const before = prev[key];
    if (before === value) continue;
    if (
      before &&
      value &&
      clean(before.contentKey) === clean(value.contentKey) &&
      // same object shape after rewrite check: only emit if different
      JSON.stringify(before) === JSON.stringify(value)
    ) {
      continue;
    }
    if (before === null && value === null) continue;
    if (
      before &&
      value &&
      JSON.stringify(before) === JSON.stringify(value)
    ) {
      continue;
    }
    changes[key] = value === null ? null : { ...value };
  }
  return changes;
}
