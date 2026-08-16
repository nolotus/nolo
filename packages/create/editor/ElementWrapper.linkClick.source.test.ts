import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
const source = readFileSync(join(import.meta.dir, "ElementWrapper.tsx"), "utf-8");

/**
 * 编辑模式下，链接的纯左键点击应该只放置光标、不触发跳转/新标签，避免破坏编辑上下文。
 * 修饰键（Cmd/Ctrl/Alt/Shift）与中键点击仍走浏览器默认行为。
 *
 * 这份契约测试用源码检查锁住实现要点：
 * 1. 编辑器 wrapper 必须拦截 plain click 阻止默认行为
 * 2. 只在非只读模式下应用该拦截（readOnly 透传时行为不变）
 * 3. 拦截必须挂在 SafeLink 的 onClick 上，而不是替换 SafeLink
 */
describe("ElementWrapper link click suppression in edit mode", () => {
  it("declares a link click handler that suppresses plain left-click without blocking the bubble to Slate", () => {
    expect(source).toContain("handleLinkClick");
    expect(source).toContain("event.preventDefault()");
    // 关键：不能 stopPropagation，否则点击不会冒泡到 Slate 的 onClick，光标无法落位
    expect(source).not.toMatch(/event\.stopPropagation\(\)/);
  });

  it("skips suppression for modifier keys and non-primary buttons", () => {
    // 必须保留 Cmd/Ctrl/Alt/Shift 与中键的默认行为
    expect(source).toContain("event.metaKey");
    expect(source).toContain("event.ctrlKey");
    expect(source).toContain("event.altKey");
    expect(source).toContain("event.shiftKey");
    expect(source).toContain("event.button !== 0");
  });

  it("only attaches the suppressor to SafeLink when not read-only", () => {
    // linkOnClick = readOnly ? undefined : handleLinkClick
    expect(source).toMatch(
      /const\s+linkOnClick\s*=\s*readOnly\s*\?\s*undefined\s*:\s*handleLinkClick/,
    );
    expect(source).toMatch(/onClick=\{linkOnClick\}/);
  });

  it("keeps SafeLink as the link renderer (does not replace it)", () => {
    expect(source).toContain("<SafeLink");
    expect(source).toContain("</SafeLink>");
  });

  it("uses useCallback so the handler identity is stable across renders", () => {
    expect(source).toContain("import React, { Suspense, lazy, useCallback }");
    expect(source).toMatch(
      /useCallback\(\(event:\s*React\.MouseEvent\)\s*=>\s*\{/,
    );
  });
});
