import { describe, expect, it } from "bun:test";
import {
  buildAgentSkillConfigPatch,
  isAgentSkillDisabled,
  listAgentSkillsByMode,
  resolveAgentRecommendedSkillNames,
  resolveAgentRequiredPackIds,
  resolveAgentSkillConfig,
  resolveAgentSkillMode,
  resolveAgentSkillSurface,
  toLegacyEnabledPacks,
} from "./agentSkillConfig";

describe("resolveAgentSkillConfig — 读时兼容", () => {
  it("derives required from legacy enabledPacks so existing agents are byte-identical", () => {
    // 今天「列进 enabledPacks」= 工具常驻 = required；没列过 = 完全拿不到 = 缺席。
    expect(
      resolveAgentSkillConfig({ enabledPacks: ["web-search", "code"] }),
    ).toEqual({ "web-search": "required", code: "required" });
  });

  it("treats absence as disabled, not as an implicit middle state", () => {
    // 回归：若把「没列过」读成 recommended，模型就能 loadSkill 拿到从没授权过的
    // 能力——那是权限放宽，不是兼容。
    const config = resolveAgentSkillConfig({ enabledPacks: ["web-search"] });
    expect(resolveAgentSkillMode(config, "web-search")).toBe("required");
    expect(resolveAgentSkillMode(config, "app-builder")).toBeNull();
  });

  it("prefers the new skills field when present", () => {
    expect(
      resolveAgentSkillConfig({
        skills: { coding: "recommended", "web-search": "required" },
        enabledPacks: ["should-be-ignored"],
      }),
    ).toEqual({ coding: "recommended", "web-search": "required" });
  });

  it("drops malformed entries instead of throwing — this is a read path", () => {
    expect(
      resolveAgentSkillConfig({
        skills: {
          coding: "recommended",
          bad: "explicit",
          worse: 42,
          "  ": "required",
        } as any,
      }),
    ).toEqual({ coding: "recommended" });
  });

  it("handles missing / null / array-shaped input", () => {
    expect(resolveAgentSkillConfig(null)).toEqual({});
    expect(resolveAgentSkillConfig(undefined)).toEqual({});
    expect(resolveAgentSkillConfig({})).toEqual({});
    expect(resolveAgentSkillConfig({ skills: [] as any })).toEqual({});
    expect(resolveAgentSkillConfig({ enabledPacks: ["", "  "] })).toEqual({});
  });
});

describe("isAgentSkillDisabled — 只认显式 disabled，缺席不是禁用", () => {
  it("显式 disabled 返回 true", () => {
    expect(
      isAgentSkillDisabled({ skills: { coding: "disabled" } }, "coding"),
    ).toBe(true);
  });

  it("缺席一律返回 false——存量 agent 大多没配过 skills，不能当禁用", () => {
    expect(isAgentSkillDisabled({}, "coding")).toBe(false);
    expect(isAgentSkillDisabled(null, "coding")).toBe(false);
    expect(isAgentSkillDisabled(undefined, "coding")).toBe(false);
    expect(isAgentSkillDisabled({ enabledPacks: ["coding"] }, "coding")).toBe(
      false,
    );
  });

  it("required / recommended 都不是禁用", () => {
    expect(
      isAgentSkillDisabled({ skills: { coding: "required" } }, "coding"),
    ).toBe(false);
    expect(
      isAgentSkillDisabled({ skills: { coding: "recommended" } }, "coding"),
    ).toBe(false);
  });
});

describe("写回与降级", () => {
  it("only required survives the downgrade — recommended has no legacy form", () => {
    const config = resolveAgentSkillConfig({
      skills: { a: "required", b: "recommended", c: "required" },
    });
    expect(toLegacyEnabledPacks(config)).toEqual(["a", "c"]);
  });

  it("dual-writes so old clients do not see the agent lose every capability", () => {
    const patch = buildAgentSkillConfigPatch({
      "web-search": "required",
      coding: "recommended",
    });
    expect(patch.skills).toEqual({
      "web-search": "required",
      coding: "recommended",
    });
    expect(patch.enabledPacks).toEqual(["web-search"]);
  });

  it("round-trips required-only config through the legacy field without loss", () => {
    const original = { "web-search": "required", code: "required" } as const;
    const legacy = toLegacyEnabledPacks(original);
    expect(resolveAgentSkillConfig({ enabledPacks: legacy })).toEqual(original);
  });

  it("loses the middle tier through the legacy field — documented, not accidental", () => {
    const original = { coding: "recommended" } as const;
    const legacy = toLegacyEnabledPacks(original);
    expect(legacy).toEqual([]);
    // 这就是为什么写回必须双写：只落 enabledPacks 的话，「启用」下次读成「禁用」。
    expect(resolveAgentSkillConfig({ enabledPacks: legacy })).toEqual({});
  });

  it("lists by mode deterministically", () => {
    const config = { z: "required", a: "required", m: "recommended" } as const;
    expect(listAgentSkillsByMode(config, "required")).toEqual(["a", "z"]);
    expect(listAgentSkillsByMode(config, "recommended")).toEqual(["m"]);
  });
});

describe("resolveAgentSkillSurface — 摊平成运行时四件套", () => {
  const lookup = (slug: string) =>
    ({
      "web-search": {
        title: "联网搜索",
        toolNames: ["exa_search", "fetchWebpage"],
        promptPatch: "外部检索协议",
      },
      coding: { title: "coding", toolNames: ["editFile"], promptPatch: "写代码纪律" },
    })[slug] ?? null;

  it("required 上工具面并注入 promptPatch；recommended 只进候选与提示名", () => {
    const surface = resolveAgentSkillSurface(
      { "web-search": "required", coding: "recommended" },
      lookup,
    );
    expect(surface.requiredTools).toEqual(["exa_search", "fetchWebpage"]);
    expect(surface.promptPatches).toEqual(["外部检索协议"]);
    // recommended 的工具不进 requiredTools——它只影响排序，不增长工具面。
    expect(surface.recommendedTools).toEqual(["editFile"]);
    expect(surface.recommendedNames).toEqual(["coding"]);
    expect(surface.promptPatches).not.toContain("写代码纪律");
  });

  it("未知 slug 静默跳过，不让一条脏配置炸掉整轮", () => {
    const surface = resolveAgentSkillSurface(
      { "no-such-skill": "required", "web-search": "required" },
      lookup,
    );
    expect(surface.requiredTools).toEqual(["exa_search", "fetchWebpage"]);
  });

  it("禁用（缺席）的能力完全不出现", () => {
    const surface = resolveAgentSkillSurface({ coding: "recommended" }, lookup);
    expect(surface.requiredTools).toEqual([]);
    expect(surface.promptPatches).toEqual([]);
  });

  it("显式 disabled 绝不进 recommended 面（回归：else 兜底会把禁用塞进候选）", () => {
    const surface = resolveAgentSkillSurface(
      { "web-search": "required", coding: "disabled" },
      lookup,
    );
    // required 正常上工具面
    expect(surface.requiredTools).toEqual(["exa_search", "fetchWebpage"]);
    // disabled 的工具与名字都不该出现在 recommended 面
    expect(surface.recommendedTools).toEqual([]);
    expect(surface.recommendedNames).toEqual([]);
    expect(surface.promptPatches).toEqual(["外部检索协议"]);
  });

  it("输出顺序稳定，便于快照与缓存命中", () => {
    const a = resolveAgentSkillSurface({ coding: "required", "web-search": "required" }, lookup);
    const b = resolveAgentSkillSurface({ "web-search": "required", coding: "required" }, lookup);
    expect(a).toEqual(b);
  });
});

describe("resolveAgentRequiredPackIds — 宿主的能力来源", () => {
  it("保留声明顺序，不排序", () => {
    // 回归：能力包顺序决定工具在工具面里的先后，排序会悄悄改变模型看到的排列。
    expect(
      resolveAgentRequiredPackIds({ enabledPacks: ["code", "agent-orchestration"] }),
    ).toEqual(["code", "agent-orchestration"]);
    expect(
      resolveAgentRequiredPackIds({ enabledPacks: ["web-search", "code"] }),
    ).toEqual(["web-search", "code"]);
  });

  it("只取 required——recommended 不进能力包展开管道", () => {
    expect(
      resolveAgentRequiredPackIds({
        skills: { "web-search": "required", coding: "recommended" },
      }),
    ).toEqual(["web-search"]);
  });

  it("存量记录逐字节等价于直接读 enabledPacks", () => {
    for (const packs of [[], ["code"], ["a", "b", "c"]]) {
      expect(resolveAgentRequiredPackIds({ enabledPacks: packs })).toEqual(packs);
    }
    expect(resolveAgentRequiredPackIds(null)).toEqual([]);
    expect(resolveAgentRequiredPackIds({})).toEqual([]);
  });
});

describe("三宿主接线（P3b）", () => {
  it("web / desktop / cli 的 pack 解析器都吃 skills，且对存量记录等价", async () => {
    const { resolveDesktopEffectiveEnabledPacks } = await import(
      "../../desktop-runtime/handlers/desktopAgentRuntimeTurnService"
    );
    const { resolveCliEffectiveEnabledPacks } = await import(
      "../../cli/client/localRuntimeTools"
    );

    // 存量记录：两种写法结果必须一致。
    const legacy = { enabledPacks: ["web-search", "code"] };
    const modern = { skills: { "web-search": "required", code: "required" } };

    expect(
      resolveDesktopEffectiveEnabledPacks({ ...legacy, workspaceAuthorized: false }),
    ).toEqual(
      resolveDesktopEffectiveEnabledPacks({ ...modern, workspaceAuthorized: false }),
    );
    expect(resolveCliEffectiveEnabledPacks(legacy)).toEqual(
      resolveCliEffectiveEnabledPacks(modern),
    );
  });

  it("recommended 档不进任何宿主的能力包展开", async () => {
    const { resolveDesktopEffectiveEnabledPacks } = await import(
      "../../desktop-runtime/handlers/desktopAgentRuntimeTurnService"
    );
    const packs = resolveDesktopEffectiveEnabledPacks({
      skills: { "app-builder": "recommended" },
      workspaceAuthorized: false,
    });
    // app-builder 只是「启用」，工具不该常驻。
    expect(packs).not.toContain("app-builder");
  });
});

describe("resolveAgentRecommendedSkillNames — US-1 的可发现性", () => {
  it("recommended 档的名字进提示，required 不进", () => {
    // required 的工具已经常驻，模型自然看得到，不需要再提示一遍。
    expect(
      resolveAgentRecommendedSkillNames({
        skills: { "web-search": "recommended", code: "required" },
      }),
    ).toEqual(["联网搜索"]);
  });

  it("能力包与内置 skill 两个命名空间都能解析出展示名", () => {
    expect(
      resolveAgentRecommendedSkillNames({
        skills: { coding: "recommended", "code-style": "recommended" },
      }),
    ).toEqual(["coding", "编码风格技能"]);
  });

  it("解析不出名字时退回 slug——宁可粗糙也不让这一档静默消失", () => {
    expect(
      resolveAgentRecommendedSkillNames({ skills: { "unknown-x": "recommended" } }),
    ).toEqual(["unknown-x"]);
  });

  it("存量记录不产生任何提示（它们全是 required）", () => {
    expect(resolveAgentRecommendedSkillNames({ enabledPacks: ["code"] })).toEqual([]);
    expect(resolveAgentRecommendedSkillNames(null)).toEqual([]);
  });

  it("lookup 可注入，便于宿主替换名字来源", () => {
    expect(
      resolveAgentRecommendedSkillNames({ skills: { x: "recommended" } }, () => ({
        title: "自定义名",
      })),
    ).toEqual(["自定义名"]);
  });
});

describe("buildAgentSkillConfigPatch — 禁用必须能存下去", () => {
  it("为「从有到无」的 slug 显式写 null（deepMerge 的删除标记）", () => {
    // 回归：database patch 用 deepMerge 递归合并嵌套对象，少写一个 key 不等于
    // 删除——旧值会被复活，用户点的「禁用」静默失效。
    const previous = { "web-search": "required", code: "required" } as const;
    const next = { "web-search": "required" } as const;
    const patch = buildAgentSkillConfigPatch(next, previous);
    expect(patch.skills).toEqual({ "web-search": "required", code: null });
    expect(patch.enabledPacks).toEqual(["web-search"]);
  });

  it("降档（required → recommended）直接覆盖，不需要 null", () => {
    const patch = buildAgentSkillConfigPatch(
      { code: "recommended" },
      { code: "required" },
    );
    expect(patch.skills).toEqual({ code: "recommended" });
    // recommended 不进 enabledPacks——旧客户端会看成「没这个能力」，这是降级的
    // 已知有损，skills 字段才是真相。
    expect(patch.enabledPacks).toEqual([]);
  });

  it("新增不受影响", () => {
    expect(buildAgentSkillConfigPatch({ a: "required" }, {}).skills).toEqual({
      a: "required",
    });
  });

  it("不传 previous 时退化成纯覆盖（只对整条 write 安全）", () => {
    expect(buildAgentSkillConfigPatch({ a: "required" }).skills).toEqual({
      a: "required",
    });
  });
});
