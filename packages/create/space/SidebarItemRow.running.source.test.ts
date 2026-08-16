import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("SidebarItemRow live running icon source contract", () => {
  const source = readFileSync(new URL("./SidebarItemRow.tsx", import.meta.url), "utf8");

  test("spins dialog icon from activeControllers during local generation", () => {
    expect(source).toContain("useActiveControllers");
    expect(source).toContain("isLiveGenerating");
    expect(source).toContain('dialogStatus === "running" || isLiveGenerating');
    expect(source).toContain("SidebarItem__content-icon--spinning");
    expect(source).toContain("LuLoaderCircle");
  });
});
