import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "ImageElement.tsx"), "utf8");

describe("ImageElement a11y source contract", () => {
  it("labels icon-only image chrome buttons for assistive tech", () => {
    expect(source).toContain('aria-label="编辑 Alt 文本"');
    expect(source).toContain('aria-label="预览大图"');
    expect(source).toContain('aria-label="删除图片"');
    expect(source).toContain('type="button"');
  });
});
