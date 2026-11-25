/**
 * Host-neutral 工具使用纪律指引 —— 单一真值。
 *
 * 提炼自 2026-09-15 的系统操作类会话复盘（失败模式与具体领域无关）：
 * - 凭记忆直接调用外部接口/键名/路径（应“先验证存在性再调用”）；
 * - 输出卫生不足：2>&1 混流、复合命令退出码掩蔽、exit 0 也可能带错；
 * - 一次性探针/监控脚本对热插拔不做容错，未捕获异常直接崩溃；
 * - 调用失败原因不明时直觉性重试（应先检查副作用与状态变化）。
 *
 * 由工具驱动指令表（ai/agent/toolGuidedSections，triggerTools: execShell）
 * 注入；web/server 的 buildSystemPrompt 与 desktop/CLI 的 localLoop 共用同一
 * 份 —— 两条装配线各自手写会静默漂移（与 memoryUseGuidance 同款理由）。
 */
export const TOOL_USE_GUIDANCE = `--- 工具使用纪律 ---
- 调用外部接口/关键路径前，先花一步验证存在性（introspect / list-keys / --help / 列目录）。
- 避免 2>&1 混流；查询用 2>/dev/null 降噪；复合命令逐关键步取退出码。先查输出错误，exit 0 也可能有错。
- 探针读取循环加异常兜底，容忍设备/进程消失；失败原因不明先查副作用与状态变化，再决定重试或回退。
- 外部等待依「并行是默认 · 派发纪律」：execShell(background: true) 真探针，满足/失败/超时退出唤醒；禁 & / nohup 或孤立 sleep。agent run 等终态、不轮询；禁只查一次等追问。`;
