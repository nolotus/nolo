import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("SidebarItem performance source contract", () => {
  const sharedSource = readFileSync(
    new URL("./sidebarItemShared.tsx", import.meta.url),
    "utf8"
  );

  test("does not set card view-transition names (avoids dual-mount collision with detail)", () => {
    // Card icon/title VT names are owned by Space content cards + Agent pages
    // via app/viewTransitions. Active sidebar rows stay mounted next to detail
    // and must not claim the same card-icon-* / card-title-* names.
    expect(sharedSource).not.toContain("viewTransitionName");
  });
});
