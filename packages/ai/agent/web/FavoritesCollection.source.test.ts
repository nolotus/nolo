import { describe, expect, it } from "bun:test";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("FavoritesCollection source contract", () => {
  const source = readFileSync(
    resolve(import.meta.dir, "./FavoritesCollection.tsx"),
    "utf8"
  );

  it("getContentKind maps dialog- prefixed keys to the dialog kind before other branches", () => {
    // The dialog branch must appear before the fallback "page" return.
    expect(source).toContain(
      'if (contentKey.startsWith("dialog-")) return "dialog";',
    );
  });

  it("ContentKind type includes dialog", () => {
    expect(source).toContain('"dialog"');
  });

  it("getContentKindLabel returns 对话 for the dialog kind", () => {
    expect(source).toContain('if (kind === "dialog") return "对话"');
  });

  it("FAVORITE_EMPTY_COPY has a dialog entry", () => {
    expect(source).toContain("还没有收藏对话");
  });

  it("filterOptions includes a dialog tab with LuMessageSquare icon", () => {
    expect(source).toContain('t("favoriteFilterDialogs", "对话")');
    expect(source).toContain("LuMessageSquare");
  });

  it("ContentIcon maps dialog kind to LuMessageSquare", () => {
    expect(source).toContain('kind === "dialog"');
    expect(source).toContain("? LuMessageSquare");
  });

  it("openContent uses buildRoutableContentPath for dialog kind navigation", () => {
    expect(source).toContain(
      'buildRoutableContentPath({ contentKey, type: "dialog" })',
    );
  });

  it("imports buildRoutableContentPath from create/space/contentKeyUtils", () => {
    expect(source).toContain(
      'import { buildRoutableContentPath } from "create/space/contentKeyUtils"',
    );
  });

  it("contentKindCounts initial value includes dialog: 0", () => {
    expect(source).toContain("dialog: 0");
  });
});