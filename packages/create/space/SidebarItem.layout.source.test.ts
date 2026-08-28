import { readFileSync } from "node:fs";

describe("SidebarItem layout source contract", () => {
  const css = readFileSync(new URL("./SidebarItem.css", import.meta.url), "utf8");

  it("keeps inline actions floating so hidden buttons do not reserve row width", () => {
    const sidebarItemRule = css.match(/\.SidebarItem\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const actionsRule = css.match(/\.SidebarItem__actions\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(sidebarItemRule).not.toContain("grid-template-columns: auto 1fr auto");
    expect(actionsRule).toContain("position: absolute");
    expect(actionsRule).toContain("right:");
    expect(actionsRule).toContain("top: 50%");
  });

  it("gives floating actions a readable surface and trims text behind them on hover", () => {
    const actionsRule = css.match(/\.SidebarItem__actions\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const actionsVisibleRule =
      css.match(
        /\.SidebarItem:hover \.SidebarItem__actions,[\s\S]*?\.SidebarItem__actions:focus-within\s*\{[\s\S]*?\n\}/
      )?.[0] ??
      css.match(
        /\.SidebarItem:hover \.SidebarItem__actions,[\s\S]*?\.SidebarItem\[data-open\] \.SidebarItem__actions\s*\{[\s\S]*?\n\}/
      )?.[0] ??
      "";
    const actionButtonRule = css.match(/\.SidebarItem__action-button\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(css).toContain(".SidebarItem:hover .SidebarItem__content-link");
    expect(css).toContain(".SidebarItem[data-open] .SidebarItem__content-link");
    expect(css).toContain(".SidebarItem:focus-within .SidebarItem__content-link");
    expect(css).toContain("padding-right: 92px");
    expect(actionsRule).toContain("background:");
    expect(actionsRule).toContain("border:");
    expect(actionsRule).toContain("box-shadow:");
    expect(actionsVisibleRule).not.toContain("var(--primary)");
    expect(actionButtonRule).toContain("width: 24px");
    expect(actionButtonRule).toContain("height: 24px");
  });

  it("gives icon-wrapper position:relative so the absolute drag handle is contained by it, not the row", () => {
    const iconWrapperRule =
      css.match(/\.SidebarItem__icon-wrapper\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    // .SidebarItem__drag-handle is position:absolute;inset:0 and is meant to
    // overlay the icon area. Without position:relative on icon-wrapper it
    // escapes to .SidebarItem (position:relative) and gets place-items:center'd
    // to the middle of the whole row, landing behind the title text.
    expect(iconWrapperRule).toContain("position: relative");
  });

  it("anchors the unread dot to the icon, not the row", () => {
    const iconWrapperRule =
      css.match(/\.SidebarItem__icon-wrapper\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const unreadDotRule =
      css.match(/\.SidebarItem__unread-dot\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    // The dot is a badge overlaying the icon's top-right corner: it lives
    // inside .SidebarItem__icon-wrapper in SidebarItemRow, and its -1px
    // offsets plus the background-coloured ring only read correctly against a
    // 20px box. It shares icon-wrapper's containing block with the drag
    // handle, so dropping position:relative would fling both onto the row —
    // the dot would land in the top-right corner, colliding with the actions.
    expect(iconWrapperRule).toContain("position: relative");
    expect(unreadDotRule).toContain("position: absolute");
    expect(unreadDotRule).toContain("top: -1px");
    expect(unreadDotRule).toContain("right: -1px");
    expect(unreadDotRule).toContain("box-shadow:");
  });
});
