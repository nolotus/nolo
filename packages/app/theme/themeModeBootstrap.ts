const THEME_MODE_VALUES = ["system", "light", "dark"] as const;
const THEME_DENSITY_VALUES = ["compact", "spacious"] as const;

export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ThemeDensity = (typeof THEME_DENSITY_VALUES)[number];

import {
  DEFAULT_THEME_NAME,
  THEME_COLORS,
  THEME_NAME_ALIASES,
} from "./theme.config";
import {
  FONT_PRESET_STORAGE_KEY,
  DEFAULT_FONT_PRESET,
  type FontPreset,
  normalizeFontPreset,
} from "./fontPreference";

type StorageLike = {
  getItem(key: string): string | null;
};

export const SYSTEM_DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const createLiteralGuard =
  <const T extends readonly string[]>(values: T) =>
  (value: unknown): value is T[number] =>
    typeof value === "string" && values.includes(value as T[number]);

const isThemeMode = (value: unknown): value is ThemeMode =>
  createLiteralGuard(THEME_MODE_VALUES)(value);

const isThemeDensity = (value: unknown): value is ThemeDensity =>
  createLiteralGuard(THEME_DENSITY_VALUES)(value);

export const normalizeThemeName = (
  value: unknown
): keyof typeof THEME_COLORS | undefined => {
  if (typeof value !== "string") return undefined;
  const canonicalName =
    value in THEME_NAME_ALIASES
      ? THEME_NAME_ALIASES[value as keyof typeof THEME_NAME_ALIASES]
      : value;
  return canonicalName in THEME_COLORS
    ? (canonicalName as keyof typeof THEME_COLORS)
    : undefined;
};

export const resolveThemeModeIsDark = (
  themeMode: ThemeMode,
  systemPrefersDark: boolean
): boolean =>
  themeMode === "dark"
    ? true
    : themeMode === "light"
      ? false
      : systemPrefersDark;

export function readStoredThemeMode(
  storage: StorageLike | null | undefined
): ThemeMode {
  try {
    const value = storage?.getItem("nolo-theme-mode");
    return isThemeMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function readStoredThemeDensity(
  storage: StorageLike | null | undefined
): ThemeDensity | undefined {
  try {
    const value = storage?.getItem("nolo-density");
    return isThemeDensity(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function readStoredThemeName(
  storage: StorageLike | null | undefined
): keyof typeof THEME_COLORS | undefined {
  try {
    // 只读「主题名」这一项。历史上这里还额外读过 nolo-theme-name-explicit，
    // 但两个分支返回值完全相同（是死代码），它唯一的作用是给这个 try 增加了
    // 第二个可能抛错的存储访问：只要 explicit 读取失败，已经成功读到的主题名
    // 会被一起丢掉，调用方回落到默认主题 nature——表现为首屏 catppuccin、
    // hydrate 后跳成 nature。2026-10-31 用探针确认过该失效路径
    // （theme-name 正常、explicit 抛错 → 返回 undefined）。
    return normalizeThemeName(storage?.getItem("nolo-theme-name")) || undefined;
  } catch {
    return undefined;
  }
}

export function readStoredFontPreset(
  storage: StorageLike | null | undefined
): FontPreset | undefined {
  try {
    return normalizeFontPreset(storage?.getItem(FONT_PRESET_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function resolveThemeModePreload({
  storage,
  systemPrefersDark,
}: {
  storage: StorageLike | null | undefined;
  systemPrefersDark: boolean;
}): { themeMode: ThemeMode; isDark: boolean } {
  const themeMode = readStoredThemeMode(storage);

  return {
    themeMode,
    isDark: resolveThemeModeIsDark(themeMode, systemPrefersDark),
  };
}

/** One read boundary for device appearance: shared by first-paint state and future Owner. */
export const resolveDeviceAppearancePreload = ({
  storage,
  systemPrefersDark,
}: {
  storage: StorageLike | null | undefined;
  systemPrefersDark: boolean;
}) => ({
  ...resolveThemeModePreload({ storage, systemPrefersDark }),
  themeName: readStoredThemeName(storage) ?? DEFAULT_THEME_NAME,
  density: readStoredThemeDensity(storage) ?? "compact",
  fontPreset: readStoredFontPreset(storage) ?? DEFAULT_FONT_PRESET,
});
