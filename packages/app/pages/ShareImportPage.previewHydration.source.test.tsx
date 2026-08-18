import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "ShareImportPage.tsx"), "utf8");

describe("ShareImportPage preview hydration source contract", () => {
  it("background-fetches the full share when SSR injected preview-only data", () => {
    expect(source).toContain("const isPreviewOnlySharedObject = (value: unknown): boolean =>");
    expect(source).toContain("const shouldHydrateFullShare = isPreviewOnlySharedObject(ssrShared);");
    expect(source).toContain("if (ssrShared && !shouldHydrateFullShare && retrySeed === 0) return;");
    expect(source).toContain("if (!shouldHydrateFullShare) {");
    expect(source).toContain("setLoading(true);");
  });
});
