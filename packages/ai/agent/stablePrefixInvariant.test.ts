import { describe, expect, it } from "bun:test";
import { buildSystemPromptContext, type AgentRuntimeConfig } from "./buildSystemPrompt";
import { compileContextLayers } from "./contextCompiler";
import type { Contexts } from "../types";

describe("stablePrefixInvariant", () => {
  const sampleAgentConfig: AgentRuntimeConfig = {
    dbKey: "agent-test-invariant-001",
    name: "Invariant Test Agent",
    provider: "test",
    userId: "user-invariant-test",
    useServerProxy: false,
    updatedAt: "2026-08-01T00:00:00.000Z",
    createdAt: 0,
    isPublic: false,
    prompt: "You are a specialized invariant check agent for prompt caching.",
    model: "gemini-2.5-flash",
    tools: ["web_search", "memory_read", "rememberMemory", "ask_user"],
  };

  describe("Group A: Positive invariant - Stable prefix hash remains byte-for-byte identical across turns", () => {
    it("maintains identical stablePrefixHash and stablePrefixLayerIds when turn-scoped fields change across 4 turns", () => {
      // Shared static/session configuration
      const sharedUserGlobalPrompt = "User prefers precise technical answers.";

      // Mock inputs across 4 turns with varying turn-scoped inputs:
      // dialogSummary, current-time (now), memoryOverlay, appWorkingMemory, editingContext
      const turns: Array<{
        now: Date;
        contexts: Contexts;
      }> = [
        {
          now: new Date("2026-08-01T10:00:00.000Z"),
          contexts: {
            userGlobalPrompt: sharedUserGlobalPrompt,
            dialogSummary: "Turn 1 summary: User inquired about build system.",
            memoryOverlay: "Turn 1 recall: User uses macOS and Bun.",
            appWorkingMemory: "Turn 1 working memory: Drafted package config.",
            editingContext: "Editing file: package.json",
          },
        },
        {
          now: new Date("2026-08-01T10:05:30.123Z"),
          contexts: {
            userGlobalPrompt: sharedUserGlobalPrompt,
            dialogSummary: "Turn 2 summary: User requested prefix cache test suite.",
            memoryOverlay: "Turn 2 recall: User prefers offline CI gates.",
            appWorkingMemory: "Turn 2 working memory: Created test file stub.",
            editingContext: "Editing file: stablePrefixInvariant.test.ts",
          },
        },
        {
          now: new Date("2026-08-01T10:12:00.000Z"),
          contexts: {
            userGlobalPrompt: sharedUserGlobalPrompt,
            dialogSummary: "Turn 3 summary: Execution completed without network API.",
            memoryOverlay: "Turn 3 recall: Strict CI requirement enabled.",
            appWorkingMemory: "Turn 3 working memory: Verified test assertions.",
            editingContext: null,
          },
        },
        {
          now: new Date("2026-08-01T10:20:45.999Z"),
          contexts: {
            userGlobalPrompt: sharedUserGlobalPrompt,
            dialogSummary: "Turn 4 summary: Final review step.",
            memoryOverlay: null,
            appWorkingMemory: null,
            editingContext: "Editing file: README.md",
          },
        },
      ];

      const compiledResults = turns.map((turn) =>
        buildSystemPromptContext({
          agentConfig: sampleAgentConfig,
          contexts: turn.contexts,
          now: turn.now,
          timeZone: "Asia/Shanghai",
        })
      );

      const firstHash = compiledResults[0].cacheProfile.stablePrefixHash;
      const firstLayerIds = compiledResults[0].cacheProfile.stablePrefixLayerIds;
      const firstStableContent = compiledResults[0].stablePrefixContent;

      // 1. Hash is non-empty 8-character hex string
      expect(firstHash).toMatch(/^[0-9a-f]{8}$/);

      // 2. Hash and layer IDs are identical across all turns
      compiledResults.forEach((result, index) => {
        expect(result.cacheProfile.stablePrefixHash).toBe(firstHash);
        expect(result.cacheProfile.stablePrefixLayerIds).toEqual(firstLayerIds);
        expect(result.stablePrefixContent).toBe(firstStableContent);

        // Turn-scoped contents differ across turns
        if (index > 0) {
          expect(result.dynamicContent).not.toBe(compiledResults[0].dynamicContent);
        }
      });
    });
  });

  describe("Group B: Negative disproof - Proves test sensitivity by expecting hash changes when drift occurs", () => {
    it("detects drift when turn-varying content is mistakenly placed into a session-scoped layer", () => {
      // Simulated turn 1 with turn-varying summary inside session scope (bug scenario)
      const turn1Layers = compileContextLayers([
        { id: "identity", owner: "platform", cacheScope: "session", content: "Agent Identity v1" },
        { id: "leaked-turn-summary", owner: "runtime", cacheScope: "session", content: "Turn 1 summary text" },
        { id: "turn-input", owner: "user", cacheScope: "turn", content: "User prompt T1" },
      ]);

      // Simulated turn 2 with turn-varying summary inside session scope
      const turn2Layers = compileContextLayers([
        { id: "identity", owner: "platform", cacheScope: "session", content: "Agent Identity v1" },
        { id: "leaked-turn-summary", owner: "runtime", cacheScope: "session", content: "Turn 2 summary text" },
        { id: "turn-input", owner: "user", cacheScope: "turn", content: "User prompt T2" },
      ]);

      expect(turn1Layers.cacheProfile.stablePrefixHash).not.toBe(
        turn2Layers.cacheProfile.stablePrefixHash
      );
    });

    it("detects hash change when stable layer content changes in buildSystemPromptContext", () => {
      const baseOptions = {
        agentConfig: sampleAgentConfig,
        contexts: { userGlobalPrompt: "Base prompt text" },
        now: new Date("2026-08-01T10:00:00Z"),
      };

      const baseResult = buildSystemPromptContext(baseOptions);

      // Change agent persona (session layer "core-persona")
      const modifiedPersonaResult = buildSystemPromptContext({
        ...baseOptions,
        agentConfig: {
          ...sampleAgentConfig,
          prompt: "Altered agent prompt text for invariant testing.",
        },
      });

      // Change user global prompt (session layer "user-global-prompt")
      const modifiedUserGlobalResult = buildSystemPromptContext({
        ...baseOptions,
        contexts: { userGlobalPrompt: "Modified global prompt text" },
      });

      expect(baseResult.cacheProfile.stablePrefixHash).not.toBe(
        modifiedPersonaResult.cacheProfile.stablePrefixHash
      );

      expect(baseResult.cacheProfile.stablePrefixHash).not.toBe(
        modifiedUserGlobalResult.cacheProfile.stablePrefixHash
      );
    });

    it("detects hash change when stable layer ordering or layer set changes in compileContextLayers", () => {
      const original = compileContextLayers([
        { id: "layer-a", owner: "platform", cacheScope: "static", content: "Content A" },
        { id: "layer-b", owner: "agent", cacheScope: "session", content: "Content B" },
        { id: "turn-layer", owner: "user", cacheScope: "turn", content: "Turn content" },
      ]);

      const reordered = compileContextLayers([
        { id: "layer-b", owner: "agent", cacheScope: "session", content: "Content B" },
        { id: "layer-a", owner: "platform", cacheScope: "static", content: "Content A" },
        { id: "turn-layer", owner: "user", cacheScope: "turn", content: "Turn content" },
      ]);

      const addedStableLayer = compileContextLayers([
        { id: "layer-a", owner: "platform", cacheScope: "static", content: "Content A" },
        { id: "layer-b", owner: "agent", cacheScope: "session", content: "Content B" },
        { id: "layer-c", owner: "platform", cacheScope: "session", content: "Content C" },
        { id: "turn-layer", owner: "user", cacheScope: "turn", content: "Turn content" },
      ]);

      expect(original.cacheProfile.stablePrefixHash).not.toBe(
        reordered.cacheProfile.stablePrefixHash
      );

      expect(original.cacheProfile.stablePrefixHash).not.toBe(
        addedStableLayer.cacheProfile.stablePrefixHash
      );
    });
  });
});
