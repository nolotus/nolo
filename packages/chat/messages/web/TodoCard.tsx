import * as stylex from "@stylexjs/stylex";
import React from "react";
import type { ToolProps } from "./ToolMessageTypes";
import type { TodoItem } from "ai/tools/agent/setTodoListTool";
import { todoCardStyles as styles } from "./todoCardStyles";
import { withLiteralClass } from "./toolMessageShared";

export interface TodoCardProps extends Partial<ToolProps> {
  rawData?: any;
  isError?: boolean;
}

const IconListTodo = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...stylex.props(styles.headerIcon)}
  >
    <rect x="3" y="5" width="6" height="6" rx="1" />
    <path d="m3 17 2 2 4-4" />
    <path d="M13 6h8" />
    <path d="M13 12h8" />
    <path d="M13 18h8" />
  </svg>
);

const IconCheckCircle = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...stylex.props(styles.icon, styles.iconDone)}
    aria-label="completed"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconLoader = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...stylex.props(styles.icon, styles.iconInProgress)}
    aria-label="in progress"
  >
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const IconCircle = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...stylex.props(styles.icon, styles.iconPending)}
    aria-label="pending"
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export const TodoCard: React.FC<TodoCardProps> = ({ rawData, isError }) => {
  if (isError) return null;

  let todos: TodoItem[] = [];
  if (rawData) {
    let parsed = rawData;
    if (typeof rawData === "string") {
      try {
        parsed = JSON.parse(rawData);
      } catch {
        parsed = null;
      }
    }
    if (parsed && Array.isArray(parsed.todos)) {
      todos = parsed.todos;
    } else if (Array.isArray(parsed)) {
      todos = parsed;
    }
  }

  if (!todos || todos.length === 0) {
    return (
      <div
        data-testid="chat-todo-card"
        {...withLiteralClass("chat-todo-card", styles.card)}
      >
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.titleWrap)}>
            <IconListTodo />
            <span>任务清单</span>
          </div>
          <span {...withLiteralClass("chat-todo-progress-text", styles.progressText)}>已清空</span>
        </div>
      </div>
    );
  }

  const doneCount = todos.filter((t) => t.status === "done").length;
  const progressPercent = Math.round((doneCount / todos.length) * 100);

  return (
    <div
      data-testid="chat-todo-card"
      {...withLiteralClass("chat-todo-card", styles.card)}
    >
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.titleWrap)}>
          <IconListTodo />
          <span>任务清单</span>
        </div>
        <span
          data-testid="chat-todo-progress-text"
          {...withLiteralClass("chat-todo-progress-text", styles.progressText)}
        >
          {doneCount} / {todos.length} ({progressPercent}%)
        </span>
      </div>

      <div
        data-testid="chat-todo-progress-bar-bg"
        {...withLiteralClass("chat-todo-progress-bar-bg", styles.progressBarBg)}
      >
        <div
          {...stylex.props(styles.progressBarFill)}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div {...stylex.props(styles.list)}>
        {todos.map((item, index) => {
          const status = item.status || "pending";
          const isDone = status === "done";
          const isInProgress = status === "in_progress";
          return (
            <div
              key={index}
              data-testid={`todo-item-${index}`}
              data-status={status}
              {...withLiteralClass(`chat-todo-item status-${status}`, styles.item)}
            >
              {isDone && <IconCheckCircle />}
              {isInProgress && <IconLoader />}
              {status === "pending" && <IconCircle />}
              <span
                {...stylex.props(
                  styles.text,
                  isDone && styles.textDone,
                  isInProgress && styles.textInProgress
                )}
              >
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodoCard;
