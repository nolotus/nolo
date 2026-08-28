import { normalizeServerOrigin } from "core/serverOrigin";
import { noloPatchRequest, noloWriteRequest } from "database/requests";

type BootstrapArgs = {
  shareDbKey: string;
  shareRecord: any;
  tableDbKey: string;
  replicaServers: string[];
  thunkApi: any;
  loadOriginTableSnapshot?: (
    tableDbKey: string
  ) => Promise<{ tableMeta: any; rows: any[] }>;
  loadLocalTableSnapshot?: (
    tableDbKey: string
  ) => Promise<{ tableMeta: any; rows: any[] }>;
  writeToServer?: (server: string, dbKey: string, data: any) => Promise<boolean>;
  patchShareMeta?: (changes: Record<string, unknown>) => Promise<boolean>;
};

const defaultLoadOriginTableSnapshot = async (args: BootstrapArgs) => {
  const originServer = normalizeServerOrigin(
    args.shareRecord?.meta?.originServer ?? args.shareRecord?.data?.originServer
  );
  const token = args.shareDbKey.startsWith("share-")
    ? args.shareDbKey.slice("share-".length)
    : "";
  if (!originServer || !token) {
    throw new Error("Origin share bootstrap requires an originServer and share token");
  }

  const headers: Record<string, string> = {};
  const tokenValue = args.thunkApi?.getState?.()?.auth?.currentToken;
  if (typeof tokenValue === "string" && tokenValue.length > 0) {
    headers.Authorization = `Bearer ${tokenValue}`;
  }

  const response = await fetch(
    `${originServer}/api/v1/share/${encodeURIComponent(token)}/table?rowLimit=all`,
    {
      method: "GET",
      headers,
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to load origin table snapshot (${response.status})`);
  }
  const payload = await response.json();
  return {
    tableMeta: payload?.tableMeta ?? null,
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
  };
};

export async function bootstrapReplicatedTable(args: BootstrapArgs): Promise<{
  replicatedServers: string[];
  failedServers: string[];
  lastReplicationAt: number;
}> {
  const loadOriginTableSnapshot =
    args.loadOriginTableSnapshot ??
    args.loadLocalTableSnapshot ??
    (() => defaultLoadOriginTableSnapshot(args));
  const state = args.thunkApi?.getState?.() ?? {};
  const originServer = normalizeServerOrigin(
    args.shareRecord?.meta?.originServer ??
      args.shareRecord?.data?.originServer
  );
  const writeToServer =
    args.writeToServer ??
    ((server: string, dbKey: string, data: any) =>
      noloWriteRequest(
        server,
        {
          data,
          customKey: dbKey,
          userId:
            typeof data?.userId === "string"
              ? data.userId
              : typeof data?.tenantId === "string"
                ? data.tenantId
                : args.shareRecord?.meta?.authorId,
        },
        state
      ));
  const patchShareMeta =
    args.patchShareMeta ??
    (async (changes: Record<string, unknown>) => {
      if (!originServer) return false;
      const nextMeta = {
        ...(args.shareRecord?.meta ?? {}),
        ...changes,
      };
      const ok = await noloPatchRequest(originServer, args.shareDbKey, { meta: nextMeta }, state);
      if (ok) {
        args.shareRecord.meta = nextMeta;
      }
      return ok;
    });

  const snapshot = await loadOriginTableSnapshot(args.tableDbKey);
  const failedServers: string[] = [];
  const lastReplicationAt = Date.now();

  if (!snapshot.tableMeta?.dbKey) {
    await patchShareMeta({
      replicaServers: args.replicaServers,
      replicationDirtyAt: lastReplicationAt,
      lastReplicationError: `bootstrap failed: missing table meta for ${args.tableDbKey}`,
    });
    return {
      replicatedServers: [],
      failedServers: [...args.replicaServers],
      lastReplicationAt,
    };
  }

  const serverResults = await Promise.all(
    args.replicaServers.map(async (server) => {
      const metaOk = await writeToServer(server, snapshot.tableMeta.dbKey, snapshot.tableMeta);
      if (!metaOk) return server;

      for (const row of snapshot.rows) {
        const rowOk = await writeToServer(server, row.dbKey, row);
        if (!rowOk) return server;
      }
      return null;
    }),
  );
  for (const failed of serverResults) {
    if (failed) failedServers.push(failed);
  }

  await patchShareMeta(
    failedServers.length > 0
      ? {
          replicaServers: args.replicaServers,
          lastReplicationAt,
          replicationDirtyAt: lastReplicationAt,
          lastReplicationError: `bootstrap failed: ${failedServers.join(", ")}`,
        }
      : {
          replicaServers: args.replicaServers,
          lastReplicationAt,
          replicationDirtyAt: null,
          lastReplicationError: null,
        }
  );

  return {
    replicatedServers: args.replicaServers.filter(
      (server) => !failedServers.includes(server)
    ),
    failedServers,
    lastReplicationAt,
  };
}
