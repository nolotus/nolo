import type { i18n as I18nInstance } from "i18next";
import { Language, SUPPORTED_LANGUAGES } from "app/i18n/types";

const supportedLanguages = SUPPORTED_LANGUAGES;

export type ClientLocaleScope = "guest" | "full";

type LanguageState = {
  ready?: ClientLocaleScope;
  pending: Partial<Record<ClientLocaleScope, Promise<void>>>;
};
const resourcesByInstance = new WeakMap<I18nInstance, Map<string, LanguageState>>();
const latestSelection = new WeakMap<I18nInstance, object>();

export const normalizeClientLanguage = (rawLanguage?: string) => {
  const language = rawLanguage || Language.EN;
  if (supportedLanguages.has(language)) return language as Language;
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

const fetchLanguageResources = async (language: string, scope: ClientLocaleScope) => {
  const version =
    typeof window !== "undefined"
      ? (window as Window & { __NOLO_ASSETS__?: { timestamp?: string } }).__NOLO_ASSETS__
          ?.timestamp
      : "";
  const versionQuery = version ? `?v=${encodeURIComponent(version)}` : "";
  const suffix = scope === "guest" ? ".guest.json" : ".json";
  const response = await fetch(`/public/locales/${encodeURIComponent(language)}${suffix}${versionQuery}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${language} locale: ${response.status}`);
  }
  const resources = await response.json();
  if (!resources?.common || typeof resources.common !== "object" || Array.isArray(resources.common) ||
      Object.values(resources).some((bundle) => !bundle || typeof bundle !== "object" || Array.isArray(bundle))) {
    throw new Error(`Invalid ${language} ${scope} locale`);
  }
  return resources;
};

/**
 * 加载失败时的回退目标。de/es 按已确认契约回退英文（界面语言与缺失翻译一致，
 * 不整体切中文）；既有语言保留历史 zh-CN 安全网（应用默认语言包恒在，
 * zh-Hant/ja/ko 失败时不至于白屏）。回退目标自身的加载失败会原样抛出，不伪成功。
 */
const fallbackLanguageFor = (language: string): Language =>
  language === Language.DE || language === Language.ES ? Language.EN : Language.ZH_CN;

/** Readiness is scoped to this instance, exact language, and successful installs. */
export function hasClientLanguageResources(
  i18n: I18nInstance, language: string, scope: ClientLocaleScope,
): boolean {
  const ready = resourcesByInstance.get(i18n)?.get(language)?.ready;
  return ready === "full" || ready === scope;
}

/** Load only. Route upgrades must never switch the active language or mark a fallback as ready. */
export async function ensureClientLanguageResources(
  i18n: I18nInstance, language: string, scope: ClientLocaleScope,
): Promise<void> {
  if (hasClientLanguageResources(i18n, language, scope)) return;
  let languages = resourcesByInstance.get(i18n);
  if (!languages) resourcesByInstance.set(i18n, languages = new Map());
  let state = languages.get(language);
  if (!state) languages.set(language, state = { pending: {} });
  const existing = state.pending[scope] ?? state.pending.full;
  if (existing) return existing;

  const entry = state;
  const pending = fetchLanguageResources(language, scope).then((resources) => {
    // A slow guest response must not overwrite an already installed full bundle.
    if (hasClientLanguageResources(i18n, language, scope)) return;
    for (const [namespace, bundle] of Object.entries(resources)) {
      i18n.addResourceBundle(language, namespace, bundle, true, true);
    }
    entry.ready = scope;
  }).finally(() => { delete entry.pending[scope]; });
  entry.pending[scope] = pending;
  return pending;
}

async function resolveClientLanguage(
  i18n: I18nInstance, language: Language, scope: ClientLocaleScope,
): Promise<Language> {
  try {
    await ensureClientLanguageResources(i18n, language, scope);
    return language;
  } catch (error) {
    const fallback = fallbackLanguageFor(language);
    if (language === fallback) throw error;
    console.warn(`[i18n] Falling back to ${fallback} locale`, error);
    await ensureClientLanguageResources(i18n, fallback, scope);
    return fallback;
  }
}

/** Only the latest explicit selection may change language (or persist a preference). */
export async function switchClientLanguage(
  i18n: I18nInstance, rawLanguage: string | undefined, getScope: () => ClientLocaleScope,
): Promise<Language | undefined> {
  const selection = {};
  latestSelection.set(i18n, selection);
  const requested = normalizeClientLanguage(rawLanguage);
  let scope = getScope();
  for (;;) {
    let language: Language;
    try {
      language = await resolveClientLanguage(i18n, requested, scope);
    } catch (error) {
      if (latestSelection.get(i18n) !== selection) return;
      throw error;
    }
    if (latestSelection.get(i18n) !== selection) return;
    scope = getScope();
    if (!hasClientLanguageResources(i18n, language, scope)) continue;
    // The web instance has no backend; changeLanguage applies synchronously once resources exist.
    if (i18n.language !== language) await i18n.changeLanguage(language);
    if (latestSelection.get(i18n) === selection) return language;
    return;
  }
}

/** Startup has no competing selection before the UI mounts. */
export async function loadClientLanguage(
  i18n: I18nInstance, rawLanguage?: string, scope: ClientLocaleScope = "full",
): Promise<Language> {
  const language = await resolveClientLanguage(i18n, normalizeClientLanguage(rawLanguage), scope);
  if (i18n.language !== language) await i18n.changeLanguage(language);
  return language;
}
