/**
 * CLI provider agent helpers.
 *
 * Extracted from localRuntimeAdapter.ts. Functions for detecting CLI-provider
 * agents, resolving provider name, and formatting messages (system/task split,
 * image URL collection) for external CLI agents (codex, agy, etc.).
 *
 * No module state — pure transforms.
 */
import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeChatMessage,
} from "../../agent-runtime";
import { buildCliPrompt } from "../../ai/agent/cliPrompt";
import { estimateTokenCount } from "../../ai/context/tokenUtils";
import type { DelegatedPayloadMetrics } from "../../agent-runtime/executionObservation";
import { asRecordOrEmpty } from "core/recordOrEmpty";

export type { DelegatedPayloadMetrics };

/**
 * Build the unified task+input content for delegated agent calls.
 *
 * This is the CLI-side copy. The AI tool layer (ai/tools/agent/agentRunDisplayHelpers.ts)
 * has its own identical copy because importing from packages/cli would create
 * a cross-package circular dependency. To fully dedup, this function should be
 * hoisted to packages/core — tracked as follow-up.
 *
 * 优化点：
 * 1. 无 input 或 input 为空串时直接返回 task，不产生额外 section。
 * 2. 当 string input 与 task 去除首尾空白后完全相同时，自动去重返回 task，
 *    避免编排方无意识的 parent->leaf 双重复制。
 * 3. 完整保留正文内容，绝不静默截断。
 */
export function buildDelegatedTaskContent(task: string, input?: any): string {
  if (input === undefined || input === null) {
    return task;
  }
  if (typeof input === "string") {
    const trimmedInput = input.trim();
    if (!trimmedInput || trimmedInput === task.trim()) {
      return task;
    }
    return `${task}\n\n--- INPUT (text) ---\n${input}`;
  }
  let jsonStr: string;
  try {
    const serialized = JSON.stringify(input, null, 2);
    if (serialized === undefined) {
      return task;
    }
    jsonStr = serialized;
  } catch {
    jsonStr = "[Unserializable Input]";
  }
  return `${task}\n\n--- INPUT (json) ---\n${jsonStr}`;
}

/**
 * 计算委托 payload 的尺寸和预估 token 数量。
 */
export function calculateDelegatedPayloadMetrics(
  task: string,
  input?: any,
  delegatedContent?: string,
): DelegatedPayloadMetrics {
  const taskText = typeof task === "string" ? task : "";
  const taskChars = taskText.length;

  let inputChars = 0;
  let serializedInputForTokens: string | undefined = undefined;

  if (input !== undefined && input !== null) {
    if (typeof input === "string") {
      inputChars = input.length;
      serializedInputForTokens = input;
    } else {
      try {
        const serialized = JSON.stringify(input, null, 2);
        if (serialized !== undefined) {
          inputChars = serialized.length;
          serializedInputForTokens = serialized;
        } else {
          inputChars = 0;
        }
      } catch {
        const fallback = "[Unserializable Input]";
        inputChars = fallback.length;
        serializedInputForTokens = fallback;
      }
    }
  }

  const finalContent = delegatedContent ?? buildDelegatedTaskContent(task, input);
  const totalChars = finalContent.length;
  const estimatedTaskTokens = estimateTokenCount(taskText);
  const estimatedTotalTokens = estimateTokenCount(finalContent);
  const estimatedInputTokens =
    serializedInputForTokens && inputChars > 0
      ? estimateTokenCount(serializedInputForTokens)
      : 0;

  return {
    taskChars,
    inputChars,
    totalChars,
    estimatedTaskTokens,
    estimatedInputTokens,
    estimatedTotalTokens,
  };
}

export function parseJsonObject(raw: string) {
  try {
    return asRecordOrEmpty(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function isCliProviderAgent(agentConfig: AgentRuntimeAgentConfig) {
  return Boolean(
    agentConfig.apiSource === "cli" ||
      agentConfig.provider === "cli" ||
      agentConfig.cliProvider,
  );
}

export function resolveCliProviderName(agentConfig: AgentRuntimeAgentConfig) {
  return (
    (agentConfig.cliProvider || agentConfig.provider || "codex").trim() ||
    "codex"
  );
}

export function stringifyRuntimeMessageContent(
  content: AgentRuntimeChatMessage["content"],
) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      let text: string;
      if (typeof part === "string") {
        text = part;
      } else if (part && typeof part === "object" && "text" in part) {
        text = String(part.text ?? "");
      } else {
        text = JSON.stringify(part);
      }
      if (text.trim()) parts.push(text);
    }
    return parts.join("\n");
  }
  return content == null ? "" : String(content);
}

export function buildPromptForCliProvider(messages: AgentRuntimeChatMessage[]) {
  const systemParts: string[] = [];
  const taskParts: string[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      const content = stringifyRuntimeMessageContent(message.content).trim();
      if (content) systemParts.push(content);
    } else {
      const content = stringifyRuntimeMessageContent(message.content).trim();
      if (content) {
        taskParts.push(`[${message.role}]\n${content}`);
      }
    }
  }
  const systemPrompt = systemParts.join("\n\n");
  const taskPrompt = taskParts.join("\n\n");
  return buildCliPrompt(systemPrompt, taskPrompt);
}

export function collectCliProviderImageInputs(messages: AgentRuntimeChatMessage[]) {
  const urls: string[] = [];
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (
        part &&
        typeof part === "object" &&
        (part as any).type === "image_url" &&
        typeof (part as any).image_url?.url === "string" &&
        (part as any).image_url.url.trim()
      ) {
        urls.push((part as any).image_url.url.trim());
      }
    }
  }
  return urls;
}