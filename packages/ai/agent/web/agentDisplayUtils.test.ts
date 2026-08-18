import { describe, expect, it } from "bun:test";

import {
  buildAgentDialogHistory,
  buildAgentEmailBindingSummary,
  buildAgentThreadOverviewFromApi,
  buildAgentThreadOverview,
  formatAgentOutputPrice,
  formatAgentEmailReadinessLabel,
  formatRuntimeLocationLabel,
  resolveAgentCreatorSummary,
  shouldShowAgentTokenCost,
} from "./agentDisplayUtils";

describe("agentDisplayUtils", () => {
  it("formats output pricing in the shared per-million-token style", () => {
    expect(formatAgentOutputPrice(20)).toBe("1M / 20 积分");
    expect(formatAgentOutputPrice(0)).toBe("免费");
  });

  it("shows token cost only for non-CLI per-turn agents with finite price data", () => {
    expect(
      shouldShowAgentTokenCost(
        {
          apiSource: "openai",
          inputPrice: 20,
          outputPrice: 20,
        } as any,
        { type: "per_turn", amount: 0.01 }
      )
    ).toBe(true);

    expect(
      shouldShowAgentTokenCost(
        {
          apiSource: "cli",
          inputPrice: 20,
          outputPrice: 20,
        } as any,
        { type: "per_turn", amount: 0.01 }
      )
    ).toBe(false);

    expect(
      shouldShowAgentTokenCost(
        {
          apiSource: "openai",
          inputPrice: 20,
          outputPrice: 20,
        } as any,
        { type: "per_image", amount: 0.2 }
      )
    ).toBe(false);
  });

  it("formats agent email readiness labels for detail display", () => {
    expect(formatAgentEmailReadinessLabel("ready")).toBe("可收信");
    expect(formatAgentEmailReadinessLabel("failed_warmup")).toBe("收信未就绪");
    expect(formatAgentEmailReadinessLabel(null)).toBe("");
  });

  it("builds agent email binding summary from meta emailAddress and emailIdentities", () => {
    const summary = buildAgentEmailBindingSummary({
      meta: {
        emailAddress: "pay@nolo.chat",
        emailProvider: "cloudflare",
        emailReadinessStatus: "ready",
        emailIdentities: [
          {
            emailAddress: "alias.pay@nolo.chat",
            purpose: "payment-alerts",
            readinessStatus: "ready",
            source: "provisioned",
          },
        ],
      },
    });
    expect(summary.primaryEmail).toBe("pay@nolo.chat");
    expect(summary.provider).toBe("cloudflare");
    expect(summary.identities).toHaveLength(2);
    expect(summary.identities.find((row) => row.isPrimary)?.emailAddress).toBe(
      "pay@nolo.chat"
    );
    expect(
      summary.identities.find((row) => row.purpose === "payment-alerts")?.emailAddress
    ).toBe("alias.pay@nolo.chat");
  });

  it("formats runtime location labels from a shared helper", () => {
    expect(formatRuntimeLocationLabel("machine-1")).toBe("远程电脑 (machine-1)");
    expect(formatRuntimeLocationLabel(undefined, "当前设备本地直连")).toBe("当前设备本地直连");
  });

  it("prefers creator profile fields and resolves creator avatar urls", () => {
    const creator = resolveAgentCreatorSummary({
      item: {
        userId: "user-1",
        userName: "fallback-name",
      } as any,
      creatorProfile: {
        nickname: "nolotus",
        avatarFileId: "file-123",
      },
      server: "https://us.nolo.chat",
      unknownUserLabel: "unknown",
    });

    expect(creator.name).toBe("nolotus");
    expect(creator.avatarUrl).toContain("file-123");
  });

  it("builds sorted dialog history entries only for matching agent keys", () => {
    const history = buildAgentDialogHistory({
      records: [
        {
          dbKey: "dialog-1",
          title: "Earlier",
          updatedAt: "2026-05-26T08:00:00.000Z",
          cybots: ["agent-a"],
          spaceId: "space-1",
        },
        {
          dbKey: "dialog-2",
          title: "",
          updatedAt: "2026-05-26T09:00:00.000Z",
          cybots: ["agent-b"],
          spaceId: "space-2",
        },
        {
          dbKey: "dialog-3",
          title: "Ignored",
          updatedAt: "2026-05-26T10:00:00.000Z",
          cybots: ["agent-c"],
          spaceId: "space-3",
        },
      ] as any[],
      historyAgentKeys: new Set(["agent-a", "agent-b"]),
      historySpaceNameById: new Map([
        ["space-1", "Alpha"],
        ["space-2", "Beta"],
      ]),
      untitledDialogLabel: "未命名对话",
      limit: 8,
    });

    expect(history).toEqual([
      {
        dbKey: "dialog-2",
        title: "未命名对话",
        updatedAt: "2026-05-26T09:00:00.000Z",
        spaceId: "space-2",
        spaceName: "Beta",
      },
      {
        dbKey: "dialog-1",
        title: "Earlier",
        updatedAt: "2026-05-26T08:00:00.000Z",
        spaceId: "space-1",
        spaceName: "Alpha",
      },
    ]);
  });

  it("builds agent thread overview groups from projected dialog thread summaries", () => {
    const overview = buildAgentThreadOverview({
      records: [
        {
          dbKey: "dialog-running",
          title: "Running handoff",
          updatedAt: "2026-05-26T10:00:00.000Z",
          spaceId: "space-1",
          agentThread: {
            agentKey: "agent-a",
            listSection: "running",
            status: "running",
            threadKind: "background",
          },
        },
        {
          dbKey: "dialog-future",
          title: "Scheduled wake",
          updatedAt: "2026-05-26T09:00:00.000Z",
          cybots: ["agent-a"],
          agentThread: {
            listSection: "future",
            status: "pending",
            threadKind: "scheduled",
          },
        },
        {
          dbKey: "dialog-other",
          title: "Other agent",
          updatedAt: "2026-05-26T11:00:00.000Z",
          agentThread: {
            agentKey: "agent-b",
            listSection: "running",
          },
        },
      ] as any[],
      historyAgentKeys: new Set(["agent-a"]),
      historySpaceNameById: new Map([["space-1", "Alpha"]]),
      untitledDialogLabel: "未命名对话",
    });

    expect(overview.running).toEqual([
      {
        agentKey: "agent-a",
        dbKey: "dialog-running",
        listSection: "running",
        spaceId: "space-1",
        spaceName: "Alpha",
        status: "running",
        threadKind: "background",
        title: "Running handoff",
        updatedAt: "2026-05-26T10:00:00.000Z",
      },
    ]);
    expect(overview.future).toMatchObject([
      {
        dbKey: "dialog-future",
        listSection: "future",
        status: "pending",
        threadKind: "scheduled",
      },
    ]);
    expect(overview.recent).toEqual([]);
  });

  it("builds agent thread overview groups from the real API response", () => {
    const overview = buildAgentThreadOverviewFromApi({
      threads: [
        {
          threadId: "thread-running-1",
          title: "Running background task",
          primaryAgentKey: "agent-a",
          status: "running",
          threadKind: "background",
          section: "running",
          createdAt: 1716717600000,
          updatedAt: 1716721200000,
        },
        {
          threadId: "thread-future-1",
          title: "Scheduled wake",
          primaryAgentKey: "agent-a",
          status: "pending",
          threadKind: "scheduled",
          section: "future",
          createdAt: 1716717600000,
          updatedAt: 1716717600000,
        },
        {
          threadId: "thread-recent-1",
          dialogKey: "dialog-agent-a-recent-1",
          title: "Completed research",
          primaryAgentKey: "agent-a",
          status: "done",
          threadKind: "background",
          section: "recent",
          createdAt: 1716717600000,
          updatedAt: 1716724800000,
          runtimeEvidence: {
            status: "completed",
            lastToolNames: ["execShell"],
            toolCallCount: 2,
            workspaceLease: {
              source: "web-hosted",
              artifactKind: "web-hosted-workspace",
            },
            hasRuntimeToolPolicySnapshot: true,
          },
        },
      ],
      untitledDialogLabel: "未命名任务",
    });

    expect(overview.running).toEqual([
      {
        agentKey: "agent-a",
        dbKey: "thread-running-1",
        listSection: "running",
        spaceId: null,
        spaceName: null,
        status: "running",
        threadKind: "background",
        title: "Running background task",
        updatedAt: 1716721200000,
      },
    ]);
    expect(overview.future).toEqual([
      {
        agentKey: "agent-a",
        dbKey: "thread-future-1",
        listSection: "future",
        spaceId: null,
        spaceName: null,
        status: "pending",
        threadKind: "scheduled",
        title: "Scheduled wake",
        updatedAt: 1716717600000,
      },
    ]);
    expect(overview.recent).toEqual([
      {
        agentKey: "agent-a",
        dbKey: "dialog-agent-a-recent-1",
        listSection: "recent",
        spaceId: null,
        spaceName: null,
        status: "done",
        threadKind: "background",
        title: "Completed research",
        updatedAt: 1716724800000,
        runtimeEvidence: {
          status: "completed",
          lastToolNames: ["execShell"],
          toolCallCount: 2,
          workspaceLease: {
            source: "web-hosted",
            artifactKind: "web-hosted-workspace",
          },
          hasRuntimeToolPolicySnapshot: true,
        },
      },
    ]);
  });

  describe("thread overview merge contract: running/future from API, not dialog projection", () => {
    const apiThreads = [
      {
        threadId: "api-running-1",
        title: "API Running Task",
        primaryAgentKey: "agent-a",
        status: "running" as const,
        threadKind: "background" as const,
        section: "running" as const,
        createdAt: 1716717600000,
        updatedAt: 1716721200000,
      },
      {
        threadId: "api-future-1",
        title: "API Scheduled Task",
        primaryAgentKey: "agent-a",
        status: "pending" as const,
        threadKind: "scheduled" as const,
        section: "future" as const,
        createdAt: 1716717600000,
        updatedAt: 1716717600000,
      },
    ];

    const dialogRecords = [
      {
        dbKey: "proj-running-1",
        title: "Projected Running",
        updatedAt: "2026-05-26T10:00:00.000Z",
        spaceId: "space-1",
        agentThread: {
          agentKey: "agent-a",
          listSection: "running",
          status: "running",
          threadKind: "background",
        },
      },
      {
        dbKey: "proj-future-1",
        title: "Projected Future",
        updatedAt: "2026-05-26T09:00:00.000Z",
        spaceId: "space-1",
        agentThread: {
          agentKey: "agent-a",
          listSection: "future",
          status: "pending",
          threadKind: "scheduled",
        },
      },
      {
        dbKey: "proj-recent-1",
        title: "Projected Recent",
        updatedAt: "2026-05-26T08:00:00.000Z",
        spaceId: "space-1",
        agentThread: {
          agentKey: "agent-a",
          listSection: "recent",
          status: "done",
          threadKind: "background",
        },
      },
    ] as any[];

    const historyAgentKeys = new Set(["agent-a"]);
    const historySpaceNameById = new Map([["space-1", "Alpha"]]);
    const mergeOverview = (
      projectedOverview: ReturnType<typeof buildAgentThreadOverview>,
      indexedOverview: ReturnType<typeof buildAgentThreadOverviewFromApi>
    ) => ({
      ...projectedOverview,
      running: indexedOverview.running,
      future: indexedOverview.future,
      recent:
        indexedOverview.recent.length > 0
          ? indexedOverview.recent
          : projectedOverview.recent,
    });

    it("replaces projected running/future with indexed API data when API succeeds", () => {
      const projectedOverview = buildAgentThreadOverview({
        records: dialogRecords,
        historyAgentKeys,
        historySpaceNameById,
        untitledDialogLabel: "未命名对话",
      });
      const indexedOverview = buildAgentThreadOverviewFromApi({
        threads: apiThreads,
        untitledDialogLabel: "未命名对话",
      });

      const merged = mergeOverview(projectedOverview, indexedOverview);

      // running comes from API, not projection
      expect(merged.running).toHaveLength(1);
      expect(merged.running[0].dbKey).toBe("api-running-1");
      expect(merged.running[0].title).toBe("API Running Task");
      expect(merged.running[0].listSection).toBe("running");

      // future comes from API, not projection
      expect(merged.future).toHaveLength(1);
      expect(merged.future[0].dbKey).toBe("api-future-1");
      expect(merged.future[0].title).toBe("API Scheduled Task");
      expect(merged.future[0].listSection).toBe("future");

      // recent still comes from projection (API did not provide it)
      expect(merged.recent).toHaveLength(1);
      expect(merged.recent[0].dbKey).toBe("proj-recent-1");
    });

    it("uses indexed recent when AgentThreadIndex provides recent threads", () => {
      const projectedOverview = buildAgentThreadOverview({
        records: dialogRecords,
        historyAgentKeys,
        historySpaceNameById,
        untitledDialogLabel: "未命名对话",
      });
      const indexedOverview = buildAgentThreadOverviewFromApi({
        threads: [
          ...apiThreads,
          {
            threadId: "api-recent-1",
            dialogKey: "dialog-api-recent-1",
            title: "API Recent Task",
            primaryAgentKey: "agent-a",
            status: "done" as const,
            threadKind: "background" as const,
            section: "recent" as const,
            createdAt: 1716717600000,
            updatedAt: 1716724800000,
          },
        ],
        untitledDialogLabel: "未命名对话",
      });

      const merged = mergeOverview(projectedOverview, indexedOverview);

      expect(merged.recent).toHaveLength(1);
      expect(merged.recent[0].dbKey).toBe("dialog-api-recent-1");
      expect(merged.recent[0].title).toBe("API Recent Task");
    });

    it("never leaks projected running/future entries into merged result when API succeeds", () => {
      const projectedOverview = buildAgentThreadOverview({
        records: dialogRecords,
        historyAgentKeys,
        historySpaceNameById,
        untitledDialogLabel: "未命名对话",
      });
      const indexedOverview = buildAgentThreadOverviewFromApi({
        threads: apiThreads,
        untitledDialogLabel: "未命名对话",
      });

      const merged = mergeOverview(projectedOverview, indexedOverview);

      const mergedRunningKeys = merged.running.map((e) => e.dbKey);
      const mergedFutureKeys = merged.future.map((e) => e.dbKey);

      expect(mergedRunningKeys).not.toContain("proj-running-1");
      expect(mergedFutureKeys).not.toContain("proj-future-1");
    });

    it("falls back to projection only when API response has no threads", () => {
      const projectedOverview = buildAgentThreadOverview({
        records: dialogRecords,
        historyAgentKeys,
        historySpaceNameById,
        untitledDialogLabel: "未命名对话",
      });

      // Simulate: API failed -> agentThreadIndexData?.data?.threads is undefined
      const hasApiData = false;
      const merged = hasApiData
        ? {
            ...projectedOverview,
            running: buildAgentThreadOverviewFromApi({
              threads: [],
              untitledDialogLabel: "未命名对话",
            }).running,
            future: buildAgentThreadOverviewFromApi({
              threads: [],
              untitledDialogLabel: "未命名对话",
            }).future,
          }
        : projectedOverview;

      expect(merged.running).toHaveLength(1);
      expect(merged.running[0].dbKey).toBe("proj-running-1");
      expect(merged.future).toHaveLength(1);
      expect(merged.future[0].dbKey).toBe("proj-future-1");
    });
  });

  it("projects runtime evidence from dialog checkpoints when thread API evidence is absent", () => {
    const overview = buildAgentThreadOverview({
      historyAgentKeys: new Set(["agent-a"]),
      historySpaceNameById: new Map(),
      records: [
        {
          dbKey: "dialog-user-1",
          cybots: ["agent-a"],
          primaryAgentKey: "agent-a",
          title: "Hosted exec result",
          status: "done",
          threadKind: "background",
          updatedAt: "2026-06-14T01:00:00.000Z",
          runtimeCheckpoint: {
            status: "done",
            lastToolNames: ["execShell"],
            toolCallCount: 1,
            runtimeBinding: {
              runtimeToolPolicySnapshot: {
                runtimeTools: ["execShell"],
                workspace: { mode: "lease" },
              },
              workspaceLease: {
                source: "web-hosted",
                evidence: { artifactKind: "web-hosted-workspace" },
              },
            },
          },
        },
      ],
      untitledDialogLabel: "未命名任务",
    });

    expect(overview.recent[0]?.runtimeEvidence).toEqual({
      status: "done",
      lastToolNames: ["execShell"],
      toolCallCount: 1,
      workspaceLease: {
        source: "web-hosted",
        artifactKind: "web-hosted-workspace",
      },
      hasRuntimeToolPolicySnapshot: true,
    });
  });
});
