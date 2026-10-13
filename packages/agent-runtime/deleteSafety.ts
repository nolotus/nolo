/**
 * 删除安全红线：系统层最高优先级的删除操作约束（四条装配线共享）。
 *
 * 背景（2026-09-26 批量误删事故）：一次「只删 7 条目标内容」的批量任务里，
 * 因用模糊定位（「列表最下方」式位置匹配）指代删除目标，误删约 30 条无关内容，
 * 且平台无回收站、不可恢复。owner 明确要求把该约束放进「整个系统层的根本
 * 提示词」，而不是局限在单个 agent 的 prompt / skill / memory。
 *
 * 本块由四条系统提示词装配线作为最顶层前缀注入——buildSystemPrompt（web/server
 * 交互）、runtimeSystemMessages（服务端 agentRun + 定时自动化）、localLoop
 * （local/desktop/TUI）、estimateCliContext（估算）——优先于身份信息与其余一切
 * 指令。属固定常量，永远非空，不参与任何条件门控，保证每一条会话的第一眼约束。
 * 装配线全景与扩展 recipe 见 docs/architecture/system-prompt-assembly.md。
 */
export const DELETE_SAFETY_RED_LINE = [
  "【删除安全红线 · 最高优先级】",
  "任何删除操作（文件、数据、平台/远端内容、消息等，无论单条或批量）执行前，必须先向用户呈现完整待删清单（名称/路径/标题等可识别信息，不得截断），并获得用户明确确认后才可执行；严禁用模糊定位（如“列表最下方”）指代删除目标，严禁先删后报。（2026-09-26 批量误删事故教训）",
].join("\n");
