/**
 * Platform-owned `worktree-isolation` built-in skill（仓库改动隔离）。
 *
 * 背景：worktree 隔离规程此前只存在于 bun-nolo 自己的 `.agents/skills/`
 * （当时的 nolo-plan skill 内；该 skill 已随 2026-11-06 文档迁移删除，仓库侧
 * 规程改由 AGENTS.md 承载），终态用户自建的项目里没有那份文件，文件系统发现层
 * （`.agents/skills` 扫描）对他们恒为空——需要隔离的 agent 发现不了规程，
 * 不需要的 agent 也什么都不必带。
 *
 * 本模块把这份规程收编为平台内置 skill：内容全部来自代码，经
 * builtinSkillRegistry 暴露给运行时，不落 DB。
 *
 * 2026-11 起规程本体上移为系统层固定前置
 * （`agent-runtime/worktreeIsolationPrelude.ts` 的 `WORKTREE_ISOLATION_PRELUDE`，
 * 四条装配线无条件注入）：本 skill 的正文直接**引用该常量**，不再维护第二份口径。
 * 相应地它退出了默认提示与市场目录——
 * `ai/tools/agentSkillConfig.DEFAULT_RECOMMENDED_SKILL_SLUGS` 已不含本 slug，
 * `ai/agent/web/skillExploreDirectory.PLATFORM_CORE_SKILL_SLUGS` 把它挡在市场目录
 * （含搜索）之外，因此 agent 配置里的 `disabled` 也关不掉规程本身（规程由系统层
 * 注入，不读 skill 配置）。注册表条目、slug / skillId / page-key 解析与 legacy
 * 引用读取保持原样（loadSkill 仍能取回本 skill 内容）。
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
// 规程正文唯一真源：系统层固定前置（本 skill 正文直接引用它，不另写副本）。
import { WORKTREE_ISOLATION_PRELUDE } from "../../agent-runtime/worktreeIsolationPrelude";

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
      "你是「仓库改动隔离」规程的使用者。本规程正文的唯一真源是系统层常量",
      "`WORKTREE_ISOLATION_PRELUDE`（`packages/agent-runtime/worktreeIsolationPrelude.ts`），",
      "下面直接引用它，不另写副本——两边口径必须一致时改那一处。",
      "",
      WORKTREE_ISOLATION_PRELUDE,
      "",
      "## 本 skill 的补充（不与上面的正文冲突）",
      "- 主检出有无关脏改动时：仍从 HEAD 建 worktree，把本次的 diff/patch 应用过去，不碰主检出的无关改动。",
      "- 传路径给子代理/工具时用 worktree 的绝对路径。",
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
