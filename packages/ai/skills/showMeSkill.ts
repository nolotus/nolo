/**
 * Platform-owned `show-me` built-in skill.
 *
 * Promoted from the repo's `.agents/skills/show-me/` (2026-09-20): the content
 * is fully generic (no bun-nolo-private conventions), so the builtin registry in
 * code is the single source of truth — repo worktrees and end-user projects get
 * the same skill from the same place. The repo copy was deleted; do not re-add a
 * second copy under `.agents/skills/`.
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const SHOW_ME_SKILL_SLUGS = ["show-me"] as const;

export type ShowMeSkillSlug = (typeof SHOW_ME_SKILL_SLUGS)[number];

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

function normalizeSkillSeed(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildShowmeSkillId(
  slug: ShowMeSkillSlug,
): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildShowmeSkillPageKey(
  userId: string,
  slug: ShowMeSkillSlug,
): string {
  return `page-${userId}-${buildShowmeSkillId(slug)}`;
}

export function buildShowmeSkillConfig(
  slug: ShowMeSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildShowmeSkillId(slug),
    name: "视觉化解释（show-me）",
    triggerMode: "recommended",
    description: "以视觉直观的方式（精炼伪代码、调用树、组件树、Mermaid 图表、结构化 Diff 或独立 HTML 渲染工件）解释复杂主题、架构逻辑、状态流转与 UI 结构。触发词：画个图、画图、流程图、时序图、可视化、怎么调用的、调用链、组件结构、对比一下、show me、visualize、diagram、artifact preview。",
  };
}

export function buildShowmeSkillContentBySlug(
  slug: ShowMeSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: "# Show Me (Visual-First 结构化表达指南)\n\n当解释复杂系统、流程、架构设计、排错根因或 UI 变动时，遵循 **“视觉优先（Visual-First）”** 原则。\n跳过冗长开场白，保持正文简明扼要，选择能讲清核心观点的**最小必要视图（Smallest View）**。\n\n---\n\n## 核心可视化模式\n\n### 1. 逻辑与算法伪代码\n展示关键分支判断、计算顺序或核心算法步骤：\n\n```text\non(save)\n  if content is unchanged\n    return cached result\n  write new content\n  return fresh result\n```\n\n### 2. 运行时控制流 / 调用树 (Call Tree)\n展示方法调用层级与数据推进链路：\n\n```text\nsubmitForm\n  validateInputs\n  createSession\n    persistPrompt\n    launchAgent\n      spawnWorker\n  navigateToSession\n```\n\n### 3. 组件树与状态边界 (Component Tree)\n展示前端 UI 组件层级、Props 传递以及局部/全局状态所属：\n\n```tsx\n(apps/web/src/pages/WorkspacePage.tsx)\n<WorkspaceProvider>                   // 全局 workspace context\n  <WorkspaceLayout>\n    <Sidebar />                       // activeNav, unreadBadges\n    <MainContent>\n      <ChatThread>                    // threadId, messages\n        <MessageList>\n          <MessageItem />             // content, sender\n        </MessageList>\n        <ChatInput />                 // draft, isSending\n      </ChatThread>\n    </MainContent>\n  </WorkspaceLayout>\n</WorkspaceProvider>\n```\n\n### 4. 浅层文件树 (File Tree)\n展示目录组织、模块归属或重构范围（仅保留与问题直接相关的层级）：\n\n```text\npackages/\n  client/\n    src/\n      components/    // UI 展示组件\n      hooks/         // 数据流与响应式状态\n  server/\n    src/\n      routes/        // API 路由入口\n      services/      // 核心业务处理\n```\n\n### 5. 结构化 Diff\n除了代码变更，还可用于直观对比**架构演进、调用链修改、文件重构、状态结构变动**：\n\n```diff\n  submitForm\n    validateInputs\n-   syncDirectSave\n+   dispatchAsyncJob\n+     queueWorker\n+     pollStatus\n    navigateToSession\n```\n\n### 6. Mermaid 流程图 / 时序图 / 状态机\n用于跨服务通信、多端交互、生命周期与状态流转（Web / Desktop 客户端可直接原生渲染）：\n\n```mermaid\nsequenceDiagram\n  autonumber\n  actor User as 用户\n  participant Client as 客户端 (Web/Desktop)\n  participant Server as Nolo Server\n  participant Agent as Agent Runtime\n\n  User->>Client: 发送指令\n  Client->>Server: POST /api/dialog/message\n  Server->>Agent: 调度 startAgentThread\n  Agent-->>Client: SSE 流式响应 (Token / Artifact)\n  Client-->>User: 实时界面更新\n```\n\n### 7. 独立 HTML 渲染工件 (HTML Artifact)\n当文本、树形图或 Mermaid 无法充分表达丰富的交互原型、复杂 UI 布局对比、信息图表或简报时，生成一份自包含的单个 HTML 文件。\n- 采用符合现代产品标准的配色、字体、间距与响应式布局。\n- 使用真实标签与模拟数据，避免空灰盒。\n- 写入文件并通过系统或 Browser Connector 打开给用户预览。\n\n---\n\n## 实践原则 (Guidance)\n\n1. **图文并茂，图在文先**：让结构图紧挨着其解释的简述文字，先呈现清晰图表，再用 1~3 句话说明重点。\n2. **克制与聚焦 (Smallest View)**：只保留回答当前问题所必需的调用、属性、状态与边界，不要堆砌无意义的全局冗余代码。\n3. **选型恰当**：通常一次解释选用 1~2 种最契合的可视化形式即可，不要把所有图表都堆在一起增加认知负担。\n4. **客户端适配**：\n   - 在 CLI / TUI 终端中，优先使用伪代码、缩进调用树、Unicode 字符图与 Diff；\n   - 在 Web / Desktop 图形客户端中，充分利用 Mermaid 渲染与 HTML Artifacts 预览。",
    skillConfig: buildShowmeSkillConfig(slug),
  });
}
