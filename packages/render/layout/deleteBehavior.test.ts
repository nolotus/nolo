import { describe, expect, it } from "bun:test";

import {
  resolveDeleteSpaceId,
  resolveDeleteSuccessPath,
} from "./deleteBehavior";

describe("delete behavior helpers", () => {
  it("prefers persisted space ids over the current sidebar space", () => {
    expect(
      resolveDeleteSpaceId({
        contentKeyType: "page",
        docSpaceId: "space-doc",
        entitySpaceId: "space-entity",
        currentSpaceId: "space-current",
      })
    ).toBe("space-entity");
  });

  it("does not reuse the current sidebar space for standalone agents", () => {
    expect(
      resolveDeleteSpaceId({
        contentKeyType: "agent",
        currentSpaceId: "space-current",
      })
    ).toBeUndefined();
  });

  it("does not reuse current space for standalone meta content", () => {
    expect(
      resolveDeleteSpaceId({
        contentKeyType: "meta",
        currentSpaceId: "space-current",
      })
    ).toBeUndefined();
  });

  it("reuses the route space for space-scoped dialog routes", () => {
    expect(
      resolveDeleteSpaceId({
        contentKeyType: "dialog",
        routeSpaceId: "space-route",
      })
    ).toBe("space-route");
  });

  it("reuses the route space for space-scoped table routes", () => {
    expect(
      resolveDeleteSpaceId({
        contentKeyType: "meta",
        routeSpaceId: "space-route",
      })
    ).toBe("space-route");
  });

  it("redirects standalone public agent deletions to explore", () => {
    expect(
      resolveDeleteSuccessPath({
        contentKey: "agent-pub-01JW0BJ8N6MCXNSEG4KF1JETM0",
      })
    ).toBe("/explore");
  });

  it("redirects space-scoped deletions to the space home", () => {
    // normalizeSpaceId strips a leading "space-" prefix when present
    expect(
      resolveDeleteSuccessPath({
        contentKey: "page-user-abc",
        routeSpaceId: "space-current",
      })
    ).toBe("/space/current");
    expect(
      resolveDeleteSuccessPath({
        contentKey: "page-user-abc",
        routeSpaceId: "01ABC",
      })
    ).toBe("/space/01ABC");
  });
});


