import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "Button.tsx"), "utf-8");
const styles = readFileSync(join(import.meta.dir, "button.styles.ts"), "utf-8");

describe("Button loading state", () => {
  it("renders only the centered spinner while loading", () => {
    expect(source).toContain("const shouldRenderText = hasText && !loading;");
    expect(source).toContain("{loading ? (");
    expect(source).toContain("stylex.props(buttonStyles.spinnerWrap)");
    expect(source).toContain(
      "{shouldRenderText && (\n            <span {...stylex.props(buttonStyles.text)}>{children}</span>\n          )}",
    );
    expect(source).not.toContain("{hasText && <span");
    expect(source).not.toContain("LoadingSpinner");
  });

  it("spinner styles migrated 1:1 into button.styles.ts (StyleX)", () => {
    expect(styles).toContain('borderLeftColor: "currentColor"');
    expect(styles).toContain('borderRightColor: "currentColor"');
    expect(styles).toContain(
      '"color-mix(in srgb, currentColor 36%, transparent)"',
    );
    expect(styles).toContain("rotate(360deg)");
    // animation shorthand 会被 StyleX 丢弃，必须用 longhand
    expect(styles).toContain("animationName: spin");
    expect(styles).toContain('animationDuration: "0.9s"');
    expect(styles).toContain('animationTimingFunction: "linear"');
    expect(styles).toContain('animationIterationCount: "infinite"');
    // .btn-content--loading 覆盖行为保留
    expect(styles).toContain("contentLoading:");
  });

  it("ui.css is gone entirely; Button no longer depends on global classes", () => {
    const { existsSync } = require("node:fs");
    expect(existsSync(join(import.meta.dir, "../ui.css"))).toBe(false);
    expect(source).not.toContain('import "../ui.css"');
    expect(source).not.toContain('"btn-');
  });
});
