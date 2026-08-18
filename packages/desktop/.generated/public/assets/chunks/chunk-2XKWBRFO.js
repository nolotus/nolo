import {
  noloWriteRequest,
  selectCurrentServer,
  selectSyncServers
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/app/actions/syncAppRecord.ts
var syncAppRecord = (appKey, appRecord, options = {}) => async (_dispatch, getState, extra) => {
  if (!appKey || !appRecord) return;
  const state = getState();
  const currentServer = selectCurrentServer(state);
  const syncServers = selectSyncServers(state) ?? [];
  const { db: clientDb } = extra ?? {};
  const normalizedRecord = {
    ...appRecord,
    dbKey: appKey,
    type: "app" /* APP */
  };
  if (clientDb) {
    await clientDb.put(appKey, normalizedRecord).catch((err) => {
      console.warn("[syncAppRecord] local DB write failed:", appKey, err);
    });
  }
  const rawServers = options.includeCurrentServer ? [currentServer, ...syncServers] : syncServers.filter((s) => s !== currentServer);
  const serversToSync = [...new Set(rawServers.filter((s) => !!s))];
  if (serversToSync.length === 0) return;
  await Promise.allSettled(
    serversToSync.map(
      (server) => noloWriteRequest(
        server,
        { data: normalizedRecord, customKey: appKey, userId: normalizedRecord.userId },
        state
      )
    )
  );
};

export {
  syncAppRecord
};
