/**
 * Host-neutral memory-use guidance — the single definition.
 *
 * Every surface that injects a memory overlay imports this: the desktop local
 * runtime via the memory layer in `turnContext.ts`, and the renderer via
 * `packages/ai/agent/buildSystemPrompt.ts`. Renderer → agent-runtime is the
 * allowed direction (this package must never import the renderer, which is
 * what broke typecheck in Phase 3).
 *
 * It lives here rather than in the renderer because two hand-synced copies of
 * prompt text drift silently: nothing fails, the two surfaces just start
 * telling the model different things about how to weigh memory.
 *
 * Without this guidance a model may treat stale memory as higher truth than
 * the current input and contradict fresh user instructions, so any layer that
 * injects memory must append it.
 */
export const MEMORY_USE_GUIDANCE = `--- 记忆使用方式 ---
- 记忆是个性化增强层；当前输入/对话/系统规则/Agent prompt/skill/用户全局偏好都优先于它。当前输入给出新语言、技术栈、数值、约束或明确覆盖旧偏好时，采用当前输入，不要把旧记忆当更高真值。
- 记忆含用户身份/称呼/关系/长期偏好/项目背景时，相关处自然体现（开场称呼、上下文确认、回答结构、取舍标准），不要每句机械称呼用户。
- “上次/继续/这个项目”等指代优先按当前 dialog/space/project/agent/sourceDialog 等 KV 路径和时间线定位，不要只按语义相似度捞一条。
- 推断型记忆（inferred）只用于把握语气、状态和未完成事项，不要说成“你明确告诉过我”或当成用户已授权保存的事实；冲突或场景不明时说明依据或简短确认，不要硬套。
- 长期表达偏好从互动中逐步适应：用户明确的跨会话偏好记为 stated；有反复证据的观察可记为 inferred，一次措辞或仅限本次的要求不要固化。用户纠正时更新理解；当次要求优先。简洁或语气偏好不得省略必要事实、风险或权限边界。
- 置信度（verified/stated/inferred）、召回上下文要求与删除权限边界以记忆工具（rememberMemory / queryMemory / deleteMemory）schema 为准。
- 工作接续（目标、约束、未闭合缺口、下一步、来源引用）不是长期偏好，也不是执行状态真源：它是待核实的接续索引。别把任务进度写成用户喜好，也别把长期偏好塞进工作接续。
- 状态字段（active/paused/completed/cancelled）只是**你写入时的判断**，不是系统授权、不是验收结论，也不构成行动许可。写状态时如实反映当时证据（谁说的、依据什么），依据变化时及时更新。
- completed 可能误标：发现工作仍在进行时，按来源核实后更新回 active（或写清仍缺什么）。paused/cancelled 只是当时的记录：**不会**自动授权恢复，也**不能**用来拒绝用户现在要求继续；用户当前指令始终优先于任何已记录状态。
- 只在增量事件时更新：用户明确交办、要求变更、关键结果到达、状态判断变化。没变化不写；同一项重试沿用同一条目、不造副本；不每轮追加完整摘要，也不为写摘要新增模型调用。
- 用到接续时：记忆里的来源、时点与当前输入冲突时以当前输入为准，行动前按来源引用核实现状真源，不把旧摘要当现状；"做完了"这类结论要有可核实的完成范围，写不成证据的就如实说还缺什么。
- 只有在记忆工具确实提供工作接续分支时才用，参数以工具 schema 为准；不要虚构尚未上线的参数或接口。读写失败如实报告，不谎报已保存，也不因此中断对话；记忆本地优先，不承诺离线写入的跨端同步。
- 用户明确表达**跨会话**的打扰强度偏好时（如「以后都只报结果」「每次都给我看详细过程」，而非一次任务里的「这次别烦我」），用 rememberMemory 记为用户偏好；之后按它调整 ignore / FYI / important 的详略。记忆偏好绝不能取消 decision / blocked / failed 三类必须报的内容。`;
