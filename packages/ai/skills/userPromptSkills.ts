/**
 * 账号级纯提示 Skill 偏好与共享解析。
 *
 * 仅用于无工具、纯 prompt 注入的方法论指导 Skill（如 ub-mode）。
 * 平台不默认启用，不授予工具权限，不改动 agent 配置。
 *
 * 依赖分层：零依赖的 slug 白名单与规范化在 `userPromptSkillSlugs.ts`；
 * 本文件保留重依赖（builtinSkillRegistry、skillDocProtocol/js-yaml），只服务真正需要
 * 解析 prompt 正文的调用方。只做偏好读写的模块请直接 import `userPromptSkillSlugs`，
 * 否则会把全部内置 Skill 正文与 YAML 解析器带进 web entry。
 */

import { resolveBuiltinSkillEntry } from "./builtinSkillRegistry";
import { parseSkillDocProtocol } from "./skillDocProtocol";
import {
  isAgentSkillDisabled,
  type AgentSkillConfigSource,
} from "ai/tools/agentSkillConfig";
import {
  normalizeEnabledPromptSkills,
  type PromptSkillConfigSource,
} from "./userPromptSkillSlugs";

export {
  RECOMMENDED_PROMPT_SKILL_SLUGS,
  normalizeEnabledPromptSkills,
} from "./userPromptSkillSlugs";
export type {
  PromptSkillConfigSource,
  RecommendedPromptSkillSlug,
} from "./userPromptSkillSlugs";

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
