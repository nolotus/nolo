import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

describe("SecretsConfig source contract", () => {
  it("offers WEREAD_API_KEY as a common key preset", () => {
    const source = readFileSync(join(import.meta.dir, "SecretsConfig.tsx"), "utf8");
    expect(source).toContain('const WEREAD_SECRET_KEY = "WEREAD_API_KEY"');
    expect(source).toContain("key: WEREAD_SECRET_KEY");
    expect(source).toContain("微信读书");
  });

  it("prefills the key field from settings deep links", () => {
    const source = readFileSync(join(import.meta.dir, "SecretsConfig.tsx"), "utf8");
    expect(source).toContain("new URLSearchParams(window.location.search)");
    expect(source).toContain('params.get("key")');
    expect(source).toContain("https://weread.qq.com/r/weread-skills");
  });
});
