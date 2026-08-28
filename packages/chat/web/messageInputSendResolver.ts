// packages/chat/web/messageInputSendResolver.ts
//
// Re-export shim. The canonical resolver now lives in the cross-platform
// `chat/queue` package so Web, RN, and TUI share one decision implementation.
// This file is kept for backwards compatibility with existing imports and
// will be removed once callers migrate to `chat/queue/resolveChatSendDecision`.

export type { ChatSendDecision as MessageInputSendDecision } from "core/chat/resolveChatSendDecision";
export { resolveChatSendDecision as resolveMessageInputSendDecision } from "core/chat/resolveChatSendDecision";