import { afterEach, describe, expect, it, mock } from "bun:test";
import { buildSkillDocMarkdown } from "ai/skills/skillDocProtocol";

const originalFetch = globalThis.fetch;
let moduleVersion = 0;

const runtime = {
  currentServer: "https://nolo.chat",
  currentToken: "token-1",
  currentUserId: "user-1",
};

const jsonResponse = (value: unknown) =>
  ({
    ok: true,
    json: async () => value,
  }) as Response;

const notFoundResponse = () =>
  ({
    ok: false,
    status: 404,
    json: async () => ({}),
  }) as Response;

async function loadLoadSkillTool(options?: {
  activeDialogKey?: string | null;
  dialogConfig?: unknown;
}) {
  mock.module("app/stateViews/runtime", () => ({
    selectRuntimeSnapshot: () => runtime,
  }));
  if (options) {
    // loadSkill 三态网关要读「当前 dialog 绑定的 agent」：mock dialog 上下文。
    mock.module("chat/dialog/dialogRuntimeStore", () => ({
      getActiveDialogKey: () => options.activeDialogKey ?? "dialog-test",
    }));
    mock.module("database/dbSlice", () => ({
      selectById: () => options.dialogConfig,
    }));
  }
  const mod = await import(`./loadSkillTool`);
  mock.restore();
  return mod;
}

function mockFetchRoutes(routes: Record<string, () => unknown>) {
  globalThis.fetch = mock((input: any) => {
    const url = String(input instanceof Request ? input.url : input);
    for (const [suffix, handler] of Object.entries(routes)) {
      if (url.includes(suffix)) return Promise.resolve(jsonResponse(handler()));
    }
    return Promise.resolve(notFoundResponse());
  }) as any;
}

const skillContents = (pageKey: string) => ({
  [pageKey]: {
    contentKey: pageKey,
    type: "page",
    title: "web-research",
    skillSummary: {
      isSkill: true,
      skillId: "web-research",
      name: "web-research",
    },
  },
});

const skillPageRecord = {
  dbKey: "page-user-1-skill01",
  title: "web-research",
  content: buildSkillDocMarkdown({
    body: "Search first, then verify.",
    skillConfig: {
      version: "0.1",
      kind: "skill",
      id: "web-research",
      name: "web-research",
      description: "Research current web topics.",
      toolNames: ["exa_search"],
    },
  }),
  meta: { kind: "skill" },
};

describe("loadSkillTool", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restore();
  });

  it("loads a skill by name and returns the exact contract content", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: {
          dbKey: "space-1",
          name: "My Space",
          contents: skillContents("page-user-1-skill01"),
        },
      }),
      "/api/v1/db/read/page-user-1-skill01": () => ({ data: skillPageRecord }),
    });

    const result = await loadSkillFunc(
      { name: "web-research" },
      { getState: () => ({}) }
    );

    expect(result.displayData).toBe(
      'Skill "web-research" loaded inline. Follow its instructions.\n\nSearch first, then verify.'
    );
    expect(result.rawData).toMatchObject({
      success: true,
      name: "web-research",
      dbKey: "page-user-1-skill01",
    });
  });

  it("strips the skill-config protocol block from CLI-created skill docs", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-2" }],
      "/api/v1/db/read/space-2": () => ({
        data: {
          dbKey: "space-2",
          contents: skillContents("page-user-1-skill02"),
        },
      }),
      "/api/v1/db/read/page-user-1-skill02": () => ({
        data: {
          ...skillPageRecord,
          dbKey: "page-user-1-skill02",
          content: skillPageRecord.content,
        },
      }),
    });

    const result = await loadSkillFunc(
      { name: "web-research" },
      { getState: () => ({}) }
    );

    expect(result.displayData).toBe(
      'Skill "web-research" loaded inline. Follow its instructions.\n\nSearch first, then verify.'
    );
    expect(String(result.displayData)).not.toContain("skill-config");
  });

  it("returns available skill names when not found, without throwing", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: {
          dbKey: "space-1",
          contents: {
            "page-user-1-skill01": {
              contentKey: "page-user-1-skill01",
              type: "page",
              title: "web-research",
              skillSummary: {
                isSkill: true,
                skillId: "web-research",
                name: "web-research",
              },
            },
            "page-user-1-skill02": {
              contentKey: "page-user-1-skill02",
              type: "page",
              title: "code-review",
              skillSummary: {
                isSkill: true,
                skillId: "code-review",
                name: "code-review",
              },
            },
            "page-user-1-note": {
              contentKey: "page-user-1-note",
              type: "page",
              title: "plain note",
              skillSummary: undefined,
            },
          },
        },
      }),
    });

    const result = await loadSkillFunc(
      { name: "missing-skill" },
      { getState: () => ({}) }
    );

    expect(result.rawData).toMatchObject({
      success: false,
      name: "missing-skill",
      availableSkills: expect.arrayContaining(["web-research", "code-review"]),
    });
    expect(result.displayData).toContain('Skill "missing-skill" not found');
    expect(result.displayData).toContain("web-research");
    expect(result.displayData).toContain("code-review");
    expect(result.displayData).not.toContain("plain note");
  });

  it("rejects loadSkill when the agent explicitly disabled the skill", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool({
      activeDialogKey: "dialog-test",
      dialogConfig: { cybots: ["agent-user-1"] },
    });
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
      "/api/v1/db/read/space-1": () => ({
        data: {
          dbKey: "space-1",
          contents: skillContents("page-user-1-skill01"),
        },
      }),
    });
    const thunkApi = {
      getState: () => ({}),
      extra: {
        db: {
          get: async () => ({ skills: { "web-research": "disabled" } }),
        },
      },
    };

    const result = await loadSkillFunc({ name: "web-research" }, thunkApi);

    // 拒绝结果：明确提示已禁用，正文不返回。
    expect(result.rawData).toMatchObject({
      success: false,
      name: "web-research",
      slug: "web-research",
      disabled: true,
    });
    expect(result.rawData.body).toBeUndefined();
    expect(result.displayData).toContain("已被禁用");
    // 未打到 skill page 读取——正文没有真正加载。
    const fetchCalls = (globalThis.fetch as any).mock.calls.map((c: any) =>
      String(c[0])
    );
    expect(
      fetchCalls.some((url: string) =>
        url.includes("/api/v1/db/read/page-user-1-skill01")
      )
    ).toBe(false);
  });

  it("rejects a builtin skill disabled on the current agent", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool({
      activeDialogKey: "dialog-test",
      dialogConfig: { cybots: ["agent-user-1"] },
    });
    mockFetchRoutes({
      "/rpc/getUserSpaceMemberships": () => [],
    });
    const thunkApi = {
      getState: () => ({}),
      extra: {
        db: {
          get: async () => ({ skills: { coding: "disabled" } }),
        },
      },
    };

    const result = await loadSkillFunc({ name: "coding" }, thunkApi);

    expect(result.rawData).toMatchObject({
      success: false,
      name: "coding",
      slug: "coding",
      disabled: true,
    });
    expect(result.displayData).toContain("已被禁用");
  });

  it("loads normally when the agent config has the skill required / recommended / absent", async () => {
    const cases: Array<Record<string, unknown>> = [
      { "web-research": "required" },
      { "web-research": "recommended" },
      {},
    ];
    for (const skills of cases) {
      const { loadSkillFunc: run } = await loadLoadSkillTool({
        activeDialogKey: "dialog-test",
        dialogConfig: { cybots: ["agent-user-1"] },
      });
      mockFetchRoutes({
        "/rpc/getUserSpaceMemberships": () => [{ spaceId: "space-1" }],
        "/api/v1/db/read/space-1": () => ({
          data: {
            dbKey: "space-1",
            contents: skillContents("page-user-1-skill01"),
          },
        }),
        "/api/v1/db/read/page-user-1-skill01": () => ({ data: skillPageRecord }),
      });
      const thunkApi = {
        getState: () => ({}),
        extra: { db: { get: async () => ({ skills }) } },
      };

      const result = await run({ name: "web-research" }, thunkApi);

      expect(result.rawData).toMatchObject({
        success: true,
        name: "web-research",
        dbKey: "page-user-1-skill01",
      });
      expect(result.displayData).toContain("loaded inline");
    }
  });

  it("throws when name is missing", async () => {
    const { loadSkillFunc } = await loadLoadSkillTool();
    await expect(
      loadSkillFunc({} as any, { getState: () => ({}) })
    ).rejects.toThrow("loadSkill");
  });
});
