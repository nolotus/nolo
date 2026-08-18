import { describe, expect, it } from "bun:test";

import { resolveDialogLaunchSpaceId } from "./dialogLaunchScope";
import { PUBLIC_CATALOG_SPACE_ID } from "create/space/publicCatalogSpace";

describe("resolveDialogLaunchSpaceId", () => {
  it("uses routed scope for direct detail pages without inheriting sidebar state", () => {
    expect(
      resolveDialogLaunchSpaceId({
        currentSpaceId: "space-current",
        routeSpaceId: "space-route",
        viewMode: "categories",
      })
    ).toBe("space-route");
  });

  it("lets sidebar-scoped launchers fall back to the selected space", () => {
    expect(
      resolveDialogLaunchSpaceId({
        allowSidebarSpaceFallback: true,
        currentSpaceId: "space-current",
        viewMode: "categories",
      })
    ).toBe("space-current");
  });

  it("prefers explicit record scope before sidebar fallback", () => {
    expect(
      resolveDialogLaunchSpaceId({
        allowSidebarSpaceFallback: true,
        currentSpaceId: "space-current",
        recordSpaceId: "space-record",
        viewMode: "categories",
      })
    ).toBe("space-record");
  });

  it("does not launch chats into the public catalog space", () => {
    expect(
      resolveDialogLaunchSpaceId({
        recordSpaceId: PUBLIC_CATALOG_SPACE_ID,
      })
    ).toBeNull();
  });

  it("prefers current sidebar space over record space when opted in (favorites launch)", () => {
    expect(
      resolveDialogLaunchSpaceId({
        allowSidebarSpaceFallback: true,
        preferCurrentSpaceOverRecord: true,
        currentSpaceId: "space-current",
        recordSpaceId: "space-record",
        viewMode: "categories",
      })
    ).toBe("space-current");
  });

  it("falls back to record space when opted in but viewMode is not categories", () => {
    expect(
      resolveDialogLaunchSpaceId({
        allowSidebarSpaceFallback: true,
        preferCurrentSpaceOverRecord: true,
        currentSpaceId: "space-current",
        recordSpaceId: "space-record",
        viewMode: "grid",
      })
    ).toBe("space-record");
  });

  // Equivalence guard: a public-catalog route must be treated as `route ?? record`
  // evaluated as one unit, so it does NOT fall through to the record space
  // (regression — an earlier refactor split route/record into sequential checks).
  it("does not fall through to record space when the route is the public catalog", () => {
    expect(
      resolveDialogLaunchSpaceId({
        routeSpaceId: PUBLIC_CATALOG_SPACE_ID,
        recordSpaceId: "space-record",
        viewMode: "categories",
      })
    ).toBeNull();
  });
});
