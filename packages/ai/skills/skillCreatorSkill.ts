/**
 * Platform-owned `skill-creator` built-in skill.
 *
 * Promoted from the repo's `.agents/skills/skill-creator/` (2026-09-20): the
 * methodology is fully generic (Agent Skills open standard), so the builtin
 * registry in code is the single source of truth. The repo copy was deleted.
 *
 * Self-contained by design: the repo version was a 27-line pointer into
 * `references/cross-platform-skill-authoring.md` plus bun-nolo-private scripts
 * (`scripts/skill/init.ts`, `scripts/skill/validate.ts`). End-user projects
 * have no `.agents/skills` at all, so the methodology is inlined here and the
 * project scripts are mentioned as optional, not depended on.
 *
 * Dedup boundary with builtin `agent-creator`: agent-creator owns *whether and
 * when to create an agent* plus the creation flow; this skill owns *how to author
 * a skill's content and structure*.
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const SKILL_CREATOR_SKILL_SLUGS = ["skill-creator"] as const;

export type SkillCreatorSkillSlug = (typeof SKILL_CREATOR_SKILL_SLUGS)[number];

/** Same FNV-1a deterministic id used by the other builtin skill seeds. */
function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

function normalizeSkillSeed(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSkillCreatorSkillId(
  slug: SkillCreatorSkillSlug,
): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildSkillCreatorSkillPageKey(
  userId: string,
  slug: SkillCreatorSkillSlug,
): string {
  return `page-${userId}-${buildSkillCreatorSkillId(slug)}`;
}

export function buildSkillCreatorSkillConfig(
  slug: SkillCreatorSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildSkillCreatorSkillId(slug),
    name: "Skill 编写方法论（skill-creator）",
    triggerMode: "explicit",
    description: "编写、改进与校验 Agent Skill（SKILL.md）的跨项目方法论：模糊需求诊断、结构模式选型、frontmatter description 触发词设计、Boundaries 边界划定与自包含校验清单。触发词：新建 skill、写个 skill、改 skill、把工作流转成 skill、skill 触发不了、skill 不触发、SKILL.md、校验 skill 格式、skill 边界。Make sure to use this skill whenever the user mentions skill、SKILL.md、技能创建或技能改造——even if they don't explicitly say 'skill-creator'。",
  };
}

export function buildSkillCreatorSkillContentBySlug(
  slug: SkillCreatorSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: "# Skill Creator (Agent Skill 编写方法论)\n\n写 skill 是给 agent 写「可被路由到的工作说明书」，不是给人看的文档。本 skill 只讲**怎么写 skill**；该不该新建一个 agent、agent 的创建流程归内置 `agent-creator` 管。\n\n## Core Principles\n\n### Concise is Key\n\n上下文窗口是共享的：system prompt、对话历史、其他 skill 的元数据、用户请求都在里面。**默认假设 agent 已经够聪明**，只补它没有的上下文。每句话先过三问：不说 agent 能不能自己推出来？→ 删。别的 skill 里有没有？→ 引用它。是不是详细参考资料？→ 放 `references/` 按需加载。宁要短示例，不要长解释。\n\n### Degree of Freedom\n\n把表述的严格程度匹配任务的脆弱度：\n\n- **高**（文字说明）——多条路都通，决策依赖上下文\n- **中**（带参数的模板脚本）——有首选模式，允许少量变化\n- **低**（写死的脚本与结构）——操作脆弱、一致性关键\n\n### What to Not Include\n\nskill 里只放直接支撑它职能的文件。**绝不创建** `README.md`、`INSTALLATION_GUIDE.md`、`CHANGELOG.md` 或任何讲述「它是怎么做出来的」的附属文档。skill 是给 agent 干活的，不是给人读制作过程的。\n\n## Skill Creation Process\n\n### Step 1: 一句话测试\n\n先用一句话说清这个 skill 干什么。说不清就停下重想。「它帮忙做代码审查」太模糊；「它审查 TypeScript PR 的 bug、风格与架构，并返回带 severity 等级的结构化报告」合格。\n\n#### 1b. 诊断模糊需求\n\n用户描述的是痛点而不是 skill 请求（「我每次都得手动检查 X」）时，先诊断再要结构：\n\n- 这件事最适合的是 skill、脚本、文档，还是做一次就够？\n- 若适合 skill，最轻的形态是什么：workflow、checklist、reference，还是工具封装？\n- 最多推荐两个方向，说清各自适配点与局限。\n\n#### 1c. 问对问题\n\n动笔前把核心问清楚，**每轮最多 2-3 个问题**，不要倒出一张表单。核心问题：(1) 这个 skill 要接管哪件 recurring 的活？(2) 别人会喂给它什么真实输入？(3) 它该返回什么成品？(4) 相邻的哪些请求它要明确拒绝？\n\n**顺序有讲究**：先问边界（「它不该做什么」），再问产出（「成功长什么样」），最后才问结构；能一句话说清 skill 时就停止提问。\n\n#### 1d. 对话语气\n\n语气匹配用户状态而不是模板：想法模糊时先并肩把它理清，目标清晰时直接上结构，想共创就像对等讨论并从对话里抠边界。第一回复永远不要是一张冷冰冰的表单问卷，也不要在理解真实职责之前就甩一套模板。\n\n### Step 2: 规划结构\n\n按 skill 性质选一种模式：\n\n**Workflow-based**——有清晰步骤的顺序流程：`## Overview → ## Workflow → ## Step 1 → ## Step 2 ...`，适合部署、发布、排错流程。\n\n**Task-based**——一组相关操作：`## Overview → ## Quick Start → ## Task A → ## Task B ...`，适合 CLI 参考、工具集、API 指南。\n\n**Reference-based**——标准、schema、策略：`## Overview → ## Rules → ## Examples → ## Boundaries`，适合代码审查规范、品牌标准、架构原则。\n\n### Step 3: 初始化\n\n建目录 `<skill-name>/`，写 `SKILL.md`，YAML frontmatter 至少含 `name`（kebab-case）与 `description`。项目若自带脚手架（如 bun-nolo 的 `bun scripts/skill/init.ts <name>`）优先用它，否则手写。\n\n### Step 4: 写 SKILL.md\n\n#### Frontmatter\n\n**先写 `description`**——它是 agent 决定加载前唯一能看到的东西，也是主要触发机制。agent 天然**欠触发**，要用「pushy」措辞对抗。\n\n```yaml\ndescription: >\n  [它做什么]。Use when [具体触发词、关键词、场景]。\n```\n\n规则：\n\n- 同时写「做什么」和「何时用」；所有 when-to-use 信息进 description，不进正文\n- 触发词要具体（正式说法与口语都说上），点名文件类型、工具或场景\n- 用 pushy 措辞（「Make sure to use this skill whenever...」）\n- 负向边界（「不做 X」）放正文 `## Boundaries`，不要进 description——description 是发现菜单，每个字都该帮 agent 判断要不要加载\n- ≤1024 字符；不含尖括号 `<>`\n\n#### 正文\n\n- 用祈使句（「读这个文件」「检查格式」）\n- 解释 **why** 而不只是 what——agent 够聪明，能从原则推理\n- 宁要短示例，不要长解释\n- 引用其他 skill 用反引号包名字\n- SKILL.md 保持精简，真正需要时才拆 `references/`\n- 选定结构模式后删掉模板里的结构性 HTML 注释\n\n每个 skill 必须有 `## Boundaries` 一节，列出它刻意**不**做的事——没有边界的 skill 会逐渐吞并相邻任务直到不可靠；显式列出不处理什么，是提升触发准确率最快的办法。\n\n### Step 5: 校验\n\n跑项目自带校验（如 bun-nolo 的 `bun scripts/skill/validate.ts <path>` 或 `--all`）；没有就按此清单自查：SKILL.md 存在；frontmatter 合法；`name` 是 kebab-case 且 ≤64 字符；`description` 存在、无 `<>`、≤1024 字符、无残留 TODO；有 `## Boundaries`。全过才算完成。\n\n### Step 6: 迭代\n\n用「提升可靠性大于增加上下文成本」的最小改动。包更大只在路由、执行或治理明显更可靠时才更优。skill 反复产出坏输出时，根因很少是一条坏指令，通常是结构问题。加更多文字之前先问：\n\n1. 这个 skill **拥有**什么？边界清不清？\n2. 什么**反馈**说明它在变好还是在漂移？\n3. 哪个失效只有**反复使用**后才会出现？\n4. 哪处是**最小改动、最大质量收益**？\n\n## 跨平台兼容\n\nskill 系统遵循 Agent Skills 开放标准（Anthropic/OpenAI 兼容）：frontmatter 用 `name`（kebab-case，≤64 字符）+ `description`（必填，无尖括号）；可选字段 `triggers`、`assertions`、`license`、`metadata`、`compatibility`。\n\n```text\nskill-name/\n├── SKILL.md          (required)\n├── agents/           (optional — platform-specific metadata)\n├── references/       (optional — docs loaded on demand)\n├── scripts/          (optional — executable code)\n└── assets/           (optional — templates, images, fonts)\n```\n\n## Common Mistakes\n\n| Mistake | Fix |\n|---|---|\n| Description 泛泛（「helps with X」） | 补具体触发词与场景 |\n| when-to-use 写在正文 | 挪进 description |\n| Description 含尖括号 | 去掉 `<>`（破坏 XML 解析） |\n| skill 名与注册表不一致 | 跑校验脚本抓不匹配 |\n| 建了文件忘了注册 | 用脚手架而不是手建 |\n| 没有 Boundaries 一节 | 至少写一条它不做什么 |\n| 正文过长（>500 行） | 拆成 SKILL.md + references/ |\n\n## Boundaries\n\n- 只讲怎么写 skill；不回答具体业务问题，也不替代任何具体 skill 本身\n- 不管 agent 的创建与生命周期——那是内置 `agent-creator` 的职责\n- 不为了「看起来专业」扩写长文；目标始终是高信噪比、易触发、易维护",
    skillConfig: buildSkillCreatorSkillConfig(slug),
  });
}
