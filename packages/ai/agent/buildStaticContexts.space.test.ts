import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Phase 2 单测：buildStaticContexts 的 spaceContext 真值来源。
 *
 * 锁定四条不变量：
 *  - spaceContext 来自 dialogConfig.spaceId，与 Redux currentSpace / viewMode 无关；
 *  - viewMode="all" 时依然注入（RN 路径修复点）；
 *  - spaceContextLevel <= 1 时不注入（用户设置门控保留）；
 *  - spaceId 存在但记录读不到时输出显式失败 layer，不静默丢块。
 */

const realDbSlice = { ...(await import("database/dbSlice")) };
const realSettingSliceNs = await import("app/settings/settingSlice");
const realSettingSlice = { ...realSettingSliceNs };

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("ai/agent/getFullChatContextKeys", () => realGetFullChatContextKeys);
  mock.module("ai/context/buildReferenceContext", () => realBuildReferenceContext);
  mock.module("ai/llm/getModelContextWindow", () => realGetModelContextWindow);
  mock.module("ai/policy/runtimePolicy", () => realRuntimePolicy);
  mock.module("ai/policy/personalizationDialog", () => realPersonalizationDialog);
};

const realGetFullChatContextKeys = await import("ai/agent/getFullChatContextKeys");
const realBuildReferenceContext = await import("ai/context/buildReferenceContext");
const realGetModelContextWindow = await import("ai/llm/getModelContextWindow");
const realRuntimePolicy = await import("ai/policy/runtimePolicy");
const realPersonalizationDialog = await import("ai/policy/personalizationDialog");

let readImpl: ((dbKey: string) => any) = () => null;
let spaceContextLevel = 3;
let aiRecentContentLimit = 10;

const selectSpaceContextLevelMock = mock(() => spaceContextLevel);
const selectAiRecentContentLimitMock = mock(() => aiRecentContentLimit);
const selectGlobalPromptMock = mock(() => null);
const selectUserTonePresetMock = mock(() => "neutral");
const selectKnowledgeCaptureLevelMock = mock(() => 2);

function setupModuleMocks() {
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: (payload: any) => ({ kind: "read", payload }),
    selectById: () => undefined,
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectSpaceContextLevel: selectSpaceContextLevelMock,
    selectAiRecentContentLimit: selectAiRecentContentLimitMock,
    selectGlobalPrompt: selectGlobalPromptMock,
    selectUserTonePreset: selectUserTonePresetMock,
    selectKnowledgeCaptureLevel: selectKnowledgeCaptureLevelMock,
  }));

  mock.module("ai/agent/getFullChatContextKeys", () => ({
    ...realGetFullChatContextKeys,
    getFullChatContextKeys: async () => ({
      botInstructionsContext: [],
      currentInputContext: [],
      historyContext: [],
      botKnowledgeContext: [],
    }),
    deduplicateContextKeys: (keys: any) => keys,
  }));

  mock.module("ai/context/buildReferenceContext", () => ({
    ...realBuildReferenceContext,
    fetchReferenceContents: async () => new Map<string, string>(),
  }));

  mock.module("ai/llm/getModelContextWindow", () => ({
    ...realGetModelContextWindow,
    getModelContextWindow: () => 128000,
  }));

  mock.module("ai/policy/runtimePolicy", () => ({
    ...realRuntimePolicy,
    resolveSpaceContextPreloadPlan: (level: number) => ({
      preloadSummaryCount: 0,
      preloadBudgetRatio: level >= 3 ? 0.04 : level === 2 ? 0.01 : 0,
      includeRecentContent: level >= 3,
    }),
    buildStaticUserPolicyContext: () => "user-policy-stub",
  }));

  mock.module("ai/policy/personalizationDialog", () => ({
    ...realPersonalizationDialog,
    PERSONALIZATION_DIALOG_CATEGORY: "user-overlay-profile",
    buildPersonalizationDialogPolicyContext: () => null,
  }));
}

const SPACE_ID = "01KW6ZY7V3MC9GCAJZDNRBX1Y0";

const baseAgentConfig = (): any => ({
  dbKey: "agent-test-1",
  model: "gpt-4o-mini",
  provider: "openai",
  userId: "user-1",
  tools: [],
  references: [],
  updatedAt: "now",
  createdAt: 1,
  isPublic: false,
});

const buildState = (viewMode: "all" | "categories"): any => ({
  space: {
    // 模拟 Redux 状态：即使 currentSpace 有值或为空，都不应影响 spaceContext 真值
    currentSpaceId: viewMode === "all" ? null : `space-${SPACE_ID}`,
    currentSpace: null,
    viewMode,
  },
  auth: {},
  settings: {},
});

const buildDispatch = () => {
  const dispatched: any[] = [];
  const dispatch = (action: any) => {
    dispatched.push(action);
    if (action?.kind === "read") {
      const dbKey: string = action.payload?.dbKey;
      return {
        unwrap: async () => readImpl(dbKey),
      };
    }
    return action;
  };
  return { dispatch, dispatched };
};

let moduleVersion = 0;

const importBuildStaticContexts = async () => {
  return (await import(
    `./streamAgentChatTurnUtils?v=${moduleVersion++}`
  )).buildStaticContexts as typeof import("./streamAgentChatTurnUtils").buildStaticContexts;
};

beforeEach(() => {
  readImpl = () => null;
  spaceContextLevel = 3;
  aiRecentContentLimit = 10;
  selectSpaceContextLevelMock.mockClear();
  selectAiRecentContentLimitMock.mockClear();
  setupModuleMocks();
});

afterEach(() => {
  restoreLeakedModuleMocks();
});

describe("buildStaticContexts spaceContext source of truth", () => {
  it("builds spaceContext from dialogConfig.spaceId regardless of Redux currentSpace/viewMode", async () => {
    readImpl = (dbKey: string) =>
      dbKey === `space-${SPACE_ID}`
        ? {
            id: SPACE_ID,
            name: "产品工作台",
            description: "主力项目空间",
            categories: {
              "cat-a": { name: "规划", order: 1 },
            },
            contents: {
              "doc-1": {
                title: "路线图",
                type: "page",
                contentKey: "doc-1",
                categoryId: "cat-a",
                updatedAt: 100,
              },
            },
          }
        : null;

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    // viewMode="all" + currentSpace=null：历史上会跳过注入，现在必须注入
    const result = await buildStaticContexts(
      buildState("all") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).not.toBeNull();
    expect(result.spaceContext!).toContain("Space Title: 产品工作台");
    expect(result.spaceContext!).toContain(`Space ID: ${SPACE_ID}`);
    expect(result.spaceContext!).toContain("本对话属于以下 Space");
    // 读取的是 space-{id} 这条记录（来自 dialogConfig.spaceId）
    expect(result.spaceContext!).toContain("路线图");
  });

  it("injects spaceContext even when viewMode is 'all' (RN path)", async () => {
    readImpl = (dbKey: string) =>
      dbKey === `space-${SPACE_ID}`
        ? { id: SPACE_ID, name: "移动端空间", categories: {}, contents: {} }
        : null;

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("all") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).not.toBeNull();
    expect(result.spaceContext!).toContain("Space Title: 移动端空间");
  });

  it("does not inject spaceContext when spaceContextLevel <= 1", async () => {
    spaceContextLevel = 1;
    readImpl = () => ({ id: SPACE_ID, name: "x", categories: {}, contents: {} });

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("categories") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).toBeNull();
  });

  it("does not inject spaceContext when dialogConfig has no spaceId", async () => {
    readImpl = () => ({ id: SPACE_ID, name: "x", categories: {}, contents: {} });

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("categories") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1" } as any, // no spaceId
    );

    expect(result.spaceContext).toBeNull();
  });

  it("emits an explicit failure layer when spaceId is set but the record is missing", async () => {
    readImpl = () => null;

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("all") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).not.toBeNull();
    expect(result.spaceContext!).toContain(`声明属于 Space ${SPACE_ID}`);
    expect(result.spaceContext!).toContain("不要声称对话不属于任何空间");
  });

  it("emits an explicit failure layer when the read rejects", async () => {
    readImpl = () => {
      throw new Error("db unreachable");
    };

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("all") as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).not.toBeNull();
    expect(result.spaceContext!).toContain("db unreachable");
    expect(result.spaceContext!).toContain("不要声称对话不属于任何空间");
  });

  it("ignores Redux currentSpace entirely (parity with dialog record as truth)", async () => {
    // 即使 Redux 里 currentSpace 指向另一个 space，spaceContext 仍以 dialogConfig.spaceId 为准
    readImpl = (dbKey: string) =>
      dbKey === `space-${SPACE_ID}`
        ? { id: SPACE_ID, name: "真值空间", categories: {}, contents: {} }
        : null;

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const reduxStateWithDifferentSpace = {
      space: {
        currentSpaceId: "space-different",
        currentSpace: {
          id: "different",
          name: "Redux 里的旧空间",
          categories: {},
          contents: {},
        } as any,
        viewMode: "categories" as const,
      },
      auth: {},
      settings: {},
    };

    const result = await buildStaticContexts(
      reduxStateWithDifferentSpace as any,
      dispatch,
      baseAgentConfig(),
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).toContain("Space Title: 真值空间");
    expect(result.spaceContext).not.toContain("Redux 里的旧空间");
  });

  it("appends linkedSpaces section using the shared source, keeping [无法访问] marker", async () => {
    readImpl = (dbKey: string) => {
      if (dbKey === `space-${SPACE_ID}`) {
        return { id: SPACE_ID, name: "主空间", categories: {}, contents: {} };
      }
      if (dbKey === "space-link-a") {
        return { name: "设计稿库", description: "UI 资产" };
      }
      return null;
    };

    const buildStaticContexts = await importBuildStaticContexts();
    const { dispatch } = buildDispatch();

    const result = await buildStaticContexts(
      buildState("all") as any,
      dispatch,
      { ...baseAgentConfig(), linkedSpaces: ["link-a", "link-missing"] },
      { id: "dialog-1", spaceId: SPACE_ID } as any,
    );

    expect(result.spaceContext).toContain("Space Title: 主空间");
    expect(result.spaceContext).toContain("--- 关联空间 (Linked Spaces) ---");
    expect(result.spaceContext).toContain("- 设计稿库 (ID: link-a): UI 资产");
    expect(result.spaceContext).toContain("- [无法访问] link-missing");
  });
});