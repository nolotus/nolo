import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const settingsCss = readFileSync(join(import.meta.dir, "settings.css"), "utf8");

describe("settings.css responsive layout", () => {
  it("stacks the modal layout at the narrow breakpoint", () => {
    expect(settingsCss).toContain("@media (max-width: 768px)");
    expect(settingsCss).toContain(".SettingsLayout {\n            flex-direction: column;");
    expect(settingsCss).toContain(".SettingsLayout__sidebar {\n            width: 100%;");
    expect(settingsCss).toContain(".SettingsLayout__nav {\n            flex-direction: row;");
  });

  it("keeps horizontal tabs on one line so the row scrolls instead of wrapping", () => {
    expect(settingsCss).toContain(
      ".SettingsLayout__nav .nav-list-item {\n            flex-shrink: 0;\n            white-space: nowrap;\n            width: auto;"
    );
  });

  it("keeps the desktop app modal floating instead of fullscreen on narrow windows", () => {
    expect(settingsCss).toContain(
      ".SettingsModal:not(.SettingsModal--floating) {"
    );
  });

  it("collapses appearance sections into one column at medium widths", () => {
    expect(settingsCss).toContain(".appearance-page .setting-section {\n              grid-template-columns: 1fr;");
    expect(settingsCss).toContain(".appearance-page .section-content {\n              padding-top: var(--space-1);");
  });
});
