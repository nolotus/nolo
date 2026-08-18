import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Source-contract assertion for the keyboard context-menu entry on
 * SidebarVirtualizedList. The component renders into RAC ListBoxItem and
 * pulls virtualization deps that make a full render harness broad; we mirror
 * the `*.source.test.ts` convention used for SidebarItemRow and assert the
 * source contract instead.
 *
 * Contract: ListBoxItem carries an `onContextMenu` that ONLY fires when the
 * event target IS the ListBoxItem itself — i.e. the native contextmenu event
 * the browser dispatches on Shift+F10 / ContextMenu key (focus is on the
 * ListBoxItem during arrow-key navigation). Right-click bubbling up from the
 * row child is already handled + stopPropagation'd by SidebarItemRow's
 * handleRowContextMenu, so it must NOT be re-handled here; the
 * `event.target !== event.currentTarget` guard enforces that. In rename mode
 * SidebarItemRow early-returns without stopPropagation, letting the native
 * text menu show — this handler must not hijack that either (same guard).
 */
describe("SidebarVirtualizedList keyboard context-menu source contract", () => {
  const source = readFileSync(
    new URL("./SidebarVirtualizedList.tsx", import.meta.url),
    "utf8"
  );

  test("declares the optional onItemContextMenu prop", () => {
    expect(source).toContain(
      "onItemContextMenu?: (item: T, anchor: HTMLElement) => void;"
    );
  });

  test("ListBoxItem wires onContextMenu with the target===currentTarget guard", () => {
    expect(source).toContain("onContextMenu={(event) => {");
    // Core guard — must not be omitted or rewritten.
    expect(source).toContain("if (event.target !== event.currentTarget) return;");
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("onItemContextMenu?.(item, event.currentTarget as HTMLElement)");
  });

  test("ListBoxItem wires onKeyDown only for F2 rename (context keys still go to native onContextMenu)", () => {
    // F2 rename 入口挂在 ListBoxItem 的 onKeyDown 上(焦点在 ListBoxItem 时才触发)。
    // 上下文菜单键(Shift+F10 / ContextMenu)仍由原生 contextmenu 事件走 onContextMenu,
    // 不在此 onKeyDown 里重复处理。
    expect(source).toContain("<ListBoxItem");
    expect(source).toContain("onKeyDown={(event) => {");
    expect(source).not.toContain('event.key === "F10"');
    expect(source).not.toContain('event.key === "ContextMenu"');
  });
});
