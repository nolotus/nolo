// app/i18n/runtime.ts
//
// Slim i18n entry for agent/runtime code shared with headless hosts (CLI/TUI,
// server agent loop): tool schema translation, compression notices, etc.
//
// It only bootstraps the `ai` / `chat` / `space` namespaces. The full
// `app/i18n` entry also loads the whole web UI `common` bundle (pricing, legal
// pages, admin, landing…) plus react-i18next, which costs ~20 MB RSS in the
// TUI process while no headless caller reads it.
//
// Compatibility contract (order-independent):
//   - Already initialized by `app/i18n` (RN/server) or `app/i18n/client` (web)
//     → no-op; behaviour identical to importing those entries directly.
//   - Initialized here first → `app/i18n` (if imported later) detects
//     RUNTIME_SLIM_MARKER and tops up the full resources, so callers of the
//     full entry still see every namespace.
import i18n, { type Resource, type ResourceLanguage } from "i18next";
import { Language } from "app/i18n/types";
import { i18nBaseConfig } from "./i18n.base";
import aiLocale from "ai/ai.locale";
import chatLocale from "chat/chat.locale";
import spaceLocale from "create/space/space.locale";

export const RUNTIME_SLIM_MARKER = "__noloRuntimeSlimI18n";

type LocaleModule = Partial<Record<Language, { translation: ResourceLanguage[string] }>>;

function pick(locale: LocaleModule, lng: Language) {
  // Same KO→EN fallback as i18n.config.ts.
  return (locale[lng] ?? locale[Language.EN])!.translation;
}

if (!i18n.isInitialized) {
  const resources: Resource = {};
  for (const lng of Object.values(Language)) {
    resources[lng] = {
      common: {},
      ai: pick(aiLocale as LocaleModule, lng),
      chat: pick(chatLocale as LocaleModule, lng),
      space: pick(spaceLocale as LocaleModule, lng),
    };
  }
  i18n.init({
    ...i18nBaseConfig,
    resources,
    lng: Language.ZH_CN,
    fallbackLng: Language.ZH_CN,
    compatibilityJSON: "v3",
  });
  (i18n as unknown as Record<string, unknown>)[RUNTIME_SLIM_MARKER] = true;
}

export default i18n;
