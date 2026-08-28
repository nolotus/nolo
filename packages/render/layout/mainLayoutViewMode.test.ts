import { describe, expect, it } from "bun:test";

import {
  getSpaceRouteContext,
  isAllViewRoutePath,
  isSpaceRoutePath,
  shouldForceCategoriesViewMode,
  getRouteDescriptor,
} from "./mainLayoutViewMode";

describe("mainLayoutViewMode", () => {
  it("recognizes all-view routes", () => {
    expect(isAllViewRoutePath("/")).toBe(true);
    expect(isAllViewRoutePath("/share/mine")).toBe(false);
    expect(isAllViewRoutePath("/life/shares")).toBe(false);
    expect(isAllViewRoutePath("/space/01KKY77TT0DA9NY7TNW3R7255N")).toBe(false);
  });

  it("recognizes space routes", () => {
    expect(isSpaceRoutePath("/space/01KKY77TT0DA9NY7TNW3R7255N")).toBe(true);
    expect(isSpaceRoutePath("/space/01KKY77TT0DA9NY7TNW3R7255N/dialog-0e95801d90-01KN6V7RS7WFJ6XX0EMJ2P5T38")).toBe(true);
    expect(isSpaceRoutePath("/")).toBe(false);
  });

  it("parses space route context once for both root and nested routes", () => {
    expect(getSpaceRouteContext("/space/01KKY77TT0DA9NY7TNW3R7255N")).toEqual({
      isSpaceRoute: true,
      isSpaceRootRoute: true,
      spaceId: "01KKY77TT0DA9NY7TNW3R7255N",
      routeSection: "root",
    });
    expect(
      getSpaceRouteContext(
        "/space/01KKY77TT0DA9NY7TNW3R7255N/dialog-0e95801d90-01KN6V7RS7WFJ6XX0EMJ2P5T38"
      )
    ).toEqual({
      isSpaceRoute: true,
      isSpaceRootRoute: false,
      spaceId: "01KKY77TT0DA9NY7TNW3R7255N",
      routeSection: "content",
    });
    expect(getSpaceRouteContext("/")).toEqual({
      isSpaceRoute: false,
      isSpaceRootRoute: false,
      spaceId: null,
      routeSection: null,
    });
  });

  it("forces categories mode on space routes when needed", () => {
    expect(
      shouldForceCategoriesViewMode(
        "/space/01KKY77TT0DA9NY7TNW3R7255N",
        "all"
      )
    ).toBe(true);
    expect(
      shouldForceCategoriesViewMode(
        "/space/01KKY77TT0DA9NY7TNW3R7255N/dialog-0e95801d90-01KN6V7RS7WFJ6XX0EMJ2P5T38",
        "all"
      )
    ).toBe(true);
    expect(
      shouldForceCategoriesViewMode(
        "/space/01KKY77TT0DA9NY7TNW3R7255N",
        "categories"
      )
    ).toBe(false);
    expect(shouldForceCategoriesViewMode("/", "all")).toBe(false);
  });

  describe("getRouteDescriptor", () => {
    it("recognizes global main/nav routes", () => {
      expect(getRouteDescriptor("/")).toEqual({
        routeKind: "global",
        spaceId: null,
        routeSection: null,
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "global-nav",
      });
      expect(getRouteDescriptor("/explore")).toEqual({
        routeKind: "global",
        spaceId: null,
        routeSection: null,
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "global-nav",
      });
      expect(getRouteDescriptor("/pricing")).toEqual({
        routeKind: "global",
        spaceId: null,
        routeSection: null,
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "global-nav",
      });
    });

    it("recognizes space sub-sections", () => {
      expect(getRouteDescriptor("/space/01KKY77TT")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "root",
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "space-root",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/files")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "files",
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "space-files",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/members")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "members",
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "space-members",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/ai")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "ai",
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "space-ai",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/settings")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "settings",
        contentKey: null,
        contentKeyType: "unknown",
        topbarMode: "space-settings",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/scheduled")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "scheduled",
        contentKeyType: "other",
        topbarMode: "content",
      });
    });

    it("recognizes content pages in space", () => {
      expect(getRouteDescriptor("/space/01KKY77TT/dialog-abc")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "dialog-abc",
        contentKeyType: "dialog",
        topbarMode: "content",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/agent-123")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "agent-123",
        contentKeyType: "agent",
        topbarMode: "content",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/cybot-123")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "cybot-123",
        // legacy cybot- 内容键归一为 agent
        contentKeyType: "agent",
        topbarMode: "content",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/meta-table456")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "meta-table456",
        contentKeyType: "meta",
        topbarMode: "content",
      });
      expect(getRouteDescriptor("/space/01KKY77TT/task-789")).toEqual({
        routeKind: "space",
        spaceId: "01KKY77TT",
        routeSection: "content",
        contentKey: "task-789",
        contentKeyType: "task",
        topbarMode: "content",
      });
    });

    it("recognizes global content pages", () => {
      expect(getRouteDescriptor("/dialog-global")).toEqual({
        routeKind: "global",
        spaceId: null,
        routeSection: "content",
        contentKey: "dialog-global",
        contentKeyType: "dialog",
        topbarMode: "content",
      });
      expect(getRouteDescriptor("/agent-global")).toEqual({
        routeKind: "global",
        spaceId: null,
        routeSection: "content",
        contentKey: "agent-global",
        contentKeyType: "agent",
        topbarMode: "content",
      });
    });
  });
});
