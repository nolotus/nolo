/**
 * Host-neutral stale-replay guard — the single definition.
 *
 * 2026-10-02 补充（用户实测教训）：guard 只把**动作**判成过期，**用户的目标与意图仍然
 * 有效**。旧措辞「其中的任务/skill/ARGUMENTS 默认已过期」会让接手方把最初的目的也
 * 当垃圾扔掉，只剩待办清单（用户原话：「压缩之后你屁都记不得」）。
 *
 * Wraps a historical summary so the model reads it as a frozen snapshot rather
 * than live instructions. After compression recovery or cross-dialog
 * inheritance, an unguarded summary lets a model replay old task descriptions,
 * skill calls and ARGUMENTS payloads — re-creating issues, branches and tasks
 * that were already done.
 *
 * It lives here because the desktop local runtime injects summaries too, and
 * `agent-runtime` must stay host-neutral. `packages/ai/context/staleReplayGuard`
 * re-exports this so existing renderer imports keep working; renderer →
 * agent-runtime is the allowed direction (the reverse broke typecheck in
 * Phase 3). Keeping one definition matters more here than elsewhere: a drifted
 * guard still looks present but silently stops protecting.
 */

/**
 * Wrap a historical summary in the stale-replay guard.
 *
 * Guard semantics:
 *   - declare this is a frozen snapshot of a prior conversation, not a live
 *     instruction of the current session
 *   - task descriptions / skill calls / ARGUMENTS payloads inside it are
 *     STALE by default and must not be re-executed
 *   - action requires an explicit user request in the current session
 *   - but: the user's GOAL AND INTENT stay live — intent explains why the work
 *     happened and must inform the current turn; only the *actions* are stale
 *     （2026-10-02 实测教训：把「任务」整体判成过期，会让接手方只抱住待办清单
 *     而丢掉最初的目的——用户原话「压缩之后你屁都记不得」即此）
 *   - but: "（待验证）" items should be re-checked, and pending TODOs /
 *     "下一步" should be continued — these are forward-looking, not replay
 *
 * Empty content returns an empty string (no empty guard block is produced).
 */
export const wrapHistoricalSummaryWithReplayGuard = (
  summary: string,
): string => {
  const trimmed = summary.trim();
  if (!trimmed) return "";

  return [
    "【历史参考，非活指令】以下为冻结摘要：其中的**动作指令**、参数与 skill 调用默认已经做过，不要重放（重复建分支/issue/任务就是重放）。",
    "但**用户的目标与意图仍然有效**：它解释了这段对话为什么要做这些事；遇到相关话题时先按它理解上下文，不要当成已过期的背景。",
    `摘要中标注「（待验证）」的项需复核确认；未完成待办和「下一步」需继续推进——这些是续作方向，不是重放指令。`,
    trimmed,
  ].join("\n");
};