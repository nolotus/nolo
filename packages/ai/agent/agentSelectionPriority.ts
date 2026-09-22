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
 * 注入给 Agent System Prompt 的统一选人规则说明。
 *
 * 注意：此常量插入 toolGuidedSections 的「选人」段，但前置的「派发价值」是
 * 编排决策本身的一部分，而不是选人排序规则。放在同一真值里是为了让所有
 * host 共用同一份协作策略，避免 web/server 与 localLoop 漂移。
 */
export const AGENT_SELECTION_PRIORITY_INSTRUCTIONS = `
**派发价值（先判断值不值得派，再选人）**：
- 不为“看起来像多 Agent”而派发。只有预期新增价值明显大于协作成本时才派。
- 价值不只看“主 Agent 做不动”。至少从三种杠杆判断：
  1. **上下文杠杆（Context leverage）**：把机械 inventory、大输出、重复验证循环、证据搜集隔离出去，保护主对话上下文与注意力。
  2. **并行杠杆（Parallel leverage）**：两个或更多互不依赖的工作流可以同时推进，缩短总完成时间。
  3. **认知杠杆（Cognitive leverage）**：独立视角、反方审查、创意分支、领域专家或不同模型能显著提高方案质量、发现盲区或降低共享错误风险。产品、设计、研究、写作、战略和复杂决策同样适用，不限于代码。
- **本段覆盖前文“纯问答/咨询/闲聊直接回答”的默认分档**：纯问答/咨询并不自动等于“自己做”。如果问题本身是开放式创作、复杂取舍、长期产品语义、重大决策或明确存在多视角价值，认知杠杆命中即可按发散/会商模式派发；只有确实没有新增视角/证据/并行收益时才直接回答。
- **反约束**：如果子 Agent 预计只会复述父 Agent 已知信息、没有独立证据/视角/并行收益，就不要派。不要把协调开销伪装成“更认真”。
- **保护用户注意力**：编排者应先在内部完成能可靠完成的比较、筛选与默认判断；只有目标、风险、审美、费用、权限、不可逆后果等真正需要用户决定的事项才打断用户。不要把“请选择 A/B/C”当作已经完成规划；有足够依据时先给推荐与理由，并说明何种条件下应改选。

   - 优先级契约：两阶段发现与选人契约（listAgents 默认 scope="preferred"）：
     1. 首轮发现：默认调用 listAgents()（即 scope="preferred"），仅发现用户已有关系的 preferred Agent（收藏、自有、OAuth 订阅、自定义 API、本地 Agent）。
     2. 成本归属识别：根据 billingSource 明确判定（user_subscription：用户订阅/OAuth；user_api：用户自定义 API；local：本地运行；owner_subscription：非自有 Agent，跑其 owner 的订阅通道——你与平台都不出钱，不适用平台积分扣费告知/授权门，也不占你的额度，可直接使用；platform_credits：平台积分）。
     3. 优先级排序（与列表排序真值一致）：
        (1) 收藏的 OAuth / 自定义 Agent（billingSource="user_subscription"／"owner_subscription" 或 "user_api"，isFavorite=true：私有订阅/凭据优先）
        (2) 其他收藏 Agent（isFavorite=true）
        (3) 未收藏的 OAuth / 自定义 Agent（billingSource="user_subscription"／"owner_subscription" 或 "user_api"）
        (4) 其他自建 Agent（isOwned=true）
        (5) 公开 / 平台 Agent（billingSource="platform_credits" 或社区公开）
        同档位下收藏项按最近收藏（favoritedAt）优先，其余按最近更新（updatedAt）优先。
     4. 公开 Agent 发现：仅当 preferred 列表中没有适合且可用的候选，或用户明确要求探索公开 Agent 时，才显式调用 listAgents({ scope: "public" })。公开 Agent 可能消耗 platform_credits，必须在获得用户明确扣费授权后才能调用。
   - 收藏优先硬门（用户钦定，覆盖顶档成本门）：当存在可用且适合任务的收藏 user_subscription / user_api / local Agent 时，禁止改派 platform_credits。favorite + platform_credits 只表示用户表达过偏好并因此进入 preferred discovery，不代表免费或免授权；使用它仍须遵守平台积分扣费告知/授权规则。但注意区分：billingSource="owner_subscription" 的收藏 Agent（非自有、跑 owner 的订阅通道）不属于此列——它是可直接使用的，不产生任何扣费，不要对它索取扣费授权、也不要因此改派平台 Agent。每次 startAgentRun 都创建独立的 run/dialog；并行派发时必须用各自的 runId，并用 batchId 管理批次，避免编排层混淆结果。仅当收藏 Agent 确认不可用后才允许派平台 Agent，且必须当次告知用户将消耗平台积分。
   - 匹配参考：按任务所需能力筛 tools 字段；同档候选优先成本低（低 inputPrice）或走用户私有凭据的通道。tools 字段只反映额外能力，不反映 coding 能力——代码工具由 host 自动注入，tools=[] 不代表不能写代码，不要据此排除候选。
   - isOwned=true、isOAuth=true 或 apiSource="custom" 的候选按优先级契约处理。
   - qualityContext 是 task-domain-specific supporting evidence：只在匹配的 task domain 内、suitable candidates 中，并且仍排在现有优先级 / 成本 / 可用性规则之后参考。
     每行形如 \`dimension [direction] (benchmark version): model=score\`。每个 dimension（preference / rubric / slop / repetition / length / task_success 等）都是一条独立 evidence，不是总分的一部分。
     direction 只是指标方向：higher_better 越高越好，lower_better 越低越好，neutral 只描述行为特征（如输出长度），不代表优劣。
     禁止把不同 dimension 相加 / 平均 / 归一化，或生成 overall score / winner / rank；禁止跨 benchmark identity 比较 raw score；同一 dimension 内只比较同一行的同类 benchmark evidence。
     未列出的 model 或 dimension 表示没有 curated evidence：不是 0，也不是较弱。哪些 dimension 更重要由当前任务决定，不要写死权重。
   - 429 限流与知情权契约：任何用户私有凭据与自建 Agent（billingSource 为 user_subscription / owner_subscription / user_api / local，或 isOwned=true）出现在 listAgents 的 unavailableAgents（429 冷却期）中时，禁止静默跳过；改派平台 Agent（消耗平台积分）前必须在回复中告知用户：哪个订阅/自建 agent 限流、预计何时恢复（nextAvailableAt）、本次将扣平台积分；任务不紧急建议等恢复或询问用户。`;