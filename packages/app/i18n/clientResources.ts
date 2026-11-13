import type { i18n as I18nInstance } from "i18next";
import { Language, SUPPORTED_LANGUAGES } from "app/i18n/types";

const supportedLanguages = SUPPORTED_LANGUAGES;

const loadedLanguages = new Set<string>();

export const normalizeClientLanguage = (rawLanguage?: string) => {
  const language = rawLanguage || Language.EN;
  if (supportedLanguages.has(language)) return language;
  const lower = language.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.startsWith("zh-mo")) {
    return Language.ZH_HANT;
  }
  if (lower.startsWith("zh")) return Language.ZH_CN;
  if (lower.startsWith("ja")) return Language.JA;
  if (lower.startsWith("ko")) return Language.KO;
  if (lower.startsWith("de")) return Language.DE;
  if (lower.startsWith("es")) return Language.ES;
  return Language.EN;
};

const fetchLanguageResources = async (language: string) => {
  const version =
    typeof window !== "undefined"
      ? (window as Window & { __NOLO_ASSETS__?: { timestamp?: string } }).__NOLO_ASSETS__
          ?.timestamp
      : "";
  const versionQuery = version ? `?v=${encodeURIComponent(version)}` : "";
  const response = await fetch(`/public/locales/${encodeURIComponent(language)}.json${versionQuery}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${language} locale: ${response.status}`);
  }
  return response.json();
};

/**
 * 加载失败时的回退目标。de/es 按已确认契约回退英文（界面语言与缺失翻译一致，
 * 不整体切中文）；既有语言保留历史 zh-CN 安全网（应用默认语言包恒在，
 * zh-Hant/ja/ko 失败时不至于白屏）。回退目标自身的加载失败会原样抛出，不伪成功。
 */
const fallbackLanguageFor = (language: string): Language =>
  language === Language.DE || language === Language.ES ? Language.EN : Language.ZH_CN;

export const loadClientLanguage = async (
  i18n: I18nInstance,
  rawLanguage?: string
) => {
  let language = normalizeClientLanguage(rawLanguage);

  if (!loadedLanguages.has(language)) {
    const resources = await fetchLanguageResources(language).catch(async (error) => {
      const fallback = fallbackLanguageFor(language);
      if (language === fallback) throw error;
      console.warn(`[i18n] Falling back to ${fallback} locale`, error);
      language = fallback;
      return fetchLanguageResources(fallback);
    });
    for (const [namespace, bundle] of Object.entries(resources)) {
      i18n.addResourceBundle(language, namespace, bundle, true, true);
    }
    loadedLanguages.add(language);
  }

  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }

  return language;
};
