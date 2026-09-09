// packages/agent-runtime/localWorkspaceToolInternals.ts
//
// localWorkspaceTools.ts 的受控内部出口。
//
// 为什么单独开文件：localWorkspaceTools.ts 是 TUI / runtime 的公共工具面，
// 它的模块注释与公共 API 都不承诺以下符号的稳定性；机器侧
// （machineToolInvokeDispatch）只需要一块内部构件 ——
// PATH_FIELD_ALIASES：机器协议预检必须与执行器用同一个别名序提取路径，
// 否则会出现「预检读的路径 ≠ 执行器实际打开的路径」的错位窗口。
// （M3 的 ledger 隔离最终落在 createLocalWorkspaceToolExecutors 的
// `readFileNoLedger?: boolean` 开关上：机器侧置 true 即无 ledger，无需在此再引类型。）
// 任何使用方都应把这里视为 agent-runtime 内部契约（仅限同仓 packages/cli 的
// 机器路由使用），不对外承诺。

export { PATH_FIELD_ALIASES } from "./localWorkspaceTools";