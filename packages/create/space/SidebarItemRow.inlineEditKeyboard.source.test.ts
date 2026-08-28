import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Source-contract assertion for the inline-rename keyboard-event boundary in
 * SidebarItemRow. Mirrors the `SidebarItemRow.*.source.test.ts` convention
 * (heavy runtime deps make a full render harness impractical here).
 *
 * Contract: while inline rename is active, the InlineEditInput's onKeyDown
 * MUST stop propagation so the event never reaches the enclosing RAC
 * ListBoxItem. Otherwise F2 bubbles up and re-triggers onItemRename →
 * editSignal → startEditing, which resets editTitle to displayTitle and
 * discards unsaved edits; Enter/Space/arrows also leak into RAC collection
 * activation/navigation. Enter submit and Escape cancel must still run inside
 * the same handler before the event continues.
 *
 * The row-level F2 handler on ListBoxItem (SidebarVirtualizedList) stays
 * intact for non-editing row focus — it is only bypassed while the input
 * owns the event. This test also cross-checks that the ListBoxItem F2 handler
 * still exists in SidebarVirtualizedList so non-editing row focus keeps
 * working.
 */
describe("SidebarItemRow inline-edit keyboard isolation", () => {
  const rowSource = readFileSync(
    new URL("./SidebarItemRow.tsx", import.meta.url),
    "utf8"
  );
  const listSource = readFileSync(
    new URL("../../chat/web/sidebar/SidebarVirtualizedList.tsx", import.meta.url),
    "utf8"
  );

  test("InlineEditInput onKeyDown stops propagation unconditionally at the top", () => {
    // Locate the InlineEditInput onKeyDown handler block.
    const onKeyDownIdx = rowSource.indexOf("onKeyDown={(e) => {");
    expect(onKeyDownIdx).toBeGreaterThan(-1);
    const block = rowSource.slice(onKeyDownIdx, onKeyDownIdx + 1000);

    // stopPropagation must be the first statement in the handler body, before
    // any key-branch logic, so it runs for every key (F2/Enter/Space/arrows).
    const stopIdx = block.indexOf("e.stopPropagation();");
    const enterIdx = block.indexOf('if (e.key === "Enter")');
    const escapeIdx = block.indexOf('else if (e.key === "Escape")');
    expect(stopIdx).toBeGreaterThan(-1);
    expect(enterIdx).toBeGreaterThan(stopIdx);
    expect(escapeIdx).toBeGreaterThan(enterIdx);
  });

  test("Enter submit and Escape cancel behavior are preserved", () => {
    const onKeyDownIdx = rowSource.indexOf("onKeyDown={(e) => {");
    const block = rowSource.slice(onKeyDownIdx, onKeyDownIdx + 1000);
    expect(block).toContain('if (e.key === "Enter")');
    expect(block).toContain("handleEditSubmit()");
    expect(block).toContain('else if (e.key === "Escape")');
    expect(block).toContain("setIsEditing(false)");
  });

  test("the row-level F2 handler still exists in SidebarVirtualizedList for non-editing focus", () => {
    // The input boundary must NOT be implemented by removing the ListBoxItem
    // F2 handler — that would break rename entry when focus is on the row
    // itself (no active input). Cross-check the handler survives untouched.
    expect(listSource).toContain("onKeyDown={(event) => {");
    expect(listSource).toContain('if (event.key !== "F2") return;');
    expect(listSource).toContain("event.preventDefault();");
    expect(listSource).toContain("event.stopPropagation();");
    expect(listSource).toContain("onItemRename?.(item)");
  });
});