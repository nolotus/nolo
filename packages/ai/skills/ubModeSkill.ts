/** Nolo adaptation of unclebob/ub-mode; not a reproduction of the upstream text. */
import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const UB_MODE_SKILL_SLUGS = ["ub-mode"] as const;

export type UbModeSkillSlug = (typeof UB_MODE_SKILL_SLUGS)[number];

function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

export function buildUbModeSkillId(slug: UbModeSkillSlug): string {
  return deterministicId("01SK", slug);
}

export function buildUbModeSkillPageKey(
  userId: string,
  slug: UbModeSkillSlug,
): string {
  return `page-${userId}-${buildUbModeSkillId(slug)}`;
}

export function buildUbModeSkillConfig(slug: UbModeSkillSlug): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildUbModeSkillId(slug),
    name: "代码质量原则（ub-mode · Nolo 适配版）",
    triggerMode: "explicit",
    description:
      "Nolo 适配版，参考 unclebob/ub-mode 的代码质量原则。用户显式启用后，以 TDD、最小改动、根因修复、复杂度与重复治理、行为测试指导编码；不默认启用，不授予工具或提交、推送、删除权限。触发词：ub-mode、/ub-mode。",
  };
}

const BODY = [
  "# ub-mode · Nolo 适配版",
  "",
  "## 来源与适配边界",
  "本说明由 Nolo 独立编写，原则参考 unclebob 的 ub-mode 项目，不是上游原文、官方版本或全文翻译。",
  "来源：https://github.com/unclebob/ub-mode；参考原文：https://github.com/unclebob/ub-mode/blob/master/SKILL.md 。",
  "适配时未发现明确许可证声明；不据此推定获得全文再分发许可。此处仅提供简洁的原则说明，原文与后续变动以上游为准。",
  "",
  "## 启用与权限",
  "- 仅在用户显式启用的作用域内应用，不默认启用于用户、对话或项目；暂停、关闭或单次覆盖优先。不要仅因任务涉及编码便自行启用。",
  "- 这是一份编码指导，不授予任何工具权限，也不自动加载其他 Skill。平台更高优先级规则、用户授权边界和项目门禁优先。",
  "- 启用不等于授权 commit、push、合并、发布或删除清理；这些操作仍须满足各自的确认与审查要求。未提交工作和他人资源不得自行清理。",
  "",
  "## 编码原则",
  "1. **先明确行为，再做最小改动**：确认输入、输出、数据结构与验收目标；只改解决当前问题必需的部分，不夹带无关重构。相同决策保持单一真值。",
  "2. **TDD**：能诚实验证时，先写能暴露目标行为缺口的测试，观察它因预期原因失败，再用最小实现使其通过，最后在行为受保护时重构。若无法执行测试或难以构造有效测试，明确说明限制，不伪造红绿证据，不写无价值测试凑数。",
  "3. **修复根因**：先复现或收集直接证据，区分症状与原因。连续修复失败时重新检查共同前提；不要用吞错或额外守卫掩盖缺陷。",
  "4. **控制复杂度与重复**：检查分支、嵌套、职责和重复的业务决策；优先简化数据模型与边界，再按证据提取共享逻辑。不为指标拆碎清晰代码，不为表面相似制造抽象。",
  "5. **测试可观察行为**：从调用者入口检查输出、状态与副作用，而不是私有实现或 mock 自证。重构前固定关键行为，重构后运行相关检查，确认行为未变。",
  "6. **约束状态与边界**：外部数据在入口校验，内部逻辑尽量保持纯函数；用类型表达有效状态。无共享写入需求的任务隔离状态，有共享状态时明确写入者与恢复/幂等策略。",
  "7. **小步交付与证据**：把改动拆成可验证的小单元；无文件冲突或真实数据依赖的工作按平台规则并行，不把上游的顺序建议变成全局串行。汇报改动、实际检查结果与尚未验证的部分。",
  "",
  "## 质量工具与结果真实性",
  "- Crapper（复杂度与测试风险）、Dryer（重复检查）、Mutator（变异测试）可作为辅助，不是启用前提。仅在环境已安装、项目允许且适合当前任务时使用；不自动安装。",
  "- 工具未安装、检查未执行或执行失败时，必须如实说明；不可宣称检查通过。普通测试通过也不能冒充复杂度、重复或变异检查通过。",
].join("\n");

export function buildUbModeSkillContentBySlug(slug: UbModeSkillSlug): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildUbModeSkillConfig(slug),
  });
}
