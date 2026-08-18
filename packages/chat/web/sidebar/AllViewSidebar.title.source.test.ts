import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./AllViewSidebar.tsx", import.meta.url),
  "utf8"
);

describe("AllViewSidebar title source contract", () => {
  test("renders recent item titles via SidebarItemRow with a fresh title prop", () => {
    // After the recent-list refactor, AllViewSidebar no longer resolves titles from
    // the entity store itself. Title freshness is carried by each recent-list item
    // and forwarded to SidebarItemRow as the `title` prop (falling back to the
    // "unnamed" placeholder). SidebarItemRow is the authoritative rendering component.
    expect(source).toContain('import SidebarItemRow from "create/space/SidebarItemRow";');
    expect(source).toContain("<SidebarItemRow");
    expect(source).toContain('title={item.title || t("unnamed")}');
  });
});
