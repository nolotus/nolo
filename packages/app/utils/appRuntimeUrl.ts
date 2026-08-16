const normalizeAbsoluteUrl = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const normalizeOrigin = (value?: string | null): string | undefined => {
  const normalized = normalizeAbsoluteUrl(value);
  if (!normalized || !/^https?:\/\//.test(normalized)) return undefined;
  return normalized.replace(/\/+$/, "");
};

export const buildAppRuntimeUrl = (
  appId?: string | null,
  origin?: string | null
): string | undefined => {
  const normalizedAppId = normalizeAbsoluteUrl(appId);
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedAppId || !normalizedOrigin) return undefined;
  return `${normalizedOrigin}/apps/${normalizedAppId}/`;
};

export const getCurrentAppRuntimeOrigin = (): string | undefined => {
  if (
    typeof window !== "undefined" &&
    typeof window.location?.origin === "string"
  ) {
    return normalizeOrigin(window.location.origin);
  }
  return undefined;
};

export const resolvePreferredAppRuntimeUrl = (params: {
  appId?: string | null;
  customUrl?: string | null;
  url?: string | null;
  currentOrigin?: string | null;
}): string => {
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
