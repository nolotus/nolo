import { asOptionalTrimmedString } from "core/optionalString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { selectIdentityUserId, selectIdentityUser } from "identity/selectors";
import { getAllServers } from "./common";
import {
  noloDeleteRequest,
  noloPatchRequest,
  noloUploadRequest,
  noloWriteRequest,
  syncWithServers,
  type UploadProgressHandler,
} from "../requests";
import { planServersForTenant } from "../tenantPlacement";
import {
  isDeviceLocalDbKey,
  isDeviceLocalOwnerId,
} from "../authority/deviceLocal";
import { resolveRecordAuthority } from "../authority/recordAuthority";
import {
  replicationTargetKey,
  type WriteReplicationAckHandle,
} from "./writeAck";
import { planAuthorityReadServers } from "./readResolution";

const isReadonlyPublicRecordKey = (dbKey: string): boolean =>
  dbKey.startsWith("agent-pub-");

const normalizeCurrentUserId = (state: any): string | null => {
  const userId = selectIdentityUserId(state);
  return asOptionalTrimmedString(userId) ?? null;
};

export const resolveReplicationServers = (
  currentServer: string | undefined,
  syncServers: string[] | undefined,
  preferredServerOrigin?: string | null
): string[] => getAllServers(currentServer, syncServers, preferredServerOrigin);

export const resolveAuthorityReplicationServers = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  record,
  state,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  preferredServerOrigin?: string | null;
  dbKey: string;
  record?: any;
  state: any;
}): string[] => {
  const allServers = resolveReplicationServers(
    currentServer,
    syncServers,
    preferredServerOrigin
  );
  const authority = resolveRecordAuthority({
    dbKey,
    record,
    currentUserId: selectIdentityUserId(state),
    currentServer,
    userAuthorityRegistry:
      state?.settings?.userAuthorityRegistry ??
      (selectIdentityUser(state) as { authorityRegistry?: unknown } | null)
        ?.authorityRegistry,
  });

  // Device-local records must never leave the device.
  // Even when remote sync servers are configured and a real account is
  // logged in, we plan an empty replication list here so write/patch/remove
  // and read-backfill calls skip the network round-trip entirely.
  // Covers: owner from key (`agent-local-*` / `dialog-local-*`),
  // authoritative `record.userId === "local"` (e.g. dialog message keys
  // where dialogId is not the owner), and device-local dbKey prefixes.
  if (
    isDeviceLocalOwnerId(authority.ownerUserId) ||
    isDeviceLocalOwnerId(record?.userId) ||
    isDeviceLocalDbKey(dbKey)
  ) {
    return [];
  }

  return planAuthorityReadServers({
    allServers,
    authorityServer: preferredServerOrigin ?? authority.authorityServer,
    serverOrigin: authority.serverOrigin,
  });
};

/**
 * 调度一次写入的远程复制（主服务器先写，后备服务器随后）。
 *
 * 返回值是各目标的 ACK 清单（WriteReplicationAckHandle）：primary 是主目标
 * 那次写请求的 Promise，targets 按 server 维度给出每一台的那次请求，供
 * writeAction 交给 writeAck 槽位——需要服务端 ACK 的调用方（新对话首条消息）
 * 必须等**本次 run 目标**那台服务器的写请求，而不是固定的 servers[0]。
 *
 * 返回值就是「主服务器那次写请求」的 Promise（true = 服务端已确认写入，
 * false = 服务端拒绝或网络失败），供 writeAction 交给 writeAck 槽位——
 * 需要服务端 ACK 的调用方（如新对话首条消息）await 的是这一次真实请求，
 * 不是另建一套同步协议。无可用服务器时返回 null。
 */
export const scheduleWriteReplication = (
  servers: string[],
  request: { data: any; customKey: string; userId?: string },
  state: any
): WriteReplicationAckHandle | null => {
  if (servers.length === 0) return null;
  const [primaryServer, ...backupServers] = servers;

  // 每个目标各有一份 deferred：写请求发出**之前**就登记好条目，这样需要 ACK
  // 的调用方（新对话首条消息：等本次 run 目标那台服务器）无论等主目标还是
  // 后备目标，都能拿到对应的那一次 POST /database/write/ 的结果，而不是
  // 只等 servers[0]。authority 写入顺序不变：仍然是主目标先写、后备随后。
  const targets = new Map<string, Promise<boolean>>();
  const settleTarget = new Map<string, (ok: boolean) => void>();
  for (const server of servers) {
    const key = replicationTargetKey(server);
    if (!key || targets.has(key)) continue;
    targets.set(
      key,
      new Promise<boolean>((resolve) => {
        settleTarget.set(key, resolve);
      })
    );
  }
  const settleTargetFor = (server: string, ok: boolean): void => {
    const key = replicationTargetKey(server);
    const resolve = settleTarget.get(key);
    if (!resolve) return;
    settleTarget.delete(key);
    resolve(ok);
  };

  const primaryAck = Promise.resolve().then(async () => {
    let primarySucceeded = false;
    try {
      primarySucceeded = await noloWriteRequest(primaryServer, request, state);
    } finally {
      // 主目标请求无论成功、失败还是抛错，都要结算它自己的槽位，避免等待方空等。
      settleTargetFor(primaryServer, primarySucceeded);
    }

    if (!primarySucceeded) {
      console.warn(`Primary write sync failed for ${request.customKey} on ${primaryServer}`);
    }

    if (backupServers.length === 0) {
      return primarySucceeded;
    }

    try {
      syncWithServers(
        backupServers,
        (server, requestConfig, requestState, signal) =>
          noloWriteRequest(server, requestConfig, requestState, signal, {
            failureLogLevel: "info",
          }).then(
            (ok) => {
              settleTargetFor(server, ok);
              return ok;
            },
            (error) => {
              settleTargetFor(server, false);
              throw error;
            }
          ),
        `Backup write sync failed for ${request.customKey} on`,
        request,
        state
      );
    } catch (error) {
      // 后备同步连发都没发出去：把还没结算的后备目标标成失败，别让等待方空等。
      for (const server of backupServers) settleTargetFor(server, false);
      throw error;
    }

    // 后备同步仍是即发即忘；主目标 ACK 只等主服务器落库。
    return primarySucceeded;
  });

  return { servers: [...servers], primary: primaryAck, targets };
};

export const resolveTenantReplicationServers = ({
  currentServer,
  syncServers,
  tenantId,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  tenantId: string | null | undefined;
}): string[] => {
  const allServers = resolveReplicationServers(currentServer, syncServers);
  if (allServers.length === 0) {
    return [];
  }

  return planServersForTenant(allServers, currentServer, tenantId);
};

export const resolveUploadReplicationServers = ({
  currentServer,
  syncServers,
  tenantId,
  uploadConfig,
  state,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  tenantId: string | null | undefined;
  uploadConfig: {
    metadata: any;
    customKey: string;
    userId?: string;
  };
  state: any;
}): string[] => {
  const allServers = resolveReplicationServers(currentServer, syncServers);
  const authority = resolveRecordAuthority({
    dbKey: uploadConfig.customKey,
    record: uploadConfig.metadata,
    currentUserId: selectIdentityUserId(state),
    currentServer,
    userAuthorityRegistry:
      state?.settings?.userAuthorityRegistry ??
      (selectIdentityUser(state) as { authorityRegistry?: unknown } | null)
        ?.authorityRegistry,
  });

  if (authority.ownerUserId || authority.authorityServer) {
    return planAuthorityReadServers({
      allServers,
      authorityServer: authority.authorityServer,
      serverOrigin: authority.serverOrigin,
    });
  }

  return resolveTenantReplicationServers({
    currentServer,
    syncServers,
    tenantId,
  });
};

export const scheduleExistingRecordReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  localData,
  state,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  preferredServerOrigin?: string | null;
  dbKey: string;
  localData: any;
  state: any;
}): string[] => {
  if (isReadonlyPublicRecordKey(dbKey)) {
    return [];
  }

  const currentUserId = normalizeCurrentUserId(state);
  const authority = resolveRecordAuthority({
    dbKey,
    record: localData,
    currentUserId,
    currentServer,
    userAuthorityRegistry:
      state?.settings?.userAuthorityRegistry ??
      (selectIdentityUser(state) as { authorityRegistry?: unknown } | null)
        ?.authorityRegistry,
  });
  if (authority.ownerUserId && currentUserId && authority.ownerUserId !== currentUserId) {
    return [];
  }

  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    record: localData,
    state,
  });
  if (servers.length === 0) {
    return [];
  }

  scheduleWriteReplication(
    servers,
    {
      data: localData,
      customKey: dbKey,
      userId:
        typeof localData?.userId === "string"
          ? localData.userId
          : selectIdentityUserId(state),
    },
    state
  );

  return servers;
};

export const schedulePatchReplication = ({
  servers,
  dbKey,
  changes,
  state,
  preferredServerOrigin,
}: {
  servers: string[];
  dbKey: string;
  changes: any;
  state: any;
  preferredServerOrigin?: string | null;
}) => {
  if (servers.length === 0) return;

  Promise.resolve().then(async () => {
    const primaryServer =
      typeof preferredServerOrigin === "string" && preferredServerOrigin.trim().length > 0
        ? normalizeServerOrigin(preferredServerOrigin)
        : servers[0];
    const backupServers = servers.filter(
      (server) => normalizeServerOrigin(server) !== primaryServer
    );

    const primarySucceeded = await noloPatchRequest(primaryServer, dbKey, changes, state, undefined, {
      failureLogLevel: "warn",
    });
    if (!primarySucceeded) {
      console.warn(`Primary patch sync failed for ${dbKey} on ${primaryServer}`);
    }

    if (backupServers.length > 0) {
      syncWithServers(
        backupServers,
        (server, targetDbKey, nextChanges, requestState, signal) =>
          noloPatchRequest(server, targetDbKey, nextChanges, requestState, signal, {
            failureLogLevel: "info",
          }),
        `Backup patch sync failed for ${dbKey} on`,
        dbKey,
        changes,
        state
      );
    }
  });
};

export const scheduleConfiguredPatchReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  changes,
  state,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  preferredServerOrigin?: string | null;
  dbKey: string;
  changes: any;
  state: any;
}): string[] => {
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    record: changes,
    state,
  });

  if (servers.length === 0) {
    return [];
  }

  schedulePatchReplication({
    servers,
    dbKey,
    changes,
    state,
    preferredServerOrigin,
  });

  return servers;
};

export const scheduleUploadReplication = ({
  currentServer,
  syncServers,
  tenantId,
  uploadConfig,
  state,
  excludeServers = [],
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  tenantId: string | null | undefined;
  uploadConfig: {
    file: File;
    metadata: any;
    customKey: string;
    userId?: string;
  };
  state: any;
  excludeServers?: string[];
}): string[] => {
  const servers = resolveUploadReplicationServers({
    currentServer,
    syncServers,
    tenantId,
    uploadConfig,
    state,
  });
  const excluded = new Set(
    excludeServers
      .filter((server): server is string => typeof server === "string")
      .map((server) => normalizeServerOrigin(server))
  );
  const remainingServers = servers.filter(
    (server) => !excluded.has(normalizeServerOrigin(server))
  );

  if (remainingServers.length === 0) {
    return [];
  }

  Promise.resolve().then(() => {
    syncWithServers(
      remainingServers,
      noloUploadRequest,
      `Upload sync failed for ${uploadConfig.customKey} on`,
      uploadConfig,
      state
    );
  });

  return remainingServers;
};

export const uploadToCurrentServer = async ({
  currentServer,
  uploadConfig,
  state,
  signal,
  onProgress,
}: {
  currentServer: string | undefined;
  uploadConfig: {
    file: File;
    metadata: any;
    customKey: string;
    userId?: string;
  };
  state: any;
  signal?: AbortSignal;
  onProgress?: UploadProgressHandler;
}): Promise<boolean> => {
  if (!currentServer) {
    return false;
  }

  // 只有调用方要进度/取消时才多传参数，保持既有调用形状不变。
  if (signal || onProgress) {
    return noloUploadRequest(currentServer, uploadConfig, state, signal, onProgress);
  }
  return noloUploadRequest(currentServer, uploadConfig, state);
};

export const deleteFromReplicationServers = async ({
  servers,
  dbKey,
  deleteOptions = { type: "single" as const },
  state,
  preferredServerOrigin,
}: {
  servers: string[];
  dbKey: string;
  deleteOptions?: { type: "single" | "table" | "messages" };
  state: any;
  preferredServerOrigin?: string | null;
}): Promise<{ succeeded: string[]; failed: string[] }> => {
  if (!servers.length) {
    return { succeeded: [], failed: [] };
  }

  const preferredServer =
    typeof preferredServerOrigin === "string" && preferredServerOrigin.trim().length > 0
      ? normalizeServerOrigin(preferredServerOrigin)
      : null;
  const remainingServers = preferredServer
    ? servers.filter((server) => normalizeServerOrigin(server) !== preferredServer)
    : servers;
  const succeeded: string[] = [];
  const failed: string[] = [];

  if (preferredServer) {
    const ok = await noloDeleteRequest(preferredServer, dbKey, deleteOptions, state);
    if (ok) {
      succeeded.push(preferredServer);
    } else {
      failed.push(preferredServer);
    }
  }

  if (remainingServers.length > 0) {
    const results = await Promise.all(
      remainingServers.map(async (server) => ({
        server,
        ok: await noloDeleteRequest(server, dbKey, deleteOptions, state),
      }))
    );
    results.forEach(({ server, ok }) => {
      if (ok) succeeded.push(server);
      else failed.push(server);
    });
  }

  return { succeeded, failed };
};

export const scheduleDeleteReplication = ({
  currentServer,
  syncServers,
  preferredServerOrigin,
  dbKey,
  deleteOptions,
  state,
  onResult,
  onError,
}: {
  currentServer: string | undefined;
  syncServers: string[] | undefined;
  preferredServerOrigin?: string | null;
  dbKey: string;
  deleteOptions?: { type: "single" | "table" | "messages" };
  state: any;
  onResult?: (result: { succeeded: string[]; failed: string[] }) => void;
  onError?: (error: unknown) => void;
}): string[] => {
  const servers = resolveAuthorityReplicationServers({
    currentServer,
    syncServers,
    preferredServerOrigin,
    dbKey,
    state,
  });

  if (servers.length === 0) {
    return [];
  }

  void Promise.resolve()
    .then(() =>
      deleteFromReplicationServers({
        servers,
        dbKey,
        deleteOptions,
        state,
        preferredServerOrigin,
      })
    )
    .then((result) => {
      onResult?.(result);
    })
    .catch((error) => {
      onError?.(error);
    });

  return servers;
};
