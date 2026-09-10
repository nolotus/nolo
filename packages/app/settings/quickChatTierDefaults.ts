// packages/app/settings/quickChatTierDefaults.ts
//
// 单一职责:快捷对话默认智能体 key。
// 2026-08-15: 图片档已移除。有图时统一走默认档（纯文本模型收到图片时仅剥离为
// 占位文本，见 imagePreprocessing.ts），不再自动切 Kimi。
// 2026-08-21: 默认档从广场档改为内置 nolo 本体。
// 历史「快速 / 平衡 / 质量」三档结构已全部删除，只保留单一默认 agentKey。
//
// 这是默认 agentKey 的唯一真相源(single source of truth)。
// `packages/app/pages/quickChatFlow.ts` 从此处 re-export,以避免 settings 包
// 反向 import pages 层造成循环依赖。
//
// 与 desktopAgentRuntimeAdapter 的 BUILTIN_PLATFORM_AGENT_CONFIGS 保持一致
// (见 packages/server/handlers/desktopAgentRuntimeAdapter.ts)。

import { BUILTIN_NOLO_AGENT_KEY } from "core/builtinAgents";

/**
 * 快捷对话默认 agent = 内置 nolo 本体，和 TUI `/switch` 的 nolo 是同一个 agent。
 * 其 provider/model 由 builtinAgentCatalog 托管（deepseek-flash）。
 */
export const QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY = BUILTIN_NOLO_AGENT_KEY;
