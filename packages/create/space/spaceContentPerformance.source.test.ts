import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const spaceContentSource = readFileSync(
  join(import.meta.dir, "./pages/SpaceContent.tsx"),
  "utf8"
);
const spaceContentListSource = readFileSync(
  join(import.meta.dir, "./components/SpaceContentList.tsx"),
  "utf8"
);
const spaceContentBlockSource = readFileSync(
  join(import.meta.dir, "./components/SpaceContentBlock.tsx"),
  "utf8"
);
const agentFetcherSource = readFileSync(
  join(import.meta.dir, "./hooks/useAgentFetcher.ts"),
  "utf8"
);

describe("space content performance source contract", () => {
  it("keeps list action callbacks stable at the page boundary", () => {
    expect(spaceContentSource).toContain("const toggleSelectItem = useCallback(");
    expect(spaceContentSource).toContain("const handleDeleteRequest = useCallback(");
    expect(spaceContentSource).not.toContain(
      'onDelete={(item) => confirmDelete("single", (item as any).contentKey)}'
    );
  });

  it("renders agent grid cards via AgentCard (same as AI plaza)", () => {
    expect(spaceContentListSource).toContain('import AgentCard from "ai/agent/web/AgentCard"');
    expect(spaceContentListSource).toContain("<AgentCard item={agentData} />");
    expect(spaceContentListSource).not.toContain('import AgentBlock from "ai/agent/web/AgentBlock"');
    expect(agentFetcherSource).toContain("const visibleAgentKeysRef = useRef<string[]>([])");
    expect(agentFetcherSource).toContain("const currentVisibleAgentKeys = visibleAgentKeysRef.current;");
    expect(agentFetcherSource).toContain("isTombstoneRecord(agent)");
  });

  it("memoizes the heavy list card components", () => {
    expect(spaceContentListSource).toContain("const SpaceContentList = memo(SpaceContentListComponent);");
    expect(spaceContentBlockSource).toContain("const SpaceContentBlock = memo(SpaceContentBlockComponent);");
  });

  it("has always-on search wired through URL q param and agent map", () => {
    expect(spaceContentSource).toContain('searchParams.get("q")');
    expect(spaceContentSource).toContain("debouncedSearch");
    expect(spaceContentSource).toContain("space-content__header-search");
    expect(spaceContentSource).toContain("agentsMap.get(item.contentKey)");
    // Search is not gated to agent-only tabs anymore
    expect(spaceContentSource).not.toContain("isAgentOnlyTab");
  });

  it("passes searchQuery to the list for empty state differentiation", () => {
    expect(spaceContentListSource).toContain("searchQuery");
    expect(spaceContentListSource).toContain('t("search_no_results")');
    expect(spaceContentListSource).toContain("selectedTypes");
    expect(spaceContentListSource).toContain("no_attachments_in_space");
  });

  it("fetches agents independently of the home tab filter so the featured agent section is never starved", () => {
    expect(spaceContentSource).toContain("allAgentItems");
    expect(spaceContentSource).toContain("useAgentFetcher(allAgentItems)");
    expect(spaceContentSource).not.toContain("useAgentFetcher(baseItems)");
  });

  it("shares card view-transition names via app/viewTransitions (contentKey, selection-safe)", () => {
    expect(spaceContentListSource).toContain('from "app/viewTransitions"');
    expect(spaceContentListSource).toContain("cardViewTransitionStyles");
    expect(spaceContentListSource).toContain("enabled: !isSelectionMode");
    expect(spaceContentListSource).not.toMatch(
      /viewTransitionName:\s*[`'"]card-/
    );

    expect(spaceContentBlockSource).toContain('from "app/viewTransitions"');
    expect(spaceContentBlockSource).toContain("cardViewTransitionStyles");
    expect(spaceContentBlockSource).toContain("enabled: !isSelectionMode");
    expect(spaceContentBlockSource).not.toMatch(
      /viewTransitionName:\s*[`'"]card-/
    );
  });
});
