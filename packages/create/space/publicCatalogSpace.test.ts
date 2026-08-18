import { describe, expect, test } from "bun:test";

import {
  PUBLIC_CATALOG_SPACE_ID,
  ensurePublicCatalogVisibleTypes,
  isPublicCatalogSpace,
  resolvePersistedCatalogVisibleTypes,
} from "./publicCatalogSpace";

describe("publicCatalogSpace", () => {
  test("recognizes the shared public catalog space", () => {
    expect(isPublicCatalogSpace(PUBLIC_CATALOG_SPACE_ID)).toBe(true);
    expect(isPublicCatalogSpace("space-other")).toBe(false);
    expect(isPublicCatalogSpace(null)).toBe(false);
  });

  test("forces agent visibility inside the public catalog space", () => {
    expect(
      ensurePublicCatalogVisibleTypes(PUBLIC_CATALOG_SPACE_ID, [
        "dialog",
        "page",
        "table",
        "app",
      ]),
    ).toEqual(["dialog", "page", "table", "app", "agent"]);
  });

  test("keeps other spaces unchanged", () => {
    expect(
      ensurePublicCatalogVisibleTypes("space-other", [
        "dialog",
        "page",
        "table",
        "app",
      ]),
    ).toEqual(["dialog", "page", "table", "app"]);
  });

  test("does not leak auto-added agent visibility into persisted filters", () => {
    expect(
      resolvePersistedCatalogVisibleTypes(
        PUBLIC_CATALOG_SPACE_ID,
        ["dialog", "page", "table", "app", "agent"],
        ["dialog", "page", "table", "app"],
      ),
    ).toEqual(["dialog", "page", "table", "app"]);
  });

  test("preserves explicit agent visibility if the user already enabled it", () => {
    expect(
      resolvePersistedCatalogVisibleTypes(
        PUBLIC_CATALOG_SPACE_ID,
        ["dialog", "page", "table", "app", "agent"],
        ["dialog", "page", "table", "app", "agent"],
      ),
    ).toEqual(["dialog", "page", "table", "app", "agent"]);
  });
});
