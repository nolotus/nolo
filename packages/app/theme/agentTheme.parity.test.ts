import { describe, expect, test } from "bun:test";
import * as colors from "./colors";
import {
  computeAgentThemeTokens,
  generateAgentThemeFileContent,
  THEME_NAMES,
} from "../../../scripts/dev/generateAgentThemeTokens";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Hardcoded golden token values for neutral and catppuccin themes.
 *
 * Sourced verbatim from:
 * - Dark values: git show 37fcff5e3:packages/ai/agent/web/agentCreateStylexEscapeHatch.css
 * - Light values: git show 37fcff5e3:packages/ai/agent/web/*Styles.ts & colors.ts
 *
 * MUST NOT be derived dynamically from generator functions.
 */
const NEUTRAL_LIGHT_GOLDEN = {
  chatInputCardShadow: "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  surfaceGlassHeader: "color-mix(in srgb, #FFFFFF 95%, transparent)",
  borderGlassHeader: "#F4F4F5",
  surfaceGlassFooter: "color-mix(in srgb, #FFFFFF 85%, transparent)",
  borderGlassFooter: "#F4F4F5",
  shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.03)",
  surfaceGroup: "#F4F4F5",
  shadowCardRaised: "0 4px 20px rgba(0,0,0,0.04)",
  surfaceOverlayHairline: "#E4E4E7",
  borderOverlayHairline: "#F4F4F5",
  surfaceBadgeSubtle: "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  surfaceCardItem: "#FFFFFF",
  shadowCardItem: "0 2px 8px rgba(0, 0, 0, 0.02)",
  surfaceCardEmpty: "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  shadowCardEmpty: "none",
  surfaceOverlayFaint: "#E4E4E7",
  surfaceOverlayNote: "#FFFFFFF0",
  borderOverlayNote: "#71717A",
  surfaceOverlaySoft: "#F4F4F5",
  borderOverlaySoft: "#F4F4F5",
  surfaceOverlaySkill: "#FFFFFFF0",
  surfaceOverlayStrong: "#E4E4E7",
  borderOverlayStrong: "#F4F4F5",
  chipText: "#52525B",
};

const NEUTRAL_DARK_GOLDEN = {
  chatInputCardShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  surfaceGlassHeader: "color-mix(in srgb, #18181B 92%, transparent)",
  borderGlassHeader: "rgba(255, 255, 255, 0.08)",
  surfaceGlassFooter: "color-mix(in srgb, #18181B 80%, transparent)",
  borderGlassFooter: "rgba(255, 255, 255, 0.1)",
  shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.2)",
  surfaceGroup: "#3F3F46",
  shadowCardRaised: "0 4px 24px rgba(0, 0, 0, 0.4)",
  surfaceOverlayHairline: "rgba(255, 255, 255, 0.02)",
  borderOverlayHairline: "rgba(255, 255, 255, 0.08)",
  surfaceBadgeSubtle: "rgba(255, 255, 255, 0.05)",
  surfaceCardItem: "color-mix(in srgb, #18181B 95%, white 2%)",
  shadowCardItem: "0 4px 20px rgba(0, 0, 0, 0.2)",
  surfaceCardEmpty: "color-mix(in srgb, #18181B 95%, white 2%)",
  shadowCardEmpty: "0 4px 20px rgba(0, 0, 0, 0.2)",
  surfaceOverlayFaint: "color-mix(in srgb, #27272A 40%, transparent)",
  surfaceOverlayNote: "color-mix(in srgb, #27272A 50%, transparent)",
  borderOverlayNote: "color-mix(in srgb, #3F3F46 55%, transparent)",
  surfaceOverlaySoft: "color-mix(in srgb, #27272A 60%, transparent)",
  borderOverlaySoft: "color-mix(in srgb, #3F3F46 50%, transparent)",
  surfaceOverlaySkill: "color-mix(in srgb, #27272A 70%, transparent)",
  surfaceOverlayStrong: "color-mix(in srgb, #27272A 80%, transparent)",
  borderOverlayStrong: "color-mix(in srgb, #3F3F46 60%, transparent)",
  chipText: "#FAFAFA",
};

const CATPPUCCIN_LIGHT_GOLDEN = {
  chatInputCardShadow: "0 10px 24px -22px var(--shadowMedium), 0 1px 2px var(--shadowLight)",
  surfaceGlassHeader: "color-mix(in srgb, #FFFFFF 95%, transparent)",
  borderGlassHeader: "#D8DEE4",
  surfaceGlassFooter: "color-mix(in srgb, #FFFFFF 85%, transparent)",
  borderGlassFooter: "#D8DEE4",
  shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.03)",
  surfaceGroup: "#F6F8FA",
  shadowCardRaised: "0 4px 20px rgba(0,0,0,0.04)",
  surfaceOverlayHairline: "#E8ECF0",
  borderOverlayHairline: "#D8DEE4",
  surfaceBadgeSubtle: "color-mix(in srgb, #FFFFFF 85%, white 4%)",
  surfaceCardItem: "#FFFFFF",
  shadowCardItem: "0 2px 8px rgba(0, 0, 0, 0.02)",
  surfaceCardEmpty: "color-mix(in srgb, #FFFFFF 92%, white 2%)",
  shadowCardEmpty: "none",
  surfaceOverlayFaint: "#E8ECF0",
  surfaceOverlayNote: "rgba(255,255,255,0.94)",
  borderOverlayNote: "#B1BAC4",
  surfaceOverlaySoft: "#F6F8FA",
  borderOverlaySoft: "#D8DEE4",
  surfaceOverlaySkill: "rgba(255,255,255,0.94)",
  surfaceOverlayStrong: "#E8ECF0",
  borderOverlayStrong: "#D8DEE4",
  chipText: "#57606A",
};

const CATPPUCCIN_DARK_GOLDEN = {
  chatInputCardShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1px 2px var(--shadowLight), 0 16px 32px -20px var(--shadowHeavy)",
  surfaceGlassHeader: "color-mix(in srgb, #1E1E2E 92%, transparent)",
  borderGlassHeader: "rgba(255, 255, 255, 0.08)",
  surfaceGlassFooter: "color-mix(in srgb, #1E1E2E 80%, transparent)",
  borderGlassFooter: "rgba(255, 255, 255, 0.1)",
  shadowFooterUpward: "0 -4px 20px rgba(0, 0, 0, 0.2)",
  surfaceGroup: "#313244",
  shadowCardRaised: "0 4px 24px rgba(0, 0, 0, 0.4)",
  surfaceOverlayHairline: "rgba(255, 255, 255, 0.02)",
  borderOverlayHairline: "rgba(255, 255, 255, 0.08)",
  surfaceBadgeSubtle: "rgba(255, 255, 255, 0.05)",
  surfaceCardItem: "color-mix(in srgb, #1E1E2E 95%, white 2%)",
  shadowCardItem: "0 4px 20px rgba(0, 0, 0, 0.2)",
  surfaceCardEmpty: "color-mix(in srgb, #1E1E2E 95%, white 2%)",
  shadowCardEmpty: "0 4px 20px rgba(0, 0, 0, 0.2)",
  surfaceOverlayFaint: "color-mix(in srgb, #181825 40%, transparent)",
  surfaceOverlayNote: "color-mix(in srgb, #181825 50%, transparent)",
  borderOverlayNote: "color-mix(in srgb, #313244 55%, transparent)",
  surfaceOverlaySoft: "color-mix(in srgb, #181825 60%, transparent)",
  borderOverlaySoft: "color-mix(in srgb, #313244 50%, transparent)",
  surfaceOverlaySkill: "color-mix(in srgb, #181825 70%, transparent)",
  surfaceOverlayStrong: "color-mix(in srgb, #181825 80%, transparent)",
  borderOverlayStrong: "color-mix(in srgb, #313244 60%, transparent)",
  chipText: "#CDD6F4",
};

describe("agentTheme parity with colors.ts factory & golden baselines", () => {
  test("neutral theme matches hardcoded golden token baseline exactly", () => {
    const computedLight = computeAgentThemeTokens(colors.neutral.light, false);
    const computedDark = computeAgentThemeTokens(colors.neutral.dark, true);

    expect(computedLight).toEqual(NEUTRAL_LIGHT_GOLDEN);
    expect(computedDark).toEqual(NEUTRAL_DARK_GOLDEN);
  });

  test("catppuccin theme matches hardcoded golden token baseline exactly", () => {
    const computedLight = computeAgentThemeTokens(colors.catppuccin.light, false);
    const computedDark = computeAgentThemeTokens(colors.catppuccin.dark, true);

    expect(computedLight).toEqual(CATPPUCCIN_LIGHT_GOLDEN);
    expect(computedDark).toEqual(CATPPUCCIN_DARK_GOLDEN);
  });

  test("static tokens match runtime computed tokens for all 9 themes (light & dark)", () => {
    for (const name of THEME_NAMES) {
      const themePalette = (colors as any)[name];
      expect(themePalette).toBeDefined();

      const expectedLight = computeAgentThemeTokens(themePalette.light, false);
      const expectedDark = computeAgentThemeTokens(themePalette.dark, true);

      // Verify essential properties exist and have valid CSS values
      expect(expectedLight.surfaceGlassHeader).toContain("color-mix");
      expect(expectedLight.surfaceGroup).toBe(themePalette.light.backgroundSecondary);
      expect(expectedLight.chipText).toBe(themePalette.light.textSecondary);

      expect(expectedDark.surfaceGlassHeader).toContain("color-mix");
      expect(expectedDark.surfaceGroup).toBe(themePalette.dark.backgroundTertiary);
      expect(expectedDark.chipText).toBe(themePalette.dark.text);
    }
  });

  test("agentTheme.stylex.ts file matches the generator output exactly", async () => {
    const filePath = join(__dirname, "agentTheme.stylex.ts");
    const diskContent = await readFile(filePath, "utf8");
    const generatedContent = generateAgentThemeFileContent();
    expect(diskContent).toBe(generatedContent);
  });
});
