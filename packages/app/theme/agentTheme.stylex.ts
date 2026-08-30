import * as stylex from "@stylexjs/stylex";
import { THEME_NAME_ALIASES } from "./theme.config";

/**
 * Agent 创建/编辑流 StyleX 主题变量体系（defineVars + createTheme）。
 * 静态 CSS 产物中包含 :root 初始变量（neutral light）及 9 主题 × light/dark 全部 18 个主题类。
 * 切换主题仅需在 <html> 上同步对应的 theme class。
 */
export const agentThemeTokens = stylex.defineVars({
  "surfaceGlassHeader": "color-mix(in srgb, #FFFFFF 95%, transparent)",
  "borderGlassHeader": "#F4F4F5",
  "surfaceGlassFooter": "color-mix(in srgb, #FFFFFF 85%, transparent)",
  "borderGlassFooter": "#F4F4F5",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F4F4F5",
  "shadowCardRaised": "0 4px 20px rgba(0,0,0,0.04)",
  "surfaceOverlayHairline": "#E4E4E7",
  "borderOverlayHairline": "#F4F4F5",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  "surfaceCardItem": "#FFFFFF",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#E4E4E7",
  "surfaceOverlayNote": "#FFFFFFF0",
  "borderOverlayNote": "#71717A",
  "surfaceOverlaySoft": "#F4F4F5",
  "borderOverlaySoft": "#F4F4F5",
  "surfaceOverlaySkill": "#FFFFFFF0",
  "surfaceOverlayStrong": "#E4E4E7",
  "borderOverlayStrong": "#F4F4F5",
  "chipText": "#52525B",
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)"
});

export const neutralLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FFFFFF 95%, transparent)",
  "borderGlassHeader": "#F4F4F5",
  "surfaceGlassFooter": "color-mix(in srgb, #FFFFFF 85%, transparent)",
  "borderGlassFooter": "#F4F4F5",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F4F4F5",
  "shadowCardRaised": "0 4px 20px rgba(0,0,0,0.04)",
  "surfaceOverlayHairline": "#E4E4E7",
  "borderOverlayHairline": "#F4F4F5",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  "surfaceCardItem": "#FFFFFF",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#E4E4E7",
  "surfaceOverlayNote": "#FFFFFFF0",
  "borderOverlayNote": "#71717A",
  "surfaceOverlaySoft": "#F4F4F5",
  "borderOverlaySoft": "#F4F4F5",
  "surfaceOverlaySkill": "#FFFFFFF0",
  "surfaceOverlayStrong": "#E4E4E7",
  "borderOverlayStrong": "#F4F4F5",
  "chipText": "#52525B"
});

export const neutralDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #18181B 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #18181B 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#3F3F46",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #18181B 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #18181B 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #27272A 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #27272A 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #3F3F46 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #27272A 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #3F3F46 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #27272A 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #27272A 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #3F3F46 60%, transparent)",
  "chipText": "#FAFAFA"
});

export const oceanLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FFFFFF 95%, transparent)",
  "borderGlassHeader": "#F6F8FA",
  "surfaceGlassFooter": "color-mix(in srgb, #FFFFFF 85%, transparent)",
  "borderGlassFooter": "#F6F8FA",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F6F8FA",
  "shadowCardRaised": "0 4px 20px rgba(0,0,0,0.04)",
  "surfaceOverlayHairline": "#EBF0F4",
  "borderOverlayHairline": "#F6F8FA",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  "surfaceCardItem": "#FFFFFF",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#EBF0F4",
  "surfaceOverlayNote": "#FFFFFFF0",
  "borderOverlayNote": "#6E7781",
  "surfaceOverlaySoft": "#F6F8FA",
  "borderOverlaySoft": "#F6F8FA",
  "surfaceOverlaySkill": "#FFFFFFF0",
  "surfaceOverlayStrong": "#EBF0F4",
  "borderOverlayStrong": "#F6F8FA",
  "chipText": "#57606A"
});

export const oceanDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #0D1117 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #0D1117 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#21262D",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #0D1117 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #0D1117 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #161B22 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #161B22 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #30363D 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #161B22 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #30363D 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #161B22 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #161B22 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #30363D 60%, transparent)",
  "chipText": "#E6EDF3"
});

export const forestLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #F6FAF6 95%, transparent)",
  "borderGlassHeader": "#EDF5EC",
  "surfaceGlassFooter": "color-mix(in srgb, #F6FAF6 85%, transparent)",
  "borderGlassFooter": "#EDF5EC",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#EDF5EC",
  "shadowCardRaised": "0 4px 20px rgba(0,0,0,0.04)",
  "surfaceOverlayHairline": "#DDF0DB",
  "borderOverlayHairline": "#EDF5EC",
  "surfaceBadgeSubtle": "color-mix(in srgb, #F6FAF6 85%, white 4%)",
  "surfaceCardItem": "#F6FAF6",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #F6FAF6 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#DDF0DB",
  "surfaceOverlayNote": "#F6FAF6F0",
  "borderOverlayNote": "#5C8A58",
  "surfaceOverlaySoft": "#EDF5EC",
  "borderOverlaySoft": "#EDF5EC",
  "surfaceOverlaySkill": "#F6FAF6F0",
  "surfaceOverlayStrong": "#DDF0DB",
  "borderOverlayStrong": "#EDF5EC",
  "chipText": "#3D6B3A"
});

export const forestDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #0C1209 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #0C1209 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#1A2416",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #0C1209 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #0C1209 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #121A0E 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #121A0E 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #1A2416 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #121A0E 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #1A2416 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #121A0E 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #121A0E 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #1A2416 60%, transparent)",
  "chipText": "#E4F0E2"
});

export const trailLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FAFBFC 95%, transparent)",
  "borderGlassHeader": "#EEF2F6",
  "surfaceGlassFooter": "color-mix(in srgb, #FAFBFC 85%, transparent)",
  "borderGlassFooter": "#EEF2F6",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F4F7FA",
  "shadowCardRaised": "0 4px 20px rgba(28, 36, 48, 0.05)",
  "surfaceOverlayHairline": "#E8EDF2",
  "borderOverlayHairline": "#EEF2F6",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FAFBFC 85%, white 4%)",
  "surfaceCardItem": "#FAFBFC",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FAFBFC 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#E8EDF2",
  "surfaceOverlayNote": "rgba(250, 251, 252, 0.94)",
  "borderOverlayNote": "#B8C5D4",
  "surfaceOverlaySoft": "#F4F7FA",
  "borderOverlaySoft": "#EEF2F6",
  "surfaceOverlaySkill": "rgba(250, 251, 252, 0.94)",
  "surfaceOverlayStrong": "#E8EDF2",
  "borderOverlayStrong": "#EEF2F6",
  "chipText": "#5C6775"
});

export const trailDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #0B1218 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #0B1218 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#1A2630",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #0B1218 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #0B1218 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #111A22 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #111A22 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #243240 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #111A22 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #243240 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #111A22 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #111A22 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #243240 60%, transparent)",
  "chipText": "#EEF3F8"
});

export const waveLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #F5F4EF 95%, transparent)",
  "borderGlassHeader": "#ECEAE3",
  "surfaceGlassFooter": "color-mix(in srgb, #F5F4EF 85%, transparent)",
  "borderGlassFooter": "#ECEAE3",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#FFFFFF",
  "shadowCardRaised": "0 4px 20px rgba(26, 26, 34, 0.05)",
  "surfaceOverlayHairline": "#ECEAE3",
  "borderOverlayHairline": "#ECEAE3",
  "surfaceBadgeSubtle": "color-mix(in srgb, #F5F4EF 85%, white 4%)",
  "surfaceCardItem": "#F5F4EF",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #F5F4EF 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#ECEAE3",
  "surfaceOverlayNote": "rgba(245, 244, 239, 0.94)",
  "borderOverlayNote": "#C4C0B2",
  "surfaceOverlaySoft": "#FFFFFF",
  "borderOverlaySoft": "#ECEAE3",
  "surfaceOverlaySkill": "rgba(245, 244, 239, 0.94)",
  "surfaceOverlayStrong": "#ECEAE3",
  "borderOverlayStrong": "#ECEAE3",
  "chipText": "#3D3B4F"
});

export const waveDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #1F1F28 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #1F1F28 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#2A2A37",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #1F1F28 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #1F1F28 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #16161D 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #16161D 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #2A2A37 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #16161D 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #2A2A37 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #16161D 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #16161D 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #2A2A37 60%, transparent)",
  "chipText": "#DCD7BA"
});

export const irisLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FBFBFD 95%, transparent)",
  "borderGlassHeader": "#F2F2F7",
  "surfaceGlassFooter": "color-mix(in srgb, #FBFBFD 85%, transparent)",
  "borderGlassFooter": "#F2F2F7",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F4F4F9",
  "shadowCardRaised": "0 4px 20px rgba(26, 23, 48, 0.04)",
  "surfaceOverlayHairline": "#ECECF3",
  "borderOverlayHairline": "#F2F2F7",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FBFBFD 85%, white 4%)",
  "surfaceCardItem": "#FBFBFD",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FBFBFD 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#ECECF3",
  "surfaceOverlayNote": "rgba(251, 251, 253, 0.94)",
  "borderOverlayNote": "#CFCFD9",
  "surfaceOverlaySoft": "#F4F4F9",
  "borderOverlaySoft": "#F2F2F7",
  "surfaceOverlaySkill": "rgba(251, 251, 253, 0.94)",
  "surfaceOverlayStrong": "#ECECF3",
  "borderOverlayStrong": "#F2F2F7",
  "chipText": "#4E4B6B"
});

export const irisDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #0F0E17 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #0F0E17 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#1E1B2E",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #0F0E17 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #0F0E17 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #16141F 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #16141F 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #272435 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #16141F 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #272435 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #16141F 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #16141F 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #272435 60%, transparent)",
  "chipText": "#E8E5F7"
});

export const roseLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FAF4ED 95%, transparent)",
  "borderGlassHeader": "#F2E9E1",
  "surfaceGlassFooter": "color-mix(in srgb, #FAF4ED 85%, transparent)",
  "borderGlassFooter": "#F2E9E1",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#FFFAF3",
  "shadowCardRaised": "0 4px 20px rgba(87, 82, 121, 0.05)",
  "surfaceOverlayHairline": "#F2E9E1",
  "borderOverlayHairline": "#F2E9E1",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FAF4ED 85%, white 4%)",
  "surfaceCardItem": "#FAF4ED",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FAF4ED 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#F2E9E1",
  "surfaceOverlayNote": "rgba(250, 244, 237, 0.94)",
  "borderOverlayNote": "#C5BFB3",
  "surfaceOverlaySoft": "#FFFAF3",
  "borderOverlaySoft": "#F2E9E1",
  "surfaceOverlaySkill": "rgba(250, 244, 237, 0.94)",
  "surfaceOverlayStrong": "#F2E9E1",
  "borderOverlayStrong": "#F2E9E1",
  "chipText": "#6E6A86"
});

export const roseDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #191724 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #191724 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#26233A",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #191724 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #191724 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #1F1D2E 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #1F1D2E 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #26233A 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #1F1D2E 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #26233A 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #1F1D2E 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #1F1D2E 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #26233A 60%, transparent)",
  "chipText": "#E0DEF4"
});

export const monoLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FCFCFD 95%, transparent)",
  "borderGlassHeader": "#F1F2F4",
  "surfaceGlassFooter": "color-mix(in srgb, #FCFCFD 85%, transparent)",
  "borderGlassFooter": "#F1F2F4",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F9FAFA",
  "shadowCardRaised": "0 4px 20px rgba(41, 46, 50, 0.05)",
  "surfaceOverlayHairline": "#F1F2F4",
  "borderOverlayHairline": "#F1F2F4",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FCFCFD 85%, white 4%)",
  "surfaceCardItem": "#FCFCFD",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FCFCFD 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#F1F2F4",
  "surfaceOverlayNote": "rgba(252,252,253,0.94)",
  "borderOverlayNote": "#C1C7CD",
  "surfaceOverlaySoft": "#F9FAFA",
  "borderOverlaySoft": "#F1F2F4",
  "surfaceOverlaySkill": "rgba(252,252,253,0.94)",
  "surfaceOverlayStrong": "#F1F2F4",
  "borderOverlayStrong": "#F1F2F4",
  "chipText": "#57616B"
});

export const monoDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #292E32 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #292E32 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#57616B",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #292E32 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #292E32 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #3E454C 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #3E454C 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #4A525A 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #3E454C 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #4A525A 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #3E454C 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #3E454C 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #4A525A 60%, transparent)",
  "chipText": "#EBEDEF"
});

export const catppuccinLight = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  "surfaceGlassHeader": "color-mix(in srgb, #FFFFFF 95%, transparent)",
  "borderGlassHeader": "#D8DEE4",
  "surfaceGlassFooter": "color-mix(in srgb, #FFFFFF 85%, transparent)",
  "borderGlassFooter": "#D8DEE4",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.03)",
  "surfaceGroup": "#F6F8FA",
  "shadowCardRaised": "0 4px 20px rgba(0,0,0,0.04)",
  "surfaceOverlayHairline": "#E8ECF0",
  "borderOverlayHairline": "#D8DEE4",
  "surfaceBadgeSubtle": "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  "surfaceCardItem": "#FFFFFF",
  "shadowCardItem": "0 2px 8px rgba(0, 0, 0, 0.02)",
  "surfaceCardEmpty": "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  "shadowCardEmpty": "none",
  "surfaceOverlayFaint": "#E8ECF0",
  "surfaceOverlayNote": "rgba(255,255,255,0.94)",
  "borderOverlayNote": "#B1BAC4",
  "surfaceOverlaySoft": "#F6F8FA",
  "borderOverlaySoft": "#D8DEE4",
  "surfaceOverlaySkill": "rgba(255,255,255,0.94)",
  "surfaceOverlayStrong": "#E8ECF0",
  "borderOverlayStrong": "#D8DEE4",
  "chipText": "#57606A"
});

export const catppuccinDark = stylex.createTheme(agentThemeTokens, {
  "chatInputCardShadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  "surfaceGlassHeader": "color-mix(in srgb, #1E1E2E 92%, transparent)",
  "borderGlassHeader": "rgba(255, 255, 255, 0.08)",
  "surfaceGlassFooter": "color-mix(in srgb, #1E1E2E 80%, transparent)",
  "borderGlassFooter": "rgba(255, 255, 255, 0.1)",
  "shadowFooterUpward": "0 -4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceGroup": "#313244",
  "shadowCardRaised": "0 4px 24px rgba(0, 0, 0, 0.4)",
  "surfaceOverlayHairline": "rgba(255, 255, 255, 0.02)",
  "borderOverlayHairline": "rgba(255, 255, 255, 0.08)",
  "surfaceBadgeSubtle": "rgba(255, 255, 255, 0.05)",
  "surfaceCardItem": "color-mix(in srgb, #1E1E2E 95%, white 2%)",
  "shadowCardItem": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceCardEmpty": "color-mix(in srgb, #1E1E2E 95%, white 2%)",
  "shadowCardEmpty": "0 4px 20px rgba(0, 0, 0, 0.2)",
  "surfaceOverlayFaint": "color-mix(in srgb, #181825 40%, transparent)",
  "surfaceOverlayNote": "color-mix(in srgb, #181825 50%, transparent)",
  "borderOverlayNote": "color-mix(in srgb, #313244 55%, transparent)",
  "surfaceOverlaySoft": "color-mix(in srgb, #181825 60%, transparent)",
  "borderOverlaySoft": "color-mix(in srgb, #313244 50%, transparent)",
  "surfaceOverlaySkill": "color-mix(in srgb, #181825 70%, transparent)",
  "surfaceOverlayStrong": "color-mix(in srgb, #181825 80%, transparent)",
  "borderOverlayStrong": "color-mix(in srgb, #313244 60%, transparent)",
  "chipText": "#CDD6F4"
});

export const AGENT_THEMES: Record<string, { light: any; dark: any }> = {
  neutral: { light: neutralLight, dark: neutralDark },
  ocean: { light: oceanLight, dark: oceanDark },
  forest: { light: forestLight, dark: forestDark },
  trail: { light: trailLight, dark: trailDark },
  wave: { light: waveLight, dark: waveDark },
  iris: { light: irisLight, dark: irisDark },
  rose: { light: roseLight, dark: roseDark },
  mono: { light: monoLight, dark: monoDark },
  catppuccin: { light: catppuccinLight, dark: catppuccinDark },
};

/** 提取全部 18 个主题生成的 class 名称，用于类名清理 */
export const ALL_AGENT_THEME_CLASS_NAMES: readonly string[] = Object.values(
  AGENT_THEMES
).flatMap((pair) => [
  ...Object.values(pair.light).filter(
    (v): v is string => typeof v === "string" && !v.startsWith("$$css")
  ),
  ...Object.values(pair.dark).filter(
    (v): v is string => typeof v === "string" && !v.startsWith("$$css")
  ),
]).flatMap((cls) => cls.split(/\s+/)).filter(Boolean);

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
  const targetClasses = targetClassStr.split(/\s+/).filter(Boolean);

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
