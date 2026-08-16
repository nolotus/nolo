import { SettingRoutePaths } from "./config";

const LEGACY_SETTINGS_PREFIX = `/${SettingRoutePaths.SETTING_LEGACY}`;
const CANONICAL_SETTINGS_PREFIX = `/${SettingRoutePaths.SETTING}`;

export function resolveLegacySettingsRedirectPath(url: URL): string | null {
  return resolveLegacySettingsRedirectPathFromParts(url.pathname, url.search, url.hash);
}

export function resolveLegacySettingsRedirectPathFromParts(
  pathname: string,
  search = "",
  hash = "",
): string | null {
  if (pathname !== LEGACY_SETTINGS_PREFIX && !pathname.startsWith(`${LEGACY_SETTINGS_PREFIX}/`)) {
    return null;
  }

  const legacySuffix = pathname.slice(LEGACY_SETTINGS_PREFIX.length);
  const canonicalSuffix = legacySuffix === "/" ? "" : legacySuffix;
  return `${CANONICAL_SETTINGS_PREFIX}${canonicalSuffix}${search}${hash}`;
}
