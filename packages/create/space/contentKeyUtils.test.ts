import { describe, expect, it } from "bun:test";

import {
  buildRoutableContentPath,
  buildScopedPagePath,
  extractActiveRouteKey,
  isAppContentKey,
  isRoutableContentActive,
  normalizeAppRouteId,
  resolveRoutableContentKey,
} from "./contentKeyUtils";

describe("contentKeyUtils app compatibility", () => {
  it("normalizes legacy app content keys to canonical app route keys", () => {
    expect(resolveRoutableContentKey("app-legacy-123", "app", "user-1")).toBe(
      "app-legacy-123"
    );
  });

  it("normalizes bare app ids even without userId", () => {
    expect(resolveRoutableContentKey("01ARZ3NDEKTSV4RRFFQ69G5FAV", "app")).toBe(
      "app-01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("detects and normalizes legacy app content keys", () => {
    expect(isAppContentKey("app-app-1")).toBe(true);
    expect(normalizeAppRouteId("app-app-1")).toBe("app-app-1");
    expect(normalizeAppRouteId("plain-app-id")).toBe("app-plain-app-id");
  });

  it("builds space-scoped content paths without query params", () => {
    expect(buildScopedPagePath("dialog-user-1", "space-demo")).toBe(
      "/space/demo/dialog-user-1"
    );
    expect(
      buildRoutableContentPath({
        contentKey: "plain-doc-id",
        type: "page",
        userId: "user-1",
        spaceId: "space-demo",
      })
    ).toBe("/space/demo/page-user-1-plain-doc-id");
  });
});

describe("isRoutableContentActive URL sync", () => {
  it("extracts the active key from a scoped content path", () => {
    expect(extractActiveRouteKey("/space/demo/page-user-1-doc?tab=x")).toBe(
      "page-user-1-doc"
    );
  });

  it("extracts the agent key from an inbox sub-route", () => {
    expect(extractActiveRouteKey("/agent-user-1-x/inbox")).toBe(
      "agent-user-1-x"
    );
  });

  it("matches active via URL when no route param is available (sidebar case)", () => {
    expect(
      isRoutableContentActive({
        contentKey: "plain-doc-id",
        type: "page",
        userId: "user-1",
        spaceId: "space-demo",
        activePageKey: undefined,
        currentPath: "/space/demo/page-user-1-plain-doc-id",
      })
    ).toBe(true);
  });

  it("does not match a different content path", () => {
    expect(
      isRoutableContentActive({
        contentKey: "plain-doc-id",
        type: "page",
        userId: "user-1",
        spaceId: "space-demo",
        currentPath: "/space/demo/page-user-1-other-doc",
      })
    ).toBe(false);
  });

  it("matches app detail path by default", () => {
    expect(
      isRoutableContentActive({
        contentKey: "app-user-1-demo",
        type: "app",
        spaceId: "space-demo",
        currentPath: "/space/demo/app-user-1-demo",
      })
    ).toBe(true);
  });

  it("still matches app editor path", () => {
    expect(
      isRoutableContentActive({
        contentKey: "app-user-1-demo",
        type: "app",
        spaceId: "space-demo",
        currentPath: "/space/demo/app-user-1-demo?edit=true",
      })
    ).toBe(true);
  });

  it("does not match app with different space or key", () => {
    expect(
      isRoutableContentActive({
        contentKey: "app-user-1-demo",
        type: "app",
        spaceId: "space-other",
        currentPath: "/space/demo/app-user-1-demo",
      })
    ).toBe(false);
  });
});
