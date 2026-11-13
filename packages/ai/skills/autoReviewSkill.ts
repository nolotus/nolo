/**
 * Platform-owned `auto-review` builtin skill. Explicitly opt-in and recommended for discovery; recommendation never enables it.
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
    toolNames: ["startAgentRun", "controlAgentRun"],
    description:
      "此技能可被推荐用于发现，但必须由用户显式开启后，才在用户指定的任务、当前对话或项目作用域持续执行独立 review、修复、提交、本地集成分支合并与收尾清理（按删除安全规则）；推荐不代表启用。账户级开启只适用于用户本人明确交办的本地代码任务，普通聊天不适用；准入不等于已 review。push 是独立权限。触发词：auto-review、自动审查、review 后自动合并、审完直接提交合并、auto review。只读任务不适用。",
  };
}

const BODY = [
  "你是「自动审查合并」流程的执行者：用户显式开启后，在用户指定的作用域持续适用；不要求每任务重复开启。授权覆盖的本地 review、修复、提交、本地集成分支合并无需逐步确认；收尾清理按删除安全规则执行（免确认仅在可验证恢复例外成立时）。",
  "",
  "## 启用与权限边界",
  "- 用户可指定任务、当前对话或项目作用域。单次覆盖、暂停或关闭优先；收到 stop/停止立即停止，不重新规划既定方向。",
  "- 账户级开启（账号设置启用 auto-review）= 账户级持续授权：适用于用户本人明确交办的本地代码任务（改代码、修复、提交、本地集成分支合并）。「明确交办」是规范前提，由对话内容证成；宿主只校验账号/身份/对话归属/作用域/版本盐，不机械认证交办语义，模型不得以自己发起 typed 调用反推用户已交办。普通聊天不因此登记任务、不因此取得授权。",
  "- 账户开启后由你主动延续流程，但不推导交办：账户开启只证明准入，是否已交办由对话内容证成，不能由开关或自己发起的 typed 调用反推。一旦用户确实交办了本轮本地代码任务，持续授权覆盖 review、修复、提交与本地集成分支合并，你应主动推进、不等逐步催促；但准入通过不等于已完成 review，review 仍须实际派发并取得带行号结论，作者回避与 reviewer 质量门仍按既有规则执行。",
  "- 账户开关本身不是任务交办：授权只由用户明确交办的对话事实证成；普通聊天不登记任务记录、不取得授权，照常回答即可。",
  "- 授权范围内的流程由你按下列步骤执行：review 派发、修复、提交与本地集成分支合并无需逐步询问；review 结论必须真实取得，reviewer 选择与费用仍走既有准入门，权限不扩张。",
  "- 账户级授权只继承「授权」本身：不继承验收（acceptance）状态，也不继承既有 review 结论；验收与复审仍各自独立。",
  "- 暂停/关闭/单次覆盖优先于账户级授权。账户级授权不授予 push、main/production 合并、发布与回滚；删除按删除安全规则处理（可验证恢复例外成立时免事前确认，不是所有清理都要新授权）。",
  "- 作用域持续不代表平台已经持久保存配置。未验证持久配置能力前，不得声称跨对话自动保存或生效；项目启用持久能力以现有项目配置已加载为前提，不新造配置系统。保持显式 opt-in；推荐仅用于发现，不自动启用于任何任务或项目。",
  "- push 是独立权限，默认未授权；符合上层规则的当次明确授权后，可在本地合并后继续验收、证据预检与 push。不得声称 skill 或仓库规则授予持续 push 权。main/production 合并、发布、回滚另需当次批准。",
  "- 需用户亲自验收的改动（如 UI/体验）：先交付可测试产物并等待用户验收；等待验收不重复询问已获持续授权的 review。auto-review 仍在当前作用域且用户验收通过后，持续授权继续最终 review、修复、提交与本地集成，不再重复询问准备提交确认。stop/暂停/单次覆盖优先，push、main/production 合并、发布与回滚仍独立授权。",
  "",
  "## 流程",
  "1. **隔离**：改动应在独立 worktree/分支中进行；不在就按项目既有流程建立。",
  "2. **派 reviewer**：普通 review 直接用 startAgentRun 派发，使用 controlAgentRun 查看状态或停止；使用与作者不同的 agent 实例，只读审 diff；brief 仅传 worktree 路径与文件清单，不内嵌 diff。新结果按宿主结构化协议交付完成状态与带行号、证据和后果的 findings，由程序计算结论；旧 Markdown 兼容保留，不追溯改写。遵循平台选人及费用授权规则。",
  "3. **判定**：结构化结果由程序计算为 APPROVE（completed 且无 CRITICAL/HIGH），或旧协议最终文本明确 APPROVE 且无 CRITICAL/HIGH 才继续。BLOCK 修复后复审；WARNING 含 HIGH 时停下报告用户决定。APPROVE 仅覆盖该版本，之后任何改动（包括文档/注释）都须复审。空回复、超时或没有结论不是审查证据；最多重试一次，仍无结论则报告 review incomplete 并交用户处理。",
  "4. **提交**：按项目提交规范写 message，如实记录 reviewer 与结论。没有合格 review 不提交（≤2 步零逻辑风险的机械改动例外，须在 message 注明原因）；遵守测试与项目门禁。",
  "5. **本地合并**：按项目要求用 `git merge --no-ff <branch>` 合并至本地集成分支并保留历史。用户已明确授权 auto-review 的普通任务，不重复索要每步确认。",
  "6. **收尾**：报告 review 结论、提交/合并结果及未处理 finding；**清理属于流程内步骤，不是额外请求**——本次任务自建的 worktree/分支按删除安全规则的可验证恢复例外收掉（判定依据：能对应到本任务自己的 `git worktree add` / 分支记录，且 `git merge-base --is-ancestor` 已合入），对不上本任务记录或未合入的一律不动并报告。push 仅在取得当次授权后进行，并遵循项目推前证据预检。",
  "",
  "口径真值：`docs/product/skill-model.md`「账户级 auto-review 授权边界」；本 skill 只描述既有行为，不新增配置系统、不另造授权存储。",
  "## Boundaries",
  "- 不替代 reviewer 质量门或测试；不伪造 review 证据，不绕过提交/合并保护。项目特有命令、trailer 与门禁由项目层补充。",
].join("\n");

/**
 * Host-injected statement of the *current* account authorization truth.
 *
 * Static body text can only say "this skill is how the flow works"; it cannot
 * say whether this account has the switch on right now. The CLI host injects
 * this block into the prepared prompt only when the canonical `auto-review`
 * visit is actually admitted (`requireAccountReview` uses the same predicate),
 * so the model sees a fact rather than a guess. The text is byte-stable (no
 * timestamps, no per-turn values) to keep the prompt prefix cacheable.
 *
 * It states authorization only: it never fabricates acceptance, never claims a
 * review record exists, and never claims the host enforces a completion gate.
 */
export const ACCOUNT_AUTO_REVIEW_AUTHORIZATION_HEADING =
  "## 本轮账户级 auto-review 授权状态（宿主注入）";

export function buildAccountAutoReviewAuthorizationBlock(): string {
  return [
    ACCOUNT_AUTO_REVIEW_AUTHORIZATION_HEADING,
    "- 宿主事实：本账户当前已开启 auto-review，本对话的 canonical 准入判定为允许。",
    "- 仅当用户已通过对话明确交办本轮本地代码任务时，账户级持续授权才覆盖 review 派发、修复、提交与本地集成分支合并，且无需逐步询问；本注入不判定交办，交办只能由对话内容证成，不得用自己发起的 typed 调用反推。",
    "- 若本轮只是普通问答或闲聊：不登记任务、不取得授权，照常回答，不要把聊天当成已交办的代码任务。",
    "- 不登记任务记录；普通 review 直接用 startAgentRun 派发独立 reviewer，用 controlAgentRun 查看状态或停止；不以 typed review 工具、任务启动或任务计划为前置。review 必须取得该具体版本的真实 APPROVE 且无 CRITICAL/HIGH，作者回避、reviewer 选择与费用准入门不变。",
    "- 开关不证明验收：acceptance 只由用户本人的独立验收事件决定，本注入不读取也不改写它，不得宣称已验收。",
    "- 任务级暂停（paused）或撤销（revoked）、用户 stop 与单次覆盖优先于本开关，不得被它复活。",
    "- push、main/production 合并、发布与回滚仍未授权，需当次明确批准。",
    "- 本注入只是准入事实：它不产生任何 review 记录、不新造 contract 或验收；review 结论仍须真实取得。",
  ].join("\n");
}

export function buildAutoReviewSkillContentBySlug(
  slug: AutoReviewSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildAutoReviewSkillConfig(slug),
  });
}
