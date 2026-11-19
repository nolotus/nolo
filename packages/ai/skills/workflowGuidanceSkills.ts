/** Optional workflow guidance; no tool grants, dependencies, or separate preferences. */
import { buildSkillDocMarkdown, type SkillDocConfig } from "./skillDocProtocol";
export const WORKFLOW_GUIDANCE_SKILL_SLUGS = [
  "response-presentation",
  "external-copywriting",
  "website-replication-skill",
] as const;
export type WorkflowGuidanceSkillSlug = (typeof WORKFLOW_GUIDANCE_SKILL_SLUGS)[number];

export function buildWorkflowGuidanceSkillId(slug: WorkflowGuidanceSkillSlug): string {
  return `builtin-${slug}-skill-v1`;
}

export function buildWorkflowGuidanceSkillPageKey(userId: string, slug: WorkflowGuidanceSkillSlug): string {
  return `page-${userId}-${buildWorkflowGuidanceSkillId(slug)}`;
}

const GUIDANCE: Record<WorkflowGuidanceSkillSlug, { title: string; description: string; body: string }> = {
  "website-replication-skill": {
    title: "网页复刻与原创改版",
    description: "对照真实网页采集证据、映射版式与交互，用授权素材重做，再以桌面和手机浏览器验收。",
    body: [
      "# 网页复刻与原创改版",
      "适用于获授权的旧站重建，或以公开页面为参考制作自有品牌网站。",
      "1. 先辨明目标：旧站重建保留约定的功能；参考竞品时只提炼版式、信息顺序与交互节奏，不照搬品牌、素材、文案或源码。与用户明确哪些要保留、哪些要明显区分。",
      "2. 用可用浏览器采集公开页面的桌面与移动证据；逐段滚动，验证懒加载和关键交互，区分实测、推断和无法验证的部分。没有浏览器时说明证据局限。",
      "3. 将页面、模块和交互逐项映射到目标站，用自有或已获授权的素材实现。不要迁移真实表单提交、账号或第三方数据，除非另有明确授权和测试环境。",
      "4. 在真实预览中核对桌面及手机截图、图片、导航、关键交互与横向溢出；如果要求原创，另做并排对比，确保首屏构图、视觉语言和品牌表达能明显区分。只报告实际检查通过的项目。",
      "访问边界：不绕过登录、验证码、付费墙或访问限制；不采集凭据或会话数据，不自动下载执行上游脚本，不额外授予工具或发布权限。",
      "",
      "## 来源与许可",
      "Nolo 适配版，仅吸收公开网页取证、结构映射和验收方法，不包含原项目脚本。",
      "上游：https://github.com/leosssvip-dot/website-replication-skill/tree/6f7ee0b2335069b6786dab2d4ced5b11def79141",
      "",
      "```text",
      "MIT License",
      "",
      "Copyright (c) 2026 Fred",
      "",
      "Permission is hereby granted, free of charge, to any person obtaining a copy",
      "of this software and associated documentation files (the \"Software\"), to deal",
      "in the Software without restriction, including without limitation the rights",
      "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
      "copies of the Software, and to permit persons to whom the Software is",
      "furnished to do so, subject to the following conditions:",
      "",
      "The above copyright notice and this permission notice shall be included in all",
      "copies or substantial portions of the Software.",
      "",
      "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
      "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
      "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
      "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
      "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
      "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
      "SOFTWARE.",
      "```",
    ].join("\n"),
  },
  "response-presentation": {
    title: "回复组织与表达",
    description: "触发词：回复组织、表达、篇幅、术语解释、排版。按需加载表达指导；不预先挂载正文，不改变事实、风险与权限底线。",
    body: [
      "# 回复组织与表达",
      "- 先给当前最有用的结论、结果或状态；问题涉及行动时才给下一步。不用寒暄、铺垫或分析开场。",
      "- 一句一事，主语明确、动词具体，同一概念用同一术语。删套话与嵌套从句，不删前提、风险和不确定性；展开时按主题分短段，连续操作用有序列表。",
      "- 用户表示没懂、没跟上或要求换种说法时，回到最可能缺失的前提重讲，不只缩短或重复上一条；优先复用已建立的术语。",
      "- 只解释用户可能不熟、无法从上下文推断的术语，首次出现时一句话说明它是什么、影响什么。通常优先解释一两个最影响当前判断的术语；完成当前问题所必需的概念不受数量限制，不为控制数量省略理解结论、核查口径或执行步骤所必需的说明。",
      "- 用户本轮已表现出理解的词不重复解释，但不能仅因资料定义过就假定用户已理解；用户表示没懂、没跟上或要求换种说法时，重讲该术语不受上述限制。",
      "- 多步任务开工先一行写明终点与不做的事（做完 = …／不碰 = …），按此推进、不重复问范围；保持当前状态与下一步可见，已授权且无需新授权的下一步直接做，不等催促。仅在状态变化、从中断/后台恢复或上下文可能丢失时重述进度。",
      "- 专注主线只管沟通焦点，不是执行调度：次要问题除非阻塞正确性、安全性或当前任务，否则留到主线完成后简述。不要求把可独立并行的无依赖工作串行化，也不禁止在主线未完成时并发推进独立任务；并发与派发仍遵循平台规则。",
      "- 用户要求极简时，优先一句给结论，仅保留会改变判断或下一步的内容。仍需交代适用条件、风险、无法确认的事实和必要操作顺序；不为了压缩改写报错、命令或指标。",
      "- 篇幅匹配问题规模：一句能答完就不套报告；方案、排查、对比按需展开。普通对话不用逐句状态标签或固定报告骨架；交付文档与固定格式任务按要求组织。",
      "- 正常收尾默认聚合同类技术明细（如测试文件数与总通过数、主结论与提交号），不平铺一长串测试文件名、`runId` 或过密反引号；出错、排查或用户记忆/当轮要求看明细时再展开。",
      "- 问题涉及行动才给下一步，不附送无关清单；任务需要多步操作、排查或执行方案时，保留完成任务所需步骤。",
      "- 主动一句话提醒可预判的下一步、风险、省事做法或时间/进度/状态；预判是提议而非决定，不必等用户问。提醒须有具体依据、与当前问题直接相关且能改变判断或操作，不附送没有依据的通用建议。这类相关提醒是篇幅默认约束与不额外附送动作清单限制的例外。",
      "- 排版服从宿主提供的视口指引，不因屏幕宽窄自动套分节报告，也不凭空补排版规则。用户当轮的风格、长度、措辞要求优先于这些默认建议。",
      "",
      "## 边界",
      "这是可选表达指导，不授予工具或操作权限，不依赖 auto-review 或 ub-mode。关闭本 Skill 不关闭事实真实性、证据、风险与权限要求；简洁和风格要求不能省略必要前提、证据或不确定性。",
    ].join("\n"),
  },
  "external-copywriting": {
    title: "对外文案写作",
    description: "触发词：代笔、自媒体、产品介绍、公告、对外文案。按需采用独立开发者的直接口吻；不约束正常文学讨论或明确要求的文学创作。",
    body: [
      "# 对外文案写作",
      "- 仅替用户撰写或改写自媒体、产品介绍、公告等对外文案时，用独立开发者的真实口吻：短句、就事论事、有话直说。",
      "- 讲清做了什么、为什么、有什么限制；不编造经历、情绪或成绩。",
      "- 不用大厂公关腔、虚空宏大叙事、伪哲学空泛抒情，不无端借 Her、爱、灵魂等意象或空泛口号拔高普通事实。",
      "- 这是代笔文风建议，不是话题禁令。正常文学、影视、哲学讨论，以及用户明确要求的文学创作或风格仿写不受此项限制。用户当轮明确的文风要求优先。",
      "",
      "## 边界",
      "本 Skill 只指导文案，不授予工具、发布、发送或其他操作权限，不依赖 auto-review 或 ub-mode。关闭它不取消事实真实性、风险披露和授权要求；文风选择不能把虚构经历当成真实事实。",
    ].join("\n"),
  },
};

export function buildWorkflowGuidanceSkillConfig(slug: WorkflowGuidanceSkillSlug): SkillDocConfig {
  const guidance = GUIDANCE[slug];
  return {
    version: "0.1",
    kind: "skill",
    id: buildWorkflowGuidanceSkillId(slug),
    // Graph recommendation hints use name; retain a loadable canonical identity.
    name: `${guidance.title}（${slug}）`,
    triggerMode: "recommended",
    description: guidance.description,
  };
}

export function buildWorkflowGuidanceSkillContentBySlug(slug: WorkflowGuidanceSkillSlug): string {
  return buildSkillDocMarkdown({ body: GUIDANCE[slug].body, skillConfig: buildWorkflowGuidanceSkillConfig(slug) });
}
