import { afterEach, describe, expect, it, mock } from "bun:test";

const createDocMock = mock((args: any) => "page-skill");
const selectCurrentSpaceIdMock = mock((state: any) => state?.space?.currentSpaceId ?? null);

let moduleVersion = 0;

async function loadImportSkillTool() {
  const actualDocStore = await import("render/page/docStore");
  mock.module("render/page/docStore", () => ({
    ...actualDocStore,
    createDocState: createDocMock,
  }));
  const actualSpaceSlice = await import("create/space/spaceSlice");
  mock.module("create/space/spaceSlice", () => ({
    ...actualSpaceSlice,
    selectCurrentSpaceId: selectCurrentSpaceIdMock,
  }));

  const mod = await import(`./importSkillTool`);
  mock.restore();
  return mod;
}

describe("importSkillTool", () => {
  afterEach(() => {
    createDocMock.mockClear();
    selectCurrentSpaceIdMock.mockClear();
    mock.restore();
  });

  it("creates a local skill doc from raw SKILL.md content", async () => {
    const { importSkillFunc } = await loadImportSkillTool();
    const dispatch = mock(() => ({
      unwrap: async () => "page-skill",
    }));

    const result = await importSkillFunc(
      {
        content: `
        ---
        name: web-research
        description: Search the web for current information.
        allowed-tools: exa-search fetch-webpage
        ---

Use this skill to research current topics.
`.trim(),
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
    expect(args.content).toContain("exa_search");
    expect(args.content).toContain("fetchWebpage");
    expect(result).toMatchObject({
      rawData: {
        success: true,
        id: "page-skill",
        dbKey: "page-skill",
        skillId: "web-research",
        reference: {
          dbKey: "page-skill",
          type: "instruction",
        },
      },
    });
    expect(result.rawData).toHaveProperty("nextActions");
  });
});
