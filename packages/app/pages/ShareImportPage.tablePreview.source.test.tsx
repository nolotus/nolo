import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");

describe("ShareImportPage table preview source contract", () => {
  it("renders a live table preview instead of unsupported fallback", () => {
    expect(source).toContain("shared.type === DataType.TABLE");
    expect(source).toContain("ShareImportPage-table");
    expect(source).toContain("此表暂无可显示的数据");
    expect(source).toContain("本地开发环境");
  });

  it("makes overflow columns discoverable and scrollable on desktop", () => {
    expect(source).toContain("onWheel={handleTableWheel}");
    expect(source).toContain("左右滚动查看更多列");
  });
});
