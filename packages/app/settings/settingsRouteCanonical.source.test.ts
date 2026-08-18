import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("settings route canonical path", () => {
  test("uses /settings as the canonical route and keeps /setting as a legacy redirect", () => {
    const config = readFileSync(join(root, "packages/app/settings/config.ts"), "utf8");
    const routes = readFileSync(join(root, "packages/app/settings/routes.tsx"), "utf8");
    const appRoutes = readFileSync(join(root, "packages/app/web/routes.tsx"), "utf8");
    const topbarUserMenu = readFileSync(join(root, "packages/render/layout/TopbarUserMenu.tsx"), "utf8");

    expect(config).toContain('SETTING: "settings"');
    expect(config).toContain('SETTING_LEGACY: "setting"');
    expect(routes).toContain("export const legacySettingRoutes");
    expect(routes).toContain("useParams");
    expect(routes).toContain('params["*"]');
    expect(routes).toContain("state={location.state}");
    expect(appRoutes).toContain("legacySettingRoutes");
    expect(topbarUserMenu).toContain("navigate(SettingRoutePaths.SETTING");
  });
});
