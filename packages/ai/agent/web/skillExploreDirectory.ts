import { listBuiltinSkills, type BuiltinSkillEntry } from "ai/skills/builtinSkillRegistry";

export type SkillDirectoryFilter = {
  query?: string;
};

/**
 * 纯目录辅助函数：基于内置 Skill 注册表进行搜索过滤。
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
    if (entry.config.name && entry.config.name.toLowerCase().includes(raw)) return true;
    if (entry.config.description && entry.config.description.toLowerCase().includes(raw)) {
      return true;
    }
    if (
      Array.isArray(entry.config.toolNames) &&
      entry.config.toolNames.some((tool) => tool.toLowerCase().includes(raw))
    ) {
      return true;
    }
    return false;
  });
}

/**
 * 读取全部真实内置 Skill 目录
 */
export function getBuiltinSkillDirectory(): readonly BuiltinSkillEntry[] {
  return listBuiltinSkills();
}
