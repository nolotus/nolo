/**
 * Platform-owned `systematic-investigation` built-in skill.
 *
 * Promoted from the repo's `.agents/skills/systematic-investigation/` (2026-09-20): the content
 * is fully generic (no bun-nolo-private conventions), so the builtin registry in
 * code is the single source of truth — repo worktrees and end-user projects get
 * the same skill from the same place. The repo copy was deleted; do not re-add a
 * second copy under `.agents/skills/`.
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const SYSTEMATIC_INVESTIGATION_SKILL_SLUGS = ["systematic-investigation"] as const;

export type SystematicInvestigationSkillSlug = (typeof SYSTEMATIC_INVESTIGATION_SKILL_SLUGS)[number];

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

export function buildSystematicinvestigationSkillId(
  slug: SystematicInvestigationSkillSlug,
): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildSystematicinvestigationSkillPageKey(
  userId: string,
  slug: SystematicInvestigationSkillSlug,
): string {
  return `page-${userId}-${buildSystematicinvestigationSkillId(slug)}`;
}

export function buildSystematicinvestigationSkillConfig(
  slug: SystematicInvestigationSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildSystematicinvestigationSkillId(slug),
    name: "系统化排查（systematic-investigation）",
    triggerMode: "recommended",
    description: "系统化排查纪律：先测量定位、再动手改。四阶段根因调试法（调查→模式分析→假设测试→实现修复） + 数据化性能优化 7 步（定义指标→打桩→baseline→分析瓶颈→优化→复测→对比报告）。 触发词：调试、bug、根因、排查、修不好、反复失败、root cause、性能优化、慢、latency、 baseline、性能瓶颈、perf、响应慢、启动慢、LCP、hydration。 Do NOT use：纯新功能实现、样式调整、不涉及故障排查的架构讨论。",
  };
}

export function buildSystematicinvestigationSkillContentBySlug(
  slug: SystematicInvestigationSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: "# 系统化排查纪律（根因调试 + 数据化性能优化）\n\n**共同铁律：无根因调查不提修复，无 baseline 不提优化。** 随机修复浪费时间并制造新 bug；\n「看起来慢」不是优化理由。违反过程的字面就是违反过程的精神。\n\n## Part A — 四阶段根因调试法\n\n每阶段完成才能进下一个：\n\n1. **根因调查**：读完整错误信息和堆栈（含行号/文件/错误码）；稳定复现（不能复现就收集更多数据，不猜）；检查最近变更（git diff/commits/依赖/配置）；多组件系统在每个边界加诊断日志先定位哪层失败；追踪数据流到坏值的源头。\n2. **模式分析**：找同仓库工作代码对比；完整读参考实现不 skim；列出工作与损坏的每个差异，再小也别假设\"不可能\"。\n3. **假设测试**：单一假设写下来（\"我认为 X 是根因因为 Y\"）；最小改动测试；一次一个变量；没过就提新假设，不加补丁。\n4. **实现修复**：先写失败测试；单一修复不做\"顺便改进\"；验证通过且无其他测试断裂。**3 次修复失败 → 质疑架构**，不试第 4 次：每次修复揭示新位置/新耦合 → 是架构问题不是假设错误，找人讨论而非继续打补丁。\n\n### 红旗信号——发现自己在想这些就回阶段 1\n\n- \"快速修复先试试，之后再查\"\n- \"改 X 看看行不行\"\n- \"加几个改动一起跑测试\"\n- \"不写测试了手动验一下\"\n- \"应该是 X，先修了再说\"\n- \"一次修复\"（已经试了 2+ 次）\n- 每次修复在新位置暴露新问题\n\n### 常见借口\n\n| 借口 | 现实 |\n|------|------|\n| \"问题简单不需要过程\" | 简单问题也有根因，过程对简单 bug 很快 |\n| \"紧急没时间\" | 系统化调试比乱猜重试更快 |\n| \"先试这个再查\" | 第一次修复定调，从一开始就做对 |\n| \"几个修复合一起省时间\" | 无法隔离哪个起效，还制造新 bug |\n\n## Part B — 数据化性能优化 7 步\n\n覆盖数据库、服务端、前端、客户端、桌面/RN、CLI、后台任务、队列、缓存、同步、构建、启动和网络链路。除非用户明确要求只做静态建议，否则不得先改代码再补解释。\n\n1. **定义路径与指标。** 写清楚用户入口或系统入口、复现步骤、目标指标和观察窗口。按层选择指标：数据库 query/scan/lock/row count，服务端 handler/SSR/RPC/fanout/serialization/cache，前端 render/hydration/LCP/interaction/request waterfall，客户端/桌面/RN startup/bridge/native I/O，CLI/background job queue/wall time/CPU/memory，网络 payload bytes/request count/retry。\n2. **优化前先打桩。** 先打日志或启用现有 probes。日志必须覆盖关键阶段边界，包含 request/route/job/query/context 标识、开始/结束时间、duration、count/size/cacheHit 等数值，并避免输出 token、cookie、API key、用户私密正文或大 payload。\n3. **收集 baseline。** 在本地或指定环境跑至少一次完整路径，保存原始输出位置或摘录关键数值。若本地 runtime/preview 阻塞，先报告阻塞并修测量路径，不得跳到优化实现。\n4. **分析瓶颈。** 用数据指出最慢阶段和占比，形成可证伪假设。不要因为代码看起来\"可能慢\"就直接改。\n5. **应用一次范围限定的优化。** 每次只改一个主要瓶颈或一组强相关瓶颈，保留权威数据源和维护路径，不硬编码、复制或影子缓存业务数据。\n6. **重新运行同一测量。** 使用同一入口、同一数据集、同一环境、同一 probe/log 口径复测。结果必须能和 baseline 对齐。\n7. **报告对比。** 最终报告必须包含 before/after 表：阶段、baseline、after、delta、样本次数、环境、命令/日志来源、剩余瓶颈和未验证项。没有改善或结果噪声过大时，如实报告，不包装成成功。\n\n### 计划文件结构\n\n计划文件中的性能任务必须包含 `Measurement plan`、`Baseline results`、`Optimization hypothesis`、`After results`、`Comparison` 五段；执行中每获得一组数据就更新计划文件，确保新代理不依赖聊天记忆。\n\n## Boundaries\n\n- 聚焦系统化调试心法与性能测量纪律，不提供代码修复本身。\n- 不覆盖架构重设计（修复失败超 3 次后转给 owner）；不替代具体工具（日志、性能分析、网络包）的学习。\n- 不把构建通过、代码变少或主观感觉更快当成性能改善；必须有同口径 before/after 数据。\n- 用户只要求静态建议时可以不改代码，但必须明确没有运行时基线与改善证据。",
    skillConfig: buildSystematicinvestigationSkillConfig(slug),
  });
}
