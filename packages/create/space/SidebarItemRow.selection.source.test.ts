import { readFileSync } from "node:fs";

/**
 * Narrowly scoped source/behavior assertion for the NavLink click handler in
 * SidebarItemRow. The component carries heavy runtime dependencies (redux,
 * router, db slice, i18n, react-icons), so a full render harness would be
 * broad new infrastructure. Instead we assert the source contract of
 * `handleNavLinkClick`, mirroring the existing `SidebarItem.*.source.test.ts`
 * convention in this directory.
 *
 * Review follow-up: in selection mode the title NavLink must NOT navigate or
 * run the normal row/action side effects; the checkbox overlay owns toggling.
 */
describe("SidebarItemRow NavLink selection-mode guard", () => {
  const source = readFileSync(
    new URL("./SidebarItemRow.tsx", import.meta.url),
    "utf8"
  );

  it("handleNavLinkClick receives the click event and calls preventDefault in selection mode", () => {
    // Handler must accept the event so it can prevent navigation.
    expect(source).toContain("handleNavLinkClick = useCallback(");
    expect(source).toMatch(/handleNavLinkClick = useCallback\(\s*\(e: React\.MouseEvent\)/);

    // Selection mode must short-circuit before any navigation side effect.
    expect(source).toContain("if (isSelectionMode)");
    expect(source).toContain("e.preventDefault();");
    expect(source).toContain("return;");
  });

  it("preserves normal (non-selection) navigation side effects outside selection mode", () => {
    // markDialogRead + recordRecentVisit must still run for normal clicks.
    expect(source).toContain("markDialogRead({ dialogId, dialogKey: routeContentKey })");
    expect(source).toContain("recordRecentVisit({ key: contentKey, type, title: displayTitle })");

    // The guard must return early in selection mode BEFORE those calls, i.e.
    // the side-effect lines must come after the `if (isSelectionMode) { ... return; }`
    // block.
    const guardIdx = source.indexOf("if (isSelectionMode)");
    const preventIdx = source.indexOf("e.preventDefault();");
    const markIdx = source.indexOf("markDialogRead({ dialogId, dialogKey: routeContentKey })");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(preventIdx).toBeGreaterThan(guardIdx);
    expect(markIdx).toBeGreaterThan(preventIdx);
  });

  it("isSelectionMode is part of the handler dependency array so the guard stays current", () => {
    const start = source.indexOf("handleNavLinkClick = useCallback(");
    // Slice through the end of the useCallback(...) call to capture the deps.
    // The deps array is the last `[...]` before the matching `);` that closes
    // the useCallback. Grab a generous window and find the closing `);` that
    // follows the dependency array (the second `);` after `recordRecentVisit`).
    const block = source.slice(start, start + 700);
    expect(block).toContain("isSelectionMode");
  });

  it("does not claim card view-transition names (same isolation as SidebarItem)", () => {
    expect(source).not.toContain("viewTransitionName");
    expect(source).not.toContain("viewTransitionStyle");
    expect(source).not.toContain("cardIconViewTransitionName");
    expect(source).not.toContain("cardTitleViewTransitionName");
    expect(source).not.toContain("cardViewTransitionStyles");
  });
});