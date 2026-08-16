import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tsx = readFileSync(join(import.meta.dir, "EmptyState.tsx"), "utf-8");
const css = readFileSync(join(import.meta.dir, "EmptyState.css"), "utf-8");

describe("EmptyState source contract", () => {
  it("keeps the public props surface compatible", () => {
    expect(tsx).toContain("icon: React.ReactNode");
    expect(tsx).toContain("title: string");
    expect(tsx).toContain("description: string");
    expect(tsx).toContain("actionText?: React.ReactNode");
    expect(tsx).toContain("onAction?: () => void");
    expect(tsx).toContain("secondaryAction?:");
    expect(tsx).toContain('size?: "small" | "medium" | "large"');
    expect(tsx).toContain('size = "medium"');
  });

  it("uses external CSS tokens instead of theme-driven style jsx", () => {
    expect(tsx).toContain('import "./EmptyState.css"');
    expect(tsx).not.toContain("useTheme");
    expect(tsx).not.toContain("<style jsx>");
    expect(css).toContain("var(--primary)");
    expect(css).toContain("var(--backgroundElevated");
    expect(css).toContain("var(--textSecondary)");
    expect(css).toContain("var(--border)");
  });

  it("uses a scoped BEM root so agent .empty-state styles cannot collide", () => {
    expect(tsx).toContain("space-empty-state--${size}");
    expect(tsx).not.toContain('className={`empty-state empty-state--${size}`}');
    expect(css).toContain(".space-empty-state--small");
    expect(css).toContain(".space-empty-state--medium");
    expect(css).toContain(".space-empty-state--large");
    expect(css).toContain(".space-empty-state__title");
    expect(css).toContain(".space-empty-state__description");
    expect(css).toContain(".space-empty-state__action--primary");
    expect(css).toContain(".space-empty-state__action--secondary");
    // Must not reintroduce bare global selectors that collide with agent EmptyState
    expect(css).not.toMatch(/(?:^|[\s,{])\.empty-state(?:\s|[,.{:#\[>+~]|$)/m);
    expect(tsx).not.toMatch(/className=\{`empty-state /);
  });

  it("wires focus-visible rings and reduced-motion guards", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("transform: none !important");
  });

  it("renders accessible primary/secondary buttons", () => {
    expect(tsx).toContain('type="button"');
    expect(tsx).toContain('<h3 className="space-empty-state__title">');
  });

  it("keeps description readable width and hierarchy spacing", () => {
    expect(css).toContain("max-width: 40ch");
    expect(css).toContain("line-height: 1.55");
    expect(css).toContain("font-weight: 700");
  });

  it("does not reintroduce the old card wrapper", () => {
    expect(tsx).not.toContain("empty-state__card");
    expect(css).not.toContain("empty-state__card");
  });
});
