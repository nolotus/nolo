import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("doc sidebar sync source contract", () => {
  it("notifies all-view user-data listeners after creating a page", () => {
    const source = readFileSync(join(import.meta.dir, "createPageAction.ts"), "utf-8");
    expect(source).toContain('window.dispatchEvent(new Event("nolo-user-data-updated"));');
  });

  it("notifies all-view user-data listeners after saving doc title/content", () => {
    const source = readFileSync(join(import.meta.dir, "docStore.ts"), "utf-8");
    expect(source).toContain('window.dispatchEvent(new Event("nolo-user-data-updated"));');
  });
});
