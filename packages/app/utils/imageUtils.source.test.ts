import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 防退化：browser-image-compression 只在上传图片时需要，不应进入首屏同步 bundle。
// 断言源码不含静态 import，且在实际调用处使用动态 import。
describe("imageUtils browser-image-compression import guard", () => {
  test("does not statically import browser-image-compression", () => {
    const source = readFileSync(join(import.meta.dir, "imageUtils.ts"), "utf8");

    // 任何静态 import 形式都禁止
    expect(source).not.toContain('from "browser-image-compression"');
    expect(source).not.toContain("from 'browser-image-compression'");
  });

  test("dynamically imports browser-image-compression at call sites", () => {
    const source = readFileSync(join(import.meta.dir, "imageUtils.ts"), "utf8");

    // 动态 import 必须存在（压缩路径按需加载）
    expect(source).toMatch(
      /import\(\s*["']browser-image-compression["']\s*\)/
    );
  });
});
