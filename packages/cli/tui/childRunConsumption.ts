/**
 * 子 run 完成结果的消费边界（纯函数层）。
 *
 * 职责单一：决定「这条 child-run-completed 事件里，哪些 run 该由当前对话消费」。
 * 三件事，按顺序：
 *   1. 归属：只留 parentDialogId === 当前对话的 run，其余交给 deferRuns 暂存
 *      （等用户切回原对话再投，见 runCompletionWatcher 的 resumePendingDelivery）。
 *   2. 去重：磁盘 claim 是权威——已被别的消费者领走的 run 不再重复注入。
 *   3. 投影：过滤后的 run 重建 text/displayText，保证注入文本与存活集合一致
 *      （不靠改渲染文本来"过滤"，那会让身份与显示脱节）。
 *
 * 历史（2026-11-15 owner 决定）：本模块此前还导出 canConsumeChildCompletion，
 * 要求「auto-review 任务存在时必须 active、且 acceptance 不是 pending/unknown」
 * 才允许消费。已删除——「子 run 跑完了」是客观事实，与「要不要合并/提交」
 * 是两件事；旧门在任务 paused 或 acceptance=unknown 时会静默攒住/丢弃完成
 * 事件，导致对话不自动接续（现场表现：后台任务已完成，但要按 Enter 才继续）。
 *
 * 已知取舍（删除后的行为边界，非缺陷）：
 * 旧门顺带拦住了 `authorization=paused` 时「起一个 provider turn」这件事。
 * 删除后，暂停状态下子 run 完成会真的起一轮，模型带工具、可以在该轮内继续
 * 动手。owner 明确接受这个取舍：pause 的语义是「别再自动推进 review/commit
 * 流程」，不是「冻结对话」。
 *
 * 后续：auto-review 续跑状态机与 host task 基础设施已于 2026-11-15 整体移除，
 * 这里不再有 continuation 分支或 paused 守卫可引用——当前行为就是「子 run
 * 完成即接续」，无额外准入判断。
 */

import type { ChildRunCompletedTurnEvent } from "core/chat/internalTurnEvent";
import { resolveRunsDir } from "../agentRunControl";
import { filterUnclaimedChildRuns, buildWakeMessage, buildWakeDisplayText } from "./runCompletionWatcher";
import { traceChildRunWake } from "./runWakeDiagnostics";

/** 消费边界的宿主依赖：环境、当前对话、以及非本对话 run 的去处。 */
export type ChildRunConsumptionHost = {
  env: Record<string, string | undefined>;
  currentDialogId: string | null;
  deferRuns: (runs: ChildRunCompletedTurnEvent["runs"]) => void;
};

/**
 * 把一条 child-run-completed 事件收敛成本对话真正要消费的那部分。
 * 返回 null 表示没有可消费的 run（全部已 claim 或全部不属本对话）。
 */
export function prepareChildRunConsumption(
  event: ChildRunCompletedTurnEvent,
  host: ChildRunConsumptionHost,
): ChildRunCompletedTurnEvent | null {
  const now = Date.now();
  const ownedRuns = event.runs.filter(
    (run) => !!run.parentDialogId && run.parentDialogId === host.currentDialogId,
  );
  const deferredRuns = event.runs.filter(
    (run) => !run.parentDialogId || run.parentDialogId !== host.currentDialogId,
  );
  if (deferredRuns.length) host.deferRuns(deferredRuns);

  const { remainingRuns, claimedRunIds } = filterUnclaimedChildRuns(ownedRuns, {
    env: host.env,
    now: () => now,
  });
  traceChildRunWake("consume-claim-filter", event, host.currentDialogId, {
    remainingCount: remainingRuns.length,
    claimedCount: claimedRunIds.length,
  });

  if (!remainingRuns.length) return null;
  // 未被过滤时原样返回，保留调用方传入的身份引用（receipt settlement 依赖它）。
  if (remainingRuns.length === event.runs.length) return event;
  return {
    ...event,
    runs: remainingRuns,
    text: buildWakeMessage(remainingRuns, now, {
      // 与 run 注册表同一个有效 runs 目录（自定义 NOLO_HOME 也要内联）。
      trustedResultDirs: [resolveRunsDir(host.env)],
    }),
    displayText: buildWakeDisplayText(remainingRuns, now),
  };
}
