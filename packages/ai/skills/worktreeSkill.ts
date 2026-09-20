/**
 * Platform-owned `worktree-isolation` built-in skill（仓库改动隔离）。
 *
 * 背景：worktree 隔离规程此前只存在于 bun-nolo 自己的 `.agents/skills/`
 * （nolo-plan 内），终态用户自建的项目里没有那份文件，文件系统发现层
 * （`.agents/skills` 扫描）对他们恒为空——需要隔离的 agent 发现不了规程，
 * 不需要的 agent 也什么都不必带。
 *
 * 本模块把这份规程收编为平台内置 skill：内容全部来自代码，经
 * builtinSkillRegistry 暴露给运行时，不落 DB。默认档位
 * `recommended`（见 ai/tools/agentSkillConfig 的
 * DEFAULT_RECOMMENDED_SKILL_SLUGS）——所有 agent 的「相关技能」一行带它，
 * 任务命中才 loadSkill 拿全文；显式 `disabled` 可屏蔽。
 *
 * 边界：纯方法论文档，不授予任何工具（无 toolNames）——默认提示只增加
 * 可发现性，不放宽权限。内容刻意保持 Git 通用语义，不绑定 bun-nolo 的
 * commit trailer / review 门等项目私有约定。两条 loadSkill 宿主路径都已
 * 覆盖：web 侧走 packages/ai/tools/loadSkillTool 的注册表回退，fs 型宿主
 * （CLI / desktop-runtime）走 noloWorkspaceTools.node.ts 的注册表回退。
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const WORKTREE_SKILL_SLUGS = ["worktree-isolation"] as const;

export type WorktreeSkillSlug = (typeof WORKTREE_SKILL_SLUGS)[number];

type WorktreeSkillSeedDef = {
  slug: WorktreeSkillSlug;
  title: string;
  description: string;
  body: string;
};

/** Same FNV-1a deterministic id used by codingSkills / specialistSkills / searchSpaceSkill. */
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

export function buildWorktreeSkillId(slug: WorktreeSkillSlug): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildWorktreeSkillPageKey(
  userId: string,
  slug: WorktreeSkillSlug,
): string {
  return `page-${userId}-${buildWorktreeSkillId(slug)}`;
}

/**
 * Authoritative worktree-isolation skill seed（仓库改动隔离）。触发词前置在
 * description 前段（发现列表/引用选择器都保留开头）；正文保持 Git 通用语义。
 */
export const WORKTREE_SKILL_SEEDS: readonly WorktreeSkillSeedDef[] = [
  {
    slug: "worktree-isolation",
    title: "仓库改动隔离（worktree）",
    description:
      "改动 Git 仓库文件前的隔离规程：用 git worktree 建独立工作区，不在主检出切分支或就地改。触发词：worktree、.worktrees/、git worktree add、隔离、改动仓库文件、并行多任务、patch 隔离、清理工作区。不适用：只读查询、非 Git 目录、用户明确要求就地改。",
    body: [
      "你是「仓库改动隔离」规程的使用者：任务要修改某个 Git 仓库里的已跟踪文件时，先建独立 worktree，再动手。",
      "",
      "## 什么时候用",
      "- 任何会修改仓库已跟踪文件的任务：改代码、跑会写文件的脚本、大规模重构。",
      "- 同一仓库要并行推进多条任务线时——每条线一个 worktree，互不污染。",
      "- 主检出有无关脏改动、又不能碰它时。",
      "",
      "## 什么时候不用",
      "- 只读操作：看状态、查日志、读 diff——不需要隔离。",
      "- 目录不是 Git 仓库（用户自己的普通项目目录）——没有可隔离的对象。",
      "- 用户明确要求就地改——照做，但在回复里说明跳过了隔离及原因。",
      "",
      "## 标准流程",
      "1. `git worktree add <path> -b <branch> HEAD`（仓库无约定时，建议 `<path>` 用 `.worktrees/<name>`，名字拿不准就用任务主题）。",
      "2. 所有改动只在 worktree 内进行；验证也在 worktree 内跑。",
      "3. 传路径给子代理/工具时用 worktree 的绝对路径。",
      "4. 完成后 `git worktree remove <path>`，并用 `git worktree list` 核对无残留。",
      "",
      "## 主检出有脏改动时",
      "仍然从 HEAD 建 worktree，把本次的 diff/patch 应用过去；不碰主检出（main checkout）任何无关改动。",
      "",
      "## 边界",
      "- worktree 是隔离手段，不是提交授权：合并、推送、发布仍按用户授权边界。",
      "- 一个任务一个 worktree，不在同一个 worktree 里堆多条任务线。",
    ].join("\n"),
  },
];

function seedBySlug(slug: WorktreeSkillSlug): WorktreeSkillSeedDef {
  const seed = WORKTREE_SKILL_SEEDS.find((item) => item.slug === slug);
  if (!seed) {
    throw new Error(`Unknown worktree skill slug: ${slug}`);
  }
  return seed;
}

export function buildWorktreeSkillConfig(
  slug: WorktreeSkillSlug,
): SkillDocConfig {
  const seed = seedBySlug(slug);
  return {
    version: "0.1",
    kind: "skill",
    id: buildWorktreeSkillId(slug),
    name: seed.title,
    description: seed.description,
    triggerMode: "recommended",
  };
}

/**
 * Build the skill's markdown content by slug, without a userId. Used by hosts
 * that have no DB access (e.g. server loadSkill fallback) to return the
 * system-built-in content when no matching page exists.
 */
export function buildWorktreeSkillContentBySlug(
  slug: WorktreeSkillSlug,
): string {
  const seed = seedBySlug(slug);
  const skillConfig = buildWorktreeSkillConfig(slug);
  return buildSkillDocMarkdown({
    body: seed.body,
    skillConfig,
  });
}
