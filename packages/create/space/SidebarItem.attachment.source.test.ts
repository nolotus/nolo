import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("SidebarItem attachment source contract", () => {
  const sharedSource = readFileSync(new URL("./sidebarItemShared.tsx", import.meta.url), "utf8");
  const allViewSource = readFileSync(
    new URL("../../chat/web/sidebar/AllViewSidebar.tsx", import.meta.url),
    "utf8"
  );

  test("maps image files to visual pending attachments", () => {
    expect(sharedSource).toContain("export const resolvePendingAttachmentType =");
    expect(sharedSource).toContain('if (type === "file" && fileCategory === "image") return "image";');
  });

  test("forwards fileCategory from all-view sidebar entries", () => {
    expect(allViewSource).toContain('"fileCategory" in item ? item.fileCategory ?? null : null');
  });

  test("lets recent all-view entries use icons without becoming drag handles", () => {
    expect(allViewSource).toContain("disableDrag");
  });
});
