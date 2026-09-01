import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

const createDocMock = mock((args: any) => "page-skill-created");
const selectCurrentSpaceIdMock = mock(
  (state: any) => state?.space?.currentSpaceId ?? null,
);

let moduleVersion = 0;

const realSpaceModule = {
  ...(await import("create/space/spaceCurrentSelectors")),
};

afterAll(() => {
  mock.module("create/space/spaceCurrentSelectors", () => realSpaceModule);
});

async function loadCreateSkillDocTool() {
  const actualDocStore = await import("render/page/docStore");

  mock.module("render/page/docStore", () => ({
    ...actualDocStore,
    createDocState: createDocMock,
  }));
  mock.module("create/space/spaceCurrentSelectors", () => ({
    ...realSpaceModule,
    selectCurrentSpaceId: selectCurrentSpaceIdMock,
  }));

  const mod = await import(`./createSkillDocTool`);
  mock.restore();
  return mod;
}

describe("createSkillDocTool", () => {
  afterEach(() => {
    createDocMock.mockClear();
    selectCurrentSpaceIdMock.mockClear();
    mock.restore();
  });

  it("creates a skill doc with protocol and eval blocks", async () => {
    const { createSkillDocFunc } = await loadCreateSkillDocTool();
    const dispatch = mock(() => ({
      unwrap: async () => "page-skill-created",
    }));

    const result = await createSkillDocFunc(
      {
        name: "web-research",
        description: "Search and summarize current web information.",
        body: "Use search before opening heavy browser sessions.",
        toolNames: ["exa_search", "fetchWebpage"],
        recommendedSkills: ["space-recall"],
        promptPatch: "优先先搜后读。",
        evalCases: [
          {
            input: "帮我找一下最新的 React 发布内容",
            expectedTools: ["exa_search"],
          },
        ],
      },
      {
        dispatch,
        getState: () => ({
          space: { currentSpaceId: "space-current" },
        }),
      },
    );

    expect(createDocMock).toHaveBeenCalledTimes(1);
    const args = createDocMock.mock.calls[0]?.[0];
    expect(args.title).toBe("web-research");
    expect(args.spaceId).toBe("space-current");
    expect(args.content).toContain("<!-- skill-config");
    expect(args.content).toContain("<!-- eval-config");
    expect(args.content).toContain("fetchWebpage");
    expect(args.content).toContain("space-recall");
    expect(result).toMatchObject({
      rawData: {
        success: true,
        id: "page-skill-created",
        dbKey: "page-skill-created",
        skillId: "web-research",
        hasEvalConfig: true,
        reference: {
          dbKey: "page-skill-created",
          type: "instruction",
        },
      },
    });
    expect(result.rawData).toHaveProperty("nextActions");
  });
});
