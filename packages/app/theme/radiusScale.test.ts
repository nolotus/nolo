import { describe, expect, test } from "bun:test";

describe("radius scale tokens", () => {
  test("exposes xs/sm/md tiers and keeps lg/xl aliases aligned", async () => {
    const { default: settingReducer, selectTheme } = await import(
      "../settings/settingSlice.tsx"
    );

    const baseSettings = settingReducer(undefined, { type: "@@INIT" });

    const themeFor = (overrides: Record<string, unknown>) =>
      selectTheme({
        settings: { ...baseSettings, ...overrides },
      } as any);

    expect(themeFor({ density: "spacious", themeName: "wave" }).radius).toEqual({
      xs: "12px",
      sm: "16px",
      md: "24px",
      lg: "16px",
      xl: "24px",
    });

    const trail = themeFor({ density: "spacious", themeName: "trail" }).radius;
    expect(trail.xs).toBe("12px");
    expect(trail.sm).toBe("17px");
    expect(trail.md).toBe("24px");
    expect(trail.lg).toBe(trail.sm);
    expect(trail.xl).toBe(trail.md);

    expect(themeFor({ density: "compact", themeName: "wave" }).radius).toEqual({
      xs: "10px",
      sm: "14px",
      md: "20px",
      lg: "14px",
      xl: "20px",
    });
  });
});