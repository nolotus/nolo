/**
 * Antigravity semantic result/event contract（纯类型层，无实现依赖）。
 *
 * 事件形状的唯一权威定义在 Gemini 共享层（geminiNativeShared.ts 的
 * GeminiDecodeEvent）：Antigravity CCA 的语义事件就是 Gemini native 解码事件，
 * 这里仅按产品语义命名，并补上 Antigravity 专属的失败与结果契约。
 *
 * antigravityCloudCodeProvider.ts（实现）与 types.ts（中立类型层）从本文件
 * 引用这些类型，避免「中立类型层 → provider 实现」的依赖倒挂。
 */
import type { GeminiDecodeEvent } from "./geminiNativeShared";
import type {
  AgentRuntimeResult,
  AgentRuntimeToolCall,
  RuntimeProviderFailure,
} from "./types";

/**
 * Antigravity provider 语义事件 = Gemini native 解码事件
 * （text / reasoning / tool_call / usage / finish，thought_signature 随
 * tool_call.toolCall 携带，见 GeminiDecodeEvent）。
 */
export type AntigravityProviderEvent = GeminiDecodeEvent;

export type AntigravityProviderFailure = {
  kind: "provider_failure";
  provider: "antigravity";
  code: string;
  message: string;
  providerReason?: string;
  retryable: boolean;
  status?: number;
};

export type AntigravityRuntimeResult = AgentRuntimeResult & {
  /** Antigravity-only decode events retained at the provider boundary. */
  providerEvents?: AntigravityProviderEvent[];
  /** Antigravity-only terminal failure detail for diagnostics and transport mapping. */
  providerFailure?: AntigravityProviderFailure;
};

export type AntigravitySemanticResult = {
  status: number;
  text: string;
  reasoningContent?: string;
  toolCalls: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
  finishReason?: string;
  providerEvents: AntigravityProviderEvent[];
  providerFailure?: AntigravityProviderFailure;
  runtimeProviderFailure?: RuntimeProviderFailure;
  body: Record<string, unknown>;
};
