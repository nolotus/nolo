import { describe, expect, test } from "bun:test";
import { FORCED_TOOLS, applyDisabledTools, expandEnabledPacks, expandEnabledPackPromptPatches, appendEnabledPackPromptPatches, CAPABILITY_PACKS, CAPABILITY_PACK_BY_ID, applySystemBuiltinSkillFilter, SYSTEM_BUILTIN_SKILL_PACK_IDS,
  collectPackIdsWithIncludes,
  TOOL_PACKS,
} from "./toolPacks";

describe("applyDefaultWebToolPacks / LIGHT_WEB", () => {
  test("LIGHT_WEB matches web-search pack, not social-reader", () => {
    const { TOOL_PACKS } = require("./toolPacks");
    expect(TOOL_PACKS.LIGHT_WEB).toEqual(["exa_search", "fetchWebpage"]);
    expect(TOOL_PACKS.LIGHT_WEB).not.toContain("read_x_post");
  });

  test("exa_search injects fetchWebpage but not social-reader tools", () => {
    const {
      applyDefaultWebToolPacks,
      addDefaultLightWebToolsForConfiguredAgents,
    } = require("./toolPacks");
    expect(applyDefaultWebToolPacks({ toolNames: ["exa_search"] })).toEqual([
      "exa_search",
      "fetchWebpage",
    ]);
    expect(
      addDefaultLightWebToolsForConfiguredAgents(["exa_search"], {
        toolNames: ["exa_search"],
      }),
    ).toEqual(["exa_search", "fetchWebpage"]);
  });

  test("browser_* injects FULL_BROWSER companions", () => {
    const { applyDefaultWebToolPacks, TOOL_PACKS } = require("./toolPacks");
    const result = applyDefaultWebToolPacks({
      toolNames: ["browser_click"],
    });
    for (const name of TOOL_PACKS.FULL_BROWSER) {
      expect(result).toContain(name);
    }
    expect(result).not.toContain("read_x_post");
  });
});

describe("applyDisabledTools", () => {
  test("returns toolNames unchanged when disabledTools is empty or missing", () => {
    expect(applyDisabledTools(["exa_search", "fetchWebpage"])).toEqual([
      "exa_search",
      "fetchWebpage",
    ]);
    expect(applyDisabledTools(["exa_search"], [])).toEqual(["exa_search"]);
    expect(applyDisabledTools(["exa_search"], null)).toEqual(["exa_search"]);
  });

  test("filters out disabled tools", () => {
    expect(
      applyDisabledTools(
        ["ask_user", "exa_search", "fetchWebpage", "readFile"],
        ["exa_search", "fetchWebpage"],
      ),
    ).toEqual(["ask_user", "readFile"]);
  });

  test("preserves FORCED_TOOLS even when disabled", () => {
    expect(
      applyDisabledTools(
        ["ask_user", "exa_search"],
        ["ask_user", "exa_search"],
      ),
    ).toEqual(["ask_user"]);
  });

  test("handles disabledTools with tools not present in toolNames (no-op)", () => {
    expect(
      applyDisabledTools(["readFile", "execShell"], ["exa_search"]),
    ).toEqual(["readFile", "execShell"]);
  });
});

describe("FORCED_TOOLS", () => {
  test("contains ask_user", () => {
    expect(FORCED_TOOLS).toContain("ask_user");
  });
});

describe("expandEnabledPacks", () => {
  test("expands a single pack into its tools", () => {
    const result = expandEnabledPacks(["web-search"]);
    expect(result).toContain("exa_search");
    expect(result).toContain("fetchWebpage");
  });

  test("expands multiple packs and merges with explicit tools", () => {
    const result = expandEnabledPacks(["web-search"], ["readFile"]);
    expect(result).toContain("exa_search");
    expect(result).toContain("fetchWebpage");
    expect(result).toContain("readFile");
  });

  test("deduplicates tools", () => {
    // fetchWebpage is in both web-search pack and explicit tools
    const result = expandEnabledPacks(["web-search"], ["fetchWebpage"]);
    expect(result.filter((t) => t === "fetchWebpage")).toHaveLength(1);
  });

  test("returns only explicit tools when no packs enabled", () => {
    expect(expandEnabledPacks([], ["readFile"])).toEqual(["readFile"]);
    expect(expandEnabledPacks(null, ["readFile"])).toEqual(["readFile"]);
  });

  test("returns empty for no packs and no explicit tools", () => {
    expect(expandEnabledPacks(undefined, undefined)).toEqual([]);
  });

  test("ignores unknown pack ids", () => {
    const result = expandEnabledPacks(["nonexistent-pack"], ["readFile"]);
    expect(result).toEqual(["readFile"]);
  });
});

describe("CAPABILITY_PACKS", () => {
  test("web-search pack contains exa_search and fetchWebpage", () => {
    const pack = CAPABILITY_PACK_BY_ID["web-search"];
    expect(pack).toBeDefined();
    expect(pack.tools).toContain("exa_search");
    expect(pack.tools).toContain("fetchWebpage");
  });

  test("long-term-memory pack contains queryMemory + rememberMemory and defaults on", () => {
    const pack = CAPABILITY_PACK_BY_ID["long-term-memory"];
    expect(pack).toBeDefined();
    expect(pack.tools).toEqual(["queryMemory", "rememberMemory"]);
    expect(pack.defaultEnabled).toBe(true);
  });

  test("all packs have unique ids", () => {
    const ids = CAPABILITY_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("CORE 不再常驻可选工具", () => {
  test("rememberMemory 已从 CORE 移至 long-term-memory 能力包", () => {
    const { TOOL_PACKS } = require("./toolPacks");
    expect(TOOL_PACKS.CORE).not.toContain("rememberMemory");
    expect(TOOL_PACKS.CORE).toContain("ask_user");
  });

  test("searchDialogMessages 已从 CORE 移除，改为内置 skill 按需加载", () => {
    const { TOOL_PACKS } = require("./toolPacks");
    expect(TOOL_PACKS.CORE).not.toContain("searchDialogMessages");
    expect(TOOL_PACKS.CORE).toContain("ask_user");
  });
});

describe("code pack", () => {
  test("code pack 包含全套 code + shell 工具", () => {
    const pack = CAPABILITY_PACK_BY_ID["code"];
    expect(pack).toBeDefined();
    expect(pack.tools).toContain("readFile");
    expect(pack.tools).toContain("writeFile");
    expect(pack.tools).toContain("editFile");
    expect(pack.tools).toContain("execShell");
    expect(pack.tools).toContain("launchProcess");
  });

  test("expandEnabledPacks 展开 code 包后得到全套工具名", () => {
    const result = expandEnabledPacks(["code"], []);
    expect(result).toContain("execShell");
    expect(result).toContain("readFile");
  });
});

describe("agent-orchestration pack", () => {
  test("包含 startAgentRun、controlAgentRun、listAgents 三个工具", () => {
    const pack = CAPABILITY_PACK_BY_ID["agent-orchestration"];
    expect(pack).toBeDefined();
    expect(pack.tools).toContain("startAgentRun");
    expect(pack.tools).toContain("controlAgentRun");
    expect(pack.tools).toContain("listAgents");
    expect(pack.tools.length).toBe(3);
  });

  test("默认启用", () => {
    const pack = CAPABILITY_PACK_BY_ID["agent-orchestration"];
    expect(pack.defaultEnabled).toBe(true);
  });

  test("文案要求先读取收藏、简介、能力和成本摘要", () => {
    const pack = CAPABILITY_PACK_BY_ID["agent-orchestration"];
    expect(pack.description).toContain("收藏");
    expect(pack.description).toContain("简介");
    expect(pack.description).toContain("能力");
    expect(pack.description).toContain("成本");
    expect(pack.description).toContain("可运行 key");
  });

  test("expandEnabledPacks 展开 agent-orchestration 包后得到全部工具名", () => {
    const result = expandEnabledPacks(["agent-orchestration"], []);
    expect(result).toContain("startAgentRun");
    expect(result).toContain("controlAgentRun");
    expect(result).toContain("listAgents");
  });
});

describe("addDefaultSystemCapabilityTools（系统能力默认挂载）", () => {
  test("返回编排三件套，幂等且不重复", () => {
    const {
      getDefaultSystemCapabilityTools,
      addDefaultSystemCapabilityTools,
    } = require("./toolPacks");
    expect(getDefaultSystemCapabilityTools().sort()).toEqual([
      "controlAgentRun",
      "listAgents",
      "startAgentRun",
    ]);
    const merged = addDefaultSystemCapabilityTools(["execShell", "startAgentRun"]);
    expect(merged).toContain("execShell");
    expect(merged).toContain("startAgentRun");
    expect(merged).toContain("controlAgentRun");
    expect(merged).toContain("listAgents");
    expect(merged.filter((t: string) => t === "startAgentRun").length).toBe(1);
  });

  test("不默认挂载 web-search（保持 web 能力边界）", () => {
    const { getDefaultSystemCapabilityTools } = require("./toolPacks");
    const tools = getDefaultSystemCapabilityTools();
    expect(tools).not.toContain("exa_search");
    expect(tools).not.toContain("fetchWebpage");
  });
});

describe("skills pack", () => {
  test("包含 loadSkill、readSkillDoc 两个工具", () => {
    const pack = CAPABILITY_PACK_BY_ID["skills"];
    expect(pack).toBeDefined();
    expect(pack.tools).toContain("loadSkill");
    expect(pack.tools).toContain("readSkillDoc");
    expect(pack.tools.length).toBe(2);
  });

  test("默认启用", () => {
    const pack = CAPABILITY_PACK_BY_ID["skills"];
    expect(pack.defaultEnabled).toBe(true);
  });

  test("expandEnabledPacks 展开 skills 包后得到全部工具名", () => {
    const result = expandEnabledPacks(["skills"], []);
    expect(result).toContain("loadSkill");
    expect(result).toContain("readSkillDoc");
  });

  test("ground truth: code + agent-orchestration + skills 展开含 loadSkill/readSkillDoc", () => {
    const result = expandEnabledPacks(["code", "agent-orchestration", "skills"], []);
    expect(result).toContain("loadSkill");
    expect(result).toContain("readSkillDoc");
    expect(result).toContain("execShell");
    expect(result).toContain("startAgentRun");
  });

  test("uiAskChoiceFunctionSchema 顶层及 detail 包含引导模型先解释的规范", () => {
    const { uiAskChoiceFunctionSchema } = require("./uiAskChoiceTool");
    expect(uiAskChoiceFunctionSchema.description).toContain("解释背景");
    const detailProp = uiAskChoiceFunctionSchema.parameters.properties.choices.items.properties.detail;
    expect(detailProp.description).toContain("简短补充（建议一句话），长解释写进调用前的回复文本");
  });
});

describe("app-builder pack", () => {
  test("自身持有 14 个工具，部署那 3 个已拆到 app-deploy", () => {
    const pack = CAPABILITY_PACK_BY_ID["app-builder"];
    expect(pack).toBeDefined();
    expect(pack.tools).toContain("appRead");
    expect(pack.tools).toContain("appFileReplace");
    expect(pack.tools).toContain("createTable");
    expect(pack.tools).toContain("openAIGptImage");
    // 发布能力独立成包，可以单独关掉；组合展开后总数仍是 17
    // （见「能力包组合（includes）」那组测试的逐字节断言）。
    expect(pack.tools).not.toContain("appPreflight");
    expect(pack.tools).not.toContain("appDeploy");
    expect(pack.tools).not.toContain("appDelete");
    expect(pack.tools.length).toBe(14);
    expect(pack.includes).toEqual(["app-deploy"]);
  });

  test("默认不启用（避免污染新建 agent 的默认工具集）", () => {
    const pack = CAPABILITY_PACK_BY_ID["app-builder"];
    expect(pack.defaultEnabled).toBe(false);
  });

  test("携带配套操作纪律 promptPatch", () => {
    const pack = CAPABILITY_PACK_BY_ID["app-builder"];
    expect(pack.promptPatch).toBeDefined();
    expect(pack.promptPatch).toContain("应用构建能力包");
    expect(pack.promptPatch).toContain("SSR");
    expect(pack.promptPatch).toContain("public-submit");
  });

  test("expandEnabledPackPromptPatches 收集启用包的 promptPatch", () => {
    // 组合包会把子包的 promptPatch 一并带上：构建纪律 + 发布纪律。
    const patches = expandEnabledPackPromptPatches(["app-builder"]);
    expect(patches).toHaveLength(2);
    expect(patches[0]).toContain("应用构建能力包");
    expect(patches[1]).toContain("应用发布能力包");
  });

  test("expandEnabledPackPromptPatches 忽略无 promptPatch 的包与未知 id", () => {
    expect(expandEnabledPackPromptPatches(["web-search", "agent-orchestration"])).toEqual([]);
    expect(expandEnabledPackPromptPatches(["does-not-exist"])).toEqual([]);
    expect(expandEnabledPackPromptPatches(null)).toEqual([]);
    expect(expandEnabledPackPromptPatches([])).toEqual([]);
  });

  test("expandEnabledPacks 展开 app-builder 包后得到 17 个工具", () => {
    const result = expandEnabledPacks(["app-builder"], []);
    expect(result).toContain("appRead");
    expect(result).toContain("appDeploy");
    expect(result.length).toBe(17);
  });

  test("appendEnabledPackPromptPatches 把纪律追加到 prompt 末尾", () => {
    const prompt = appendEnabledPackPromptPatches("你是构建助手。", ["app-builder"]);
    expect(prompt).toContain("你是构建助手。");
    expect(prompt).toContain("应用构建能力包");
    expect(prompt).toContain("SSR");
  });

  test("appendEnabledPackPromptPatches 无启用包时原样返回", () => {
    expect(appendEnabledPackPromptPatches("hi", [])).toBe("hi");
    expect(appendEnabledPackPromptPatches("hi", undefined)).toBe("hi");
    expect(appendEnabledPackPromptPatches(undefined, ["app-builder"])).toContain(
      "应用构建能力包",
    );
    expect(appendEnabledPackPromptPatches(null, ["web-search"])).toBeUndefined();
  });

  test("appendEnabledPackPromptPatches 重复追加会去重", () => {
    const once = appendEnabledPackPromptPatches("base", ["app-builder"]);
    const twice = appendEnabledPackPromptPatches(once, ["app-builder"]);
    expect(twice).toBe(once);
  });
});

describe("SYSTEM_BUILTIN_SKILL_PACK_IDS + applySystemBuiltinSkillFilter", () => {
  test("SYSTEM_BUILTIN_SKILL_PACK_IDS 当前含 web-search + web-scrape + conversation-todo + agent-orchestration", () => {
    // 新增内置 skill 时这里要同步更新——防止静默漏掉真值对齐。
    expect([...SYSTEM_BUILTIN_SKILL_PACK_IDS]).toEqual([
      "web-search",
      "web-scrape",
      "conversation-todo",
      "agent-orchestration",
    ]);
  });

  test("默认开启（无 map / 缺 key / true）不过滤任何工具", () => {
    const tools = ["exa_search", "fetchWebpage", "readFile", "ask_user"];
    expect(applySystemBuiltinSkillFilter(tools, undefined)).toEqual(tools);
    expect(applySystemBuiltinSkillFilter(tools, null)).toEqual(tools);
    expect(applySystemBuiltinSkillFilter(tools, {})).toEqual(tools);
    expect(applySystemBuiltinSkillFilter(tools, { "web-search": true })).toEqual(
      tools,
    );
    // 非 web-search 的 key 不影响 web-search 工具。
    expect(
      applySystemBuiltinSkillFilter(tools, { "web-search": true, foo: false }),
    ).toEqual(tools);
  });

  test("关闭 web-search 后过滤掉 exa_search 与 fetchWebpage，保留其他工具", () => {
    const tools = ["exa_search", "fetchWebpage", "readFile", "ask_user"];
    expect(
      applySystemBuiltinSkillFilter(tools, { "web-search": false }),
    ).toEqual(["readFile", "ask_user"]);
  });

  test("关闭 conversation-todo 后过滤掉 setTodoList，保留其他工具", () => {
    const tools = ["setTodoList", "readFile", "ask_user"];
    expect(
      applySystemBuiltinSkillFilter(tools, { "conversation-todo": false }),
    ).toEqual(["readFile", "ask_user"]);
  });

  test("关闭 agent-orchestration 后过滤掉 startAgentRun/controlAgentRun/listAgents", () => {
    const tools = [
      "startAgentRun",
      "controlAgentRun",
      "listAgents",
      "readFile",
    ];
    expect(
      applySystemBuiltinSkillFilter(tools, { "agent-orchestration": false }),
    ).toEqual(["readFile"]);
  });

  test("仅显式 false 触发过滤；其他 falsy（0/空串/null）按 Boolean 归一化后判定", () => {
    // applySystemBuiltinSkillFilter 内部用 === false 判定，与 selector 归一化
    // 后的 boolean map 对齐；非 false 值不过滤。
    const tools = ["exa_search", "readFile"];
    expect(
      applySystemBuiltinSkillFilter(tools, { "web-search": 0 } as any),
    ).toEqual(tools);
  });
});

describe("能力包组合（includes）", () => {
  const APP_BUILDER_TOOLS_BEFORE_SPLIT = [
    "appRead", "appFileList", "appFileSearch", "appFileRead", "appFileReplace",
    "appFileWrite", "appPreflight", "appDeploy", "appList", "appDelete",
    "createTable", "addTableRow", "addTableRows", "queryTableRows",
    "updateTableRow", "deleteTableRow", "openAIGptImage",
  ];

  test("app-builder 拆出 app-deploy 后展开的工具集逐字节不变", () => {
    // 这是整个拆分的安全网：存量 enabledPacks:["app-builder"] 的 agent
    // 一个工具都不能多、不能少。
    expect(expandEnabledPacks(["app-builder"]).sort()).toEqual(
      [...APP_BUILDER_TOOLS_BEFORE_SPLIT].sort(),
    );
  });

  test("app-deploy 可以单独启用——「能不能发布」是独立开关", () => {
    expect(expandEnabledPacks(["app-deploy"]).sort()).toEqual(
      ["appDelete", "appDeploy", "appPreflight"],
    );
  });

  test("只给改代码不给发布：app-builder 的文件工具在，部署工具不在", () => {
    // 这是拆分带来的新能力：以前做不到，因为两者绑在同一个包里。
    const filesOnly = expandEnabledPacks(["app-builder"]).filter(
      (t) => !["appPreflight", "appDeploy", "appDelete"].includes(t),
    );
    expect(filesOnly).toContain("appFileWrite");
    expect(filesOnly).not.toContain("appDeploy");
  });

  test("子包的 promptPatch 随组合一起注入", () => {
    const patches = expandEnabledPackPromptPatches(["app-builder"]);
    expect(patches.length).toBe(2);
    expect(patches.join("\n")).toContain("部署应答模板");
    expect(patches.join("\n")).toContain("定点修改");
  });

  test("collectPackIdsWithIncludes 防环", () => {
    // 组合表是手写常量，写错成环时应该稳定收敛而不是栈溢出。
    expect(collectPackIdsWithIncludes(["app-builder"])).toEqual([
      "app-builder",
      "app-deploy",
    ]);
    expect(collectPackIdsWithIncludes(["app-builder", "app-deploy"])).toEqual([
      "app-builder",
      "app-deploy",
    ]);
    expect(collectPackIdsWithIncludes([])).toEqual([]);
    expect(collectPackIdsWithIncludes(undefined)).toEqual([]);
  });
});

describe("代码纪律与工具清单单一真相源", () => {
  test("默认 CORE 工具面不含 search_all_spaces（已改为按需内置 skill）", () => {
    // search_all_spaces 从 TOOL_PACKS.CORE 移出后，默认工具面不得再带它；
    // search_workspace（分类视图「当前空间」检索）保持常驻不受影响。
    expect(TOOL_PACKS.CORE).toContain("search_workspace");
    expect(TOOL_PACKS.CORE).not.toContain("search_all_spaces");
  });

  test("search-all-spaces 内置 skill 声明 search_all_spaces 工具", async () => {
    const { listBuiltinSkills } = await import("ai/skills/builtinSkillRegistry");
    const entry = listBuiltinSkills().find((e) => e.slug === "search-all-spaces")!;
    expect(entry).toBeTruthy();
    expect(entry.config.toolNames).toEqual(["search_all_spaces"]);
  });

  test("code 能力包与 coding skill 共用同一份工具清单", async () => {
    const { listBuiltinSkills } = await import("ai/skills/builtinSkillRegistry");
    const coding = listBuiltinSkills().find((e) => e.slug === "coding")!;
    // coding = 本地代码工具 + 编排三件套（派 review 用）
    expect(coding.config.toolNames).toEqual([
      ...TOOL_PACKS.CODE,
      "startAgentRun",
      "controlAgentRun",
      "listAgents",
    ]);
    expect(CAPABILITY_PACK_BY_ID["code"].tools).toEqual([...TOOL_PACKS.CODE]);
  });

  test("两处纪律正文逐字相同——回归：它们曾各抄一份并漂移", async () => {
    const { listBuiltinSkills } = await import("ai/skills/builtinSkillRegistry");
    const coding = listBuiltinSkills().find((e) => e.slug === "coding")!;
    const dropHeading = (text: string) => text.split("\n").slice(2).join("\n");
    expect(dropHeading(coding.config.promptPatch!)).toBe(
      dropHeading(CAPABILITY_PACK_BY_ID["code"].promptPatch!),
    );
    // 标题各自保留语境
    expect(coding.config.promptPatch).toStartWith("# 写代码纪律");
    expect(CAPABILITY_PACK_BY_ID["code"].promptPatch).toStartWith(
      "# 代码执行能力包",
    );
  });
});
