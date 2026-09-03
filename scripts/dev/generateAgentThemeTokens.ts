/**
 * ONE-OFF SCRIPT:
 * Generates packages/app/theme/agentTheme.stylex.ts by extracting static theme tokens
 * from packages/app/theme/colors.ts.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as colors from "../../packages/app/theme/colors";

export const THEME_NAMES = [
  "neutral",
  "ocean",
  "forest",
  "trail",
  "wave",
  "iris",
  "rose",
  "mono",
  "catppuccin",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export function computeAgentThemeTokens(
  palette: {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    backgroundGhost: string;
    border: string;
    borderLight: string;
    borderHover: string;
    shadowLight: string;
    shadowMedium: string;
    shadowHeavy: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
  },
  isDark: boolean
) {
  if (!isDark) {
    return {
      // 1. Form Header
      surfaceGlassHeader: `color-mix(in srgb, ${palette.background} 95%, transparent)`,
      borderGlassHeader: palette.borderLight,

      // 2. Form Footer
      surfaceGlassFooter: `color-mix(in srgb, ${palette.background} 85%, transparent)`,
      borderGlassFooter: palette.borderLight,
      shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.03)",

      // 3. Groups & Raised Cards (PublishSettingsTab group, customApiBox)
      surfaceGroup: palette.backgroundSecondary,
      shadowCardRaised: `0 4px 20px ${palette.shadowLight}`,

      // 4. References Tab - Card
      surfaceOverlayHairline: palette.backgroundTertiary,
      borderOverlayHairline: palette.borderLight,

      // 5. References Tab - Card Count
      surfaceBadgeSubtle: `color-mix(in srgb, ${palette.background} 85%, white 4%)`,

      // 6. References Tab - Item
      surfaceCardItem: palette.background,
      shadowCardItem: "0 2px 8px rgba(0, 0, 0, 0.02)",

      // 7. References Tab - Empty
      surfaceCardEmpty: `color-mix(in srgb, ${palette.background} 92%, white 2%)`,
      shadowCardEmpty: "none",

      // 8. Tools Tab - Opacity Ladder & Elements
      // 8.1 emptyState (40% in dark)
      surfaceOverlayFaint: palette.backgroundTertiary,

      // 8.2 collapsedNote (50% bg, 55% border in dark)
      surfaceOverlayNote: palette.backgroundGhost,
      borderOverlayNote: palette.borderHover,

      // 8.3 section (60% bg, 50% border in dark)
      surfaceOverlaySoft: palette.backgroundSecondary,
      borderOverlaySoft: palette.borderLight,

      // 8.4 skillCard (70% bg, 50% border in dark)
      surfaceOverlaySkill: palette.backgroundGhost,

      // 8.5 chip (80% bg, 60% border in dark)
      surfaceOverlayStrong: palette.backgroundTertiary,
      borderOverlayStrong: palette.borderLight,
      chipText: palette.textSecondary,

      // 9. Chat Input Card Shadow
      chatInputCardShadow:
        "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
    };
  }

  return {
    // 1. Form Header
    surfaceGlassHeader: `color-mix(in srgb, ${palette.background} 92%, transparent)`,
    borderGlassHeader: "rgba(255, 255, 255, 0.08)",

    // 2. Form Footer
    surfaceGlassFooter: `color-mix(in srgb, ${palette.background} 80%, transparent)`,
    borderGlassFooter: "rgba(255, 255, 255, 0.1)",
    shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.2)",

    // 3. Groups & Raised Cards (PublishSettingsTab group, customApiBox)
    surfaceGroup: palette.backgroundTertiary,
    shadowCardRaised: "0 4px 24px rgba(0, 0, 0, 0.4)",

    // 4. References Tab - Card
    surfaceOverlayHairline: "rgba(255, 255, 255, 0.02)",
    borderOverlayHairline: "rgba(255, 255, 255, 0.08)",

    // 5. References Tab - Card Count
    surfaceBadgeSubtle: "rgba(255, 255, 255, 0.05)",

    // 6. References Tab - Item
    surfaceCardItem: `color-mix(in srgb, ${palette.background} 95%, white 2%)`,
    shadowCardItem: "0 4px 20px rgba(0, 0, 0, 0.2)",

    // 7. References Tab - Empty
    surfaceCardEmpty: `color-mix(in srgb, ${palette.background} 95%, white 2%)`,
    shadowCardEmpty: "0 4px 20px rgba(0, 0, 0, 0.2)",

    // 8. Tools Tab - Opacity Ladder & Elements
    // 8.1 emptyState (40% in dark)
    surfaceOverlayFaint: `color-mix(in srgb, ${palette.backgroundSecondary} 40%, transparent)`,

    // 8.2 collapsedNote (50% bg, 55% border in dark)
    surfaceOverlayNote: `color-mix(in srgb, ${palette.backgroundSecondary} 50%, transparent)`,
    borderOverlayNote: `color-mix(in srgb, ${palette.border} 55%, transparent)`,

    // 8.3 section (60% bg, 50% border in dark)
    surfaceOverlaySoft: `color-mix(in srgb, ${palette.backgroundSecondary} 60%, transparent)`,
    borderOverlaySoft: `color-mix(in srgb, ${palette.border} 50%, transparent)`,

    // 8.4 skillCard (70% bg, 50% border in dark)
    surfaceOverlaySkill: `color-mix(in srgb, ${palette.backgroundSecondary} 70%, transparent)`,

    // 8.5 chip (80% bg, 60% border in dark)
    surfaceOverlayStrong: `color-mix(in srgb, ${palette.backgroundSecondary} 80%, transparent)`,
    borderOverlayStrong: `color-mix(in srgb, ${palette.border} 60%, transparent)`,
    chipText: palette.text,

    // 9. Chat Input Card Shadow
    chatInputCardShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  };
}

export function generateAgentThemeFileContent(): string {
  const neutralPalette = (colors as any).neutral.light;
  const initialVars = computeAgentThemeTokens(neutralPalette, false);

  let code = `import * as stylex from "@stylexjs/stylex";
import { THEME_NAME_ALIASES } from "./theme.config";

/**
 * Agent 创建/编辑流 StyleX 主题变量体系（defineVars + createTheme）。
 * 静态 CSS 产物中包含 :root 初始变量（neutral light）及 9 主题 × light/dark 全部 18 个主题类。
 * 切换主题仅需在 <html> 上同步对应的 theme class。
 */
export const agentThemeTokens = stylex.defineVars(${JSON.stringify(
    initialVars,
    null,
    2
  )});\n\n`;

  for (const name of THEME_NAMES) {
    const themeObj = (colors as any)[name];
    if (!themeObj) continue;
    const lightTokens = computeAgentThemeTokens(themeObj.light, false);
    const darkTokens = computeAgentThemeTokens(themeObj.dark, true);

    code += `export const ${name}Light = stylex.createTheme(agentThemeTokens, ${JSON.stringify(
      lightTokens,
      null,
      2
    )});\n\n`;
    code += `export const ${name}Dark = stylex.createTheme(agentThemeTokens, ${JSON.stringify(
      darkTokens,
      null,
      2
    )});\n\n`;
  }

  code += `export const AGENT_THEMES: Record<string, { light: any; dark: any }> = {\n`;
  for (const name of THEME_NAMES) {
    code += `  ${name}: { light: ${name}Light, dark: ${name}Dark },\n`;
  }
  code += `};\n\n`;

  code += `/** 提取全部 18 个主题生成的 class 名称，用于类名清理 */
export const ALL_AGENT_THEME_CLASS_NAMES: readonly string[] = Object.values(
  AGENT_THEMES
).flatMap((pair) => [
  ...Object.values(pair.light).filter(
    (v): v is string => typeof v === "string" && !v.startsWith("$$css")
  ),
  ...Object.values(pair.dark).filter(
    (v): v is string => typeof v === "string" && !v.startsWith("$$css")
  ),
]).flatMap((cls) => cls.split(/\\s+/)).filter(Boolean);

/** 获取指定主题与模式的 StyleX theme class 字符串 */
export function getAgentThemeClass(
  themeName: string | undefined | null,
  isDark: boolean
): string {
  const normalized =
    themeName && themeName in THEME_NAME_ALIASES
      ? (THEME_NAME_ALIASES as Record<string, string>)[themeName]
      : themeName;
  const pair =
    (normalized && AGENT_THEMES[normalized]) ||
    AGENT_THEMES.catppuccin ||
    AGENT_THEMES.neutral;
  const theme = isDark ? pair.dark : pair.light;
  if (!theme || typeof theme !== "object") return "";
  return Object.entries(theme)
    .filter(([k]) => k !== "$$css")
    .map(([, v]) => v)
    .join(" ");
}

/** 同步 HTML 根节点的 StyleX theme class，不覆盖其它 class */
export function applyAgentThemeToElement(
  el: HTMLElement | null | undefined,
  themeName: string | undefined | null,
  isDark: boolean
): void {
  if (!el) return;
  const targetClassStr = getAgentThemeClass(themeName, isDark);
  const targetClasses = targetClassStr.split(/\\s+/).filter(Boolean);

  // 清除旧的 agent theme class
  for (const cls of ALL_AGENT_THEME_CLASS_NAMES) {
    if (!targetClasses.includes(cls)) {
      el.classList.remove(cls);
    }
  }
  // 附加新的 agent theme class
  for (const cls of targetClasses) {
    el.classList.add(cls);
  }
}
`;

  return code;
}

if (import.meta.main) {
  const targetPath = join(
    import.meta.dir,
    "../../packages/app/theme/agentTheme.stylex.ts"
  );
  await writeFile(targetPath, generateAgentThemeFileContent(), "utf8");
  console.log("Successfully generated:", targetPath);
}
