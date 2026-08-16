// packages/render/table/kanbanHelpers.tsx
import React from "react";
import {
  LuListTodo,
  LuPlay,
  LuOctagonAlert,
  LuClock,
  LuCheck,
  LuFolderOpen,
  LuUser,
  LuFlag,
  LuCalendar,
  LuTag,
  LuFileText,
} from "react-icons/lu";

export interface KanbanStatusHeaderInfo {
  icon: React.ReactNode;
  color: string;
}

/**
 * 状态列头 Icon 与主题配色映射（纯函数，可组合/可测试）
 */
export const getKanbanStatusHeaderInfo = (groupValue: string): KanbanStatusHeaderInfo => {
  const val = String(groupValue ?? "").trim().toLowerCase();
  if (val.includes("待处理") || val.includes("待办") || val.includes("todo") || val.includes("to call")) {
    return { icon: <LuListTodo size={14} />, color: "#d97706" };
  }
  if (val.includes("进行中") || val.includes("in progress") || val.includes("called")) {
    return { icon: <LuPlay size={13} />, color: "#2563eb" };
  }
  if (val.includes("阻塞") || val.includes("blocked") || val.includes("error")) {
    return { icon: <LuOctagonAlert size={14} />, color: "#dc2626" };
  }
  if (val.includes("等待") || val.includes("waiting") || val.includes("booked")) {
    return { icon: <LuClock size={14} />, color: "#7c3aed" };
  }
  if (val.includes("已完成") || val.includes("done") || val.includes("completed") || val.includes("signed")) {
    return { icon: <LuCheck size={14} />, color: "#059669" };
  }
  return { icon: <LuFolderOpen size={14} />, color: "#64748b" };
};

/**
 * 卡片属性字段图标映射（纯函数，可组合/可测试）
 */
export const getKanbanFieldIcon = (columnName: string): React.ReactNode => {
  const name = String(columnName ?? "").toLowerCase();
  if (name.includes("负责人") || name.includes("owner") || name.includes("assignee") || name.includes("user") || name.includes("agent")) {
    return <LuUser size={13} style={{ color: "#64748b", flexShrink: 0 }} />;
  }
  if (name.includes("优先级") || name.includes("priority")) {
    return <LuFlag size={13} style={{ color: "#d97706", flexShrink: 0 }} />;
  }
  if (name.includes("时间") || name.includes("日期") || name.includes("date") || name.includes("time")) {
    return <LuCalendar size={13} style={{ color: "#7c3aed", flexShrink: 0 }} />;
  }
  if (name.includes("标签") || name.includes("tag") || name.includes("category")) {
    return <LuTag size={13} style={{ color: "#0891b2", flexShrink: 0 }} />;
  }
  return <LuFileText size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />;
};

/**
 * 格式化卡片停留/更新相对时间（如 2d, 5h, 12m）
 */
export const formatKanbanRelativeAge = (row: any): string => {
  const rawTs = row?.updatedAt ?? row?.createdAt ?? row?._updatedAt;
  if (!rawTs) return "";
  const date = new Date(rawTs);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "";
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};
