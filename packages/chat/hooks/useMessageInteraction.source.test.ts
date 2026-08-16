import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "useMessageInteraction.ts"),
  "utf-8"
);

describe("useMessageInteraction source contract", () => {
  it("does not classify hover-capable desktops as touch devices", () => {
    expect(source).toContain('window.matchMedia("(hover: hover) and (pointer: fine)").matches');
    expect(source).toContain("if (canHover) return false;");
  });

  it("still treats coarse pointers as touch devices", () => {
    expect(source).toContain('window.matchMedia("(pointer: coarse)").matches');
    expect(source).toContain("if (coarsePointer) return true;");
  });
});
