import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "clientResources.ts"), "utf8");

describe("client locale resource loading source contract", () => {
  it("versions locale JSON requests with the SSR asset timestamp when available", () => {
    expect(source).toContain("__NOLO_ASSETS__?: { timestamp?: string }");
    expect(source).toContain("?.timestamp");
    expect(source).toContain("?v=${encodeURIComponent(version)}");
    expect(source).toContain("/public/locales/${encodeURIComponent(language)}.json${versionQuery}");
  });

  it("keeps same-origin credentials for locale fetches", () => {
    expect(source).toContain('credentials: "same-origin"');
  });
});
