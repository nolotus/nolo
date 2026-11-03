// packages/ai/types.ts

export type ModeType =
  | "text"
  | "image"
  | "stream"
  | "audio"
  | "speech"
  | "surf"
  | "vision";

export interface PromptFormData {
  name: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface Contexts {
  // High priority: context from the user's current input for this request.
  currentInputContext?: string | null;

  // Medium priority: references from past conversation messages.
  historyContext?: string | null;

  // Specific rules and processes for the bot/agent.
  botInstructionsContext?: string | null;

  // General knowledge base documents for lookup.
  botKnowledgeContext?: string | null;

  // 🔹 新增：用户级通用提示词
  userGlobalPrompt?: string;

  /** 当前正在编辑的对象描述（表格 / 页面 / 文章等），由 buildEditingContextSummary 构造 */
  editingContext?: string | null;

  /** 当前对话里最近一次 app 相关工具调用提炼出的工作记忆，不依赖右侧 editing target */
  appWorkingMemory?: string | null;

  /** 当前所在的 Space 信息（Agent 所处的工作台），包含标题、描述等 */
  spaceContext?: string | null;

  /** 用户偏好与自动化边界（tone / capture / read policy） */
  userPolicyContext?: string | null;

  /** 长期记忆召回层，由服务端 memory API 基于当前用户、space、agent 和输入生成 */
  memoryOverlay?: string | null;

  /** 对话增量摘要：已压缩的历史消息概要 */
  dialogSummary?: string | null;

  /**
   * 请求级上下文块（项目上下文、浏览上下文等）：只拼进本轮 system prompt，
   * 永远不写进用户消息文本。
   *
   * 与 `currentInputContext` 的区别是来源：这里的内容由调用方在发送时组装，
   * 不对应用户说过的话；历史上它们被字符串拼进 userInput，于是
   * `<project_context>` 落库并显示在用户气泡里（PR #209 复审 HIGH-1）。
   */
  requestContextBlocks?: string[] | null;

  /** 压缩消息中提取的引用 Key */
  referenceKeys?: string[];

  /** 可选的视口尺寸（便于跨层传递 TUI/Web 视口） */
  viewport?: { width: number; height: number };

  /** 可选的移动端/窄屏标记 */
  isMobile?: boolean;
}
