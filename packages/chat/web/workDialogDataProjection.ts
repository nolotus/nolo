import { mergeSharedHistoryItems } from "./sharedHistoryMerge";
import type { RemoteTaskCard } from "./agentRunStore";
import { toTimestamp, type MyContentListItem } from "app/utils/myContentItems";
import { parseDialogKey } from "database/dialogKey";
import type { SharedSpaceDialogSummary } from "database/client/sharedSpaceDialogPage";
import { groupWorkDialogs, type WorkDialogItem, type WorkGroups, type WorkRunSignal } from "app/navigation/workDialogProjection";

/**
 * Adapter from existing user-owned dialog list and remote-task evidence.
 * This is a bounded list projection, NOT an exhaustive historical dialog index.
 * Caller supplies an already-authorized listing; no access decisions happen here.
 */
export function projectWorkDialogData(
  items: readonly MyContentListItem[],
  remoteTasks: readonly RemoteTaskCard[],
  options: {
    userId: string;
    sharedItems?: readonly SharedSpaceDialogSummary[];
    dialogStatuses?: Readonly<Record<string, string>>;
    dialogEventTimestamps?: Readonly<Record<string, number>>;
    now?: number;
    /** Actual run start/finish times; never receipt/heartbeat/token timestamps. */
    runActivityTimestamps?: Readonly<Record<string, number>>;
    /** 有时间锚点支撑「仍在运行」的对话。 */
    liveDialogIds?: ReadonlySet<string>;
    /** 无法可靠判定运行状态的对话：不得宣称仍运行，也不得宣称已结束。 */
    uncertainDialogIds?: ReadonlySet<string>;
    /** Explicit per-dialog pending user confirmation from an authoritative runtime subscriber. */
    waitingUserByDialogKey?: Readonly<Record<string, boolean>>;
  },
): WorkGroups {
  const signalsById = new Map<string, WorkRunSignal[]>();
  for (const task of remoteTasks) {
    const id = task.ownerDialogId;
    if (!id) continue; // unowned runs belong in global tasks, not an invented dialog
    // 远端任务卡的 activity 是「证据新鲜度」的投影，**不能**直接充当存活断言：
    // 服务端把历史记录 hydrate 进 store 时会刷新 lastEvidenceAt，旧任务也会
    // 呈现为 live。存活只由 liveDialogIds（有服务端状态 / 时间锚点）给出；
    // 远端任务卡只用来表达「需要处置 / 状态未知 / 已停止」。
    const signal: WorkRunSignal | undefined = task.activity === "unknown" ? "unknown"
      : task.activity === "requires_action" ? "requires-action"
      // Reclaimed means cleanup TTL elapsed, not that the executor stopped.
      : task.activity === "reclaimed" ? "unknown"
      : task.activity === "terminal" ? "terminal"
      : undefined;
    if (!signal) continue;
    const signals = signalsById.get(id) ?? [];
    signals.push(signal);
    signalsById.set(id, signals);
  }
  const dialogs: WorkDialogItem[] = [];
  for (const item of items) {
    if (item.type !== "dialog") continue;
    const parsed = parseDialogKey(item.contentKey);
    if (!parsed || (parsed.userId !== options.userId && parsed.userId !== "local")) continue;
    const isLocal = parsed.userId === "local";
    // Dialog IDs are only unique within an owner. Runtime state maps are
    // account-scoped, so never apply them to a same-suffix device-local row.
    const signals = isLocal ? [] : [...(signalsById.get(parsed.dialogId) ?? [])];
    // Space dialog SSE only has running/done/failed, not user-required evidence.
    // Never classify a normal done or failed turn as "Needs you" automatically.
    // SSE has no heartbeat; do not indefinitely treat its last running event as live.
    // A stale status is inconclusive, not proof of a failed or completed run.
    const eventAt = options.dialogEventTimestamps?.[parsed.dialogId];
    const now = options.now ?? Date.now();
    const recentSse = typeof eventAt === "number" && Number.isFinite(eventAt) &&
      eventAt <= now && now - eventAt < 90_000;
    // A known terminal task must not be resurrected by an older SSE running flag.
    const hasTerminalTask = signals.includes("terminal");
    const isLive = !isLocal && options.liveDialogIds?.has(parsed.dialogId) === true;
    const isUncertain = !isLocal && options.uncertainDialogIds?.has(parsed.dialogId) === true;
    const hasRecentSse = !isLocal && recentSse && options.dialogStatuses?.[parsed.dialogId] === "running";
    if ((isLive || (hasRecentSse && !hasTerminalTask)) && !signals.includes("live")) {
      signals.push("live");
    } else if (isUncertain && !signals.includes("live") && !signals.includes("terminal")) {
      // 状态不确定 ≠ 已结束：进入注意力分组，不冒充「最近（已完成）」。
      signals.push("unknown");
    }
    dialogs.push({
      dialogKey: item.contentKey,
      spaceId: item.spaceId,
      // SSE timestamps only advance on created/done/failed, not streamed tokens.
      // Device-local and shared rows must not borrow account-scoped runtime evidence.
      updatedAt: Math.max(toTimestamp(item.updatedAt),
        !isLocal && typeof eventAt === "number" && Number.isFinite(eventAt) && eventAt <= now ? eventAt : 0,
        !isLocal && Number.isFinite(options.runActivityTimestamps?.[parsed.dialogId]) &&
          options.runActivityTimestamps![parsed.dialogId]! <= now
          ? options.runActivityTimestamps![parsed.dialogId]! : 0),
      runs: signals,
      needsUserAction: options.waitingUserByDialogKey?.[item.contentKey] === true,
    });
  }
  for (const item of mergeSharedHistoryItems(options.sharedItems ?? [])) {
    if (item.type !== "dialog" || !item.ownerUserId || item.ownerUserId === options.userId) continue;
    dialogs.push({ dialogKey: item.contentKey, spaceId: item.spaceId, updatedAt: toTimestamp(item.updatedAt), runs: [] });
  }
  return groupWorkDialogs(dialogs);
}
