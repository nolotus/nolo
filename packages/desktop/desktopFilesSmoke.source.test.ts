import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const smokeSource = () =>
  readFileSync(join(root, "scripts/verify/desktop/smokeInstalledWindowsDesktop.ps1"), "utf8");

describe("Windows desktop files smoke source", () => {
  it("defaults to full smoke and allows release workflows to opt into a lighter mode", () => {
    const source = smokeSource();

    expect(source).toContain('if ($env:NOLO_DESKTOP_SMOKE_MODE)');
    expect(source).toContain('else { "full" }');
    expect(source).toContain('$isReleaseSmoke = $smokeMode -eq "release"');
    expect(source).toContain('if ($isReleaseSmoke)');
  });

  it("keeps production dev tools unavailable while probing the current desktop route map", () => {
    const source = smokeSource();

    expect(source).toContain("/api/read-file");
    expect(source).toContain("Forbidden: dev tool auth required");
    expect(source).toContain("$devToolUnavailable = [int]$devToolResponse.StatusCode -eq 404");
    expect(source).toContain("$devToolGuarded -or $devToolUnavailable");
    expect(source).toContain("Assert-InstalledDesktopRouteMap");
    expect(source).toContain("/api/desktop/clipboard");
    expect(source).toContain('Headers["Access-Control-Allow-Methods"]');
    expect(source).not.toContain("/api/desktop/files/");
    expect(source).toContain("Wait-ForDesktopWindowStartup");
    expect(source).toContain('$i -lt 80');
  });

  it("can opt into an authenticated quick-chat local runtime smoke", () => {
    const source = smokeSource();

    expect(source).toContain("NOLO_DESKTOP_QUICKCHAT_SMOKE");
    expect(source).toContain("NOLO_DESKTOP_QUICKCHAT_SMOKE_AUTH_TOKEN");
    expect(source).toContain("Write-QuickChatSmokeProfile");
    expect(source).toContain("Write-QuickChatSmokeE2eScript");
    expect(source).toContain("NOLO_DESKTOP_E2E_SCRIPT_PATH");
    expect(source).toContain("nolo-desktop-e2e-quick-chat");
    expect(source).toContain(".tool-msg-row");
    expect(source).toContain("tool-card-visible");
    expect(source).toContain("Wait-ForQuickChatToolCardVisible");
    expect(source).toContain("Wait-ForQuickChatSmokeResult");
    expect(source).toContain("Quick-chat desktop smoke requires authentication.");
  });
});
