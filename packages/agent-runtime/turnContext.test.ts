import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildAgentsMdLayer,
  buildDialogSummaryLayer,
  buildLinkedSpacesSection,
  buildMemoryOverlayLayer,
  buildMemoryUseGuidanceLayer,
  buildSkillContentLayer,
  buildSkillDiscoveryLayer,
  buildSpaceContextLayer,
  buildUserGlobalPromptLayer,
  buildUserResponseLanguageLayer,
  buildWorkspaceContextLayer,
  partitionScopedBlocks,
  renderTurnContextBlocks,
  spaceRecordKey,
  type TurnContextSource,
} from "./turnContext";
import { discoverSkills } from "./skillDiscovery";

const sourceOf = (
  records: Record<string, Record<string, unknown> | null>,
): TurnContextSource => ({
  readRecord: async (dbKey) => records[dbKey] ?? null,
});

const failingSource = (message: string): TurnContextSource => ({
  readRecord: async () => {
    throw new Error(message);
  },
});

const SPACE_ID = "01KW6ZY7V3MC9GCAJZDNRBX1Y0";

const spaceRecord = {
  id: SPACE_ID,
  name: "产品工作台",
  description: "主力项目空间",
  categories: {
    "cat-b": { name: "调研", order: 2 },
    "cat-a": { name: "规划", order: 1 },
    "cat-null": null,
  },
  contents: {
    "doc-1": {
      title: "路线图",
      type: "page",
      contentKey: "doc-1",
      categoryId: "cat-a",
      updatedAt: 200,
    },
    "dialog-1": {
      title: "周会讨论",
      type: "dialog",
      contentKey: "dialog-1",
      updatedAt: 300,
    },
    "gone": null,
  },
};

describe("spaceRecordKey", () => {
  it("prefixes bare ids and keeps prefixed keys", () => {
    expect(spaceRecordKey(SPACE_ID)).toBe(`space-${SPACE_ID}`);
    expect(spaceRecordKey(`space-${SPACE_ID}`)).toBe(`space-${SPACE_ID}`);
  });
});

describe("buildSpaceContextLayer", () => {
  it("returns null when the dialog has no spaceId", async () => {
    expect(
      await buildSpaceContextLayer({ source: sourceOf({}), spaceId: "" }),
    ).toBeNull();
    expect(
      await buildSpaceContextLayer({ source: sourceOf({}), spaceId: null }),
    ).toBeNull();
  });

  it("renders title, id, categories in order, and recent contents", async () => {
    const layer = await buildSpaceContextLayer({
      source: sourceOf({ [`space-${SPACE_ID}`]: spaceRecord }),
      spaceId: SPACE_ID,
    });

    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("space-context");
    expect(layer!.cacheScope).toBe("turn");
    const content = layer!.content;
    expect(content).toContain("本对话属于以下 Space");
    expect(content).toContain("Space Title: 产品工作台");
    expect(content).toContain(`Space ID: ${SPACE_ID}`);
    // category order respected
    expect(content.indexOf("规划")).toBeLessThan(content.indexOf("调研"));
    // most recently updated content first
    expect(content.indexOf("周会讨论")).toBeLessThan(content.indexOf("路线图"));
    // uncategorized fallback
    expect(content).toContain("Category: Uncategorized");
  });

  it("respects recentContentLimit", async () => {
    const layer = await buildSpaceContextLayer({
      source: sourceOf({ [`space-${SPACE_ID}`]: spaceRecord }),
      spaceId: SPACE_ID,
      recentContentLimit: 1,
    });
    expect(layer!.content).toContain("周会讨论");
    expect(layer!.content).not.toContain("路线图");
  });

  it("emits an explicit failure layer when the record is missing", async () => {
    const layer = await buildSpaceContextLayer({
      source: sourceOf({}),
      spaceId: SPACE_ID,
    });
    expect(layer).not.toBeNull();
    expect(layer!.content).toContain(`声明属于 Space ${SPACE_ID}`);
    expect(layer!.content).toContain("不要声称对话不属于任何空间");
  });

  it("emits an explicit failure layer when the read throws", async () => {
    const layer = await buildSpaceContextLayer({
      source: failingSource("network down"),
      spaceId: SPACE_ID,
    });
    expect(layer!.content).toContain("network down");
    expect(layer!.content).toContain("不要声称对话不属于任何空间");
  });
});

describe("buildWorkspaceContextLayer", () => {
  it("returns null when nothing is bound and no error occurred", () => {
    expect(buildWorkspaceContextLayer({})).toBeNull();
    expect(buildWorkspaceContextLayer({ spaceId: SPACE_ID })).toBeNull();
  });

  it("declares the bound folder as tool root", () => {
    const layer = buildWorkspaceContextLayer({
      spaceId: SPACE_ID,
      boundFolder: "/Users/me/project",
      cwd: "/Users/me/project",
    });
    expect(layer!.id).toBe("workspace-context");
    expect(layer!.content).toContain("/Users/me/project");
    expect(layer!.content).toContain(`Space ${SPACE_ID}`);
    expect(layer!.content).toContain("默认以该目录为根");
  });

  it("shows both boundFolder and a diverging cwd", () => {
    const layer = buildWorkspaceContextLayer({
      boundFolder: "/Users/me/project",
      cwd: "/Users/me/elsewhere",
    });
    expect(layer!.content).toContain("/Users/me/project");
    expect(layer!.content).toContain("实际工作目录（cwd）：/Users/me/elsewhere");
  });

  it("reports resolution failure instead of going silent", () => {
    const layer = buildWorkspaceContextLayer({
      spaceId: SPACE_ID,
      resolutionError: "boundFolder is not absolute",
    });
    expect(layer!.content).toContain("解析失败：boundFolder is not absolute");
  });

  it("falls back to plain cwd when no binding exists", () => {
    const layer = buildWorkspaceContextLayer({ cwd: "/tmp/work" });
    expect(layer!.content).toContain("本轮工作目录（cwd）：/tmp/work");
  });
});

describe("renderTurnContextBlocks", () => {
  it("drops null and empty layers, keeps order", async () => {
    const space = await buildSpaceContextLayer({
      source: sourceOf({ [`space-${SPACE_ID}`]: spaceRecord }),
      spaceId: SPACE_ID,
    });
    const blocks = renderTurnContextBlocks([
      space,
      null,
      buildWorkspaceContextLayer({}),
      buildWorkspaceContextLayer({ cwd: "/tmp/work" }),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("当前空间");
    expect(blocks[1]).toContain("工作区");
  });
});

describe("buildLinkedSpacesSection", () => {
  it("returns null when there are no linked spaces", async () => {
    expect(await buildLinkedSpacesSection({ source: sourceOf({}), linkedSpaceIds: [] })).toBeNull();
    expect(await buildLinkedSpacesSection({ source: sourceOf({}), linkedSpaceIds: null })).toBeNull();
    expect(await buildLinkedSpacesSection({ source: sourceOf({}), linkedSpaceIds: ["", "  "] })).toBeNull();
  });

  it("lists readable linked spaces with name and description", async () => {
    const section = await buildLinkedSpacesSection({
      source: sourceOf({
        "space-link-a": { name: "设计稿库", description: "UI 资产" },
        "space-link-b": { name: "API 文档" },
      }),
      linkedSpaceIds: ["link-a", "space-link-b"],
    });
    expect(section).not.toBeNull();
    expect(section!).toContain("--- 关联空间 (Linked Spaces) ---");
    expect(section!).toContain("- 设计稿库 (ID: link-a): UI 资产");
    expect(section!).toContain("- API 文档 (ID: space-link-b)");
    expect(section!).toContain("可使用 read 工具配合对应的 dbKey");
  });

  it("marks unreadable linked spaces with the explicit [无法访问] marker", async () => {
    const section = await buildLinkedSpacesSection({
      source: sourceOf({ "space-link-a": { name: "设计稿库" } }),
      linkedSpaceIds: ["link-a", "link-missing"],
    });
    expect(section!).toContain("- 设计稿库 (ID: link-a)");
    expect(section!).toContain("- [无法访问] link-missing");
  });

  it("treats a read that throws as inaccessible instead of crashing", async () => {
    const section = await buildLinkedSpacesSection({
      source: failingSource("db down"),
      linkedSpaceIds: ["link-x"],
    });
    expect(section!).toContain("- [无法访问] link-x");
  });
});

describe("buildDialogSummaryLayer", () => {
  it("returns null when neither summary has content", () => {
    expect(buildDialogSummaryLayer({})).toBeNull();
    expect(buildDialogSummaryLayer({ summary: "  " })).toBeNull();
  });

  it("wraps the historical summary in the stale-replay guard", () => {
    const layer = buildDialogSummaryLayer({
      summary: "讨论了建 issue #42，接下来执行 /deploy",
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("dialog-summary");
    expect(layer!.content).toContain("--- 历史对话摘要 ---");
    expect(layer!.content).toContain("【历史参考，非活指令】");
    expect(layer!.content).toContain("讨论了建 issue #42");
  });
});

describe("buildUserGlobalPromptLayer", () => {
  const USER_ID = "user-1";

  it("returns null when there is no userId (no dialog record → do not guess)", async () => {
    expect(await buildUserGlobalPromptLayer({ source: sourceOf({}), userId: "" })).toBeNull();
    expect(await buildUserGlobalPromptLayer({ source: sourceOf({}), userId: null })).toBeNull();
  });

  it("returns null when the settings record exists but has no globalPrompt", async () => {
    const layer = await buildUserGlobalPromptLayer({
      source: sourceOf({ "user-1-settings": { userId: USER_ID, theme: "dark" } }),
      userId: USER_ID,
    });
    expect(layer).toBeNull();
  });

  it("returns null when the settings record is missing (legitimate no-preference state)", async () => {
    const layer = await buildUserGlobalPromptLayer({
      source: sourceOf({}),
      userId: USER_ID,
    });
    expect(layer).toBeNull();
  });

  it("renders the globalPrompt when present", async () => {
    const layer = await buildUserGlobalPromptLayer({
      source: sourceOf({
        "user-1-settings": { userId: USER_ID, globalPrompt: "回答用中文，先给结论" },
      }),
      userId: USER_ID,
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("user-global-prompt");
    expect(layer!.content).toContain("用户全局偏好");
    expect(layer!.content).toContain("回答用中文，先给结论");
  });

  it("uses the provided settingsKey builder", async () => {
    const layer = await buildUserGlobalPromptLayer({
      source: sourceOf({ "custom-settings-user-1": { globalPrompt: "custom" } }),
      userId: USER_ID,
      settingsKey: (uid) => `custom-settings-${uid}`,
    });
    expect(layer!.content).toContain("custom");
  });

  it("emits an explicit failure layer when the read throws", async () => {
    const layer = await buildUserGlobalPromptLayer({
      source: failingSource("settings db offline"),
      userId: USER_ID,
    });
    expect(layer).not.toBeNull();
    expect(layer!.content).toContain("读取用户 user-1 的偏好设置失败");
    expect(layer!.content).toContain("settings db offline");
    expect(layer!.content).toContain("不要编造偏好");
  });
});

describe("buildUserResponseLanguageLayer", () => {
  it("reads the persisted response language before the UI language", async () => {
    const layer = await buildUserResponseLanguageLayer({
      source: sourceOf({
        "user-1-settings": { responseLanguage: "en", language: "zh-CN" },
      }),
      userId: "user-1",
    });
    expect(layer?.cacheScope).toBe("session");
    expect(layer?.content).toContain("English（en-US）");
  });

  it("uses the persisted client language when no response override exists", async () => {
    const layer = await buildUserResponseLanguageLayer({
      source: sourceOf({ "user-1-settings": { language: "zh-CN" } }),
      userId: "user-1",
    });
    expect(layer?.content).toContain("Simplified Chinese（zh-CN）");
  });

  it("omits the layer when there is no user or language setting", async () => {
    expect(await buildUserResponseLanguageLayer({ source: sourceOf({}), userId: "" })).toBeNull();
    expect(await buildUserResponseLanguageLayer({ source: sourceOf({ "user-1-settings": {} }), userId: "user-1" })).toBeNull();
  });

  it("emits an explicit failure layer when the settings read throws", async () => {
    const layer = await buildUserResponseLanguageLayer({
      source: failingSource("settings db offline"),
      userId: "user-1",
    });
    expect(layer?.id).toBe("user-response-language");
    expect(layer?.cacheScope).toBe("session");
    expect(layer?.content).toContain("读取用户 user-1 的回复语言设置失败");
    expect(layer?.content).toContain("存储读取错误");
    expect(layer?.content).not.toContain("settings db offline");
    expect(layer?.content).toContain("不要猜测用户的语言偏好");
  });
});

describe("buildMemoryOverlayLayer", () => {
  it("returns null when there is no promptBlock", () => {
    expect(buildMemoryOverlayLayer({})).toBeNull();
    expect(buildMemoryOverlayLayer({ promptBlock: "" })).toBeNull();
    expect(buildMemoryOverlayLayer({ promptBlock: "   " })).toBeNull();
  });

  it("builds the memory overlay layer without guidance (guidance is decoupled to session scope)", () => {
    const layer = buildMemoryOverlayLayer({
      promptBlock: "--- Memory Overlay ---\n[Semantic]\n- 用户是 nolotus",
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("memory-overlay");
    expect(layer!.content).toContain("用户是 nolotus");
    expect(layer!.cacheScope).toBe("session");
  });
});

describe("buildMemoryUseGuidanceLayer", () => {
  it("returns null when there is no promptBlock", () => {
    expect(buildMemoryUseGuidanceLayer({})).toBeNull();
    expect(buildMemoryUseGuidanceLayer({ promptBlock: "" })).toBeNull();
  });

  it("builds session-scope memory-use guidance when promptBlock exists", () => {
    const layer = buildMemoryUseGuidanceLayer({
      promptBlock: "--- Memory Overlay ---\n[Semantic]\n- 用户是 nolotus",
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("memory-use-guidance");
    expect(layer!.cacheScope).toBe("session");
    expect(layer!.content).toContain("--- 记忆使用方式 ---");
    expect(layer!.content).toContain("当前输入");
  });
});

describe("buildAgentsMdLayer", () => {
  it("returns null for empty content", () => {
    expect(buildAgentsMdLayer("")).toBeNull();
    expect(buildAgentsMdLayer("   ")).toBeNull();
  });

  it("builds a session-scope layer with AGENTS.md content", () => {
    const layer = buildAgentsMdLayer("# Project Rules\nUse bun test");
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("agents-md");
    expect(layer!.cacheScope).toBe("session");
    expect(layer!.content).toContain("Project Rules");
    expect(layer!.content).toContain("Use bun test");
  });
});

describe("buildSkillContentLayer", () => {
  it("returns null for empty content", () => {
    expect(buildSkillContentLayer("")).toBeNull();
  });

  it("builds a turn-scope layer with skill content", () => {
    const layer = buildSkillContentLayer("## my-skill\nDo the thing.");
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("skill-content");
    expect(layer!.cacheScope).toBe("turn");
    expect(layer!.content).toContain("Do the thing.");
  });
});

describe("buildSkillDiscoveryLayer", () => {
  it("returns null when no skills discovered", () => {
    expect(buildSkillDiscoveryLayer([], "/workspace")).toBeNull();
  });

  it("lists discovered skills with names and paths", () => {
    const layer = buildSkillDiscoveryLayer(
      [
        { name: "deployment", description: "Deploy stuff", relativePath: ".agents/skills/deployment/SKILL.md" },
        { name: "nolo-cli", description: "CLI guide", relativePath: ".agents/skills/nolo-cli/SKILL.md" },
      ],
      "/workspace",
    );
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe("skill-discovery");
    expect(layer!.content).toContain("2 个技能");
    expect(layer!.content).toContain("deployment");
    expect(layer!.content).toContain("nolo-cli");
  });

  it("keeps session blocks ahead of turn blocks regardless of input order", () => {
    // The stable prefix is only cacheable while it stays byte-identical, so a
    // turn-scope block appearing before a session-scope one would push every
    // later block out of the cached region.
    const ordered = partitionScopedBlocks([
      { content: "skill body", cacheScope: "turn" as const },
      { content: "AGENTS.md", cacheScope: "session" as const },
      { content: "memory overlay", cacheScope: "turn" as const },
      { content: "skill index", cacheScope: "session" as const },
    ]);
    expect(ordered.map((block) => block.content)).toEqual([
      "AGENTS.md",
      "skill index",
      "skill body",
      "memory overlay",
    ]);
  });

  it("is session-scoped so the index sits in the cached stable prefix", () => {
    // The index is a pure function of the workspace skill dirs — identical on
    // every turn. Turn-scope would push ~1.5k tokens into the uncached suffix.
    const layer = buildSkillDiscoveryLayer(
      [{ name: "deployment", description: "Deploy stuff", relativePath: ".agents/skills/deployment/SKILL.md" }],
      "/workspace",
    );
    expect(layer!.cacheScope).toBe("session");
  });

  it("end-to-end: discoverSkills + buildSkillDiscoveryLayer produces a model-readable index", () => {
    // 模拟 CLI agentRunCommand 的 skill discovery 注入链路：
    // 扫描工作区 → 构建 layer → layer.content 注入 extraContextBlocks。
    // 这是渐进加载生效的端到端验证：模型收到的 contextBlocks 里必须有
    // skill 索引，且每条含 name/description/path（模型可据此 readFile）。
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-e2e-skill-discovery-"));
    try {
      const skillDir = join(tempDir, ".agents", "skills", "nolo-commit");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        [
          "---",
          "name: nolo-commit",
          "description: >-",
          "  commit 规则：AI 署名 trailer、分组标准、push 批准边界。",
          "---",
          "body",
        ].join("\n"),
        "utf8",
      );

      const discovered = discoverSkills(tempDir);
      expect(discovered).toHaveLength(1);

      const layer = buildSkillDiscoveryLayer(discovered, tempDir);
      expect(layer).not.toBeNull();
      expect(layer!.content).toContain("可用技能");
      expect(layer!.content).toContain("nolo-commit");
      expect(layer!.content).toContain("commit 规则");
      expect(layer!.content).toContain("readFile");
      // path 让模型能直接 readFile 读取 skill 全文
      expect(layer!.content).toContain(
        join(".agents", "skills", "nolo-commit", "SKILL.md"),
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
