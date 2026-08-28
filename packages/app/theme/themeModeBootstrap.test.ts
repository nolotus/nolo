import { describe, expect, test } from "bun:test";

import {
  readStoredFontPreset,
  normalizeThemeName,
  readStoredThemeDensity,
  readStoredThemeName,
  readStoredThemeMode,
  resolveThemeModeIsDark,
  resolveThemeModePreload,
} from "./themeModeBootstrap";

describe("themeModeBootstrap", () => {
  test("reads valid stored theme modes", () => {
    expect(
      readStoredThemeMode({
        getItem: () => "dark",
      })
    ).toBe("dark");
    expect(
      readStoredThemeMode({
        getItem: () => "light",
      })
    ).toBe("light");
    expect(
      readStoredThemeMode({
        getItem: () => "system",
      })
    ).toBe("system");
  });

  test("falls back to system for invalid or unavailable storage values", () => {
    expect(
      readStoredThemeMode({
        getItem: () => "sepia",
      })
    ).toBe("system");
    expect(readStoredThemeMode(null)).toBe("system");
    expect(
      readStoredThemeMode({
        getItem: () => {
          throw new Error("blocked");
        },
      })
    ).toBe("system");
  });

  test("reads valid stored density values", () => {
    expect(
      readStoredThemeDensity({
        getItem: () => "compact",
      })
    ).toBe("compact");
    expect(
      readStoredThemeDensity({
        getItem: () => "spacious",
      })
    ).toBe("spacious");
  });

  test("ignores invalid or unavailable stored density values", () => {
    expect(
      readStoredThemeDensity({
        getItem: () => "cozy",
      })
    ).toBeUndefined();
    expect(readStoredThemeDensity(null)).toBeUndefined();
    expect(
      readStoredThemeDensity({
        getItem: () => {
          throw new Error("blocked");
        },
      })
    ).toBeUndefined();
  });

  test("reads valid stored font presets", () => {
    expect(
      readStoredFontPreset({
        getItem: () => "song",
      })
    ).toBe("song");
    expect(
      readStoredFontPreset({
        getItem: () => "songti",
      })
    ).toBe("song");
  });

  test("ignores invalid or unavailable stored font presets", () => {
    expect(
      readStoredFontPreset({
        getItem: () => "comic-sans",
      })
    ).toBeUndefined();
    expect(readStoredFontPreset(null)).toBeUndefined();
    expect(
      readStoredFontPreset({
        getItem: () => {
          throw new Error("blocked");
        },
      })
    ).toBeUndefined();
  });

  test("reads stored theme names only when they should override the default", () => {
    expect(
      readStoredThemeName({
        getItem: (key) => {
          if (key === "nolo-theme-name") return "purple";
          if (key === "nolo-theme-name-explicit") return null;
          return null;
        },
      })
    ).toBe("iris");

    expect(
      readStoredThemeName({
        getItem: (key) => {
          if (key === "nolo-theme-name") return "forest";
          if (key === "nolo-theme-name-explicit") return null;
          return null;
        },
      })
    ).toBe("wave");

    expect(
      readStoredThemeName({
        getItem: (key) => {
          if (key === "nolo-theme-name") return "graphite";
          if (key === "nolo-theme-name-explicit") return "1";
          return null;
        },
      })
    ).toBe("catppuccin");
  });

  test("normalizes legacy aliases to canonical theme names", () => {
    expect(normalizeThemeName("blue")).toBe("catppuccin");
    expect(normalizeThemeName("ocean")).toBe("catppuccin");
    expect(normalizeThemeName("purple")).toBe("iris");
    expect(normalizeThemeName("graphite")).toBe("catppuccin");
    expect(normalizeThemeName("forest")).toBe("wave");
    expect(normalizeThemeName("neutral")).toBe("catppuccin");
    expect(normalizeThemeName("trail")).toBe("trail");
    expect(normalizeThemeName("missing")).toBeUndefined();
    // ember 主题已下线 → mono（DB 里实际存的是 orange/yellow/red，ember 是 colors.ts 内的 export alias）
    expect(normalizeThemeName("yellow")).toBe("mono");
    expect(normalizeThemeName("orange")).toBe("mono");
    expect(normalizeThemeName("red")).toBe("mono");
    // 新增的 mono 主题自己
    expect(normalizeThemeName("mono")).toBe("mono");
  });

  test("resolves dark mode from theme mode consistently", () => {
    expect(resolveThemeModeIsDark("dark", false)).toBe(true);
    expect(resolveThemeModeIsDark("light", true)).toBe(false);
    expect(resolveThemeModeIsDark("system", true)).toBe(true);
    expect(resolveThemeModeIsDark("system", false)).toBe(false);
  });

  test("resolves preload state from a manual mode", () => {
    expect(
      resolveThemeModePreload({
        storage: { getItem: () => "dark" },
        systemPrefersDark: false,
      })
    ).toEqual({
      themeMode: "dark",
      isDark: true,
    });

    expect(
      resolveThemeModePreload({
        storage: { getItem: () => "light" },
        systemPrefersDark: true,
      })
    ).toEqual({
      themeMode: "light",
      isDark: false,
    });
  });

  test("resolves system mode from the current OS preference", () => {
    expect(
      resolveThemeModePreload({
        storage: { getItem: () => "system" },
        systemPrefersDark: true,
      })
    ).toEqual({
      themeMode: "system",
      isDark: true,
    });

    expect(
      resolveThemeModePreload({
        storage: { getItem: () => null },
        systemPrefersDark: false,
      })
    ).toEqual({
      themeMode: "system",
      isDark: false,
    });
  });
});
