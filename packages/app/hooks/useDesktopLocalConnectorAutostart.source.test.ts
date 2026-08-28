import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "useDesktopLocalConnectorAutostart.ts"), "utf8");
const appSource = readFileSync(join(import.meta.dir, "..", "web", "App.tsx"), "utf8");

describe("useDesktopLocalConnectorAutostart source contract", () => {
  it("starts the desktop local connector from the signed-in desktop session", () => {
    expect(source).toContain("getIsDesktopApp()");
    expect(source).toContain("useToken");
    expect(source).toContain("selectCurrentServer");
    expect(source).toContain("startDesktopLocalConnectorFromSession");
    expect(appSource).toContain("useDesktopLocalConnectorAutostart();");
  });
});
