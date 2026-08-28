import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "routeStyles.js"), "utf8");

describe("share route styles source contract", () => {
  it("builds a dedicated first-paint stylesheet for share detail pages", () => {
    expect(source).toContain('"packages/app/pages/ShareImportPage.css"');
    expect(source).toContain('"packages/chat/messages/web/MessageLayout.css"');
    expect(source).toContain('"share.css"');
  });

  it("exposes the shared generator reused by both one-shot and dev watch builds", () => {
    expect(source).toContain("export const copyRouteStyles");
  });
});
