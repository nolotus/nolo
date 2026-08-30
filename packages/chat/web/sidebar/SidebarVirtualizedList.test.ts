import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  estimateVirtualizedMountedRows,
  SIDEBAR_VIRTUAL_ROW_SIZE,
} from "./SidebarVirtualizedList";

const source = readFileSync(
  join(import.meta.dir, "SidebarVirtualizedList.tsx"),
  "utf-8"
);
const sidebarStyles = readFileSync(join(import.meta.dir, "..", "sidebarStyles.ts"), "utf-8");

describe("estimateVirtualizedMountedRows", () => {
  it("returns 0 for empty / invalid inputs", () => {
    expect(estimateVirtualizedMountedRows(0, 640)).toBe(0);
    expect(estimateVirtualizedMountedRows(200, 0)).toBe(0);
    expect(estimateVirtualizedMountedRows(-1, 640)).toBe(0);
  });

  it("caps mounted rows well below N=200 for a typical sidebar viewport", () => {
    // 640px viewport, 36px rows, +1/3 overscan → ceil(640*4/3 / 36) = 24
    const mounted = estimateVirtualizedMountedRows(200, 640, SIDEBAR_VIRTUAL_ROW_SIZE);
    expect(mounted).toBe(24);
    expect(mounted).toBeLessThan(200 * 0.25);
    expect(mounted / 200).toBeLessThan(0.15);
  });

  it("never exceeds data length for short lists", () => {
    expect(estimateVirtualizedMountedRows(5, 640)).toBe(5);
    // Viewport 200px only needs ~8 rows with overscan; N=10 still caps at estimate not N.
    expect(estimateVirtualizedMountedRows(3, 200)).toBe(3);
    expect(estimateVirtualizedMountedRows(10, 200)).toBeLessThanOrEqual(10);
  });

  it("scales overscan with viewport (larger viewport → more mounted, still ≪ 500)", () => {
    const small = estimateVirtualizedMountedRows(500, 400);
    const large = estimateVirtualizedMountedRows(500, 900);
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThan(80);
  });
});

describe("SidebarVirtualizedList source contract", () => {
  it("uses RAC Virtualizer + ListLayout with fixed rowSize", () => {
    expect(source).toContain("from \"react-aria-components/Virtualizer\"");
    expect(source).toContain("layout={ListLayout}");
    expect(source).toContain("layoutOptions={{ rowSize, gap: 0, padding: 0 }}");
    expect(source).toContain("SIDEBAR_VIRTUAL_ROW_SIZE");
  });

  it("keeps the ListBox as the sole scroller (overflow auto + bounded height)", () => {
    expect(source).toContain('className="SidebarVirtualizedList__scroller"');
    // Static scroller styles live in StyleX; only the dynamic `height` prop
    // stays inline (height = "100%" default or caller-provided px/number).
    expect(source).toContain("style={{ height }}");
    const standaloneRule = sidebarStyles.match(
      /scroller:\s*\{[^}]*\}/s
    );
    expect(standaloneRule).toBeTruthy();
    expect(standaloneRule![0]).toContain('display: "block"');
    expect(standaloneRule![0]).toContain("padding: 0");
    expect(standaloneRule![0]).toContain("margin: 0");
    expect(standaloneRule![0]).toContain('overflow: "auto"');
    expect(standaloneRule![0]).toContain("minHeight: 0");
    expect(standaloneRule![0]).toContain('flex: "1 1 auto"');
    expect(standaloneRule![0]).toContain('overscrollBehavior: "contain"');
    // 保留 style containment（防虚拟化列表污染外层计数器/引用），但禁止
    // contain:paint —— paint containment 在三层嵌套 overflow:auto 链里会让
    // 浏览器把本 scroller 当成独立隔离区，wheel 不向可滚动祖先冒泡，
    // 表现为"必须先点一下才能滚"。
    expect(standaloneRule![0]).toContain('contain: "style"');
    expect(standaloneRule![0]).not.toContain("paint");
  });

  it("CSS height chain prevents outer ancestors from stealing scroll", () => {
    expect(sidebarStyles).toContain("scroller");
    expect(sidebarStyles).toContain('overscrollBehavior: "contain"');
    // All View: outer recent-content must NOT be overflow-y:auto
    const recentContent = sidebarStyles.match(
      /allViewRecentContent:\s*\{[^}]*\}/s
    );
    expect(recentContent).toBeTruthy();
    expect(recentContent![0]).toContain('overflow: "hidden"');
    expect(recentContent![0]).not.toContain("overflow-y: auto");
  });
});
