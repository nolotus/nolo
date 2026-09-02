import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "LanguageSwitcher.tsx"), "utf-8");
const styles = readFileSync(join(import.meta.dir, "languageSwitcher.styles.ts"), "utf-8");

describe("LanguageSwitcher iconOnly contract", () => {
  it("supports optional iconOnly prop with compact aria/title and no text label", () => {
    expect(source).toContain("iconOnly?: boolean");
    expect(source).toContain("iconOnly = false");
    expect(source).toContain("iconOnly && langSwitcherStyles.iconOnly");
    expect(source).toContain('{...(iconOnly ? { title: "语言" } : {})}');
    expect(source).toContain("aria-label=\"切换语言\"");
    expect(source).toContain("{!iconOnly && (");
    expect(source).toContain("langSwitcherStyles.current");
    expect(source).toContain("LuLanguages");
  });

  it("defines compact icon-only button styles (StyleX)", () => {
    expect(styles).toContain("iconOnly:");
    expect(styles).toContain("minWidth: 0");
  });
});
