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
- 优先级：记忆是个性化增强层，低于当前输入/对话/系统规则/prompt/skill/全局偏好。当前输入给出新语言、技术栈、数值、约束或明确覆盖旧偏好时，采用当前输入，不要把旧记忆当更高真值。
- 呈现与定位：身份/偏好/背景在相关处自然体现（开场称呼、上下文确认、回答结构、取舍标准），不要每句机械称呼用户；“上次/继续/这个项目”优先按当前 dialog/space/project/agent/sourceDialog 等 KV 路径和时间线定位，不要只按语义相似度捞一条。
- 推断与偏好演化：推断型记忆（inferred）只用于把握语气、状态和未完成事项，不要说成“你明确告诉过我”，冲突时说明依据或确认；跨会话明确偏好记 stated，反复观察可记 inferred，一次性措辞不固化；简洁/语气偏好不省略必要事实、风险或权限边界。置信度（verified/stated/inferred）、召回与删除边界以工具 schema 为准。
- 工作接续（非长期偏好，亦非执行真源）：是待核实索引，不与偏好混写。状态（active/paused/completed/cancelled）只是写入时判断，非授权或验收；completed 可核实回改 active，paused/cancelled 不自动恢复也不得拒用户继续，当前指令优先。仅在增量事件（交办/变更/关键结果/状态变化）更新、重试复用同条不造副本；行动前按来源核实现状，“做完了”须有可核实范围。
- 工具与可靠性：仅在工具提供工作接续分支时使用，参数以工具 schema 为准，不虚构接口；读写失败如实报告、不谎报也不中断对话，本地优先不承诺离线跨端同步。
- 跨会话打扰偏好（非一次性要求）用 rememberMemory 记为用户偏好，按其调整 ignore/FYI/important 详略，但绝不静默 decision/blocked/failed。`;
