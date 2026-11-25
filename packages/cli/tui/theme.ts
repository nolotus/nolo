import { resolveCliColorEnabled } from "../client/terminalStyles";
import {
  boxGlyphs,
  displayWidth,
  resolveAmbiguousWidth,
  resolveBoxCharset,
  type TuiBoxCharset,
  visibleWidth,
} from "./tuiAnsi";

/**
 * TUI color tokens mirroring the app theme system.
 *
 * Source of truth: packages/app/theme/colors.ts (trail, the default
 * theme). The published nolo-cli package cannot import packages/app, so the
 * hex values are mirrored here — keep them in sync when the default theme
 * changes. Terminals without truecolor fall back to the nearest ANSI-16 code.
 *
 * Intentional divergence: a few trail tokens (light chrome/muted/warning, dark
 * muted) are tuned darker/dimmer than the app values they mirror. The app uses
 * those hexes for placeholder-grade text; the TUI uses the same tokens for
 * rules, tool labels and secondary body text, which need more contrast than a
 * placeholder. Light chrome/muted were nudged one more step (2026-07-27) after
 * owner feedback that trail light was comfortable but a touch washed out.
 * Light warning was deepened further (B57F2E → 9A6A1F, 2026-07-29) after owner
 * feedback that H2 headers (## Plan) looked yellow and floated off the white
 * background; muted was nudged denser (687584 → 5E6A78) so inline code in dense
 * prose stopped reading as a wash of saturated blue.
 */

/** Brightness of the terminal background — drives light/dark token selection. */
export type TuiBrightness = "light" | "dark";

/**
 * How TUI colors are resolved.
 *
 * `terminal` deliberately uses only the terminal's default background and
 * ANSI indexed foreground colors. This lets terminals such as Ghostty update
 * already-painted cells when their own light/dark theme changes. Fixed light
 * and dark modes retain Nolo's truecolor palettes and tinted surfaces.
 */
export type TuiThemeMode = "terminal" | TuiBrightness;

export type TuiThemeToken =
  | "accent"
  | "chrome"
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "muted";

type PaletteEntry = { hex: string; ansiFallback: string };

/**
 * Light = Trail Light, Dark = Trail Dark (see colors.ts).
 * ANSI-16 fallbacks are chosen so the hue family stays close across terminals.
 */
export type TuiThemeColors = Record<TuiThemeToken, PaletteEntry>;

export const THEME_PALETTES: Record<string, Record<TuiBrightness, TuiThemeColors>> = {
  nature: {
    light: {
      accent: { hex: "1A5FA4", ansiFallback: "\x1b[34m" }, // deep ocean ink (--hl-blue-text, 6.53:1 on #FFFFFF)
      chrome: { hex: "78828E", ansiFallback: "\x1b[90m" }, // mist slate (3.90:1 on #FFFFFF — structural rules/comments recede cleanly)
      success: { hex: "267347", ansiFallback: "\x1b[32m" }, // pine forest green (5.61:1 on #FFFFFF)
      warning: { hex: "966014", ansiFallback: "\x1b[33m" }, // warm sand amber (5.38:1 on #FFFFFF, never muddy yellow)
      info: { hex: "1B6F8A", ansiFallback: "\x1b[36m" }, // fjord cyan-blue (5.77:1 on #FFFFFF, distinct from accent)
      danger: { hex: "BE3428", ansiFallback: "\x1b[31m" }, // terracotta red (5.68:1 on #FFFFFF)
      muted: { hex: "525D6B", ansiFallback: "\x1b[90m" }, // mountain granite (6.73:1 on #FFFFFF — crisp secondary copy)
    },
    dark: {
      accent: { hex: "6AA8EA", ansiFallback: "\x1b[94m" }, // moonlight ocean (--hl-blue dark, 6.89:1 on #1C1C1F)
      chrome: { hex: "6E7683", ansiFallback: "\x1b[90m" }, // night stone (3.69:1 on #1C1C1F — clear rules/comments below muted)
      success: { hex: "72C488", ansiFallback: "\x1b[32m" }, // alpine meadow green (8.22:1 on #1C1C1F)
      warning: { hex: "DDA955", ansiFallback: "\x1b[33m" }, // sunset sand gold (7.98:1 on #1C1C1F)
      info: { hex: "5EB5C8", ansiFallback: "\x1b[36m" }, // glacier stream cyan (7.36:1 on #1C1C1F)
      danger: { hex: "E6766B", ansiFallback: "\x1b[31m" }, // warm coral clay (5.86:1 on #1C1C1F)
      muted: { hex: "9AA3B0", ansiFallback: "\x1b[90m" }, // silver mist (6.67:1 on #1C1C1F — legible status & tool details)
    },
  },
  trail: {
    light: {
      accent: { hex: "2E7DB5", ansiFallback: "\x1b[34m" }, // ocean blue
      chrome: { hex: "768594", ansiFallback: "\x1b[90m" }, // slate — two steps below app placeholder A3B0BD (was 8A97A5); rules/tool markers on white need the extra notch
      success: { hex: "3F8F5C", ansiFallback: "\x1b[32m" }, // moss green
      warning: { hex: "9A6A1F", ansiFallback: "\x1b[33m" }, // deeper amber — B57F2E still read as yellow/washed on white (H2 headers like ## Plan floated); 9A6A1F raises contrast
      info: { hex: "2376A6", ansiFallback: "\x1b[36m" }, // deepened sky blue (5.05:1 on white; 4A9FD4 was only 3.0:1)
      danger: { hex: "C45C4A", ansiFallback: "\x1b[31m" }, // reddish
      muted: { hex: "5E6A78", ansiFallback: "\x1b[90m" }, // denser slate — 687584 read too blue in dense prose (inline code/tool labels); 5E6A78 pulls blue down while staying darker than the old value
    },
    dark: {
      accent: { hex: "5BA3D9", ansiFallback: "\x1b[94m" }, // trail dark primary (was wrongly copied from catppuccin 89B4FA)
      chrome: { hex: "747E91", ansiFallback: "\x1b[90m" },
      success: { hex: "5CB87A", ansiFallback: "\x1b[32m" }, // trail dark success (was A6E3A1)
      warning: { hex: "E6B35C", ansiFallback: "\x1b[33m" }, // trail dark warning (was F9E2AF)
      info: { hex: "6BB8E8", ansiFallback: "\x1b[36m" }, // trail dark info (was 94E2D5)
      danger: { hex: "E07060", ansiFallback: "\x1b[31m" }, // trail dark error (was F38BA8)
      muted: { hex: "9AA3B8", ansiFallback: "\x1b[90m" }, // dimmed from A6ADC8 so secondary text sits a step below body text
    },
  },
  catppuccin: {
    light: {
      accent: { hex: "0969DA", ansiFallback: "\x1b[34m" },
      chrome: { hex: "77808B", ansiFallback: "\x1b[90m" }, // lighter than muted so structural chrome recedes below secondary text
      success: { hex: "116329", ansiFallback: "\x1b[32m" },
      warning: { hex: "9A6700", ansiFallback: "\x1b[33m" },
      info: { hex: "0E7490", ansiFallback: "\x1b[36m" }, // distinct cyan-teal rather than duplicating accent
      danger: { hex: "CF222E", ansiFallback: "\x1b[31m" },
      muted: { hex: "57606A", ansiFallback: "\x1b[90m" },
    },
    dark: {
      accent: { hex: "89B4FA", ansiFallback: "\x1b[94m" }, // Catppuccin Mocha Blue
      chrome: { hex: "7F849C", ansiFallback: "\x1b[90m" },
      success: { hex: "A6E3A1", ansiFallback: "\x1b[32m" },
      warning: { hex: "F9E2AF", ansiFallback: "\x1b[33m" },
      info: { hex: "89B4FA", ansiFallback: "\x1b[36m" },
      danger: { hex: "F38BA8", ansiFallback: "\x1b[31m" },
      muted: { hex: "A6ADC8", ansiFallback: "\x1b[90m" },
    },
  },
  wave: {
    light: {
      accent: { hex: "4D699B", ansiFallback: "\x1b[34m" }, // ink blue
      chrome: { hex: "9E9B8E", ansiFallback: "\x1b[90m" },
      success: { hex: "6F894E", ansiFallback: "\x1b[32m" },
      warning: { hex: "836F4A", ansiFallback: "\x1b[33m" },
      info: { hex: "4D699B", ansiFallback: "\x1b[36m" },
      danger: { hex: "C84053", ansiFallback: "\x1b[31m" },
      muted: { hex: "716E61", ansiFallback: "\x1b[90m" },
    },
    dark: {
      accent: { hex: "7E9CD8", ansiFallback: "\x1b[94m" }, // crystalBlue
      chrome: { hex: "727169", ansiFallback: "\x1b[90m" },
      success: { hex: "98BB6C", ansiFallback: "\x1b[32m" },
      warning: { hex: "E6C384", ansiFallback: "\x1b[33m" },
      info: { hex: "7FB4CA", ansiFallback: "\x1b[36m" },
      danger: { hex: "E82424", ansiFallback: "\x1b[31m" },
      muted: { hex: "938AA9", ansiFallback: "\x1b[90m" },
    },
  },
  iris: {
    light: {
      accent: { hex: "5E6AD2", ansiFallback: "\x1b[34m" },
      chrome: { hex: "9E9AB5", ansiFallback: "\x1b[90m" },
      success: { hex: "16A34A", ansiFallback: "\x1b[32m" },
      warning: { hex: "D97706", ansiFallback: "\x1b[33m" },
      info: { hex: "5E6AD2", ansiFallback: "\x1b[36m" },
      danger: { hex: "E5484D", ansiFallback: "\x1b[31m" },
      muted: { hex: "6E6A8A", ansiFallback: "\x1b[90m" },
    },
    dark: {
      accent: { hex: "8B9CF4", ansiFallback: "\x1b[94m" },
      chrome: { hex: "5A5772", ansiFallback: "\x1b[90m" },
      success: { hex: "26BD6C", ansiFallback: "\x1b[32m" },
      warning: { hex: "F5A623", ansiFallback: "\x1b[33m" },
      info: { hex: "8B9CF4", ansiFallback: "\x1b[36m" },
      danger: { hex: "EC5B6E", ansiFallback: "\x1b[31m" },
      muted: { hex: "938AA9", ansiFallback: "\x1b[90m" },
    },
  },
  rose: {
    light: {
      accent: { hex: "D14D72", ansiFallback: "\x1b[35m" },
      chrome: { hex: "9893A5", ansiFallback: "\x1b[90m" },
      success: { hex: "56949F", ansiFallback: "\x1b[32m" },
      warning: { hex: "EA9D34", ansiFallback: "\x1b[33m" },
      info: { hex: "286983", ansiFallback: "\x1b[36m" },
      danger: { hex: "B4637A", ansiFallback: "\x1b[31m" },
      muted: { hex: "797593", ansiFallback: "\x1b[90m" },
    },
    dark: {
      accent: { hex: "EB6F92", ansiFallback: "\x1b[95m" },
      chrome: { hex: "6E6A86", ansiFallback: "\x1b[90m" },
      success: { hex: "9CCFD8", ansiFallback: "\x1b[32m" },
      warning: { hex: "F6C177", ansiFallback: "\x1b[33m" },
      info: { hex: "C4A7E7", ansiFallback: "\x1b[36m" },
      danger: { hex: "EB6F92", ansiFallback: "\x1b[31m" },
      muted: { hex: "908CAA", ansiFallback: "\x1b[90m" },
    },
  },
  mono: {
    light: {
      accent: { hex: "FF9500", ansiFallback: "\x1b[33m" },
      chrome: { hex: "9DA6AF", ansiFallback: "\x1b[90m" },
      success: { hex: "16A34A", ansiFallback: "\x1b[32m" },
      warning: { hex: "D97706", ansiFallback: "\x1b[33m" },
      info: { hex: "2563EB", ansiFallback: "\x1b[34m" },
      danger: { hex: "DC2626", ansiFallback: "\x1b[31m" },
      muted: { hex: "7B8793", ansiFallback: "\x1b[90m" },
    },
    dark: {
      accent: { hex: "FFBF66", ansiFallback: "\x1b[33m" },
      chrome: { hex: "7B8793", ansiFallback: "\x1b[90m" },
      success: { hex: "4DE800", ansiFallback: "\x1b[32m" },
      warning: { hex: "FCD34D", ansiFallback: "\x1b[33m" },
      info: { hex: "60A5FA", ansiFallback: "\x1b[34m" },
      danger: { hex: "F87171", ansiFallback: "\x1b[31m" },
      muted: { hex: "C1C7CD", ansiFallback: "\x1b[90m" },
    },
  },
};

let activeThemeName = "nature";

export function getActiveThemeName(): string {
  return activeThemeName;
}

export function setActiveThemeName(name: string): boolean {
  if (THEME_PALETTES[name]) {
    activeThemeName = name;
    return true;
  }
  return false;
}

/** User choice. Terminal-native rendering is the default. */
let activeThemeMode: TuiThemeMode = "terminal";

/** Last resolved/probed brightness, separate from the user's mode choice. */
let resolvedBrightness: TuiBrightness | null = null;

/**
 * True only when the user explicitly chose terminal-native rendering (env
 * `NOLO_TUI_THEME=terminal` or `/theme terminal` in-session) rather than the
 * process default. An explicit choice keeps the documented ANSI-indexed
 * contract so the terminal can re-theme already-painted cells; the default
 * (no explicit choice) gets canvas-adaptive truecolor once a canvas is known.
 */
let terminalModeExplicit = false;

export function getActiveThemeMode(): TuiThemeMode {
  return activeThemeMode;
}

export function setActiveThemeMode(
  mode: TuiThemeMode,
  options?: { explicit?: boolean },
) {
  activeThemeMode = mode;
  if (mode === "terminal") {
    resolvedBrightness = null;
    trustedCanvasBrightness = null;
    // Only a user-facing choice (`/theme terminal|auto`, or the env var, which
    // is resolved by shouldUseTruecolorTokens) counts as explicit. Startup also
    // calls this setter with the resolved mode, so inferring "explicit" from the
    // call itself would silently disable canvas-adaptive colors in production.
    terminalModeExplicit = options?.explicit === true;
  } else {
    terminalModeExplicit = false;
  }
}

export function getActiveBrightness(): TuiBrightness | null {
  return activeThemeMode === "terminal" ? null : activeThemeMode;
}

/**
 * Back-compatible mode setter: null means terminal-native mode.
 *
 * `options.explicit` must be set by user-facing call sites (`/theme terminal`,
 * `/theme auto`); startup and lifecycle resets leave it off so the default
 * terminal mode keeps canvas-adaptive truecolor.
 */
export function setActiveBrightness(
  brightness: TuiBrightness | null,
  options?: { explicit?: boolean },
) {
  setActiveThemeMode(brightness ?? "terminal", options);
}

const TRUECOLOR_TERM_PROGRAMS = new Set([
  "iterm.app",
  "wezterm",
  "ghostty",
  "vscode",
  "hyper",
  "tabby",
  "rio",
  "warpterminal",
  "ptyxis",
]);

/**
 * Truecolor support detection.
 *
 * COLORTERM is the canonical signal but a lot of terminals don't set it
 * (tmux, some SSH setups, VS Code's integrated terminal), which silently
 * dropped every background-tinted surface in the TUI. TERM_PROGRAM is the
 * reliable second signal. Apple_Terminal is deliberately excluded: it is a
 * 256-color terminal and would approximate 24-bit SGR into the wrong hue.
 */
export function supportsTruecolor(env: Record<string, string | undefined> = process.env) {
  const explicit = (env.NOLO_TUI_TRUECOLOR ?? "").trim().toLowerCase();
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  // Windows Terminal identifies sessions without requiring COLORTERM.
  if ((env.WT_SESSION ?? "").trim()) return true;
  if ((env.PTYXIS_VERSION ?? "").trim()) return true;
  const vteVersion = Number.parseInt((env.VTE_VERSION ?? "").trim(), 10);
  if (Number.isFinite(vteVersion) && vteVersion >= 3600) return true;
  if (/truecolor|24bit/i.test(env.COLORTERM ?? "")) return true;
  if (/direct|24bit/i.test(env.TERM ?? "")) return true;
  const program = (env.TERM_PROGRAM ?? "").toLowerCase();
  return TRUECOLOR_TERM_PROGRAMS.has(program);
}

/**
 * Detect system dark/light mode preference strictly from environment variables.
 * Pure logic — 0 subprocesses, safe for rendering hot paths and non-Node environments.
 */
export function detectSystemBrightnessFromEnv(
  env: Record<string, string | undefined> = process.env,
): TuiBrightness | null {
  const appleStyle = (env.AppleInterfaceStyle ?? "").trim().toLowerCase();
  if (appleStyle === "dark") return "dark";

  const colorScheme = (
    env.COLOR_SCHEME ??
    env.COLORSCHEME ??
    env.SYSTEM_COLOR_SCHEME ??
    ""
  )
    .trim()
    .toLowerCase();
  if (/(?:^|[\s\-_:])dark(?:$|[\s\-_:])/i.test(colorScheme)) return "dark";
  if (/(?:^|[\s\-_:])light(?:$|[\s\-_:])/i.test(colorScheme)) return "light";

  const gtkTheme = (env.GTK_THEME ?? env.QT_STYLE_OVERRIDE ?? "")
    .trim()
    .toLowerCase();
  if (/(?:^|[\s\-_:])dark(?:$|[\s\-_:])/i.test(gtkTheme)) return "dark";
  if (/(?:^|[\s\-_:])light(?:$|[\s\-_:])/i.test(gtkTheme)) return "light";

  return null;
}

/**
 * Resolve the terminal background brightness.
 *
 * Strategy (first match wins):
 * 1. NOLO_TUI_THEME explicit override ("light" | "dark").
 * 2. Active brightness set by /theme light|dark or startup OSC 11 probe.
 * 3. COLORFGBG convention ("0;15" = light bg "15;0" = dark bg).
 * 4. System dark/light mode preference (macOS / Linux env signals).
 * 5. Default to "dark" — the most common developer terminal setting.
 */
export function resolveTuiBrightness(env: Record<string, string | undefined> = process.env): TuiBrightness {
  // Palette callers keep the "dark" default — it is the most common developer
  // terminal setting and either palette stays readable on the rare ambiguous
  // middle-ground background.
  return resolveTuiBrightnessSignal(env) ?? "dark";
}

/**
 * Same resolution chain as resolveTuiBrightness, but returns null when no
 * source in the chain has said anything (terminal-native mode, no probe
 * result, no COLORFGBG, no system signal). Use this for day/night *symbols*
 * (the welcome scene's sun/moon): with no real signal they should stay
 * neutral rather than pretend it is night. Palette decisions should use
 * resolveTuiBrightness, which falls back to "dark".
 */
export function resolveTuiBrightnessSignal(env: Record<string, string | undefined> = process.env): TuiBrightness | null {
  const explicit = (env.NOLO_TUI_THEME ?? "").trim().toLowerCase();
  if (explicit === "light") return "light";
  if (explicit === "dark") return "dark";

  if (activeThemeMode !== "terminal") return activeThemeMode;
  if (resolvedBrightness) return resolvedBrightness;

  const colorFgBgBrightness = detectColorFgBgBrightness(env);
  if (colorFgBgBrightness) return colorFgBgBrightness;

  return detectSystemBrightnessFromEnv(env);
}

function detectColorFgBgBrightness(
  env: Record<string, string | undefined>,
): TuiBrightness | null {
  const parts = (env.COLORFGBG ?? "").split(";");
  // COLORFGBG format is "fg;bg" — the final field is the background in
  // terminals that include extra attributes. 0–6 = dark, 7–15 = light.
  const bg = Number.parseInt(parts.at(-1) ?? "", 10);
  if (Number.isNaN(bg)) return null;
  if (bg >= 0 && bg <= 6) return "dark";
  if (bg >= 7 && bg <= 15) return "light";
  return null;
}

/** Resolve an env override first, then the process-wide user mode. */
export function resolveTuiThemeMode(
  env: Record<string, string | undefined> = process.env,
  fallback: TuiThemeMode = activeThemeMode,
): TuiThemeMode {
  const explicit = (env.NOLO_TUI_THEME ?? "").trim().toLowerCase();
  if (explicit === "light" || explicit === "dark") return explicit;
  if (explicit === "terminal" || explicit === "auto") return "terminal";
  return fallback;
}

function hexToSgrParams(hex: string): string {
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `38;2;${r};${g};${b}`;
}

function hexToSgr(hex: string): string {
  return `\x1b[${hexToSgrParams(hex)}m`;
}

/** WCAG 2.1 sRGB relative luminance in [0, 1]. */
export function relativeLuminanceFromHex(hex: string): number | null {
  const channels = readHexChannels(hex.replace(/^#/, "").toUpperCase());
  if (!channels) return null;
  const linearize = (byte: number) => {
    const s = byte / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(channels[0]) +
    0.7152 * linearize(channels[1]) +
    0.0722 * linearize(channels[2])
  );
}

/** WCAG 2.1 contrast ratio in [1, 21], or null for malformed hex. */
export function wcagContrastRatio(fgHex: string, bgHex: string): number | null {
  const l1 = relativeLuminanceFromHex(fgHex);
  const l2 = relativeLuminanceFromHex(bgHex);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Poles the adaptor may blend toward. The hue-neutral pair is preferred; the
 * pure extremes are the fallback when only they can reach the target contrast
 * (mid-gray canvases where #0A0C10 tops out at ~4.4:1 but #000000 reaches 4.69:1).
 */
const POLE_LIGHT_NEUTRAL = "F7F9FC";
const POLE_DARK_NEUTRAL = "0A0C10";
const POLE_LIGHT_EXTREME = "FFFFFF";
const POLE_DARK_EXTREME = "000000";

function solveBlendForContrast(
  sourceHex: string,
  anchorHex: string,
  canvasHex: string,
  targetRatio: number,
): string {  let lo = 0;
  let hi = 1;
  let best = sourceHex;
  let bestErr = Math.abs((wcagContrastRatio(sourceHex, canvasHex) ?? targetRatio) - targetRatio);
  for (let step = 0; step < 16; step++) {
    const mid = (lo + hi) / 2;
    const candidate = blendHex(anchorHex, sourceHex, mid);
    const ratio = wcagContrastRatio(candidate, canvasHex) ?? targetRatio;
    const err = Math.abs(ratio - targetRatio);
    if (err < bestErr) {
      bestErr = err;
      best = candidate;
    }
    const anchorRatio = wcagContrastRatio(anchorHex, canvasHex) ?? targetRatio;
    const sourceRatio = wcagContrastRatio(sourceHex, canvasHex) ?? targetRatio;
    const increasing = anchorRatio >= sourceRatio;
    if ((increasing && ratio < targetRatio) || (!increasing && ratio > targetRatio)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

/**
 * Keep foreground tokens inside a readable contrast band on arbitrary real
 * terminal canvases (Solarized #002B36/#FDF6E3, Tokyo Night #1A1B26/#E1E2E7,
 * pure black #000000, GNOME #1C1C1F/#FFFFFF). Standard canvases already sit
 * inside the band and pass through unchanged.
 */
export function adaptTokenHexToCanvas(
  rawHex: string,
  tokenKey: TuiThemeToken,
  canvasHex: string,
): string {
  const normRaw = rawHex.replace(/^#/, "").toUpperCase();
  const normCanvas = canvasHex.replace(/^#/, "").toUpperCase();
  const canvasLum = relativeLuminanceFromHex(normCanvas);
  const ratio = wcagContrastRatio(normRaw, normCanvas);
  if (canvasLum === null || ratio === null) return normRaw;

  if (tokenKey === "chrome") {
    if (ratio < 3.25) return pushToContrast(normRaw, normCanvas, 3.7, 3.3);
    if (ratio > 4.45) return solveBlendForContrast(normRaw, normCanvas, normCanvas, 3.85);
    return normRaw;
  }
  if (tokenKey === "muted") {
    // No floor degradation: secondary text wants the highest contrast the
    // canvas allows, and it is a single token (nothing can collapse into it).
    if (ratio < 5.2) return pushToContrast(normRaw, normCanvas, 6.1, 6.1);
    if (ratio > 8.2) return solveBlendForContrast(normRaw, normCanvas, normCanvas, 6.6);
    return normRaw;
  }
  if (ratio < 4.5) {
    // Targets sit above their thresholds: solving at exactly 4.5 then rounding
    // to 8-bit channels can land at 4.49.
    return pushToContrast(normRaw, normCanvas, 4.85, 4.55);
  }
  return normRaw;
}

/**
 * Poles ordered by the contrast each one can actually reach on this canvas,
 * highest first. Hue-neutral poles come first *within the same direction* so
 * standard canvases never get harsher pure black/white than needed; the pure
 * extremes only win when they alone reach further (mid-gray canvases).
 */
function polesByReach(canvasHex: string): string[] {
  const ranked = [
    POLE_LIGHT_NEUTRAL,
    POLE_DARK_NEUTRAL,
    POLE_LIGHT_EXTREME,
    POLE_DARK_EXTREME,
  ].map((pole) => ({ pole, reach: wcagContrastRatio(pole, canvasHex) ?? 1 }));
  const neutralFirst = (pole: string) =>
    pole === POLE_LIGHT_NEUTRAL || pole === POLE_DARK_NEUTRAL ? 0 : 1;
  ranked.sort((a, b) =>
    a.reach !== b.reach ? b.reach - a.reach : neutralFirst(a.pole) - neutralFirst(b.pole),
  );
  return ranked.map((r) => r.pole);
}

/**
 * Blend toward the strongest pole that can actually reach `target`. When no
 * pole reaches the preferred target, retry at `floor` so tokens keep their
 * hue separation instead of every semantic color collapsing to one pure
 * black/white; only when even the floor is unreachable do we return the best
 * achievable pole.
 */
function pushToContrast(
  rawHex: string,
  canvasHex: string,
  target: number,
  floor: number,
): string {
  const poles = polesByReach(canvasHex);
  for (const pole of poles) {
    if ((wcagContrastRatio(pole, canvasHex) ?? 1) > target) {
      return solveBlendForContrast(rawHex, pole, canvasHex, target);
    }
  }
  const best = poles[0]!;
  if ((wcagContrastRatio(best, canvasHex) ?? 1) > floor) {
    return solveBlendForContrast(rawHex, best, canvasHex, floor);
  }
  return best;
}

/**
 * Whether we have authoritative evidence of the terminal's own canvas
 * (exact OSC 11 RGB, host/terminal brightness declaration such as Ptyxis
 * `interface-style` or DECSET 2031, or `COLORFGBG`). OS appearance signals
 * alone are NOT included.
 */
function hasTrustedCanvasEvidence(env: Record<string, string | undefined>): boolean {
  return (
    activeTerminalBaseHex !== null ||
    trustedCanvasBrightness !== null ||
    detectColorFgBgBrightness(env) !== null
  );
}

/**
 * Decide between canvas-adaptive truecolor and the ANSI-16 fallback.
 * Explicit terminal-native choices (env `NOLO_TUI_THEME=terminal` or an
 * in-session `/theme terminal`) keep ANSI foregrounds; the untouched default
 * uses truecolor once canvas evidence exists.
 */
function shouldUseTruecolorTokens(env: Record<string, string | undefined>): boolean {
  if (!supportsTruecolor(env)) return false;
  const explicit = (env.NOLO_TUI_THEME ?? "").trim().toLowerCase();
  if (explicit === "terminal" || explicit === "ansi") return false;
  if (resolveTuiThemeMode(env) !== "terminal") return true;
  // In-session `/theme terminal` must behave exactly like the env var: ANSI
  // indexed foregrounds, no fixed RGB, so the terminal keeps owning the palette.
  if (terminalModeExplicit) return false;
  return hasTrustedCanvasEvidence(env);
}

/**
 * SGR *parameters* (no CSI wrapper) for a theme token — e.g. `'38;2;46;125;181'`
 * or `'90'`. This is the form lovely-mermaid's `AnsiTheme` consumes (its values
 * are spliced into `\x1b[<value>m`, so a full sequence here would nest wrong).
 * Byte-identical to what sits between `\x1b[` and `m` in
 * {@link themeColorSequence}'s output.
 */
export function themeSgrParams(
  token: TuiThemeToken,
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  const palette = THEME_PALETTES[activeThemeName] ?? THEME_PALETTES.nature;
  const entry = palette[brightness][token];
  if (!shouldUseTruecolorTokens(env)) {
    return entry.ansiFallback.slice(2, -1);
  }
  const effectiveHex = activeTerminalBaseHex
    ? adaptTokenHexToCanvas(entry.hex, token, activeTerminalBaseHex)
    : entry.hex;
  return hexToSgrParams(effectiveHex);
}

export function themeColorSequence(
  token: TuiThemeToken,
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  return `\x1b[${themeSgrParams(token, env, brightness)}m`;
}

/**
 * Chip background per theme. Kept out of TuiThemeToken on purpose: those tokens
 * are foreground colors consumed by themeText, and a "surface" entry there
 * would be a token whose ANSI-16 fallback cannot express what it means.
 *
 * Each value is a low-contrast wash against that brightness's terminal
 * background — enough to read as a chip, not enough to fight the text.
 */
const SURFACE_HEX: Record<string, Record<TuiBrightness, string>> = {
  nature: { light: "EBF0F5", dark: "262932" },
  trail: { light: "E4E8EC", dark: "313244" },
  catppuccin: { light: "E8ECF0", dark: "181825" },
  wave: { light: "E5E1D6", dark: "2A2A37" },
  iris: { light: "E9E8F2", dark: "2A2740" },
  rose: { light: "F2EAE4", dark: "26233A" },
  mono: { light: "E8EAED", dark: "2A2A2A" },
};

const TERMINAL_BASE: Record<TuiBrightness, string> = {
  dark: "1E1E2E",
  light: "FFFFFF",
};

/**
 * Real terminal background hex, set from the OSC 11 probe result. Null means
 * "no probe result", so resolution falls back to TERMINAL_BASE. Kept as raw
 * hex (no ANSI) — callers render it through hexToBgSgr/blendHex.
 */
let activeTerminalBaseHex: string | null = null;

/**
 * Authoritative terminal/host canvas brightness when exact RGB hex is
 * unavailable (e.g. Ptyxis `interface-style` or DECSET 2031 report). Cleared
 * whenever an exact hex is set or canvas state is reset.
 */
let trustedCanvasBrightness: TuiBrightness | null = null;

/** Record the terminal's actual background hex, or clear it with null. */
export function setActiveTerminalBaseHex(hex: string | null) {
  trustedCanvasBrightness = null;
  if (hex === null) {
    activeTerminalBaseHex = null;
    return;
  }
  // Validate before storing: a dirty value would flow into blendHex and emit
  // NaN SGR channels. readHexChannels requires uppercase, so normalize first.
  activeTerminalBaseHex = readHexChannels(hex.replace(/^#/, "").toUpperCase())
    ? hex.replace(/^#/, "").toUpperCase()
    : null;
}

export function getActiveTerminalBaseHex(): string | null {
  return activeTerminalBaseHex;
}

/** Release all theme state owned by one TUI workspace lifecycle. */
export function resetWorkspaceThemeState() {
  setActiveThemeMode("terminal");
  // Startup/reset returns to the *default* terminal mode, which is not an
  // explicit user choice: canvas-adaptive truecolor stays available.
  terminalModeExplicit = false;
  setActiveTerminalBaseHex(null);
}

/**
 * Record a freshly detected terminal background (brightness + exact base hex)
 * without changing the user's terminal/light/dark mode choice. Kept for the
 * manual `/theme refresh` compatibility path and fixed-mode surface blending.
 */
export function applyDetectedBackground(detected: {
  brightness: TuiBrightness;
  hex: string;
  trustedCanvas?: boolean;
}): boolean {
  // Normalize before comparing against the stored base (uppercase, no '#');
  // keeps a lower-case / '#'-prefixed input from re-triggering every poll.
  const normalizedHex = detected.hex.replace(/^#/, "").toUpperCase();
  const validHex = Boolean(readHexChannels(normalizedHex));
  const nextTrustedCanvas: TuiBrightness | null =
    !validHex && detected.trustedCanvas === true ? detected.brightness : null;
  // An empty hex means "no exact color info" (e.g. the system dark-mode
  // fallback or host-scheme path). Compare brightness and trust state in that
  // case; comparing "" against the stored null would force a repaint every poll.
  const hexChanged =
    normalizedHex !== "" && normalizedHex !== activeTerminalBaseHex;
  const trustedChanged = nextTrustedCanvas !== trustedCanvasBrightness;
  const changed =
    detected.brightness !== resolvedBrightness || hexChanged || trustedChanged;
  resolvedBrightness = detected.brightness;
  setActiveTerminalBaseHex(detected.hex);
  trustedCanvasBrightness = nextTrustedCanvas;
  return changed;
}

/** Base hex for a brightness: the probed terminal color, or the fallback. */
function resolveTerminalBaseHex(brightness: TuiBrightness): string {
  return activeTerminalBaseHex ?? TERMINAL_BASE[brightness];
}

/** Parse a 6-digit hex channel triple, or null when the input isn't one. */
function readHexChannels(hex: string): [number, number, number] | null {
  if (!/^[0-9A-F]{6}$/.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

/** `\x1b[48;2;…m` background SGR for a 6-digit hex, or "" if it isn't one. */
function hexToBgSgr(hex: string): string {
  const channels = readHexChannels(hex.replace(/^#/, "").toUpperCase());
  if (!channels) return "";
  const [r, g, b] = channels;
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * 把 fg 按 weight(0..1) 混合到 base 上，返回 6 位大写 hex（不带 #）。
 *
 * Malformed input falls back to `base` rather than producing channel NaNs: this
 * is exported, and `Math.round(NaN).toString(16)` yields the literal "NaN",
 * which would silently ship an `\x1b[48;2;NaN;…m` sequence to the terminal.
 */
export function blendHex(fg: string, base: string, weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const normFg = fg.replace(/^#/, "").toUpperCase();
  const normBase = base.replace(/^#/, "").toUpperCase();
  if (w === 0) return normBase;
  if (w === 1) return normFg;
  if (!readHexChannels(normFg) || !readHexChannels(normBase)) return normBase;
  const fgR = Number.parseInt(normFg.slice(0, 2), 16);
  const fgG = Number.parseInt(normFg.slice(2, 4), 16);
  const fgB = Number.parseInt(normFg.slice(4, 6), 16);
  const baseR = Number.parseInt(normBase.slice(0, 2), 16);
  const baseG = Number.parseInt(normBase.slice(2, 4), 16);
  const baseB = Number.parseInt(normBase.slice(4, 6), 16);
  const r = Math.round(baseR + (fgR - baseR) * w).toString(16).padStart(2, "0").toUpperCase();
  const g = Math.round(baseG + (fgG - baseG) * w).toString(16).padStart(2, "0").toUpperCase();
  const b = Math.round(baseB + (fgB - baseB) * w).toString(16).padStart(2, "0").toUpperCase();
  return `${r}${g}${b}`;
}

export type DiffLineKind = "added" | "removed" | "context" | "hunk";
export type DiffLineSequence = { fg: string; bg: string; bar: string };

export function diffLineSequences(
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): Record<DiffLineKind, DiffLineSequence> | null {
  if (resolveSurfaceWashFallback(env) !== null) return null;

  const palette = THEME_PALETTES[activeThemeName] ?? THEME_PALETTES.nature;
  const successHex = palette[brightness].success.hex;
  const dangerHex = palette[brightness].danger.hex;
  const infoHex = palette[brightness].info.hex;

  const weight = brightness === "dark" ? 0.15 : 0.10;
  const baseHex = resolveTerminalBaseHex(brightness);

  const addedBgHex = blendHex(successHex, baseHex, weight);
  const removedBgHex = blendHex(dangerHex, baseHex, weight);
  const hunkBgHex = blendHex(infoHex, baseHex, weight * 0.6);

  const successSgr = themeColorSequence("success", env, brightness);
  const dangerSgr = themeColorSequence("danger", env, brightness);
  const infoSgr = themeColorSequence("info", env, brightness);

  return {
    added: {
      fg: successSgr,
      bg: hexToBgSgr(addedBgHex),
      bar: `${successSgr}▎\x1b[39m`,
    },
    removed: {
      fg: dangerSgr,
      bg: hexToBgSgr(removedBgHex),
      bar: `${dangerSgr}▎\x1b[39m`,
    },
    hunk: {
      fg: infoSgr,
      bg: hexToBgSgr(hunkBgHex),
      bar: `${infoSgr}▎\x1b[39m`,
    },
    context: {
      fg: "",
      bg: "",
      bar: `${themeColorSequence("chrome", env, brightness)}▎\x1b[39m`,
    },
  };
}

/**
 * Render one diff line as a simple tinted surface row with semantic text color.
 *
 * `padTo` is the block's widest line, NOT the terminal width. Padding to the
 * terminal width fights wrapTranscriptLine (which wraps at columns-1, so every
 * line would wrap one extra time), breaks on resize because the string is
 * already fixed, and leaves trailing spaces when the user copies the output.
 * A block-local rectangle reads the same and stays resize-safe.
 */

/**
 * Render a padded surface row shared by transcript bubbles and tool details.
 * The caller owns the semantic foreground color; this helper only handles the
 * common surface geometry and keeps ANSI backgrounds from leaking.
 */
export function renderSurfaceLine(args: {
  text: string;
  surface: string;
  padTo: number;
}): string {
  const { text, surface, padTo } = args;
  if (!surface) return text;
  const reopened = text.split("\x1b[0m").join(`\x1b[0m${surface}`);
  const padding = " ".repeat(Math.max(0, padTo - visibleWidth(text)));
  return `${surface}${reopened}${padding}\x1b[0m`;
}

export function renderDiffLine(args: {
  kind: DiffLineKind;
  /** Full line text INCLUDING its +/-/@@ prefix. */
  text: string;
  /** Display width to pad the tint to. Omit for no padding. */
  padTo?: number;
  env?: Record<string, string | undefined>;
  colorEnabled?: boolean;
  /** Optional pre-highlighted line text (with ANSI sequences) to use instead of plain fg. */
  highlightedText?: string;
  /** Render a slim aligned rail with a canvas-aware, block-local wash. */
  gutter?: boolean;
  /** Optional box charset override for the gutter rail (defaults to resolveBoxCharset). */
  boxCharset?: TuiBoxCharset;
}): string {
  const { kind, text, highlightedText, gutter } = args;
  const env = args.env ?? process.env;
  const colorEnabled = args.colorEnabled ?? resolveCliColorEnabled();
  if (!colorEnabled) return text;

  if (gutter) {
    const charset = args.boxCharset ?? resolveBoxCharset(resolveAmbiguousWidth(undefined, env), env);
    const railGlyph = charset === "ascii" ? "|" : "▎";
    const railTone: TuiThemeToken =
      kind === "added"
        ? "success"
        : kind === "removed"
          ? "danger"
          : kind === "hunk"
            ? "info"
            : "chrome";
    const rail = `${themeColorSequence(railTone, env)}${railGlyph}\x1b[39m`;
    const body = highlightedText ?? (
      kind === "context" ? text : `${themeColorSequence(railTone, env)}${text}`
    );
    const closedBody = body.endsWith("\x1b[0m") ? body : `${body}\x1b[0m`;
    const seq = diffLineSequences(env)?.[kind];
    return `${rail} ${seq?.bg ? renderSurfaceLine({
      text: body,
      surface: seq.bg,
      padTo: args.padTo ?? visibleWidth(text),
    }) : closedBody}`;
  }

  const seqs = diffLineSequences(env);
  if (!seqs) {
    // Degraded terminal: foreground color only, no background, no bar.
    if (kind === "context") return highlightedText ?? text;
    const token: TuiThemeToken =
      kind === "added" ? "success" : kind === "removed" ? "danger" : "info";
    return `${themeColorSequence(token, env)}${highlightedText ?? text}\x1b[39m`;
  }

  const seq = seqs[kind];
  // \x1b[0m resets both fg and bg so the tint never leaks to the next line.
  return renderSurfaceLine({
    text: highlightedText ?? `${seq.fg}${text}`,
    surface: seq.bg,
    padTo: args.padTo ?? visibleWidth(text),
  });
}

/**
 * Background SGR for the status chip, or "" when the terminal cannot render it
 * faithfully. ANSI-16 has no safe subtle background — the nearest options are
 * solid blocks that invert readability — so non-truecolor terminals get no
 * chip fill and fall back to plain separated segments.
 */
export function surfaceBackgroundSequence(
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  if (resolveTuiThemeMode(env) === "terminal") return "";
  if (!supportsTruecolor(env)) return "";
  return hexToBgSgr((SURFACE_HEX[activeThemeName] ?? SURFACE_HEX.trail)[brightness]);
}

/** Shared capability/canvas gate for composer and user surface washes. */
function resolveSurfaceWashFallback(
  env: Record<string, string | undefined>,
): string | null {
  // Tier 1 trusts OSC 11 / COLORFGBG canvas evidence. Tier 2 also permits
  // an assumed brightness explicitly chosen via NOLO_TUI_THEME or the in-TUI
  // /theme dark|light command (activeThemeMode): the latter is the user's
  // direct, in-session choice, so it authorizes the assumption just like env.
  // Only when canvas evidence, an env choice, and an in-session choice are all
  // absent do we use ANSI 100 instead of inventing an RGB canvas from OS
  // appearance or the default dark palette. No truecolor uses ANSI 100 too.
  if (
    !supportsTruecolor(env) ||
    (!hasTrustedCanvasEvidence(env) &&
      resolveTuiThemeMode(env) === "terminal")
  ) {
    return "\x1b[100m";
  }
  return null;
}

/**
 * Background wash for the docked composer (the input row at the bottom).
 *
 * Why this is not `surfaceBackgroundSequence`: that one exists for decorative
 * chips and returns "" in terminal-native mode *and* paints an absolute hex
 * from SURFACE_HEX. Both halves broke the composer strip (owner feedback,
 * 2026-10: "让底部输入区颜色不太一样" shipped but nothing changed on screen):
 *
 *  - Startup mode is terminal-native, so the chip sequence was empty and the
 *    input row was painted with literally no background.
 *  - Even with a fixed light/dark mode the table value sits a few levels from
 *    the canvas it is drawn on (catppuccin dark: #181825 on #1E1E2E), so the
 *    step is invisible in practice.
 *
 * So this wash is derived from the terminal's *own* base color: a neutral lift
 * on dark canvases, a neutral drop on light ones. Neutral on purpose — the
 * composer already carries the accent chevron, and an accent wash there would
 * compete with the user-turn bubble that uses accent at full strength.
 *
 * Three tiers share the same gate with user turns: a trusted canvas (OSC 11
 * or COLORFGBG) keeps the exact wash; an explicit dark/light mode authorizes
 * resolveTerminalBaseHex's fallback for the same wash. Without either signal,
 * or without truecolor, use ANSI 100 (bright black), a terminal-palette neutral
 * band, not a guessed RGB canvas that could bury the default foreground.
 */
function neutralSurfaceBackgroundSequence(
  env: Record<string, string | undefined>,
  brightness: TuiBrightness,
  darkWeight: number,
  lightWeight: number,
): string {
  const fallback = resolveSurfaceWashFallback(env);
  if (fallback !== null) return fallback;
  const base = resolveTerminalBaseHex(brightness);
  // Direction comes from the base color's own luma, not from the declared
  // brightness: a pinned `/theme dark` on a light terminal would otherwise
  // "lift" a #FFFFFF base and paint a white band on a white canvas.
  const channels = readHexChannels(base.replace(/^#/, "").toUpperCase());
  const baseLuma = channels
    ? (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255
    : null;
  const darkCanvas = baseLuma === null ? brightness === "dark" : baseLuma < 0.5;
  // A white lift on dark canvases and a black drop on light ones give the same
  // perceived step in both directions without shifting hue. The light weight is
  // lower because a drop from white saturates the eye sooner than a lift from
  // near-black.
  const tint = darkCanvas ? "FFFFFF" : "000000";
  const weight = darkCanvas ? darkWeight : lightWeight;
  return hexToBgSgr(blendHex(tint, base, weight));
}

export function composerSurfaceBackgroundSequence(
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  return neutralSurfaceBackgroundSequence(env, brightness, 0.1, 0.07);
}

/**
 * Compact neutral surface wash for user turns in the history transcript.
 *
 * Uses the same neutral canvas lift/drop as the composer (one notch stronger
 * so user bubbles stand out immediately during fast scrolling without
 * introducing a saturated blue wall or full-width bar). Shares the exact
 * three-tier canvas gate (`resolveSurfaceWashFallback`).
 */
export function userBubbleSurfaceBackgroundSequence(
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  return neutralSurfaceBackgroundSequence(env, brightness, 0.13, 0.08);
}

/**
 * Background wash for user turns in the history area.
 *
 * User messages must stay findable while scrolling back through a long
 * transcript, and accent+bold alone is not unique (the composer chevron,
 * dialog titles and pickers all use accent). This tints the accent hue into
 * the terminal base so a user turn reads as a solid bubble.
 *
 * Dark mode uses a stronger accent wash than the diff bands so the bubble
 * stays easy to find. On a light canvas the same strength reads like a
 * selected row, so the wash drops to a low accent tint that stays visible
 * on white; the accent gutter and accent body text remain the identity cues.
 *
 * The same three tiers as the composer apply: trusted OSC 11 / COLORFGBG
 * canvas -> exact accent wash; explicit dark/light mode -> authorized fallback
 * base and exact wash; no canvas signal or no truecolor -> ANSI 100. OS
 * appearance alone is not canvas evidence: use the terminal's bright-black
 * neutral band rather than guessing a hex that could bury its foreground.
 * The accent gutter + bold body keep the user's identity in the neutral tier.
 */
export function userSurfaceBackgroundSequence(
  env: Record<string, string | undefined> = process.env,
  brightness: TuiBrightness = resolveTuiBrightness(env),
): string {
  const fallback = resolveSurfaceWashFallback(env);
  if (fallback !== null) return fallback;
  const palette = THEME_PALETTES[activeThemeName] ?? THEME_PALETTES.trail;
  // Both brightnesses wash the accent hue into the terminal base so the
  // bubble matches the accent gutter and the (accent-colored) body text.
  // Dark needs a strong wash to stay visible on a dark canvas. Light uses a
  // low-but-visible weight: the old chrome 0.08 wash blended to #F2F2F3
  // (default catppuccin theme), which read as "no color" (owner feedback,
  // 2026-08); accent at 0.14 lands at #DDEAFA — a quiet blue tint that
  // survives on white without reading as a selection highlight.
  const weight = brightness === "dark" ? 0.30 : 0.14;
  const surfaceHex = (brightness === "light" ? palette.light : palette.dark).accent.hex;
  return hexToBgSgr(blendHex(surfaceHex, resolveTerminalBaseHex(brightness), weight));
}

export function themeText(
  text: string,
  token: TuiThemeToken,
  colorEnabled = resolveCliColorEnabled(),
  env: Record<string, string | undefined> = process.env,
): string {
  if (!colorEnabled) return text;
  return `${themeColorSequence(token, env)}${text}\x1b[39m`;
}

/** Stable cache key for every rendering choice that changes emitted ANSI. */
export function tuiRenderThemeFingerprint(
  colorEnabled: boolean,
  env: Record<string, string | undefined> = process.env,
): string {
  const mode = resolveTuiThemeMode(env);
  const colorKind = !colorEnabled
    ? "plain"
    : shouldUseTruecolorTokens(env)
      ? "truecolor"
      : "ansi";
  const surface = colorEnabled ? userSurfaceBackgroundSequence(env) : "";
  const bubbleSurface = colorEnabled ? userBubbleSurfaceBackgroundSequence(env) : "";
  return `${activeThemeName}|${mode}|${colorKind}|${resolveTuiBrightness(env)}|${activeTerminalBaseHex ?? ""}|${env.COLORFGBG ?? ""}|${surface}|${bubbleSurface}`;
}

/**
 * Classify one diff fence line. Shared by the streaming highlighter
 * (assistantOutput.ts highlightCodeLine) so streamed and history-redraw paths
 * paint identically. `+++` / `---` file headers are context, not added/removed.
 */
export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+") && !line.startsWith("+++")) return "added";
  if (line.startsWith("-") && !line.startsWith("---")) return "removed";
  return "context";
}
