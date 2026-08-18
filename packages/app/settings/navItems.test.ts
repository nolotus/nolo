import { describe, expect, it } from "bun:test";
import { buildSettingNavItems } from "./navItems";
import { SettingRoutePaths } from "./config";

const t = (_key: string, fallback: string) => fallback;

describe("settings nav items", () => {
  it("should keep settings navigation focused on user preferences only", () => {
    const items = buildSettingNavItems(t);
    expect(items.some((item) => item.path === "/admin/email")).toBe(false);
    expect(items.some((item) => item.path === "admin/email")).toBe(false);
  });

  it("should keep account page in settings navigation", () => {
    const items = buildSettingNavItems(t);
    expect(items.some((item) => item.path === SettingRoutePaths.SETTING_ACCOUNT)).toBe(
      true
    );
  });

  it("should expose security as a first-level settings page", () => {
    const items = buildSettingNavItems(t);
    expect(
      items.some((item) => item.path === SettingRoutePaths.SETTING_SECURITY)
    ).toBe(true);
  });

  it("should expose developer as a settings navigation item", () => {
    const items = buildSettingNavItems(t);
    expect(
      items.some((item) => item.path === SettingRoutePaths.SETTING_DEVELOPER),
    ).toBe(true);
  });
});
