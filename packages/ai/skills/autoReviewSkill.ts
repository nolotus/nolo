/**
 * Platform-owned `auto-review` built-in skill（改动 → 独立 review → 提交 → 本地合并）。
 *
 * 用户显式开启才生效（triggerMode: explicit，不进 DEFAULT_RECOMMENDED_SKILL_SLUGS）：
 * 开启即「预先授权」review 通过后自动提交并合并到本地集成分支，所以绝不默认推送。
 * 内容保持 Git 通用语义，不绑定 bun-nolo 的 trailer / hook；项目特有约定由项目自己的
 * `.agents/skills/auto-review` 补充。reviewer 侧规则（质量门、Verdict 格式）不在此重复，
 * 由派发 brief 指向项目或内置 review skill。
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const AUTO_REVIEW_SKILL_SLUGS = ["auto-review"] as const;

export type AutoReviewSkillSlug = (typeof AUTO_REVIEW_SKILL_SLUGS)[number];

/** Same FNV-1a deterministic id used by the other builtin skill seeds. */
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
      "改动完成后自动走完「独立 reviewer 审查 → 修复 → 提交 → 合并到本地集成分支」。开启即授权 review 通过后自动提交与本地合并，但绝不自动 push、不合并远端或主干、不发布。触发词：auto-review、自动审查、review 后自动合并、审完直接提交合并、auto review。不适用：只读任务、用户要先验收效果的改动（先交付产物等反馈）。",
  };
}

const BODY = [
  "你是「自动审查合并」流程的执行者：改动做完后，不等用户逐步点头，自己把审查、提交、本地合并走完。",
  "",
  "## 开启条件与边界",
  "- 仅在用户显式开启（说 auto-review / 自动审查合并）后使用；开启只授权**本地提交与本地集成分支合并**。",
  "- 永远需要当次明确批准：`git push`、合并到远端或主干分支、发布/部署、回滚。开启本 skill 不放宽这些。",
  "- 需要用户亲自验收的改动（UI、体验类）：先交付可测试产物并停下，等用户确认「可以」再进入下面流程。",
  "",
  "## 流程",
  "1. **隔离**：改动应已在独立 worktree/分支里（见 `worktree-isolation`）；不在就先建。",
  "2. **派 reviewer**：与作者不同的 agent 实例，只读审 diff，只传 worktree 路径与文件清单，不内嵌 diff。brief 要求最终文本含 Verdict（APPROVE / WARNING / BLOCK）与带行号的 finding。",
  "3. **判定**：",
  "   - 最终文本含明确 APPROVE 且无 CRITICAL/HIGH → 继续；",
  "   - BLOCK → 修复后复审，循环直到 APPROVE；**APPROVE 只覆盖被审的那一版**——此后任何改动（含只采纳 nit、含只动注释 / 文档）都要重新过一轮 review，作者自评不构成复核。",
  "   - WARNING（有 HIGH）→ 停下，把 finding 报给用户决定，不自动合并；",
  "   - 空回复、超时、只说「我先检查」都不是审查证据：最多重试一次，仍无结论就报告 `review incomplete`，交用户处理。",
  "4. **提交**：按项目的提交规范写 message；如实记录谁审的、结论是什么。无 review 不提交（≤2 步零逻辑风险的机械改动除外，须在 message 注明原因）。",
  "5. **合并**：在主仓用 `git merge --no-ff <分支>` 合并到本地集成分支，保留分支历史。",
  "6. **清理（可验证恢复，直接做）**：按删除安全红线的「唯一例外」逐项验证后直接清理并在收尾列明：本次自建分支 `git merge-base --is-ancestor <branch> <集成分支>` 通过、worktree 内 `git status --porcelain --ignored` 为空（只剩 `!! node_modules/` 时，须核实其中只有指向 worktree 内的符号链接与只装这类链接的 scope 目录，无其他条目，链接解析失败即不通过），才用不带 `--force` 的 `git worktree remove <worktreePath>` 与 `git branch -d <branchName>`（禁止 `-D`/`--force`/`rm -rf`）；本次自建 /tmp 只清可再生中间产物（含唯一结果或用户数据的不算），自启进程按当次 PID 核实、确认终止不丢未保存状态后再停。任一项验证不过或非本次创建，列清单等用户确认。",
  "7. **收尾**：汇报 commit、合并结果、reviewer 与 Verdict、未处理的 WARNING，并一句话列明已清理的 worktree/分支/临时物。到此为止，不 push。",
  "",
  "## 选 reviewer",
  "- 按平台选人契约：收藏的私有订阅/自带 key agent 优先，其次其他收藏，再其次未收藏的私有 agent；低价胜任者即可。只有架构/计费/安全/数据完整性高风险改动才用顶档。",
  "- 会消耗平台积分的 agent 必须先征得用户当次同意。",
  "",
  "## Boundaries",
  "- 不替代 reviewer 侧的质量门，也不替代测试；测试没跑过不要合并。",
  "- 不伪造 review 证据；不用 `--no-verify` 绕过提交或合并钩子。",
].join("\n");

export function buildAutoReviewSkillContentBySlug(
  slug: AutoReviewSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildAutoReviewSkillConfig(slug),
  });
}
