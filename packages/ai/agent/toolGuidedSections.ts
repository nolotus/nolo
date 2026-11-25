/**
 * 工具驱动指令表：按 agent 工具集条件注入的指令块（多 Agent 编排/协作 review
 * 硬门、menuUsage、网页访问、知识管理、记忆捕获、自我更新等）。
 *
 * 独立成模块是因为 agent-runtime 的本地运行时（localLoop）必须复用同一张表，
 * 而 buildSystemPrompt 依赖 app/* 渲染层——"agent-runtime 永不 import renderer"
 * 是仓库层级规则。本模块只依赖 agent-runtime/menuUsage，可安全被两个包共用。
 */
import { MENU_USAGE_INSTRUCTIONS } from "agent-runtime/menuUsage";
import {
    PLATFORM_RISK_CONTROL_RULE,
    SHELL_BROWSER_RISK_CONTROL_RULE,
} from "agent-runtime/platformRiskControl";
import { TOOL_USE_GUIDANCE } from "agent-runtime/toolUseGuidance";
import { AGENT_SELECTION_PRIORITY_INSTRUCTIONS } from "./agentSelectionPriority";
import { CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES } from "../tools/chromeConnectorTools";
import {
    DIFFICULTY_GRADING_ORDER,
    DIFFICULTY_GRADING_TIERS,
    resolveModelTier,
} from "./dispatchSelectionPolicy";

// ============================================================================
// 多 Agent 编排 - 后台 Run（有 startAgentRun / controlAgentRun 工具时注入）
// startAgentRun 是统一派发通道：异步（fork+exec，后台 run 编排）。
// 纪律提炼自 .agents/skills/agent-orchestration/SKILL.md，
// 属于"启用 agent-orchestration 能力包必须遵守的行为规则"。
// 选人优先级契约由「多 Agent 协作」段唯一承载，本段只保留派发之后的盯梢与排错。
// ============================================================================
const AGENT_ORCHESTRATION_RUN_INSTRUCTIONS = `--- 多 Agent 编排（后台 Run） ---
- 异步派发后先推进独立已授权工作，只有无可推进工作才结束等待终态。有 wait 且（预计 <100s 即需结果或用户要求同步）才阻塞；否则等 terminal wake，无则告知需手查。禁轮询；通知须可在失败/超时唤醒。发布等待仅用 \`scripts/ci/pushAndAwaitLive.ts\`。
- status 仅诊断/答执行细节（tailLines:0 摘要；失败/超时/久无进展才用 tailLines:30）；append、stop 直调，stop 不改终态。只有真实依赖才串行；禁止的串行借口见「并行是默认 · 派发纪律」。
- key/ref 报错先纠正并 readAgent 复核；已验证 key 的通道错误才算故障，≥2 候选实败才报整体不可用。orphaned/0 tool calls 先查 logTail.stderr 排除崩溃再重派。
- 终态必读 status.resultFile（readFile）：先 \`lines:"1-60"\`；有缺漏/异常/高风险或须独立核验时按区间续读。review 结论文件完整核验 verdict/findings；不以 .log 或 2000 字 lastAssistantText 替代。无文件＝无结论，不补读日志或猜故障/中断。
- 不要用 \`execShell\` 调 \`nolo agent run\`（绕过运行面板与终态回收）；用 \`startAgentRun\` 的 \`cwd\` 参数（已存在的绝对路径）。continueDialogId 显式传原 primaryAgentKey，否则回落当前编排者；closure 优先原 agent，重查可用性，确实不可用才换 key 并在 task 说明。`;

// ============================================================================
// 多 Agent 协作 - 计划/派发/审查 方法论纪律（命中编排工具时注入）
// 通用方法论（任何 TUI 项目适用），不含项目特有规则（提交规范/部署边界等在
// 项目自己的 skill 里）。原则：默认提供，agent 无编排工具则不注入。
// 仓库级 plan / review / worktree 细节以 AGENTS.md 为准，这里只留指针与平台独有纪律。
// ============================================================================
const AGENT_DISPATCH_MECHANICS = `startAgentRun 异步返回 runId。省略 agentKey 或传 'self' 派自身（全池扫描后兜底）；其他 agentKey 必须原样照抄 listAgents 的 agentKey（禁拼接/推断/换格式/传 name），not found 重查。并行同 batchId，禁止轮询；无终态唤醒须说明。
同一凭证默认允许并发（准入预算/429 除外）；按 credentialGroup 分散，必要时降并发/换通道。credentialed:false 是未知、非独立凭证，只限制「这些候选彼此之间的同批并发」（同批一个，或显式 allowUnknownCredential 确认风险），不把整轮工作降级为串行。并发依常驻「并行是默认 · 派发纪律」。`;

const AGENT_COLLABORATION_VALUE_AND_METHOD = `--- Agent 编排与协作（多 Agent 协作：读取 → 规划 → 派发 → 审查） ---
产出优先：不为「凑数量」派发，不包办可并行领域；按证据推进。

**派发价值（用于拆分与选人）**：
- 不为“看起来像多 Agent”而派发。简单任务直接做；需分工时派发执行，不派无收益的重复任务。
- 按三种杠杆拆分与选人：
  1. **上下文杠杆（Context leverage）**：隔离机械 inventory、大输出、验证循环与证据搜集，保护主上下文。
  2. **并行杠杆（Parallel leverage）**：独立工作流同时推进，缩短总耗时。
  3. **认知杠杆（Cognitive leverage）**：独立视角、反方审查、创意分支、领域专家或不同模型改善方案、发现盲区；适用于产品、设计、研究、写作、战略与复杂决策。
- **反约束**：额外调研/会商若只复述已知信息、没有独立证据/视角/并行收益，就不派。
- **保护用户注意力**：编排者先完成内部比较与默认判断，不把“请选择 A/B/C”当规划；仅目标、风险、审美、费用、权限、不可逆后果打断用户，有足够依据时先给推荐、理由及改选条件。`;

// ── 安全硬门（常在，不随派发意图裁剪；最小协议与完整协议共用同一常量）──────
const AGENT_PLATFORM_CREDITS_GATE = `**平台 Agent / 平台积分扣费确认硬闸门**：
- billingSource 只描述归属；认当次 listAgents.requiresPaidApproval（源 isPlatformPaidAgentCall）：true 必须先取得用户明确扣费授权才能派发；requiresPaidApproval 缺失按可能扣费先问；false 不等于免费（仍可能消耗订阅/API 用量）。
- **仅告知用户“会消耗平台积分”不等于获得授权。** startAgentRun 前说明原通道不可用原因、平台候选和预计扣费，等当次明确授权；“收藏”“自建”“availability 正常”“排序第一”“继续”“按计划”“你处理”“可以”等都不授权新增费用。
- 未授权禁止调用平台 Agent（禁异步/并行、fallback、换平台 Agent 或重试绕过）；拒绝即停止所有平台尝试。授权是一次性的，仅限获批 Agent、子任务及本次调用。`;

const AGENT_DISPATCH_PRECHECK = `**派发前自检**：startAgentRun 前核对 agentKey、候选证据与授权，禁先派后补；占用认实证。**改换候选或派自身须给出具体理由**（领域/失败证据/用户指定/通道约束）；unknown 档位不拦截，档位差异提醒不阻止启动。`;

const AGENT_VERSION_BOUND_ACCEPTANCE = `**按版本验收**：记录 worktree、受检版本（含未提交改动范围）、命令、检查范围、pass/fail 与原始输出引用；未执行/证据不可用须明示，不推定成功。同版本有效检查默认复用；仅版本变化、证据缺失/冲突或集成风险才追加相关检查。验收后返工仅补缺口；复用不代替独立 review 或授权。
**子 Agent 最终交付**：结论置顶、证据后置；前 30 行给状态（已完成 / 未完成 / 阻塞）、受检 worktree 与版本范围、产物/改动、检查命令与结果汇总、剩余问题与下一步；证据（路径、commit、artifact、run/dialog）放后半段，分清事实 / 推断 / 未知。失败不得写成未验证，done 不代替验收，不复制冗长日志、源码或 diff。`;

const AGENT_EXECUTION_OWNERSHIP = `**平台默认：规划 → 执行 → 请教**：简单任务直接做；默认规划/遇阻请教见常驻「请教模式」。父方定边界与验收，执行者负责定位、实现、相关测试与失败修复闭环，父方不重演探索。子任务不递归规划。`;
const AGENT_INCREMENTAL_HANDOFF = `上下文最小化是去掉无关材料，不是丢弃已有判断或压缩掉接续所需信息。brief 须详细准确并防父方幻觉污染：已验证事实附一级证据（文件:行、命令输出、日志、真实数据），无证据陈述只能当待验证；已选方向与理由、未验证假设、未知与争议点、边界与验收方式写清。用户明确的目标与决策是边界：父方推断显式标为待验证，不把猜测根因写成既定任务；执行者先核验关键前提、可反驳父方假设，反证成立可同范围调整路径，但不擅改用户目标；源码/日志/diff 用路径行号引用，不内嵌原文。复用已有排除路径，仅反证或状态变化才重验；独立 review/会商保持独立判断，不传作者自评或期待结论。子 Agent 不继承本对话历史：同 agentKey ≠ 同上下文，只显式传 continueDialogId 才有其历史；brief 的路径/证据引用不等于对方已读；full 审查用新 dialog，定向 closure 才续原审。**反模式禁令**：父方不手写实现代码贴给子任务，只写签名、不变量、行号边界与验收命令。`;

// ── 拆分规则（min / full 共用同一段，避免两档各写一份）──────────────────────
// 拆块依据是「子问题能否独立验收」，不是工时/调用次数：后者是人为限额，
// 会把需要连续推理的难点切成碎片，或让执行者在关键处被迫收工。
const AGENT_RECURSIVE_DECOMPOSITION = `- **同一问题的定位、修复和相关测试由同一执行者连续完成**；可独立推进、独立验收的工作才另拆。每块明确目标、输入输出、改动文件范围、依赖与验收方式。
${DIFFICULTY_GRADING_ORDER}
${DIFFICULTY_GRADING_TIERS}
- **并发只由依赖决定**：独立块同批并发；依赖线按序逐步推进，只阻塞相关线，不把主线串行化。`;

// ── 完整编排协议（仅检测到派发意图时注入；见 dispatchIntent.ts）─────────────
const AGENT_DELEGATE_FIRST_CORE = `${AGENT_EXECUTION_OWNERSHIP}
${AGENT_VERSION_BOUND_ACCEPTANCE}
- **按难度与领域分工**：主动拆派多模块/多文件只读摸底、大输出统计、重复验证循环、无写冲突的独立改动；仅单文件 ≤30 行确定性小改或纯问答直接做，多文件实现或反复跑修不留在主循环。
- **同一规划定人选与并发**：先读必要材料，定实际 agentKey；档位取工具/当次列表，不猜。
${AGENT_RECURSIVE_DECOMPOSITION}
- **交接**：保留必要判断（含已选方向与理由、未验证假设、未知与争议点）；已验证事实附一级证据，父方推断显式标为待验证；源码/日志/diff 用路径行号引用，不等于对方已读。父方不手写实现代码贴给子任务；独立审查不传作者自评或期待结论。子 Agent 不继承本对话历史，同 agentKey ≠ 同上下文，只显式传 continueDialogId 才有其历史；full 审查用新 dialog，定向 closure 才续原审。连续上下文按里程碑分阶段，不按分钟强切。
- **独立 review**：只有当列表所有其他合规候选均有当次不可用证据才派自身隔离实例。常规/局部改动 review 按 diff 复杂度，优先异家族 \`easy\`/\`normal\`，不为作者回避升档。
- 关键决策上下文不外包：亲读一级证据。
- **多线跟进**：维护已授权各线目标/阶段/未决项/下一动作；收到终态先读结果并验收，推进实现、已知失败修复与验证，不以建议替代执行。run done 不等于任务完成；stop/取消立即遵从。
startAgentRun / controlAgentRun 调用后自动切完整协议；只引用 loadSkill/项目实有规范。`;

// ── 完整协议专属细节：仅 dispatchIntent=true 时注入（最小档走上面的 CORE）──
const AGENT_DELEGATE_FIRST_DETAIL = `
**增量上下文交接**：${AGENT_INCREMENTAL_HANDOFF}
**多线任务跟进**：用上下文或已有 checkpoint 维护当前对话内已授权任务的目标、阶段、未决项与下一动作，不建新 todo 系统。收到终态先读结果并验收；下一块已授权且无新增授权需求则同轮继续派发，不只报完成等催促。实现、已知失败修复与验证须推进，不以建议替代执行。话题切换不取消既有任务；仅全部验收完成或明确等待用户测试/权限/决定/真实阻塞时阶段收工，说明卡点及解除动作。区分实现/验证/合入/生效，后台 run done 不等于任务完成；禁止轮询，无唤醒能力须说明且不承诺无人值守。用户要求 stop/取消立即遵从；提交、push、部署仍过原授权门。目标范围控制见下文「确认边界」。
- **按难度与领域分工**：简单任务直接做；开放式创作、复杂取舍、重大决策按认知杠杆派发。
- **同一规划定人选与并发**：先读必要材料、按「可独立验收」拆块，在同一规划里逐块确定难度、领域、实际 agentKey、依赖与验收，再按依赖并发派发，最后按版本验收；执行按任务难度与领域匹配。无合适外部执行者时自行执行，不制造无收益的自身派发。执行/定位/测试/机械修改块须单一领域（有验收命令与可独立验收的产出）。需要连续上下文的任务（架构设计、长篇写作、整体审美/叙事一致性）按里程碑分阶段，由同一执行者承接（终态 continuation 或共享文档/检查点交接），仅证据搜集、机械执行与独立审查旁路派发，不按分钟强切。每块按「选人」派发；并发/凭证约束见下文「派发通道」。
${AGENT_RECURSIVE_DECOMPOSITION}
- **跨档写具体 selectionReason**：所选 agentKey 档位与任务真实 difficulty 不一致时须写具体理由（用户指定/领域优势/真实通道失败/无合适候选等），缺理由不得静默启动；保留真实难度，不改写 difficulty 去迁就现成通道。只校验理由存在、不伪称已核实事实，不须先制造低档失败；更稳妥、更安全、独立 review 都不是升档的充分理由。模型档位 unknown 不拦截。
- **候选池结论必须来自全量扫描**：任何「无可用候选 / 通道耗尽 / 只能派自身或顶档」的判断，都要先做一次**不带 query 过滤**的 listAgents（默认 scope="all"，showUnavailable:true 已无效果，冷却仅作参考、不作派发 gate），覆盖全部候选后再下结论；某一档/某通道不可用时，先在同一档内看其它 credentialGroup，再考虑升档。按名字或通道过滤的查询只返回子集，不能当作「池子空了」的证据——只查过部分候选就宣布耗尽，是把「我没看到」当成「不存在」；可用性结论只对当次有效，下一次派发重新扫描。
- **独立 review**：优先使用其他合规且可用的 Agent（覆盖全部候选）；**只有当列表所有其他合规候选均不可用（须当次错误证据）时，才允许派自身隔离实例做 review**，作者回避与通道证据细则见下文「reviewer 选人」；严禁在仍有其他可用 Agent 时图方便直接自审。
- **关键决策上下文不外包**：涉及架构、计费、安全、权限、数据完整性、不可逆迁移、长期产品语义时，编排者必须亲自读取足以决策的一级代码、正式真值、原始日志和真实数据证据；子 Agent 可做定位、机械收集、独立复核与反方审查，但其摘要不能替代关键上下文亲读。`;

const AGENT_DELEGATE_FIRST_DEFAULT = `${AGENT_EXECUTION_OWNERSHIP}
${AGENT_VERSION_BOUND_ACCEPTANCE}` + AGENT_DELEGATE_FIRST_DETAIL;

const AGENT_COLLABORATION_FULL_PROTOCOL = `**执行与上下文隔离**：
- 重复验证循环、大输出处理与机械 inventory/证据定位交给子 Agent；父 Agent 接收结构化证据，并亲自复核所有影响关键决策的原始证据。
- 按独立领域派发，不按文件数或模型价格决定是否派发（价格档只决定派给谁）；实现与返工保留在执行者上下文。简单任务或用户明确要求亲自完成时自行执行；需分工而无合适可用候选时自做并说明，不把规划外包等同于更换主模型。

**短小快优先**：无依赖且无交集的独立块必须在同一轮 tool_call 中一次性并发派发，严禁向用户询问“先做哪个”或将其串行化；依赖线按序推进，只阻塞相关线。跨前端/后端/工具/测试等多个领域的功能一律先拆块，禁止把整个功能打包成一个 brief 交给单个 run 从头做到尾；需要连续上下文的设计/写作类按里程碑方式处理。按独立领域拆，不按文件数量拆；先固化共享接口契约，后续块按契约并发——块间共享接口不是不拆的理由，只决定先后顺序，没有「协调成本高所以整块派发」的例外。隔离（各建 worktree）与串行不是一回事：worktree 隔离只解决写冲突，不产生先后关系。按上方「增量上下文交接」组织 brief；子任务只带必要工作集，不转发无关历史与日志。父方保留集成与用户沟通；按上方验收规则核证，失败按基线归因，无执行证据按未验证处理。派给谁按下面「选人」。
- **选人入口**：统一按下文「优先级契约」执行，不另列选人步骤。全量扫描后的胜任候选按 credentialGroup 分摊；自身只作无其他可用且胜任候选时的兜底。成本/费用授权、作者回避、并行执行面与真实不可用证据边界照旧。

**派发通道**：
- 目标记录声明了 delegation.serverBase / runtimeServerBase → 自动路由，无需重复填；用户给出可访问 origin 时可传 serverBase 覆盖。勿臆造地址、勿把 localhost 当远端机器。
${AGENT_DISPATCH_MECHANICS}
要前台实时发言用 runStreamingAgent；后台等待/诊断细则见「多 Agent 编排」（有 startAgentRun/controlAgentRun 时同注入）。
- 多 Agent 协作不限于代码任务：游戏设计、电影策划、写作、运营、研究等异步分工场景同样适用。

**发散 / 会商（系统级决策机制）**：
- 发散模式（Divergent Mode）：创意探索/方案枚举/开放式多视角分析 → 并行派发各分支直接回答原问题，保留开放性与不同模型特色。
- 会商模式（Deliberation Mode）：复杂决策/方案论证/风险评估/冲突协调 → 首轮独立作答（初始判断+核心理由+最大风险；各 run 的 brief 互不含他人答案，防观点污染）→ 交叉复议（只回应实质分歧点，不重复全文辩论；能用测试/查证解决的分歧优先核验而非互辩）→ 按【1. 共识 2. 保留分歧 3. 下一步建议】收敛，不强行抹平合理分歧。
- 裁决纪律：不搞多数投票——相似模型共享错误，票数只作分歧信息；裁决看证据与可验证核验，默认读各方「结论+依据+反例+未决问题」摘要，全文留档备查。
- 停止条件：不设固定轮数，不设「首轮一致即跳过」目标——一致可能来自共享盲点。低风险任务首轮一致且经核验可提前收；高风险任务即使一致也必须独立反证或外部核验。按质量条件与实际进展停止。
- 防谄媚：交叉轮隐藏参与者身份（不隐藏证据来源），发言顺序随机化；多 agent 增加的是发现错误的机会，不是正确性担保，不能替代测试与实测。

**选人**：多个专长 Agent 优先按专长分工，只认 listAgents 记录；key、候选池兜底与并发规则见上文，执行收件人按下文「优先级契约」。
${AGENT_SELECTION_PRIORITY_INSTRUCTIONS}
   - reviewer 选人（先盘点、后挑选，不取列表第一个）：派 reviewer 前先把**全部**可用候选过一遍（含 user_subscription / owner_subscription / user_api / local）——订阅/免费通道 inputPrice 常为 0，但仍消耗旗舰额度。review 按本次 diff 的真实难度判档：不默认 normal、不默认高于执行档，也不固定「某模型写、另一模型审」；小改动或定向 closure 的文案复核按本次 diff 真实复杂度（常 easy/normal）选低档独立 reviewer，不为作者回避或收藏惯性升旗舰档。领域匹配、作者回避与当次可用性优先于档位。reviewer 专项规则优先于通用「没有合适候选」兜底：候选档为空时**不得**直接派自身——按通道排除硬门先在其他合规可用候选里挑选（含成本规则允许的换档，换档须在回复说明）；只有当**全部合规候选**都有当次失败/不可用证据（401/429/配额耗尽/无凭据）时，才允许派自身隔离实例并在回复出示证据来源。跨档可因领域优势、真实可用性、用户指定；通道失败只换候选、不升难度，也不要求先制造低档失败；跨档仍保留真实 difficulty 并写具体 selectionReason。某通道失败（401 凭据过期、429、余额不足、网关错误、卡死超时）后，回到这份盘点清单换**另一个**通道重派，不顺着列表滑到下一个更贵的档；有决策价值的差异才说明。
   - 通道排除：先按「优先级契约」的领域匹配筛选，再在胜任候选中排除「本次改动作者」与「有当次错误证据的坏通道」（按基础可用性证据区分；review 自身兜底只认当次尝试中的配额耗尽/余额不足/限流等错误，不以有效 quota 或冷却标注代替）。家族多样性只是最后一层偏好：在已通过领域胜任、作者回避、当次可用性、候选优先级分组、上面的 reviewer 成本档规则、收藏硬门与平台积分授权门的候选中，优先选与执行者不同模型家族的 reviewer（同家族模型容易共享同类错误），它不使任何高复杂度档或平台候选获得资格，并排在 reset-aware economics 之后；没有异家族合规候选时仍按上面规则选同家族的独立实例；**只有当列表所有其他合规候选均不可用（须有当次错误证据）时，才允许派自身的隔离实例作为最后保底，严禁在仍有其他可用 Agent 时图省事派自身**。自身另一实例也可 review（上下文隔离即合规，flash 档成本可忽略）。不凭名字编造能力，不索取 prompt/密钥/数据库 key；派发前跳过已知坏通道（配置缺失/区域限制/网关 400）。

**Tool call 参数体量纪律**：tool_call（尤其 startAgentRun 的 task/brief 与 input）不内嵌 diff、日志、长文档或测试输出，只传路径（worktree + 文件清单 + 精确改动行号区间），执行方自行 git diff / 按区间读文件，减少全文翻找往返。单次 arguments 控制在 ~5k 字符内，避免上游截断为非法 JSON、触发 tool-error 整轮重发。`;

// ── 安全硬门（常在，不随派发意图裁剪）──────────────────────────────────────
const AGENT_COMMIT_REVIEW_GATE = `**commit 前硬门（阶段划分与独立审查）**：
- **阶段区分**：区分「实现/构建/安装/用户测试/反馈迭代」与「准备提交/合并」。需验收先交付真实可测试产物，等待用户测试与反馈；真实验收依赖 review、提交或测试部署时，在已有授权内先推进，不扩大权限，也不等于用户验收。安全关键审查与 commit 前独立 review 硬门不变。
- **最终审查时机**：默认须用户确认准备提交/合并才最终 review；显式启用 auto-review 且任务在作用域内，持续授权 review、修复、提交、本地集成；未启用不自动授权。stop/暂停/单次覆盖优先；验收通过且授权适用则继续，无需确认；push、main/production 合并、发布、回滚仍独立授权。
- **独立 reviewer**：无 review 不 commit（≤2 步零逻辑风险机械改动除外）。依授权派 reviewer 审 diff（非作者、不同实例）；BLOCK 必修，WARNING 报用户。仅 APPROVE 且无 CRITICAL/HIGH 才提交；APPROVE 只覆盖被审的那一版，任何改动须复审。review 不锁实现。
- **review 证据硬门**：新协议程序核验版本、completed、findings（无 CRITICAL/HIGH）；旧协议须 reviewer 可读最终文本明确含 APPROVE 且无 CRITICAL/HIGH 才通过。done、exit 0、空 dialog、messagesCount=0、agentReply=null、超时均不算审查。审查契约（review context contract）：派审前读项目指令（AGENTS.md 类）、计划、命中 skill/references、完整 diff；查可读性/可搜索性、可维护性、可组合性、重复实现。trailer 须 Reviewed-by: <非空署名> + Review: 结论（APPROVE / Approved / WARNING）；禁 [no-review: …]，No-Review: <原因> 仅 owner 豁免（NO_REVIEW_OWNER_EMAILS，agent 不适用）。受阻如实报告；仓库写入依常驻 worktree 隔离规程。`;

const AGENT_CONFIRM_BOUNDARY = `--- 确认边界 ---
- 不可逆、有外部后果或高成本动作须先预览确认（删数据、生产库写/停服、外发/发布、交易/付费、main/生产回滚、大重构/长运行/高 token）；预览/待确认即停。已授权可逆改文件、写文档、只读排查与隔离验证直接执行。
- 子对话禁止再创建孙对话；向父对话交结果。
- **目标范围控制**：不得自行缩成文案/手动退路称完成；报实证限制、差距与替代。缩减用户可见能力需明确确认；同范围技术细节不需问，已授权不变范围继续推进。新增前置须有阻断证据。
- **合并与部署确认**：在一次合并范围选择中明确远端目标与可能部署；已明确批准同一后果不重复询问，保留所有安全闸门。`;

const AGENT_COLLABORATION_MIN_DISPATCH = `--- 多 Agent 派发（最小协议） ---
${AGENT_DISPATCH_MECHANICS}
- 参数见 startAgentRun。`;

/**
 * commit 前独立审查硬门缺省注入。
 *
 * 只有环境变量 NOLO_DISABLE_COMMIT_REVIEW_GATE=1 能关它，且仅用于应急
 * （门禁自身故障、自举修复导致无法提交时）。此前还有一个 `enableCommitReviewGate`
 * 选项，但生产代码零调用方（只有测试传参），属假旋钮，已删除。
 * 若将来要按 agent / skill 配置驱动，不要复活这个选项——应先把 `agent.skills`
 * 铺到四个装配点（见 docs/product/skill-model.md §3）。
 */
function isCommitReviewGateEnabled(): boolean {
    if (typeof process !== "undefined" && process.env?.NOLO_DISABLE_COMMIT_REVIEW_GATE === "1") {
        return false;
    }
    return true;
}

const AGENT_SUBTASK_COLLABORATION_HEADER = `--- 子任务执行与交付约束 ---
${AGENT_EXECUTION_OWNERSHIP}
**熔断升级（need_escalation）**：发现根因超出 brief 预设范围，或同一问题连续修复 2 次仍未收敛时，立刻停手，不再打补丁硬扛；在最终交付返回 need_escalation，列明已验证事实（附证据引用：文件:行、命令输出、run/dialog）、失败尝试与具体卡点，由父 Agent 决定换更高档执行者或换路。与 brief 同范围的必要推进照做，不以熔断规避本可完成的工作。`;

// ── 单模型多实例精简模式（externalAgentCount === 0 且非 subtask 时替换 min/full）──
// 没有任何外部 Agent 可派时，多模型选人契约、能力档映射、配额分组与跨模型比较
// 都是死重量（纯 token 成本，零可执行收益）：单模型下没有"选谁"这个问题。
// 换来的那份节省用来换"多实例"：同一 agent 的独立实例隔离上下文、并行提速，
// 但恢复能力有限，因此 commit 前 review 硬门与安全/确认边界逐字保留。
const AGENT_SINGLE_MODEL_MULTI_INSTANCE = `--- 单模型多实例模式（无外部可派 Agent） ---
当次扫描确认没有外部 Agent 可派：不存在跨模型选人、档位映射与配额分组问题，不要再花预算比较模型。用同一 agent 的独立实例换取上下文隔离与并行，但不得用它冒充能力升档：
- **主实例守住判断**：Plan、关键代码亲读与最终验收留在主实例，不外包决策依据。
- **可并发派 \`self\` 独立实例**：多模块/多文件只读摸底、大输出统计、机械实现与小改动复核按依赖并发派发（隔离上下文、并行提速），brief 仍传路径与改动行号区间，不内嵌 diff/日志。
- **提交前独立 review**：派 \`self\` 的全新空白上下文实例审工作区 diff（不得作者自评、不得复用已读过该 diff 的上下文），APPROVE 且无 CRITICAL/HIGH 才提交。`;

// ── 主 Agent 强弱姿态（callerModel 显式传入且非 subtask、非精简模式）─────────
// 强档主 Agent 的失败模式是"顺手把体力活自己包了"；轻档主 Agent 的失败模式是
// "定不了根因还硬扛规划"。两者各给一句纠偏，长度压在 1 句以内，避免抬 token。
const AGENT_CALLER_POSTURE_STRONG = `**强主 Agent 姿态**：守需求、契约与高风险亲读及验收；>3 轮盲搜、≥2 文件实现测试与常规初审卸低档（\`tierHints.easy\`/\`normal\`）；仅单文件 ≤30 行小改自做。`;
const AGENT_CALLER_POSTURE_LIGHT = `**轻主 Agent 姿态**：禁自定复杂方案；跨 ≥2 模块、改接口/schema、涉安全计费或 2 轮未定根因即只读请教高档，契约明确后自闭环。`;
// 池顶轻档：池内已无更高免付费档时，轻姿态里那句「向上请教高档」是空指
// （唯一更高的档位要么需要付费授权、要么根本不存在），照发只会换来无谓的
// 请示与等待。保留「不自己乱定复杂方案、按需拆实例复核」的纠偏，砍掉空指针。
const AGENT_CALLER_POSTURE_POOL_TOP_LIGHT = `**池顶执行姿态**：池内无更高免付费档；常规任务直接闭环、按需拆独立实例隔离复核，不可逆或高危取舍交用户拍板，不空找高档。`;

/**
 * 由主 Agent 模型推导强弱姿态；
 * 未传 / 非字符串 / 推不出档位（unknown）一律返回空串 —— 零追加文本。
 * callerIsPoolTop 仅对轻档生效：true 时换成池顶轻姿态，undefined/false 逐字不变。
 */
function resolveCallerPosture(
    callerModel: string | null | undefined,
    callerIsPoolTop?: boolean,
): string {
    if (typeof callerModel !== "string") return "";
    const tier = resolveModelTier(callerModel);
    if (tier === "extreme" || tier === "complex") return AGENT_CALLER_POSTURE_STRONG;
    if (tier === "normal" || tier === "easy") {
        return callerIsPoolTop === true
            ? AGENT_CALLER_POSTURE_POOL_TOP_LIGHT
            : AGENT_CALLER_POSTURE_LIGHT;
    }
    return "";
}

function buildAgentCollaborationInstructions(opts?: ToolGuidedSectionsOptions): string {
    const gateEnabled = isCommitReviewGateEnabled();
    if (opts?.runKind === "subtask") {
        return [
            AGENT_SUBTASK_COLLABORATION_HEADER,
            AGENT_VERSION_BOUND_ACCEPTANCE,
            AGENT_PLATFORM_CREDITS_GATE,
            ...(gateEnabled ? [AGENT_COMMIT_REVIEW_GATE] : []),
            AGENT_CONFIRM_BOUNDARY,
        ].join("\n\n");
    }
    // 只在显式 0 时进精简模式；undefined / > 0 不改既有 min/full 任何字节。
    const singleModelCompact = opts?.externalAgentCount === 0;
    if (singleModelCompact) {
        return [
            AGENT_SINGLE_MODEL_MULTI_INSTANCE,
            AGENT_DISPATCH_MECHANICS,
            AGENT_PLATFORM_CREDITS_GATE,
            AGENT_DISPATCH_PRECHECK,
            ...(gateEnabled ? [AGENT_COMMIT_REVIEW_GATE] : []),
            AGENT_CONFIRM_BOUNDARY,
        ].join("\n\n");
    }
    const posture = resolveCallerPosture(opts?.callerModel, opts?.callerIsPoolTop);
    const isFull = opts?.dispatchIntent === true;
    const sections = isFull
        ? [
            AGENT_COLLABORATION_VALUE_AND_METHOD,
            AGENT_DELEGATE_FIRST_DEFAULT,
            AGENT_PLATFORM_CREDITS_GATE,
            AGENT_DISPATCH_PRECHECK,
            AGENT_COLLABORATION_FULL_PROTOCOL,
            ...(gateEnabled ? [AGENT_COMMIT_REVIEW_GATE] : []),
            AGENT_CONFIRM_BOUNDARY,
        ]
        : [
            AGENT_COLLABORATION_MIN_DISPATCH,
            AGENT_DELEGATE_FIRST_CORE,
            AGENT_PLATFORM_CREDITS_GATE,
            AGENT_DISPATCH_PRECHECK,
            ...(gateEnabled ? [AGENT_COMMIT_REVIEW_GATE] : []),
            AGENT_CONFIRM_BOUNDARY,
        ];
    if (posture) sections.push(posture);
    return sections.join("\n\n");
}

// 导出常量供测试与兼容既有快照比对使用
const AGENT_COLLABORATION_INSTRUCTIONS = buildAgentCollaborationInstructions({ dispatchIntent: true });
const AGENT_COLLABORATION_MIN_INSTRUCTIONS = buildAgentCollaborationInstructions({ dispatchIntent: false });

// ============================================================================
// 交互说明（有 ask_user 工具时注入）
// 单一真值来源在 agent-runtime/menuUsage；desktop/CLI 的 localLoop 也引用同一份。
// ============================================================================

// ============================================================================
// 对话内交互（有 show_interaction 工具时注入）
// ============================================================================

const CONVERSATION_INTERACTION_INSTRUCTIONS = `--- 对话内交互（show_interaction） ---
“展示结构化内容 + 让用户选择”同时出现时用 show_interaction，内容与选项在同一块呈现且提交后原位只读。选择非阻塞，以新消息回传，不要用它代替 ask_user 等待回答；纯提问等待回答请用 ask_user，纯展示用 Markdown，持久工具用 App。`;

// ============================================================================
// 网页访问（有 exa_search 工具时注入）
// ============================================================================

const WEBPAGE_ACCESS_INSTRUCTIONS = `--- 网页访问能力 (Web Access) ---
已给 URL 先直接 fetchWebpage，不先搜索或猜网址（失败/缺字段才搜索并说明）；无 URL 先 exa_search 找权威入口。登录/填表/多步用 browser_openSession，结构化站点用 Scraper；不要用 execShell 调 curl 等抓网页。`;

// ============================================================================
// 本地文件整理（有 local desktop file tools 时注入）
// ============================================================================


// ============================================================================
// 知识管理（有 createDoc / updateDoc / read 工具时注入）
// 仅包含页面级知识管理，不含自我更新能力
// ============================================================================

const KNOWLEDGE_MANAGEMENT_INSTRUCTIONS = `--- 知识管理 ---
- references 自动注入；page 内 @mention 是指针（只展开元信息），取内容须 read({ dbKey })：prompt/references 有 → 直接用；没有 → read 索引页再 read 细分页。
- 沉淀遵循「知识存储约定」（偏好→memory、项目真值→repo 文档、运行时保障→代码+test，不一律 createDoc 或 updateAgent）。仅跨 dialog 共读的平台知识且有 createDoc 时创建，索引缺入口用 updateDoc 补 @mention；无工具严禁声称生效，不写一次性内容。`;

// ============================================================================
// 长期记忆（有 rememberMemory 工具时注入）
// scope 分层 / kind=procedural / 置信度三档 / 删除边界等细节以 rememberMemory 工具 schema 为准。
// ============================================================================

const MEMORY_CAPTURE_INSTRUCTIONS = `--- 长期记忆 ---
用 rememberMemory 记长期 episodic memory。拿不准是否值得记时，优先记下可复用项，禁流水/进度/易过期态。
变化写最新表述；rememberMemory 是写入新记录，底层不保证自动识别、合并或替代同一事实的旧记录。召回注明来源/置信度/变更，禁止自行推理填补；冲突以当前输入为准。
物理删除仅在用户明确要求且在权限内，严禁模型擅自调用 deleteMemory 作为版本维护或清理手段。`;

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
    build: (agentTools: string[], opts?: ToolGuidedSectionsOptions) => string;
};

/** resolveToolGuidedSections 的可选项。 */
export type ToolGuidedSectionsOptions = {
    /**
     * 本轮是否检测到派发意图（由调用方用 detectDispatchIntent 判定）。
     * true → 注入完整多 Agent 编排协议；缺省/false → 只注入最小派发协议
     * （安全硬门逐字常在，不受影响）。
     */
    dispatchIntent?: boolean;
    /**
     * 运行类型：subtask（叶节点，禁止再派发孙对话）时裁剪冗长选人/会商段，
     * 仅保留子任务执行交付、按版本验收与安全/commit 前 review 硬门。
     */
    runKind?: "interactive" | "subtask";
    /**
     * 主 Agent 当前模型（可选，文本 id 或 name 均可）。
     * 显式传入时用 resolveModelTier 推导主 Agent 强弱姿态，只追加一句短指引；
     * 缺省 / null / 推不出档位（unknown）→ 不追加任何文本，保持既有 token 与
     * 缓存前缀完全不变（向后兼容旧调用方）。
     */
    callerModel?: string | null;
    /**
     * 宿主当次扫描到的「外部可派 Agent」数量（可选）。
     * 仅当显式传入 0 且非 subtask 时进入「单模型多实例精简模式」：不注入多模型
     * 选人契约/档位映射/配额分组/跨模型比较，改为同一 agent 多独立实例的短指引。
     * undefined 或 > 0 一律维持既有 min / full 行为（缺省不改任何输出）。
     */
    externalAgentCount?: number;
    /**
     * 可选：宿主当次扫描确认「当前模型已是免付费池顶」（池内不存在档位更高且
     * 免付费的候选）。仅显式 true 时把轻档姿态换成池顶姿态，不再向轻主模型
     * 下发「向上请教高档」这个空指针；undefined / false 逐字保持既有 LIGHT 行为。
     */
    callerIsPoolTop?: boolean;
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
一次 tool 往返重发完整对话；独立调用同轮完成，可合则合。范围未明先窄搜定位再按段读，不做猜测性批量盲读。等待按预计耗时一次给足预算；有终态唤醒不另等。`;

// ============================================================================
// 权限提升（有 execShell 时注入）
// 背景：需要 root 的命令失败时，模型历史上只会把 sudo 命令抛回给用户手抄
// （2026-09-13 OOM 事故处理实录：用户回复"懒得跑 pkexec"）。桌面会话里
// polkit/pkexec 能把密码框直接弹到用户屏幕上，交互成本接近于零。本段把
// 优先级写进行为规则：GUI 授权 → 用户级等价方案 → 粘贴式降级，禁止静默绕过。
// ============================================================================
const PRIVILEGE_ESCALATION_INSTRUCTIONS = `--- 权限提升 ---
权限失败先说明再弹窗：Linux 桌面（DISPLAY/WAYLAND_DISPLAY） \`pkexec\` 弹 GUI 密码框，复杂命令用 \`pkexec bash /tmp/xxx.sh\`；Windows 用 \`Start-Process -Verb RunAs\`，macOS 用 \`osascript ... with administrator privileges\`。
无 GUI 或 pkexec 不可用：用户级等价方案先行；确需 root 给一条注明副作用的可粘贴命令并等回报。不重试同一特权命令、不用管道/环境变量喂密码给 sudo、不改 polkit/sudoers 放宽授权。`;

/**
 * 只读 Chrome connector 工具（列页签、读 DOM、截图、读 console/network）：
 * 不改变页面状态，不触发风控纪律。注意新增工具默认**不在此表**——
 * 触发集合由 `CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES` 减去本表派生，
 * 未来新增的动作工具（滚动、关页签等）自动被覆盖，不会静默漏触发。
 */
const CHROME_CONNECTOR_READONLY_TOOLS = [
    "browser_list_tabs",
    "browser_read_page",
    "browser_screenshot",
    "browser_read_console",
    "browser_read_network",
    "chrome_list_tabs",
    "chrome_read_page",
    "chrome_screenshot",
    "chrome_read_console",
    "chrome_read_network",
];

/**
 * 触发「平台风控纪律」完整版的浏览器自动化 / 社媒读取工具。
 *
 * Chrome connector 部分从 `CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES`（canonical + legacy
 * 唯一真源）派生后剔除只读项：历史上手抄清单漏过 `browser_scroll` / `*_close_tab`，
 * deltaY 滚动与关页签同样改变页面状态却失去停手机制。
 */
const PLATFORM_RISK_CONTROL_TRIGGER_TOOLS = [
    // Playwright 会话工具
    "browser_openSession",
    "browser_probePage",
    "browser_typeText",
    "browser_click",
    "browser_selectOption",
    // Chrome connector：全部改变页面状态的工具（canonical + legacy）
    ...CHROME_CONNECTOR_ACCEPTED_TOOL_NAMES.filter(
        (name) => !CHROME_CONNECTOR_READONLY_TOOLS.includes(name),
    ),
    // 社媒读取（真实站点、可能弹人机校验）
    "read_x_post",
    "read_xhs_profile",
];

const TOOL_GUIDED_SECTIONS: ToolGuidedSection[] = [
    {
        id: "toolRoundEconomy",
        triggerTools: [],
        triggerAnyTool: true,
        build: () => TOOL_ROUND_ECONOMY_INSTRUCTIONS,
    },
    {
        id: "toolUseGuidance",
        triggerTools: ["execShell"],
        build: () => TOOL_USE_GUIDANCE,
    },
    {
        id: "privilegeEscalation",
        triggerTools: ["execShell"],
        build: () => PRIVILEGE_ESCALATION_INSTRUCTIONS,
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
        // 按需注入：完整编排协议仅在有派发意图时给；无派发意图给最小协议
        // （派发机制 + 安全硬门常在：平台积分授权门 / commit review 硬门）。
        build: (_tools, opts) => buildAgentCollaborationInstructions(opts),
    },
    {
        id: "platformRiskControl",
        // 双档按需注入：
        // ① 挂载浏览器/社媒自动化工具 → 完整版 PLATFORM_RISK_CONTROL_RULE；
        // ② 只挂 execShell（默认 CLI 就属于这档）→ 紧凑版 SHELL_BROWSER_RISK_CONTROL_RULE。
        //    必须覆盖这一档：shell 里跑 `nolo browser` / Playwright 同样操作真实浏览器
        //    （.agents/skills/browser-probe/SKILL.md 就是这条路），只按 browser_* 门控
        //    会让 shell 路径整体失去扫码/滑块停手与不可逆动作交用户的约束。
        // ③ 两者皆无（exa_search / fetchWebpage / readFile / browser_readContent）→ 不触发。
        triggerTools: [...PLATFORM_RISK_CONTROL_TRIGGER_TOOLS, "execShell"],
        build: (tools) => {
            if (PLATFORM_RISK_CONTROL_TRIGGER_TOOLS.some((t) => tools.includes(t))) {
                return PLATFORM_RISK_CONTROL_RULE;
            }
            return tools.includes("execShell") ? SHELL_BROWSER_RISK_CONTROL_RULE : "";
        },
    },
    { id: "menuUsage", triggerTools: ["ask_user"], build: () => MENU_USAGE_INSTRUCTIONS },
    {
        id: "showInteraction",
        triggerTools: ["show_interaction"],
        build: () => CONVERSATION_INTERACTION_INSTRUCTIONS,
    },
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
    "toolUseGuidance",
    "privilegeEscalation",
    "agentOrchestration",
    "agentCollaboration",
    "webAccess",
    "platformRiskControl",
    "menuUsage",
    "showInteraction",
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
export function resolveToolGuidedSections(
    agentTools: string[],
    opts?: ToolGuidedSectionsOptions,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const section of TOOL_GUIDED_SECTIONS) {
        const triggered = section.triggerAnyTool
            ? agentTools.length > 0
            : section.triggerTools.some((t) => agentTools.includes(t));
        if (triggered) {
            out[section.id] = section.build(agentTools, opts);
        } else {
            out[section.id] = "";
        }
    }
    return out;
}
