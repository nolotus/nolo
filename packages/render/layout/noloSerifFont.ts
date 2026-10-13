/**
 * Single source of truth for the self-hosted "Nolo Serif" heading font files.
 *
 * Consumed by:
 * - scripts/fonts/subset-serif.ts — decides which per-language subsets to emit
 *   and generates noloSerifFont.css from this table;
 * - packages/server/render.tsx — preloads only the current request language's
 *   file on `/` (via resolveNoloSerifPreload).
 *
 * Each language gets its own CSS family name (selected through `:lang()` in
 * noloSerifFont.css). Browsers only download a @font-face whose family is
 * actually used by rendered text, so a zh-CN visitor never fetches the ja file
 * and vice versa — which a single shared family name cannot guarantee.
 */

export type NoloSerifLocale = "latin" | "zh-CN" | "zh-Hant" | "ja" | "ko";

export type NoloSerifFace = {
  /** CSS font-family name used in noloSerifFont.css. */
  family: string;
  /** Public URL of the subset woff2 (must match the preload href exactly). */
  url: string;
  /** Face index inside NotoSerifCJK-VF.ttc (0 JP, 1 KR, 2 SC, 3 TC). */
  ttcFace: number;
  /**
   * App languages whose serif copy is subset into this file (with i18n fallback
   * resolution). "latin" has none: it carries ASCII/punctuation only.
   */
  languages: string[];
  /** Whether SSR should preload this file for these languages on `/`. */
  preload: boolean;
};

const fontUrl = (locale: NoloSerifLocale) => `/public/fonts/nolo-serif-bold.${locale}.woff2`;

export const NOLO_SERIF_FACES: Record<NoloSerifLocale, NoloSerifFace> = {
  // en (and any unknown lang): Latin-only subset. Not preloaded — the English
  // hero paints fine with the fallback serif and swaps in quietly.
  latin: { family: "Nolo Serif Latin", url: fontUrl("latin"), ttcFace: 2, languages: [], preload: false },
  "zh-CN": { family: "Nolo Serif SC", url: fontUrl("zh-CN"), ttcFace: 2, languages: ["zh-CN"], preload: true },
  "zh-Hant": { family: "Nolo Serif TC", url: fontUrl("zh-Hant"), ttcFace: 3, languages: ["zh-Hant"], preload: true },
  ja: { family: "Nolo Serif JP", url: fontUrl("ja"), ttcFace: 0, languages: ["ja"], preload: true },
  ko: { family: "Nolo Serif KR", url: fontUrl("ko"), ttcFace: 1, languages: ["ko"], preload: true },
};

/** Font URL to `<link rel=preload>` for a request language, or null (en/unknown). */
export const resolveNoloSerifPreload = (lang: string): string | null => {
  for (const face of Object.values(NOLO_SERIF_FACES)) {
    if (face.preload && face.languages.includes(lang)) return face.url;
  }
  return null;
};
