import { readFileSync } from "node:fs";

describe("SidebarItem StyleX layout source contract", () => {
  const source = readFileSync(new URL("./sidebarItemStyles.ts", import.meta.url), "utf8");

  it("keeps inline actions floating so hidden buttons do not reserve row width", () => {
    expect(source).toContain("actions: {");
    expect(source).toContain('position: "absolute"');
    expect(source).toContain('right: "var(--space-2)"');
    expect(source).toContain('top: "50%"');
  });

  it("keeps the readable action surface and hover spacing", () => {
    expect(source).toContain('paddingRight: "92px"');
    expect(source).toContain('backgroundColor: "color-mix(in srgb, var(--surfaceRaised, var(--background)) 40%, transparent)"');
    expect(source).toContain('boxShadow: "0 10px 22px -18px var(--shadowHeavy)');
    expect(source).toContain('width: "24px"');
    expect(source).toContain('height: "24px"');
  });

  it("keeps the icon wrapper as the containing block for overlays", () => {
    expect(source).toContain('iconWrapper: {');
    expect(source).toContain('position: "relative"');
    expect(source).toContain('unreadDot: { position: "absolute"');
    expect(source).toContain('top: "-1px"');
    expect(source).toContain('right: "-1px"');
  });
});
