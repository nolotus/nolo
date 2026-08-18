import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const allViewSource = readFileSync(
  join(import.meta.dir, "AllViewSidebar.tsx"),
  "utf-8"
);
const pinnedSource = readFileSync(
  join(import.meta.dir, "SidebarPinnedBlock.tsx"),
  "utf-8"
);
const sidebarCss = readFileSync(join(import.meta.dir, "..", "sidebar.css"), "utf-8");

describe("AllViewSidebar virtualization completeness", () => {
  it("routes default recent + search through SidebarVirtualizedList (RecentVirtualList)", () => {
    expect(allViewSource).toContain(
      'import { SidebarVirtualizedList } from "./SidebarVirtualizedList"'
    );
    expect(allViewSource).toContain("const RecentVirtualList");
    expect(allViewSource).toContain("<SidebarVirtualizedList");
    // Both call sites use the shared virtualized list component.
    const recentVirtualListUsages = allViewSource.match(/<RecentVirtualList\b/g) ?? [];
    expect(recentVirtualListUsages.length).toBeGreaterThanOrEqual(2);
    expect(allViewSource).toContain("items={searchedRecentItems}");
    expect(allViewSource).toContain(
      "items={stableRecentItems.filter((i) => !i.pinned && !favoriteKeysSet.has(i.contentKey))}"
    );
  });

  it("does not fall back to unbounded map-render of recent rows", () => {
    // RecentVirtualList must not `.map` items into rows; only SidebarVirtualizedList
    // (or its jsdom mock) may iterate for rendering.
    const recentVirtualListBlock = allViewSource.slice(
      allViewSource.indexOf("const RecentVirtualList"),
      allViewSource.indexOf("const AllViewSidebar")
    );
    expect(recentVirtualListBlock).toContain("<SidebarVirtualizedList");
    expect(recentVirtualListBlock).not.toMatch(/items\.map\s*\(/);
  });

  it("search path uses section--fill so Virtualizer has a bounded height chain", () => {
    expect(allViewSource).toContain(
      'className="AllViewSidebar__section AllViewSidebar__section--fill"'
    );
    expect(sidebarCss).toContain(".AllViewSidebar__section--fill");
    expect(sidebarCss).toContain(
      ".AllViewSidebar__section--fill .AllViewSidebar__section-preview"
    );
    expect(sidebarCss).toContain(
      ".AllViewSidebar__section--fill .AllViewSidebar__search-group"
    );
  });

  it("recent-list is a flex column shell for the ListBox scroller", () => {
    const recentList = sidebarCss.match(
      /\.AllViewSidebar__recent-list\s*\{[^}]*\}/s
    );
    expect(recentList).toBeTruthy();
    expect(recentList![0]).toContain("display: flex");
    expect(recentList![0]).toContain("flex-direction: column");
    expect(recentList![0]).toContain("min-height: 0");
    expect(recentList![0]).toContain("overflow: hidden");
  });

  it("keeps pinned block non-virtual (small-N policy) and documents map render", () => {
    // Pinned rows stay as a full map — expected when pin count is small.
    // If pin volume ever grows past a viewport, promote to SidebarVirtualizedList.
    expect(pinnedSource).toContain("items.map((item) =>");
    expect(pinnedSource).not.toContain("SidebarVirtualizedList");
    // AllView only mounts pinned block when at least one pinned item exists.
    expect(allViewSource).toContain(
      "stableRecentItems.some((i) => i.pinned)"
    );
    expect(allViewSource).toContain("<SidebarPinnedBlock");
  });
});
