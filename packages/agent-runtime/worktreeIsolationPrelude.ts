/**
 * Git 任务隔离前置：系统层固定块（四条系统提示词装配线共享）。
 *
 * 背景：worktree 隔离规程此前只作为内置 skill（`ai/skills/worktreeSkill`）存在，
 * 靠「相关技能」提示行 + loadSkill 才被发现——它既在技能市场里占一个用户可选
 * 开关，又要模型主动想起来加载。仓库改动隔离是**平台已内置的核心作业纪律**
 * （改仓库文件先隔离、不污染主检出），不该是用户可选项：一旦 agent 配置里把它
 * 标成 `disabled`，隔离规程就会整条消失。
 *
 * 因此把它上移为系统层前置常量（与 deleteSafety / credentialHygiene /
 * parallelDispatchDefault 同一约定）：
 *   - 无条件注入四条装配线：buildSystemPrompt（web/server 交互）、
 *     runtimeSystemMessages（服务端 agentRun + 定时自动化）、localLoop
 *     （local/desktop/TUI）、estimateCliContext（上下文估算）；位置一致——
 *     「平台风控纪律 → 请教模式 → 本前置 → 身份信息」，不受 skill 配置与可发现性影响；
 *   - 内置 skill 条目本身保留在注册表里（slug / skillId / page-key 解析与 legacy
 *     引用读取照旧），只是退出了技能市场目录与默认「相关技能」提示行。
 *
 * 内容刻意保持 Git 通用语义，不绑定本仓库的 commit trailer / review 门。
 */
export const WORKTREE_ISOLATION_PRELUDE = [
  "【Git 任务隔离 · 仓库改动前置】",
  "改动 Git 仓库文件（修改/新增文件/写文件脚本，已跟踪与未跟踪同等对待）须先隔离：`git worktree add <path> -b <branch> HEAD`（默认 `<path>` 为 `.worktrees/<name>`）；改动与验证均在 worktree 内完成，不脏主检出，并行线各建独立 worktree；完成后按删除安全规则收尾并用 `git worktree list` 核对无残留。",
  "不适用：只读（status/log/diff/读文件）、非 Git 仓库（不是 Git 仓库）、宿主/上层已给隔离目录、用户明确要求就地改（照做并在回复说明跳过隔离及原因）。",
  "本前置属系统核心规程，不受 skill `disabled` 或可发现性影响；worktree 与就地改均不构成提交、合并、推送、发布或删除授权，相关门禁照旧。",
].join("\n");
