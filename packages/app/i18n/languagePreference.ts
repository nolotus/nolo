// app/i18n/languagePreference.ts
//
// Persistent UI-language preference shared by the web client and SSR.
//
// The preference is stored twice on switch:
//   - localStorage (`nolo-language`): the client-side source of truth, following
//     the same convention as theme/font prefs (`nolo-theme-name`, …).
//   - a first-party cookie (`nolo_language`): the SSR bridge. localStorage is
//     not visible to the server, so without the cookie SSR would render in the
//     Accept-Language language while the client hydrates in the stored language
//     → hydration mismatch. The cookie lets `resolveRequestLanguage` honour the
//     same choice for the server-rendered HTML.
//
// Only exact supported codes are accepted as stored values; a corrupt/legacy
// value is treated as absent (never pinned to a language the user did not pick).
import { Language, SUPPORTED_LANGUAGES } from "app/i18n/types";

export const LANGUAGE_PREF_KEY = "nolo-language";
export const LANGUAGE_COOKIE_NAME = "nolo_language";
export const LANGUAGE_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export const isSupportedLanguage = (value: unknown): value is Language =>
  typeof value === "string" && SUPPORTED_LANGUAGES.has(value);

type LanguageStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Read the persisted language from a Storage-like object (localStorage).
 * Returns undefined for missing/unsupported values instead of guessing.
 */
export const readStoredLanguage = (
  storage: LanguageStorage | null | undefined,
): Language | undefined => {
  try {
    const raw = storage?.getItem(LANGUAGE_PREF_KEY);
    return isSupportedLanguage(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Persist the chosen language to localStorage and mirror it into the
 * `nolo_language` cookie so SSR renders the same language. Failures are
 * ignored: a full/blocked storage or a non-browser environment must never
 * break the in-session language switch.
 */
export const writeStoredLanguage = (
  language: Language,
  storage?: LanguageStorage | null,
): void => {
  try {
    (storage ?? window.localStorage)?.setItem(LANGUAGE_PREF_KEY, language);
  } catch {
    /* storage full or unavailable */
  }
  try {
    if (typeof document !== "undefined") {
      // Secure 仅在 HTTPS 下加：生产站点强制安全传输；本地 HTTP 预览仍能写 cookie。
      const secureFlag =
        typeof window !== "undefined" && window.location.protocol === "https:"
          ? "; Secure"
          : "";
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(
        language,
      )}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secureFlag}`;
    }
  } catch {
    /* cookie unavailable */
  }
};

/**
 * Parse the `nolo_language` cookie out of a raw Cookie request header.
 * Returns undefined when absent or unsupported (never throws on bad encoding).
 */
export const readLanguageCookie = (
  cookieHeader: string | null | undefined,
): Language | undefined => {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== LANGUAGE_COOKIE_NAME) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      const decoded = decodeURIComponent(raw);
      return isSupportedLanguage(decoded) ? decoded : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};
