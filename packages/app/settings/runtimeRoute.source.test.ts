import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("settings runtime route source", () => {
  test("registers runtime settings page and desktop-only nav item", () => {
    const config = readFileSync(join(root, "packages/app/settings/config.ts"), "utf8");
    const routes = readFileSync(join(root, "packages/app/settings/routes.tsx"), "utf8");
    const nav = readFileSync(join(root, "packages/app/settings/navItems.ts"), "utf8");
    const locale = readFileSync(join(root, "packages/app/i18n/translations/interface.locale.ts"), "utf8");

    expect(config).toContain('SETTING_RUNTIME: "runtime"');
    expect(routes).toContain('const DesktopRuntime = lazy(() => import("./web/DesktopRuntime"))');
    expect(routes).toContain("SettingRoutePaths.SETTING_RUNTIME");
    expect(nav).toContain("settings.nav.runtime");
    expect(locale).toContain('runtime: "Runtime"');
    expect(locale).toContain('title: "Local provider runtime"');
  });
});
