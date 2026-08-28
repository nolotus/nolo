import { describe, expect, test } from "bun:test";
import { mapFilterToVisibleTypes, type SidebarTypeFilterId } from "./SidebarTypeFilter";
import type { SidebarVisibleType } from "create/space/sidebarVisibleTypes";

describe("SidebarTypeFilter", () => {
  describe("mapFilterToVisibleTypes", () => {
    const baseVisibleTypes: SidebarVisibleType[] = ["dialog", "page", "table"];

    test("maps 'all' to baseVisibleTypes", () => {
      expect(mapFilterToVisibleTypes("all", baseVisibleTypes)).toEqual(baseVisibleTypes);
    });

    test("maps 'dialog' to ['dialog']", () => {
      expect(mapFilterToVisibleTypes("dialog", baseVisibleTypes)).toEqual(["dialog"]);
    });

    test("maps 'agent' to ['agent']", () => {
      expect(mapFilterToVisibleTypes("agent", baseVisibleTypes)).toEqual(["agent"]);
    });

    test("maps 'page' to ['page']", () => {
      expect(mapFilterToVisibleTypes("page", baseVisibleTypes)).toEqual(["page"]);
    });

    test("maps 'table' to ['table']", () => {
      expect(mapFilterToVisibleTypes("table", baseVisibleTypes)).toEqual(["table"]);
    });
    
    test("maps 'app' to ['app']", () => {
      expect(mapFilterToVisibleTypes("app", baseVisibleTypes)).toEqual(["app"]);
    });

    test("maps 'attachment' to all attachment types", () => {
      expect(mapFilterToVisibleTypes("attachment", baseVisibleTypes)).toEqual([
        "image", "document", "video", "audio", "file"
      ]);
    });
  });
});
