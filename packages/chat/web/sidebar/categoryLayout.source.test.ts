import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sidebarCss = readFileSync(
  join(import.meta.dir, "..", "sidebar.css"),
  "utf-8"
);
const categorySectionSource = readFileSync(
  join(import.meta.dir, "CategorySection.tsx"),
  "utf-8"
);
const categoryHeaderSource = readFileSync(
  join(import.meta.dir, "..", "..", "..", "create", "space", "category", "CategoryHeader.tsx"),
  "utf-8"
);

describe("category sidebar layout - content-adaptive sizing (方案 B)", () => {
  it("does not force equal flex space on expanded category sections", () => {
    // The old :has() rule that added flex:1 to expanded sections should be gone
    expect(sidebarCss).not.toContain(
      "ChatSidebar__section:has(.CategorySection__content-wrapper:not(.CategorySection__content-wrapper--collapsed))"
    );
  });

  it("lets CategorySection size to content instead of stretching", () => {
    const categorySectionRule = sidebarCss.match(
      /\.CategorySection\s*\{[^}]*\}/s
    );
    expect(categorySectionRule).toBeTruthy();
    expect(categorySectionRule![0]).not.toContain("flex: 1");
  });

  it("lets DraggableContainer size to content instead of stretching", () => {
    const draggableRule = sidebarCss.match(
      /\.DraggableContainer\s*\{[^}]*\}/s
    );
    expect(draggableRule).toBeTruthy();
    expect(draggableRule![0]).not.toContain("flex: 1");
  });

  it("enforces max-height on category content inner scroll", () => {
    expect(sidebarCss).toContain("max-height: min(420px, 55vh)");
    expect(sidebarCss).toContain(".CategorySection__content-inner");
  });

  it("provides overflow hint styles for discoverability", () => {
    expect(sidebarCss).toContain(".CategorySection__overflow-hint");
  });

  it("does not render overflow affordance in CategorySection component (removed per requirements)", () => {
    expect(categorySectionSource).not.toContain("CategorySection__overflow-hint");
    expect(categorySectionSource).not.toContain("isOverflowing");
  });

  it("shows category badge independently of collapsed state", () => {
    expect(categoryHeaderSource).toContain(
      "{itemCount !== undefined && itemCount > 0 && ("
    );
    expect(categoryHeaderSource).not.toContain(
      "{isCollapsed && itemCount !== undefined && itemCount > 0 && ("
    );
  });

  it("preserves collapse/expand transition styles", () => {
    expect(sidebarCss).toContain("CategorySection__content-wrapper--collapsed");
    expect(sidebarCss).toContain("grid-template-rows: 0fr");
    expect(sidebarCss).toContain("grid-template-rows: 1fr");
    expect(sidebarCss).toContain("transition: grid-template-rows 0.25s");
  });

  it("hides the virtualized list scrollbar on web and desktop", () => {
    // After the virtualization migration the RAC ListBox is the scroll
    // container, so the hidden-scrollbar styling moved off content-inner.
    expect(sidebarCss).toContain(
      ".SidebarVirtualizedList__scroller::-webkit-scrollbar"
    );
    expect(sidebarCss).toContain(
      'html[data-nolo-desktop="1"] .SidebarVirtualizedList__scroller::-webkit-scrollbar'
    );
  });
});

describe("sidebar footer flow", () => {
  it("does not stretch the content area when multiple categories are shown", () => {
    const contentRule = sidebarCss.match(
      /\.ChatSidebar__content\s*\{[^}]*\}/s
    );
    expect(contentRule).toBeTruthy();
    expect(contentRule![0]).not.toContain("flex: 1");
  });

  it("still lets a single section fill the remaining scroll area", () => {
    const singleSectionRule = sidebarCss.match(
      /\.ChatSidebar__content--single-section\s*\{[^}]*\}/s
    );
    expect(singleSectionRule).toBeTruthy();
    expect(singleSectionRule![0]).toContain("flex: 1");
    expect(singleSectionRule![0]).toContain("min-height: 0");
  });

  it("pins the type filter above the scroll area instead of a footer", () => {
    expect(sidebarCss).not.toMatch(/\.ChatSidebar__footer\s*\{/);
    const filterRule = sidebarCss.match(
      /\.SidebarTypeFilter\s*\{[^}]*\}/s
    );
    expect(filterRule).toBeTruthy();
    expect(filterRule![0]).not.toContain("position: sticky");
    expect(filterRule![0]).toContain("flex-shrink: 0");
  });

  it("keeps the add-category row in the scroll flow at the end of the list", () => {
    const addRowRule = sidebarCss.match(
      /\.ChatSidebar__add-category-row\s*\{[^}]*\}/s
    );
    expect(addRowRule).toBeTruthy();
    expect(addRowRule![0]).not.toContain("position: sticky");
  });
});
