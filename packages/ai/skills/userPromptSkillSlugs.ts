/**
 * 纯提示 Skill 的 slug 白名单与规范化（零运行时依赖）。
 *
 * 单独成文件的原因：`settingPersistence` / `userSkills` / CLI 诊断只需要这里的两个符号，
 * 而 `userPromptSkills.ts` 顶层 import 了 `builtinSkillRegistry`（全部内置 Skill 正文）与
 * `skillDocProtocol`（js-yaml）。那份依赖会被打进 web entry（实测约 305.6KB raw / 79.2KB br），
 * 让访客与登录用户都为一个「解析 prompt 正文」的能力付费。把这些零依赖符号拆出来后，
 * 设置持久化链路不再拖入 registry 与 YAML 解析器。
 */

import type { AgentSkillConfigSource } from "ai/tools/agentSkillConfig";

/**
 * 纯提示 Skill 偏好解析支持的 Agent 配置来源。
 *
 * 兼容标准 AgentSkillConfigSource、带 rawRecord 的运行时 AgentRuntimeAgentConfig、
 * 以及从底层存储读取的 Record<string, unknown>。
 */
export type PromptSkillConfigSource =
  | AgentSkillConfigSource
  | {
      skills?: Record<string, unknown> | null;
      enabledPacks?: string[] | null;
      rawRecord?: Record<string, unknown> | null;
      [key: string]: unknown;
    }
  | Record<string, unknown>;

/**
 * 推荐纯提示 Skill slug 清单（供 UI 展示与发现）。
 */
export const RECOMMENDED_PROMPT_SKILL_SLUGS = ["ub-mode"] as const;

export type RecommendedPromptSkillSlug =
  (typeof RECOMMENDED_PROMPT_SKILL_SLUGS)[number];

const ALLOWED_PROMPT_SKILL_SLUGS = new Set<string>(
  RECOMMENDED_PROMPT_SKILL_SLUGS,
);

/**
 * 规范化用户启用的纯提示 Skill 列表。
 *
 * 严格只接受数组形式，且元素必须是严格字符串。
 * 仅允许已审定的纯提示 slug（当前仅 'ub-mode'），过滤任意正文、非审定 slug 与工具 skill。
 * 自动去重。非数组（包括单个字符串、null/undefined/对象）一律返回空数组。
 */
export function normalizeEnabledPromptSkills(value: unknown): string[] {
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
    if (ALLOWED_PROMPT_SKILL_SLUGS.has(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}
