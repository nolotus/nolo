export enum Language {
  EN = "en",
  ZH_CN = "zh-CN",
  ZH_HANT = "zh-Hant",
  JA = "ja",
  KO = "ko",
  DE = "de",
  ES = "es",
}

/** All UI languages the web client / SSR can serve (enum values are the codes). */
export const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(
  Object.values(Language),
);
