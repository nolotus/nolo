import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const navigationSource = readFileSync(
  join(import.meta.dir, "./components/SpaceNavigation.tsx"),
  "utf8"
);
const routesSource = readFileSync(join(import.meta.dir, "./routes.tsx"), "utf8");
const spaceContentSource = readFileSync(
  join(import.meta.dir, "./pages/SpaceContent.tsx"),
  "utf8"
);

describe("space navigation routes source contract", () => {
  it("keeps My Content–style attachment toggle in the space data tabs", () => {
    // Primary row + collapsible attachment chips (same pattern as MyContentCollection)
    expect(spaceContentSource).toContain("ATTACHMENT_TOGGLE_ID");
    expect(spaceContentSource).toContain("attachments_toggle");
    expect(spaceContentSource).toContain("SPACE_ATTACHMENT_SUB_TYPES");
    expect(spaceContentSource).toContain("space-data-sub-tabs");
    expect(spaceContentSource).toContain("handleAttachmentToggle");
    expect(navigationSource).not.toContain('id: "ai"');
    expect(navigationSource).not.toContain('path: `/space/${spaceId}/ai`');
    expect(navigationSource).not.toContain('id: "scheduled"');
    expect(navigationSource).not.toContain('path: `/space/${spaceId}/scheduled`');
  });

  it("wires files and AI paths to SpaceContent instead of content-page fallback", () => {
    expect(routesSource).toContain('path: "files"');
    expect(routesSource).toContain('path: "ai"');
    expect(routesSource).not.toContain('path: "scheduled"');
    expect(routesSource).toContain("<SpaceContent />");
  });

  it("keeps route subcategory filters mounted below the content toolbar", () => {
    expect(spaceContentSource).toContain("Tabs");
    expect(spaceContentSource).toContain("TabList");
    expect(spaceContentSource).toContain("handleToggleRouteVisibleType");
    expect(spaceContentSource).toContain("SPACE_FILE_TOPBAR_VISIBLE_TYPES");
    expect(spaceContentSource).toContain("SPACE_HOME_TOPBAR_VISIBLE_TYPES");
    expect(spaceContentSource).toContain("{!isAiRoute && (");
    expect(spaceContentSource).toContain("CHAT_SIDEBAR_TYPE_META");
    expect(spaceContentSource).not.toContain("SpaceTypeTabs");
  });

  it("renders the data section header on the home route", () => {
    expect(spaceContentSource).toContain('spaceData", "空间的数据"');
    expect(spaceContentSource).toContain("isHomeRoute");
  });

  it("mounts compact automatic Quick Chat only on Space Home above the data section", () => {
    expect(spaceContentSource).toContain('import QuickChat from "app/pages/QuickChat"');
    expect(spaceContentSource).toContain('surface="space-home-compact"');
    expect(spaceContentSource).toContain("spaceId={spaceId}");
    expect(spaceContentSource).toContain('data-testid="space-home-quick-chat"');
    expect(spaceContentSource).toContain("isHomeRoute && spaceId");
    // Guard: must not mount on /ai or /files paths — gated by isHomeRoute only.
    const quickChatIdx = spaceContentSource.indexOf("space-home-quick-chat");
    const dataSectionIdx = spaceContentSource.indexOf('spaceData", "空间的数据"');
    expect(quickChatIdx).toBeGreaterThan(-1);
    expect(dataSectionIdx).toBeGreaterThan(-1);
    expect(quickChatIdx).toBeLessThan(dataSectionIdx);
    expect(spaceContentSource).not.toContain("surface=\"space-home-compact\" isEmptyState");
  });

  it("guides users to create the first agent when the space has none", () => {
    const featuredAgentSource = readFileSync(
      join(import.meta.dir, "./components/SpaceHomeFeaturedAgent.tsx"),
      "utf8"
    );
    expect(featuredAgentSource).toContain('navigate("/create/agent")');
    expect(featuredAgentSource).toContain("noAgentInSpaceTitle");
    expect(featuredAgentSource).toContain("noAgentInSpaceDesc");
    expect(featuredAgentSource).toContain("createAgent");
  });

  it("uses the shared AgentCard for the space featured agent", () => {
    const featuredAgentSource = readFileSync(
      join(import.meta.dir, "./components/SpaceHomeFeaturedAgent.tsx"),
      "utf8"
    );
    expect(featuredAgentSource).toContain('import AgentCard from "ai/agent/web/AgentCard"');
    expect(featuredAgentSource).toContain("featuredAgents.map");
    expect(featuredAgentSource).toContain("<AgentCard");
    expect(featuredAgentSource).not.toContain("import AgentBlock");
    expect(featuredAgentSource).not.toContain("featuredAgent ?");
  });

  it("limits the featured agent grid to 3 cards", () => {
    const featuredAgentSource = readFileSync(
      join(import.meta.dir, "./components/SpaceHomeFeaturedAgent.tsx"),
      "utf8"
    );
    expect(featuredAgentSource).toContain("FEATURED_AGENT_LIMIT = 3");
    expect(featuredAgentSource).toContain("resolved.length >= FEATURED_AGENT_LIMIT");
  });

  it("defines primary/attachment tabs after handleToggleRouteVisibleType so the dep array does not enter TDZ", () => {
    const handleToggleIdx = spaceContentSource.indexOf("const handleToggleRouteVisibleType");
    const primaryTabsIdx = spaceContentSource.indexOf("const primaryTabs = useMemo");
    const handleDataIdx = spaceContentSource.indexOf("const handleDataTabChange = useCallback");
    expect(handleToggleIdx).toBeGreaterThan(-1);
    expect(primaryTabsIdx).toBeGreaterThan(-1);
    expect(handleDataIdx).toBeGreaterThan(-1);
    expect(handleToggleIdx).toBeLessThan(primaryTabsIdx);
    expect(handleToggleIdx).toBeLessThan(handleDataIdx);
  });
});
