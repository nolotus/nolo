// app/i18n/runtime.web.ts
//
// Web-only slim boundary for `app/i18n/runtime`.
//
// The browser bundle reaches this slim entry through the esbuild alias in
// scripts/dev/esbuild.config.js (`app/i18n/runtime` → this file). The web
// client does not need the statically inlined `ai` / `chat` / `space` locale
// modules that the headless runtime imports: it loads every namespace from
// /public/locales/*.json (clientResources.ts) and initializes through
// `app/i18n/client`, so the inlined copies are pure duplication in the entry
// static closure (≥300 KB).
//
// Contract:
//   - Same i18next singleton and init order as `app/i18n/client` (which the web
//     entry already imports), so import-site behaviour and module identity are
//     unchanged.
//   - No static locale imports; the full-resource contract stays with the JSON
//     locale files generated from app/i18n/i18n.config.
//   - Headless / CLI / RN / server keep resolving the real `app/i18n/runtime`
//     (bun/metro/server do not use this esbuild config).
import i18n from "./client";

export const RUNTIME_SLIM_MARKER = "__noloRuntimeSlimI18n";

export default i18n;
