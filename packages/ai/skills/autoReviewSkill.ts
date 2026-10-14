/**
 * Platform-owned `auto-review` builtin skill. Explicitly opt-in, not recommended by default.
 * Shared lifecycle semantics live here; projects add only their local gates and conventions.
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const AUTO_REVIEW_SKILL_SLUGS = ["auto-review"] as const;

export type AutoReviewSkillSlug = (typeof AUTO_REVIEW_SKILL_SLUGS)[number];

function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

export function buildAutoReviewSkillId(slug: AutoReviewSkillSlug): string {
  return deterministicId("01SK", slug);
}

export function buildAutoReviewSkillPageKey(
  userId: string,
  slug: AutoReviewSkillSlug,
): string {
  return `page-${userId}-${buildAutoReviewSkillId(slug)}`;
}

export function buildAutoReviewSkillConfig(
  slug: AutoReviewSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildAutoReviewSkillId(slug),
    name: "自动审查合并（auto-review）",
    triggerMode: "explicit",
    description:
      "显式开启后，在用户指定的任务、当前对话或项目作用域持续执行独立 review、修复、提交与本地集成分支合并；不默认推荐。push 是独立权限。触发词：auto-review、自动审查、review 后自动合并、审完直接提交合并、auto review。只读任务不适用。",
  };
}

const BODY = [
  "你是「自动审查合并」流程的执行者：用户显式开启后，在用户指定的作用域持续适用；不要求每任务重复开启。授权覆盖的本地 review、修复、提交与本地集成分支合并无需逐步确认。",
  "",
  "## 启用与权限边界",
  "- 用户可指定任务、当前对话或项目作用域。单次覆盖、暂停或关闭优先；收到 stop/停止立即停止，不重新规划既定方向。",
  "- 作用域持续不代表平台已经持久保存配置。未验证持久配置能力前，不得声称跨对话自动保存或生效；项目启用持久能力以现有项目配置已加载为前提，不新造配置系统。保持显式 opt-in，不默认推荐或自动启用于所有项目。",
  "- push 是独立权限，默认未授权；符合上层规则的当次明确授权后，可在本地合并后继续验收、证据预检与 push。不得声称 skill 或仓库规则授予持续 push 权。main/production 合并、发布、回滚另需当次批准。",
  "- 需用户亲自验收的改动（如 UI/体验）：先交付可测试产物；用户明确准备提交后再进入最终 review。",
  "",
  "## 流程",
  "1. **隔离**：改动应在独立 worktree/分支中进行；不在就按项目既有流程建立。",
  "2. **派 reviewer**：使用与作者不同的 agent 实例，只读审 diff；brief 仅传 worktree 路径与文件清单，不内嵌 diff。要求最终文本含 Verdict（APPROVE / WARNING / BLOCK）及带行号 finding。遵循平台选人及费用授权规则。",
  "3. **判定**：最终文本明确 APPROVE 且无 CRITICAL/HIGH 才继续。BLOCK 修复后复审；WARNING 含 HIGH 时停下报告用户决定。APPROVE 仅覆盖该版本，之后任何改动（包括文档/注释）都须复审。空回复、超时或没有结论不是审查证据；最多重试一次，仍无结论则报告 review incomplete 并交用户处理。",
  "4. **提交**：按项目提交规范写 message，如实记录 reviewer 与结论。没有合格 review 不提交（≤2 步零逻辑风险的机械改动例外，须在 message 注明原因）；遵守测试与项目门禁。",
  "5. **本地合并**：按项目要求用 `git merge --no-ff <branch>` 合并至本地集成分支并保留历史。用户已明确授权 auto-review 的普通任务，不重复索要每步确认。",
  "6. **收尾**：报告 review 结论、提交/合并结果及未处理 finding；清理严格遵循删除安全规则。push 仅在取得当次授权后进行，并遵循项目推前证据预检。",
  "",
  "## Boundaries",
  "- 不替代 reviewer 质量门或测试；不伪造 review 证据，不绕过提交/合并保护。项目特有命令、trailer 与门禁由项目层补充。",
].join("\n");

export function buildAutoReviewSkillContentBySlug(
  slug: AutoReviewSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildAutoReviewSkillConfig(slug),
  });
}
