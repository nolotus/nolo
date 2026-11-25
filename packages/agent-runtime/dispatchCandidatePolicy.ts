/**
 * 派发选人：候选可用性与速度（系统层固定块，四条装配线无条件注入）。
 *
 * 背景（2026-11-03 事故）：编排者依据 11 分钟前的「antigravity 额度耗尽」结论，
 * 跳过了当时已恢复 available 的 fast 候选，把长任务派给了额度不可见
 * （`availabilityStatus=unverified` / `no_quota_snapshot`）的通道。规则本身早就写在
 * 「选人」里，但**执行时没做重扫**——所以这条不落在记忆层，落在提示固定块里，
 * 与 `PARALLEL_DISPATCH_DEFAULT_RULE`、`DISPATCH_BACKEND_POLICY` 同级。
 *
 * 它讲的是「派给谁」，紧接着讲「什么时候派」的并行块与讲「派到哪个后端」的后端块。
 * 固定常量、无条件拼接，不做工具门控、不做开关。
 *
 * 装配线：buildSystemPrompt（web/server 交互）、runtimeSystemMessages（agentRun/定时任务）、
 * localLoop（local/desktop/TUI/子任务）、estimateCliContext（上下文估算）。
 * 新增装配线必须同步注入，见 docs/architecture/system-prompt-assembly.md。
 */
export const DISPATCH_CANDIDATE_POLICY = [
  "【派发选人 · 可用性与速度】",
  "**每次派发前重新读可用性**：仅当次生效，禁止复用任何早于本次派发的额度耗尽/冷却结论（恢复是常态），依本次 listAgents 返回判定。",
  "**长任务额度风险**：预计 >30 次工具调用时，留意 `availabilityStatus` 为未验证/无额度快照通道可能中途 402；核实真实额度与网络后判断，不把参考标注当作不可用证据或自动阻断理由。",
  "**速度只认本用户实测**：领域匹配优于档位；过领域、费用、作者回避与当次可用性后，同档执行型候选优先有 observed 数据的快通道。仅比 listAgents 的 speedContext：firstOutput 更小者优先，相同或缺失看 tps；没有样本就是没有数据（非慢），需说明时标速度未知；禁引外部基准/宣称/记忆，不另造采样/综合评分/自动 model tier。",
  "不放宽既有硬门：平台积分扣费授权、429 限流知情权、作者回避、review 独立性、删除与推送确认不因「更快」绕开。",
].join("\n");
