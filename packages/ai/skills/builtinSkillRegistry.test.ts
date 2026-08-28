import { describe, expect, it } from "bun:test";
import {
  CAPABILITY_SLUG_COLLISIONS,
  listBuiltinCapabilities,
  listBuiltinSkills,
  resolveBuiltinCapability,
  resolveBuiltinSkillByName,
  resolveBuiltinSkillEntry,
  resolveBuiltinSkillPage,
  resolveBuiltinSkillSlug,
} from "./builtinSkillRegistry";
import { resolveSkillGraphFromRoots } from "./referenceRuntime";

describe("builtinSkillRegistry", () => {
  it("registers every platform skill source with unique slugs and non-empty content", () => {
    const all = listBuiltinSkills();
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map((e) => e.slug)).size).toBe(all.length);
    expect(new Set(all.map((e) => e.skillId)).size).toBe(all.length);
    for (const entry of all) {
      expect(entry.content.length).toBeGreaterThan(0);
      expect(entry.config.name).toBeTruthy();
    }
  });

  it("covers the platform sources", () => {
    for (const slug of ["coding", "feedback", "code-planning", "search-dialog-messages", "search-all-spaces"]) {
      expect(resolveBuiltinSkillSlug(slug)).toBe(slug);
    }
  });

  it("registers the search-all-spaces builtin with its tool grant", () => {
    const entry = resolveBuiltinSkillEntry("search-all-spaces");
    expect(entry).not.toBeNull();
    expect(entry!.config.toolNames).toEqual(["search_all_spaces"]);
    expect(entry!.content.length).toBeGreaterThan(0);
    expect(entry!.content).toContain("search_all_spaces");
    // loadSkill 的内置兜底按名字也能认（space 索引未命中之后）：slug 与中文标题均可。
    expect(resolveBuiltinSkillByName("search-all-spaces")?.slug).toBe(
      "search-all-spaces",
    );
    expect(resolveBuiltinSkillByName("全空间搜索")?.slug).toBe(
      "search-all-spaces",
    );
  });

  it("registers the search-dialog-messages builtin with its tool grant", () => {
    const entry = resolveBuiltinSkillEntry("search-dialog-messages");
    expect(entry).not.toBeNull();
    expect(entry!.config.toolNames).toEqual([
      "listDialogs",
      "readDialog",
      "searchDialogMessages",
    ]);
    expect(entry!.content.length).toBeGreaterThan(0);
    expect(entry!.content).toContain("readDialog");
    expect(entry!.content).toContain("listDialogs");
    // loadSkill 的内置兜底按名字也能认（space 索引未命中之后）：slug 与中文标题均可。
    expect(resolveBuiltinSkillByName("search-dialog-messages")?.slug).toBe(
      "search-dialog-messages",
    );
    expect(resolveBuiltinSkillByName("对话检索")?.slug).toBe(
      "search-dialog-messages",
    );
  });

  it("resolves by slug / skillId / page key of any user / name", () => {
    const coding = resolveBuiltinSkillEntry("coding");
    expect(coding).not.toBeNull();
    const id = coding!.skillId;

    expect(resolveBuiltinSkillSlug(id)).toBe("coding");
    // 历史 extraReferences 里存的是真实 page key，userId 不可枚举，必须认得。
    expect(resolveBuiltinSkillSlug(`page-user-1-${id}`)).toBe("coding");
    expect(resolveBuiltinSkillSlug(`page-0e95801d90-${id}`)).toBe("coding");
    expect(resolveBuiltinSkillSlug("definitely-not-a-skill")).toBeNull();
    expect(resolveBuiltinSkillSlug("")).toBeNull();
    expect(resolveBuiltinSkillSlug(undefined)).toBeNull();
  });

  it("echoes the requested identifier back as dbKey so graph dedup keys line up", () => {
    const pageKey = `page-abc-${resolveBuiltinSkillEntry("coding")!.skillId}`;
    expect(resolveBuiltinSkillPage(pageKey)?.dbKey).toBe(pageKey);
    expect(resolveBuiltinSkillPage("coding")?.dbKey).toBe("coding");
  });

  it("resolves a full skill graph with zero database access", async () => {
    // 这是整个注册表存在的理由：DB 里什么都没有，coding 依然能解析出工具面。
    const loadPage = async (identifier: string) => {
      const page = resolveBuiltinSkillPage(identifier);
      if (!page) throw new Error(`unexpected DB read for ${identifier}`);
      return page;
    };

    const resolved = await resolveSkillGraphFromRoots({
      roots: [{ identifier: "coding", mode: "required" }],
      loadPage,
    });

    expect(resolved.requiredTools.length).toBeGreaterThan(0);
    expect(resolved.skillPromptPatches.length).toBeGreaterThan(0);
  });

  it("keeps codePlanner's own tool contract reachable from the registry", async () => {
    const resolved = await resolveSkillGraphFromRoots({
      roots: [{ identifier: "code-planning", mode: "required" }],
      loadPage: async (identifier) => resolveBuiltinSkillPage(identifier)!,
    });
    // 工作区工具 + startAgentRun，联网工具来自系统能力包（见 codePlannerWebCapability.test）。
    expect(resolved.requiredTools).toContain("editFile");
    expect(resolved.requiredTools).toContain("startAgentRun");
    expect(resolved.requiredTools).not.toContain("exa_search");
  });
});

describe("builtinSkillRegistry — 指派型 object skill", () => {
  it("resolves the exact page key object assistants put in agent.references", async () => {
    // 回归：object 助手的 agent.references 指向 page-<userId>-builtin-<kind>-skill-v1。
    // 注册表必须认得，否则那条指派链路又会退回「DB 里得有物化副本」。
    const { buildBuiltinObjectSkillReference } = await import("./builtinObjectSkills");
    const ref = buildBuiltinObjectSkillReference("table", "0e95801d90");
    const page = resolveBuiltinSkillPage(ref.dbKey);
    expect(page).not.toBeNull();
    const cfg = (page?.meta as { skillConfig?: { toolNames?: string[] } })?.skillConfig;
    expect(cfg?.toolNames).toContain("createTable");
  });

  it("covers every object skill kind", async () => {
    const { BUILTIN_OBJECT_SKILL_IDS } = await import("./builtinObjectSkills");
    for (const kind of Object.keys(BUILTIN_OBJECT_SKILL_IDS)) {
      expect(resolveBuiltinSkillSlug(kind)).toBe(kind);
    }
  });
});


describe("builtinSkillRegistry — 拦截范围必须最小", () => {
  it("does not shadow user-owned skill pages", () => {
    // 引用解析路径抢在 read() 之前，误伤一次就是用户的 skill 被内置版本顶掉。
    expect(resolveBuiltinSkillEntry("page-user1-01ABCDEFGHIJKLMNOP")).toBeNull();
    expect(resolveBuiltinSkillEntry("page-0e95801d90-01USERSKILL000000")).toBeNull();
  });

  it("does not match by display name on the dbKey path", () => {
    const coding = resolveBuiltinSkillEntry("coding")!;
    // 用户完全可以建一个自己的、名叫 coding 的 skill。
    expect(resolveBuiltinSkillEntry(coding.title.toUpperCase())).toBeNull();
    // 但 loadSkill 的兜底（已确认用户索引未命中）仍然按名字认。
    expect(resolveBuiltinSkillByName(coding.title.toUpperCase())?.slug).toBe("coding");
  });

  it("only treats page-prefixed keys as page keys", () => {
    const id = resolveBuiltinSkillEntry("coding")!.skillId;
    expect(resolveBuiltinSkillEntry(`page-user1-${id}`)?.slug).toBe("coding");
    // 别的实体键即便后缀相同也不算——agent / dialog / msg 都不该被拦。
    expect(resolveBuiltinSkillEntry(`agent-user1-${id}`)).toBeNull();
    expect(resolveBuiltinSkillEntry(`dialog-user1-${id}`)).toBeNull();
  });
});

describe("builtinSkillRegistry — 能力包视图（P2）", () => {
  it("mirrors every capability pack without altering pack behavior", async () => {
    const { CAPABILITY_PACKS } = await import("ai/tools/toolPacks");
    const caps = listBuiltinCapabilities();
    expect(caps.length).toBe(CAPABILITY_PACKS.length);
    for (const pack of CAPABILITY_PACKS) {
      const entry = resolveBuiltinCapability(pack.id);
      expect(entry).not.toBeNull();
      expect(entry!.toolNames).toEqual(pack.tools);
      expect(entry!.defaultEnabled).toBe(pack.defaultEnabled);
      expect(entry!.promptPatch).toBe(pack.promptPatch);
    }
  });

  it("keeps the two namespaces separate — capability slugs must not be intercepted as skills", () => {
    for (const cap of listBuiltinCapabilities()) {
      if ((CAPABILITY_SLUG_COLLISIONS as readonly string[]).includes(cap.slug)) continue;
      // 能力包按 enabledPacks 消费，不该被引用解析当成内置 skill 拦下来。
      expect(resolveBuiltinSkillEntry(cap.slug)).toBeNull();
    }
  });

  it("pins the known slug collisions so neither side drifts unnoticed", () => {
    const skillSlugs = new Set(listBuiltinSkills().map((e) => e.slug));
    const capSlugs = new Set(listBuiltinCapabilities().map((c) => c.slug));
    const actual = [...capSlugs].filter((s) => skillSlugs.has(s)).sort();
    // 每一组都是「同一能力的两半」：能力包持有工具，skill 持有协议。
    // 合并需要 owner 决策（会改变授权面），在那之前这里必须保持一致。
    expect(actual).toEqual([...CAPABILITY_SLUG_COLLISIONS].sort());
  });

  it("confirms each collision really is a tools-half plus a protocol-half", () => {
    for (const slug of CAPABILITY_SLUG_COLLISIONS) {
      const cap = resolveBuiltinCapability(slug)!;
      const skill = listBuiltinSkills().find((e) => e.slug === slug)!;
      expect(cap.toolNames.length).toBeGreaterThan(0);
      // skill 那半不带工具——它靠能力包注入，正文里还手写了这层依赖。
      expect(skill.config.toolNames ?? []).toEqual([]);
      expect(skill.config.promptPatch ?? skill.content).toBeTruthy();
    }
  });
});

describe("builtinSkillRegistry — 组合查询必须显式消歧", () => {
  it("naive capability-then-skill lookup silently picks one side for colliding slugs", () => {
    // P3b 会需要一个「能力包 + 内置 skill」的组合 lookup。对两个冲突 slug 来说，
    // 任何隐式顺序都会静默丢掉另一侧——而 owner 的决定是「拆不是合」，两侧各有
    // 各的语义（code=本地工作区工具 / 编码风格协议；app-builder=平台 app 工具 /
    // 构建协议）。这条测试把「隐式顺序不可接受」钉下来：P3b 必须让调用方指明
    // 查的是哪个命名空间，而不是靠 ?? 串联。
    for (const slug of CAPABILITY_SLUG_COLLISIONS) {
      const cap = resolveBuiltinCapability(slug);
      const skill = resolveBuiltinSkillEntry(slug);
      expect(cap).not.toBeNull();
      expect(skill).not.toBeNull();
      // 两侧携带的东西互补而非重复：一侧给工具，一侧给协议。
      expect(cap!.toolNames.length).toBeGreaterThan(0);
      expect(skill!.config.toolNames ?? []).toEqual([]);
    }
  });
});

describe("builtinSkillRegistry — 表格工具单一真相源", () => {
  it("table object skill 与 app-builder 能力包共用同一份清单", async () => {
    // 回归：两边曾各抄一份 6 个表格工具，改一个忘另一个就会静默不同步。
    const { TOOL_PACKS, CAPABILITY_PACK_BY_ID } = await import("ai/tools/toolPacks");
    const tableSkill = listBuiltinSkills().find((e) => e.slug === "table")!;
    expect(tableSkill.config.toolNames).toEqual([...TOOL_PACKS.TABLE]);

    const appBuilderTableTools = CAPABILITY_PACK_BY_ID["app-builder"].tools.filter(
      (t) => (TOOL_PACKS.TABLE as readonly string[]).includes(t),
    );
    expect(appBuilderTableTools).toEqual([...TOOL_PACKS.TABLE]);
  });
});

describe("builtinSkillRegistry — code-style 改名后的兼容", () => {
  it("renaming the slug did not change skillId or page keys", async () => {
    // 关键约束：object skill 的 skillId 是固定串，不是从 slug 算的。
    // 所以改 slug 不影响存量 agent.references / dialog.extraReferences。
    const entry = resolveBuiltinSkillEntry("code-style")!;
    expect(entry.skillId).toBe("builtin-code-skill-v1");
    expect(entry.title).toBe("编码风格技能");
    expect(resolveBuiltinSkillSlug("page-user1-builtin-code-skill-v1")).toBe(
      "code-style",
    );
  });

  it("frees the `code` slug for the capability pack", () => {
    // 「代码执行」能力包与「编码风格技能」是不同的东西——一个是怎么干活，
    // 一个是代码长什么样。改名让能力包拿回自己的名字。
    expect(resolveBuiltinSkillEntry("code")).toBeNull();
    expect(resolveBuiltinCapability("code")).not.toBeNull();
  });
});
