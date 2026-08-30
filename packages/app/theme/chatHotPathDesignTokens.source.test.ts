import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

/**
 * OPT-FE-10: chat + render hot-path shells should prefer theme CSS variables
 * (space / radius / semantic padding / text tokens) over hardcoded px/hex.
 */
describe("chat+render hot-path design tokens source contract", () => {
  test("input card shells use radius-md and space/inputPadding tokens", () => {
    const card = read("packages/chat/web/chatInputCardStyles.ts");
    const input = read("packages/chat/web/messageInputStyles.ts");

    expect(card).toContain(
      'borderRadius: "var(--radius-md) var(--radius-md) 0 0"'
    );
    expect(card).toContain('padding: "var(--space-3) var(--space-4)"');
    expect(card).toContain('padding: "var(--inputPadding, 10px 14px)"');

    expect(input).toContain('"var(--radius-md)"');
    expect(input).toContain('"var(--space-3)"');
    expect(input).not.toContain("border-radius: 20px 20px 20px 20px;");
    expect(input).not.toContain("padding: 12px 20px;");
  });

  test("topbar history colors use text tokens instead of bare hex greys", () => {
    const layoutCss = read("packages/render/layout/layout.css");

    expect(layoutCss).toContain(
      ".TopbarUserMenu { position: relative; display: flex; align-items: center; gap: var(--space-2); }"
    );
    expect(layoutCss).toContain(
      "color: var(--textSecondary);\n  opacity: 1;"
    );
    expect(layoutCss).toContain("color: var(--textTertiary);\n  opacity: 0.45;");
    expect(layoutCss).not.toContain("color: #8b94a3;");
    expect(layoutCss).not.toContain("color: #a5adba;");
  });

  test("SPACE scale remains the source of --space-* values", () => {
    const themeConfig = read("packages/app/theme/theme.config.ts");
    expect(themeConfig).toContain('1: "4px"');
    expect(themeConfig).toContain('2: "8px"');
    expect(themeConfig).toContain('3: "12px"');
    expect(themeConfig).toContain('4: "16px"');
    expect(themeConfig).toContain('5: "20px"');
  });
});
