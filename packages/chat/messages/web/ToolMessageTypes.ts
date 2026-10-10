// 文件路径: chat/messages/web/ToolMessageTypes.ts

export interface ToolProps {
  rawData: any;
  isError: boolean;
  t: (key: string, options?: string | any) => string;
  openPreview: (key: string, name: string) => void;
  navigateToPage: (id: string) => void;
  /**
   * `groupDetail`: row label already shows the action (e.g. command); expand
   * body should only show result content — no repeated shell prompt chrome.
   */
  presentation?: "default" | "groupDetail";
  /**
   * 工具调用参数，供需要从 args 取值的 renderer 用（如 fetchWebpage 的 url）。
   */
  toolArgs?: Record<string, unknown>;
  /** Whether conversation Todo UI is enabled for this host/dialog. */
  conversationTodoEnabled?: boolean;
}

/* --- 工具函数：根据路径猜测语言，高亮用 --- */
export function guessLanguageFromPath(
  path: string | undefined
): string | undefined {
  if (!path) return undefined;
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css") || path.endsWith(".scss") || path.endsWith(".less"))
    return "css";
  if (path.endsWith(".md")) return "markdown";
  return undefined;
}
