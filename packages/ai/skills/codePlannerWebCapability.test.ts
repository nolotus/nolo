import { describe, expect, it } from "bun:test";
import {
  CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
  CODE_PLANNER_WEB_CAPABILITY_PACK_IDS,
  buildCodeWorkSkillPrompt,
} from "./codePlannerSkills";
import {
  applySystemBuiltinSkillFilter,
  expandEnabledPacks,
} from "../tools/toolPacks";
import { SYSTEM_AGENT_CAPABILITY_IDS } from "../tools/agentCapabilities";

const WEB_TOOL = /^(exa_search|fetchWebpage|firecrawl_search|firecrawl_scrape)$/;

/** 宿主（desktopAgentRuntimeTurnService）在 tier + workspaceToolsHint 分支构造的工具面。 */
const buildTierTurnSurface = () => [
  ...CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
  ...expandEnabledPacks([...CODE_PLANNER_WEB_CAPABILITY_PACK_IDS]),
];

describe("Code Planner 联网能力来自系统层能力包", () => {
  it("skill 自身不再声明任何联网工具", () => {
    expect(CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS.filter((t) => WEB_TOOL.test(t))).toEqual([]);
  });

  it("联网工具由能力包补齐，最终工具面不变", () => {
    const surface = buildTierTurnSurface();
    expect(surface.filter((t) => WEB_TOOL.test(t)).sort()).toEqual([
      "exa_search",
      "fetchWebpage",
      "firecrawl_scrape",
      "firecrawl_search",
    ]);
  });

  it("用户关掉「联网搜索」后不留任何可上网的工具", () => {
    // 回归：firecrawl 曾游离在能力包体系外，关掉联网搜索仍能抓网页。
    const filtered = applySystemBuiltinSkillFilter(buildTierTurnSurface(), {
      "web-search": false,
      "web-scrape": false,
    });
    expect(filtered.filter((t) => WEB_TOOL.test(t))).toEqual([]);
    // 工作区工具与 startAgentRun 不受影响。
    expect(filtered).toContain("editFile");
    expect(filtered).toContain("startAgentRun");
  });

  it("两个开关各自独立生效", () => {
    const onlyScrapeOff = applySystemBuiltinSkillFilter(buildTierTurnSurface(), {
      "web-scrape": false,
    });
    expect(onlyScrapeOff).toContain("exa_search");
    expect(onlyScrapeOff).not.toContain("firecrawl_scrape");
  });

  it("Code Planner 依赖的能力包都在全局开关管辖范围内", () => {
    for (const packId of CODE_PLANNER_WEB_CAPABILITY_PACK_IDS) {
      expect(SYSTEM_AGENT_CAPABILITY_IDS).toContain(packId);
    }
  });

  it("提示词不再点名具体联网工具，也不再禁止不存在的发现工具", () => {
    const prompt = buildCodeWorkSkillPrompt();
    expect(prompt).not.toContain("firecrawl_scrape");
    // listAgents/readAgent 不在 tier 轮的工具面里，提示词不该提它们。
    expect(prompt).not.toContain("listAgents");
    expect(prompt).not.toContain("readAgent");
  });
});
