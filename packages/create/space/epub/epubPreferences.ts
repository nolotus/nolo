// create/space/epub/epubPreferences.ts
//
// 阅读外观偏好（字号 / 字体风格 / 主题）：每个用户一条 `user-pref-<userId>-epub_reader_prefs`，
// 与阅读进度（epubProgress.ts）同一个「用户级寄存器」key 命名空间。所有书共用一份偏好。
// 纯函数部分与 React / Redux 解耦，便于单测。
import { DataType } from "create/types";
import { createUserPreferenceKey } from "database/keys";
import type { EpubFontFamily, EpubFontSize, EpubThemePreference } from "./epubParser";

export const EPUB_READER_PREFERENCE_NAME = "epub_reader_prefs";

export interface EpubReaderPreferences {
  theme: EpubThemePreference;
  fontSize: EpubFontSize;
  fontFamily: EpubFontFamily;
}

export const DEFAULT_EPUB_READER_PREFERENCES: EpubReaderPreferences = {
  theme: "system",
  fontSize: "md",
  fontFamily: "sans",
};

const THEMES: readonly EpubThemePreference[] = ["system", "light", "paper", "dark"];
export const EPUB_FONT_SIZE_STEPS: readonly EpubFontSize[] = ["sm", "md", "lg", "xl"];
const FONT_FAMILIES: readonly EpubFontFamily[] = ["sans", "serif"];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

export const normalizeEpubReaderPreferences = (value: unknown): EpubReaderPreferences => {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    theme: pick(raw.theme, THEMES, DEFAULT_EPUB_READER_PREFERENCES.theme),
    fontSize: pick(raw.fontSize, EPUB_FONT_SIZE_STEPS, DEFAULT_EPUB_READER_PREFERENCES.fontSize),
    fontFamily: pick(raw.fontFamily, FONT_FAMILIES, DEFAULT_EPUB_READER_PREFERENCES.fontFamily),
  };
};

export const buildEpubReaderPreferenceKey = (userId: string): string =>
  createUserPreferenceKey.single(userId, EPUB_READER_PREFERENCE_NAME);

export const buildEpubReaderPreferenceRecord = ({
  userId,
  preferences,
  previousRecord,
  now = Date.now(),
}: {
  userId: string;
  preferences: EpubReaderPreferences;
  previousRecord?: { createdAt?: unknown } | null;
  now?: number;
}) => {
  const previousCreatedAt = Number(previousRecord?.createdAt);
  return {
    type: DataType.SETTING,
    registerType: "user_preference" as const,
    preferenceName: EPUB_READER_PREFERENCE_NAME,
    schemaVersion: 1 as const,
    userId,
    value: normalizeEpubReaderPreferences(preferences),
    createdAt: Number.isFinite(previousCreatedAt) && previousCreatedAt > 0 ? previousCreatedAt : now,
    updatedAt: now,
  };
};

/** 读回记录；缺失 / 形状不对返回默认值（并带回 createdAt 供下次保存沿用）。 */
export const loadEpubReaderPreferences = (
  record: unknown
): { preferences: EpubReaderPreferences; previousRecord: { createdAt: number } | null } => {
  const { value, createdAt } = (record && typeof record === "object" ? record : {}) as {
    value?: unknown;
    createdAt?: unknown;
  };
  const created = Number(createdAt);
  return {
    preferences: normalizeEpubReaderPreferences(value),
    previousRecord: Number.isFinite(created) && created > 0 ? { createdAt: created } : null,
  };
};
