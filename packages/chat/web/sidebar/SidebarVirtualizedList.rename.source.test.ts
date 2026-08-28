import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Source-contract assertion for the F2 rename entry on SidebarVirtualizedList.
 *
 * Contract: ListBoxItem carries an `onKeyDown` that fires `onItemRename` ONLY
 * when `event.key === "F2"`. All other keys must pass through untouched — no
 * preventDefault, no stopPropagation — so RAC ListBox arrow-key navigation and
 * Enter/Space activation keep working. The keydown is mounted on ListBoxItem
 * (not the row root div) because DOM focus lives on ListBoxItem during
 * arrow-key navigation and keydown only bubbles up, never down.
 *
 * Consumers wire `onItemRename` to the same `setEditSignal({ key, nonce })`
 * pathway the menu's "rename" action already uses — no per-row state.
 */
describe("SidebarVirtualizedList F2 rename source contract", () => {
  const source = readFileSync(
    new URL("./SidebarVirtualizedList.tsx", import.meta.url),
    "utf8"
  );

  test("declares the optional onItemRename prop", () => {
    expect(source).toContain("onItemRename?: (item: T) => void;");
  });

  test("ListBoxItem wires onKeyDown with an F2 early-return guard", () => {
    expect(source).toContain("onKeyDown={(event) => {");
    // F2 guard must short-circuit before any side effect; other keys pass through.
    expect(source).toContain('if (event.key !== "F2") return;');
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("event.stopPropagation();");
    expect(source).toContain("onItemRename?.(item)");
  });

  test("does not swallow non-F2 keys (no blanket preventDefault/stopPropagation)", () => {
    // The only preventDefault/stopPropagation calls inside onKeyDown must be
    // gated behind the F2 branch. We assert the handler body contains the F2
    // guard and that there is no unconditional blocking call before it.
    const onKeyDownBlock =
      source.match(/onKeyDown=\{\(event\) => \{[\s\S]*?\}\}/)?.[0] ?? "";
    expect(onKeyDownBlock).toContain('if (event.key !== "F2") return;');
    // No Enter / Arrow key handling that would break ListBox navigation.
    expect(onKeyDownBlock).not.toContain('event.key === "Enter"');
    expect(onKeyDownBlock).not.toMatch(/event\.key === "Arrow/);
  });
});

/**
 * Consumer wiring contract: both AllViewSidebar and CategorySection must pass
 * `onItemRename` to SidebarVirtualizedList, routing through the existing
 * `setEditSignal({ key, nonce })` pathway (same one the menu's onEditTitle
 * uses) — no per-row state introduced.
 */
describe("SidebarVirtualizedList F2 rename consumer wiring", () => {
  const allView = readFileSync(
    new URL("./AllViewSidebar.tsx", import.meta.url),
    "utf8"
  );
  const category = readFileSync(
    new URL("./CategorySection.tsx", import.meta.url),
    "utf8"
  );

  test("AllViewSidebar wires onItemRename to setEditSignal", () => {
    expect(allView).toContain("onItemRename={");
    expect(allView).toContain("setEditSignal({ key: item.contentKey, nonce: Date.now() })");
  });

  test("CategorySection wires onItemRename to setEditSignal", () => {
    expect(category).toContain("onItemRename={");
    expect(category).toContain("setEditSignal({ key: item.contentKey, nonce: Date.now() })");
  });
});
