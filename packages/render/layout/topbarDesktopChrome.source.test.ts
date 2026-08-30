import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const topBarSource = readFileSync(join(import.meta.dir, "TopBar.tsx"), "utf-8");
const layoutCss = readFileSync(join(import.meta.dir, "layout.css"), "utf-8");
const themeCss = readFileSync(
  join(import.meta.dir, "../../app/theme/theme-ui.css"),
  "utf-8"
);
const chatSidebarStyles = readFileSync(
  join(import.meta.dir, "../../chat/web/sidebarStyles.ts"),
  "utf-8"
);
const chatSidebarEscapeHatch = readFileSync(
  join(import.meta.dir, "../../chat/web/chatStylexEscapeHatch.css"),
  "utf-8"
);
const mainLayoutSource = readFileSync(
  join(import.meta.dir, "MainLayout.tsx"),
  "utf-8"
);

describe("desktop topbar and scrollbar source contract", () => {
  it("moves bell + avatar into the sidebar footer on desktop shell", () => {
    // TopBar keeps only the create button on the right for the desktop shell.
    expect(topBarSource).toContain("topbar__user-area--compact");
    expect(topBarSource).toContain("topbar__auth-placeholder--compact");
    expect(layoutCss).toContain(".topbar__user-area--compact");
    // MainLayout mounts the sidebar user footer for the desktop app only.
    expect(mainLayoutSource).toContain(
      'import("chat/web/sidebar/SidebarUserSection")'
    );
    expect(mainLayoutSource).toContain("{isLoggedIn && (");
    expect(chatSidebarStyles).toContain("sidebarUserSection");
  });

  it("keeps fixed drawers below the injected titlebar + TopBar", () => {
    // Hidden-titlebar mode shifts MainLayout down by --topbar-height; fixed
    // drawers must clear both bars or they cover the TopBar.
    expect(layoutCss).toMatch(
      /html\[data-nolo-desktop-titlebar="hidden"\] \.MainLayout__sidebar,\s*html\[data-nolo-desktop-titlebar="hidden"\] \.MainLayout__rightSidebar \{\s*top: calc\(var\(--topbar-height\) \* 2\);/
    );
  });

  it("hides native desktop scrollbars on all shell scroll containers", () => {
    for (const selector of [".MainLayout__main", ".MainLayout__sidebarContent"]) {
      expect(layoutCss).toContain(`${selector}::-webkit-scrollbar`);
      expect(layoutCss).toContain(`${selector}::-webkit-scrollbar-thumb:hover`);
    }

    expect(chatSidebarEscapeHatch).toContain(".ChatSidebar__scroll-area::-webkit-scrollbar");
    expect(chatSidebarEscapeHatch).toContain(
      ".ChatSidebar__scroll-area:hover::-webkit-scrollbar-thumb"
    );
    expect(chatSidebarStyles).toContain('scrollbarWidth: "thin"');
    expect(themeCss).toContain('html[data-nolo-desktop="1"] body');
    expect(themeCss).toContain('html[data-nolo-desktop="1"] ::-webkit-scrollbar');
    expect(themeCss).toContain("overflow: hidden");
    expect(themeCss).toContain("display: none !important");
  });
});
