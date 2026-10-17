import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export const FONT_PRESET_VALUES = [
  "system",
  "hei",
  "song",
  "kai",
  "fang-song",
] as const;

export type FontPreset = (typeof FONT_PRESET_VALUES)[number];

export const DEFAULT_FONT_PRESET: FontPreset = "hei";
export const FONT_PRESET_STORAGE_KEY = "nolo-font-preset";

export const FONT_PRESET_ALIASES: Record<string, FontPreset> = {
  system: "system",
  default: "system",
  hei: "hei",
  heiti: "hei",
  sans: "hei",
  song: "song",
  songti: "song",
  serif: "song",
  kai: "kai",
  kaiti: "kai",
  "kai-ti": "kai",
  "fang-song": "fang-song",
  fangsong: "fang-song",
  "fang song": "fang-song",
};

export const normalizeFontPreset = (value: unknown): FontPreset | undefined => {
  const normalized = asTrimmedLowercaseString(value);
  if (!Object.hasOwn(FONT_PRESET_ALIASES, normalized)) return undefined;
  return FONT_PRESET_ALIASES[normalized];
};

/**
 * Root-level (documentElement) CSS variables that the first-paint bootstrap writes
 * inline. The runtime controller must clear exactly these keys before its own
 * `:root` stylesheet can take over (inline style beats any stylesheet rule).
 */
export const FONT_ROOT_VARIABLES = [
  { name: "--font-ui", key: "ui" },
  { name: "--font-sans-zh", key: "sans-zh" },
  { name: "--font-sans-en", key: "sans-en" },
  { name: "--font-sans-ja", key: "sans-ja" },
  { name: "--font-sans-ko", key: "sans-ko" },
] as const;

/** `--font-ui:var(--font-ui-song); …` declarations for the given preset (alias-safe). */
export const buildRootFontCss = (preset: unknown): string => {
  const resolved = normalizeFontPreset(preset) ?? DEFAULT_FONT_PRESET;
  const variables = FONT_PRESET_CSS_VARIABLES[resolved];
  return FONT_ROOT_VARIABLES.map(
    ({ name, key }) => `${name}:${variables[key]};`
  ).join(" ");
};

/** Removes only the bootstrap-injected font variables, keeping unrelated inline styles. */
export const clearInlineFontVariables = (element: {
  style: { removeProperty(name: string): unknown };
}): void => {
  for (const { name } of FONT_ROOT_VARIABLES) {
    element.style.removeProperty(name);
  }
};

export const FONT_PRESET_CSS_VARIABLES: Record<
  FontPreset,
  Record<string, string>
> = {
  system: {
    ui: "var(--font-ui-system)",
    "sans-zh": "var(--font-sans-zh-system)",
    "sans-en": "var(--font-sans-en-system)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)",
  },
  hei: {
    ui: "var(--font-ui-hei)",
    "sans-zh": "var(--font-sans-zh-hei)",
    "sans-en": "var(--font-sans-en-hei)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)",
  },
  song: {
    ui: "var(--font-ui-song)",
    "sans-zh": "var(--font-sans-zh-song)",
    "sans-en": "var(--font-sans-en-song)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)",
  },
  kai: {
    ui: "var(--font-ui-kai)",
    "sans-zh": "var(--font-sans-zh-kai)",
    "sans-en": "var(--font-sans-en-kai)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)",
  },
  "fang-song": {
    ui: "var(--font-ui-fang-song)",
    "sans-zh": "var(--font-sans-zh-fang-song)",
    "sans-en": "var(--font-sans-en-fang-song)",
    "sans-ja": "var(--font-sans-ja-system)",
    "sans-ko": "var(--font-sans-ko-system)",
  },
};

