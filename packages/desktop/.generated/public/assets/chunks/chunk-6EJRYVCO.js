import {
  getPublicAgentId
} from "/public/assets/chunks/chunk-4JMBIZX5.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";

// packages/ai/agent/utils/agentRecordIdentity.ts
function getAgentRecordKey(item) {
  if (!item || typeof item !== "object") return null;
  const record = item;
  const dbKey = typeof record.dbKey === "string" ? record.dbKey : null;
  if (dbKey) return dbKey;
  const rawId = typeof record.id === "string" ? record.id : null;
  if (rawId) return getPublicAgentId(record) ?? rawId;
  return null;
}
function getAgentRecordIdentifiers(item) {
  if (!item || typeof item !== "object") return [];
  const record = item;
  const candidates = [
    record.dbKey,
    record.id,
    record.agentKey,
    record.cybotKey,
    record.publicKey,
    record.privateKey
  ];
  return candidates.filter((v) => typeof v === "string" && v.length > 0).map(String);
}
function getAgentRecordTimestamp(item) {
  if (!item || typeof item !== "object") return 0;
  const record = item;
  const value = record.updatedAt ?? record.createdAt ?? record.created;
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== void 0) return asNumber;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
function isAgentRecordOwned(item, source, currentUserId) {
  if (source === "owned") return true;
  if (!item || typeof item !== "object") return false;
  return !!currentUserId && item.userId === currentUserId;
}

export {
  getAgentRecordKey,
  getAgentRecordIdentifiers,
  getAgentRecordTimestamp,
  isAgentRecordOwned
};
