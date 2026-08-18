import {
  createAgentKey,
  getDefaultSyncJobRegistry,
  isDeviceLocalDbKey,
  isDeviceLocalOwnerId,
  isOAuthApiKeyRef,
  ulid2 as ulid
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString,
  ensureSyncMappingsHydrated,
  getBoundSyncMappingClientDb,
  getDefaultSyncMappingStore,
  putSyncMappingDurable,
  removeSyncMappingDurable
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";

// packages/database/sync/stripAgentForAccountSync.ts
var SECRET_FIELD_NAMES = /* @__PURE__ */ new Set([
  "apiKey",
  "apikey",
  "API_KEY",
  "password",
  "passwd",
  "secret",
  "clientSecret",
  "client_secret",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "sessionToken",
  "session_token",
  "bearerToken",
  "bearer_token",
  "authorization",
  "authHeader",
  "auth_header",
  "privateKey",
  "private_key",
  "token",
  "credentials",
  "credential",
  "oauthToken",
  "oauth_token",
  "idToken",
  "id_token"
]);
var LOCAL_ONLY_FIELDS = /* @__PURE__ */ new Set([
  "credentialRef",
  "credentialMigration",
  "localBrokerPath",
  "brokerPath",
  "credentialPath",
  "homeDir",
  "cwd",
  "workspacePath",
  "dialogIds",
  "dialogs",
  "messages",
  "messageIds",
  "attachments",
  "attachmentIds",
  "history",
  "chatHistory"
]);
var looksLikeRawSecret = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^sk-[A-Za-z0-9_-]{8,}$/.test(trimmed)) return true;
  if (/^Bearer\s+\S{16,}$/i.test(trimmed)) return true;
  if (/^api-key:/i.test(trimmed)) return true;
  if (/^[A-Za-z0-9_]{40,}$/.test(trimmed)) return true;
  return false;
};
function isAccountSafeOAuthApiKeyRef(value) {
  return isOAuthApiKeyRef(value);
}
var isSafeApiKeyHeader = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || looksLikeRawSecret(trimmed)) return false;
  if (trimmed.length > 64) return false;
  if (/\s/.test(trimmed)) return false;
  return /^[A-Za-z0-9-]+$/.test(trimmed);
};
var maybeKeepRefField = (key, value) => {
  if (key === "credentialRef") {
    return void 0;
  }
  if (key === "apiKeyRef") {
    if (!isAccountSafeOAuthApiKeyRef(value)) return void 0;
    return asTrimmedLowercaseString(value);
  }
  if (key === "apiKeyHeader") {
    if (!isSafeApiKeyHeader(value)) return void 0;
    return value.trim();
  }
  return void 0;
};
function stripAgentForAccountSync(input) {
  const accountUserId = asTrimmedString(input.accountUserId);
  if (!accountUserId || accountUserId === "local") {
    throw new Error(
      "stripAgentForAccountSync requires a non-local accountUserId"
    );
  }
  const agentId = asTrimmedString(input.agentId);
  if (!agentId) {
    throw new Error("stripAgentForAccountSync requires agentId");
  }
  const now = asOptionalFiniteNumber(input.now) ?? Date.now();
  const source = input.localAgent;
  const remoteDbKey = createAgentKey.private(accountUserId, agentId);
  const out = {};
  for (const [rawKey, value] of Object.entries(source)) {
    const key = rawKey;
    if (SECRET_FIELD_NAMES.has(key)) {
      continue;
    }
    if (LOCAL_ONLY_FIELDS.has(key)) {
      continue;
    }
    if (key === "apiKeyRef" || key === "apiKeyHeader") {
      const kept = maybeKeepRefField(key, value);
      if (kept !== void 0) out[key] = kept;
      continue;
    }
    if (key === "id" || key === "dbKey" || key === "userId" || key === "type" || key === "isPublic" || key === "spaceId" || key === "serverOrigin" || key === "authorityServer" || key === "createdAt" || key === "updatedAt" || key === "dialogCount" || key === "messageCount" || key === "tokenCount") {
      continue;
    }
    if (key === "runtimeBinding") {
      continue;
    }
    if (value === void 0) continue;
    if (typeof value === "string" && looksLikeRawSecret(value)) {
      continue;
    }
    if (isRecord(value)) {
      out[key] = stripNestedSecrets(value);
      continue;
    }
    out[key] = value;
  }
  const snapshot = {
    ...out,
    id: agentId,
    type: "agent" /* AGENT */,
    userId: accountUserId,
    dbKey: remoteDbKey,
    isPublic: false,
    // Fresh account agent: no dialog/message history uploaded in this slice.
    dialogCount: 0,
    messageCount: 0,
    tokenCount: 0,
    createdAt: now,
    updatedAt: now
  };
  return snapshot;
}
function stripNestedSecrets(obj) {
  const next = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_FIELD_NAMES.has(key) || LOCAL_ONLY_FIELDS.has(key)) continue;
    if (key === "apiKeyRef" || key === "apiKeyHeader" || key === "credentialRef") {
      const kept = maybeKeepRefField(key, value);
      if (kept !== void 0) next[key] = kept;
      continue;
    }
    if (typeof value === "string" && looksLikeRawSecret(value)) continue;
    if (isRecord(value)) {
      next[key] = stripNestedSecrets(value);
      continue;
    }
    next[key] = value;
  }
  return next;
}
function agentSnapshotContainsSecrets(record) {
  if (!record || typeof record !== "object") return false;
  const walk = (value) => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(walk);
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_FIELD_NAMES.has(key)) {
        if (typeof child === "string" && child.trim()) return true;
        if (child != null && child !== "") return true;
      }
      if (typeof child === "string" && looksLikeRawSecret(child)) return true;
      if (walk(child)) return true;
    }
    return false;
  };
  return walk(record);
}

// packages/database/sync/syncStandaloneAgentToAccount.ts
var dropStaleMapping = async (localAgentKey, accountUserId, mappingStore, persistDurable, usingDefaultStore) => {
  if (persistDurable && usingDefaultStore) {
    await removeSyncMappingDurable(localAgentKey, accountUserId);
    return;
  }
  mappingStore.remove(localAgentKey, accountUserId);
};
var normalize = (value) => asTrimmedString(value);
var throwIfAborted = (signal, phase) => {
  if (signal?.aborted) {
    const reason = typeof signal.reason === "string" ? signal.reason : signal.reason instanceof Error ? signal.reason.message : "aborted";
    const err = new Error(
      `syncStandaloneAgentToAccount aborted at ${phase}: ${reason}`
    );
    err.name = "AbortError";
    throw err;
  }
};
var isTombstone = (record) => {
  if (!record) return true;
  if (record.deleted === true) return true;
  if (record.isTombstone === true) return true;
  if (typeof record.deletedAt === "string" && record.deletedAt.trim()) {
    return true;
  }
  return false;
};
var defaultLog = (event, data) => {
  void import("/public/assets/chunks/localFirstLog-HBUWUDON.js").then(({ localFirstLog }) => {
    localFirstLog(event, data);
  }).catch(() => {
  });
};
async function syncStandaloneAgentToAccount(input, deps) {
  const accountUserId = normalize(input.accountUserId);
  const localAgentKey = normalize(input.localAgentKey);
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? Date.now;
  const createId = deps.createId ?? ulid;
  const usingDefaultStore = !deps.mappingStore;
  const mappingStore = deps.mappingStore ?? getDefaultSyncMappingStore();
  const jobRegistry = deps.jobRegistry ?? getDefaultSyncJobRegistry();
  const persistDurable = deps.persistMappingDurable !== false;
  if (!accountUserId || accountUserId === "local") {
    throw new Error(
      "syncStandaloneAgentToAccount requires a non-local accountUserId"
    );
  }
  if (!localAgentKey) {
    throw new Error("syncStandaloneAgentToAccount requires localAgentKey");
  }
  if (input.includeDialogs === true) {
    throw new Error(
      "syncStandaloneAgentToAccount does not support includeDialogs=true in this slice"
    );
  }
  const job = jobRegistry.register({
    accountUserId,
    label: "syncStandaloneAgentToAccount",
    controller: input.signal ? (
      // Re-use external signal bookkeeping via a linked controller.
      (() => {
        const controller = new AbortController();
        if (input.signal.aborted) {
          controller.abort(input.signal.reason);
        } else {
          input.signal.addEventListener(
            "abort",
            () => controller.abort(input.signal.reason),
            { once: true }
          );
        }
        return controller;
      })()
    ) : void 0
  });
  const signal = job.signal;
  try {
    throwIfAborted(signal, "start");
    log?.("sync.agent.start", {
      accountUserId,
      localAgentKey,
      includeDialogs: 0
    });
    if (persistDurable && usingDefaultStore) {
      if (!getBoundSyncMappingClientDb()) {
        throw new Error(
          "syncStandaloneAgentToAccount requires a bound client DB for durable mapping; refuse silent durability downgrade"
        );
      }
      throwIfAborted(signal, "before-hydrate");
      await ensureSyncMappingsHydrated();
      throwIfAborted(signal, "after-hydrate");
    }
    const existing = mappingStore.get(localAgentKey, accountUserId);
    if (existing) {
      throwIfAborted(signal, "before-idempotent-read");
      const remote = await deps.readRecord(existing.remoteDbKey);
      throwIfAborted(signal, "after-idempotent-read");
      if (remote && !isTombstone(remote)) {
        log?.("sync.agent.reuse", {
          accountUserId,
          localAgentKey,
          remoteDbKey: existing.remoteDbKey
        });
        return {
          localDbKey: existing.localDbKey,
          remoteDbKey: existing.remoteDbKey,
          accountUserId,
          mapping: existing,
          reused: true,
          agent: remote
        };
      }
      await dropStaleMapping(
        localAgentKey,
        accountUserId,
        mappingStore,
        persistDurable,
        usingDefaultStore
      );
      log?.("sync.agent.staleMapping", {
        accountUserId,
        localAgentKey,
        remoteDbKey: existing.remoteDbKey
      });
    }
    throwIfAborted(signal, "before-local-read");
    const localAgent = await deps.readRecord(localAgentKey);
    throwIfAborted(signal, "after-local-read");
    if (!localAgent) {
      throw new Error(
        `syncStandaloneAgentToAccount: local agent not found: ${localAgentKey}`
      );
    }
    const owner = asTrimmedString(localAgent.userId);
    if (!isDeviceLocalDbKey(localAgentKey) && !isDeviceLocalOwnerId(owner) && !isDeviceLocalDbKey(
      typeof localAgent.dbKey === "string" ? localAgent.dbKey : null
    )) {
      throw new Error(
        `syncStandaloneAgentToAccount: agent is not device-local: ${localAgentKey}`
      );
    }
    const agentId = createId();
    const snapshot = stripAgentForAccountSync({
      localAgent,
      accountUserId,
      agentId,
      now: now()
    });
    if (agentSnapshotContainsSecrets(snapshot)) {
      throw new Error(
        "syncStandaloneAgentToAccount refused to upload secret-bearing agent fields"
      );
    }
    delete snapshot.dialogs;
    delete snapshot.messages;
    delete snapshot.attachments;
    throwIfAborted(signal, "before-account-write");
    const written = await deps.writeRecord({
      data: snapshot,
      customKey: snapshot.dbKey,
      userId: accountUserId
    });
    throwIfAborted(signal, "after-account-write");
    const remoteDbKey = asOptionalTrimmedString(written?.dbKey) ?? snapshot.dbKey;
    const mappingInput = {
      localDbKey: localAgentKey,
      remoteDbKey,
      accountUserId,
      contentType: "agent",
      updatedAt: now()
    };
    let mapping;
    if (persistDurable && usingDefaultStore) {
      mapping = await putSyncMappingDurable(mappingInput);
    } else {
      mapping = mappingStore.put(mappingInput);
    }
    log?.("sync.agent.done", {
      accountUserId,
      localAgentKey,
      remoteDbKey,
      reused: 0
    });
    return {
      localDbKey: localAgentKey,
      remoteDbKey,
      accountUserId,
      mapping,
      reused: false,
      agent: written ?? snapshot
    };
  } catch (err) {
    log?.("sync.agent.error", {
      accountUserId,
      localAgentKey,
      // Error-only: non-Errors stay "unknown-error" (not String(err) enrichment).
      message: err instanceof Error ? toErrorMessage(err).slice(0, 200) : "unknown-error"
    });
    throw err;
  } finally {
    jobRegistry.unregister(job.id);
  }
}

export {
  syncStandaloneAgentToAccount
};
