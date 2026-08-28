import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import {
  buildPublicAgentCatalogList,
  dedupeRemotePublicAgents,
  maskRemoteAgentsByLocalTombstones,
  mergePublicAgentSources,
  planPublicAgentCatalogView,
  planStalePublicAgentPrunes,
  preparePublicAgentCatalogRecords,
} from "./publicAgentCatalog";

describe("publicAgentCatalog", () => {
  it("dedupes remote agents by logical id while keeping the freshest server result", () => {
    const agent = {
      id: "01AAA",
      name: "first",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const duplicate = {
      id: "01AAA",
      name: "second",
      createdAt: "2025-02-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
    };

    expect(dedupeRemotePublicAgents([agent as any, duplicate as any])).toEqual([
      duplicate,
    ] as any);
  });

  it("masks remote records when a newer local tombstone matches by id or dbKey", () => {
    const remote = [
      {
        type: "agent",
        id: "01AAA",
        dbKey: "agent-pub-01AAA",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];
    const tombstones = [
      {
        id: "01AAA",
        dbKey: "agent-pub-01AAA",
        deletedAt: "2025-02-01T00:00:00.000Z",
        updatedAt: "2025-02-01T00:00:00.000Z",
      },
    ];

    expect(maskRemoteAgentsByLocalTombstones(remote as any, tombstones as any)).toEqual(
      []
    );
  });

  it("does not let local tombstones hide public agents owned by another user", () => {
    const remote = [
      {
        type: "agent",
        id: "01REMOTE",
        dbKey: "agent-pub-01REMOTE",
        userId: "publisher-b",
        name: "Remote image agent",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];
    const tombstones = [
      {
        id: "01REMOTE",
        dbKey: "agent-pub-01REMOTE",
        userId: "viewer-a",
        deletedAt: "2025-02-01T00:00:00.000Z",
        updatedAt: "2025-02-01T00:00:00.000Z",
      },
    ];

    expect(
      maskRemoteAgentsByLocalTombstones(remote as any, tombstones as any, {
        currentUserId: "viewer-a",
      })
    ).toEqual(remote as any);
  });

  it("merges local and remote records by logical id and marks local-only records for prune review", () => {
    const local = [
      {
        type: "agent",
        id: "01AAA",
        dbKey: "agent-pub-01AAA",
        name: "local",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        type: "agent",
        id: "01BBB",
        dbKey: "agent-pub-01BBB",
        name: "stale",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];
    const remote = [
      {
        type: "agent",
        id: "01AAA",
        name: "remote",
        introduction: "fresh",
        updatedAt: "2025-02-01T00:00:00.000Z",
      },
    ];

    const result = mergePublicAgentSources(local as any, remote as any);

    expect(result.toDeleteIds).toEqual(["01BBB"]);
    expect(result.merged).toHaveLength(2);
    expect(result.merged.find((agent) => agent.id === "01AAA")).toMatchObject({
      id: "01AAA",
      name: "remote",
      introduction: "fresh",
      dbKey: "agent-pub-01AAA",
    });
  });

  it("plans stale-cache prunes with the current ownership and grace-period guards", () => {
    const now = Date.parse("2026-05-25T12:00:00.000Z");
    const localAgents = [
      {
        type: "agent",
        id: "01KEEP-MINE",
        dbKey: "agent-pub-01KEEP-MINE",
        userId: "viewer-1",
        createdAt: "2026-05-25T10:00:00.000Z",
      },
      {
        type: "agent",
        id: "01KEEP-RECENT",
        dbKey: "agent-pub-01KEEP-RECENT",
        userId: "viewer-2",
        createdAt: "2026-05-25T11:58:00.000Z",
      },
      {
        type: "agent",
        id: "01KEEP-LOCAL",
        dbKey: "agent-pub-01KEEP-LOCAL",
        userId: "viewer-2",
        createdAt: "2026-05-25T10:00:00.000Z",
        meta: { origin: "local" },
      },
      {
        type: "agent",
        id: "01PRUNE",
        dbKey: "agent-pub-01PRUNE",
        userId: "viewer-2",
        createdAt: "2026-05-25T10:00:00.000Z",
      },
    ];

    expect(
      planStalePublicAgentPrunes({
        localAgents: localAgents as any,
        toDeleteIds: ["01KEEP-MINE", "01KEEP-RECENT", "01KEEP-LOCAL", "01PRUNE"],
        currentUserId: "viewer-1",
        nowMs: now,
      })
    ).toEqual(["01PRUNE"]);
  });

  it("hides owner-protected stale records from authoritative catalog views without pruning them", () => {
    const result = planPublicAgentCatalogView({
      localAgents: [
        {
          type: "agent",
          id: "01OWNER-STALE",
          dbKey: "agent-pub-01OWNER-STALE",
          userId: "viewer-1",
          isPublic: true,
          name: "Owner Stale",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ] as any,
      remoteAgents: [],
      hasAuthoritativeRemoteResult: true,
      currentUserId: "viewer-1",
      options: { sortBy: "recommended", limit: 6 },
    });

    expect(result.visibleAgents).toEqual([]);
    expect(result.localFallbackAgents.map((agent) => agent.id)).toEqual([
      "01OWNER-STALE",
    ]);
    expect(result.staleIdsToHide).toEqual(["01OWNER-STALE"]);
    expect(result.pruneIds).toEqual([]);
  });

  it("keeps local records visible when the remote result is not authoritative", () => {
    const result = planPublicAgentCatalogView({
      localAgents: [
        {
          type: "agent",
          id: "01LOCAL",
          dbKey: "agent-pub-01LOCAL",
          userId: "viewer-1",
          isPublic: true,
          name: "Local",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ] as any,
      remoteAgents: [],
      hasAuthoritativeRemoteResult: false,
      currentUserId: "viewer-1",
      options: { sortBy: "recommended", limit: 6 },
    });

    expect(result.visibleAgents.map((agent) => agent.id)).toEqual(["01LOCAL"]);
    expect(result.localFallbackAgents.map((agent) => agent.id)).toEqual(["01LOCAL"]);
    expect(result.staleIdsToHide).toEqual([]);
    expect(result.pruneIds).toEqual([]);
  });

  it("builds the final UI list with public builtins, tool filtering, and sorting intact", () => {
    const builtins = [
      {
        type: "agent",
        id: "01APPBUILDER00000001YAII3I",
        dbKey: "agent-pub-01APPBUILDER00000001YAII3I",
        name: "App Builder",
        isPublic: true,
        tools: ["appFileRead"],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ];
    const visible = [
      {
        type: "agent",
        id: "01VISIBLE",
        dbKey: "agent-pub-01VISIBLE",
        name: "Visible",
        tools: ["ImageEditor"],
        createdAt: "2025-03-01T00:00:00.000Z",
        updatedAt: "2025-03-01T00:00:00.000Z",
      },
      {
        type: "agent",
        id: "01HIDDEN-BY-TOOL",
        dbKey: "agent-pub-01HIDDEN-BY-TOOL",
        name: "Other",
        tools: ["Search"],
        createdAt: "2025-04-01T00:00:00.000Z",
        updatedAt: "2025-04-01T00:00:00.000Z",
      },
    ];

    const result = buildPublicAgentCatalogList({
      agents: [...builtins, ...visible] as any,
      sortBy: "newest",
      limit: 10,
      toolName: "appFile",
    });

    expect(result.map((agent) => agent.id)).toEqual(["01APPBUILDER00000001YAII3I"]);
  });

  it("prepares catalog records without replacing public builtin record truth", () => {
    const result = preparePublicAgentCatalogRecords([
      {
        type: "agent",
        id: "01NOLOAGENTCRT000000000001",
        dbKey: "agent-pub-01NOLOAGENTCRT000000000001",
        name: "customized builtin",
        isPublic: true,
        introduction: "customized intro",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        type: "agent",
        id: "01VISIBLE",
        dbKey: "agent-pub-01VISIBLE",
        name: "Visible",
        introduction: "kept",
        createdAt: "2025-03-01T00:00:00.000Z",
        updatedAt: "2025-03-01T00:00:00.000Z",
      },
    ] as any);

    expect(result.map((agent) => agent.id)).toEqual([
      "01NOLOAGENTCRT000000000001",
      "01VISIBLE",
    ]);
    expect(result[0]).toMatchObject({
      id: "01NOLOAGENTCRT000000000001",
      name: "customized builtin",
      introduction: "customized intro",
      isPublic: true,
    });
  });

  it("normalizes stale platform OpenAI public agent prices from the model registry", () => {
    const source = readFileSync(new URL("./publicAgentCatalog.ts", import.meta.url), "utf8");
    expect(source).toContain('import { getModelPricing } from "ai/llm/getPricing"');
    expect(source).toContain("if (pricing && usePlatformPricing)");
    expect(source).toContain("inputPrice: pricing.inputPrice");
    expect(source).toContain("outputPrice: pricing.outputPrice");
  });

  it("floors explicit custom API public agent prices at platform pricing", () => {
    const source = readFileSync(new URL("./publicAgentCatalog.ts", import.meta.url), "utf8");
    expect(source).toContain("if (pricing && applyPlatformPriceFloor)");
    expect(source).toContain("inputPrice: maxNumber(agent.inputPrice, pricing.inputPrice)");
    expect(source).toContain("outputPrice: maxNumber(agent.outputPrice, pricing.outputPrice)");
  });

  it("marks legacy GPT Image 2 public agents as image-priced when imageConfig is missing", () => {
    const result = preparePublicAgentCatalogRecords([
      {
        type: "agent",
        id: "01IMGAGENT2A",
        dbKey: "agent-pub-01IMGAGENT2A",
        name: "GPT Image 2 图片生成与编辑助手",
        provider: "openai",
        model: "gpt-5.4",
        apiSource: "platform",
        imageModel: "gpt-image-2",
        tools: ["openAIGptImage"],
        createdAt: "2025-03-01T00:00:00.000Z",
        updatedAt: "2025-03-01T00:00:00.000Z",
      },
    ] as any);

    expect(result[0]).toMatchObject({
      imageModel: "gpt-image-2",
      imageConfig: { enabled: true },
      hasImageOutput: true,
    });
  });

  it("applies shared query filters consistently when building the final catalog list", () => {
    const result = buildPublicAgentCatalogList({
      agents: [
        {
          type: "agent",
          id: "01IMAGE",
          dbKey: "agent-pub-01IMAGE",
          name: "Image Agent",
          userId: "user-a",
          tools: ["ImageEditor"],
          hasImageOutput: true,
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2025-03-01T00:00:00.000Z",
        },
        {
          type: "agent",
          id: "01TEXT",
          dbKey: "agent-pub-01TEXT",
          name: "Text Agent",
          userId: "user-b",
          tools: ["Search"],
          createdAt: "2025-04-01T00:00:00.000Z",
          updatedAt: "2025-04-01T00:00:00.000Z",
        },
      ] as any,
      sortBy: "newest",
      limit: 10,
      searchName: "image",
      userId: "user-a",
      imageOutputOnly: true,
      toolName: "image",
    });

    expect(result.map((agent) => agent.id)).toEqual(["01IMAGE"]);
  });
});
