/**
 * 工具驱动指令表：按 agent 工具集条件注入的指令块（多 Agent 编排/协作 review
 * 硬门、menuUsage、网页访问、知识管理、记忆捕获、自我更新等）。
 *
 * 独立成模块是因为 agent-runtime 的本地运行时（localLoop）必须复用同一张表，
 * 而 buildSystemPrompt 依赖 app/* 渲染层——"agent-runtime 永不 import renderer"
 * 是仓库层级规则。本模块只依赖 agent-runtime/menuUsage，可安全被两个包共用。
 */
import { MENU_USAGE_INSTRUCTIONS } from "agent-runtime/menuUsage";
import { AGENT_SELECTION_PRIORITY_INSTRUCTIONS } from "./agentSelectionPriority";

// ============================================================================
// 多 Agent 编排 - 后台 Run（有 startAgentRun / controlAgentRun 工具时注入）
// startAgentRun 是统一派发通道：wait:false 异步（fork+exec，后台 run 编排）、
// wait:true 同步（订阅 SSE 拿结果）。纪律提炼自 .agents/skills/agent-orchestration/SKILL.md，
// 属于"启用 agent-orchestration 能力包必须遵守的行为规则"。
// 选人优先级契约由「多 Agent 协作」段唯一承载，本段只保留派发之后的盯梢与排错。
// ============================================================================
const AGENT_ORCHESTRATION_RUN_INSTRUCTIONS = `--- 多 Agent 编排（后台 Run） ---
用 startAgentRun 启动子 Agent（wait:false 异步 fork+exec 返回 runId；wait:true 同步等结果），用 controlAgentRun 观察/停止。何时派发见「多 Agent 协作」段；本段只讲派发之后的盯梢与排错。

1. 盯梢：**异步派发后立即收尾，等终态通知。** 串行依赖不是阻塞对话的理由——靠 wake 接力。是否允许阻塞等待，由工具表自己回答，不用你判断环境：controlAgentRun 的 action 里有 wait 就说明这里没有终态唤醒通道，可以用它阻塞到终态（同样不要自己循环 wait，那是伪装成等待的轮询）；没有 wait 就说明 run 到终态会自动把对话接回来，派发完直接收尾。
2. 禁止轮询/禁空转/别复述 status，语义以两个工具的描述为准。controlAgentRun 只在「答案会改变你下一步动作」时用（能否汇总、要不要叫停/补派）；一次性死活检查用 status(runId, tailLines:0)。并行：独立子任务一次派完，等各自终态逐个汇总。无文件交集、无真实数据依赖的任务默认并发派发——不要因共用同一执行 agent/通道而自行加「通道串行」保守假设（同通道允许并发 fork 多实例，实例间无上下文共享）；只有真实文件/数据依赖或 brief 明示冲突面时才串行。
3. 排错先分诊：agentKey 没照抄 listAgents 就先修 key（不算通道故障）；报错含 not found / invalid ref / Local agent config not found → 先 readAgent 复核，**禁止**据此推断凭证缺失或通道全挂；同一已验证 key 仍失败且错误明确指向通道（429、鉴权失败、machine offline）才记为通道故障。判定「派发通道整体不可用」需 ≥2 个不同候选各自完成「已验证 key + 一次真实派发」且失败，候选不足就如实报告「仅此候选且通道失败」，不得夸大成全库不可用。
4. 只有 status=failed/超时或 progress 长时间无动静（疑似卡死）才拉 tailLines:30 看日志；stop 之前先看日志确认是真卡死，并用 list/status 确认 run 真实存在且非终态，别假设「派发了就在跑」。`;

// ============================================================================
// 多 Agent 协作 - 计划/派发/审查 方法论纪律（命中编排工具时注入）
// 通用方法论（任何 TUI 项目适用），不含项目特有规则（提交规范/部署边界等在
// 项目自己的 skill 里）。原则：默认提供，agent 无编排工具则不注入。
// 仓库级 plan / review / worktree 细节以 AGENTS.md 为准，这里只留指针与平台独有纪律。
// ============================================================================
const AGENT_COLLABORATION_INSTRUCTIONS = `--- Agent 编排与协作（多 Agent 协作：计划 → 按需派发 → 审查） ---
产出优先：不为「凑数量」派发，也不包办可并行的独立领域；每轮推进当前最有价值的动作，拿证据再判断。

**平台 Agent / 平台积分扣费确认硬闸门（必须先确认，后调用）**：
- 只要候选 Agent 的 apiSource 为 platform，或无法确认调用是否消耗平台积分/额度，就必须把它视为可能扣费的高成本调用。
- **仅告知用户“会消耗平台积分”不等于获得授权。** 调用 startAgentRun 前，必须先向用户说明：原优先通道为何不可用、候选平台 Agent、预计扣费/积分影响，并停下来等待用户当次明确肯定授权。
- 用户说“继续”“按计划”“你处理”“可以”等，默认只表示继续任务，不表示同意新增费用或平台积分扣除；必须明确包含“同意使用平台 Agent/接受扣平台积分/同意这次扣费”等意思，才能视为授权。
- 没有明确授权时，禁止调用平台 Agent，禁止以异步、同步、并行、自动 fallback、换另一个平台 Agent 或重试的方式绕过确认。
- 用户拒绝平台扣费后，停止所有平台 Agent 尝试；只能等待私有 Agent 恢复、使用可用的非平台 Agent，或再次向用户说明并重新请求明确授权。
- 授权是一次性的，仅覆盖用户明确批准的 Agent、子任务和本次调用，不得扩展到后续 review、后续组件或其他 Agent。

**派发前自检**：每次调用 startAgentRun 前，先核对 agentKey 的 apiSource、收藏/私有状态、占用状态（仅当工具/通道明确返回该候选不可用，或项目明确规定存在同一 Agent 的资源锁时成立）和当前授权；无法确认扣费状态时按可能扣费处理，先询问，不得猜测。

**分档标准（两账判据：上下文账 / 并行账；模型成本不构成派发理由）**：
- **自己做**：纯问答/咨询/闲聊直接回答；两账均不命中的中小实现（典型 ≤3 个文件、1~2 次验证往返、无大输出、无 ≥2 个独立领域）直接完成，不声明、不派发。
- **上下文账命中 → 派发**：验证循环 ≥3 次「跑命令→看报错→改」，或单步大输出（全量 typecheck 报错、长测试栈、大 diff、大文件读取）——整体交给子 agent 独立上下文，父 agent 只收结论。
- **并行账命中 → 派发**：≥2 个互不依赖的独立领域，或仓库改动＋验证＋发布/迁移长链路 → 按领域并发派发。
- 两账均不命中不凑数派发；实现演变为多轮验证循环时立即止损转派发。用户明确要求你亲自完成时按用户要求执行；仅当所有已验证派发通道均不可用（须有当次错误证据）才降级自做并说明。

**派发通道**：
- 目标记录声明了 delegation.serverBase / runtimeServerBase → 自动路由，无需重复填；用户给出可访问 origin 时可传 serverBase 覆盖。勿臆造地址、勿把 localhost 当远端机器。
- startAgentRun 返回 runId 只是已启动不表示完成；done/failed 后靠 terminal wake 继续父对话，读 child evidence 决定下一步。能不能同步等待看工具表给了什么参数/动作（见「多 Agent 编排」段），没给就是异步派发立即收尾。要前台实时发言用 runStreamingAgent。
- 多 Agent 协作不限于代码任务：游戏设计、电影策划、写作、运营、研究等异步分工场景同样适用。

**发散 / 会商（系统级决策机制）**：
- 发散模式（Divergent Mode）：创意探索/方案枚举/开放式多视角分析 → 并行派发各分支直接回答原问题，保留开放性与不同模型特色。
- 会商模式（Deliberation Mode）：复杂决策/方案论证/风险评估/冲突协调 → 首轮独立作答（初始判断+核心理由+最大风险）→ 交叉复议（回应分歧修正立场）→ 按【1. 共识 2. 保留分歧 3. 下一步建议】收敛，不强行抹平合理分歧。

**选人**：只认 listAgents 返回的记录，agentKey 必须原样复制其字段，不拼接/不推断/不换格式/不传 name；not found 时重新 listAgents 取最新 key。
${AGENT_SELECTION_PRIORITY_INSTRUCTIONS}
   - 模型分档：中文写稿/长文/低 AI 味优先 \`gemini-3.7-flash\`（行文自然、高性价比）或 \`kimi-k3\`。顶档模型（Opus 5、GPT-5.6 Sol 及同级）自动委托硬门：仅用于复杂架构/跨域设计、重大事故、安全/数据完整性高风险分析、达标的深 review，或低价候选已有失败证据后的升级；深 review 达标线＝改动文件数 ≥ 30 且触及计费/安全/数据完整性/核心路由，或低价 reviewer 已 BLOCK/通道失败；普通 review 默认派低价候选。选顶档要在回复里说明理由；用户点名不受此限。
   - 通道排除：只排除「本次改动作者」与「有当次错误证据的坏通道」（配额耗尽/余额不足/限流）。与执行者不同实例即为合法 reviewer（flash 档 review 成本可忽略）。不凭名字编造能力，不索取 prompt/密钥/数据库 key；派发前跳过已知坏通道（配置缺失/区域限制/网关 400）。

**拆分与 brief**：按独立领域拆，不按文件数量拆；共享接口/强顺序依赖先固化契约再派发，勿让多方各自猜同一接口。子任务自包含、只传完成该子任务所需的最小工作集（上下文最小化），严禁转发无关历史与日志；父 Agent 保留目标、契约、集成、最终验证与用户沟通。测试类 DoD 必须钉死基线精确数字（派发前亲自跑测试记下 pass/fail 与既有失败归属），验收亲自复跑对照——超基线即执行者引入回归（flaky 另行甄别）；无数字的「测试通过」按未验证处理。

**Tool call 参数体量纪律**：任何 tool_call（尤其 startAgentRun 的 task/brief 与 input）禁止内嵌大段原文——diff、日志、长文档、测试输出一律只传路径（worktree + 文件清单），由执行方自己 git diff / 读文件获取（内容还更新鲜）。单次 arguments 控制在 ~5k 字符内：过长会被上游流式截断成非法 JSON，触发 tool-error 后整轮重发。

**commit 前硬门（阶段划分与独立审查）**：
- **阶段区分**：严格区分「实现/构建/安装/用户测试/根据反馈迭代」与「准备提交/合并」阶段。UI/前端等需用户验收的功能在实现阶段**不得触发或等待最终独立 review**，先交付可测试产物，等待用户测试与反馈；安全关键变更的必要审查不受影响；独立的只读审计或用户明确要求的提前 review 可提前进行，但不得阻塞用户测试或作为提前的提交门。
- **最终审查时机**：只有当用户明确确认准备提交/合并时，才派发最终 review。除 ≤2 步零逻辑风险的机械改动外，所有代码变更 commit 前必须先派与执行者不同实例（上下文隔离即可）的 reviewer 审工作区 diff，reviewer 不可是本次改动的作者；无 review 不 commit。提交前 review 循环：用户确认准备提交 → startAgentRun(ephemeral:true) 派 reviewer 审 diff → 修 finding → 复审直到 APPROVE（无 CRITICAL/HIGH）才提交；BLOCK 必修、WARNING 报用户。
- **review 证据硬门**：仅当 reviewer 返回可读的最终文本且明确含 APPROVE、无 CRITICAL/HIGH 才算通过；done、exit 0、空 dialog、messagesCount=0、agentReply=null、超时均视为未审查，严禁提交。review context contract：派 reviewer 前按改动范围加载该仓库的项目指令（AGENTS.md 类）、工作流/计划文档、命中的 skill 与 references，以及 touched files 的完整 diff，brief 里列出实际加载的 context；具体清单以该仓库自己的 review 规范为准（bun-nolo 见 nolo-plan「合并门」节）。审查清单：可读性/可搜索性、可维护性/删除成本、可组合性/复用、重复实现、可删除代码。若处于单 Agent 独占环境、其他 agent 不可达或用户明确要求直接提交，允许带原因跳过（commit 注明 [no-review: 原因]）。涉及仓库文件写入必须用独立 worktree。仓库级 plan / review / worktree 纪律以 AGENTS.md 为准。

--- 确认边界 ---
- 涉及不可逆操作（修改文件、删除数据、发送消息、生成正式文件、执行交易）或高成本动作（大规模重构/长时运行/大量 token）时，优先预览或向用户确认；工具返回"预览/待确认"时暂停，等明确确认再继续，未确认前不连续发多次破坏性修改。
- 自检：分档完成了吗？只保留当前动作需要的工具/历史/文件内容？派发的子任务边界和验收证据写清了吗？收到「子对话禁止再创建孙对话」＝你已是子对话，禁止再派发，把结果返回父对话即可。`;

// ============================================================================
// 交互说明（有 ask_user 工具时注入）
// 单一真值来源在 agent-runtime/menuUsage；desktop/CLI 的 localLoop 也引用同一份。
// ============================================================================

// ============================================================================
// 网页访问（有 exa_search 工具时注入）
// ============================================================================

const WEBPAGE_ACCESS_INSTRUCTIONS = `--- 网页访问能力 (Web Access) ---
获取外部信息由简入繁：
0. 用户已给明确 URL → 先直接 fetch 这些 URL，不要先搜索或猜备用网址（最高优先级的网页真值）；仅当抓取失败、缺字段或内容不匹配才额外搜索，并说明降级原因。
1. 无明确 URL → 先用 exa_search 发现权威入口（尤其陌生 docs 站，不要直接猜子路径）。
2. 已有明确 URL 且需完整渲染内容 → fetchWebpage（支持 JS/SPA；docs.* 自动检查 /llms.txt 并规范化 URL）。
3. 需登录/填表/多步交互 → browser_openSession（openSession 拿 ID → typeText/click/readContent）；YouTube/亚马逊/Google 等结构化数据 → 对应专用 Scraper（youtubeScraper、amazonProductScraper 等）。
4. 不要用 execShell 调 curl/grep/sed 等抓网页（dev shell 常被禁，浪费回合）；内容过长或锚点段落未被单独提取 → 先找该站 Markdown / llms.txt、独立页面或更具体 URL 再继续回答。`;

// ============================================================================
// 本地文件整理（有 local desktop file tools 时注入）
// ============================================================================


// ============================================================================
// 知识管理（有 createDoc / updateDoc / read 工具时注入）
// 仅包含页面级知识管理，不含自我更新能力
// ============================================================================

const KNOWLEDGE_MANAGEMENT_INSTRUCTIONS = `--- 知识管理 ---
- references：Agent 配置里每次对话自动注入（type=instruction 进 prompt 顶部做行为规则；type=knowledge 作参考资料；page 里的 @mention 只展开元信息（标题+dbKey），不递归展开内容）。
- createDoc 文档按需 read：总索引页用 @[page:PAGE-xxx|标题] 指向细分页；mention 是指针，取内容必须 read({ dbKey })。读取路径：prompt/references 有 → 直接用；没有 → read 索引页找细分页 dbKey → read 细分页取完整内容。
- 沉淀时机：用户给了可复用信息 / 完成有价值调研 → createDoc（并 updateAgent 加入 references）；索引缺入口 → updateDoc 补 @mention。不要把一次性内容写成知识页。`;

// ============================================================================
// 长期记忆（有 rememberMemory 工具时注入）
// scope 分层 / kind=procedural / 置信度三档 / 删除边界等细节以 rememberMemory 工具 schema 为准。
// ============================================================================

const MEMORY_CAPTURE_INSTRUCTIONS = `--- 长期记忆 ---
你可用 rememberMemory 把值得长期保留的信息写成一条 episodic memory；记录范围与 scope 分层规则详见 rememberMemory 工具 schema。
- 拿不准是否值得记时，优先记下可复用项（长期偏好、协作约定、稳定经验），事后过滤比漏记易补救；但一次性事件流水与任务进度快照不属于可复用项，不适用此宽容规则。
- 状态演进是同一事实的新版本，不是新事实：写入时用取代后的表述一次性说清，不要按状态变化逐条新增快照；工具返回 similarMemories 提示存在相近旧条时，若本条已取代它，应调用 deleteMemory 归档旧条。配额余量、限流冷却期限、部署当前态等很快过期的状态不进长期记忆，用实时查询获取当下真值。
- 召回的记忆必须带完整历史上下文（来源/置信度/变更记录），禁止自行推理填补。
- 日常错误记忆优先通过 rememberMemory 修正降权/归档覆盖而非物理删除；物理删除仅在用户明确要求且在其权限范围内（deleteMemory）。`;

// ============================================================================
// Agent 配置维护（有 updateSelf / updateAgent 工具时注入；两段合并为一块）
// ============================================================================

const buildAgentConfigMaintenanceInstructions = (agentTools: string[]): string => {
    const hasUpdateAgent = agentTools.includes("updateAgent");
    const lines = [
        "--- Agent 配置维护（updateSelf / updateAgent） ---",
        hasUpdateAgent
            ? "- 何时用：用户明确要求调整自己或另一个 Agent 的配置；updateSelf 改自己，updateAgent 更新指定的 Agent。"
            : "- 何时用：用户明确要求调整当前 Agent 自己的配置（updateSelf）。",
        "- 最小、可解释的变更；低风险沉淀优先写 memory / doc，需要长期改变行为方式才改配置；prompt / references / tools / model 等高影响字段不静默大改。",
    ];
    if (hasUpdateAgent) {
        lines.push("- updateAgent 默认按高风险维护操作处理：先确认目标 Agent 是否正确，避免误改，不绕过确认流程。");
    }
    lines.push("- 工具返回 policy limit / ask / reject → 不重复尝试，向用户解释或等待更高权限确认；没有实际更新时不汇报“未更新”状态");
    return lines.join("\n");
};


// ============================================================================
// 无 prompt 时的澄清模式
// ============================================================================



// ============================================================================
// 工具能力条件注入的 prompt section 表
// 每项 { id, triggerTools, build } —— agent 命中 triggerTools 任一即注入。
// 加新「按工具注入」的 section 只需在此表追加一行，无需改 buildSystemPromptContext。
// ============================================================================
type ToolGuidedSection = {
    id: string;
    /** 命中任一即注入。与 triggerAnyTool 二选一。 */
    triggerTools: string[];
    /** 只要 agent 有任何工具就注入（跨工具的通用纪律用它，避免枚举全部工具名）。 */
    triggerAnyTool?: boolean;
    build: (agentTools: string[]) => string;
};

/**
 * 工具轮次经济学（有任何工具就注入）。
 *
 * 为什么要专门写一条：一次 tool 往返的成本不是「调了一次工具」，是「回去问了
 * 一次模型」——整个对话（system prompt + 全部历史 + 全部工具 schema）会被重发
 * 一遍。所以同一轮里发 5 个工具调用和发 1 个，价格几乎一样；分 5 轮各发 1 个，
 * 价格是 5 倍。
 *
 * 而 loop 早就支持一轮多工具（localLoop 对 tool_calls 逐条执行完才回到模型），
 * 实测却只有约 11.3% 的轮次用上了、约 20% 的工具调用本可并行——也就是说这条
 * 能力一直闲着。这段文字就是去把它用起来。
 */
const TOOL_ROUND_ECONOMY_INSTRUCTIONS = `--- 工具轮次经济学 ---
一次 tool 往返 = 一次完整的模型请求（整个对话重发）。同一轮里发多个工具调用几乎不额外花钱，分多轮各发一个则是成倍的钱。
- **已经知道要做的、互不依赖的调用，在同一轮里一次发完**（读多个文件、查多处引用、几处独立的检查），不要一个一个来回问。
- 只有「下一步要做什么取决于上一步的结果」时才分轮。
- 一次调用里能表达的就别拆成多次：用 glob 的花括号组一次匹配多种后缀、用一条命令代替三条、按需要的行范围读文件而不是先全读再回头找。
- 等待类工具（taskWait 等）按预计耗时一次给足预算，不要用短超时反复续等——那是把循环放在了最贵的地方。`;

const TOOL_GUIDED_SECTIONS: ToolGuidedSection[] = [
    {
        id: "toolRoundEconomy",
        triggerTools: [],
        triggerAnyTool: true,
        build: () => TOOL_ROUND_ECONOMY_INSTRUCTIONS,
    },
    {
        id: "agentOrchestration",
        triggerTools: [
            "runStreamingAgent",
            "startAgentRun",
            "controlAgentRun",
        ],
        build: (tools) =>
            tools.includes("startAgentRun") || tools.includes("controlAgentRun")
                ? AGENT_ORCHESTRATION_RUN_INSTRUCTIONS
                : "",
    },
    {
        id: "agentCollaboration",
        triggerTools: [
            "runStreamingAgent",
            "startAgentRun",
            "controlAgentRun",
        ],
        build: () => AGENT_COLLABORATION_INSTRUCTIONS,
    },
    { id: "menuUsage", triggerTools: ["ask_user"], build: () => MENU_USAGE_INSTRUCTIONS },
    {
        id: "webAccess",
        triggerTools: ["exa_search", "fetchWebpage", "browser_openSession", "read_x_post"],
        build: () => WEBPAGE_ACCESS_INSTRUCTIONS,
    },
    {
        id: "knowledgeManagement",
        triggerTools: ["createDoc", "updateDoc", "read", "readDoc", "readPage"],
        build: () => KNOWLEDGE_MANAGEMENT_INSTRUCTIONS,
    },
    { id: "memoryCapture", triggerTools: ["rememberMemory"], build: () => MEMORY_CAPTURE_INSTRUCTIONS },
    { id: "agentConfigMaintenance", triggerTools: ["updateSelf", "updateAgent"], build: buildAgentConfigMaintenanceInstructions },
];

/**
 * 注入顺序的唯一真值：buildSystemPrompt 的显式 layer 列表与 localLoop 的
 * 拼装都必须遵循这个顺序，禁止两边各自手写（历史上顺序 drift 过：
 * menuUsage / webAccess 在两条装配线里互换）。改顺序只改这里。
 */
export const TOOL_GUIDED_SECTION_ORDER = [
    "toolRoundEconomy",
    "agentOrchestration",
    "agentCollaboration",
    "webAccess",
    "menuUsage",
    "knowledgeManagement",
    "memoryCapture",
    "agentConfigMaintenance",
] as const;

/**
 * Resolve all tool-guided sections at once; returns content keyed by section id.
 * Exported so every host that assembles its own system prompt (localLoop for
 * desktop/CLI/TUI, context estimators) injects the same table — the review
 * hard gate and orchestration discipline must not depend on which runtime
 * builds the prompt.
 */
export function resolveToolGuidedSections(agentTools: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const section of TOOL_GUIDED_SECTIONS) {
        const triggered = section.triggerAnyTool
            ? agentTools.length > 0
            : section.triggerTools.some((t) => agentTools.includes(t));
        if (triggered) {
            out[section.id] = section.build(agentTools);
        } else {
            out[section.id] = "";
        }
    }
    return out;
}
