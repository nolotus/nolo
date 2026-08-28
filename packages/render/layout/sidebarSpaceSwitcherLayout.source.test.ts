import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layoutDir = import.meta.dir;
const repoRoot = join(layoutDir, "../../..");

const chatSidebarSource = readFileSync(
  join(repoRoot, "packages/chat/web/ChatSidebar.tsx"),
  "utf-8"
);
const sidebarCss = readFileSync(
  join(repoRoot, "packages/chat/web/sidebar.css"),
  "utf-8"
);
const topBarSource = readFileSync(join(layoutDir, "TopBar.tsx"), "utf-8");
const mainLayoutSource = readFileSync(join(layoutDir, "MainLayout.tsx"), "utf-8");
const switcherSource = readFileSync(
  join(layoutDir, "TopbarSpaceSwitcher.tsx"),
  "utf-8"
);
const createMenuSource = readFileSync(
  join(layoutDir, "CreateMenuButton.tsx"),
  "utf-8"
);
const createMenuContainerSource = readFileSync(
  join(layoutDir, "CreateMenuButtonContainer.tsx"),
  "utf-8"
);
const zIndexSource = readFileSync(
  join(repoRoot, "packages/render/styles/zIndex.ts"),
  "utf-8"
);
const layoutCss = readFileSync(join(layoutDir, "layout.css"), "utf-8");

describe("sidebar space switcher layout source contract", () => {
  it("keeps the sidebar header as one row with scope switcher", () => {
    expect(chatSidebarSource).toContain(
      'import TopbarSpaceSwitcher from "render/layout/TopbarSpaceSwitcher";'
    );
    expect(chatSidebarSource).not.toContain("ChatSidebarSearchRow");
    expect(chatSidebarSource).toContain('className="ChatSidebar__scope-wrapper"');
    expect(chatSidebarSource).toContain('<TopbarSpaceSwitcher placement="sidebar" />');
    expect(chatSidebarSource).not.toContain('className="ChatSidebar__scope-row"');
    expect(chatSidebarSource).not.toContain("<CreateMenuButton");
    // Must not force viewMode during space switch loading (races MainLayout).
    expect(chatSidebarSource).not.toContain('dispatch(setViewMode("all"))');
  });

  it("hides the topbar switcher when the left sidebar is configured/present", () => {
    expect(topBarSource).toContain("isSidebarOpen");
    expect(topBarSource).toContain("isSidebarOpen ?? s.isSidebarOpen");
    expect(topBarSource).toContain("showTopbarSpaceSwitcher = false;");
    expect(topBarSource).toContain("<TopbarSpaceSwitcher />");
    expect(mainLayoutSource).toContain("isSidebarOpen={hasSidebar ? isOpen : false}");
  });

  it("keeps Home fixed in the topbar on every route", () => {
    // No-sidebar pages (life, recharge) and workspace both need a stable Home.
    expect(topBarSource).toContain("showTopbarHome = true");
    expect(topBarSource).toContain("TopBar__home");
    expect(topBarSource).toContain('to="/"');
    expect(topBarSource).toContain("LuHouse");
    expect(chatSidebarSource).not.toContain("ChatSidebar__home");
    expect(chatSidebarSource).not.toContain("LuHouse");
  });

  it("keeps TopbarSpaceSwitcher reusable with placement-specific styling", () => {
    expect(switcherSource).toContain(
      'placement?: "topbar" | "sidebar";'
    );
    expect(switcherSource).toContain('placement = "topbar"');
    expect(switcherSource).toContain("`TpSw--${placement}`");
    expect(layoutCss).toContain(".TpSw--sidebar");
  });

  it("keeps sidebar dropdowns above sticky chrome without native tooltip overlays", () => {
    expect(zIndexSource).toContain("dropdown: 1000");
    expect(switcherSource).toContain("zIndex: zIndex.dropdown ?? 1000");
    // CreateMenu now uses the shared Popover (react-aria-components based) instead of an
    // inline zIndex/tooltip overlay. The stable contract is the Popover import + the
    // create-menu-popover className, with no native tooltip overlay dependency.
    expect(createMenuSource).toContain('import { Popover } from "render/web/ui/Popover";');
    expect(createMenuSource).toContain('className="create-menu-popover"');
    expect(createMenuSource).not.toContain('import { Tooltip }');
    expect(createMenuContainerSource).toContain('const createLabel = t("common:create", "新建");');
    expect(createMenuSource).toContain("aria-label={triggerTitle}");
  });

  it("keeps the sidebar header as scope | search", () => {
    // Alignment system: one shared left rail via --sidebar-* tokens.
    expect(sidebarCss).toContain("--sidebar-row-height: 32px;");
    expect(sidebarCss).toContain(".ChatSidebar__top-bar");
    expect(sidebarCss).toContain(".ChatSidebar__scope-wrapper {\n  min-width: 0;");
    expect(sidebarCss).toContain(".ChatSidebar__scope-wrapper .TpSw--sidebar");
    expect(chatSidebarSource).toContain('className="ChatSidebar__search-btn"');
    expect(sidebarCss).not.toContain("ChatSidebar__create-row--searching");
    expect(sidebarCss).not.toContain("SidebarSearchRow");
  });

  it("opens sidebar search as a command palette (mod+k)", () => {
    expect(chatSidebarSource).toContain('className="ChatSidebar__search-btn"');
    expect(chatSidebarSource).toContain("SidebarCommandPalette");
    expect(chatSidebarSource).toContain("COMMAND_PALETTE_SHORTCUT");
    expect(chatSidebarSource).toContain("setCommandPaletteOpen(true)");
    expect(chatSidebarSource).not.toContain('formClassName="ChatSidebar__search-form"');
    expect(chatSidebarSource).not.toContain("setShowSearch(true)");
    expect(chatSidebarSource).not.toContain("SearchInput");
  });

  it("keeps a direct AI plaza entry rendered below the header as a nav row", () => {
    // The accepted design renders /explore as an AllViewSidebar__nav-row below the
    // header in ChatSidebar.tsx, not as a plaza icon/link inside the fixed header.
    // The className is now a function so the NavLink can resolve `isActive` and
    // attach `active` automatically (the project's `NavLink` only does that when
    // className is a function — see packages/render/layout/blocks/NavListItem.tsx).
    expect(chatSidebarSource).toContain("AllViewSidebar__nav-row");
    expect(chatSidebarSource).toContain("isActive");
    expect(chatSidebarSource).toContain('to="/explore"');
    expect(chatSidebarSource).toContain("LuSparkles");
    expect(chatSidebarSource).toContain('t("common:explorePlaza", "探索")');
    expect(sidebarCss).toContain(".AllViewSidebar__nav-row");
    // Nav chrome sizes follow the sidebar alignment tokens.
    expect(sidebarCss).toContain(
      "min-height: var(--sidebar-row-height);"
    );
    expect(sidebarCss).toContain(
      "width: var(--sidebar-icon-size);"
    );
    // No plaza-slot/plaza-link header chrome expectation remains.
    expect(chatSidebarSource).not.toContain('ChatSidebar__plaza-slot');
    expect(chatSidebarSource).not.toContain('ChatSidebar__plaza-link');
    // The raw string className form should be gone now that className is a function.
    expect(chatSidebarSource).not.toContain('className="AllViewSidebar__nav-row"');
  });
});
