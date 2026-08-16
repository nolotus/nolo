import { describe, expect, it } from "bun:test";

import {
  buildLegacyAppRouteKey,
  deriveAppIdFromRouteKey,
  resolveAppRouteKey,
} from "./appKeys";

describe("appKeys", () => {
  it("preserves owner-scoped app keys", () => {
    expect(resolveAppRouteKey("app-user-1-app-1", "app-1")).toBe(
      "app-user-1-app-1"
    );
  });

  it("normalizes bare legacy app ids to route keys", () => {
    expect(resolveAppRouteKey(undefined, "legacy-app-id")).toBe(
      buildLegacyAppRouteKey("legacy-app-id")
    );
  });

  it("derives app id from owner-scoped route keys when userId is known", () => {
    expect(deriveAppIdFromRouteKey("app-user-1-app-1", "user-1")).toBe("app-1");
  });
});
