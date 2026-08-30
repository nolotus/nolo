import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const styles = readFileSync(join(import.meta.dir, "messageInputStyles.ts"), "utf-8");

describe("scroll button source contract", () => {
  it("keeps quick scroll controls circular and outside the desktop message action rail", () => {
    expect(styles).toContain('"--scroll-button-size": "36px"');
    expect(styles).toContain('width: "max-content"');
    expect(styles).toContain('width: "var(--scroll-button-size)"');
    expect(styles).toContain('height: "var(--scroll-button-size)"');
    expect(styles).toContain('minWidth: "var(--scroll-button-size)"');
    expect(styles).toContain('minHeight: "var(--scroll-button-size)"');
    expect(styles).toContain("aspectRatio: 1");
    expect(styles).toContain('boxSizing: "border-box"');
    expect(styles).toContain('flex: "0 0 var(--scroll-button-size)"');
    expect(styles).toContain('borderRadius: "50%"');
    expect(styles).toContain("zIndex: 4");
  });
});
