import {
  listBuiltinSkills,
  resolveBuiltinSkillEntry,
  type BuiltinSkillEntry,
} from "ai/skills/builtinSkillRegistry";
import {
  RECOMMENDED_USER_SKILL_SLUGS,
  isUserSkillToggleable,
} from "ai/skills/userSkills";

export type SkillDirectoryFilter = {
  query?: string;
};

export interface SkillDependencyItem {
  reference: string;
  entry?: BuiltinSkillEntry;
}

export interface SkillDependencies {
  required: SkillDependencyItem[];
  recommended: SkillDependencyItem[];
}

/**
 * 判断指定 slug 是否为平台推荐的用户 Skill。
 * 基于审定的 RECOMMENDED_USER_SKILL_SLUGS，推荐仅用于 UI 推荐/排序，不决定可启用性。
 */
export function isRecommendedPromptSkill(slug: string): boolean {
  return (RECOMMENDED_USER_SKILL_SLUGS as readonly string[]).includes(slug);
}

/**
 * 从内置技能列表中筛选出平台推荐的技能条目。
 */
export function getRecommendedPromptSkillEntries(
  skills: readonly BuiltinSkillEntry[],
): readonly BuiltinSkillEntry[] {
  return skills.filter((entry) => isRecommendedPromptSkill(entry.slug));
}

/**
 * 读取全部真实内置 Skill 目录。
 */
export function getBuiltinSkillDirectory(): readonly BuiltinSkillEntry[] {
  return listBuiltinSkills();
}

/**
 * 用注册表解析依赖标识（支持 slug / skillId / config.id / page-key 后缀等）。
 * 优先调用平台 builtinSkillRegistry 的 resolveBuiltinSkillEntry，
 * 无法直接匹配时在技能列表中按 config.id 或 key 后缀做保底解析。
 */
export function resolveDirectorySkill(
  reference: string,
  skills?: readonly BuiltinSkillEntry[],
): BuiltinSkillEntry | undefined {
  if (typeof reference !== "string" || !reference.trim()) {
    return undefined;
  }
  const raw = reference.trim();
  const direct = resolveBuiltinSkillEntry(raw);
  if (direct) {
    return direct;
  }

  const list = skills ?? listBuiltinSkills();
  return list.find((entry) => {
    if (entry.slug === raw || entry.skillId === raw) return true;
    if (entry.config?.id === raw) return true;
    if (raw.startsWith("page-") && raw.endsWith(`-${entry.skillId}`)) return true;
    if (raw.endsWith(`-${entry.skillId}`)) return true;
    return false;
  });
}

/**
 * 获取指定条目显式声明的依赖项集合（required 与 recommended），并将每个依赖标识解析为目标条目。
 */
export function getSkillDependencies(
  entry: BuiltinSkillEntry,
  skills?: readonly BuiltinSkillEntry[],
): SkillDependencies {
  const list = skills ?? listBuiltinSkills();
  const requiredRefs = entry.config?.requiredSkills ?? [];
  const recommendedRefs = entry.config?.recommendedSkills ?? [];

  return {
    required: requiredRefs.map((reference) => ({
      reference,
      entry: resolveDirectorySkill(reference, list),
    })),
    recommended: recommendedRefs.map((reference) => ({
      reference,
      entry: resolveDirectorySkill(reference, list),
    })),
  };
}

/**
 * 从 entry 的 config.requiredSkills / config.recommendedSkills 推导是否为组合技能。
 * 只要声明了依赖且能解析出有效子条目，即为具有包含/组合关系的技能，不按技能名称硬编码。
 */
export function isCompositeSkill(
  entry: BuiltinSkillEntry,
  skills?: readonly BuiltinSkillEntry[],
): boolean {
  const deps = getSkillDependencies(entry, skills);
  return (
    deps.required.some((item) => Boolean(item.entry)) ||
    deps.recommended.some((item) => Boolean(item.entry))
  );
}

/**
 * 获取父项包含的全部直属子技能条目列表（父项包含列表，去重）。
 */
export function getContainedSkillEntries(
  entry: BuiltinSkillEntry,
  skills?: readonly BuiltinSkillEntry[],
): readonly BuiltinSkillEntry[] {
  const deps = getSkillDependencies(entry, skills);
  const result: BuiltinSkillEntry[] = [];
  const seen = new Set<string>();

  for (const item of [...deps.required, ...deps.recommended]) {
    if (item.entry && !seen.has(item.entry.slug)) {
      seen.add(item.entry.slug);
      result.push(item.entry);
    }
  }

  return result;
}

/**
 * 推导已被父项收拢的子技能 slug 集合。
 * 规则：遍历全部组合父项（isCompositeSkill），若其子项自身不是拥有更多子项的组合父项，
 * 则视为该父项内聚收拢的子技能，在无搜索时的总览目录中隐藏。
 */
export function getCollapsedChildSlugs(
  skills: readonly BuiltinSkillEntry[],
): Set<string> {
  const collapsed = new Set<string>();

  for (const entry of skills) {
    if (!isCompositeSkill(entry, skills)) {
      continue;
    }
    const deps = getSkillDependencies(entry, skills);
    for (const item of [...deps.required, ...deps.recommended]) {
      if (item.entry && !isCompositeSkill(item.entry, skills)) {
        collapsed.add(item.entry.slug);
      }
    }
  }

  return collapsed;
}

/**
 * 纯目录过滤辅助函数：基于内置 Skill 注册表进行搜索过滤。
 * 搜索字段覆盖：名称 (title / config.name)、描述 (config.description)、slug、工具 (config.toolNames)。
 */
export function filterBuiltinSkills(
  skills: readonly BuiltinSkillEntry[],
  filter: SkillDirectoryFilter = {},
): readonly BuiltinSkillEntry[] {
  const raw = filter.query ? filter.query.trim().toLowerCase() : "";
  if (!raw) return skills;

  return skills.filter((entry) => {
    if (entry.title && entry.title.toLowerCase().includes(raw)) return true;
    if (entry.slug && entry.slug.toLowerCase().includes(raw)) return true;
    if (entry.config?.name && entry.config.name.toLowerCase().includes(raw)) return true;
    if (
      entry.config?.description &&
      entry.config.description.toLowerCase().includes(raw)
    ) {
      return true;
    }
    if (
      Array.isArray(entry.config?.toolNames) &&
      entry.config.toolNames.some((tool) => tool.toLowerCase().includes(raw))
    ) {
      return true;
    }
    return false;
  });
}

/**
 * 提供可见目录：
 * - 无搜索时：隐藏已被父项收拢的子项，保持卡片目录清爽整洁；
 * - 搜索时：全部技能均参与检索，子项亦正常出现在搜索结果中。
 */
export function getVisibleSkillDirectory(
  skills: readonly BuiltinSkillEntry[],
  query = "",
): readonly BuiltinSkillEntry[] {
  const raw = query.trim();
  if (raw) {
    return filterBuiltinSkills(skills, { query: raw });
  }

  const collapsed = getCollapsedChildSlugs(skills);
  return skills.filter((entry) => !collapsed.has(entry.slug));
}

export { isUserSkillToggleable };
