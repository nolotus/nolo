import { afterEach, describe, expect, it, mock } from "bun:test";
import { buildSkillDocMarkdown } from "ai/skills/skillDocProtocol";
import { mergeReferences } from "./referenceUtils";

let moduleVersion = 0;

async function loadReferenceUtils() {
  mock.module("database/dbSlice", () => ({
    read: (payload: any) => ({ type: "db/read", payload }),
  }));
  const mod = await import(`./referenceUtils`);
  mock.restore();
  return mod;
}

const buildDispatch = (records: Record<string, any>) => {
  const dispatch = (action: any) => ({
    unwrap: async () => {
      const dbKey = action?.payload?.dbKey;
      if (!dbKey || !(dbKey in records)) {
        throw new Error(`missing ${dbKey}`);
      }
      return records[dbKey];
    },
  });
  return dispatch as any;
};

describe("referenceUtils mergeReferences", () => {
  it("merges undefined or null as empty arrays", () => {
    expect(mergeReferences(undefined, null)).toEqual([]);
  });

  it("appends extra references, keeping the order", () => {
    const base = [{ dbKey: "a" } as any, { dbKey: "b" } as any];
    const extra = [{ dbKey: "c" } as any];
    const result = mergeReferences(base, extra);
    expect(result.map(r => r.dbKey)).toEqual(["a", "b", "c"]);
  });

  it("deduplicates by dbKey, keeping the first occurrence", () => {
    const base = [{ dbKey: "a", title: "base-a" } as any, { dbKey: "b", title: "base-b" } as any];
    const extra = [{ dbKey: "b", title: "extra-b" } as any, { dbKey: "c", title: "extra-c" } as any];
    const result = mergeReferences(base, extra);
    expect(result.map(r => r.dbKey)).toEqual(["a", "b", "c"]);
    expect(result.find(r => r.dbKey === "b")?.title).toBe("base-b");
  });
});

describe("referenceUtils skill resolution", () => {
  afterEach(() => {
    mock.restore();
  });

  it("hard loads required skill tools and soft surfaces recommended skill hints", async () => {
    const { resolveReferenceAssets, resolveToolsFromKeys } = await loadReferenceUtils();
    const skillPage = {
      dbKey: "page-skill-web",
      content: buildSkillDocMarkdown({
        body: "Use web tools first.",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          id: "web-research",
          name: "web-research",
          description: "Research with web search first.",
          toolNames: ["exa_search", "fetchWebpage"],
          promptPatch: "先搜索再读取网页。",
        },
      }),
      meta: {
        kind: "skill",
        requiredSkills: ["page-skill-browser"],
      },
    };

    const recommendedSkillPage = {
      dbKey: "page-skill-space",
      content: buildSkillDocMarkdown({
        body: "Prefer reading referenced space context.",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          id: "space-recall",
          name: "space-recall",
          description: "Recall relevant workspace docs first.",
          toolNames: ["readDoc"],
        },
      }),
      meta: {
        kind: "skill",
      },
    };

    const nestedRequiredSkillPage = {
      dbKey: "page-skill-browser",
      content: buildSkillDocMarkdown({
        body: "Escalate to browser only when needed.",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          id: "deep-browser",
          name: "deep-browser",
          description: "Use browser tools only after search.",
          toolNames: ["browser_openSession"],
        },
      }),
      meta: {
        kind: "skill",
      },
    };

    const knowledgePage = {
      dbKey: "page-knowledge",
      content: "Knowledge body",
      tools: ["searchWorkspace"],
      meta: {
        kind: "knowledge",
        requiredSkills: ["page-skill-web"],
        recommendedSkills: ["page-skill-space"],
      },
    };

    const dispatch = buildDispatch({
      "page-knowledge": knowledgePage,
      "page-skill-web": skillPage,
      "page-skill-space": recommendedSkillPage,
      "page-skill-browser": nestedRequiredSkillPage,
    });

    const byKeys = await resolveToolsFromKeys(["page-knowledge"], dispatch);
    expect(byKeys.tools).toEqual(
      expect.arrayContaining([
        "searchWorkspace",
        "exa_search",
        "fetchWebpage",
        "browser_openSession",
      ])
    );
    expect(byKeys.recommendedSkillTools).toEqual(expect.arrayContaining(["readDoc"]));
    expect(byKeys.recommendedSkillHints).toEqual(
      expect.arrayContaining(["page-skill-space", "space-recall"])
    );
    expect(byKeys.skillPromptPatches).toEqual(
      expect.arrayContaining(["先搜索再读取网页。"])
    );

    const byRefs = await resolveReferenceAssets(
      [{ dbKey: "page-knowledge", type: "page", title: "Knowledge" } as any],
      dispatch
    );
    expect(byRefs.referencedTools).toEqual(
      expect.arrayContaining([
        "searchWorkspace",
        "exa_search",
        "fetchWebpage",
        "browser_openSession",
      ])
    );
    expect(byRefs.recommendedSkillTools).toEqual(expect.arrayContaining(["readDoc"]));
    expect(byRefs.recommendedSkillHints).toEqual(
      expect.arrayContaining(["page-skill-space", "space-recall"])
    );
    expect(byRefs.references[0]?.type).toBe("instruction");
  });

  it("loadSkill 写下的 search-all-spaces reference 扩展出 search_all_spaces 工具（内置不落库）", async () => {
    const { resolveReferenceAssets } = await loadReferenceUtils();
    // loadSkill 对内置 skill 持久化的引用 dbKey 是 slug（见 loadSkillTool.ts）；
    // 引用解析先查 builtinSkillRegistry，不查 DB——dispatch 里没有这条记录也能解析。
    const dispatch = buildDispatch({});
    const byRefs = await resolveReferenceAssets(
      [{ dbKey: "search-all-spaces", type: "instruction", title: "全空间搜索" } as any],
      dispatch,
    );
    expect(byRefs.referencedTools).toContain("search_all_spaces");
    expect(byRefs.referencedTools).not.toContain("search_workspace");
    expect(byRefs.recommendedSkillHints).toContain("全空间搜索");
  });
});
