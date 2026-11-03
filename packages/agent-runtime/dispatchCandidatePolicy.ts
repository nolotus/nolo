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
  "**每次派发前重新读可用性**：候选可用性只对当次派发生效。禁止复用任何早于本次派发的「额度耗尽/冷却中」结论——恢复是常态，凭旧结论跳过可用候选等于自己制造阻塞。判定要基于本次 listAgents 的返回。",
  "**执行型块优先快通道**：目标/文件/验收已明确的执行型任务，在通过胜任性筛选的免费私有通道里优先选 `tier: fast` 且**有 observed 速度数据**的候选；速度数据未知的候选只作兜底，选它时在回复里写明「速度未知」，不要假装它快或慢。",
  "**长任务避开额度不可见的通道**：预计超过 30 次工具调用的任务，不要派给 `availabilityStatus` 为未验证 / 无额度快照的通道——中途 402 会让整块工作作废，代价远高于省下的选择成本。",
  "**速度只认本用户实测**：速度依据只有 observed（本用户近期真实调用中位数）。不要引用外部基准、厂商宣称或记忆里的数字来自证「哪个快」；没有样本就是没有数据，不等于慢。",
  "这些规则不放宽任何既有硬门：平台积分扣费授权、429 限流知情权、作者回避、review 独立性、删除与推送的确认，一条都不因「更快」而绕开。",
].join("\n");
