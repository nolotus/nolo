import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dir, "../../..");

describe("MainLayout source contract", () => {
  test("uses the life sidebar shell with bottom user section on life routes", () => {
    const source = readFileSync(
      join(root, "packages/render/layout/MainLayout.tsx"),
      "utf8"
    );

    // life/LifeSidebar 通过变量路径 conditional lazy import（公开集无 life 包）。
    // 测试验证：1) 路径常量存在 2) LifeSidebar 组件被渲染 3) 不直接 import life/LifeSidebarContent。
    expect(source).toContain('"life/LifeSidebar"');
    expect(source).toContain("<LifeSidebar />");
    expect(source).not.toContain('import("life/LifeSidebarContent")');
  });
});