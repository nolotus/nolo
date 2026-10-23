/**
 * 派发落点：执行后端硬规则（系统层固定块，四条装配线无条件注入）。
 *
 * 背景（2026-10-23 事故）：派发的子 run 默认落本机 docker 沙盒，而沙盒
 * **不兑现宿主的 `cwd`**（见 `dockerSandboxExecutionBackend.ts:787` 的 fail-closed 段：
 * 「本后端不兑现 env / stdin / cwd」），也**不自动继承宿主凭据**；工具与网络能力
 * 取决于就绪环境（不是基础镜像的静态清单）。于是「改这个 worktree」「连上去查线上」
 * 这类任务派进沙盒后，改动落不到调用方的 worktree，宿主凭据也带不过去。
 *
 * 规则本身是**能力条件**而非「一律 local」：服务端 / 浏览器 run 没有宿主执行器，
 * 显式 `local` 会被拒（`server/handlers/agentRun/runtimeTarget.ts` 的
 * `local_target_unsupported`、`startAgentRunTool.ts` 的
 * HOST_EXECUTOR_UNAVAILABLE_MESSAGE），那种场景的出路是已连接的 `machine:<machineId>`。
 *
 * 它讲的是「并行是默认 · 派发纪律」的下一层：同一件事——派发——但问的是
 * 「派到哪个后端执行」。因此本块紧接 `PARALLEL_DISPATCH_DEFAULT_RULE`。
 * 固定常量、无条件拼接，不做工具门控、不做开关：
 * buildSystemPrompt（web/server 交互）、runtimeSystemMessages（agentRun/定时任务）、
 * localLoop（local/desktop/TUI/子任务）、estimateCliContext（上下文估算）。
 * 编译层使用 static；localLoop 无 static 作用域，用 session 占位。
 *
 * 装配线全景与扩展 recipe 见 docs/architecture/system-prompt-assembly.md。
 */
export const DISPATCH_BACKEND_POLICY = [
  "【派发落点 · 执行后端】",
  "派发子 run 先看**能力条件**，别一律加 `local`：",
  '① 有宿主执行器（CLI / desktop）且要按给定 `cwd` 改指定 worktree / 目录 → `runtimeKey: "local"` + `allowHostWrites: true`（缺一即拒）。',
  "② 要访问线上服务器或宿主凭据 → 选**有该能力**的执行面：有宿主执行器时用 `local`，没有时用已连接的机器 `machine:<machineId>`。",
  "服务端的 run 没有宿主执行器，兑现不了调用方的本地 `cwd`：`local` 绕不过去（`local_target_unsupported`），要么走 `machine:<machineId>`，要么省略落点。",
  "沙盒的稳定边界：不兑现宿主绝对 `cwd`、不自动继承宿主凭据；工具与网络能力以就绪环境为准。",
  "「写型派发默认落 docker 沙盒」只属于 CLI 本地派发通道这一范围；不带宿主状态与宿主凭据的独立代码改动 + 跑测试，沙盒仍是首选（隔离是保险，不是负担）。",
].join("\n");
