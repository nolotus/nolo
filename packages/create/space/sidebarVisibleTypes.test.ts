import { describe, expect, test } from "bun:test";

import {
  ALL_SIDEBAR_VISIBLE_TYPES,
  SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  matchesSidebarVisibleType,
  parseSidebarVisibleTypesSearchParam,
  serializeSidebarVisibleTypesSearchParam,
  withExclusiveSidebarVisibleType,
} from "./sidebarVisibleTypes";

describe("sidebarVisibleTypes search params", () => {
  test("shows tables on the default space home type set", () => {
    expect(SPACE_HOME_TOPBAR_VISIBLE_TYPES).toEqual([
      "agent",
      "dialog",
      "page",
      "app",
      "table",
    ]);
  });

  test("matches app filter for app typed space content", () => {
    expect(
      matchesSidebarVisibleType(
        {
          type: "app",
          contentKey: "app-u1-demo",
          title: "demo app",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        } as any,
        "app"
      )
    ).toBe(true);
  });

  test("exclusive route filters select one type and toggle back to the route default", () => {
    expect(
      withExclusiveSidebarVisibleType(
        SPACE_HOME_TOPBAR_VISIBLE_TYPES,
        "app",
        SPACE_HOME_TOPBAR_VISIBLE_TYPES,
      )
    ).toEqual(["app"]);

    expect(
      withExclusiveSidebarVisibleType(
        ["app"],
        "app",
        SPACE_HOME_TOPBAR_VISIBLE_TYPES,
      )
    ).toEqual(SPACE_HOME_TOPBAR_VISIBLE_TYPES);
  });

  test("parses explicit type lists from the URL", () => {
    expect(parseSidebarVisibleTypesSearchParam("agent")).toEqual(["agent"]);
    expect(parseSidebarVisibleTypesSearchParam("dialog,agent,unknown")).toEqual([
      "dialog",
      "agent",
    ]);
  });

  test("treats all as the full visible-type set", () => {
    expect(parseSidebarVisibleTypesSearchParam("all")).toEqual(
      ALL_SIDEBAR_VISIBLE_TYPES
    );
    expect(serializeSidebarVisibleTypesSearchParam(ALL_SIDEBAR_VISIBLE_TYPES)).toBe(
      "all"
    );
  });

  test("ignores empty and invalid values", () => {
    expect(parseSidebarVisibleTypesSearchParam(null)).toBeNull();
    expect(parseSidebarVisibleTypesSearchParam("")).toBeNull();
    expect(parseSidebarVisibleTypesSearchParam("unknown")).toBeNull();
    expect(serializeSidebarVisibleTypesSearchParam([])).toBeNull();
  });

  test("matches image filter for both legacy image items and new fileCategory image items", () => {
    expect(
      matchesSidebarVisibleType(
        { type: "image", contentKey: "file-u1-1", title: "legacy", pinned: false, createdAt: 1, updatedAt: 1 } as any,
        "image"
      )
    ).toBe(true);

    expect(
      matchesSidebarVisibleType(
        {
          type: "file",
          fileCategory: "image",
          contentKey: "file-u1-2",
          title: "new image",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        } as any,
        "image"
      )
    ).toBe(true);
  });

  test("matches document, video, and audio filters for typed attachments", () => {
    expect(
      matchesSidebarVisibleType(
        {
          type: "file",
          fileCategory: "document",
          contentKey: "file-u1-doc",
          title: "doc attachment",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        } as any,
        "document"
      )
    ).toBe(true);

    expect(
      matchesSidebarVisibleType(
        {
          type: "file",
          fileCategory: "video",
          contentKey: "file-u1-video",
          title: "video attachment",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        } as any,
        "video"
      )
    ).toBe(true);

    expect(
      matchesSidebarVisibleType(
        {
          type: "file",
          fileCategory: "audio",
          contentKey: "file-u1-audio",
          title: "audio attachment",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        } as any,
        "audio"
      )
    ).toBe(true);
  });
});
