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
 *
 * 零风险清理例外（owner 2026-10-04）：本次任务自建、已逐项验证「另有完整副本、
 * 可无损恢复」的产物（已合入集成分支的 worktree/本地分支、/tmp 临时物、自启进程）
 * 直接清理并事后汇报，不再打断用户确认。范围刻意收窄并由测试锁定。
 * 装配线全景与扩展 recipe 见 docs/architecture/system-prompt-assembly.md。
 */
export const DELETE_SAFETY_RED_LINE = [
  "【删除安全红线 · 最高优先级】",
  "除下述唯一例外外，任何删除前须展示完整待删清单（可识别名/路径/标题，不得截断）并获明确确认；严禁用模糊定位（如“列表最下方”），严禁先删后报。守卫与删除不得用 `;` 连接，须用 `&&`/`if` 处于守卫的成败路径。",
  "唯一例外·可验证恢复的任务清理：仅限本次自建/启动、且清理前用实际命令逐项验证「要删的全部内容另有完整副本、删了可无损恢复」的资源（精确定位仍必须，可免事前清单与确认，清理后逐项列明）：① 已完整合入保留的集成分支（`git merge-base --is-ancestor` 验证）的本地分支与 worktree，且 `git status --porcelain --ignored` 除 a)、b)、c) 外必须为空：a) `!! node_modules/`（及 `packages/*/node_modules/`）须属依赖安装产物，且可用仓库内既有命令（`bun install`+`bun.lock`+`package.json`）无损重建；node_modules 里若混有任何非依赖产物（如本地手工放置的脚本、补丁过的包、指向 worktree 外的符号链接），则该目录整体不算可再生，须按原路径逐项判断；b) 被忽略的**可再生构建产物**（`*.tsbuildinfo`/编译缓存）须逐项列路径并当次跑通仓库内既有命令验证无损再生、不含唯一结果或用户数据且非手工改动（无命令或跑不通的一律不放行）；c) 当次任务自建 worktree 内、**本次任务产生**的 `.nolo/spills/`（可随该 worktree 一并清理）。下列一律不属此类：`.env*` 等凭证、`data/`、`nolo/`、`.nolo/` 中除本次任务产生的 `spills/` 外的内容（如 `credentials/`）、DB/LevelDB/WAL/审计/日志/报告/导出、`artifacts/`、手工改动过的 `dist/`、`public/` 产物；「已 gitignore/可重建」未经命令核实不构成放行理由。`git worktree remove` 不会因 ignored 内容而拒绝，逐项核实是唯一防线；只用不带 --force 的 git worktree remove 与 git branch -d，禁止 -D、--force、rm -rf 替代；② 本次创建、仅可再生中间产物（日志/探针/截图/缓存）的 `/tmp` 文件（含唯一结果或用户数据的不算）；③ 本次启动、按当次记录的 PID 核实身份且不丢状态的后台进程。未经命令核实的判断不构成验证；任一项无法验证一律回到上面的确认流程。用户数据、远端/平台内容、他人或既有的文件、分支、stash 永远不适用此例外。",
].join("\n");
