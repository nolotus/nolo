import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { createUserKey, createUserPreferenceKey } from "../keys";
import type { AuthorityStore } from "database-engine/authorityStoreTypes";
import { buildAuthorityHomePreferenceRegisterRecord } from "../userPreferenceRegister";
import {
  parseOwnerUserIdFromDbKey,
  resolveCandidateOwnerFromKeyRemainder,
} from "./ownerKey";
import { normalizeAuthorityServerOrigin } from "./userAuthorityRegistry";

export type UserAuthorityMoveRecord = {
  dbKey: string;
  record: Record<string, any>;
};

export type UserAuthorityMovePlan = {
  userId: string;
  moveableRecords: UserAuthorityMoveRecord[];
  manualReviewRecords: UserAuthorityMoveRecord[];
  skippedRecordCount: number;
};

export type UserAuthorityMovePipelineMode = "dry-run" | "apply";

export type UserAuthorityMovePipelineResult = {
  mode: UserAuthorityMovePipelineMode;
  userId: string;
  moveId: string;
  movedAt: string;
  sourceServer: string;
  targetServer: string;
  moveableCount: number;
  manualReviewCount: number;
  skippedRecordCount: number;
  importedCount: number;
  sourceCutoverWritten: boolean;
  moveableRecordKeys: string[];
  manualReviewRecordKeys: string[];
  targetAuthorityHomeKey?: string;
  sourceAuthorityHomeKey?: string;
};

const normalizeUserId = (value: unknown): string | null =>
  asOptionalTrimmedString(value) ?? null;

const toRecordObject = (value: unknown): Record<string, any> | null =>
  isRecord(value) ? value : null;

const getRecordOwnerCandidates = (record: Record<string, any>): string[] =>
  [record.userId, record.ownerId, record.tenantId]
    .map(normalizeUserId)
    .filter((value): value is string => !!value);

const isDirectUserKey = (dbKey: string, userId: string): boolean =>
  dbKey === `user:${userId}` ||
  dbKey === createUserKey.settings(userId) ||
  dbKey === createUserKey.profile(userId);

const parseOwnerFromUserPreferenceKey = (
  dbKey: string,
  candidateOwnerUserIds: string[]
): string | null => {
  const prefix = "user-pref-";
  if (!dbKey.startsWith(prefix)) return null;
  return resolveCandidateOwnerFromKeyRemainder(
    dbKey.slice(prefix.length),
    candidateOwnerUserIds
  );
};

const parseOwnerFromSpaceScopedKey = (
  dbKey: string,
  candidateOwnerUserIds: string[]
): string | null => {
  const prefix = dbKey.startsWith("space-member-")
    ? "space-member-"
    : dbKey.startsWith("space-setting-")
      ? "space-setting-"
      : null;
  if (!prefix) return null;
  return resolveCandidateOwnerFromKeyRemainder(
    dbKey.slice(prefix.length),
    candidateOwnerUserIds
  );
};

const resolveMoveKeyOwnerId = ({
  dbKey,
  userId,
  record,
}: {
  dbKey: string;
  userId: string;
  record: Record<string, any>;
}): string | null => {
  if (isDirectUserKey(dbKey, userId)) return userId;
  const candidates = [userId, ...getRecordOwnerCandidates(record)];
  return (
    parseOwnerFromUserPreferenceKey(dbKey, candidates) ??
    parseOwnerFromSpaceScopedKey(dbKey, candidates) ??
    parseOwnerUserIdFromDbKey(dbKey, { candidateOwnerUserIds: candidates })
  );
};

const hasRecordOwner = (
  record: Record<string, any>,
  userId: string
): boolean => getRecordOwnerCandidates(record).includes(userId);

const compareMoveRecords = (
  left: UserAuthorityMoveRecord,
  right: UserAuthorityMoveRecord
) => left.dbKey.localeCompare(right.dbKey);

export const collectUserAuthorityMoveRecords = async ({
  store,
  userId,
}: {
  store: AuthorityStore;
  userId: string;
}): Promise<UserAuthorityMovePlan> => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || normalizedUserId === "local") {
    throw new Error("collectUserAuthorityMoveRecords requires a real userId");
  }

  const moveableRecords: UserAuthorityMoveRecord[] = [];
  const manualReviewRecords: UserAuthorityMoveRecord[] = [];
  let skippedRecordCount = 0;

  for await (const [rawKey, value] of store.iterator()) {
    const dbKey = String(rawKey);
    const record = toRecordObject(value);
    if (!record) {
      skippedRecordCount += 1;
      continue;
    }

    const keyOwnerId = resolveMoveKeyOwnerId({
      dbKey,
      userId: normalizedUserId,
      record,
    });

    if (keyOwnerId === normalizedUserId) {
      moveableRecords.push({ dbKey, record });
      continue;
    }

    if (hasRecordOwner(record, normalizedUserId)) {
      manualReviewRecords.push({ dbKey, record });
      continue;
    }

    skippedRecordCount += 1;
  }

  return {
    userId: normalizedUserId,
    moveableRecords: moveableRecords.sort(compareMoveRecords),
    manualReviewRecords: manualReviewRecords.sort(compareMoveRecords),
    skippedRecordCount,
  };
};

export const assertUserAuthorityMoveRecordsAreMoveable = ({
  userId,
  records,
}: {
  userId: string;
  records: UserAuthorityMoveRecord[];
}): void => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || normalizedUserId === "local") {
    throw new Error("assertUserAuthorityMoveRecordsAreMoveable requires a real userId");
  }

  for (const { dbKey, record } of records) {
    const normalizedDbKey = normalizeUserId(dbKey);
    if (!normalizedDbKey) {
      throw new Error("move record dbKey is required");
    }
    const normalizedRecord = toRecordObject(record);
    if (!normalizedRecord) {
      throw new Error(`move record must be an object: ${normalizedDbKey}`);
    }
    const keyOwnerId = resolveMoveKeyOwnerId({
      dbKey: normalizedDbKey,
      userId: normalizedUserId,
      record: normalizedRecord,
    });
    if (keyOwnerId !== normalizedUserId) {
      throw new Error(`record is not key-owned by user: ${normalizedDbKey}`);
    }
  }
};

export const stampMovedAuthorityRecord = ({
  dbKey,
  record,
  moveId,
  sourceServer,
  targetServer,
  movedAt,
}: {
  dbKey: string;
  record: Record<string, any>;
  moveId: string;
  sourceServer: string;
  targetServer: string;
  movedAt: string;
}): Record<string, any> => {
  const normalizedSource = normalizeAuthorityServerOrigin(sourceServer);
  const normalizedTarget = normalizeAuthorityServerOrigin(targetServer);
  if (!normalizedSource || !normalizedTarget) {
    throw new Error("stampMovedAuthorityRecord requires source and target server origins");
  }

  const previousServerOrigin = normalizeAuthorityServerOrigin(record.serverOrigin);
  const previousAuthorityServer = normalizeAuthorityServerOrigin(record.authorityServer);
  const authorityMove: Record<string, any> = {
    moveId,
    sourceServer: normalizedSource,
    targetServer: normalizedTarget,
    movedAt,
  };
  if (previousServerOrigin) {
    authorityMove.previousServerOrigin = previousServerOrigin;
  }
  if (previousAuthorityServer) {
    authorityMove.previousAuthorityServer = previousAuthorityServer;
  }

  return {
    ...record,
    dbKey,
    authorityServer: normalizedTarget,
    serverOrigin: normalizedTarget,
    authorityMove,
  };
};

export const importUserAuthorityMoveRecords = async ({
  targetStore,
  userId,
  moveId,
  sourceServer,
  targetServer,
  movedAt,
  records,
}: {
  targetStore: AuthorityStore;
  userId: string;
  moveId: string;
  sourceServer: string;
  targetServer: string;
  movedAt: string;
  records: UserAuthorityMoveRecord[];
}): Promise<{ importedCount: number; authorityHomeKey: string }> => {
  const normalizedTarget = normalizeAuthorityServerOrigin(targetServer);
  if (!normalizedTarget) {
    throw new Error("importUserAuthorityMoveRecords requires a target server origin");
  }
  assertUserAuthorityMoveRecordsAreMoveable({ userId, records });

  for (const { dbKey, record } of records) {
    await targetStore.put(
      dbKey,
      stampMovedAuthorityRecord({
        dbKey,
        record,
        moveId,
        sourceServer,
        targetServer: normalizedTarget,
        movedAt,
      })
    );
  }

  const authorityHomeKey = createUserPreferenceKey.authorityHome(userId);
  await targetStore.put(
    authorityHomeKey,
    buildAuthorityHomePreferenceRegisterRecord({
      userId,
      authorityServer: normalizedTarget,
    })
  );

  return {
    importedCount: records.length,
    authorityHomeKey,
  };
};

export const writeUserAuthorityHomeCutover = async ({
  store,
  userId,
  authorityServer,
}: {
  store: AuthorityStore;
  userId: string;
  authorityServer: string;
}): Promise<{ authorityHomeKey: string }> => {
  const normalizedAuthority = normalizeAuthorityServerOrigin(authorityServer);
  if (!normalizedAuthority) {
    throw new Error("writeUserAuthorityHomeCutover requires an authority server origin");
  }

  const authorityHomeKey = createUserPreferenceKey.authorityHome(userId);
  await store.put(
    authorityHomeKey,
    buildAuthorityHomePreferenceRegisterRecord({
      userId,
      authorityServer: normalizedAuthority,
    })
  );

  return { authorityHomeKey };
};

export const runUserAuthorityMovePipeline = async ({
  mode,
  sourceStore,
  targetStore,
  userId,
  sourceServer,
  targetServer,
  moveId,
  movedAt,
  cutoverSource = false,
  allowManualReviewRecords = false,
}: {
  mode: UserAuthorityMovePipelineMode;
  sourceStore: AuthorityStore;
  targetStore?: AuthorityStore;
  userId: string;
  sourceServer: string;
  targetServer: string;
  moveId: string;
  movedAt: string;
  cutoverSource?: boolean;
  allowManualReviewRecords?: boolean;
}): Promise<UserAuthorityMovePipelineResult> => {
  const normalizedSource = normalizeAuthorityServerOrigin(sourceServer);
  const normalizedTarget = normalizeAuthorityServerOrigin(targetServer);
  if (!normalizedSource || !normalizedTarget) {
    throw new Error("runUserAuthorityMovePipeline requires source and target server origins");
  }

  const plan = await collectUserAuthorityMoveRecords({
    store: sourceStore,
    userId,
  });

  if (
    mode === "apply" &&
    plan.manualReviewRecords.length > 0 &&
    !allowManualReviewRecords
  ) {
    throw new Error(
      "runUserAuthorityMovePipeline cannot apply while manual-review records exist"
    );
  }

  let importedCount = 0;
  let targetAuthorityHomeKey: string | undefined;
  let sourceAuthorityHomeKey: string | undefined;

  if (mode === "apply") {
    if (!targetStore) {
      throw new Error("runUserAuthorityMovePipeline requires a target store in apply mode");
    }

    const importResult = await importUserAuthorityMoveRecords({
      targetStore,
      userId: plan.userId,
      moveId,
      sourceServer: normalizedSource,
      targetServer: normalizedTarget,
      movedAt,
      records: plan.moveableRecords,
    });
    importedCount = importResult.importedCount;
    targetAuthorityHomeKey = importResult.authorityHomeKey;

    if (cutoverSource) {
      const cutoverResult = await writeUserAuthorityHomeCutover({
        store: sourceStore,
        userId: plan.userId,
        authorityServer: normalizedTarget,
      });
      sourceAuthorityHomeKey = cutoverResult.authorityHomeKey;
    }
  }

  return {
    mode,
    userId: plan.userId,
    moveId,
    movedAt,
    sourceServer: normalizedSource,
    targetServer: normalizedTarget,
    moveableCount: plan.moveableRecords.length,
    manualReviewCount: plan.manualReviewRecords.length,
    skippedRecordCount: plan.skippedRecordCount,
    importedCount,
    sourceCutoverWritten: !!sourceAuthorityHomeKey,
    moveableRecordKeys: plan.moveableRecords.map((record) => record.dbKey),
    manualReviewRecordKeys: plan.manualReviewRecords.map((record) => record.dbKey),
    ...(targetAuthorityHomeKey ? { targetAuthorityHomeKey } : {}),
    ...(sourceAuthorityHomeKey ? { sourceAuthorityHomeKey } : {}),
  };
};
