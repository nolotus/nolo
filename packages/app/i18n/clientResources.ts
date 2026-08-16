import type { i18n as I18nInstance } from "i18next";
import { Language } from "app/i18n/types";

const supportedLanguages = new Set<string>([
  Language.EN,
  Language.ZH_CN,
  Language.ZH_HANT,
  Language.JA,
]);

const loadedLanguages = new Set<string>();

export const normalizeClientLanguage = (rawLanguage?: string) => {
  const language = rawLanguage || Language.ZH_CN;
  if (supportedLanguages.has(language)) return language;
  const lower = language.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.startsWith("zh-mo")) {
    return Language.ZH_HANT;
  }
  if (lower.startsWith("zh")) return Language.ZH_CN;
  if (lower.startsWith("ja")) return Language.JA;
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

export const loadClientLanguage = async (
  i18n: I18nInstance,
  rawLanguage?: string
) => {
  let language = normalizeClientLanguage(rawLanguage);

  if (!loadedLanguages.has(language)) {
    const resources = await fetchLanguageResources(language).catch(async (error) => {
      if (language === Language.ZH_CN) throw error;
      console.warn("[i18n] Falling back to zh-CN locale", error);
      language = Language.ZH_CN;
      return fetchLanguageResources(Language.ZH_CN);
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
