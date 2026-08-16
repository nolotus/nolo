import { join, resolve } from "node:path";
import sharp from "sharp";
import { buildMacosDmgInstallerTheme, type MacosDmgInstallerTheme } from "./macos-dmg-theme";
import { getMacosDmgInstallerCopyForBuild } from "./macos-dmg-i18n";

const assetsDir = resolve(import.meta.dir, "../assets/dmg");
export const MACOS_DMG_BACKGROUND_PATH = join(assetsDir, "installer-background.png");

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Flat background: title, one-line hint, arrow between icon slots (no halos, frames, or duplicate labels). */
const buildBackgroundSvg = (theme: MacosDmgInstallerTheme) => {
  const { width, height, background, textHeading, textSecondary, arrow, windowTitle, subtitle } =
    theme;

  const appX = Math.round(width * 0.22);
  const appsX = Math.round(width * 0.68);
  const arrowY = Math.round(height * 0.42);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${background}"/>
  <text x="${width / 2}" y="72" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="22" font-weight="600" fill="${textHeading}">${escapeXml(windowTitle)}</text>
  <text x="${width / 2}" y="98" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="13" fill="${textSecondary}">${escapeXml(subtitle)}</text>
  <path d="M ${appX + 64} ${arrowY} L ${appsX - 64} ${arrowY} M ${appsX - 76} ${arrowY - 10} L ${appsX - 64} ${arrowY} L ${appsX - 76} ${arrowY + 10}" fill="none" stroke="${arrow}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
};

export const renderMacosDmgBackgroundPng = async (
  outputPath = MACOS_DMG_BACKGROUND_PATH,
  theme: MacosDmgInstallerTheme = buildMacosDmgInstallerTheme(getMacosDmgInstallerCopyForBuild()),
) => {
  const svg = buildBackgroundSvg(theme);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
};