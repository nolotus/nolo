/**
 * Explicit-sync: reconcile device-local Agent references inside an EXISTING
 * current-account Space catalog.
 *
 * Boundaries (this slice):
 * - There is no first-class device-local Space. Do not create/map a second
 *   remote Space. Only patch the same account Space key that was passed in.
 * - Preflight rejects unsupported device-local non-Agent content before any
 *   account writes.
 * - Local Agents remain device-local/global; only Space.contents object keys /
 *   contentKey fields switch to mapped account Agent keys.
 * - Reuses syncStandaloneAgentToAccount (secret strip, durable mapping,
 *   idempotent reuse). No dialogs/messages/attachments beyond that command.
 *
 * Partial failure (documented, no fake transaction):
 * If some Agents map successfully and a later Agent or the Space patch fails,
 * account Agents/mappings may already exist. Retry is idempotent for mapped
 * Agents and re-applies a single Space contents patch. There is no rollback.
 */

import { toErrorMessage } from "core/errorMessage";
import { asTrimmedString } from "core/trimmedString";
import {
  isDeviceLocalOwnerId,
} from "database/authority/deviceLocal";
import {
  createSyncJobRegistry,
  getDefaultSyncJobRegistry,
  type SyncJobRegistry,
} from "./syncJobRegistry";
import {
  buildRewrittenSpaceContents,
  buildSpaceContentsPatchChanges,
  preflightAccountSpaceLocalAgents,
  type PreflightAccountSpaceLocalAgentsReject,
  type QueuedLocalAgentRef,
  type SpaceContentLike,
  type SpaceContentsLike,
} from "./preflightAccountSpaceLocalAgents";
import {
  syncStandaloneAgentToAccount,
  type SyncStandaloneAgentToAccountDeps,
  type SyncStandaloneAgentToAccountResult,
} from "./syncStandaloneAgentToAccount";
import type { SyncMappingStore } from "./syncMapping";

export type SyncAccountSpaceLocalAgentsToAccountInput = {
  /** Existing Space dbKey (e.g. space-{ulid}). Not created or remapped. */
  spaceKey: string;
  /** Active Nolo account user id (must not be "local"). */
  accountUserId: string;
  /** Optional external abort (also cancelled via auth-reset job registry). */
  signal?: AbortSignal;
};

export type SyncAccountSpaceLocalAgentsToAccountResult = {
  spaceKey: string;
  accountUserId: string;
  /** True when no local Agents needed rewrite (honest no-op; no Space patch). */
  noop: boolean;
  rewrittenCount: number;
  agentResults: SyncStandaloneAgentToAccountResult[];
  /** Space record after patch, or the original when noop. */
  space: Record<string, unknown>;
};

export type SyncAccountSpaceLocalAgentsToAccountDeps = {
  readRecord: (dbKey: string) => Promise<Record<string, unknown> | null>;
  /**
   * Account Agent write path (same contract as syncStandaloneAgentToAccount).
   * Only used when agents are queued; not used for Space body records.
   */
  writeRecord: SyncStandaloneAgentToAccountDeps["writeRecord"];
  /**
   * Authoritative Space patch. Prefer production patchAction semantics via
   * injection. Must deep-merge `changes` (null contents keys delete entries).
   * Never invent a new spaceKey.
   */
  patchSpace: (args: {
    dbKey: string;
    changes: {
      contents: Record<string, SpaceContentLike | null>;
      updatedAt?: number | string;
    };
  }) => Promise<Record<string, unknown>>;
  /** Optional override of the standalone agent sync command (tests). */
  syncStandaloneAgent?: typeof syncStandaloneAgentToAccount;
  mappingStore?: SyncMappingStore;
  persistMappingDurable?: boolean;
  jobRegistry?: SyncJobRegistry;
  now?: () => number;
  createId?: () => string;
  log?: SyncStandaloneAgentToAccountDeps["log"];
};

export type SpaceLocalAgentsSyncErrorCode =
  | "INVALID_ACCOUNT"
  | "INVALID_SPACE_KEY"
  | "SPACE_NOT_FOUND"
  | "SPACE_NOT_WRITABLE"
  | "PREFLIGHT_REJECTED"
  | "CONTENT_KEY_COLLISION"
  | "ABORTED";

export class SpaceLocalAgentsSyncError extends Error {
  readonly code: SpaceLocalAgentsSyncErrorCode;
  readonly preflight?: PreflightAccountSpaceLocalAgentsReject;
  readonly collisions?: Array<{
    localKey: string;
    remoteKey: string;
    existingEntryKey: string;
  }>;

  constructor(
    code: SpaceLocalAgentsSyncErrorCode,
    message: string,
    extra?: {
      preflight?: PreflightAccountSpaceLocalAgentsReject;
      collisions?: Array<{
        localKey: string;
        remoteKey: string;
        existingEntryKey: string;
      }>;
    }
  ) {
    super(message);
    this.name = "SpaceLocalAgentsSyncError";
    this.code = code;
    if (extra?.preflight) this.preflight = extra.preflight;
    if (extra?.collisions) this.collisions = extra.collisions;
  }
}

const normalize = (value: unknown): string => asTrimmedString(value);

/**
 * Canonical Space dbKey: `space-{ownerOrSegment}-{id…}` (at least three
 * hyphen-separated parts, first part exactly `space`).
 */
export const isCanonicalSpaceKey = (dbKey: unknown): boolean => {
  const key = normalize(dbKey);
  if (!key) return false;
  const parts = key.split("-");
  return parts.length >= 3 && parts[0] === "space" && parts.every((p) => p.length > 0);
};

const throwIfAborted = (signal: AbortSignal | undefined, phase: string) => {
  if (signal?.aborted) {
    const reason =
      typeof signal.reason === "string"
        ? signal.reason
        : signal.reason instanceof Error
          ? signal.reason.message
          : "aborted";
    const err = new SpaceLocalAgentsSyncError(
      "ABORTED",
      `syncAccountSpaceLocalAgentsToAccount aborted at ${phase}: ${reason}`
    );
    err.name = "AbortError";
    throw err;
  }
};

const isTombstone = (record: Record<string, unknown> | null): boolean => {
  if (!record) return true;
  if (record.deleted === true) return true;
  if (record.isTombstone === true) return true;
  if (typeof record.deletedAt === "string" && record.deletedAt.trim()) {
    return true;
  }
  return false;
};

/**
 * Pure authoritative Space validation for local-Agent reconciliation.
 * Shared by confirmed sync and UI read-only preflight so they cannot drift.
 *
 * Validates:
 * - non-local accountUserId
 * - canonical `space-*` key
 * - record exists / not tombstone
 * - if `type` is present, it must be `space` (legacy omit type is allowed)
 * - ownerId/userId is non-local and matches accountUserId
 *
 * @returns the validated Space record
 * @throws SpaceLocalAgentsSyncError with stable codes
 */
export function assertAuthoritativeAccountSpaceForLocalAgentsSync(input: {
  spaceKey: unknown;
  accountUserId: unknown;
  space: Record<string, unknown> | null;
}): Record<string, unknown> {
  const accountUserId = normalize(input.accountUserId);
  const spaceKey = normalize(input.spaceKey);

  if (!accountUserId || accountUserId === "local") {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_ACCOUNT",
      "syncAccountSpaceLocalAgentsToAccount requires a non-local accountUserId"
    );
  }
  if (!spaceKey || !isCanonicalSpaceKey(spaceKey)) {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_SPACE_KEY",
      spaceKey
        ? `syncAccountSpaceLocalAgentsToAccount: key is not a canonical space-* key: ${spaceKey}`
        : "syncAccountSpaceLocalAgentsToAccount requires spaceKey"
    );
  }
  if (isTombstone(input.space)) {
    throw new SpaceLocalAgentsSyncError(
      "SPACE_NOT_FOUND",
      `syncAccountSpaceLocalAgentsToAccount: space not found: ${spaceKey}`
    );
  }

  const space = input.space as Record<string, unknown>;

  // Legacy Space bodies may omit `type` when the key is already canonical
  // `space-*`; an explicit non-space type always fails.
  const recordType = normalize(space.type).toLowerCase();
  if (recordType && recordType !== "space") {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_SPACE_KEY",
      `syncAccountSpaceLocalAgentsToAccount: record type ${recordType} is not a Space: ${spaceKey}`
    );
  }

  // Owner is the authority that may rewrite catalog references (members-only
  // spaces are not accepted in this slice).
  const ownerId = normalize(space.ownerId) || normalize(space.userId);
  if (!ownerId || isDeviceLocalOwnerId(ownerId)) {
    throw new SpaceLocalAgentsSyncError(
      "SPACE_NOT_WRITABLE",
      `syncAccountSpaceLocalAgentsToAccount: space is not a current-account Space: ${spaceKey}`
    );
  }
  if (ownerId !== accountUserId) {
    throw new SpaceLocalAgentsSyncError(
      "SPACE_NOT_WRITABLE",
      `syncAccountSpaceLocalAgentsToAccount: space owner ${ownerId} is not active account ${accountUserId}`
    );
  }

  return space;
}

const linkAbortController = (
  external: AbortSignal | undefined
): AbortController => {
  const controller = new AbortController();
  if (!external) return controller;
  if (external.aborted) {
    controller.abort(external.reason);
    return controller;
  }
  external.addEventListener(
    "abort",
    () => controller.abort(external.reason),
    { once: true }
  );
  return controller;
};

const defaultLog: SyncStandaloneAgentToAccountDeps["log"] = (event, data) => {
  void import("app/localFirst/localFirstLog")
    .then(({ localFirstLog }) => {
      localFirstLog(event, data);
    })
    .catch(() => {
      /* diagnostics optional */
    });
};

/**
 * Sync every device-local Agent referenced by an existing account Space, then
 * rewrite those catalog references to the mapped account Agent keys on the
 * SAME Space record.
 */
export async function syncAccountSpaceLocalAgentsToAccount(
  input: SyncAccountSpaceLocalAgentsToAccountInput,
  deps: SyncAccountSpaceLocalAgentsToAccountDeps
): Promise<SyncAccountSpaceLocalAgentsToAccountResult> {
  const accountUserId = normalize(input.accountUserId);
  const spaceKey = normalize(input.spaceKey);
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? Date.now;
  const jobRegistry = deps.jobRegistry ?? getDefaultSyncJobRegistry();
  const syncAgent = deps.syncStandaloneAgent ?? syncStandaloneAgentToAccount;

  if (!accountUserId || accountUserId === "local") {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_ACCOUNT",
      "syncAccountSpaceLocalAgentsToAccount requires a non-local accountUserId"
    );
  }
  if (!spaceKey || !isCanonicalSpaceKey(spaceKey)) {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_SPACE_KEY",
      spaceKey
        ? `syncAccountSpaceLocalAgentsToAccount: key is not a canonical space-* key: ${spaceKey}`
        : "syncAccountSpaceLocalAgentsToAccount requires spaceKey"
    );
  }

  const job = jobRegistry.register({
    accountUserId,
    label: "syncAccountSpaceLocalAgentsToAccount",
    controller: linkAbortController(input.signal),
  });
  const signal = job.signal;

  try {
    throwIfAborted(signal, "start");
    log?.("sync.spaceLocalAgents.start", {
      accountUserId,
      spaceKey,
    });

    throwIfAborted(signal, "before-space-read");
    const spaceRecord = await deps.readRecord(spaceKey);
    throwIfAborted(signal, "after-space-read");

    const space = assertAuthoritativeAccountSpaceForLocalAgentsSync({
      spaceKey,
      accountUserId,
      space: spaceRecord,
    });

    const rawContents = (space as { contents?: SpaceContentsLike }).contents;
    // Defensive copy so preflight/rewrite never observe caller mutation mid-flight.
    const contentsSnapshot: SpaceContentsLike = {};
    if (rawContents && typeof rawContents === "object") {
      for (const [k, v] of Object.entries(rawContents)) {
        contentsSnapshot[k] = v === null ? null : { ...v };
      }
    }

    // Preflight completes before any account writes.
    throwIfAborted(signal, "before-preflight");
    const preflight = await preflightAccountSpaceLocalAgents(contentsSnapshot, {
      readRecord: deps.readRecord,
    });
    throwIfAborted(signal, "after-preflight");

    if (!preflight.ok) {
      log?.("sync.spaceLocalAgents.preflightRejected", {
        accountUserId,
        spaceKey,
        reason: preflight.reason,
        detailCount: preflight.details.length,
      });
      throw new SpaceLocalAgentsSyncError(
        "PREFLIGHT_REJECTED",
        `syncAccountSpaceLocalAgentsToAccount preflight rejected: ${preflight.reason}`,
        { preflight }
      );
    }

    const queued: QueuedLocalAgentRef[] = preflight.queuedLocalAgents;

    if (queued.length === 0) {
      log?.("sync.spaceLocalAgents.noop", {
        accountUserId,
        spaceKey,
        preservedRemoteCount: preflight.preservedRemoteCount,
      });
      return {
        spaceKey,
        accountUserId,
        noop: true,
        rewrittenCount: 0,
        agentResults: [],
        space,
      };
    }

    // Sync each local Agent (idempotent via mapping). Partial success is possible.
    const agentResults: SyncStandaloneAgentToAccountResult[] = [];
    const rewrites: Array<{ localKey: string; remoteKey: string }> = [];

    const synced = await Promise.all(
      queued.map(async (ref) => {
        throwIfAborted(signal, `before-agent:${ref.contentKey}`);
        const agentResult = await syncAgent(
          {
            accountUserId,
            localAgentKey: ref.contentKey,
            includeDialogs: false,
            signal,
          },
          {
            readRecord: deps.readRecord,
            writeRecord: deps.writeRecord,
            mappingStore: deps.mappingStore,
            persistMappingDurable: deps.persistMappingDurable,
            // Nested agent jobs use the same registry; they register their own
            // child labels. Parent job stays until Space patch completes.
            jobRegistry,
            now: deps.now,
            createId: deps.createId,
            log: deps.log,
          }
        );
        throwIfAborted(signal, `after-agent:${ref.contentKey}`);
        return { ref, agentResult };
      })
    );
    for (const { ref, agentResult } of synced) {
      agentResults.push(agentResult);
      rewrites.push({
        localKey: ref.contentKey,
        remoteKey: agentResult.remoteDbKey,
      });
      // Also rewrite when map entryKey differed from contentKey.
      if (ref.entryKey !== ref.contentKey) {
        rewrites.push({
          localKey: ref.entryKey,
          remoteKey: agentResult.remoteDbKey,
        });
      }
    }

    const { contents: rewritten, collisions, rewrittenCount } =
      buildRewrittenSpaceContents({
        contents: contentsSnapshot,
        rewrites,
      });

    if (collisions.length > 0) {
      log?.("sync.spaceLocalAgents.collision", {
        accountUserId,
        spaceKey,
        collisionCount: collisions.length,
      });
      throw new SpaceLocalAgentsSyncError(
        "CONTENT_KEY_COLLISION",
        `syncAccountSpaceLocalAgentsToAccount: remote content key already exists in Space; refusing to overwrite`,
        { collisions }
      );
    }

    const contentsChanges = buildSpaceContentsPatchChanges(
      contentsSnapshot,
      rewritten
    );

    if (Object.keys(contentsChanges).length === 0) {
      // Agents mapped but contents already pointed at remotes (edge): no patch.
      return {
        spaceKey,
        accountUserId,
        noop: rewrittenCount === 0,
        rewrittenCount,
        agentResults,
        space,
      };
    }

    throwIfAborted(signal, "before-space-patch");
    const patched = await deps.patchSpace({
      dbKey: spaceKey,
      changes: {
        contents: contentsChanges,
        updatedAt: now(),
      },
    });
    throwIfAborted(signal, "after-space-patch");

    log?.("sync.spaceLocalAgents.done", {
      accountUserId,
      spaceKey,
      rewrittenCount,
      agentCount: agentResults.length,
    });

    return {
      spaceKey,
      accountUserId,
      noop: false,
      rewrittenCount,
      agentResults,
      space: patched,
    };
  } catch (err) {
    if (!(err instanceof SpaceLocalAgentsSyncError)) {
      log?.("sync.spaceLocalAgents.error", {
        accountUserId,
        spaceKey,
        // Error-only: non-Errors stay "unknown-error" (not String(err) enrichment).
        message:
          err instanceof Error
            ? toErrorMessage(err).slice(0, 200)
            : "unknown-error",
      });
    }
    throw err;
  } finally {
    jobRegistry.unregister(job.id);
  }
}

/** Test helper re-export. */
export { createSyncJobRegistry };
