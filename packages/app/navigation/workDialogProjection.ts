/** Navigation V2 Work grouping. Pure projection: never changes dialog/run records. */
export type WorkGroup = "needs-you" | "working" | "recent";
export type WorkRunSignal = "live" | "waiting-user" | "unknown" | "requires-action" | "terminal";
export interface WorkDialogItem {
  dialogKey: string;
  spaceId?: string | null;
  projectId?: string | null;
  updatedAt: number;
  /** An explicit user action is pending; not inferred from a normal finished reply. */
  needsUserAction?: boolean;
  /** Distinct run signals for a dialog with multiple concurrent runs. */
  runs?: readonly WorkRunSignal[];
}
export interface GroupedWorkItem extends WorkDialogItem { group: WorkGroup }
export type WorkGroups = Record<WorkGroup, GroupedWorkItem[]>;

/** Action required outranks running; finished or idle dialogs remain Recent. */
export function getWorkGroup(dialog: WorkDialogItem): WorkGroup {
  if (dialog.needsUserAction || dialog.runs?.some((r) =>
    r === "waiting-user" || r === "unknown" || r === "requires-action"
  )) return "needs-you";
  if (dialog.runs?.includes("live")) return "working";
  return "recent";
}

/**
 * 同一 Dialog 的多条记录（乱序分页 / 多来源合并）必须**合并**而不是先到先得：
 * 先到先得会把更新的一条（含 live 信号）静默丢掉，让正在运行的对话落进「最近」。
 * 合并规则：信号取并集、updatedAt 取最新、needsUserAction 取或、空缺字段先到先得。
 */
export function groupWorkDialogs(dialogs: readonly WorkDialogItem[]): WorkGroups {
  const groups: WorkGroups = { "needs-you": [], working: [], recent: [] };
  const merged = new Map<string, WorkDialogItem>();
  for (const dialog of dialogs) {
    if (!dialog.dialogKey) continue;
    const existing = merged.get(dialog.dialogKey);
    if (!existing) {
      merged.set(dialog.dialogKey, { ...dialog, runs: dialog.runs ? [...dialog.runs] : undefined });
      continue;
    }
    const signals = new Set<WorkRunSignal>([...(existing.runs ?? []), ...(dialog.runs ?? [])]);
    merged.set(dialog.dialogKey, {
      ...existing,
      spaceId: existing.spaceId ?? dialog.spaceId,
      projectId: existing.projectId ?? dialog.projectId,
      updatedAt: Math.max(existing.updatedAt, dialog.updatedAt),
      needsUserAction: existing.needsUserAction === true || dialog.needsUserAction === true,
      runs: signals.size > 0 ? [...signals] : undefined,
    });
  }
  for (const dialog of merged.values()) {
    const group = getWorkGroup(dialog);
    groups[group].push({ ...dialog, group });
  }
  for (const group of Object.values(groups)) {
    // 同秒并列时用稳定的字符串比较兜底（不用 localeCompare：结果随环境 locale 变化）。
    group.sort((a, b) => b.updatedAt - a.updatedAt ||
      (a.dialogKey < b.dialogKey ? -1 : a.dialogKey > b.dialogKey ? 1 : 0));
  }
  return groups;
}

/** One chronological list. Status is metadata, never a sorting priority. */
export function sortWorkDialogTimeline(groups: WorkGroups): GroupedWorkItem[] {
  return [...groups["needs-you"], ...groups.working, ...groups.recent].sort(
    (a, b) => b.updatedAt - a.updatedAt ||
      (a.dialogKey < b.dialogKey ? -1 : a.dialogKey > b.dialogKey ? 1 : 0),
  );
}
