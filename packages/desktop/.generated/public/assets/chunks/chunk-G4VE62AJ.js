import {
  toTimestampMs
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";

// packages/app/utils/appKeys.ts
var APP_ROUTE_KEY_PREFIX = "app-";
var normalizeSegment = (value) => asOptionalTrimmedString(value) ?? null;
var buildLegacyAppRouteKey = (appId) => `${APP_ROUTE_KEY_PREFIX}${appId}`;
var isAppRouteKey = (value) => typeof value === "string" && value.startsWith(APP_ROUTE_KEY_PREFIX);
var resolveAppRouteKey = (appKey, appId) => {
  const normalizedAppKey = normalizeSegment(appKey);
  if (normalizedAppKey) return normalizedAppKey;
  const normalizedAppId = normalizeSegment(appId);
  if (!normalizedAppId) return null;
  return isAppRouteKey(normalizedAppId) ? normalizedAppId : buildLegacyAppRouteKey(normalizedAppId);
};
var deriveAppIdFromRouteKey = (appKey, userId) => {
  const normalizedAppKey = normalizeSegment(appKey);
  if (!normalizedAppKey || !isAppRouteKey(normalizedAppKey)) return void 0;
  const normalizedUserId = normalizeSegment(userId);
  if (normalizedUserId) {
    const scopedPrefix = `${APP_ROUTE_KEY_PREFIX}${normalizedUserId}-`;
    if (normalizedAppKey.startsWith(scopedPrefix)) {
      const appId = normalizedAppKey.slice(scopedPrefix.length).trim();
      return appId || void 0;
    }
  }
  const legacyAppId = normalizedAppKey.slice(APP_ROUTE_KEY_PREFIX.length).trim();
  return legacyAppId || void 0;
};

// packages/app/types/appSummary.ts
var toIsoString = (value) => {
  const timestamp = toTimestampMs(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : void 0;
};
var buildAppUrl = (serverOrigin, appId) => {
  if (!serverOrigin || !appId) return null;
  return `${serverOrigin.replace(/\/+$/, "")}/apps/${appId}/`;
};
function toAppSummary(record, fallbackServerOrigin) {
  if (!record || typeof record !== "object") return null;
  const recordDbKey = typeof record.dbKey === "string" && record.dbKey.trim().length > 0 ? record.dbKey : void 0;
  const explicitAppId = typeof record.appId === "string" && record.appId.trim().length > 0 ? record.appId : void 0;
  const appKey = resolveAppRouteKey(
    typeof record.appKey === "string" ? record.appKey : isAppRouteKey(recordDbKey) ? recordDbKey : void 0,
    explicitAppId
  );
  if (!appKey) return null;
  const appId = explicitAppId ?? deriveAppIdFromRouteKey(appKey, record.userId);
  const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name : appId ?? appKey;
  return {
    name,
    url: buildAppUrl(record.serverOrigin ?? fallbackServerOrigin, appId),
    appId,
    appKey,
    serverOrigin: typeof record.serverOrigin === "string" && record.serverOrigin.trim().length > 0 ? record.serverOrigin : fallbackServerOrigin,
    spaceId: typeof record.spaceId === "string" && record.spaceId.trim().length > 0 ? record.spaceId : null,
    customUrl: typeof record.customUrl === "string" && record.customUrl.trim().length > 0 ? record.customUrl : void 0,
    modifiedOn: toIsoString(record.updatedAt ?? record.createdAt),
    visibility: record.visibility ?? "private",
    deployMode: record.deployMode ?? "platform",
    icon: record.icon ?? null
  };
}

export {
  isAppRouteKey,
  resolveAppRouteKey,
  deriveAppIdFromRouteKey,
  toAppSummary
};
