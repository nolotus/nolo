import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchesAgentSearch } from "./AddAgentDialog";

const source = readFileSync(join(import.meta.dir, "AddAgentDialog.tsx"), "utf-8");

describe("matchesAgentSearch", () => {
  it("matches name, model, introduction (case-insensitive)", () => {
    const agent = {
      name: "Vision Helper",
      model: "gpt-4o",
      introduction: "Reads images carefully",
      provider: "openai",
    };
    expect(matchesAgentSearch(agent, "vision")).toBe(true);
    expect(matchesAgentSearch(agent, "GPT-4O")).toBe(true);
    expect(matchesAgentSearch(agent, "images")).toBe(true);
    expect(matchesAgentSearch(agent, "openai")).toBe(true);
    expect(matchesAgentSearch(agent, "  vision  ")).toBe(true);
  });

  it("returns true for empty query and false for no match", () => {
    const agent = { name: "Alpha", model: "m1", introduction: "hello" };
    expect(matchesAgentSearch(agent, "")).toBe(true);
    expect(matchesAgentSearch(agent, "   ")).toBe(true);
    expect(matchesAgentSearch(agent, "zzz-nope")).toBe(false);
  });
});

describe("AddAgentDialog search & keyboard source contract", () => {
  it("keeps local search with debounce and clear control", () => {
    expect(source).toContain("SEARCH_DEBOUNCE_MS");
    expect(source).toContain("search-input");
    expect(source).toContain("clearSearch");
    expect(source).toContain("matchesAgentSearch");
    expect(source).toContain("debouncedSearch");
  });

  it("supports keyboard highlight path (arrows / enter / space)", () => {
    expect(source).toContain("ArrowDown");
    expect(source).toContain("ArrowUp");
    expect(source).toContain("highlightedIndex");
    expect(source).toContain('role="listbox"');
    expect(source).toContain('role="option"');
    expect(source).toContain("activateHighlighted");
    expect(source).toContain("tabIndex={0}");
  });

  it("separates loading / catalog empty / no-match empty states", () => {
    expect(source).toContain("renderLoading");
    expect(source).toContain("renderEmptyCatalog");
    expect(source).toContain("renderNoMatch");
    expect(source).toContain("NoMatchingAgents");
    expect(source).toContain("baseAgents.length === 0");
    expect(source).toContain("visibleAgents.length === 0");
  });

  it("shows selection count and disables confirm when none selected; caps at limit", () => {
    expect(source).toContain("selectedAgentsCount");
    expect(source).toContain("selectionAtLimit");
    expect(source).toContain("disabled={selectedAgents.size === 0}");
    expect(source).toContain("selectionLimitNotice");
    expect(source).toContain("selectedAgents.size >= limit");
  });

  it("clears selection and search when dialog closes", () => {
    expect(source).toContain("setSelectedAgents(new Set())");
    expect(source).toContain('setSearchTerm("")');
    expect(source).toContain("if (!isOpen)");
  });

  it("does not import MessageList or TopBar", () => {
    expect(source).not.toContain("MessageList");
    expect(source).not.toContain("TopBar");
    expect(source).not.toContain("chat/messages");
  });

  it("preserves onAddAgent contract (string | string[])", () => {
    expect(source).toContain(
      "onAddAgent: (agentIds: string | string[]) => void"
    );
    expect(source).toContain("onAddAgent(agentId)");
    expect(source).toContain(
      "onAddAgent(ids.length === 1 ? ids[0] : ids)"
    );
  });

  it("applies preferredCapabilities before search filter", () => {
    const capabilityIdx = source.indexOf("matchesPreferredCapabilities");
    const searchFilterIdx = source.indexOf(
      "baseAgents.filter((item) => matchesAgentSearch"
    );
    expect(capabilityIdx).toBeGreaterThan(-1);
    expect(searchFilterIdx).toBeGreaterThan(capabilityIdx);
  });

  it("keys list items by agent merge id, not index", () => {
    expect(source).toContain("key={agentKey}");
    expect(source).not.toContain("key={index}");
  });
});
