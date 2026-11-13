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
  "任务要改动某个 Git 仓库里的文件（改代码、**在仓库里新增文件**、跑会写文件的脚本、批量重构等；**已跟踪文件与新增的未跟踪文件同等对待**）时，先在独立 worktree 里做：`git worktree add <path> -b <branch> HEAD`（仓库没有约定时 `<path>` 用 `.worktrees/<name>`，名字拿不准就用任务主题）；改动与验证都在该 worktree 内完成，主检出不留本次脏改动；完成后按删除安全规则收尾，并用 `git worktree list` 核对无残留。同一仓库并行推进多条任务线时，每条线一个 worktree。",
  "不适用（不必建 worktree）：只读查询（status / log / diff / 读文件）、目录不是 Git 仓库、宿主或上层任务已经给了隔离工作目录、用户明确要求就地改——最后一种照做，但在回复里说明跳过了隔离及原因；就地改只改变隔离方式，不放宽提交、推送、合并、发布与删除等上层硬门。",
  "本前置属系统层核心规程：不受 agent skill 配置（含 `disabled`）或技能是否可发现影响。worktree 是隔离手段，不构成提交、合并、推送、发布或删除授权——那些仍按各自授权边界与门禁执行。",
].join("\n");
