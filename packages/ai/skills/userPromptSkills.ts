/**
 * 账号级纯提示 Skill 偏好与共享解析。
 *
 * 仅用于无工具、纯 prompt 注入的方法论指导 Skill（如 ub-mode）。
 * 平台不默认启用，不授予工具权限，不改动 agent 配置。
 */

import { resolveBuiltinSkillEntry } from "./builtinSkillRegistry";
import { parseSkillDocProtocol } from "./skillDocProtocol";
import {
  isAgentSkillDisabled,
  type AgentSkillConfigSource,
} from "ai/tools/agentSkillConfig";

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

/**
 * 从 builtin registry 解析用户启用的纯提示 Skill patches。
 *
 * 契约：
 * - 仅当用户在 enabledPromptSkills 显式启用审定 slug 时才尝试解析。
 * - agent 显式 disabled 优先：若 agentConfig 显式将该 slug 置为 'disabled'，不注入。
 * - 空安全：ub-mode registry 允许暂未存在或未注册，未找到 entry 或内容为空时不崩溃并跳过。
 * - 纯提示：只返回 prompt 正文 patches，绝不授予/返回工具，绝不修改 agent 配置。
 */
export function resolveUserPromptSkillPatches(
  agentConfig: PromptSkillConfigSource | null | undefined,
  enabledPromptSkills: unknown,
): string[] {
  const normalized = normalizeEnabledPromptSkills(enabledPromptSkills);
  if (normalized.length === 0) {
    return [];
  }

  const effectiveConfig: AgentSkillConfigSource | null | undefined =
    agentConfig && typeof agentConfig === "object"
      ? (("rawRecord" in agentConfig &&
          agentConfig.rawRecord &&
          typeof agentConfig.rawRecord === "object")
          ? (agentConfig.rawRecord as AgentSkillConfigSource)
          : (agentConfig as AgentSkillConfigSource))
      : null;

  const patches: string[] = [];

  for (const slug of normalized) {
    if (isAgentSkillDisabled(effectiveConfig, slug)) {
      continue;
    }

    const entry = resolveBuiltinSkillEntry(slug);
    if (!entry) {
      continue;
    }

    const parsed = parseSkillDocProtocol(entry.content);
    const patch = (
      parsed.meta?.skillConfig?.promptPatch || parsed.content
    ).trim();
    if (patch) {
      patches.push(patch);
    }
  }

  return patches;
}
