/**
 * Agent 选人与排序真值解析器（统一真值源）
 *
 * 产品真源：docs/product/skill-model.md「统一选人基础与用途边界」。
 * 分组谓词与注入描述共用 AGENT_SELECTION_PRIORITY_GROUPS；不按费用标签分组。
 * 同组时间排序保持原行为；这不是模型能力评分或派发授权。
 */

import { MODEL_TIER_GUIDANCE } from "./dispatchSelectionPolicy";

export interface AgentSelectionCandidate {
  isOwned?: boolean;
  isOAuth?: boolean;
  apiSource?: string | null;
  isFavorite?: boolean;
  favoritedAt?: number | string | null;
  updatedAt?: number | string | null;
  createdAt?: number | string | null;
}

export function parseAgentTimestamp(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * 判断 Agent 是否属于用户配置的私有通道（OAuth 或 自定义 API）
 */
export function isUserConfiguredAgent(agent: AgentSelectionCandidate): boolean {
  return agent.isOAuth === true || (agent.isOwned === true && agent.apiSource === "custom");
}

/** Ordered predicates and prompt descriptions share one definition; final group is fallback. */
export const AGENT_SELECTION_PRIORITY_GROUPS: ReadonlyArray<{
  description: string;
  matches: (agent: AgentSelectionCandidate) => boolean;
}> = [
  { description: "收藏的 OAuth / 自定义 Agent（isFavorite=true 且 (isOAuth=true 或 (isOwned=true 且 apiSource=custom))）",
    matches: agent => agent.isFavorite === true && isUserConfiguredAgent(agent) },
  { description: "其他收藏 Agent（isFavorite=true）", matches: agent => agent.isFavorite === true },
  { description: "未收藏的 OAuth / 自定义 Agent（isOAuth=true 或 (isOwned=true 且 apiSource=custom)）",
    matches: isUserConfiguredAgent },
  { description: "其他自建 Agent（isOwned=true）", matches: agent => agent.isOwned === true },
  { description: "公开 / 平台 Agent（其余候选；不是费用判据）", matches: () => true },
];

export function resolveAgentSelectionPriority(agent: AgentSelectionCandidate): number {
  return AGENT_SELECTION_PRIORITY_GROUPS.findIndex(group => group.matches(agent));
}

/**
 * Agent 统一排序比较器
 */
export function compareAgentSelection<T extends AgentSelectionCandidate>(left: T, right: T): number {
  const priorityDiff = resolveAgentSelectionPriority(left) - resolveAgentSelectionPriority(right);
  if (priorityDiff !== 0) return priorityDiff;

  const leftFav = left.isFavorite === true;
  const rightFav = right.isFavorite === true;

  if (leftFav && rightFav) {
    const leftFavAt = parseAgentTimestamp(left.favoritedAt);
    const rightFavAt = parseAgentTimestamp(right.favoritedAt);
    if (leftFavAt !== rightFavAt) return rightFavAt - leftFavAt;
  }

  const leftUpdated = parseAgentTimestamp(left.updatedAt ?? left.createdAt);
  const rightUpdated = parseAgentTimestamp(right.updatedAt ?? right.createdAt);
  return rightUpdated - leftUpdated;
}

/**
 * 注入给 Agent System Prompt 的统一选人规则说明。
 *
 * 本常量只承载「选中谁」的排序规则，插入 toolGuidedSections 的「选人」段。
 * 「要不要派」的判断（派发价值 / 三杠杆 / 反约束）不属于选人——它由
 * AGENT_COLLABORATION_INSTRUCTIONS 顶部的「派发价值」小节单独承载并前置，
 * 保证“先判断值不值得派”先于分档与选人被读到。
 */
export const AGENT_SELECTION_PRIORITY_INSTRUCTIONS = `   - 优先级契约：选人契约（listAgents 默认 scope="all"）：
     1. 候选发现：默认调用 listAgents()（默认 scope="all"），一次扫描覆盖收藏、自有、OAuth 订阅、自定义 API、本地与公开 Agent。
     2. 费用归属与授权见同注入的「平台 Agent / 平台积分扣费确认硬闸门」；不以归属标签改变下面的分组。
     3. 优先级排序（按以下谓词首次命中分组，与列表同源）：
${AGENT_SELECTION_PRIORITY_GROUPS.map((group, index) => `        (${index + 1}) ${group.description}`).join("\n")}
        此排序是候选优先级分组（不是模型能力 tier），不代表「排第一的就该选」；结合下述领域匹配、档位参考与当次可用性挑选（reviewer 见「reviewer 选人」）。
   - 收藏优先硬门（覆盖高复杂度档成本门）：存在可用且适合任务、requiresPaidApproval=false 的收藏候选时，不改派需平台费用确认的候选；只有收藏 Agent 确认不可用后才允许派平台 Agent，且当次说明并获费用授权。favorite + platform_credits 只表示偏好，不代表免费或已授权；费用判据见上。每次 startAgentRun 都创建独立的 run/dialog，并行用各自 runId、同一 batchId。
   - 匹配参考：按任务所需能力筛 tools 字段；同档候选优先成本低（低 inputPrice）或走用户私有凭据的通道。tools 字段只反映额外能力，不反映 coding 能力——代码工具由 host 自动注入，tools=[] 不代表不能写代码，不要据此排除候选。
   - reset-aware economics（只作同档、适合、当前可用候选之间的经济偏好，不覆盖收藏硬门、能力匹配或可用性）：listAgents 已暴露 economics（官方峰谷价格/配额倍率）和 quota（上游真实 remaining/limit/utilization/resetAt 窗口）。对于 billingSource="user_subscription"，若 quota 窗口同时给出未用额度信号（remaining/limit 或 utilization）且 resetAt 在未来，且该窗口代表订阅额度本身（如 Claude 订阅的 5h/7d 配额窗口这类不用就作废的已付额度），而不是纯吞吐容量，则这部分已付额度会在 reset 后失效；在质量/能力都足够时，reset 越近且未用额度越多，越应优先消耗，避免把已付款额度白白过期后再去产生 PAYG / platform 成本。仍有效且适用于本次请求的当前窗口若 utilization 达 1 或 remaining 为 0，按当次不可用处理、直接跳过该候选，不必先撞一次 429 换取失败证据；窗口已过 resetAt 或状态不明时按可用性未知处理，先刷新再判断，不要据过期快照跳过；不要因为只有 resetAt 就推断“还有可用额度”，也不要把 billingSource="user_api" 的 requests/tokens rate-limit reset、nextAvailableAt（429 冷却恢复）误当成“已付额度过期”；它们是容量/可用性信号，不是经济优惠。通用 requests/tokens rate-limit 容量窗口即使出现在 billingSource="user_subscription" 通道上，也只是速率容量而非会过期的已付资产，不得触发该偏好；分不清窗口语义时按容量处理，不按经济资产处理。owner_subscription 不占当前用户额度，仍按“调用者与平台零新增成本”理解，但不要把 owner 的 quota 当成当前用户需要主动烧完的资产。若 economics 显示即将跨 peak/off_peak 或 quotaMultiplier/priceMultiplier 将变化，把 changesAt 与任务预计时长一起考虑；证据不足时保持 neutral，不猜。
   - isOwned=true、isOAuth=true 或 apiSource="custom" 不证明费用授权。
   - 免询问边界（指针）：排序后不为「选谁」再问用户；仅在 requiresPaidApproval=false 的候选间静默换代（不得因此静默改派 platform_credits 归属且需确认的通道）。平台费用授权、429 改派告知与未知费用先问照旧，见同注入安全门。
   - 规划即选人：跨档写具体 selectionReason（用户指定/领域优势/真实通道失败/无合适候选等），保留真实难度、不改写 difficulty 去迁就现成通道；只校验理由存在、不伪称已核实事实，不须先制造低档失败，也不作为阻断或自动取消派发的条件。
   - 选人（领域匹配优先于档位，用户可覆盖）：dimension 为 general（通用）/ design_frontend（设计前端）/ writing（写作），不同 LLM 在不同领域各有强弱，不是单纯大小排序。当次用户点名 > 用户记忆中的分工/禁忌 > 近期同类任务失败证据；明确不适配才排除，缺证据不等于弱。
     难度档定义、判档顺序与升档边界见同注入的「先判档再选模型」；difficulty 是任务难度，不是候选资格硬门。
     能力档映射（共享人工映射，唯一真源 dispatchSelectionPolicy.ts）：
${MODEL_TIER_GUIDANCE}
     图像模型只用于图像任务，不用于代码 / 文本任务。
     模型档位只取共享人工映射；未知模型保持 unknown 且仍可用，不由 LLM 自封档位，不默认顶档、不向用户索要定档。
     领域具体偏好仅适用于对应 dimension：design_frontend（设计 / 前端）领域内默认模型家族偏好为 Claude → Gemini → GPT；按任务 difficulty 与共享人工模型档位映射，在偏好家族中选胜任的合适档位，家族顺序不代表智能档位排名。general（通用）不适用此家族顺序；writing（写作）仍为 Gemini 优先于其他模型。未知档位保持 unknown，不推定家族内能力排名。其余模型在对应维度未知，不推定完整排名。
     领域偏好可作为跨档选择理由，不表示不能换档；偏好不覆盖真实能力限制、费用授权、作者回避与当次可用性，不得因为「设计任务偏好 Opus」就自动消耗平台积分。
     工具仅返回档位差异提醒且照常启动（已知跨档须先有 selectionReason），不强制选人、不自动取消重派；派发 Agent 自行结合领域优势、真实额度/网络与候选可用性、用户指定作判断。速度规则统一见常驻「派发选人 · 可用性与速度」，不得据速度推导模型档位。
   - 可用性证据：区分当次真实失败、适用且仍有效的 quota、过期参考和未知。规划列表与推荐不按冷却硬过滤；通用执行可用上面的有效 quota 规则；review 自身兜底仍须其他合规候选的当次错误证据，不用 quota 标注替代。
   - 429 限流与知情权契约：任何用户私有凭据与自建 Agent（billingSource 为 user_subscription / owner_subscription / user_api / local，或 isOwned=true）在 listAgents 的 agents[].availabilityStatus 为 rate_limited 或 quota_exhausted 时，禁止静默跳过；改派平台 Agent（消耗平台积分）前必须在回复中告知用户：哪个订阅/自建 agent 限流、预计何时恢复（nextAvailableAt）、本次将扣平台积分；availabilityStatus 与 nextAvailableAt 仅是参考信息，不拦派发，不得仅凭冷却标注排除候选；用户仍可照常派发并获得上游真实结果。`;