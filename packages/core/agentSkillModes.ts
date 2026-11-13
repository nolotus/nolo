/**
 * Agent 级 skill 档位（`agent.skills[slug]`）的合法取值——**单一真值**。
 *
 * 读路径（`ai/tools/agentSkillConfig` 的 resolveAgentSkillConfig）与写路径
 * （server 的 db write/patch 路由、CLI 的 agent update）共用这一份清单：
 * 读路径负责「畸形值不抛错」，写路径负责「畸形值不落库」。两边口径必须一致，
 * 否则会出现「写进去了、读的时候被静默丢弃」这种用户完全无感知的失效。
 *
 * 【为什么值里不该出现 `explicit`】`explicit` 是 skill **定义**里的
 * `triggerMode`（描述这个 skill 默认怎么被发现），不是某个 agent 对它的选择。
 * 把 skill 定义里的值误写进 agent 记录，是历史上真实发生过的脏数据来源，
 * 所以写入口必须 fail-closed，而不是等到运行时才发现没生效。
 *
 * 【为什么放 core】写入口分散在 database/server（HTTP patch/write）与 cli
 * （本地命令行）两侧，database 层不能反向依赖 ai 层。把真值放在 core 这类
 * 叶子模块里，两侧都只依赖 core，不会引入模块环。
 */

/** 合法档位。`required` 完整启用 / `recommended` 启用 / `disabled` 禁用。 */
export const AGENT_SKILL_MODES = [
  "required",
  "recommended",
  "disabled",
] as const;

export type AgentSkillModeValue = (typeof AGENT_SKILL_MODES)[number];

export const isAgentSkillMode = (
  value: unknown,
): value is AgentSkillModeValue =>
  typeof value === "string" &&
  (AGENT_SKILL_MODES as readonly string[]).includes(value);

export type InvalidAgentSkillMode = {
  /** 出问题的 slug（原样，不做 trim——诊断要能看到原始输入）。 */
  slug: string;
  /** 原始值。 */
  value: unknown;
};

/**
 * 收集一个 `skills` 映射里的非法档位。
 *
 * - `null` 是**合法的删除标记**（database 层 deepMerge 只认 `null` 表示删除，
 *   见 `ai/tools/agentSkillConfig` 的 buildAgentSkillConfigPatch），不算非法。
 * - 非对象（字符串/数字/数组）没有档位语义，返回空数组——那种形态由调用方
 *   按「整个 skills 字段畸形」另行处理。
 */
export const collectInvalidAgentSkillModes = (
  skills: unknown,
): InvalidAgentSkillMode[] => {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return [];
  const out: InvalidAgentSkillMode[] = [];
  for (const [slug, value] of Object.entries(skills as Record<string, unknown>)) {
    if (value === null) continue;
    if (!isAgentSkillMode(value)) out.push({ slug, value });
  }
  return out;
};

/**
 * 把非法值渲染成一句**短**描述——错误文案会进日志与 UI，不能把任意长度的
 * 用户输入原样回显。
 */
export const describeAgentSkillModeValue = (value: unknown): string => {
  let text: string;
  if (typeof value === "string") {
    text = JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);
  } else if (value === undefined) {
    text = "undefined";
  } else {
    try {
      const serialized = JSON.stringify(value);
      text = typeof serialized === "string" ? serialized : String(value);
    } catch {
      text = typeof value;
    }
  }
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
};

/** 统一的错误文案：告诉调用方合法值是什么。 */
export const formatInvalidAgentSkillModeMessage = (
  invalid: InvalidAgentSkillMode,
  allowed: readonly string[] = AGENT_SKILL_MODES,
): string =>
  `Invalid agent skill mode for "${invalid.slug}": ${describeAgentSkillModeValue(invalid.value)}. ` +
  `Allowed values: ${allowed.join(", ")}.`;

/**
 * `skills` 字段的**形态**是否合法。
 *
 * - `null` / `undefined`：合法（`null` 是删除标记）。
 * - 普通对象：合法（档位是否合法由 collectInvalidAgentSkillModes 判）。
 * - 其它（字符串/数字/数组）：非法——读路径会整个忽略这个字段并回退到
 *   legacy `enabledPacks`，落库后同样是无声失效。
 */
export const isAgentSkillModesFieldShapeValid = (skills: unknown): boolean => {
  if (skills === null || skills === undefined) return true;
  return typeof skills === "object" && !Array.isArray(skills);
};

/** `skills` 字段形态非法时的错误文案。 */
export const formatInvalidAgentSkillModesFieldMessage = (
  allowed: readonly string[] = AGENT_SKILL_MODES,
): string =>
  `Invalid agent skills field: expected an object mapping slug → mode ` +
  `(${allowed.join(" | ")}).`;
