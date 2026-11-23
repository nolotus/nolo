import { googleSessionRequestToken, isGoogleAuthoritySession, scopeGoogleSessionServers } from "core/googleSessionScope";
import type { SpaceData, SpaceMemberWithSpaceInfo } from "app/types";
import { createSpaceKey, normalizeSpaceId } from "create/space/spaceKeys";
import { fetchFromServer, getAllServers } from "database/actions/common";
import { normalizeKnownServerOrigin } from "database/config";
import { isTombstoneRecord } from "database/tombstones";
import { selectIdentityToken, selectIdentityUserId } from "identity/selectors";
import {
  clearSpaceDirectoryScanCache,
  scanSpaceDirectoryOnServer,
} from "./spaceDirectoryScan";

export interface SpaceRemoteAuth {
  token: string | null;
  userId: string | null;
  servers: string[];
}

export interface RemoteMembershipFetchResult {
  ok: boolean;
  server?: string;
  memberships: SpaceMemberWithSpaceInfo[];
}

const resolveSpaceRemoteServers = (state: any): string[] => {
  const currentServer =
    typeof state?.settings?.currentServer === "string"
      ? state.settings.currentServer
      : undefined;
  const syncServers = Array.isArray(state?.settings?.syncServers)
    ? state.settings.syncServers
    : undefined;
  return scopeGoogleSessionServers(selectIdentityToken(state), currentServer, getAllServers(currentServer, syncServers));
};

export const selectSpaceRemoteAuth = (state: any): SpaceRemoteAuth => ({
  token: selectIdentityToken(state) ?? null,
  userId: selectIdentityUserId(state) ?? null,
  servers: resolveSpaceRemoteServers(state),
});

export const spaceListsUser = (spaceData: any, userId: string): boolean => {
  if (!spaceData || isTombstoneRecord(spaceData)) return false;
  if (spaceData.ownerId === userId) return true;
  return Array.isArray(spaceData.members) && spaceData.members.includes(userId);
};

export const membershipBelongsToUser = (
  membership: SpaceMemberWithSpaceInfo,
  userId: string
): boolean => !membership.userId || membership.userId === userId;

// in-flight 去重 + 短期缓存：页面加载时多个空间权限检查组件会并发调用本函数
// （实测 getUserSpaceMemberships ×3），同一 server+userId 只发一次请求。
// 只读数据 + 30s TTL，副作用低。
const membershipFetchCache = new Map<string, Promise<RemoteMembershipFetchResult>>();

/** 测试隔离用：清空 membership 远程拉取缓存（30s TTL 跨测试会污染断言）。 */
export const clearMembershipFetchCache = (): void => {
  membershipFetchCache.clear();
};
const MEMBERSHIP_FETCH_CACHE_TTL_MS = 30_000;

/**
 * 只有桌面壳的内嵌运行时（`packages/desktop-runtime/entry.ts` 注入的
 * `window.__NOLO_EMBEDDED_RUNTIME__`）才配这个标记。
 *
 * 不能用 `__NOLO_DESKTOP__` 代替：网页预览（`?noloDesktop=1`，见
 * packages/web/entry.tsx）与 `NOLO_DESKTOP=1` 的 SSR 也会注入它，而那些场景的
 * 平台服务器是**有** `/rpc/*` 的（packages/server/handleRequest），按它跳过会把
 * 合法的同源数据服务一起丢掉。
 */
export type DesktopShellRuntime = {
  isEmbeddedRuntime: boolean;
  runtimeOrigin?: string;
};

const resolveDesktopShellRuntime = (): DesktopShellRuntime => {
  if (typeof window === "undefined") return { isEmbeddedRuntime: false };
  const shellWindow = window as Window & { __NOLO_EMBEDDED_RUNTIME__?: boolean };
  return {
    isEmbeddedRuntime: shellWindow.__NOLO_EMBEDDED_RUNTIME__ === true,
    runtimeOrigin: shellWindow.location?.origin,
  };
};

export const isEmbeddedRuntimeServer = (
  server: string,
  runtime: DesktopShellRuntime = resolveDesktopShellRuntime()
): boolean => {
  if (!runtime.isEmbeddedRuntime || !runtime.runtimeOrigin) return false;
  try {
    return new URL(server).origin === runtime.runtimeOrigin;
  } catch {
    return false;
  }
};

async function fetchMembershipsFromServer(
  server: string,
  token: string | null,
  userId: string,
  timeoutMs: number
): Promise<RemoteMembershipFetchResult> {
  if (!token) return { ok: false, memberships: [] };
  googleSessionRequestToken(token, server);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${server}/rpc/getUserSpaceMemberships`, {
      method: "POST",
      ...(isGoogleAuthoritySession(token) ? { redirect: "error" as const, credentials: "omit" as const } : {}),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, pureRead: true }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(
        `Failed to fetch memberships from ${server}: ${response.statusText}`
      );
      return { ok: false, memberships: [] };
    }
    const data = await response.json();
    return {
      ok: true,
      server,
      memberships: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching memberships from ${server}:`, error);
    return { ok: false, memberships: [] };
  }
}

export const fetchRemoteUserSpaceMemberships = (
  server: string,
  token: string | null,
  userId: string,
  timeoutMs = 5000
): Promise<RemoteMembershipFetchResult> => {
  // 桌面壳自己的内嵌 origin 不是数据服务器：不发请求、也不写缓存/打日志。
  if (isEmbeddedRuntimeServer(server)) {
    return Promise.resolve({ ok: false, memberships: [] });
  }
  const cacheKey = `${server}|${userId}`;
  const cached = membershipFetchCache.get(cacheKey);
  if (cached) return cached;
  const promise = fetchMembershipsFromServer(server, token, userId, timeoutMs);
  membershipFetchCache.set(cacheKey, promise);
  promise
    .catch(() => {})
    .finally(() => {
      setTimeout(() => {
        if (membershipFetchCache.get(cacheKey) === promise) {
          membershipFetchCache.delete(cacheKey);
        }
      }, MEMBERSHIP_FETCH_CACHE_TTL_MS);
    });
  return promise;
};

export const fetchRemoteSpace = async (
  server: string,
  token: string | null,
  spaceId: string
): Promise<SpaceData | null> => {
  try {
    const space = await fetchFromServer(
      server,
      createSpaceKey.space(normalizeSpaceId(spaceId)),
      token ?? undefined
    );
    return space && typeof space === "object" ? (space as SpaceData) : null;
  } catch {
    return null;
  }
};

export const hasActiveRemoteMembership = async (
  server: string,
  token: string,
  userId: string,
  spaceId: string
): Promise<boolean> => {
  const result = await fetchRemoteUserSpaceMemberships(server, token, userId);
  if (!result.ok) return false;
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  return result.memberships.some((membership) => {
    const membershipSpaceId =
      typeof membership?.spaceId === "string"
        ? normalizeSpaceId(membership.spaceId)
        : "";
    return (
      membershipSpaceId === normalizedSpaceId &&
      membershipBelongsToUser(membership, userId) &&
      !isTombstoneRecord(membership)
    );
  });
};

export const fetchAuthoritativeRemoteSpace = async ({
  servers,
  token,
  userId,
  spaceId,
}: {
  servers: string[];
  token: string;
  userId: string;
  spaceId: string;
}): Promise<SpaceData | null> => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  for (const server of servers) {
    const space = await fetchRemoteSpace(server, token, normalizedSpaceId);
    if (!space) continue;
    if (!spaceListsUser(space, userId)) {
      throw new Error(`Current user is not a member of space: ${normalizedSpaceId}`);
    }
    if (space.ownerId !== userId) {
      const hasMembership = await hasActiveRemoteMembership(
        server,
        token,
        userId,
        normalizedSpaceId
      );
      if (!hasMembership) {
        throw new Error(
          `Current user has no active membership for space: ${normalizedSpaceId}`
        );
      }
    }
    return space;
  }
  return null;
};

export const invalidateSpaceDirectoryScanCache = (spaceId?: string): void => {
  clearSpaceDirectoryScanCache(spaceId);
};

/**
 * Incremental Space directory reader powered by `GET /api/v1/db/scan` (`sp:{spaceId}:*` + `since`).
 * Smoothly falls back to `fetchAuthoritativeRemoteSpace` when talking to an older server without `/db/scan`,
 * while never bypassing 401/403 authorization rejections.
 */
export const fetchAuthoritativeSpaceDirectory = async ({
  servers,
  token,
  userId,
  spaceId,
}: {
  servers: string[];
  token: string;
  userId: string;
  spaceId: string;
}): Promise<SpaceData | null> => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  if (!normalizedSpaceId) return null;

  let sawForbidden: string | null = null;
  for (const server of servers) {
    const outcome = await scanSpaceDirectoryOnServer({
      server,
      token,
      userId,
      spaceId: normalizedSpaceId,
    });
    if (outcome.status === "unsupported") {
      return fetchAuthoritativeRemoteSpace({
        servers,
        token,
        userId,
        spaceId: normalizedSpaceId,
      });
    }
    if (outcome.status === "forbidden") {
      sawForbidden = outcome.message;
      continue;
    }
    if (outcome.record) {
      // A directory scan is not a membership snapshot. Keep its contents, but
      // take the member list from the space body on the same replica.
      const body = await fetchRemoteSpace(server, token, normalizedSpaceId);
      return {
        ...outcome.record,
        members: body && !isTombstoneRecord(body) && Array.isArray(body.members) ? body.members : [],
      };
    }
  }

  if (sawForbidden) {
    throw new Error(sawForbidden);
  }
  return null;
};
