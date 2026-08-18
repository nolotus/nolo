// packages/app/utils/appRuntimeUrl.ts
var normalizeAbsoluteUrl = (value) => {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  return trimmed;
};
var normalizeOrigin = (value) => {
  const normalized = normalizeAbsoluteUrl(value);
  if (!normalized || !/^https?:\/\//.test(normalized)) return void 0;
  return normalized.replace(/\/+$/, "");
};
var buildAppRuntimeUrl = (appId, origin) => {
  const normalizedAppId = normalizeAbsoluteUrl(appId);
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedAppId || !normalizedOrigin) return void 0;
  return `${normalizedOrigin}/apps/${normalizedAppId}/`;
};
var getCurrentAppRuntimeOrigin = () => {
  if (typeof window !== "undefined" && typeof window.location?.origin === "string") {
    return normalizeOrigin(window.location.origin);
  }
  return void 0;
};
var resolvePreferredAppRuntimeUrl = (params) => {
  const customUrl = normalizeAbsoluteUrl(params.customUrl);
  const remoteUrl = normalizeAbsoluteUrl(params.url);
  if (customUrl && customUrl !== remoteUrl) return customUrl;
  const platformUrl = buildAppRuntimeUrl(
    params.appId,
    params.currentOrigin ?? getCurrentAppRuntimeOrigin()
  );
  if (platformUrl) return platformUrl;
  return remoteUrl ?? "";
};

export {
  resolvePreferredAppRuntimeUrl
};
