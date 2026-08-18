import {
  createUserKey,
  extractAgentInfo,
  extractCoverImage,
  noloDeleteRequest,
  noloWriteRequest,
  normalizeTimeFields,
  resolveShareAuthorIdentity,
  sanitizeShareData,
  selectCurrentServer,
  selectIdentityUser,
  selectIdentityUserId,
  selectRemoteServers,
  shareKey,
  toNonEmptyString
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/share/action.ts
var generateToken = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charsLen = chars.length;
  const maxValid = 252;
  let token = "";
  while (token.length < 10) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length && token.length < 10; i++) {
      if (bytes[i] < maxValid) {
        token += chars.charAt(bytes[i] % charsLen);
      }
    }
  }
  return token;
};
var assertDialogShareMessagesPresent = (type, data) => {
  if (type !== "dialog") return;
  const messages = Array.isArray(data.messages) ? data.messages : Array.isArray(data.history) ? data.history : [];
  if (messages.length > 0) return;
  throw new Error("Cannot share dialog without persisted messages.");
};
var resolveTableSharePayload = (type, data, userId, originServer) => {
  if (type !== "table") return sanitizeShareData(data);
  const tableDbKey = typeof data.dbKey === "string" && data.dbKey.trim().length > 0 ? data.dbKey : void 0;
  const tableOwnerId = typeof data.tenantId === "string" && data.tenantId.trim().length > 0 ? data.tenantId : userId;
  if (!tableDbKey) {
    throw new Error("Table share requires a dbKey.");
  }
  return {
    mode: "live",
    tableDbKey,
    tableOwnerId,
    originServer
  };
};
var shareResourceAction = async (config, thunkApi) => {
  const state = thunkApi.getState();
  const userId = selectIdentityUserId(state);
  const currentUser = selectIdentityUser(state);
  if (!userId) {
    throw new Error("User must be logged in to share resources.");
  }
  const token = generateToken();
  const key = shareKey.create(token);
  const currentServer = selectCurrentServer(state);
  assertDialogShareMessagesPresent(config.type, config.data);
  const snapshotData = resolveTableSharePayload(
    config.type,
    config.data,
    userId,
    currentServer
  );
  const coverImage = extractCoverImage(config.type, snapshotData);
  const agentInfo = extractAgentInfo(config.type, snapshotData);
  const createdAt = Date.now();
  const { db: clientDb } = thunkApi.extra;
  let authorProfile = null;
  if (clientDb) {
    try {
      authorProfile = await clientDb.get(createUserKey.profile(userId));
    } catch {
      authorProfile = null;
    }
  }
  const { authorName, authorAvatar } = resolveShareAuthorIdentity({
    user: currentUser,
    profile: authorProfile
  });
  if (agentInfo.sourceAgentKey && !agentInfo.sourceAgentName) {
    if (clientDb) {
      try {
        const agentData = await clientDb.get(agentInfo.sourceAgentKey);
        const name = toNonEmptyString(agentData?.name);
        if (name) agentInfo.sourceAgentName = name;
      } catch {
      }
    }
  }
  const sharedObject = {
    type: config.type,
    version: 1,
    data: snapshotData,
    meta: {
      authorId: userId,
      ...authorName ? { authorName } : {},
      ...authorAvatar ? { authorAvatar } : {},
      createdAt,
      visibility: config.visibility ?? "private",
      title: config.title,
      description: config.description,
      originalId: config.data.dbKey ?? config.data.id,
      coverImage,
      ...agentInfo
    }
  };
  const servers = [
    currentServer,
    ...selectRemoteServers(state).filter((server) => server !== currentServer)
  ].filter(Boolean);
  const replicaServers = servers.filter((server) => server !== currentServer);
  if (servers.length === 0) {
    throw new Error("No available server to publish share.");
  }
  if (config.type === "table" && sharedObject.data.mode === "live") {
    sharedObject.data = {
      ...sharedObject.data,
      originServer: currentServer
    };
    sharedObject.meta = {
      ...sharedObject.meta,
      mode: "live",
      tableDbKey: typeof sharedObject.data.tableDbKey === "string" ? sharedObject.data.tableDbKey : void 0,
      tableOwnerId: typeof sharedObject.data.tableOwnerId === "string" ? sharedObject.data.tableOwnerId : void 0,
      originServer: currentServer,
      replicaServers
    };
  }
  const persistedSharedObject = normalizeTimeFields({
    ...sharedObject,
    dbKey: key,
    userId
  });
  const indexKeys = shareKey.allIndexKeysFromShare(key, persistedSharedObject);
  const results = await Promise.all(
    servers.map(
      (server) => noloWriteRequest(server, { data: persistedSharedObject, customKey: key, userId, indexKeys }, state)
    )
  );
  const [originPublished, ...replicaPublishResults] = results;
  if (!originPublished) {
    const successfulReplicaServers = replicaServers.filter(
      (_, index) => replicaPublishResults[index]
    );
    await Promise.all(
      successfulReplicaServers.map(
        (server) => noloDeleteRequest(server, key, { type: "single" }, state)
      )
    );
    throw new Error("Failed to publish share to origin server.");
  }
  if (!clientDb) {
    throw new Error("Client database instance is required in shareResourceAction");
  }
  await clientDb.put(key, persistedSharedObject);
  return { token, key };
};

export {
  shareResourceAction
};
