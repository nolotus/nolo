import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sidebarStyles = readFileSync(
  join(import.meta.dir, "..", "sidebarStyles.ts"),
  "utf-8"
);
const escapeHatchCss = readFileSync(
  join(import.meta.dir, "..", "chatStylexEscapeHatch.css"),
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
    expect(escapeHatchCss).not.toContain(
      "ChatSidebar__section:has(.CategorySection__content-wrapper:not(.CategorySection__content-wrapper--collapsed))"
    );
  });

  it("lets CategorySection size to content instead of stretching", () => {
    const categorySectionRule = sidebarStyles.match(
      /categorySection:\s*\{[^}]*\}/s
    );
    expect(categorySectionRule).toBeTruthy();
    expect(categorySectionRule![0]).not.toContain("flex: 1");
  });

  it("lets DraggableContainer size to content instead of stretching", () => {
    const draggableRule = sidebarStyles.match(
      /draggableContainer:\s*\{[^}]*\}/s
    );
    expect(draggableRule).toBeTruthy();
    expect(draggableRule![0]).not.toContain("flex: 1");
  });

  it("enforces max-height on category content inner scroll", () => {
    expect(sidebarStyles).toContain('maxHeight: "min(420px, 55vh)"');
    expect(sidebarStyles).toContain("categoryContentInner");
  });

  it("provides overflow hint styles for discoverability", () => {
    expect(sidebarStyles).toContain("overflowHint");
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
    expect(sidebarStyles).toContain("categoryContentWrapperCollapsed");
    expect(sidebarStyles).toContain('gridTemplateRows: "0fr"');
    expect(sidebarStyles).toContain('gridTemplateRows: "1fr"');
    expect(sidebarStyles).toContain('transition: "grid-template-rows 0.25s');
  });

  it("hides the virtualized list scrollbar on web and desktop", () => {
    // After the virtualization migration the RAC ListBox is the scroll
    // container, so the hidden-scrollbar styling moved off content-inner.
    expect(escapeHatchCss).toContain(
      ".SidebarVirtualizedList__scroller::-webkit-scrollbar"
    );
    expect(escapeHatchCss).toContain(
      'html[data-nolo-desktop="1"] .SidebarVirtualizedList__scroller::-webkit-scrollbar'
    );
  });
});

describe("sidebar footer flow", () => {
  it("does not stretch the content area when multiple categories are shown", () => {
    const contentRule = sidebarStyles.match(
      /content:\s*\{[^}]*\}/s
    );
    expect(contentRule).toBeTruthy();
    expect(contentRule![0]).not.toContain("flex: 1");
  });

  it("still lets a single section fill the remaining scroll area", () => {
    const singleSectionRule = sidebarStyles.match(
      /contentSingleSection:\s*\{[^}]*\}/s
    );
    expect(singleSectionRule).toBeTruthy();
    expect(singleSectionRule![0]).toContain("flex: 1");
    expect(singleSectionRule![0]).toContain("minHeight: 0");
  });

  it("pins the type filter above the scroll area instead of a footer", () => {
    expect(sidebarStyles).not.toMatch(/chatSidebarFooter:\s*\{/);
    const filterRule = sidebarStyles.match(
      /sidebarTypeFilter:\s*\{[^}]*\}/s
    );
    expect(filterRule).toBeTruthy();
    expect(filterRule![0]).not.toContain("position: sticky");
  });

  it("keeps the add-category row in the scroll flow at the end of the list", () => {
    const addRowRule = sidebarStyles.match(
      /addCategoryRow:\s*\{[^}]*\}/s
    );
    expect(addRowRule).toBeTruthy();
    expect(addRowRule![0]).not.toContain("position: sticky");
  });
});
