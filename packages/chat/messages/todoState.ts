import type { TodoItem } from "ai/tools/agent/setTodoListTool";

export type TodoState = {
  todos: TodoItem[];
  sourceMessageId?: string;
};

function parseJson(value: unknown): any {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function normalizeTodos(value: unknown): TodoItem[] | undefined {
  const parsed = parseJson(value);
  const todos = Array.isArray(parsed) ? parsed : parsed?.todos;
  if (!Array.isArray(todos)) return undefined;
  return todos
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      title: typeof item.title === "string" ? item.title : "Untitled Task",
      status:
        item.status === "done" || item.status === "in_progress"
          ? item.status
          : "pending",
    }));
}

/**
 * Resolve the latest conversation Todo from persisted tool messages.
 * The latest setTodoList call is the dialog's current snapshot; an empty list
 * is intentional and means the current Todo has been cleared.
 */
export function selectLatestConversationTodo(messages: readonly any[]): TodoState | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "tool" || message?.toolName !== "setTodoList") continue;
    const todos = normalizeTodos(message.content);
    if (!todos) continue;
    return {
      todos,
      ...(typeof message.id === "string" ? { sourceMessageId: message.id } : {}),
    };
  }
  return null;
}
