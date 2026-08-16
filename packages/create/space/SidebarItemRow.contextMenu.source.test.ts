import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Source-contract assertion for the right-click context-menu entry on
 * SidebarItemRow. The component has heavy runtime deps (redux, router, db,
 * i18n, react-icons), so a full render harness would be broad new infra.
 * Instead we assert the source contract, mirroring the existing
 * `SidebarItemRow.*.source.test.ts` convention in this directory.
 *
 * Contract: the row root div wires `onContextMenu` into the SAME anchor +
 * activeMenuKey channel the "…" button uses (onMenuAnchorChange +
 * onToggleMenu). This is the deliberate alternative to RAC
 * `MenuTrigger trigger="contextMenu"` because the menu contains a
 * SubmenuTrigger (SidebarMoveToSubmenu) which crashes the virtualizer
 * collection tree with "Unsupported node type: submenutrigger" when the
 * MenuTrigger is mounted inside the row (see SidebarItemMoreMenu.tsx top
 * comment). Editing mode must be skipped so the title input keeps its native
 * text context menu.
 *
 * Keyboard entry (Shift+F10 / ContextMenu key) is handled at the ListBoxItem
 * layer in SidebarVirtualizedList — NOT on this row. The old onKeyDown wiring
 * on the row root div was dead code: keydown dispatches on the ListBoxItem
 * (where DOM focus lives during arrow-key navigation) bubble up, never down to
 * the row root div, so the handler could never fire on the main path. The
 * reverse assertion below guards against that dead code returning.
 */
describe("SidebarItemRow right-click context menu source contract", () => {
  const source = readFileSync(
    new URL("./SidebarItemRow.tsx", import.meta.url),
    "utf8"
  );

  test("declares a row root ref used as the context-menu anchor", () => {
    expect(source).toContain("rowRef = useRef<HTMLDivElement>(null)");
    expect(source).toContain('ref={rowRef}');
  });

  test("row root div wires onContextMenu", () => {
    expect(source).toContain("onContextMenu={handleRowContextMenu}");
  });

  test("row root div does NOT wire onKeyDown (dead keyboard path)", () => {
    // Keydown on the ListBoxItem (where DOM focus lives) never reaches the row
    // root div, so an onKeyDown here is dead code. Keyboard context-menu is
    // handled via native contextmenu at the ListBoxItem layer instead.
    expect(source).not.toContain("onKeyDown={handleRowKeyDown}");
    expect(source).not.toContain("handleRowKeyDown");
  });

  test("context-menu handler prevents native menu and stops propagation", () => {
    expect(source).toContain("handleRowContextMenu = useCallback(");
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("event.stopPropagation();");
  });

  test("context-menu reuses the anchor + activeMenuKey channel (not a MenuTrigger)", () => {
    // Must report the row element as anchor and open this row's menu via the
    // existing parent-hosted channel — exactly what the "…" button does.
    expect(source).toContain("onMenuAnchorChange?.(contentKey, rowRef.current)");
    expect(source).toContain("onToggleMenu(contentKey)");
    // The forbidden approach must NOT be introduced: no RAC MenuTrigger
    // component usage and no contextMenu trigger prop. (The top-of-file
    // comment may mention MenuTrigger as prose, so assert on JSX/import
    // shapes rather than the bare word.)
    expect(source).not.toContain('trigger="contextMenu"');
    expect(source).not.toMatch(/<MenuTrigger\b/);
    expect(source).not.toMatch(/import\s+.*\bMenuTrigger\b.*from/);
  });

  test("skips context-menu hijack while inline-editing (keeps native text menu)", () => {
    const handlerIdx = source.indexOf("handleRowContextMenu = useCallback(");
    expect(handlerIdx).toBeGreaterThan(-1);
    const block = source.slice(handlerIdx, handlerIdx + 400);
    expect(block).toContain("if (isEditing) return;");
  });
});