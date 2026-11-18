// app/i18n/requestLanguage.ts
//
// Language-tag primitives shared by the SSR server (`packages/server/render.tsx`)
// and the desktop embedded server (`packages/desktop-runtime/entry.ts`).
//
// Only the *mapping and parsing* live here. Each caller owns its own precedence
// order, because the sources differ:
//   - Web SSR:        ?lang= > nolo_language cookie > Accept-Language > en
//   - Desktop shell:  ?lang= > nolo_language cookie > system locale > Accept-Language > en
// The desktop shell ranks the machine locale above Accept-Language on purpose:
// its embedded CEF reports a default `accept_languages` of "en-US,en" that does
// not follow the OS locale, so Accept-Language carries no user intent there.
import { Language } from "app/i18n/types";

/** Map a single BCP-47-ish tag onto a supported UI language (null = unsupported). */
export const matchLanguageTag = (rawTag: string): Language | null => {
  const tag = rawTag.toLowerCase().trim();
  if (!tag || tag === "*") return null;

  if (
    tag.startsWith("zh-tw") ||
    tag.startsWith("zh-hk") ||
    tag.startsWith("zh-mo") ||
    tag.startsWith("zh-hant")
  ) {
    return Language.ZH_HANT;
  }
  if (tag.startsWith("zh")) {
    return Language.ZH_CN;
  }
  if (tag === "ja" || tag.startsWith("ja-")) {
    return Language.JA;
  }
  if (tag === "ko" || tag.startsWith("ko-")) {
    return Language.KO;
  }
  if (tag === "de" || tag.startsWith("de-")) {
    return Language.DE;
  }
  if (tag === "es" || tag.startsWith("es-")) {
    return Language.ES;
  }
  if (tag === "en" || tag.startsWith("en-")) {
    return Language.EN;
  }
  return null;
};

/** Pick the highest-q supported language out of an Accept-Language header. */
export const parseAcceptLanguage = (header: string): Language | null => {
  if (!header || !header.trim()) return null;

  const parts = header.split(",");
  const candidates: { lang: Language; q: number; order: number }[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const segments = part.split(";");
    const tag = segments[0].trim();
    if (!tag || tag === "*") continue;

    let q = 1.0;
    for (let j = 1; j < segments.length; j++) {
      const param = segments[j].trim();
      const eqIdx = param.indexOf("=");
      if (eqIdx !== -1 && param.slice(0, eqIdx).trim().toLowerCase() === "q") {
        const parsedQ = parseFloat(param.slice(eqIdx + 1).trim());
        q = isNaN(parsedQ) ? 0 : parsedQ;
        break;
      }
    }

    if (q <= 0) continue;

    const matchedLang = matchLanguageTag(tag);
    if (matchedLang) {
      candidates.push({ lang: matchedLang, q, order: i });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.q - a.q || a.order - b.order);
  return candidates[0].lang;
};

// POSIX locale variables we read. Typed as a string map so `process.env`
// (ProcessEnv) satisfies it without a cast; only these four keys are used.
type LocaleEnv = Readonly<Record<string, string | undefined>>;

export type { LocaleEnv };

const normalizeLocaleTag = (raw: string): string => {
  // POSIX locale strings carry modifiers we must strip before matching:
  // "zh_CN.UTF-8" → "zh-CN", "de_DE.UTF-8@euro" → "de-DE".
  const withoutEncoding = raw.split("@")[0].split(".")[0];
  return withoutEncoding.replace(/_/g, "-").trim();
};

/**
 * Resolve the machine's UI language from POSIX locale environment variables.
 *
 * `LANGUAGE` comes first, then LC_ALL > LC_MESSAGES > LANG. That mirrors gettext
 * and Chromium's Linux locale resolution: `LANGUAGE` is the explicit
 * "message-language" override (a colon-separated priority list), while the
 * LC_* / LANG chain is the ambient locale — so a user who sets
 * `LANG=zh_CN.UTF-8` plus `LANGUAGE=en_US:en` gets English, not Chinese.
 *
 * C/POSIX mean "unset" (not a language), which keeps LANG=C machines falling
 * through to the caller's next source instead of pinning them to English.
 */
export const resolveSystemLocaleLanguage = (
  env: LocaleEnv = process.env
): Language | null => {
  const fromLanguage = (env.LANGUAGE ?? "").trim();
  if (fromLanguage) {
    for (const candidate of fromLanguage.split(":")) {
      const matched = matchLanguageTag(normalizeLocaleTag(candidate));
      if (matched) return matched;
    }
  }
  for (const raw of [env.LC_ALL, env.LC_MESSAGES, env.LANG]) {
    const value = (raw ?? "").trim();
    if (!value) continue;
    const normalized = normalizeLocaleTag(value);
    if (!normalized || normalized.toLowerCase() === "c" || normalized.toLowerCase() === "posix") {
      continue;
    }
    const matched = matchLanguageTag(normalized);
    if (matched) return matched;
  }
  return null;
};
