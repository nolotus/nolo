/**
 * 账号级可选 Skill 配置、目录元数据与统一解析。
 *
 * 单一职责：
 * - 声明平台已审定的用户可选 Skill 标识集（SUPPORTED_USER_SKILL_SLUGS）。
 * - 声明推荐 Skill 清单（RECOMMENDED_USER_SKILL_SLUGS，仅用于 UI 推荐/发现，不决定可启用性）。
 * - 规范化用户配置的启用 Skill 列表（normalizeEnabledSkills），拦截任意正文/显示名/未知 slug。
 * - 统一解析用户启用的 Skill（resolveUserEnabledSkills）：新字段优先，显式 [] 或畸形关闭，缺失才回退 legacy。
 */

import { normalizeEnabledPromptSkills } from "./userPromptSkills";

/**
 * 平台已审定的账号级可选 Skill slug 清单。
 * 严格闭集：禁止任意正文、显示名、未审定 slug 或外部伪装。
 */
export const SUPPORTED_USER_SKILL_SLUGS = [
  "ub-mode",
  "auto-review",
  "code-style",
  "worktree-isolation",
  "systematic-investigation",
  "show-me",
  "caveman",
  "secrets-manager",
  "skill-creator",
  "code-planning",
  "coding",
  "coding-review",
] as const;

export type SupportedUserSkillSlug =
  (typeof SUPPORTED_USER_SKILL_SLUGS)[number];

const SUPPORTED_USER_SKILL_SLUG_SET: ReadonlySet<string> = new Set<string>(
  SUPPORTED_USER_SKILL_SLUGS,
);

/**
 * 推荐用户 Skill slug 清单（供 UI 推荐排序与展示，推荐与可启用互相独立）。
 */
export const RECOMMENDED_USER_SKILL_SLUGS = ["ub-mode"] as const;

export type RecommendedUserSkillSlug =
  (typeof RECOMMENDED_USER_SKILL_SLUGS)[number];

/**
 * 检查给定 slug 是否为平台支持的用户可开关 Skill。
 */
export function isUserSkillToggleable(slug: string): boolean {
  if (typeof slug !== "string") {
    return false;
  }
  return SUPPORTED_USER_SKILL_SLUG_SET.has(slug.trim());
}

/**
 * 规范化用户启用的 Skill 列表。
 *
 * 契约：
 * - 严格只接受数组形式；非数组（含单字符串、对象、null、undefined、数字）一律返回空数组。
 * - 元素必须是严格字符串，自动 trim。
 * - 仅允许 SUPPORTED_USER_SKILL_SLUGS 中的已审定 slug；过滤任意正文、非审定 slug 与工具名。
 * - 自动去重，保持原出现顺序。
 */
export function normalizeEnabledSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (SUPPORTED_USER_SKILL_SLUG_SET.has(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}

export interface UserSkillPreferences {
  enabledSkills?: unknown;
  enabledPromptSkills?: unknown;
}

/**
 * 解析用户最终生效的启用 Skill 列表。
 *
 * 契约：
 * - own enabledSkills 优先：若 preferences 对象 own 该属性，以其为准。
 *   - 显式空数组 [] 或畸形值（如非数组、包含未知 slug 归一化为空）表示关闭，绝不回退 legacy。
 * - 仅当 enabledSkills 属性缺失时，才回退到 legacy enabledPromptSkills 的 ub-mode 白名单。
 * - preferences 为 null/undefined 或空时返回空数组。
 */
export function resolveUserEnabledSkills(
  preferences: UserSkillPreferences | null | undefined,
): string[] {
  if (!preferences || typeof preferences !== "object") {
    return [];
  }

  if (Object.prototype.hasOwnProperty.call(preferences, "enabledSkills")) {
    return normalizeEnabledSkills(preferences.enabledSkills);
  }

  if (Object.prototype.hasOwnProperty.call(preferences, "enabledPromptSkills")) {
    const legacy = normalizeEnabledPromptSkills(preferences.enabledPromptSkills);
    return legacy.filter((slug) => SUPPORTED_USER_SKILL_SLUG_SET.has(slug));
  }

  return [];
}
