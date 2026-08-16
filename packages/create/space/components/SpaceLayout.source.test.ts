import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "SpaceLayout.tsx"), "utf-8");

describe("SpaceLayout source contract", () => {
  it("bypasses the space shell for all space-scoped content routes", () => {
    expect(source).toContain('typeof pageKey === "string" && pageKey.length > 0');
    expect(source).toContain('className="space-content-route-shell"');
    expect(source).toContain("if (isContentRoute) {");
  });
});
