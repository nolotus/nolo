/**
 * 工具驱动指令表：按 agent 工具集条件注入的指令块（多 Agent 编排/协作 review
 * 硬门、menuUsage、网页访问、知识管理、记忆捕获、自我更新等）。
 *
 * 独立成模块是因为 agent-runtime 的本地运行时（localLoop）必须复用同一张表，
 * 而 buildSystemPrompt 依赖 app/* 渲染层——"agent-runtime 永不 import renderer"
 * 是仓库层级规则。本模块只依赖 agent-runtime/menuUsage，可安全被两个包共用。
 */
import { MENU_USAGE_INSTRUCTIONS } from "agent-runtime/menuUsage";
import { TOOL_USE_GUIDANCE } from "agent-runtime/toolUseGuidance";
import { AGENT_SELECTION_PRIORITY_INSTRUCTIONS } from "./agentSelectionPriority";

// ============================================================================
// 多 Agent 编排 - 后台 Run（有 startAgentRun / controlAgentRun 工具时注入）
// startAgentRun 是统一派发通道：异步（fork+exec，后台 run 编排）。
// 纪律提炼自 .agents/skills/agent-orchestration/SKILL.md，
// 属于"启用 agent-orchestration 能力包必须遵守的行为规则"。
// 选人优先级契约由「多 Agent 协作」段唯一承载，本段只保留派发之后的盯梢与排错。
// ============================================================================
const AGENT_ORCHESTRATION_RUN_INSTRUCTIONS = `--- 多 Agent 编排（后台 Run） ---
用 startAgentRun 启动子 Agent（异步 fork+exec 返回 runId），用 controlAgentRun 控制/诊断。何时派发见「多 Agent 协作」段；本段只讲派发之后的盯梢与排错。

1. 盯梢：**异步派发后先推进独立已授权工作，只有无可推进工作才结束等待终态。** 承诺「会通知」前，确认任务失败也能终态唤醒（tracked background、有界超时、失败即退出）。发布等待仅用 \`scripts/ci/pushAndAwaitLive.ts\`，不手写 push+轮询。等待三选一：① 有 controlAgentRun wait action：仅预计 <100s 且马上要用结果，或用户要求同步时阻塞至终态；② 无 wait、宿主有 terminal wake：无工作可推进时结束本轮，终态自动接回；③ 两者皆无：同样结束本轮，告知 run 在后台、需手动查询。agent run 禁止轮询。execShell sleep 不是等待手段：命令以 \`sleep N\` 开头且 N>5s 会立即 detach（\`IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS\`）；其它命令超过 \`NOLO_EXEC_SHELL_DETACH_MS\`（默认 120s）才 detach；两者都会产生无效完成通知。外部系统用带具体探测退出条件的有限轮询或专用 wait 脚本。
2. 禁止轮询/空转/复述 status；按工具描述使用。status 仅诊断卡死、failed 详情/日志或回答执行细节（tailLines:0 仅摘要），不是 stop 前置检查。并行与串行纪律（只有真实依赖才串行、禁止的串行借口）由系统固定块「并行是默认 · 派发纪律」（agent-runtime/parallelDispatchDefault.ts，四条装配线无条件注入）承载，本段不复制。
3. 排错：agentKey 未照抄 listAgents 先修正，不算通道故障；not found / invalid ref / Local agent config not found 先 readAgent 复核，不据此判凭证缺失或通道全挂。仅已验证 key 仍失败且错误明确指向通道（429、鉴权失败、machine offline）才记通道故障。判定整体不可用须 ≥2 个不同候选各以已验证 key 真实派发且失败；候选不足则报告「仅此候选且通道失败」。**orphaned 或进程立即退出（0 tool calls）先查 logTail 的 stderr**，排除语法、依赖、构建崩溃；CLI 启动失败时请求未发出，勿盲目重派。
4. 仅 status=failed、超时或 progress 久无变化（疑似卡死）才取 tailLines:30。**终态必读 status.resultFile 全文（readFile）**，不可用带 ANSI 的 .log 或 2000 字 lastAssistantText 替代；resultFile 缺失一律按「无结论」处理，不算工具故障，不推断用户中断，也不回读日志。append、stop 直接调用；not found、已终态、运行中入队等由 executor/控制平面处理，stop 对已终态原样返回且不覆盖。
5. 派发用 \`startAgentRun\` / \`controlAgentRun\`；不要用 \`execShell\` 调 \`nolo agent run\`，这会绕过运行面板与终态回收。指定目录使用 \`startAgentRun\` 的 \`cwd\` 参数，须为绝对路径且已存在。
6. 用 \`continueDialogId\` 续跑时显式传原 dialog 的 \`primaryAgentKey\`；省略 \`agentKey\` 会回落当前编排者而非沿用原 agent，丢失 prompt 缓存及结论风格。closure/定向闭合优先沿用原 agent，不必重扫候选池；仅原 agent 不可用、配额耗尽等确需换模型时改传新 key，并在 task 说明理由。`;

// ============================================================================
// 多 Agent 协作 - 计划/派发/审查 方法论纪律（命中编排工具时注入）
// 通用方法论（任何 TUI 项目适用），不含项目特有规则（提交规范/部署边界等在
// 项目自己的 skill 里）。原则：默认提供，agent 无编排工具则不注入。
// 仓库级 plan / review / worktree 细节以 AGENTS.md 为准，这里只留指针与平台独有纪律。
// ============================================================================
const AGENT_COLLABORATION_VALUE_AND_METHOD = `--- Agent 编排与协作（多 Agent 协作：读取 → 规划 → 派发 → 审查） ---
产出优先：不为「凑数量」派发，不包办可并行领域；按证据推进。

**派发价值（用于拆分与选人）**：
- 不为“看起来像多 Agent”而派发。默认派发执行，不派无收益的重复任务。
- 按三种杠杆拆分与选人：
  1. **上下文杠杆（Context leverage）**：隔离机械 inventory、大输出、验证循环与证据搜集，保护主上下文。
  2. **并行杠杆（Parallel leverage）**：独立工作流同时推进，缩短总耗时。
  3. **认知杠杆（Cognitive leverage）**：独立视角、反方审查、创意分支、领域专家或不同模型改善方案、发现盲区；适用于产品、设计、研究、写作、战略与复杂决策。
- **反约束**：额外调研/会商若只复述已知信息、没有独立证据/视角/并行收益，就不派。
- **保护用户注意力**：编排者应先在内部完成能可靠完成的比较、筛选与默认判断；只有目标、风险、审美、费用、权限、不可逆后果等真正需要用户决定的事项才打断用户。不要把“请选择 A/B/C”当作已经完成规划；有足够依据时先给推荐与理由，并说明何种条件下应改选。`;

// ── 安全硬门（常在，不随派发意图裁剪；最小协议与完整协议共用同一常量）──────
const AGENT_PLATFORM_CREDITS_GATE = `**平台 Agent / 平台积分扣费确认硬闸门（必须先确认，后调用）**：
- 只要候选 Agent 的 apiSource 为 platform，或无法确认调用是否消耗平台积分/额度，就必须把它视为可能扣费的高成本调用。
- **仅告知用户“会消耗平台积分”不等于获得授权。** 调用 startAgentRun 前，必须先向用户说明：原优先通道为何不可用、候选平台 Agent、预计扣费/积分影响，并停下来等待用户当次明确肯定授权。
- 用户说“继续”“按计划”“你处理”“可以”等，默认只表示继续任务，不表示同意新增费用或平台积分扣除；必须明确包含“同意使用平台 Agent/接受扣平台积分/同意这次扣费”等意思，才能视为授权。
- 没有明确授权时，禁止调用平台 Agent，禁止以异步、同步、并行、自动 fallback、换另一个平台 Agent 或重试的方式绕过确认。
- 用户拒绝平台扣费后，停止所有平台 Agent 尝试；只能等待私有 Agent 恢复、使用可用的非平台 Agent，或再次向用户说明并重新请求明确授权。
- 授权是一次性的，仅覆盖用户明确批准的 Agent、子任务和本次调用，不得扩展到后续 review、后续组件或其他 Agent。`;

const AGENT_DISPATCH_PRECHECK = `**派发前自检**：每次调用 startAgentRun 前，先核对 agentKey 的 apiSource、收藏/私有状态、占用状态（仅当工具/通道明确返回该候选不可用，或项目明确规定存在同一 Agent 的资源锁时成立）和当前授权；无法确认扣费状态时按可能扣费处理，先询问，不得猜测。`;

// ── 完整编排协议（仅检测到派发意图时注入；见 dispatchIntent.ts）─────────────
const AGENT_DELEGATE_FIRST_CORE = `**默认流程：读取 → 规划 → 派发执行**：编排者先亲读足以决策的一级材料，产出计划，再派子 Agent 实现与验证。
- **自己做仅限**：纯问答/咨询；或零逻辑风险的极小改动（≤2 处编辑、无需验证循环）。开放式创作、复杂取舍、重大决策有独立视角价值时仍按认知杠杆派发。
- **可拆分就拆，选人与并发另判**：按「可独立验收」的边界拆块（粒度见完整协议）；拆分不取决于有几个 Agent——只有自身可用时也照拆、逐块派给自身（省略 agentKey 或传 'self'），但「只有自身可用」必须做一次**不带 query 过滤的全量 listAgents 扫描确认**（**候选池结论必须来自全量扫描**）——自身是**兜底**不是默认，只查过子集不得宣布「池子空了」，按名字/通道过滤的子集不能当作「池子空了」的证据——只查过部分候选就宣布耗尽，是把「我没看到」当成「不存在」；可用性结论只对当次有效，下一次派发重新扫描。并发、凭证与落点按「并行是默认 · 派发纪律」「派发落点」「派发选人」三块执行：每块按「选人」派发，无依赖时并发派发，多个合适候选时按 credentialGroup 分散派发。
- **交接传结论与证据路径**：上下文最小化是去掉无关材料，不是丢弃已有有效判断。brief 传已确认事实及证据路径、已选方向与关键理由、未验证假设及未决问题；不传完整思考过程、聊天与日志。执行者不把父方假设当事实；独立 review/会商保持独立判断；父方仍复核关键原始证据并验收。需要连续上下文的任务（架构设计、长篇写作、整体审美/叙事一致性）按里程碑分阶段，不按分钟强切。
- **独立 review 优先序**：优先派其他合规且可用的 Agent；只有当列表所有其他合规候选均不可用（须当次错误证据）时才派自身隔离实例，严禁图方便直接自审——硬门见下文「提交前独立审查」段。
- **关键决策上下文不外包**：架构、计费、安全、权限、数据完整性、不可逆迁移、长期产品语义必须由编排者亲读一级代码 / 正式真值 / 原始日志与真实数据证据；子 Agent 摘要不能替代亲读。
- **多线跟进**：用上下文或已有 checkpoint 维护当前对话内已授权任务的目标、阶段、未决项与下一动作（不建新 todo 系统）；收到终态先读结果并验收。实现、已知失败修复与验证都属可推进工作，不以建议替代执行。区分实现完成 / 验证完成 / 已合入 / 已生效，后台 run done 不等于任务完成；禁止轮询，无唤醒能力则如实说明；用户要求 stop/取消立即遵从；提交、push、部署仍过原授权门。**目标范围控制**见下文「确认边界」。
**完整编排协议入口**：本轮为最小协议（未检测到派发意图）。一旦计划含 ≥2 个可独立验收块、或决定调用 startAgentRun，先做三件事：① 按本核心与「并行」「落点」「选人」三块定拆块粒度、并发与选人；② 有项目指令（AGENTS.md 类）或 \`loadSkill\` 可列技能时，以其 plan / review 规范为补充依据，没有就不引用、禁止编造路径；③ review 按下文硬门与仓库自带闸门执行。历史出现 startAgentRun / controlAgentRun 调用后本线自动切完整协议全文，切档前不得假装已加载。`;

// ── 完整协议专属细节：仅 dispatchIntent=true 时注入（最小档走上面的 CORE）──
const AGENT_DELEGATE_FIRST_DETAIL = `
**增量上下文交接**：上下文最小化是去掉无关材料，不是丢弃已有有效判断。执行 brief 简洁交接已确认事实及证据路径、已选方向与关键理由、未验证假设及未决问题；执行者承接结论，聚焦实现/实验/未决项，遇反证、状态变化或必要正确性风险才重新核验，不把父方假设当事实。探索者复用已有实验与排除路径；独立 review/会商保持独立判断，不受继承结论约束。传结论和证据路径，不传完整思考过程、聊天或日志。父 Agent 仍复核关键原始证据并验收，不重演全部探索。
**多线任务跟进**：维护当前对话内已授权任务的目标、阶段、未决项与下一动作（用上下文或已有 checkpoint，不建新 todo 系统）。收到终态先读结果并验收；若下一块已获授权且无新增授权需求，同轮继续派发，不只报完成等待催促；实现、已知失败修复与验证都是可推进工作，不以建议替代执行。话题切换不取消既有授权任务；仅在全部验收完成，或明确等待用户测试/权限/决定/真实阻塞时阶段收工，并说明卡点及解除动作。区分实现完成、验证完成、已合入、已生效；后台 run done 不等于任务完成。禁止轮询；无唤醒能力则如实说明，不承诺无人值守。用户要求 stop/取消立即遵从；提交、push、部署仍须过原授权门。**目标范围控制**：发现原交付物不能实现，不得自行缩成文案/手动退路后宣称完成；陈述已证实限制、原目标差距、推荐替代及影响，缩减用户可见能力需明确确认；同范围技术细节不需问，已授权不变范围继续推进，防事事确认。
- **自己做仅限**：纯问答/咨询；或零逻辑风险的极小改动（≤2 处编辑、无需验证循环）。开放式创作、复杂取舍、重大决策有独立视角价值时仍按认知杠杆派发。
- **可拆分任务：拆分无条件，选人另判**：先按「可独立验收」的边界拆块再派发。拆分不取决于有几个 Agent：只有自身可用时也照拆，逐块派给自身（省略 agentKey 或传 'self'）——但须先经全量 listAgents 扫描确认，自身是**兜底**不是默认。执行/定位/测试/机械修改类块切成短小快的单一领域小块（约 ≤15 分钟 / ≤40 次工具调用、有验收命令），块间强依赖就串行派，不合并成一块；需要连续上下文的任务（架构设计、长篇写作、整体审美/叙事一致性）按里程碑分阶段，由同一执行者跨阶段承接（终态 continuation 或共享文档/检查点交接），只把证据搜集、机械执行与独立审查旁路派出，不按分钟强切。每块按「选人」派发；无依赖且凭证约束允许时并发。listAgents 有多个合适且可用的候选时，按 credentialGroup 分散派发；同一凭证默认允许并发（受服务端准入预算约束；注意上游 429 限流，必要时降低并发或换通道），未知凭证需串行或显式确认风险。
- **候选池结论必须来自全量扫描**：任何「无可用候选 / 通道耗尽 / 只能派自身或顶档」的判断，都要先做一次**不带 query 过滤**的 listAgents（默认 scope="all"，showUnavailable:true 已无效果，冷却仅作参考、不作派发 gate），覆盖全部候选后再下结论；某一档/某通道不可用时，先在同一档内看其它 credentialGroup，再考虑升档。按名字或通道过滤的查询只返回子集，不能当作「池子空了」的证据——只查过部分候选就宣布耗尽，是把「我没看到」当成「不存在」；可用性结论只对当次有效，下一次派发重新扫描。
- **独立 review**：优先使用其他合规且可用的 Agent（覆盖全部候选）；**只有当列表所有其他合规候选（已过领域筛选与作者回避）均不可用（须有当次错误证据，如 429、配额耗尽、无凭据）时，才允许派自身隔离实例做 review**；严禁在仍有其他可用 Agent 时图方便直接自审。选人硬门见下文「通道排除」。
- **关键决策上下文不外包**：涉及架构、计费、安全、权限、数据完整性、不可逆迁移、长期产品语义时，编排者必须亲自读取足以决策的一级代码、正式真值、原始日志和真实数据证据；子 Agent 可做定位、机械收集、独立复核与反方审查，但其摘要不能替代关键上下文亲读。`;

const AGENT_DELEGATE_FIRST_DEFAULT = `**默认流程：读取 → 规划 → 派发执行**：编排者先亲读足以决策的一级材料，产出计划，再派子 Agent 实现与验证。` + AGENT_DELEGATE_FIRST_DETAIL;

const AGENT_COLLABORATION_FULL_PROTOCOL = `**执行与上下文隔离**：
- 重复验证循环、大输出处理与机械 inventory/证据定位交给子 Agent；父 Agent 接收结构化证据，并亲自复核所有影响关键决策的原始证据。
- 按独立领域派发，不按文件数或模型价格决定是否派发（价格档只决定派给谁）；实现与返工保留在执行者上下文。用户明确要求亲自完成时按用户要求执行；仅当所有已验证派发通道均不可用（须有当次错误证据）才降级自做并说明。

**任务分型与收工预算（tool 调用即成本，预算先于勤奋）**：
- **探索/spike 型**（路径或报错未知、验证外部假设）：brief 必须写工具调用或时间预算（如 ≤150 次调用 / ≤20 分钟），到达预算立即收工，输出「已验证事实 / 卡点 / 下一步建议」中间报告。DoD 是结论而非跑通；编排者凭报告决定续跑、转向还是放弃，禁止单 run 无限迭代到跑通。
- **执行型**（路径已知的明确改动）：只有本身就在单块上限内（单一领域、≤15 分钟 / ≤40 次工具调用）才可单 run 完成（需要连续上下文的设计/写作类按「可拆分任务」的里程碑方式处理）；跨前端/后端/工具/测试等多个领域的功能一律先拆块，禁止把整个功能打包成一个 brief 交给单个 run 从头做到尾。diff 一成型立即派独立 review，不把 review 堆到全部完工后。
- **预算硬上限与执行约束**：明确认领调用/时间预算硬上限，提前预留收尾与报告调用；触限停止探索实现并交中间结论，续跑需父方决定；本 run 的预算清算不等于父目标终止。准确说明是 Agent 执行约束，不宣称 runtime 已强制截断，不新增控制面参数。
- **短小快优先**：派发前先在回复里列出拆块清单（每块：目标 / 改动文件 / 验收命令 / 依赖哪块 / 块类型 / 派给谁），再逐块派发；无依赖且无交集的独立块必须在同一轮 tool_call 中一次性并发派发，严禁向用户询问“先做哪个”或将其串行化；执行型任务拆成单一领域小块（单块约 ≤15 分钟 / ≤40 次工具调用、有明确验收命令）。共享接口按「拆分与 brief」先固化契约，后续块按契约并发。块间共享接口不是不拆的理由，只决定先后顺序；没有「协调成本高所以整块派发」的例外。派给谁按下面「选人」。
- **选人（通用默认，用户可覆盖）**：**候选池扫描是前置**——先做一次**不带 query 过滤**的 listAgents（默认 scope="all"，冷却仅作参考、不作派发 gate），把同档 cheap 档（flash / mini / lite / haiku 等）的其它可用 Agent 一并纳入候选，并按 credentialGroup 分散派发；机械盘点、文档扫描、检索、跑测试、证据收集这类块优先由这些同档 Agent 分摊。自身（省略 agentKey 或传 'self'）**只在扫描确认没有任何其它可用且胜任的候选时**才允许用，并在回复里写明候选池结论（有哪些候选、为何不可用）。**禁止不查候选池就默认派自身**；platform_credits 候选仍须先取得当次扣费授权。下列四步在扫描出的候选池上筛人：
  1. **领域胜任先行**：不同模型在代码/写作/设计审美/长上下文/科研等领域能力不同，不是单纯大小排序。当次用户点名 > 用户记忆中的分工/禁忌（如「X 做实现块」「Y 别碰 git」）> 本领域 qualityContext 证据与近期同类块失败证据；有明确不适配证据的候选直接排除，缺证据不等于弱。
  2. **能力档只是弱先验**：listAgents 的 \`tier\`（fast/balanced/top/unknown，按模型名推断）只在缺少领域证据时粗估「够不够」；\`tier=unknown\` 表示未知，不推断能力强弱，选它要在回复里说明依据。粗参考：机械改动/定位/跑测试/普通 review 低档通常够；单领域完整实现中档；架构/跨域设计、安全/计费/数据完整性、疑难排障、达标的深 review 需高档。成本规则独立成立：top 档不接简单活。
  3. **在胜任候选中排速度与成本**：限免费私有通道（billingSource 为 user_subscription / owner_subscription / user_api / local）；执行型块按 speedContext 本人 observed 数据选快者（收藏与速度先后沿用 speedContext 速度规则），速度不能把不胜任的候选排上来；没有可比 observed 样本时速度保持中性。platform_credits 不算候选，仍须先过平台积分授权门。
  4. 候选池扫描后仍没有合适候选才派自身；派自身、top 档或 unknown 档时在回复里一句话写明理由（领域证据、块类型，或低档的当次失败证据）。
- **长链型**（迁移 / 发布 / 多阶段任务）：拍平为「侦察 → 方案 → 执行 → 验证」扁平阶段，每阶段独立审查、以文档/检查点交接；执行与验证阶段各自独立 run，需要连续推理的方案阶段可由同一执行者承接；禁止一个 run 不经检查点从头扛到尾。

**派发通道**：
- 目标记录声明了 delegation.serverBase / runtimeServerBase → 自动路由，无需重复填；用户给出可访问 origin 时可传 serverBase 覆盖。勿臆造地址、勿把 localhost 当远端机器。
- startAgentRun 仅异步启动返回 runId，不表示完成；done/failed 后靠 terminal wake 继续父对话，读 child evidence 决定下一步。能不能同步等待看工具表（如 controlAgentRun 的 wait action，见「多 Agent 编排」段）；异步派发后先推进独立已授权工作，只有无可推进工作才结束等待终态。要前台实时发言用 runStreamingAgent。
- 多 Agent 协作不限于代码任务：游戏设计、电影策划、写作、运营、研究等异步分工场景同样适用。

**发散 / 会商（系统级决策机制）**：
- 发散模式（Divergent Mode）：创意探索/方案枚举/开放式多视角分析 → 并行派发各分支直接回答原问题，保留开放性与不同模型特色。
- 会商模式（Deliberation Mode）：复杂决策/方案论证/风险评估/冲突协调 → 首轮独立作答（初始判断+核心理由+最大风险；各 run 的 brief 互不含他人答案，防观点污染）→ 交叉复议（只回应实质分歧点，不重复全文辩论；能用测试/查证解决的分歧优先核验而非互辩）→ 按【1. 共识 2. 保留分歧 3. 下一步建议】收敛，不强行抹平合理分歧。
- 裁决纪律：不搞多数投票——相似模型共享错误，票数只作分歧信息；裁决看证据与可验证核验，默认读各方「结论+依据+反例+未决问题」摘要，全文留档备查。
- 停止条件：不设固定轮数，不设「首轮一致即跳过」目标——一致可能来自共享盲点。低风险任务首轮一致且经核验可提前收；高风险任务即使一致也必须独立反证或外部核验。按质量条件与预算停止。
- 防谄媚：交叉轮隐藏参与者身份（不隐藏证据来源），发言顺序随机化；多 agent 增加的是发现错误的机会，不是正确性担保，不能替代测试与实测。

**选人**：用户若有多个专长 Agent，优先按专长分工（只认 listAgents 返回的记录，agentKey 必须原样复制其字段，不拼接/不推断/不换格式/不传 name；not found 时重新 listAgents 取最新 key）；执行子任务的收件人见上文「选人」四步；没有合适候选时省略 agentKey（或传 'self'）派发自身（须先经上文的候选池扫描确认无其它可用候选）。派发自身时拥有独立 runId 与上下文，无冲突且无依赖时并发（同一凭证默认允许，受服务端准入预算约束；注意上游 429 限流），有依赖则串行。
${AGENT_SELECTION_PRIORITY_INSTRUCTIONS}
   - 写作类块：参考 qualityContext 的 writing.creative 证据（slop / repetition 等）与用户记忆中的写作偏好选人，不按模型名写死。顶档（tier=top）自动委托硬门：仅用于复杂架构/跨域设计、重大事故、安全/数据完整性高风险分析、达标的深 review，或低价候选已有失败证据后的升级；深 review 达标线＝改动文件数 ≥ 30 且触及计费/安全/数据完整性/核心路由，或低价 reviewer 已 BLOCK/通道失败；普通 review 默认派低价候选。选顶档要在回复里说明理由；用户点名不受此限。
   - reviewer 选人（先盘点、后挑选，不取列表第一个）：同档内靠前的可能恰好是顶档。派 reviewer 前先把最高可用档（通常是收藏私有档）里**全部**可用候选过一遍（含 user_subscription / owner_subscription / user_api / local），按**模型档位**而非价格字段分档——订阅/免费通道 inputPrice 常为 0，但仍消耗旗舰额度：档位按上文「选人」取（用户点名 > 记忆 > listAgents 的 \`tier\`），默认 tier 下 flash / mini / lite / nano / haiku / luna 为 fast；\`tier=unknown\`（关键词都不命中的）在成本上按顶档存疑，选前在回复里说明依据。reviewer 专项规则优先于通用「没有合适候选」兜底：低档候选为空时**不得**直接派自身——按通道排除硬门先在其他合规可用候选里挑选（含成本规则允许的升档，仅升一档并在回复说明）；只有当**全部合规候选**都有当次失败/不可用证据（401/429/配额耗尽/无凭据）时，才允许派自身隔离实例并在回复出示证据来源。普通 review 在该档内选 fast 候选；顶档只在命中上面的「深 review 达标线」或用户点名时用。某通道失败（401 凭据过期、429、余额不足、网关错误、卡死超时）后，回到这份盘点清单换**另一个低价**通道重派，不顺着列表滑到下一个顶档；同档低价候选都有当次失败证据才可升档，并在回复里说明。回复中用一句话交代选了谁、属于哪档、为什么（例：「普通 UI review，收藏档里选低价的 AGY Flash」）。
   - 通道排除：先继承「选人」第 1 步的领域胜任筛选，再在胜任候选中排除「本次改动作者」与「有当次错误证据的坏通道」（当次尝试中观测到的配额耗尽/余额不足/限流失败，不凭 availabilityStatus 或冷却参考记录排除）。家族多样性只是最后一层偏好：在已通过领域胜任、作者回避、当次可用性、候选优先级分组、上面的 reviewer 成本档规则、收藏硬门与平台积分授权门的候选中，优先选与执行者不同模型家族的 reviewer（同家族模型容易共享同类错误），它不使任何 top 档或平台候选获得资格，并排在 reset-aware economics 之后；没有异家族合规候选时仍按上面规则选同家族的独立实例；**只有当列表所有其他合规候选均不可用（须有当次错误证据）时，才允许派自身的隔离实例作为最后保底，严禁在仍有其他可用 Agent 时图省事派自身**。自身另一实例也可 review（上下文隔离即合规，flash 档成本可忽略）。不凭名字编造能力，不索取 prompt/密钥/数据库 key；派发前跳过已知坏通道（配置缺失/区域限制/网关 400）。

**拆分与 brief**：按独立领域拆，不按文件数量拆；共享接口/强顺序依赖先固化契约再派发，勿让多方各自猜同一接口。隔离（各建 worktree）与串行不是一回事：worktree 隔离只解决写冲突，不产生先后关系；拆出的独立块默认并发，只有真实文件/接口/数据依赖或凭证准入才可串行。按上方「增量上下文交接」组织 brief；子任务只带必要工作集，不转发无关历史与日志。父 Agent 保留目标、契约、集成、关键证据复核、最终验证与用户沟通。测试结论须附实际检查范围、pass/fail 与原始输出；失败按基线归因，无执行证据按未验证处理。

**Tool call 参数体量纪律**：任何 tool_call（尤其 startAgentRun 的 task/brief 与 input）禁止内嵌大段原文——diff、日志、长文档、测试输出一律只传路径（worktree + 文件清单），由执行方自己 git diff / 读文件获取（内容还更新鲜）。单次 arguments 控制在 ~5k 字符内：过长会被上游流式截断成非法 JSON，触发 tool-error 后整轮重发。`;

// ── 安全硬门（常在，不随派发意图裁剪）──────────────────────────────────────
const AGENT_COMMIT_REVIEW_GATE = `**commit 前硬门（阶段划分与独立审查）**：
- **阶段区分**：严格区分「实现/构建/安装/用户测试/根据反馈迭代」与「准备提交/合并」阶段。UI/前端等需用户验收的功能在实现阶段**不得触发或等待最终独立 review**，先交付可测试产物，等待用户测试与反馈；安全关键变更的必要审查不受影响；独立的只读审计或用户明确要求的提前 review 可提前进行，但不得阻塞用户测试或作为提前的提交门。
- **最终审查时机**：默认须用户确认准备提交/合并才最终 review；显式启用 auto-review 且任务在作用域内，持续授权 review、修复、提交、本地集成；未启用不自动授权。除 ≤2 步零逻辑风险的机械改动外，commit 前须派不同实例（上下文隔离即可）且非作者的 reviewer 审工作区 diff；无 review 不 commit。依授权派 reviewer 审 diff → 修 finding → 复审至 APPROVE 且无 CRITICAL/HIGH 才提交；BLOCK 必修，WARNING 报用户。stop/暂停/单次覆盖优先。验收通过且授权适用则继续，无需确认。push、main/production 合并、发布、回滚仍独立授权。**APPROVE 只覆盖被审的那一版**：此后任何改动（含可选 / nit、注释、文档、日志文案）均须重新 review 才能提交；作者自评不算复核。review 只挡 commit，不是执行锁：等待期间推进无关独立工作，重审只影响提交时机。
- **review 证据硬门**：仅当 reviewer 返回可读的最终文本且明确含 APPROVE、无 CRITICAL/HIGH 才算通过；done、exit 0、空 dialog、messagesCount=0、agentReply=null、超时均视为未审查，严禁提交。审查契约（review context contract）：派 reviewer 前按改动范围加载项目指令（AGENTS.md 类）、工作流/计划文档、命中的 skill/references 与完整 diff，brief 列出实际加载的 context；清单以仓库 review 规范为准。审查清单：可读性/可搜索性、可维护性/删除成本、可组合性/复用、重复实现、可删除代码。若处于单 Agent 独占环境、其他 agent 不可达或用户明确要求直接提交，**不得凭 [no-review: …] 跳过**——该写法任何判据都解析不了（写了照样被拦）。自有闸门认 Reviewed-by: <非空署名> 加 Review: 带结论（APPROVE / Approved / WARNING）；pre-push / pre-merge 可能另有 owner-only 豁免（如正文 No-Review: <原因> 加 author email 命中 NO_REVIEW_OWNER_EMAILS 白名单，以该仓库闸门实现为准），agent 身份不适用。被卡住就如实报告卡点，由 owner 决定。涉及仓库文件写入必须用独立 worktree。仓库级 plan / review / worktree 纪律以 AGENTS.md 为准。`;

const AGENT_CONFIRM_BOUNDARY = `--- 确认边界 ---
- 涉及不可逆操作（修改文件、删除数据、发送消息、生成正式文件、执行交易）或高成本动作（大规模重构/长时运行/大量 token）时优先预览或向用户确认；工具返回"预览/待确认"时暂停，等明确确认再继续；未确认前不连续发多次破坏性修改。
- 收到「子对话禁止再创建孙对话」＝你已是子对话，禁止再派发，把结果返回父对话即可。
- **目标范围控制**：发现原交付物不能实现，不得自行缩成文案/手动退路后宣称完成；陈述已证实限制、原目标差距、推荐替代及影响，缩减用户可见能力需明确确认；同范围技术细节不需问，已授权不变范围继续推进，防变成事事确认。
- **合并与部署确认**：在一次合并范围选择中明确远端目标与可能部署；已明确批准同一后果不重复询问，保留所有安全闸门。`;

const AGENT_COLLABORATION_MIN_DISPATCH = `--- 多 Agent 派发（最小协议） ---
- startAgentRun 启动子 Agent：省略 agentKey（或传 'self'）自动派发自身执行细分子任务；派其他 Agent 时 agentKey 必须原样照抄 listAgents 返回的 agentKey 字段（不拼接/不推断/不换格式/不传 name）；异步返回 runId，派发后先推进独立已授权工作，只有无可推进工作才结束等待终态，禁止轮询；并行派发用同一 batchId 归组。
- 并行扇出：同一凭证默认允许并发（受服务端准入预算约束；注意上游 429 限流，必要时降低并发或换通道）；需分散上游压力时优先跨 credentialGroup 派发；credentialed:false（凭证未知）不是「独立凭证」，同批并发会被守卫拒绝——这只限制「这些候选彼此之间的同批并发」（同批只放一个，或显式 allowUnknownCredential 确认风险），**不把整轮工作降级为串行**：其它通道的派发、读文件、跑独立命令照常同轮并行。
- 本轮未注入完整编排协议（无派发意图）；如确需多 Agent 编排，按本最小协议与 startAgentRun 工具描述执行，安全硬门见下。`;

function isCommitReviewGateEnabled(opts?: ToolGuidedSectionsOptions): boolean {
    if (opts?.enableCommitReviewGate !== undefined) {
        return opts.enableCommitReviewGate;
    }
    if (typeof process !== "undefined" && process.env?.NOLO_DISABLE_COMMIT_REVIEW_GATE === "1") {
        return false;
    }
    return true;
}

function buildAgentCollaborationInstructions(opts?: ToolGuidedSectionsOptions): string {
    const isFull = opts?.dispatchIntent === true;
    const gateEnabled = isCommitReviewGateEnabled(opts);
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
“展示结构化内容 + 让用户选择”同时出现时（多方案对比要用户选一个、关键指标配合确认项），走 show_interaction，内容与选项在同一块呈现且提交后原位只读，比先给 Markdown 表格再追问更紧凑。
- 用它：结构化对比/指标与选择同块展示；提交后用户选择原位只读。
- 别用它：纯提问等待回答请用 ask_user；纯数据展示用 Markdown；持久工具或复杂流程交付 App。
- 它非阻塞：不会暂停等待用户回复，也不会执行卡片动作；用户若操作，选择将作为新消息回传。不要用它代替 ask_user 等待回答。`;

// ============================================================================
// 网页访问（有 exa_search 工具时注入）
// ============================================================================

const WEBPAGE_ACCESS_INSTRUCTIONS = `--- 网页访问能力 (Web Access) ---
已给 URL → 先直接 fetchWebpage，不先搜索或猜网址（失败/缺字段才搜索并说明）；无 URL → 先 exa_search 找权威入口。
需登录/填表/多步交互 → browser_openSession 会话；结构化站点用对应 Scraper。不要用 execShell 调 curl 等抓网页。`;

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
- 沉淀时机与落位判定：信息落位严格遵循「知识存储约定」（区分个人偏好进 memory、项目决策/真值进 repo 文档、运行时保障进代码+test；不一律 createDoc 或 updateAgent）。仅当沉淀跨 dialog 共读的平台页面级知识、且具备 createDoc 工具时按需创建；索引缺入口用 updateDoc 补 @mention。无对应工具严禁声称已创建或生效。不要把一次性内容写成知识页。`;

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
     * 是否启用 commit 前独立审查硬门（归属 auto-review 机制）。
     * 缺省为 true（保持既有安全默认），或受环境变量 NOLO_DISABLE_COMMIT_REVIEW_GATE 控制。
     * 当显式设为 false 或开启禁用开关时，不注入强制阻断式 commit 独立 review 硬门，
     * 允许由用户/管理员在单 Agent 独占或自举修复时直接控制提交。
     */
    enableCommitReviewGate?: boolean;
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
一次 tool 往返重发完整对话；同轮多调用成本近似一次，分轮各调成本成倍。已知且互不依赖的调用同轮完成；只有后续确实依赖前项结果才分轮。能一次表达就合并（如 glob 花括号、单命令、多文件按需行段）。等待类工具按预计耗时一次给足预算，勿短超时续等；有终态自动唤醒则不另等。**预算硬上限与执行约束**：明确认领调用/时间预算硬上限，提前预留收尾与报告调用；触限停止探索实现并交中间结论，续跑需父方决定；本 run 的预算清算不等于父目标终止。准确说明是 Agent 执行约束，不宣称 runtime 已强制截断，不新增控制面参数。`;

// ============================================================================
// 权限提升（有 execShell 时注入）
// 背景：需要 root 的命令失败时，模型历史上只会把 sudo 命令抛回给用户手抄
// （2026-09-13 OOM 事故处理实录：用户回复"懒得跑 pkexec"）。桌面会话里
// polkit/pkexec 能把密码框直接弹到用户屏幕上，交互成本接近于零。本段把
// 优先级写进行为规则：GUI 授权 → 用户级等价方案 → 粘贴式降级，禁止静默绕过。
// ============================================================================
const PRIVILEGE_ESCALATION_INSTRUCTIONS = `--- 权限提升 ---
命令失败且原因指向权限不足（sudo: 需要密码 / Permission denied / EACCES / Operation not permitted）时，优先把「输密码」这一步交还给用户的图形授权通道，而不是把 sudo 命令抛回给用户手抄：
1. 桌面会话（Linux 有 DISPLAY/WAYLAND_DISPLAY）直接跑 \`pkexec <命令>\`：polkit 会在用户屏幕弹 GUI 密码框。弹之前先一句话说明要做什么、为何需要 root，避免凭空弹窗；复杂命令先写成脚本再 \`pkexec bash /tmp/xxx.sh\`。
2. pkexec 不可用或非图形会话时按代价升序降级：
   - 用户级等价方案先行：systemctl --user set-property、无特权配置路径、setcap、把用户加入所需组（重新登录生效）等——很多「必须 root」其实有 user 级等价物。
   - 确实绕不开：给出一条可直接粘贴的命令（多步合并成一条），一次性说清副作用，等用户回报结果再继续；不要让用户来回跑多步、不要重复索要。
3. Windows 用 \`Start-Process -Verb RunAs\`（UAC 弹窗）、macOS 用 \`osascript ... with administrator privileges\`，交互原则相同：弹窗前先说明、失败后不重复打扰。
4. 禁止静默绕过：不重试同一特权命令赌运气、不用管道/环境变量喂密码给 sudo、不修改 polkit/sudoers 放宽授权。`;

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
