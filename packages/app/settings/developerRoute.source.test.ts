import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("settings developer route source", () => {
  test("registers developer settings page, route, and nav item", () => {
    const config = readFileSync(join(root, "packages/app/settings/config.ts"), "utf8");
    const routes = readFileSync(join(root, "packages/app/settings/routes.tsx"), "utf8");
    const nav = readFileSync(join(root, "packages/app/settings/navItems.ts"), "utf8");
    const page = readFileSync(
      join(root, "packages/app/settings/web/DeveloperConfig.tsx"),
      "utf8",
    );

    expect(config).toContain('SETTING_DEVELOPER: "developer"');
    expect(routes).toContain(
      'const DeveloperConfig = lazy(() => import("./web/DeveloperConfig"))',
    );
    expect(routes).toContain("SettingRoutePaths.SETTING_DEVELOPER");
    expect(nav).toContain("settings.nav.developer");
    expect(nav).toContain("LuBug");
    expect(nav.indexOf("settings.nav.developer")).toBeLessThan(
      nav.indexOf("settings.nav.machines"),
    );
    expect(page).toContain("developerModeEnabled");
    expect(page).toContain("diagnosticModeEnabled");
    expect(page).toContain("ToggleSwitch");
  });

  test("DialogMenu gates copy diagnostics with selectCopyDiagnosticsEnabled", () => {
    const dialogMenu = readFileSync(
      join(root, "packages/render/layout/DialogMenu.tsx"),
      "utf8",
    );
    expect(dialogMenu).toContain("selectCopyDiagnosticsEnabled");
    expect(dialogMenu).toContain("showCopyDiagnostics");
    expect(dialogMenu).toContain("handleCopyDiagnostics");
  });
});
