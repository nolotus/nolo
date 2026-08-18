import {
  useSpaceData
} from "/public/assets/chunks/chunk-V2EX6S7V.js";
import {
  syncStandaloneAgentToAccount
} from "/public/assets/chunks/chunk-ADCRZVS7.js";
import {
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-XTMQULJ5.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useIsLoggedIn,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate,
  useParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  asRecordOrEmpty,
  deleteSpace,
  getDefaultSyncJobRegistry,
  isAgentKey,
  isDeviceLocalDbKey,
  isDeviceLocalOwnerId,
  patch,
  read,
  selectAllMemberSpaces,
  selectViewMode,
  setViewMode,
  toast,
  updateSpace,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArchiveRestore,
  LuBan,
  LuCloudUpload,
  LuFolderOutput,
  LuGlobe,
  LuLock,
  LuSettings,
  LuTrash2,
  LuTriangleAlert
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  createSpaceKey,
  normalizeSpaceId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __publicField,
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/pages/SpaceSettings.tsx
var import_react = __toESM(require_react(), 1);

// packages/create/space/spaceLocalAgentsSyncActionVisibility.ts
function resolveSpaceLocalAgentsSyncActionVisibility(input) {
  const account = asTrimmedString(input.accountUserId);
  const owner = asTrimmedString(input.spaceOwnerId);
  const activeNonLocalAccount = input.isLoggedIn === true && account.length > 0 && account !== "local";
  if (!activeNonLocalAccount) {
    return { kind: "hidden" };
  }
  if (!owner || owner !== account) {
    return { kind: "hidden" };
  }
  return { kind: "sync" };
}

// packages/create/space/formatSpaceLocalAgentsUnsupported.ts
function formatUnsupportedTypeCounts(unsupportedByType) {
  if (!unsupportedByType || typeof unsupportedByType !== "object") {
    return [];
  }
  return Object.entries(unsupportedByType).map(([type, count]) => ({
    type: String(type),
    count: asOptionalFiniteNumber(count) ?? 0
  })).filter((row) => row.count > 0).sort((a, b) => a.type.localeCompare(b.type));
}
function formatUnsupportedTypeCountLines(unsupportedByType, labelForType) {
  return formatUnsupportedTypeCounts(unsupportedByType).map(({ type, count }) => {
    const label = labelForType ? labelForType(type) : type;
    return `${label}: ${count}`;
  });
}

// packages/database/sync/preflightAccountSpaceLocalAgents.ts
var AGENT_TYPES = /* @__PURE__ */ new Set(["agent"]);
var UNSUPPORTED_LOCAL_TYPES = /* @__PURE__ */ new Set([
  "dialog",
  "page",
  "doc",
  "table",
  "file",
  "image",
  "app",
  "task",
  "unknown"
]);
var clean = (value) => asTrimmedString(value);
var isTombstoneRecord = (record) => {
  if (!record) return true;
  if (record.deleted === true) return true;
  if (record.isTombstone === true) return true;
  if (typeof record.deletedAt === "string" && record.deletedAt.trim()) {
    return true;
  }
  return false;
};
var isDeviceLocalContentKey = (dbKey) => {
  const key = clean(dbKey);
  if (!key) return false;
  if (isDeviceLocalDbKey(key)) return true;
  const parts = key.split("-");
  if (parts.length >= 3 && parts[1] === "local") return true;
  return false;
};
var normalizeContentType = (rawType, contentKey) => {
  const t = clean(rawType).toLowerCase();
  if (t) {
    if (t === "doc") return "page";
    return t;
  }
  if (isAgentKey(contentKey)) {
    return "agent";
  }
  const prefix = contentKey.split("-")[0]?.toLowerCase() ?? "";
  if (prefix === "meta") return "table";
  if (prefix === "doc") return "page";
  if (prefix === "dialog" || prefix === "page" || prefix === "file" || prefix === "image" || prefix === "app" || prefix === "task" || prefix === "agent" || prefix === "table") {
    return prefix === "table" ? "table" : prefix;
  }
  return "unknown";
};
var stableUnsupportedType = (type) => UNSUPPORTED_LOCAL_TYPES.has(type) ? type : "unknown";
var detailTypeForMissingOrTombstone = (metaType, contentKey) => {
  if (AGENT_TYPES.has(metaType) || isAgentKey(contentKey)) {
    return "agent";
  }
  return stableUnsupportedType(metaType);
};
var bump = (counts, type) => {
  counts[type] = (counts[type] ?? 0) + 1;
};
var recordOwnerId = (record) => {
  const userId = clean(record.userId);
  if (userId) return userId;
  return clean(record.ownerId);
};
var recordDbKey = (record, fallback) => {
  const key = clean(record.dbKey);
  return key || fallback;
};
var authoritativeAgentType = (record, contentKey) => {
  const key = recordDbKey(record, contentKey);
  if (!isAgentKey(contentKey) && !isAgentKey(key)) {
    return null;
  }
  const recordType = clean(record.type).toLowerCase();
  if (recordType) {
    if (recordType === "doc") {
      return null;
    }
    if (!AGENT_TYPES.has(recordType)) {
      return null;
    }
    return "agent";
  }
  return "agent";
};
var isRecordDeviceLocal = (record, contentKey) => {
  const owner = recordOwnerId(record);
  const key = recordDbKey(record, contentKey);
  return isDeviceLocalOwnerId(owner) || isDeviceLocalContentKey(key) || isDeviceLocalContentKey(contentKey);
};
async function preflightAccountSpaceLocalAgents(contents, deps = {}) {
  const map = contents ?? {};
  const queuedLocalAgents = [];
  const details = [];
  const unsupportedByType = {};
  let preservedRemoteCount = 0;
  let tombstoneCount = 0;
  let nonNullCount = 0;
  let missingOrTombstoned = false;
  let typeMismatch = false;
  const readCache = /* @__PURE__ */ new Map();
  const readCached = async (dbKey) => {
    if (!deps.readRecord) return void 0;
    if (readCache.has(dbKey)) {
      return readCache.get(dbKey) ?? null;
    }
    const record = await deps.readRecord(dbKey);
    readCache.set(dbKey, record);
    return record;
  };
  if (deps.readRecord) {
    const uniqueKeys = /* @__PURE__ */ new Set();
    for (const entryKey of Object.keys(map)) {
      const entry = map[entryKey];
      if (entry === null || entry === void 0) {
        continue;
      }
      const contentKey = clean(entry.contentKey) || clean(entryKey);
      if (contentKey) {
        uniqueKeys.add(contentKey);
      }
    }
    await Promise.all(Array.from(uniqueKeys).map((k) => readCached(k)));
  }
  for (const entryKey of Object.keys(map)) {
    const entry = map[entryKey];
    if (entry === null) {
      tombstoneCount += 1;
      continue;
    }
    if (entry === void 0) {
      continue;
    }
    nonNullCount += 1;
    const contentKey = clean(entry.contentKey) || clean(entryKey);
    if (!contentKey) {
      missingOrTombstoned = true;
      const type = "unknown";
      bump(unsupportedByType, type);
      details.push({
        entryKey,
        contentKey: entryKey,
        type,
        reason: "empty_content_key"
      });
      continue;
    }
    const metaType = normalizeContentType(entry.type, contentKey);
    let isLocal = isDeviceLocalContentKey(contentKey) || isDeviceLocalContentKey(entryKey);
    if (deps.readRecord) {
      const record = await readCached(contentKey);
      if (isTombstoneRecord(record)) {
        missingOrTombstoned = true;
        const type = detailTypeForMissingOrTombstone(metaType, contentKey);
        bump(unsupportedByType, type);
        details.push({
          entryKey,
          contentKey,
          type,
          reason: "missing_or_tombstoned_record"
        });
        continue;
      }
      const body = record;
      if (isRecordDeviceLocal(body, contentKey)) {
        isLocal = true;
      } else {
        preservedRemoteCount += 1;
        continue;
      }
      const agentType = authoritativeAgentType(body, contentKey);
      if (agentType) {
        if (!isRecordDeviceLocal(body, contentKey)) {
          preservedRemoteCount += 1;
          continue;
        }
        queuedLocalAgents.push({
          entryKey,
          contentKey,
          type: agentType
        });
        continue;
      }
      const bodyType = stableUnsupportedType(
        normalizeContentType(body.type, contentKey)
      );
      const metaLookedAgent = AGENT_TYPES.has(metaType) || isAgentKey(contentKey);
      if (metaLookedAgent) {
        typeMismatch = true;
        bump(unsupportedByType, bodyType);
        details.push({
          entryKey,
          contentKey,
          type: bodyType,
          reason: "authoritative_type_mismatch"
        });
        continue;
      }
      bump(unsupportedByType, bodyType);
      details.push({
        entryKey,
        contentKey,
        type: bodyType,
        reason: "unsupported_device_local_content"
      });
      continue;
    }
    if (!isLocal) {
      preservedRemoteCount += 1;
      continue;
    }
    const stableType = stableUnsupportedType(metaType);
    if (AGENT_TYPES.has(metaType) || isAgentKey(contentKey)) {
      missingOrTombstoned = true;
      bump(unsupportedByType, stableType === "unknown" && isAgentKey(contentKey) ? "agent" : stableType);
      details.push({
        entryKey,
        contentKey,
        type: AGENT_TYPES.has(metaType) || isAgentKey(contentKey) ? "agent" : stableType,
        reason: "missing_or_tombstoned_record"
      });
      continue;
    }
    bump(unsupportedByType, stableType);
    details.push({
      entryKey,
      contentKey,
      type: stableType,
      reason: "unsupported_device_local_content"
    });
  }
  if (details.length > 0) {
    const hasMissing = missingOrTombstoned || details.some(
      (d) => d.reason === "missing_or_tombstoned_record" || d.reason === "empty_content_key"
    );
    const hasTypeMismatch = typeMismatch || details.some((d) => d.reason === "authoritative_type_mismatch");
    return {
      ok: false,
      reason: hasMissing ? "missing_or_tombstoned_record" : hasTypeMismatch ? "authoritative_type_mismatch" : "unsupported_local_content",
      unsupportedByType: { ...unsupportedByType },
      details: details.map((d) => ({ ...d })),
      queuedLocalAgents: queuedLocalAgents.map((q) => ({ ...q })),
      preservedRemoteCount,
      tombstoneCount,
      nonNullCount
    };
  }
  return {
    ok: true,
    queuedLocalAgents: queuedLocalAgents.map((q) => ({ ...q })),
    preservedRemoteCount,
    tombstoneCount,
    nonNullCount
  };
}
function buildRewrittenSpaceContents(input) {
  const source = input.contents ?? {};
  const next = {};
  for (const [key, value] of Object.entries(source)) {
    next[key] = value === null ? null : { ...value };
  }
  const collisions = [];
  let rewrittenCount = 0;
  const findEntry = (localKey) => {
    const direct = next[localKey];
    if (direct) return { entryKey: localKey, content: direct };
    for (const [entryKey, item] of Object.entries(next)) {
      if (!item) continue;
      if (clean(item.contentKey) === localKey) {
        return { entryKey, content: item };
      }
    }
    return null;
  };
  for (const { localKey, remoteKey } of input.rewrites) {
    const local = clean(localKey);
    const remote = clean(remoteKey);
    if (!local || !remote || local === remote) continue;
    const found = findEntry(local);
    if (!found) continue;
    const existingAtRemote = next[remote];
    if (existingAtRemote && found.entryKey !== remote) {
      collisions.push({
        localKey: local,
        remoteKey: remote,
        existingEntryKey: remote
      });
      continue;
    }
    for (const [entryKey, item] of Object.entries(next)) {
      if (!item || entryKey === found.entryKey) continue;
      if (clean(item.contentKey) === remote || entryKey === remote) {
        collisions.push({
          localKey: local,
          remoteKey: remote,
          existingEntryKey: entryKey
        });
        break;
      }
    }
    if (collisions.some((c) => c.localKey === local && c.remoteKey === remote)) {
      continue;
    }
    const rewritten = {
      ...found.content,
      contentKey: remote
    };
    if (found.entryKey !== remote) {
      delete next[found.entryKey];
    }
    next[remote] = rewritten;
    rewrittenCount += 1;
  }
  return { contents: next, collisions, rewrittenCount };
}
function buildSpaceContentsPatchChanges(previous, next) {
  const prev = previous ?? {};
  const changes = {};
  for (const key of Object.keys(prev)) {
    if (!(key in next)) {
      changes[key] = null;
    }
  }
  for (const [key, value] of Object.entries(next)) {
    const before = prev[key];
    if (before === value) continue;
    if (before && value && clean(before.contentKey) === clean(value.contentKey) && // same object shape after rewrite check: only emit if different
    JSON.stringify(before) === JSON.stringify(value)) {
      continue;
    }
    if (before === null && value === null) continue;
    if (before && value && JSON.stringify(before) === JSON.stringify(value)) {
      continue;
    }
    changes[key] = value === null ? null : { ...value };
  }
  return changes;
}

// packages/database/sync/syncAccountSpaceLocalAgentsToAccount.ts
var SpaceLocalAgentsSyncError = class extends Error {
  constructor(code, message, extra) {
    super(message);
    __publicField(this, "code");
    __publicField(this, "preflight");
    __publicField(this, "collisions");
    this.name = "SpaceLocalAgentsSyncError";
    this.code = code;
    if (extra?.preflight) this.preflight = extra.preflight;
    if (extra?.collisions) this.collisions = extra.collisions;
  }
};
var normalize = (value) => asTrimmedString(value);
var isCanonicalSpaceKey = (dbKey) => {
  const key = normalize(dbKey);
  if (!key) return false;
  const parts = key.split("-");
  return parts.length >= 3 && parts[0] === "space" && parts.every((p) => p.length > 0);
};
var throwIfAborted = (signal, phase) => {
  if (signal?.aborted) {
    const reason = typeof signal.reason === "string" ? signal.reason : signal.reason instanceof Error ? signal.reason.message : "aborted";
    const err = new SpaceLocalAgentsSyncError(
      "ABORTED",
      `syncAccountSpaceLocalAgentsToAccount aborted at ${phase}: ${reason}`
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
function assertAuthoritativeAccountSpaceForLocalAgentsSync(input) {
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
      spaceKey ? `syncAccountSpaceLocalAgentsToAccount: key is not a canonical space-* key: ${spaceKey}` : "syncAccountSpaceLocalAgentsToAccount requires spaceKey"
    );
  }
  if (isTombstone(input.space)) {
    throw new SpaceLocalAgentsSyncError(
      "SPACE_NOT_FOUND",
      `syncAccountSpaceLocalAgentsToAccount: space not found: ${spaceKey}`
    );
  }
  const space = input.space;
  const recordType = normalize(space.type).toLowerCase();
  if (recordType && recordType !== "space") {
    throw new SpaceLocalAgentsSyncError(
      "INVALID_SPACE_KEY",
      `syncAccountSpaceLocalAgentsToAccount: record type ${recordType} is not a Space: ${spaceKey}`
    );
  }
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
var linkAbortController = (external) => {
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
var defaultLog = (event, data) => {
  void import("/public/assets/chunks/localFirstLog-HBUWUDON.js").then(({ localFirstLog }) => {
    localFirstLog(event, data);
  }).catch(() => {
  });
};
async function syncAccountSpaceLocalAgentsToAccount(input, deps) {
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
      spaceKey ? `syncAccountSpaceLocalAgentsToAccount: key is not a canonical space-* key: ${spaceKey}` : "syncAccountSpaceLocalAgentsToAccount requires spaceKey"
    );
  }
  const job = jobRegistry.register({
    accountUserId,
    label: "syncAccountSpaceLocalAgentsToAccount",
    controller: linkAbortController(input.signal)
  });
  const signal = job.signal;
  try {
    throwIfAborted(signal, "start");
    log?.("sync.spaceLocalAgents.start", {
      accountUserId,
      spaceKey
    });
    throwIfAborted(signal, "before-space-read");
    const spaceRecord = await deps.readRecord(spaceKey);
    throwIfAborted(signal, "after-space-read");
    const space = assertAuthoritativeAccountSpaceForLocalAgentsSync({
      spaceKey,
      accountUserId,
      space: spaceRecord
    });
    const rawContents = space.contents;
    const contentsSnapshot = {};
    if (rawContents && typeof rawContents === "object") {
      for (const [k, v] of Object.entries(rawContents)) {
        contentsSnapshot[k] = v === null ? null : { ...v };
      }
    }
    throwIfAborted(signal, "before-preflight");
    const preflight = await preflightAccountSpaceLocalAgents(contentsSnapshot, {
      readRecord: deps.readRecord
    });
    throwIfAborted(signal, "after-preflight");
    if (!preflight.ok) {
      log?.("sync.spaceLocalAgents.preflightRejected", {
        accountUserId,
        spaceKey,
        reason: preflight.reason,
        detailCount: preflight.details.length
      });
      throw new SpaceLocalAgentsSyncError(
        "PREFLIGHT_REJECTED",
        `syncAccountSpaceLocalAgentsToAccount preflight rejected: ${preflight.reason}`,
        { preflight }
      );
    }
    const queued = preflight.queuedLocalAgents;
    if (queued.length === 0) {
      log?.("sync.spaceLocalAgents.noop", {
        accountUserId,
        spaceKey,
        preservedRemoteCount: preflight.preservedRemoteCount
      });
      return {
        spaceKey,
        accountUserId,
        noop: true,
        rewrittenCount: 0,
        agentResults: [],
        space
      };
    }
    const agentResults = [];
    const rewrites = [];
    const synced = await Promise.all(
      queued.map(async (ref) => {
        throwIfAborted(signal, `before-agent:${ref.contentKey}`);
        const agentResult = await syncAgent(
          {
            accountUserId,
            localAgentKey: ref.contentKey,
            includeDialogs: false,
            signal
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
            log: deps.log
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
        remoteKey: agentResult.remoteDbKey
      });
      if (ref.entryKey !== ref.contentKey) {
        rewrites.push({
          localKey: ref.entryKey,
          remoteKey: agentResult.remoteDbKey
        });
      }
    }
    const { contents: rewritten, collisions, rewrittenCount } = buildRewrittenSpaceContents({
      contents: contentsSnapshot,
      rewrites
    });
    if (collisions.length > 0) {
      log?.("sync.spaceLocalAgents.collision", {
        accountUserId,
        spaceKey,
        collisionCount: collisions.length
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
      return {
        spaceKey,
        accountUserId,
        noop: rewrittenCount === 0,
        rewrittenCount,
        agentResults,
        space
      };
    }
    throwIfAborted(signal, "before-space-patch");
    const patched = await deps.patchSpace({
      dbKey: spaceKey,
      changes: {
        contents: contentsChanges,
        updatedAt: now()
      }
    });
    throwIfAborted(signal, "after-space-patch");
    log?.("sync.spaceLocalAgents.done", {
      accountUserId,
      spaceKey,
      rewrittenCount,
      agentCount: agentResults.length
    });
    return {
      spaceKey,
      accountUserId,
      noop: false,
      rewrittenCount,
      agentResults,
      space: patched
    };
  } catch (err) {
    if (!(err instanceof SpaceLocalAgentsSyncError)) {
      log?.("sync.spaceLocalAgents.error", {
        accountUserId,
        spaceKey,
        // Error-only: non-Errors stay "unknown-error" (not String(err) enrichment).
        message: err instanceof Error ? toErrorMessage(err).slice(0, 200) : "unknown-error"
      });
    }
    throw err;
  } finally {
    jobRegistry.unregister(job.id);
  }
}

// packages/create/space/runSyncAccountSpaceLocalAgentsToAccount.ts
var asRecord = (value) => isRecord(value) ? value : null;
var readRecordViaDispatch = (dispatch) => async (dbKey) => {
  try {
    const result = await dispatch(read({ dbKey })).unwrap();
    return asRecord(result);
  } catch {
    return null;
  }
};
async function runPreflightAccountSpaceLocalAgents(input, dispatch) {
  const spaceKey = asTrimmedString(input.spaceKey);
  const accountUserId = asTrimmedString(input.accountUserId);
  const readRecord = readRecordViaDispatch(dispatch);
  const spaceRecord = spaceKey.length > 0 ? await readRecord(spaceKey) : null;
  const space = assertAuthoritativeAccountSpaceForLocalAgentsSync({
    spaceKey,
    accountUserId,
    space: spaceRecord
  });
  const rawContents = asRecordOrEmpty(space?.contents);
  const contentsSnapshot = {};
  for (const [k, v] of Object.entries(rawContents)) {
    contentsSnapshot[k] = v === null ? null : { ...v };
  }
  return preflightAccountSpaceLocalAgents(contentsSnapshot, {
    readRecord
  });
}
async function runSyncAccountSpaceLocalAgentsToAccount(input, dispatch) {
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
      const patched = await dispatch(patch({ dbKey, changes })).unwrap();
      const asObj = asRecord(patched);
      if (asObj) return asObj;
      return { dbKey, ...changes };
    }
  });
}

// packages/create/space/pages/SpaceSettings.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var SpaceSettings = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation("space");
  const memberSpaces = useAppSelector(selectAllMemberSpaces);
  const viewMode = useAppSelector(selectViewMode);
  const accountUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const { spaceData, loading, error } = useSpaceData(spaceId);
  const normalizedSpaceId = spaceId ? normalizeSpaceId(spaceId) : void 0;
  const spaceKey = (0, import_react.useMemo)(
    () => spaceId ? createSpaceKey.space(spaceId) : "",
    [spaceId]
  );
  const localAgentsSyncVisibility = (0, import_react.useMemo)(
    () => resolveSpaceLocalAgentsSyncActionVisibility({
      accountUserId,
      isLoggedIn,
      spaceOwnerId: spaceData?.ownerId
    }),
    [accountUserId, isLoggedIn, spaceData?.ownerId]
  );
  const canCleanupMissingSpaceMembership = !loading && !spaceData && !!normalizedSpaceId && memberSpaces.some(
    (memberSpace) => memberSpace.spaceId === normalizedSpaceId || memberSpace.spaceId === spaceId || `space-${memberSpace.spaceId}` === spaceId
  );
  const [name, setSpaceName] = (0, import_react.useState)("");
  const [description, setDescription] = (0, import_react.useState)("");
  const [visibility, setVisibility] = (0, import_react.useState)("private");
  const [updating, setUpdating] = (0, import_react.useState)(false);
  const [showDeleteModal, setShowDeleteModal] = (0, import_react.useState)(false);
  const [isDeletingSpace, setIsDeletingSpace] = (0, import_react.useState)(false);
  const [hasChanges, setHasChanges] = (0, import_react.useState)(false);
  const [inputErrors, setInputErrors] = (0, import_react.useState)({ name: "", description: "" });
  const [localAgentsPreflighting, setLocalAgentsPreflighting] = (0, import_react.useState)(false);
  const [localAgentsSyncing, setLocalAgentsSyncing] = (0, import_react.useState)(false);
  const [localAgentsConfirmOpen, setLocalAgentsConfirmOpen] = (0, import_react.useState)(false);
  const [localAgentsBlockedOpen, setLocalAgentsBlockedOpen] = (0, import_react.useState)(false);
  const [localAgentsQueuedCount, setLocalAgentsQueuedCount] = (0, import_react.useState)(0);
  const [localAgentsBlocked, setLocalAgentsBlocked] = (0, import_react.useState)(null);
  const localAgentsInFlightRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (spaceData) {
      setSpaceName(spaceData.name || "");
      setDescription(spaceData.description || "");
      setVisibility(spaceData.visibility || "private");
    }
  }, [spaceData?.id, spaceData?.name, spaceData?.description, spaceData?.visibility]);
  (0, import_react.useEffect)(() => {
    if (spaceData) {
      const changed = name !== spaceData.name || description !== spaceData.description || visibility !== spaceData.visibility;
      setHasChanges(changed);
    }
  }, [name, description, visibility, spaceData]);
  const handleDelete = async (strategy = "delete-space-only") => {
    if (!spaceId || !normalizedSpaceId) return;
    const previousViewMode = viewMode;
    const settingsPath = `/space/${encodeURIComponent(spaceId)}/settings`;
    setIsDeletingSpace(true);
    dispatch(setViewMode("all"));
    navigate("/", { replace: true });
    try {
      await dispatch(
        deleteSpace(
          canCleanupMissingSpaceMembership ? normalizedSpaceId : { spaceId: normalizedSpaceId, strategy }
        )
      ).unwrap();
      toast.success(
        canCleanupMissingSpaceMembership ? t("remove_space_membership_success") : strategy === "move-owned-to-all" ? t("delete_space_move_to_all_success") : strategy === "delete-owned-content" ? t("delete_space_delete_owned_success") : t("delete_success")
      );
    } catch (err) {
      dispatch(setViewMode(previousViewMode));
      navigate(settingsPath, { replace: true });
      const errorTitle = canCleanupMissingSpaceMembership ? t("remove_space_membership_error") : t("delete_error");
      toast.error(`${errorTitle}: ${toErrorMessage(err) || t("try_later")}`);
    } finally {
      setIsDeletingSpace(false);
      setShowDeleteModal(false);
    }
  };
  const validateInputs = () => {
    let isValid = true;
    const errors = { name: "", description: "" };
    if (!name.trim()) {
      errors.name = t("name_required");
      isValid = false;
    }
    if (description.length > 500) {
      errors.description = t("description_too_long");
      isValid = false;
    }
    setInputErrors(errors);
    return isValid;
  };
  const handleUpdate = async () => {
    if (!spaceData || !spaceId || !validateInputs() || !hasChanges) return;
    setUpdating(true);
    try {
      await dispatch(updateSpace({
        spaceId,
        name,
        description,
        visibility
      })).unwrap();
      toast.success(t("save_success"));
      setHasChanges(false);
    } catch (err) {
      toast.error(`${t("update_error")}: ${toErrorMessage(err) || t("try_later")}`);
    } finally {
      setUpdating(false);
    }
  };
  const labelUnsupportedType = (0, import_react.useCallback)(
    (type) => {
      const key = `syncLocalAgentsType_${type}`;
      const labeled = t(key, type);
      return labeled;
    },
    [t]
  );
  const blockedTypeLines = (0, import_react.useMemo)(
    () => formatUnsupportedTypeCountLines(
      localAgentsBlocked?.unsupportedByType,
      labelUnsupportedType
    ),
    [localAgentsBlocked?.unsupportedByType, labelUnsupportedType]
  );
  const handleLocalAgentsEntryClick = (0, import_react.useCallback)(async () => {
    if (localAgentsInFlightRef.current || localAgentsSyncVisibility.kind !== "sync" || !spaceKey) {
      return;
    }
    const accountAtClick = asTrimmedString(accountUserId);
    if (!accountAtClick || accountAtClick === "local") {
      return;
    }
    localAgentsInFlightRef.current = true;
    setLocalAgentsPreflighting(true);
    setLocalAgentsBlocked(null);
    setLocalAgentsBlockedOpen(false);
    setLocalAgentsConfirmOpen(false);
    try {
      const preflight = await runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId: accountAtClick },
        dispatch
      );
      if (!preflight.ok) {
        setLocalAgentsBlocked(preflight);
        setLocalAgentsBlockedOpen(true);
        return;
      }
      const queued = preflight.queuedLocalAgents.length;
      if (queued === 0) {
        toast(
          t(
            "syncLocalAgentsNoop",
            "\u6B64 Space \u6CA1\u6709\u9700\u8981\u540C\u6B65\u7684\u672C\u673A Agent\uFF08\u65E0\u4E0A\u4F20\uFF09"
          )
        );
        return;
      }
      setLocalAgentsQueuedCount(queued);
      setLocalAgentsConfirmOpen(true);
    } catch (err) {
      const message = err instanceof Error && err.message.trim() ? err.message : t("syncLocalAgentsError", "\u540C\u6B65\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      toast.error(message);
    } finally {
      localAgentsInFlightRef.current = false;
      setLocalAgentsPreflighting(false);
    }
  }, [accountUserId, dispatch, localAgentsSyncVisibility.kind, spaceKey, t]);
  const handleLocalAgentsConfirmClose = (0, import_react.useCallback)(() => {
    if (localAgentsSyncing) return;
    setLocalAgentsConfirmOpen(false);
  }, [localAgentsSyncing]);
  const handleLocalAgentsBlockedClose = (0, import_react.useCallback)(() => {
    setLocalAgentsBlockedOpen(false);
    setLocalAgentsBlocked(null);
  }, []);
  const handleLocalAgentsConfirm = (0, import_react.useCallback)(async () => {
    if (localAgentsInFlightRef.current) return;
    const account = asTrimmedString(accountUserId);
    if (!account || account === "local" || !spaceKey) return;
    localAgentsInFlightRef.current = true;
    setLocalAgentsSyncing(true);
    try {
      const result = await runSyncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId: account },
        dispatch
      );
      if (result.noop) {
        toast(
          t(
            "syncLocalAgentsNoop",
            "\u6B64 Space \u6CA1\u6709\u9700\u8981\u540C\u6B65\u7684\u672C\u673A Agent\uFF08\u65E0\u4E0A\u4F20\uFF09"
          )
        );
      } else {
        toast.success(
          t("syncLocalAgentsSuccess", {
            count: result.rewrittenCount,
            defaultValue: `\u5DF2\u6539\u5199 ${result.rewrittenCount} \u4E2A\u672C\u673A Agent \u5F15\u7528\u5230\u8D26\u53F7\u5FEB\u7167\uFF08\u672C\u673A Agent \u4ECD\u4FDD\u7559\uFF09`
          })
        );
      }
      setLocalAgentsConfirmOpen(false);
    } catch (err) {
      if (err instanceof SpaceLocalAgentsSyncError && err.code === "PREFLIGHT_REJECTED" && err.preflight) {
        setLocalAgentsConfirmOpen(false);
        setLocalAgentsBlocked(err.preflight);
        setLocalAgentsBlockedOpen(true);
        return;
      }
      const message = err instanceof Error && err.message.trim() ? err.message : t("syncLocalAgentsError", "\u540C\u6B65\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      toast.error(message);
    } finally {
      localAgentsInFlightRef.current = false;
      setLocalAgentsSyncing(false);
    }
  }, [accountUserId, dispatch, spaceKey, t]);
  const localAgentsConfirmFacts = [
    t(
      "syncLocalAgentsFactLocalRemains",
      "\u672C\u673A Agent \u4F1A\u7EE7\u7EED\u7559\u5728\u5168\u5C40/\u672C\u673A\u89C6\u56FE\u4E2D\u3002"
    ),
    t(
      "syncLocalAgentsFactSnapshot",
      "\u4F1A\u4E3A\u8FD9\u4E9B\u672C\u673A Agent \u521B\u5EFA\u6216\u590D\u7528\u8D26\u53F7\u4FA7\u914D\u7F6E\u5FEB\u7167\u3002"
    ),
    t(
      "syncLocalAgentsFactCatalogRewrite",
      "\u6B64 Space \u76EE\u5F55\u4E2D\u7684\u5F15\u7528\u4F1A\u5207\u6362\u4E3A\u8D26\u53F7 Agent \u952E\u3002"
    ),
    t(
      "syncLocalAgentsFactNoDialogs",
      "\u4E0D\u4F1A\u4E0A\u4F20\u5BF9\u8BDD\u3001\u6D88\u606F\u3001\u9644\u4EF6\u3001\u6587\u6863\u3001\u8868\u683C\u6216\u6587\u4EF6\u3002"
    ),
    t(
      "syncLocalAgentsFactNoSecrets",
      "\u4E0D\u4F1A\u4E0A\u4F20\u672C\u673A API \u5BC6\u94A5\u6216\u4EE4\u724C\u3002"
    ),
    t(
      "syncLocalAgentsFactNoContinuous",
      "\u8FD9\u662F\u4E00\u6B21\u6027\u64CD\u4F5C\uFF0C\u4E0D\u4F1A\u6301\u7EED\u540C\u6B65\u3002"
    )
  ];
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__loading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-settings__spinner" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("loading") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings", children: [
    canCleanupMissingSpaceMembership ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmModal,
      {
        isOpen: showDeleteModal,
        onClose: () => setShowDeleteModal(false),
        onConfirm: () => handleDelete(),
        title: t("remove_space_membership_title"),
        message: t("remove_space_membership_confirm_message"),
        type: "error",
        confirmText: t("delete"),
        cancelText: t("cancel"),
        loading: isDeletingSpace
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Dialog,
      {
        isOpen: showDeleteModal,
        onClose: () => !isDeletingSpace && setShowDeleteModal(false),
        title: t("delete_space_options_title"),
        size: "small",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__delete-options", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "space-settings__delete-options-desc", children: t("delete_space_options_desc") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "space-settings__delete-option space-settings__delete-option--recommended",
              onClick: () => handleDelete("move-owned-to-all"),
              disabled: isDeletingSpace,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFolderOutput, { "aria-hidden": "true" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "space-settings__delete-option-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-title", children: t("delete_space_move_to_all") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-text", children: t("delete_space_move_to_all_desc") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "space-settings__delete-option",
              onClick: () => handleDelete("delete-owned-content"),
              disabled: isDeletingSpace,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArchiveRestore, { "aria-hidden": "true" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "space-settings__delete-option-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-title", children: t("delete_space_with_owned") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-text", children: t("delete_space_with_owned_desc") })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "space-settings__delete-option",
              onClick: () => setShowDeleteModal(false),
              disabled: isDeletingSpace,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBan, { "aria-hidden": "true" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "space-settings__delete-option-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-title", children: t("cancel") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__delete-option-text", children: t("delete_space_cancel_desc") })
                ] })
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmModal,
      {
        isOpen: localAgentsConfirmOpen,
        onClose: handleLocalAgentsConfirmClose,
        onConfirm: () => {
          void handleLocalAgentsConfirm();
        },
        title: t("syncLocalAgentsTitle", "\u540C\u6B65\u6B64 Space \u4E2D\u7684\u672C\u673A Agent"),
        message: t("syncLocalAgentsConfirmLead", {
          count: localAgentsQueuedCount,
          defaultValue: `\u68C0\u6D4B\u5230 ${localAgentsQueuedCount} \u4E2A\u672C\u673A Agent \u5F15\u7528\u3002\u786E\u8BA4\u540C\u6B65\u5230\u5F53\u524D\u8D26\u53F7\u5E76\u6539\u5199\u6B64 Space \u76EE\u5F55\uFF1F`
        }),
        confirmText: t("syncLocalAgentsConfirm", "\u786E\u8BA4\u540C\u6B65"),
        cancelText: t("cancel"),
        type: "info",
        loading: localAgentsSyncing,
        allowCancelWhileLoading: false,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "space-settings__sync-local-agents-facts", children: localAgentsConfirmFacts.map((fact) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: fact }, fact)) })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      ConfirmModal,
      {
        isOpen: localAgentsBlockedOpen,
        onClose: handleLocalAgentsBlockedClose,
        onConfirm: handleLocalAgentsBlockedClose,
        title: t("syncLocalAgentsBlockedTitle", "\u65E0\u6CD5\u540C\u6B65\u672C\u673A Agent"),
        message: t(
          "syncLocalAgentsBlockedLead",
          "\u9884\u68C0\u53D1\u73B0\u4E0D\u652F\u6301\u6216\u7F3A\u5931\u7684\u672C\u673A\u5185\u5BB9\uFF0C\u5DF2\u963B\u6B62\u4E0A\u4F20\u3002\u8BF7\u5148\u5904\u7406\u4E0B\u5217\u7C7B\u578B\u540E\u518D\u8BD5\u3002"
        ),
        confirmText: t("syncLocalAgentsBlockedOk", "\u77E5\u9053\u4E86"),
        type: "warning",
        showCancel: false,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "space-settings__sync-local-agents-blocked", children: blockedTypeLines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line)) }),
          localAgentsBlocked?.reason ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "space-settings__sync-local-agents-blocked-reason", children: t(`syncLocalAgentsBlockedReason_${localAgentsBlocked.reason}`, {
            defaultValue: localAgentsBlocked.reason === "missing_or_tombstoned_record" ? "\u90E8\u5206\u5F15\u7528\u7684\u8BB0\u5F55\u7F3A\u5931\u6216\u5DF2\u5220\u9664\u3002" : localAgentsBlocked.reason === "authoritative_type_mismatch" ? "\u76EE\u5F55\u6807\u6CE8\u4E0E\u771F\u5B9E\u8BB0\u5F55\u7C7B\u578B\u4E0D\u4E00\u81F4\u3002" : "\u5305\u542B\u5C1A\u4E0D\u652F\u6301\u540C\u6B65\u7684\u672C\u673A\u5185\u5BB9\u7C7B\u578B\u3002"
          }) }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "space-settings__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSettings, { "aria-hidden": "true", className: "space-settings__header-icon" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "space-settings__title", children: t("space_settings") }),
      hasChanges && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__badge", children: t("unsaved_changes") })
    ] }),
    error || !spaceData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__error-state", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTriangleAlert, { size: 48, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("load_error_title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error && toErrorMessage(error) || t("no_space_data") }),
      canCleanupMissingSpaceMembership && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          variant: "danger",
          onClick: () => setShowDeleteModal(true),
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { "aria-hidden": "true" }),
          className: "space-settings__error-action",
          children: t("remove_space_membership_action")
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "space-settings__section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-settings__form-group", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Input,
          {
            label: t("name"),
            value: name,
            onChange: (e) => setSpaceName(e.target.value),
            placeholder: t("name_placeholder"),
            error: !!inputErrors.name,
            helperText: inputErrors.name
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-settings__form-group", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TextArea,
          {
            label: t("description"),
            value: description,
            onChange: (e) => setDescription(e.target.value),
            placeholder: t("description_placeholder"),
            rows: 3,
            error: !!inputErrors.description,
            helperText: inputErrors.description
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__form-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "space-settings__label", children: t("access_permission") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__visibility-list", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: `space-settings__visibility-item ${visibility === "private" ? "space-settings__visibility-item--selected" : ""}`,
                onClick: () => setVisibility("private"),
                "aria-pressed": visibility === "private",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLock, { "aria-hidden": "true", className: "space-settings__visibility-icon" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("private") })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: `space-settings__visibility-item ${visibility === "public" ? "space-settings__visibility-item--selected" : ""}`,
                onClick: () => setVisibility("public"),
                "aria-pressed": visibility === "public",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuGlobe, { "aria-hidden": "true", className: "space-settings__visibility-icon" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("public") })
                ]
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            onClick: handleUpdate,
            loading: updating,
            disabled: !hasChanges || updating,
            variant: hasChanges ? "primary" : "secondary",
            className: hasChanges ? "space-settings__save-btn--active" : "",
            children: t("save_changes")
          }
        ),
        hasChanges && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            type: "button",
            variant: "ghost",
            onClick: () => {
              if (spaceData) {
                setSpaceName(spaceData.name || "");
                setDescription(spaceData.description || "");
                setVisibility(spaceData.visibility || "private");
              }
            },
            children: t("cancel_changes")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-settings__divider" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "space-settings__meta", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__meta-item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-label", children: t("space_id") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-value space-settings__meta-value--code", children: spaceData.id })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-sep", children: "\xB7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__meta-item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-label", children: t("created_at") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-value", children: new Date(spaceData.createdAt).toLocaleDateString() })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-sep", children: "\xB7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__meta-item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "space-settings__meta-label", children: t("member_count") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "space-settings__meta-value", children: [
            spaceData.members?.length || 0,
            " ",
            t("people")
          ] })
        ] })
      ] }),
      localAgentsSyncVisibility.kind === "sync" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "space-settings__section space-settings__section--sync", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__section-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "space-settings__section-title", children: t("syncLocalAgentsSectionTitle", "\u672C\u673A Agent \u4E0E\u6B64 Space") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "space-settings__section-desc", children: t(
            "syncLocalAgentsSectionDesc",
            "\u628A\u6B64\u8D26\u53F7 Space \u76EE\u5F55\u91CC\u5F15\u7528\u7684\u672C\u673A Agent \u5BF9\u8D26\u5230\u8D26\u53F7\u5FEB\u7167\u3002\u4E0D\u4F1A\u521B\u5EFA\u65B0 Space\uFF0C\u4E5F\u4E0D\u4F1A\u505A\u5B8C\u6574 Space \u4E91\u540C\u6B65\u3002"
          ) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            type: "button",
            variant: "secondary",
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCloudUpload, { "aria-hidden": "true" }),
            loading: localAgentsPreflighting || localAgentsSyncing,
            disabled: localAgentsPreflighting || localAgentsSyncing,
            onClick: () => {
              void handleLocalAgentsEntryClick();
            },
            children: t("syncLocalAgents", "\u540C\u6B65\u6B64 Space \u4E2D\u7684\u672C\u673A Agent")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { className: "space-settings__danger-zone", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-settings__danger-content", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-settings__danger-title", children: t("delete_space") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "space-settings__danger-desc", children: t("delete_description") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Button_default,
          {
            variant: "danger",
            onClick: () => setShowDeleteModal(true),
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { "aria-hidden": "true" }),
            children: t("delete_space")
          }
        )
      ] })
    ] })
  ] });
};
var SpaceSettings_default = SpaceSettings;
export {
  SpaceSettings_default as default
};
