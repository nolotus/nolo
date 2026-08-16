import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const topBarSource = readFileSync(join(import.meta.dir, "TopBar.tsx"), "utf-8");
const layoutCss = readFileSync(join(import.meta.dir, "layout.css"), "utf-8");

describe("topbar global actions source contract", () => {
  it("places pricing and downloads in the topbar center", () => {
    const centerIndex = topBarSource.indexOf('className="topbar__center"');
    const globalActionsIndex = topBarSource.indexOf('className="topbar__nav-group"');
    const rightIndex = topBarSource.indexOf('className="topbar__section topbar__section--right"');

    expect(topBarSource).toContain('className="topbar__nav-group"');
    expect(globalActionsIndex).toBeGreaterThan(centerIndex);
    expect(globalActionsIndex).toBeLessThan(rightIndex);
    const globalActionsBlockStart = topBarSource.lastIndexOf("{s.hasMounted", globalActionsIndex);
    const globalActionsBlockEnd =
      topBarSource.indexOf("</div>\n            )}", globalActionsIndex) +
      "</div>\n            )}".length;
    const globalActionsBlock = topBarSource.slice(globalActionsBlockStart, globalActionsBlockEnd);
    expect(globalActionsBlock).toContain("s.hasMounted");
    expect(globalActionsBlock).toContain('descriptor.topbarMode !== "content"');
    expect(globalActionsBlock).toContain("!s.showPageEditActions");
    expect(globalActionsBlock).toContain('s.contentKeyType !== "dialog"');
    expect(globalActionsBlock).toContain('s.contentKeyType !== "app"');
    expect(globalActionsBlock).toContain("!isDesktopShell");
    expect(globalActionsBlock).toContain("!s.isLoggedIn");
    expect(topBarSource).toContain('to="/pricing"');
    expect(topBarSource).toContain("to={AppRoutePaths.CLIENT_DOWNLOADS}");
    expect(topBarSource).toContain("LuBadgeDollarSign");
    expect(topBarSource).toContain("LuDownload");
    expect(topBarSource).toContain('className="topbar__nav-icon"');
    expect(topBarSource).toContain('t("topbar.pricing", "价格")');
    expect(topBarSource).toContain('t("downloadClient", "下载客户端")');
    expect(topBarSource).toContain("topbar__nav-link");
  });

  it("hides pricing/downloads on desktop shell and iconifies language switcher when logged out", () => {
    expect(topBarSource).toContain("!isDesktopShell");
    expect(topBarSource).toContain("!s.isLoggedIn");
    expect(topBarSource).toContain("<LanguageSwitcher iconOnly />");
    // Login NavListItem stays; logged-in user-area compacts on desktop shell
    // (bell + avatar move into the sidebar footer there).
    expect(topBarSource).toContain("path={AppRoutePaths.LOGIN}");
    expect(topBarSource).toContain("topbar__user-area");
    expect(topBarSource).toContain("topbar__user-area--compact");
  });

  it("eager-loads auth-right chrome so post-deploy topbar is not stuck on lazy chunks", () => {
    expect(topBarSource).toContain('import TopbarUserMenu from "./TopbarUserMenu"');
    expect(topBarSource).toContain(
      'import TopbarNotificationBell from "./TopbarNotificationBell"'
    );
    expect(topBarSource).toContain('import CreateMenuButton from "./CreateMenuButtonContainer"');
    expect(topBarSource).not.toContain(
      'const TopbarUserMenu = lazy(() => import("./TopbarUserMenu"))'
    );
    // Guest login no longer waits for hasMounted
    expect(topBarSource).toContain("!s.hasMounted && s.isLoggedIn");
  });

  it("keeps content routes off the generic nav path", () => {
    expect(topBarSource).toContain("getRouteDescriptor(location.pathname)");
    expect(topBarSource).toContain('descriptor.topbarMode !== "content"');
    expect(topBarSource).toContain("s.showFavoriteButton");
  });

  it("places content actions (overflow + side chat) in the topbar right section", () => {
    const rightIndex = topBarSource.indexOf('className="topbar__section topbar__section--right"');

    expect(topBarSource).toContain("isAgentTopbarContent");
    expect(topBarSource).toContain('s.contentKeyType === "agent"');
    expect(topBarSource).toContain("!isAgentTopbarContent && topbarOverflowMenu");
    // Agent page no longer renders the "more" overflow button; its favorite and
    // delete actions are intentionally removed from the agent topbar.
    expect(topBarSource).not.toContain("{isAgentTopbarContent && topbarOverflowMenu}");
    expect(topBarSource).toContain("topbar__button--sidechat");


    const rightContentOverflowIndex = topBarSource.indexOf("!isAgentTopbarContent && topbarOverflowMenu");
    const sideChatIndex = topBarSource.indexOf("topbar__button--sidechat");


    expect(rightContentOverflowIndex).toBeGreaterThan(rightIndex);
    expect(sideChatIndex).toBeGreaterThan(rightIndex);
  });

  it("keeps the topbar actions as restrained native nav items", () => {
    expect(layoutCss).toContain(".topbar__nav-group");
    expect(layoutCss).toContain(".topbar__nav-link");
    expect(layoutCss).toContain(".topbar__nav-link:hover");
    expect(layoutCss).toContain(".topbar__nav-icon");
    expect(layoutCss).toContain(".topbar__nav-link:focus-visible");
    expect(layoutCss).toContain(".topbar__nav-link.is-active");
    expect(layoutCss).toContain("background: transparent;");
    expect(layoutCss).toContain("font-weight: 500;");
    expect(layoutCss).toContain(".topbar__nav-group {\n    display: none;");
  });
});
