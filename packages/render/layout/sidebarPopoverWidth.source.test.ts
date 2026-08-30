import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layoutCss = readFileSync(join(import.meta.dir, "layout.css"), "utf8");
const switcherSource = readFileSync(
  join(import.meta.dir, "TopbarSpaceSwitcher.tsx"),
  "utf8"
);

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = layoutCss.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, "gm"));
  return matches?.join("\n") ?? "";
}

function lastCssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = layoutCss.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, "gm"));
  return matches?.at(-1) ?? "";
}

function cssBlockContaining(selector: string, content: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = layoutCss.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, "gm"));
  return matches?.find((block) => block.includes(content)) ?? "";
}

describe("sidebar popover width source contract", () => {
  it("keeps the mobile sidebar content below the topbar so the switcher is reachable", () => {
    const mobileSidebarBlock = cssBlockContaining(
      ".MainLayout__sidebar",
      "position: fixed;"
    );
    expect(mobileSidebarBlock).toContain("position: fixed;");
    expect(mobileSidebarBlock).toContain("top: var(--topbar-height);");
    expect(mobileSidebarBlock).toContain("height: auto;");
  });

  it("uses sidebar-specific fixed panel sizing for the portaled space switcher menu", () => {
    expect(switcherSource).toContain("TpSw__panel--sidebar");
    expect(switcherSource).toContain("buttonGroupRef");
    expect(switcherSource).toContain("placement === \"sidebar\"");
    expect(switcherSource).toContain("const panelWidth");
    expect(switcherSource).toContain("width: panelWidth");
    expect(cssBlock(".TpSw__panel")).toContain("box-sizing: border-box;");
    expect(layoutCss).toContain(".TpSw__panel--sidebar");
  });

  it("keeps sidebar panel min-width override after the mobile panel rule", () => {
    const mobilePanelIndex = layoutCss.indexOf(".TpSw__panel { min-width: 200px; }");
    const sidebarOverrideIndex = layoutCss.lastIndexOf(".TpSw__panel--sidebar");

    expect(mobilePanelIndex).toBeGreaterThan(0);
    expect(sidebarOverrideIndex).toBeGreaterThan(mobilePanelIndex);
    expect(lastCssBlock(".TpSw__panel--sidebar")).toContain("min-width: 0;");
  });

  it("keeps the space switcher out of the mobile topbar", () => {
    const mobileTopbarSwitcherBlock = lastCssBlock(".TpSw--topbar");

    expect(mobileTopbarSwitcherBlock).toContain("display: none;");
    expect(layoutCss.indexOf(".TpSw--topbar {\n    display: none;")).toBeGreaterThan(
      layoutCss.indexOf("@media (max-width: 768px)")
    );
  });
});
