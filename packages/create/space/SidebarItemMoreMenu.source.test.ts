import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./SidebarItemMoreMenu.tsx", import.meta.url), "utf8");

describe("SidebarItemMoreMenu app deletion source contract", () => {
  it("uses the internal confirmation modal instead of the native confirm", () => {
    expect(source).not.toContain("window.confirm");
  });

  it("delegates app deletion to the sidebar host", () => {
    expect(source).toContain("onDeleteApp");
    expect(source).toContain('id="delete-app"');
  });
});
