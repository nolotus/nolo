// 文件路径: app/spaces/fetchUserSpaceMembershipsAction.ts

import type { AppThunkApi } from "app/store";
import { MemberRole, type SpaceMemberWithSpaceInfo } from "app/types";
import { asTrimmedString } from "core/trimmedString";
import { createSpaceKey, normalizeSpaceId } from "create/space/spaceKeys";
import {
  fetchRemoteSpace,
  fetchRemoteUserSpaceMemberships,
  membershipBelongsToUser,
  selectSpaceRemoteAuth,
  spaceListsUser,
} from "create/space/spaceAccess";
// Wave E: spaceSlice 已删除，恢复结果直接写 module store。
import {
  appendRecoveredMemberships,
} from "create/space/spaceMembershipStore";
import { DataType } from "create/types";
import { API_ENDPOINTS } from "database/config";
import { readAction } from "database/actions/read";
import {
  DEVICE_LOCAL_OWNER_ID,
  isDeviceLocalOwnerId,
  isDeviceLocalSpaceMembership,
} from "database/authority/deviceLocal";
import { isTombstoneRecord } from "database/tombstones";
import { SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE } from "./isSpaceMembershipRemoteUnavailableError";
import { selectIdentityUserId } from "identity/selectors";

type MembershipWithSource = SpaceMemberWithSpaceInfo & {
  sourceServer?: string;
  requiresRemoteSpaceVerification?: boolean;
  /** True when this row is device-local authority (never remote-verified). */
  deviceLocal?: boolean;
};

const CONTENT_SPACE_RECOVERY_TYPES = [
  DataType.APP,
  DataType.DOC,
  DataType.DIALOG,
  DataType.IMAGE,
  DataType.FILE,
  DataType.TABLE,
  DataType.AGENT,
] as const;

const readLocalSpaceData = async (db: any, spaceId: string): Promise<any | null> => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  const spaceKey = createSpaceKey.space(normalizedSpaceId);
  try {
    return (await db.get(spaceKey)) ?? null;
  } catch {
    return null;
  }
};

/**
 * Effective owner for membership/space listing checks.
 * Device-local rows always authenticate as `"local"`; account rows use active userId.
 */
const membershipCheckUserId = (
  membership: { userId?: string | null },
  activeUserId: string
): string =>
  isDeviceLocalSpaceMembership(membership)
    ? DEVICE_LOCAL_OWNER_ID
    : activeUserId;

/**
 * 从本地 IndexedDB 按 userId 前缀扫描 space-member-{userId}-*
 */
const fetchLocalForUser = async (
  userId: string,
  db: any
): Promise<SpaceMemberWithSpaceInfo[]> => {
  try {
    const memberships: SpaceMemberWithSpaceInfo[] = [];
    const prefix = `space-member-${userId}`;
    let iterator = db.iterator({
      gte: prefix,
      lte: prefix + "\xff",
    });

    if (iterator && typeof iterator.then === "function") {
      iterator = await iterator;
    }

    for await (const [_, memberData] of iterator) {
      if (
        memberData &&
        typeof memberData === "object" &&
        memberData.spaceId &&
        !isTombstoneRecord(memberData)
      ) {
        memberships.push(memberData);
      }
    }

    return memberships;
  } catch (error) {
    console.error("Error fetching local memberships:", error);
    return [];
  }
};

/**
 * Device-local + active-account union (single list, no second registry).
 * Guest / userId "local" → local only.
 * Account A → space-member-local-* ∪ space-member-A-*.
 */
const fetchLocalUnion = async (
  userId: string,
  db: any
): Promise<MembershipWithSource[]> => {
  const deviceLocalRows = await fetchLocalForUser(DEVICE_LOCAL_OWNER_ID, db);
  const taggedLocal: MembershipWithSource[] = deviceLocalRows.map(
    (membership) => ({
      ...membership,
      spaceId: normalizeSpaceId(membership.spaceId),
      deviceLocal: true,
      userId: membership.userId || DEVICE_LOCAL_OWNER_ID,
    })
  );

  if (isDeviceLocalOwnerId(userId)) {
    return taggedLocal;
  }

  const accountRows = await fetchLocalForUser(userId, db);
  const taggedAccount: MembershipWithSource[] = accountRows.map(
    (membership) => ({
      ...membership,
      spaceId: normalizeSpaceId(membership.spaceId),
      deviceLocal: false,
    })
  );

  // Prefer account row when the same spaceId collides (account processed last
  // in the merge map). Here we just concatenate; map merge applies preference.
  return [...taggedLocal, ...taggedAccount];
};

const fetchRemoteContentSpaceIds = async (
  server: string,
  userId: string,
  token: string | null
): Promise<string[]> => {
  try {
    const queryParams = new URLSearchParams({ limit: "200" });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Only set Bearer when token is non-empty; avoid "Bearer " / "Bearer null".
    const authToken = asTrimmedString(token);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    const response = await fetch(
      `${server}${API_ENDPOINTS.DATABASE}/query/${encodeURIComponent(userId)}?${queryParams}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: [...CONTENT_SPACE_RECOVERY_TYPES],
          includeDeleted: true,
          summary: true,
        }),
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const records = Array.isArray(data?.data?.data) ? data.data.data : [];
    return records
      .filter((record: any) => !isTombstoneRecord(record))
      .map((record: any) =>
        typeof record?.spaceId === "string" ? normalizeSpaceId(record.spaceId) : ""
      )
      .filter((spaceId: string) => spaceId.length > 0);
  } catch {
    return [];
  }
};

const recoverMembershipsFromContentSpaces = async ({
  servers,
  token,
  userId,
  knownSpaceIds,
}: {
  servers: string[];
  token: string | null;
  userId: string;
  knownSpaceIds: Set<string>;
}): Promise<MembershipWithSource[]> => {
  const candidateSpaceIds = new Set<string>();
  await Promise.all(
    servers.map(async (server) => {
      const spaceIds = await fetchRemoteContentSpaceIds(server, userId, token);
      spaceIds.forEach((spaceId) => {
        if (!knownSpaceIds.has(spaceId)) {
          candidateSpaceIds.add(spaceId);
        }
      });
    })
  );

  const results = await Promise.all(
    [...candidateSpaceIds].map(async (spaceId) => {
      try {
        for (const server of servers) {
          const remoteSpace = await fetchRemoteSpace(server, token, spaceId);
          if (!spaceListsUser(remoteSpace, userId)) continue;
          return {
            userId,
            spaceId,
            spaceName:
              typeof remoteSpace?.name === "string" && remoteSpace.name.trim()
                ? remoteSpace.name
                : spaceId,
            role:
              remoteSpace?.ownerId === userId
                ? MemberRole.OWNER
                : MemberRole.MEMBER,
            joinedAt:
              remoteSpace?.updatedAt ??
              remoteSpace?.createdAt ??
              Date.now(),
            sourceServer: server,
          } as unknown as MembershipWithSource;
        }
      } catch {
        // Single space error should not block other spaces
      }
      return null;
    })
  );
  const recovered = results.filter(
    (m): m is MembershipWithSource => m !== null
  );
  return recovered;
};

/**
 * 获取用户的所有空间成员资格。
 *
 * Authority split（2026-10 故障后确立）:
 * - 账号 actor：只信服务端 RPC。`getUserSpaceMemberships` 已用
 *   hasActiveSpaceMembership 逐条校验，本地索引不再是真值；也不再读它
 *   （本地 Level/IndexedDB 没有超时，一次卡死的 open 会让列表永久 loading）。
 * - 设备本地 actor（`userId === "local"`）：本地索引就是权威，无需 token/server。
 * - Device-local rows never remote-verify and never recover remotely.
 */
export const fetchUserSpaceMembershipsAction = async (
  userId: string,
  thunkAPI: AppThunkApi
): Promise<SpaceMemberWithSpaceInfo[]> => {
  const state = thunkAPI.getState();
  const db = thunkAPI.extra.db;
  const { token, servers } = selectSpaceRemoteAuth(state);
  const isLocalActor = isDeviceLocalOwnerId(userId);

  // Account actors read the membership index from the server only.
  //
  // The local prefix scan is not a source of truth (the server validates every
  // row in getUserSpaceMemberships) and it used to be the *first* await on this
  // path — reading a Level/IndexedDB store that has no timeout. A stalled
  // browser store therefore left the Space list at "loading" forever, with no
  // error and no retry. Device-local actors (`local`) keep the local index;
  // account actors never read it.
  // Guest / local actor: never hit remote membership RPC (no token required).
  const remoteResultsPromise = isLocalActor
    ? Promise.resolve([] as Awaited<
        ReturnType<typeof fetchRemoteUserSpaceMemberships>
      >[])
    : Promise.all(
        servers.map((server) =>
          fetchRemoteUserSpaceMemberships(server, token, userId)
        )
      );

  const localMemberships: MembershipWithSource[] = isLocalActor
    ? await fetchLocalUnion(userId, db)
    : [];

  const remoteResults = await remoteResultsPromise;

  const successfulRemoteResults = remoteResults.filter((result) => result.ok);
  const successfulRemoteMemberships = successfulRemoteResults.flatMap(
    (result) =>
      result.memberships.map((membership) => ({
        ...membership,
        sourceServer: result.server,
      }))
  );
  const hasSuccessfulRemoteFetch = successfulRemoteResults.length > 0;
  // Guest never has remote authority requirements even if servers are listed.
  const hasRemoteAuthority = !isLocalActor && !!token && servers.length > 0;

  if (hasRemoteAuthority && !hasSuccessfulRemoteFetch) {
    throw new Error(
      `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: unable to refresh memberships from ${servers.join(", ")}`
    );
  }

  // An account actor without remote authority (no token / no configured server)
  // has no authoritative source left now that the local index is out of this
  // path. Surface it as the recoverable remote-unavailable error instead of
  // silently reporting "no spaces".
  if (!isLocalActor && !hasRemoteAuthority) {
    throw new Error(
      `${SPACE_MEMBERSHIP_REMOTE_UNAVAILABLE}: no remote authority for ${userId}`
    );
  }

  const remoteSpaceIds = new Set(
    successfulRemoteMemberships.map((membership) =>
      normalizeSpaceId(membership.spaceId)
    )
  );

  const filteredLocalMemberships: MembershipWithSource[] = hasSuccessfulRemoteFetch
    ? (
      await Promise.all(
        localMemberships.map(async (membership) => {
          const normalizedSpaceId = normalizeSpaceId(membership.spaceId);

          // Device-local rows are device-authoritative: never flag for remote verify.
          if (
            membership.deviceLocal ||
            isDeviceLocalSpaceMembership(membership)
          ) {
            return {
              ...membership,
              spaceId: normalizedSpaceId,
              deviceLocal: true,
            };
          }

          if (remoteSpaceIds.has(normalizedSpaceId)) {
            return {
              ...membership,
              spaceId: normalizedSpaceId,
            };
          }

          console.warn(
            `[SpaceMembership] Membership missing from remote index, verifying space record: user=${userId}, spaceId=${normalizedSpaceId}`
          );
          return {
            ...membership,
            spaceId: normalizedSpaceId,
            requiresRemoteSpaceVerification: true,
          };
        })
      )
    ).filter((membership): membership is MembershipWithSource => !!membership)
    : localMemberships.map((membership) => ({
      ...membership,
      spaceId: normalizeSpaceId(membership.spaceId),
    }));

  const verifyActiveSpaceMembership = async (
    membership: MembershipWithSource
  ): Promise<SpaceMemberWithSpaceInfo | null> => {
    if (isTombstoneRecord(membership)) return null;

    const checkUserId = membershipCheckUserId(membership, userId);
    if (!membershipBelongsToUser(membership, checkUserId)) return null;

    const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
    const isDeviceLocal =
      membership.deviceLocal || isDeviceLocalSpaceMembership(membership);
    // Lazy local body read. The normal account path is server-verified and must
    // not touch the browser store at all: a stalled store there is exactly what
    // turned the Space list into a permanent "loading" with no error.
    let localSpaceDataLoaded = false;
    let localSpaceDataCache: any = null;
    const loadLocalSpaceData = async (): Promise<any> => {
      if (!localSpaceDataLoaded) {
        localSpaceDataCache = await readLocalSpaceData(db, normalizedSpaceId);
        localSpaceDataLoaded = true;
      }
      return localSpaceDataCache;
    };

    // Device-local memberships never remote-verify. Body must exist, be
    // non-tombstoned, and list `"local"` — missing body is ghost membership.
    if (isDeviceLocal) {
      const localSpaceData = await loadLocalSpaceData();
      if (!localSpaceData || isTombstoneRecord(localSpaceData)) return null;
      if (!spaceListsUser(localSpaceData, checkUserId)) {
        return null;
      }
      const {
        sourceServer: _s,
        requiresRemoteSpaceVerification: _r,
        deviceLocal: _d,
        ...visible
      } = membership;
      return {
        ...visible,
        spaceId: normalizedSpaceId,
        userId: DEVICE_LOCAL_OWNER_ID,
      };
    }

    // Memberships returned by the remote RPC (sourceServer set) are already
    // server-verified (methods.ts getUserSpaceMemberships calls
    // hasActiveSpaceMembership per record before returning). Re-validating
    // each client-side via fetchRemoteSpace is redundant N remote round-trips
    // that dominate cold-load latency — and reading the local body here would
    // put the browser store back on the hot path. Trust the server result.
    if (membership.sourceServer && !membership.requiresRemoteSpaceVerification) {
      const { sourceServer: _ss, ...verifiedMembership } = membership;
      return {
        ...verifiedMembership,
        spaceId: normalizedSpaceId,
      };
    }

    if (membership.sourceServer || membership.requiresRemoteSpaceVerification) {
      const localSpaceData = await loadLocalSpaceData();
      if (localSpaceData && isTombstoneRecord(localSpaceData)) return null;
      // Only locally-flagged requiresRemoteSpaceVerification records (local
      // index present but remote index mismatch — legacy data) still pay the
      // remote verification cost.
      try {
        const remoteSpaceServers = Array.from(
          new Set(
            [membership.sourceServer, ...servers].filter(
              (server): server is string =>
                typeof server === "string" && server.length > 0
            )
          )
        );
        let remoteSpace: any | null = null;
        for (const server of remoteSpaceServers) {
          remoteSpace = await fetchRemoteSpace(
            server,
            token,
            normalizedSpaceId
          );
          if (remoteSpace) break;
        }
        if (!spaceListsUser(remoteSpace, userId)) return null;
        const {
          requiresRemoteSpaceVerification,
          deviceLocal: _dl,
          ...verifiedMembership
        } = membership;
        return {
          ...verifiedMembership,
          spaceId: normalizedSpaceId,
        };
      } catch {
        return null;
      }
    }

    const localSpaceData = await loadLocalSpaceData();
    if (localSpaceData) {
      return !spaceListsUser(localSpaceData, userId)
        ? null
        : {
            ...membership,
            spaceId: normalizedSpaceId,
          };
    }
    if (!membership.sourceServer && servers.length === 0) {
      return {
        ...membership,
        spaceId: normalizedSpaceId,
      };
    }

    try {
      const remoteSpace = await readAction(
        {
          dbKey: createSpaceKey.space(normalizedSpaceId),
          preferredServerOrigin: membership.sourceServer,
        },
        thunkAPI
      );
      if (!spaceListsUser(remoteSpace, userId)) return null;
      return {
        ...membership,
        spaceId: normalizedSpaceId,
      };
    } catch {
      return null;
    }
  };

  const activeMemberships = (
    await Promise.all(
      [...filteredLocalMemberships, ...successfulRemoteMemberships].map(
        verifyActiveSpaceMembership
      )
    )
  ).filter((membership): membership is SpaceMemberWithSpaceInfo => !!membership);

  const knownSpaceIds = new Set(
    [
      ...filteredLocalMemberships,
      ...successfulRemoteMemberships,
      ...activeMemberships,
    ].map((membership) => normalizeSpaceId(membership.spaceId))
  );
  // Content recovery is account-only; never for guest/local actor.
  // Backgrounded: recover is a consistency backfill (find spaces with content
  // but missing membership index) and historically blocked first-paint for
  // multiple seconds while fetching each candidate's space record. It now
  // fires after the thunk resolves, dispatching appendRecoveredMemberships
  // to merge results into the already-visible list without blocking boot.
  if (hasRemoteAuthority && hasSuccessfulRemoteFetch && !isLocalActor) {
    // Fire-and-forget; errors are swallowed inside recoverMembershipsFromContentSpaces.
    void recoverMembershipsFromContentSpaces({
      servers,
      token,
      userId,
      knownSpaceIds,
    }).then((rawRecovered) => {
      // Actor guard: if the active account changed while recover was in
      // flight (logout / account switch dispatches resetSpace), the recovered
      // memberships belong to the old actor and must NOT pollute the new
      // account's list. resetSpace clears memberSpaces but cannot cancel an
      // already-running promise, so we gate the dispatch here.
      const activeUserId =
        selectIdentityUserId(thunkAPI.getState()) ?? null;
      if (activeUserId !== userId) return;
      if (rawRecovered.length === 0) return;
      // Strip internal-only fields before dispatch, mirroring the thunk's
      // mergeMap cleaning (sourceServer / requiresRemoteSpaceVerification /
      // deviceLocal are transport metadata, not part of the visible state).
      const cleaned = rawRecovered.map((membership) => {
        const {
          sourceServer: _ss,
          requiresRemoteSpaceVerification: _rv,
          deviceLocal: _dl,
          ...visible
        } = membership;
        return { ...visible, spaceId: normalizeSpaceId(membership.spaceId) };
      });
      // Wave E: spaceSlice 已删除，直接调用 module store。
      appendRecoveredMemberships(cleaned);
    }).catch(() => {
      // Recover is best-effort; never surface as user-facing error.
    });
  }

  // Merge into one list. On spaceId collision prefer active-account membership
  // over device-local: process device-local first, then account/recovered last.
  const membershipMap = new Map<string, SpaceMemberWithSpaceInfo>();
  const preferAccountOnCollision = (
    existing: SpaceMemberWithSpaceInfo | undefined,
    next: SpaceMemberWithSpaceInfo
  ): SpaceMemberWithSpaceInfo => {
    if (!existing) return next;
    const existingLocal = isDeviceLocalSpaceMembership(existing);
    const nextLocal = isDeviceLocalSpaceMembership(next);
    // Prefer non-local (active account) over local when ids collide.
    if (existingLocal && !nextLocal) return next;
    if (!existingLocal && nextLocal) return existing;
    return next;
  };

  [...activeMemberships].forEach((membership) => {
    const normalizedSpaceId = normalizeSpaceId(membership.spaceId);
    const {
      sourceServer: _sourceServer,
      requiresRemoteSpaceVerification: _req,
      deviceLocal: _deviceLocal,
      ...visibleMembership
    } = membership as MembershipWithSource;
    const cleaned: SpaceMemberWithSpaceInfo = {
      ...visibleMembership,
      spaceId: normalizedSpaceId,
    };
    const existing = membershipMap.get(normalizedSpaceId);
    membershipMap.set(
      normalizedSpaceId,
      preferAccountOnCollision(existing, cleaned)
    );
  });

  const finalMemberships = Array.from(membershipMap.values()).sort(
    (a, b) => (b.joinedAt || 0) - (a.joinedAt || 0)
  );
  return finalMemberships;
};
