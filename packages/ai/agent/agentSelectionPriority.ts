/**
 * Agent 选人与排序真值解析器（统一真值源）
 *
 * 对应产品真值（docs/product-positioning.md:125 节 6.1）：
 * 排序与选人契约：
 * 1. 收藏的 OAuth / 用户自定义 Agent (isFavorite && (isOAuth || (isOwned && apiSource === "custom")))
 * 2. 其他收藏 Agent (isFavorite)
 * 3. 未收藏的 OAuth / 用户自定义 Agent (isOAuth || (isOwned && apiSource === "custom"))
 * 4. 其他用户自建 Agent (isOwned === true)
 * 5. 公开或非用户所有的 Agent (apiSource === "platform" / 社区公开)
 *
 * 同档位下：收藏组按最近收藏时间（favoritedAt）降序优先，非收藏组按最近更新时间（updatedAt ?? createdAt）降序优先。
 *
 * safeAgentSummary 列表排序和 toolGuidedSections 提示词共同消费本模块，消除二者规则分裂。
 */

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

/**
 * 计算 Agent 排序与选择优先级档位（0 最高，4 最低）：
 * 0: 收藏的 OAuth / 用户自定义 Agent
 * 1: 其他收藏 Agent
 * 2: 未收藏的 OAuth / 用户自定义 Agent
 * 3: 其他用户自建 Agent
 * 4: 公开或非用户所有的 Agent
 */
export function resolveAgentSelectionPriority(agent: AgentSelectionCandidate): number {
  const favorite = agent.isFavorite === true;
  const configured = isUserConfiguredAgent(agent);
  if (favorite && configured) return 0;
  if (favorite) return 1;
  if (configured) return 2;
  if (agent.isOwned === true) return 3;
  return 4;
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
 * 注入给 Agent System Prompt 的统一选人规则说明
 */
export const AGENT_SELECTION_PRIORITY_INSTRUCTIONS = `   - 优先级契约（与列表排序真值严格一致）：
     1. 收藏的 OAuth / 自定义 Agent（isFavorite=true 且 isOAuth=true 或 apiSource="custom"：私有订阅/凭据优先，不烧平台 credits）
     2. 其他收藏 Agent（isFavorite=true）
     3. 未收藏的 OAuth / 自定义 Agent（isOAuth=true 或 apiSource="custom"）
     4. 其他自建 Agent（isOwned=true）
     5. 公开 / 平台 Agent（apiSource="platform" 或社区公开）
     同档位下收藏项按最近收藏（favoritedAt）优先，其余按最近更新（updatedAt）优先。
   - 收藏优先硬门（用户钦定，覆盖顶档成本门）：禁止在收藏 Agent 可用时派平台通道。收藏的 OAuth/自定义 Agent 走用户私有订阅/凭据，即使是顶档模型（Opus、GPT-5.6 级）也不构成成本回避理由。每次 startAgentRun 都创建独立的 run/dialog；并行派发时必须用各自的 runId，并用 batchId 管理批次，避免编排层混淆结果。仅当收藏 Agent 确认不可用后才允许派平台 Agent，且必须当次告知用户将消耗平台积分。
   - 匹配参考：按任务所需能力筛 tools 字段；同档候选优先成本低（低 inputPrice）或走用户私有凭据的通道。tools 字段只反映额外能力，不反映 coding 能力——代码工具由 host 自动注入，tools=[] 不代表不能写代码，不要据此排除候选。
   - 429 限流与知情权契约：任何用户私有凭据与自建 Agent（isOwned=true、isOAuth=true 或 apiSource="custom" 之一）出现在 listAgents 的 unavailableAgents（429 冷却期）中时，禁止静默跳过；改派平台 Agent（消耗平台积分）前必须在回复中告知用户：哪个订阅/自建 agent 限流、预计何时恢复（nextAvailableAt）、本次将扣平台积分；任务不紧急建议等恢复或询问用户。`;
