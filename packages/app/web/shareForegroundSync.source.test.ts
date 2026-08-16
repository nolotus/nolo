import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("share foreground sync guard", () => {
  test("skips focus-triggered sidebar refresh right after sharing", () => {
    const source = readSource("packages/app/web/App.tsx");

    expect(source).toContain("recentShareCreatedAtRef");
    expect(source).toContain('"nolo:share-created"');
    expect(source).toContain("skipRecentShare");
    expect(source).toContain("fetchSpaceSidebarState(currentSpaceId)");
  });
});
