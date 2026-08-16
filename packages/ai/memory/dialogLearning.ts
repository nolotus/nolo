/**
 * Dialog-end learning: 在对话结束时用 LLM 从对话轨迹中提取可复用的过程性知识。
 *
 * 与 understanding.ts（正则提取用户意图/偏好）互补：
 * - understanding 提取 preference/tension/goal/style（用户是谁）
 * - dialogLearning 提取 error_resolution/workaround/repeated_workflow（怎么解决问题）
 *
 * 触发点：captureCompletedMemoryTurn（确定性，每次 agent run 结束）
 * 写入：kind=procedural, confidence=0.5, tags=["dialog-learning", ...]
 *
 * ECC continuous-learning-v2 的核心洞察：hook 是 100% 可靠的，skill 是 50-80%。
 * bun-nolo 的 captureCompletedMemoryTurn 已经是确定性触发点，只需在此加入 LLM 提取。
 */

import type { AgentRuntimeChatMessage as ChatMessage } from "agent-runtime/types";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./storeShared";
import { loadMemoryCandidatesFromDb } from "./queryShared";
import { buildAgentSubjectTarget, resolveUserOrSpaceMemoryTarget } from "./scope";
import type { MemoryItem, MemoryOwnerRef, MemoryVisibility } from "./types";

/** LLM 调用函数签名——由调用方注入（server: 直接 fetch, client: dispatch(runLlm)） */
export type DialogLearningLlmCall = (systemPrompt: string, content: string) => Promise<string>;

export interface DialogLearningCandidate {
  /** 模式类型：error_resolution / workaround / repeated_workflow / user_correction */
  pattern: string;
  /** 提取出的可复用知识内容 */
  content: string;
}

export interface CaptureDialogLearningsInput {
  db: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
  dialogId: string;
  /** 对话轨迹（至少包含 user/assistant 消息） */
  trace: ChatMessage[];
  /** LLM 调用函数——若未提供则跳过 */
  llmCall?: DialogLearningLlmCall;
}

const DIALOG_LEARNING_TAG = "dialog-learning";

const MAX_TRACE_MESSAGES = 30;
const MAX_CONTENT_CHARS = 8000;

const DIALOG_LEARNING_SYSTEM_PROMPT = `你是一个对话学习提取器。你的任务是从一段对话中提取可复用的过程性知识。

只提取以下几类模式，没有就返回空数组：

1. error_resolution：遇到了什么错误/问题，怎么解决的。例如"用 X 命令修复了 Y 问题"。
2. workaround：绕过某个限制或问题的变通方法。例如"A 方案不行，改用 B 方案绕过"。
3. repeated_workflow：用户反复执行的操作流程，值得记住以便下次自动建议。例如"每次部署前都要先跑 X 再跑 Y"。
4. user_correction：用户纠正了 agent 的错误认知或行为。例如"agent 以为用 A，但用户说应该用 B"。

严格要求：
- 只提取明确发生在对话中的模式，不要推测或编造。
- 每条提取的内容应该是一句完整的、可独立理解的知识，不依赖对话上下文。
- 使用对话主语言。
- 如果对话中没有可提取的模式，返回空数组 []。
- 不要提取寒暄、闲聊、事实陈述、用户偏好（偏好由其他系统处理）。

输出格式：JSON 数组，每个元素包含 pattern 和 content 两个字段。
示例：
[{"pattern":"error_resolution","content":"Ollama 连接超时是因为端口被占用，用 lsof -i :port 查找并 kill 进程"},{"pattern":"workaround","content":"DeepSeek API 不支持 JSON mode，改用 prompt 约束输出格式"}]

只输出 JSON 数组，不要其他文字。`;

/** 从 ChatMessage[] 提取对话文本 */
const traceToText = (trace: ChatMessage[]): string => {
  const recent = trace.slice(-MAX_TRACE_MESSAGES);
  const lines: string[] = [];
  for (const msg of recent) {
    const role = msg.role === "assistant" ? "A" : msg.role === "user" ? "U" : msg.role === "tool" ? "T" : "?";
    const text = contentToText(msg.content);
    if (text) lines.push(`${role}: ${text}`);
  }
  const joined = lines.join("\n");
  return joined.length > MAX_CONTENT_CHARS
    ? joined.slice(0, MAX_CONTENT_CHARS) + "\n[...truncated]"
    : joined;
};

const contentToText = (content: ChatMessage["content"]): string => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part?.type === "text" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
};

const VALID_PATTERNS = new Set([
  "error_resolution",
  "workaround",
  "repeated_workflow",
  "user_correction",
]);

/** 解析 LLM 返回的 JSON 数组 */
export const parseDialogLearningResponse = (raw: string): DialogLearningCandidate[] => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];

  // 尝试直接解析
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // 尝试提取 JSON 数组片段
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const candidates: DialogLearningCandidate[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const pattern = typeof obj.pattern === "string" ? obj.pattern : "";
    const content = typeof obj.content === "string" ? obj.content.trim() : "";
    if (!pattern || !VALID_PATTERNS.has(pattern) || !content) continue;
    if (content.length > 500) continue; // 跳过过长的提取
    candidates.push({ pattern, content });
  }
  return candidates;
};

const buildPatternKey = (pattern: string, content: string): string =>
  `dialog-learning:${pattern}:${content.toLowerCase().slice(0, 100)}`;

const sameDialogLearning = (item: MemoryItem, candidate: DialogLearningCandidate, agentKey: string) =>
  item.subjectType === "agent" &&
  item.subjectId === agentKey &&
  item.patternKey === buildPatternKey(candidate.pattern, candidate.content);

/**
 * 在对话结束时提取可复用的过程性知识。
 * 确定性触发（由 captureCompletedMemoryTurn 调用），LLM 提取，写入 procedural memory。
 *
 * 置信度生命周期：
 * - 初始 0.5（单次观察，低于显式 0.9，高于冷存 0.3）
 * - 跨 dialog 重复：+0.06（复用 understanding 的升级机制，从 episodic 升为 semantic）
 * - 用户纠正：-0.2（复用 correction.ts）
 */
export const captureDialogLearnings = async (
  input: CaptureDialogLearningsInput
): Promise<MemoryItem[]> => {
  if (!input.llmCall) return [];
  if (!input.trace || input.trace.length === 0) return [];

  const target = resolveUserOrSpaceMemoryTarget(input);
  if (!target) return [];
  const subjectTarget = buildAgentSubjectTarget(
    target,
    input.memorySubjectId?.trim() || input.agentKey,
  );

  // 构建对话文本
  const dialogText = traceToText(input.trace);
  if (!dialogText.trim()) return [];

  // 调用 LLM 提取
  let rawResponse: string;
  try {
    rawResponse = await input.llmCall(DIALOG_LEARNING_SYSTEM_PROMPT, dialogText);
  } catch (err) {
    console.warn("[memory] dialog learning LLM call failed", {
      dialogId: input.dialogId,
      error: err,
    });
    return [];
  }

  const candidates = parseDialogLearningResponse(rawResponse);
  if (candidates.length === 0) return [];

  // 加载已有 memory 检查重复
  const existing = await loadMemoryCandidatesFromDb(input.db, {
    owners: [subjectTarget.owner as MemoryOwnerRef],
    subjects: [{ subjectType: subjectTarget.subjectType, subjectId: subjectTarget.subjectId }],
    kinds: ["procedural", "semantic"],
    ownerLimit: 100,
  });

  const saved: MemoryItem[] = [];
  const owner = subjectTarget.owner;
  const visibility = subjectTarget.visibility as MemoryVisibility;

  for (const candidate of candidates) {
    const patternKey = buildPatternKey(candidate.pattern, candidate.content);
    const sameItems = existing.filter((item) => sameDialogLearning(item, candidate, input.agentKey));

    // 已有 semantic 升级版——跳过
    const existingSemantic = sameItems.find((item) => item.kind === "semantic");
    if (existingSemantic) continue;

    // 已有 episodic 且来自不同 dialog——升级为 semantic
    const existingEpisode = sameItems.find((item) => item.kind === "procedural");
    if (
      existingEpisode &&
      existingEpisode.sourceDialogId &&
      existingEpisode.sourceDialogId !== input.dialogId
    ) {
      const semantic = createMemoryItem({
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        visibility,
        subjectType: subjectTarget.subjectType,
        subjectId: subjectTarget.subjectId,
        kind: "semantic",
        content: candidate.content,
        importance: Math.min(0.95, 0.6 + 0.03),
        confidence: Math.min(0.86, 0.5 + 0.06),
        tags: [DIALOG_LEARNING_TAG, `dialog-learning:${candidate.pattern}`, "consolidated-dialog-learning"],
        patternKey,
        sourceKind: "dialog-learning",
        sourceDialogId: input.dialogId,
      });
      await writeMemoryItemWithIndexesToDb(input.db, semantic);
      existing.push(semantic);
      saved.push(semantic);
      continue;
    }

    // 同一 dialog 已有——跳过
    if (existingEpisode && existingEpisode.sourceDialogId === input.dialogId) {
      continue;
    }

    // 新建 procedural
    const procedural = createMemoryItem({
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      visibility,
      subjectType: subjectTarget.subjectType,
      subjectId: subjectTarget.subjectId,
      kind: "procedural",
      content: candidate.content,
      importance: 0.6,
      confidence: 0.5,
      tags: [DIALOG_LEARNING_TAG, `dialog-learning:${candidate.pattern}`],
      patternKey,
      sourceKind: "dialog-learning",
      sourceDialogId: input.dialogId,
    });
    await writeMemoryItemWithIndexesToDb(input.db, procedural);
    existing.push(procedural);
    saved.push(procedural);
  }

  return saved;
};