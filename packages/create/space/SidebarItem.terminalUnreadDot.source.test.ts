import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Regression guard for the "two identical dots on terminal-unread dialog" bug.
// When a dialog is done/failed and unread, the icon-position status-mark already
// implies unread, so the top-right unread-dot must be gated on !showStatusMark.
// The two invariants below are complementary:
//  - the positive toContain fails if the gate is removed (revert -> red);
//  - the negative not.toContain fails if a bare old-form render line is left in
//    or reintroduced anywhere in the row component (residue -> red).
describe("SidebarItem terminal-unread dot regression source contract", () => {
  const rowSource = readFileSync(new URL("./SidebarItemRow.tsx", import.meta.url), "utf8");

  const NEW_GATE = "showUnreadDot && !showStatusMark";
  const OLD_BARE = 'showUnreadDot && <span className="SidebarItem__unread-dot"';

  test("gates the top-right unread dot on !showStatusMark in the row component", () => {
    expect(rowSource).toContain(NEW_GATE);
    expect(rowSource).not.toContain(OLD_BARE);
  });
});
