import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "LanguageSwitcher.tsx"), "utf-8");
const uiCss = readFileSync(join(import.meta.dir, "../ui.css"), "utf-8");

describe("LanguageSwitcher iconOnly contract", () => {
  it("supports optional iconOnly prop with compact aria/title and no text label", () => {
    expect(source).toContain("iconOnly?: boolean");
    expect(source).toContain("iconOnly = false");
    expect(source).toContain('className={`lang-button${iconOnly ? " lang-button--icon-only" : ""}`}');
    expect(source).toContain('{...(iconOnly ? { title: "语言" } : {})}');
    expect(source).toContain("aria-label=\"切换语言\"");
    expect(source).toContain("{!iconOnly && (");
    expect(source).toContain('className="lang-current"');
    expect(source).toContain("LuLanguages");
  });

  it("defines compact icon-only button styles", () => {
    expect(uiCss).toContain(".lang-button--icon-only");
    expect(uiCss).toContain("min-width: 0");
  });
});
