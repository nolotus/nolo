/**
 * Production UI adapter: existing-account Space local-Agent reconciliation
 * via Redux db.read / db.write / db.patch.
 *
 * - Read-only preflight never writes.
 * - Confirmed execution reuses syncAccountSpaceLocalAgentsToAccount on the
 *   same spaceKey (no fetch endpoint, shadow store, or new Space).
 * - Never auto-invoked from login/onboarding; callers must be user-confirmed
 *   after a successful preflight that found local Agents.
 */
import { isRecord } from "core/isRecord";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asTrimmedString } from "core/trimmedString";
import { read, write, patch } from "database/dbSlice";
import {
  preflightAccountSpaceLocalAgents,
  type PreflightAccountSpaceLocalAgentsResult,
  type SpaceContentsLike,
} from "database/sync/preflightAccountSpaceLocalAgents";
import {
  assertAuthoritativeAccountSpaceForLocalAgentsSync,
  syncAccountSpaceLocalAgentsToAccount,
  type SyncAccountSpaceLocalAgentsToAccountInput,
  type SyncAccountSpaceLocalAgentsToAccountResult,
} from "database/sync/syncAccountSpaceLocalAgentsToAccount";

type UnwrapDispatch = {
  (action: unknown): { unwrap: () => Promise<unknown> };
};

export type RunPreflightAccountSpaceLocalAgentsInput = {
  spaceKey: string;
  /** Active account captured at click; validated before contents classification. */
  accountUserId: string;
};

export type RunSyncAccountSpaceLocalAgentsToAccountInput = Pick<
  SyncAccountSpaceLocalAgentsToAccountInput,
  "spaceKey" | "accountUserId" | "signal"
>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const readRecordViaDispatch =
  (dispatch: UnwrapDispatch) =>
  async (dbKey: string): Promise<Record<string, unknown> | null> => {
    try {
      const result = await dispatch(read({ dbKey })).unwrap();
      return asRecord(result);
    } catch {
      return null;
    }
  };

/**
 * READ-ONLY preflight: loads the Space, validates authoritative Space identity
 * (same helper as confirmed sync), classifies contents, never writes.
 *
 * Missing/deleted/wrong-owner/wrong-type throws SpaceLocalAgentsSyncError
 * with stable codes — never ok/noop from empty contents.
 */
export async function runPreflightAccountSpaceLocalAgents(
  input: RunPreflightAccountSpaceLocalAgentsInput,
  dispatch: UnwrapDispatch
): Promise<PreflightAccountSpaceLocalAgentsResult> {
  const spaceKey = asTrimmedString(input.spaceKey);
  const accountUserId = asTrimmedString(input.accountUserId);

  const readRecord = readRecordViaDispatch(dispatch);
  const spaceRecord =
    spaceKey.length > 0 ? await readRecord(spaceKey) : null;

  // Shared with confirmed command — no drift on identity/owner checks.
  const space = assertAuthoritativeAccountSpaceForLocalAgentsSync({
    spaceKey,
    accountUserId,
    space: spaceRecord,
  });

  const rawContents = asRecordOrEmpty(space?.contents) as SpaceContentsLike;

  const contentsSnapshot: SpaceContentsLike = {};
  for (const [k, v] of Object.entries(rawContents)) {
    contentsSnapshot[k] = v === null ? null : { ...v };
  }

  return preflightAccountSpaceLocalAgents(contentsSnapshot, {
    readRecord,
  });
}

/**
 * Confirmed execution: Agent account snapshots + same-key Space contents patch.
 */
export async function runSyncAccountSpaceLocalAgentsToAccount(
  input: RunSyncAccountSpaceLocalAgentsToAccountInput,
  dispatch: UnwrapDispatch
): Promise<SyncAccountSpaceLocalAgentsToAccountResult> {
  return syncAccountSpaceLocalAgentsToAccount(input, {
    readRecord: readRecordViaDispatch(dispatch),
    writeRecord: async ({ data, customKey, userId }) => {
      const written = await dispatch(
        write({ data, customKey, userId })
      ).unwrap();
      const asObj = asRecord(written);
      if (asObj) return asObj;
      return { ...data, dbKey: customKey, userId };
    },
    patchSpace: async ({ dbKey, changes }) => {
      // patchAction deep-merges `changes`; null content keys delete entries.
      const patched = await dispatch(patch({ dbKey, changes })).unwrap();
      const asObj = asRecord(patched);
      if (asObj) return asObj;
      return { dbKey, ...changes };
    },
  });
}
