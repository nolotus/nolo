/**
 * Agent skill 偏好的**结构化诊断**。
 *
 * 【要回答的问题】为什么实际 run 注入的是 ub-mode，而账号记录里写的是
 * auto-review？只靠「读路径静默丢弃非法档位」是查不出来的——丢弃不留痕。
 * 所以在**偏好真正被消费的那条边界**上打印一份结构化快照：
 *
 * - 偏好从哪个来源来（settings 记录 / legacy 字段 / 空）；
 * - 实际解析出的启用 skill 列表（账号级）与 agent 级档位（slug → mode）；
 * - 读路径丢弃了哪些条目（slug + 原始值 + 丢弃原因）。
 *
 * 【安全边界】只输出 slug / 档位值 / 计数——**绝不**输出凭据、token、skill
 * 正文或任何用户内容。非法值会被截断（见 core/agentSkillModes 的
 * describeAgentSkillModeValue），避免把任意长度的输入回显进日志。
 *
 * 【节流】同一进程内，**同样的**诊断快照只打印一次（按快照内容签名去重）：
 * 反复的同一份配置不刷屏，但配置真的变了会再打一条。
 */

import {
  collectAgentSkillConfigIssues,
  resolveAgentSkillConfig,
  type AgentSkillConfigSource,
} from "ai/tools/agentSkillConfig";
import {
  describeAgentSkillModeValue,
  type AgentSkillModeValue,
} from "core/agentSkillModes";

/** 账号级 skill 偏好的来源标识。 */
export type AgentSkillPreferenceSource =
  | "settings-record"
  | "legacy-field"
  | "empty";

/** 被丢弃的条目（脱敏后）。 */
export type DiscardedAgentSkillEntry = {
  slug: string;
  /** 原始值的短描述（已截断）。 */
  value: string;
  reason: "invalid-mode" | "invalid-slug" | "invalid-skills-field";
};

export type AgentSkillPreferenceDiagnostic = {
  event: "agent_skill_preference_resolved";
  /** 偏好来源：settings 记录 / legacy 字段 / 空。 */
  preferenceSource: AgentSkillPreferenceSource;
  /** 实际生效的偏好字段名；为空表示没有任何偏好字段。 */
  preferenceField: "enabledSkills" | "enabledPromptSkills" | null;
  /** 实际解析出的账号级启用 skill 列表。 */
  enabledSkills: string[];
  enabledSkillCount: number;
  /** 实际解析出的 agent 级档位（slug → mode）。 */
  agentSkillModes: Record<string, AgentSkillModeValue>;
  agentSkillCount: number;
  /** 读路径丢弃掉的条目。 */
  discardedSkills: DiscardedAgentSkillEntry[];
  discardedSkillCount: number;
};

type PreferenceLike = {
  enabledSkills?: unknown;
  enabledPromptSkills?: unknown;
} | null | undefined;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/**
 * 判定偏好来源：
 * - 自己的 `enabledSkills` 属性存在 → `settings-record`（账号 settings 记录）；
 * - 只有 legacy `enabledPromptSkills` → `legacy-field`；
 * - 其它（null / 空对象 / 两个字段都没有）→ `empty`。
 *
 * 口径与 `resolveUserEnabledSkills` 一致：own `enabledSkills` 优先，缺失才
 * 回退 legacy。
 */
export const resolveAgentSkillPreferenceSource = (
  preferences: PreferenceLike,
): { source: AgentSkillPreferenceSource; field: "enabledSkills" | "enabledPromptSkills" | null } => {
  if (!preferences || typeof preferences !== "object") {
    return { source: "empty", field: null };
  }
  if (hasOwn(preferences, "enabledSkills")) {
    return { source: "settings-record", field: "enabledSkills" };
  }
  if (hasOwn(preferences, "enabledPromptSkills")) {
    return { source: "legacy-field", field: "enabledPromptSkills" };
  }
  return { source: "empty", field: null };
};

/**
 * 组装诊断快照（纯函数，便于测试断言确切格式）。
 *
 * `enabledSkills` 由调用方传入**已解析**的账号级启用列表——解析发生在
 * `ai/skills/userSkills`，这里不重复解析，避免两处口径漂移。
 */
export const buildAgentSkillPreferenceDiagnostic = (input: {
  agentConfig: AgentSkillConfigSource | null | undefined;
  preferences: PreferenceLike;
  enabledSkills: readonly string[];
}): AgentSkillPreferenceDiagnostic => {
  const { source, field } = resolveAgentSkillPreferenceSource(input.preferences);
  const config = resolveAgentSkillConfig(input.agentConfig);
  const agentSkillModes: Record<string, AgentSkillModeValue> = {};
  for (const slug of Object.keys(config).sort()) {
    agentSkillModes[slug] = config[slug];
  }
  const discardedSkills = collectAgentSkillConfigIssues(input.agentConfig).map(
    (issue) => ({
      slug: issue.slug,
      value: describeAgentSkillModeValue(issue.value),
      reason: issue.reason,
    }),
  );
  return {
    event: "agent_skill_preference_resolved",
    preferenceSource: source,
    preferenceField: field,
    enabledSkills: [...input.enabledSkills],
    enabledSkillCount: input.enabledSkills.length,
    agentSkillModes,
    agentSkillCount: Object.keys(agentSkillModes).length,
    discardedSkills,
    discardedSkillCount: discardedSkills.length,
  };
};

const DIAGNOSTIC_PREFIX = "[nolo.skill.diagnostics] ";

const seenSignatures = new Set<string>();

/**
 * 打印一条诊断（JSON 单行，写 stderr）。
 *
 * `sink` 可注入（测试用）；默认写 `process.stderr`——server 与 CLI 两侧都
 * 能在运行日志里看到同一份格式。
 */
export const reportAgentSkillPreferenceDiagnostic = (
  diagnostic: AgentSkillPreferenceDiagnostic,
  sink?: (line: string) => void,
): boolean => {
  const signature = JSON.stringify(diagnostic);
  if (seenSignatures.has(signature)) return false;
  seenSignatures.add(signature);
  const write = sink ?? ((line: string) => { process.stderr.write(line); });
  write(`${DIAGNOSTIC_PREFIX}${signature}\n`);
  return true;
};

/** 仅供测试：清空去重状态。 */
export const resetAgentSkillPreferenceDiagnosticState = (): void => {
  seenSignatures.clear();
};
