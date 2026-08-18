import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "message-input.css"), "utf-8");

describe("scroll button source contract", () => {
  it("keeps quick scroll controls circular and outside the desktop message action rail", () => {
    expect(css).toContain("--scroll-button-size: 36px;");
    expect(css).toContain("width: max-content;");
    expect(css).toContain("width: var(--scroll-button-size);");
    expect(css).toContain("height: var(--scroll-button-size);");
    expect(css).toContain("min-width: var(--scroll-button-size);");
    expect(css).toContain("min-height: var(--scroll-button-size);");
    expect(css).toContain("aspect-ratio: 1;");
    expect(css).toContain("box-sizing: border-box;");
    expect(css).toContain("flex: 0 0 var(--scroll-button-size);");
    expect(css).toContain("border-radius: 50%;");
    expect(css).toContain("z-index: 4;");
  });
});
