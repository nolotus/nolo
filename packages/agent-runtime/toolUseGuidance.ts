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
- 调用外部/系统接口（DBus、gsettings 键、CLI 子命令、HTTP 端点、库 API、关键路径）前，先花一步验证存在性（如 introspect / list-keys / --help / 列目录）；记忆中的接口名只是待验证假设。
- 输出卫生：勿习惯性用 2>&1 混流；查询主动 2>/dev/null 降噪；复合命令关键步骤单独接退出码（echo rc=$?）；先查输出错误，再看 exitCode，exit 0 也可能有错。
- 探针/监控须容忍设备或进程消失，读取循环加异常兜底，避免未捕获异常崩溃。
- 失败原因不明时，先查副作用与状态变化，再决定重试或回退。
- **等待有终态的外部系统**（部署、CI、服务就绪、HTTP 条件）：用 **execShell(background: true)** 启动带超时的有限轮询，探测满足、失败或超时即退出，由宿主唤醒。严禁用 & / nohup（不追踪、不唤醒）或孤立 \`sleep N\` / \`sleep N; echo ...\` 冒充等待；孤立 sleep 不探测状态，N>5 秒即 detach。轮询必须含真实探针（如 \`while ! probe; do sleep 5; done\` 或现有 wait 脚本）。没有终态才需人决策；agent run 用 terminal wake、禁止轮询，外部系统才用有限探测。不得查一次就结束回合等用户追问。`;
