import { isRecord } from "core/isRecord";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import { resolveSelectOptions } from "./selectCellUtils";
import type { TableColumn, TableMeta, TableView } from "./types";

export const NOLO_TASK_BOARD_TABLE_ID = "01KWSK4Q4TESXQ06SW39JN2TTJ";

export type TableDisplayMode =
  | { type: "grid" }
  | {
      type: "kanban";
      viewName: string;
      groupColumnName: string;
      visibleColumnNames: string[];
      preferredGroupValues: string[];
    };

// 意图：仅排除表格行序号/自增排序列（序号、编号、#、seq、index 等），避免它们占用看板泳道与卡片正文。
// 边界：只做「整名精确匹配」——「订单编号」这类业务列不会命中；反过来，机器名恰好叫 index / no 的列
// 会被判成序号（模型建表常用英文短名造序号列），这是本判定的已知取舍。
export function isKanbanSequenceColumn(column: TableColumn): boolean {
  return /^(序号|编号|sequence|seq|index|row_?number|serial_?number|no\.?|#)$/i.test(column.name.trim())
    || /^(序号|编号)$/.test(column.label?.trim() ?? "");
}

export function getKanbanTitleColumn(columns: TableColumn[]): TableColumn | undefined {
  const primary = columns.find((column) => column.isPrimary) ?? columns[0];
  if (primary && !isKanbanSequenceColumn(primary)) return primary;
  return columns.find((column) => !isKanbanSequenceColumn(column)
    && /^(任务名|任务名称|任务标题|标题|名称)$/.test(column.label ?? column.name))
    ?? columns.find((column) => !isKanbanSequenceColumn(column) && /^(title|name)$/i.test(column.name));
}

export const EMPTY_TABLE_COLUMNS: TableColumn[] = [];
export const GRID_DISPLAY_MODE: TableDisplayMode = { type: "grid" };

export type TableActivityBadgeInfo = {
  dialogId: string;
  dialogKey?: string;
  status?: string;
  label: string;
  title: string;
  tone: "neutral" | "running" | "success" | "danger";
};

const TASK_BOARD_STATUS_ORDER = [
  "待办",
  "进行中",
  "等待确认",
  "已完成",
];

export function normalizeKanbanStatusValue(status: string | null | undefined): string {
  const val = String(status ?? "").trim();
  if (!val || val === "未分类" || val === "待处理") {
    return "待办";
  }
  return val;
}

/** 获取适合作为看板分组候选的列清单（排除 primary 标题列与序号/编号列） */
export function getKanbanGroupColumnCandidates(columns: TableColumn[]): TableColumn[] {
  if (!Array.isArray(columns) || columns.length === 0) return [];
  return columns.filter((col) => !col.isPrimary && !isKanbanSequenceColumn(col));
}

const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  pending: "等待中",
  queued: "等待中",
  accepted: "已接收",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  failed_to_start: "启动失败",
  timed_out: "超时",
};

function findColumnById(columns: TableColumn[], columnId?: string) {
  if (!columnId) return null;
  return columns.find((column) => column.id === columnId) ?? null;
}

function findColumnByName(columns: TableColumn[], columnName: string) {
  return columns.find((column) => column.name === columnName) ?? null;
}

export function findColumnByNameOrLabel(
  columns: TableColumn[],
  candidates: string[]
) {
  const normalizedCandidates = candidates.map((candidate) => candidate.trim());
  return (
    columns.find((column) => normalizedCandidates.includes(column.name)) ??
    columns.find(
      (column) =>
        typeof column.label === "string" &&
        normalizedCandidates.includes(column.label.trim())
    ) ??
    null
  );
}

function visibleNamesFromView(columns: TableColumn[], view: TableView) {
  if (!Array.isArray(view.visibleColumnIds) || view.visibleColumnIds.length === 0) {
    return columns.map((column) => column.name);
  }
  const names = view.visibleColumnIds
    .map((columnId) => findColumnById(columns, columnId)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : columns.map((column) => column.name);
}

function valuesForGroupColumn(column: TableColumn) {
  if (Array.isArray(column.options) && column.options.length > 0) {
    return column.options;
  }
  if (column.name === "status") {
    return TASK_BOARD_STATUS_ORDER;
  }
  return [];
}

// 筛选下拉的选项来源与 select 单元格编辑器一致，逻辑收敛到
// ./selectCellUtils.resolveSelectOptions（options 保序 ∪ 行值去重）。
export function getColumnFilterOptions(
  column: Pick<TableColumn, "name" | "options"> | null,
  rows: Record<string, unknown>[]
) {
  return resolveSelectOptions(column, rows);
}

function normalizeActivityRef(value: unknown) {
  if (!isRecord(value)) return null;
  if (value.type !== "dialog") return null;
  const dialogId = asTrimmedString(value.dialogId);
  if (!dialogId) return null;
  const dialogKey = asOptionalTrimmedString(value.dialogKey);
  const status = asOptionalTrimmedString(value.status);
  return { dialogId, dialogKey, status };
}

function activityTone(status?: string): TableActivityBadgeInfo["tone"] {
  if (status === "running") return "running";
  if (status === "completed") return "success";
  if (status === "failed" || status === "failed_to_start" || status === "timed_out") {
    return "danger";
  }
  return "neutral";
}

function shortDialogId(dialogId: string) {
  return dialogId.length > 10 ? `${dialogId.slice(0, 6)}…${dialogId.slice(-4)}` : dialogId;
}

export function getLatestTableActivityBadge(row: Record<string, unknown>): TableActivityBadgeInfo | null {
  const meta = row?.meta;
  const metaRecord = isRecord(meta) ? (meta as Record<string, unknown>) : null;
  if (!metaRecord) return null;

  const latest =
    normalizeActivityRef(metaRecord.latestActivityRef) ??
    (Array.isArray(metaRecord.activityRefs)
      ? normalizeActivityRef(metaRecord.activityRefs[metaRecord.activityRefs.length - 1])
      : null);
  if (!latest) return null;

  const statusLabel = latest.status ? ACTIVITY_STATUS_LABELS[latest.status] ?? latest.status : "对话";
  return {
    ...latest,
    label: `${statusLabel} · ${shortDialogId(latest.dialogId)}`,
    title: `Dialog ${latest.dialogId}${latest.status ? ` · ${statusLabel}` : ""}`,
    tone: activityTone(latest.status),
  };
}

const MARKDOWN_TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

function markdownTableCellCount(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return 0;

  const content =
    trimmed.startsWith("|") && trimmed.endsWith("|")
      ? trimmed.slice(1, -1)
      : trimmed;
  const cells = content.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => cell.length > 0)
    ? cells.length
    : 0;
}

function isMarkdownTableSeparator(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;

  const content =
    trimmed.startsWith("|") && trimmed.endsWith("|")
      ? trimmed.slice(1, -1)
      : trimmed;
  const cells = content.split("|").map((cell) => cell.trim());
  return (
    cells.length >= 2 &&
    cells.every((cell) => MARKDOWN_TABLE_SEPARATOR_CELL.test(cell))
  );
}

export function containsMarkdownTable(value: string) {
  const lines = value.split(/\r?\n/);

  for (let index = 1; index < lines.length; index += 1) {
    if (!isMarkdownTableSeparator(lines[index])) continue;

    const headerCellCount = markdownTableCellCount(lines[index - 1]);
    if (headerCellCount < 2) continue;

    const separatorCellCount = markdownTableCellCount(lines[index]);
    if (separatorCellCount === headerCellCount) return true;
  }

  return false;
}

export function shouldRenderKanbanMarkdownTable(tableId: string | undefined, value: string) {
  return tableId === NOLO_TASK_BOARD_TABLE_ID && containsMarkdownTable(value);
}

export function resolveTableDisplayMode(tableMeta: Pick<TableMeta, "tableId" | "columns" | "views">): TableDisplayMode {
  const columns = Array.isArray(tableMeta.columns) ? tableMeta.columns : [];
  const views = Array.isArray(tableMeta.views) ? tableMeta.views : [];
  const defaultView = views.find((view) => view.isDefault) ?? views[0];

  if (defaultView?.type === "kanban") {
    const groupColumn = findColumnById(columns, defaultView.group?.columnId);
    if (groupColumn) {
      return {
        type: "kanban",
        viewName: defaultView.name || "看板",
        groupColumnName: groupColumn.name,
        visibleColumnNames: visibleNamesFromView(columns, defaultView),
        preferredGroupValues: valuesForGroupColumn(groupColumn),
      };
    }
  }

  if (tableMeta.tableId === NOLO_TASK_BOARD_TABLE_ID) {
    const statusColumn = findColumnByName(columns, "status");
    if (statusColumn) {
      return {
        type: "kanban",
        viewName: "看板",
        groupColumnName: statusColumn.name,
        visibleColumnNames: ["title", "tags", "priority", "owner", "progress", "result"].filter((name) =>
          Boolean(findColumnByName(columns, name))
        ),
        preferredGroupValues: TASK_BOARD_STATUS_ORDER,
      };
    }
  }

  return { type: "grid" };
}
