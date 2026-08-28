import { describe, expect, it } from "bun:test";

import {
  filterFavoriteAgentsByQuery,
  normalizeFavoriteAgentSummary,
  resolveFavoriteAgentSummaries,
  resolveMessageInputAgentUi,
} from "./messageInputAgentUi";

describe("messageInputAgentUi", () => {
  it("normalizes empty favorite agent names to the agent key", () => {
    expect(
      normalizeFavoriteAgentSummary("agent-1", {
        name: "   ",
      })
    ).toEqual({
      agentKey: "agent-1",
      name: "agent-1",
    });
  });

  it("keeps image controls for continuous image agents even with text-first base models", () => {
    const result = resolveMessageInputAgentUi({
      agent: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-5.5",
        imageWorkflow: "continuous",
      },
      userId: "user-1",
    });

    expect(result.switchModelQueryUserId).toBe("user-1");
    expect(result.currentModelCapabilities).toEqual({
      hasImageOutput: true,
      hasVision: true,
      provider: "openai",
    });
    expect(result.imageUiConfig?.showControls).toBe(true);
    expect(result.imageUiConfig?.supportsImageConfig).toBe(true);
    expect(result.imageUiConfig?.supportedImageSizes).toEqual(["1K", "2K"]);
  });

  it("exposes registry-backed speed and quality image profiles for google image models", () => {
    const result = resolveMessageInputAgentUi({
      agent: {
        userId: "user-1",
        provider: "google",
        model: "gemini-3-pro-image-preview",
        imageConfig: { enabled: true },
      },
      userId: "user-1",
    });

    expect(result.imageUiConfig?.defaultImageProfileKey).toBe("quality");
    expect(result.imageUiConfig?.waitHint).toContain("25-60");
    expect(
      result.imageUiConfig?.imageProfiles?.map((profile) => ({
        key: profile.key,
        imageModelOverride: profile.imageModelOverride,
      }))
    ).toEqual([
      {
        key: "speed",
        imageModelOverride: "gemini-3.1-flash-image-preview",
      },
      {
        key: "quality",
        imageModelOverride: "gemini-3-pro-image-preview",
      },
    ]);
  });

  it("builds favorite agent summaries only from resolved agent records", () => {
    expect(
      resolveFavoriteAgentSummaries([
        {
          agentKey: "agent-1",
          agent: { name: "Writer" },
        },
        {
          agentKey: "agent-2",
          agent: null,
        },
      ])
    ).toEqual([
      {
        agentKey: "agent-1",
        name: "Writer",
      },
    ]);
  });

  it("filters favorite agents only while agent mentions are active", () => {
    const favoriteAgents = [
      { agentKey: "agent-1", name: "Writer" },
      { agentKey: "agent-2", name: "Researcher" },
    ];

    expect(
      filterFavoriteAgentsByQuery({
        favoriteAgents,
        isAgentMentionActive: true,
        query: "write",
      })
    ).toEqual([{ agentKey: "agent-1", name: "Writer" }]);

    expect(
      filterFavoriteAgentsByQuery({
        favoriteAgents,
        isAgentMentionActive: false,
        query: "",
      })
    ).toEqual([]);
  });

  it("safely resolves agent UI without crashing when agent is null or undefined", () => {
    const result = resolveMessageInputAgentUi({
      agent: undefined as any,
      userId: "user-1",
    });
    expect(result.currentModelCapabilities?.provider).toBe("custom");
    expect(result.imageUiConfig).toBeNull();
  });
});
