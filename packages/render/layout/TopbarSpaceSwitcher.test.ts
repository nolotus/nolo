import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "TopbarSpaceSwitcher.tsx"), "utf-8");

describe("TopbarSpaceSwitcher source contract", () => {
  it("keeps the placeholder path instead of hiding the switcher before current space resolves", () => {
    expect(source).not.toContain("if (!space && !loading && !isAllView) return null;");
    expect(source).toContain("const treatAsAll = isAllView || !space?.id;");
    expect(source).toContain('const displayName = treatAsAll ? t("all") : space?.name || t("all");');
  });

  it("uses a stable topbar modifier class instead of relying on parent selectors", () => {
    expect(source).toContain("TpSw--topbar");
  });

  it("supports a sidebar placement with full-width panel anchoring", () => {
    expect(source).toContain('placement?: "topbar" | "sidebar"');
    expect(source).toContain('placement === "sidebar"');
    expect(source).toContain("buttonGroupRef.current ?? chevronBtnRef.current");
    expect(source).toContain("Math.min(rect.width, window.innerWidth - 16)");
    expect(source).toContain("TpSw__panel--sidebar");
  });

  it("keeps all-view label visible while specific space data is loading", () => {
    expect(source).toContain("const isSpaceResolving = loading && !treatAsAll");
    expect(source).toContain("isSpaceResolving ? t(\"loading\") : displayName");
  });

  it("pins create-space action to a fixed footer under the scrollable list", () => {
    expect(source).toContain('className="TpSw__footer"');
    expect(source).toContain('className="TpSw__createBtn"');
    expect(source).toContain('t("create_new_space", "新建空间")');
    // Create action must not sit beside the All option at the top.
    expect(source).not.toContain('style={{ display: "flex", gap: "4px" }}');
  });

  it("uses RAC ListBox for options and keeps create outside the collection", () => {
    expect(source).toContain('from "react-aria-components"');
    expect(source).toContain("ListBox");
    expect(source).toContain("ListBoxItem");
    expect(source).toContain("ListBoxSection");
    expect(source).toContain('selectionMode="single"');
    expect(source).toContain("selectionBehavior=\"replace\"");
    // Panel shell must not fake listbox role; RAC ListBox owns it.
    expect(source).not.toContain('role="listbox"');
    // Footer create action stays outside ListBox markup block intent.
    expect(source).toContain("Sticky footer: create is an action, not a list option");
  });

  it("routes the All option to My Content, not the marketing home", () => {
    expect(source).toContain('getMyRoutePathForTab');
    expect(source).toContain('getMyRoutePathForTab("all")');
    expect(source).toContain("navigate(allViewPath)");
    // Must not hard-code home for the All view.
    expect(source).not.toContain('navigate("/")');
    expect(source).not.toContain('to={treatAsAll ? "/"');
  });
});
