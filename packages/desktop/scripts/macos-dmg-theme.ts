/**
 * Visual tokens for the macOS drag-to-install DMG window.
 * Aligned with the web default theme (Catppuccin × GitHub — Ghostty GitHub Light Default) and /downloads page surfaces.
 */
import type { MacosDmgInstallerCopy } from "./macos-dmg-i18n";

export interface MacosDmgInstallerTheme extends MacosDmgInstallerCopy {
  width: number;
  height: number;
  background: string;
  backgroundSecondary: string;
  primary: string;
  primaryGhost: string;
  text: string;
  textSecondary: string;
  textHeading: string;
  border: string;
  arrow: string;
}

const MACOS_DMG_INSTALLER_VISUAL = {
  width: 660,
  height: 400,
  background: "#F5F5F7",
  backgroundSecondary: "#F5F5F7",
  primary: "#0969DA",
  primaryGhost: "transparent",
  text: "#3C3C43",
  textSecondary: "#8E8E93",
  textHeading: "#1C1C1E",
  border: "transparent",
  arrow: "#AEAEB2",
} as const;

export function buildMacosDmgInstallerTheme(copy: MacosDmgInstallerCopy): MacosDmgInstallerTheme {
  return {
    ...MACOS_DMG_INSTALLER_VISUAL,
    windowTitle: copy.windowTitle,
    subtitle: copy.subtitle,
    appLabel: copy.appLabel,
    applicationsLabel: copy.applicationsLabel,
  };
}