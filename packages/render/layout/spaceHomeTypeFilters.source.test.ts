import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const topBarSource = readFileSync(join(import.meta.dir, "TopBar.tsx"), "utf-8");
const chatSidebarSource = readFileSync(
  join(import.meta.dir, "..", "..", "chat", "web", "ChatSidebar.tsx"),
  "utf-8"
);
const spaceContentSource = readFileSync(
  join(import.meta.dir, "..", "..", "create", "space", "pages", "SpaceContent.tsx"),
  "utf-8"
);

describe("space home type filters source contract", () => {
  it("does not render the space type filter bar from the topbar", () => {
    expect(topBarSource).not.toContain("SpaceTypeFilterBar");
    expect(topBarSource).not.toContain("renderSpaceTypeFilters");
    expect(topBarSource).not.toContain("topbar__space-filters");
  });

  it("forces the chat sidebar root route to the fixed home visible types", () => {
    expect(chatSidebarSource).toContain("getSpaceRouteContext(location.pathname)");
    expect(chatSidebarSource).toContain('spaceRoute.routeSection === "root"');
    expect(chatSidebarSource).toContain("SPACE_HOME_TOPBAR_VISIBLE_TYPES");
    expect(chatSidebarSource).toContain("? [...SPACE_HOME_TOPBAR_VISIBLE_TYPES]");
  });

  it("uses root type params in space content and keeps filters below the toolbar", () => {
    expect(spaceContentSource).toContain("pickSidebarVisibleTypes(");
    expect(spaceContentSource).toContain(
      "SPACE_HOME_TOPBAR_VISIBLE_TYPES,"
    );
    expect(spaceContentSource).toContain("{!isAiRoute && (");
    expect(spaceContentSource).not.toContain("isScheduledRoute");
  });
});
