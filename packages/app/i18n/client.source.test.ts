import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "client.ts"), "utf8");

describe("client i18n bootstrap source contract", () => {
  it("boots from the shared base config without bundling full locale resources", () => {
    expect(source).toContain('import { i18nBaseConfig } from "./i18n.base"');
    expect(source).not.toContain('from "./i18n.config"');
    expect(source).toContain("i18nBaseConfig");
  });
});
