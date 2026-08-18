import { useState, useCallback } from "react";


import type { PendingFile } from "chat/dialog/dialogSlice";
import { BUILTIN_FEEDBACK_AGENT_KEY } from "core/builtinAgents";
import { asTrimmedString } from "core/trimmedString";
import { QUICK_CHAT_DEFAULT_TIER_AGENTS as QUICK_CHAT_TIER_AGENTS_LOCAL } from "app/settings/quickChatTierDefaults";

/**
 * 通用三档（flash/balanced/quality）内置 agent key。
 * 用于判断路由结果是否落在「自动选 model」的通用档：
 * 只有这些档位允许被 quickChatModelOverride 替换 model 层；
 * 专职 agent（反馈/建 Agent/建应用）不适用。
 */
export const QUICK_CHAT_GENERAL_TIER_AGENT_KEYS: ReadonlySet<string> = new Set([
  QUICK_CHAT_TIER_AGENTS_LOCAL.flash,
  QUICK_CHAT_TIER_AGENTS_LOCAL.balanced,
  QUICK_CHAT_TIER_AGENTS_LOCAL.quality,
]);

/**
 * `/chat?launch=<slug>` 支持的专职 agent 直达入口。
 * 只允许白名单里的 slug，避免 URL 参数能任意指定 agent 并自动发消息。
 */
export const QUICK_CHAT_LAUNCH_SPECIALISTS: Record<
  string,
  { agentKey: string; promptKey: string; promptFallback: string }
> = {
  feedback: {
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY,
    promptKey: "quickChat.chipFeedbackAgentPrompt",
    promptFallback: "我要反馈",
  },
};

export const resolveQuickChatLaunchSpecialist = (
  slug: string | null | undefined
) => {
  const key = asTrimmedString(slug);
  if (!key) return null;
  return QUICK_CHAT_LAUNCH_SPECIALISTS[key] ?? null;
};

const QUICK_CHAT_DEBUG = false;

export const QUICK_CHAT_PERF_PREFIX = "[QuickChatPerf]";

export type QuickChatPerfStage =
  | "start"
  | "create-dialog-dispatched"
  | "dialog-created"
  | "prepare-first-message-started"
  | "send-first-message-dispatched"
  | "first-message-dispatched"
  | "navigate-started"
  | "navigated";

export type QuickChatExtraPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: PendingFile["type"];
      name: string;
      pageKey?: string;
      dialogKey?: string;
    };

export type QuickChatRouteState = {
  isNew: true;
  quickChatFirstMessage?: {
    text: string;
  };
};

export const QUICK_CHAT_IMAGE_ONLY_PROMPT = "请描述这张图片。";

export const buildQuickChatFirstMessageText = (
  text: string,
  hasImages: boolean
) => {
  const trimmedText = text.trim();
  return trimmedText || (hasImages ? QUICK_CHAT_IMAGE_ONLY_PROMPT : "");
};

export const buildQuickChatExtraParts = (
  pendingFiles: PendingFile[]
): QuickChatExtraPart[] =>
  pendingFiles.map((pendingFile) => {
    if (pendingFile.type === "ocr_text" && pendingFile.ocrText) {
      return {
        type: "text",
        text: pendingFile.ocrText,
      };
    }

    return {
      type: pendingFile.type,
      name: pendingFile.name,
      pageKey: pendingFile.pageKey,
      dialogKey: pendingFile.dialogKey,
    };
  });

export const buildQuickChatRouteState = (
  text: string
): QuickChatRouteState => {
  const trimmedText = text.trim();
  return {
    isNew: true,
    quickChatFirstMessage: trimmedText
      ? {
          text: trimmedText,
        }
      : undefined,
  };
};

export const formatQuickChatDialogTitle = (
  agentName: string,
  date: Date = new Date()
) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${agentName || "Agent"}  ${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const createQuickChatPerfEvent = (
  stage: QuickChatPerfStage,
  startedAt: number,
  now: number,
  atMs: number | undefined,
  details: Record<string, unknown> = {}
) => ({
  stage,
  elapsedMs: now - startedAt,
  ...(typeof atMs === "number" ? { atMs } : {}),
  ...details,
});

export const getQuickChatPerfNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export const logQuickChatPerf = (
  stage: QuickChatPerfStage,
  startedAt: number,
  details: Record<string, unknown> = {}
) => {
  if (!QUICK_CHAT_DEBUG) return;
  const now = getQuickChatPerfNow();
  console.info(
    QUICK_CHAT_PERF_PREFIX,
    createQuickChatPerfEvent(
      stage,
      startedAt,
      now,
      typeof performance !== "undefined" ? now : undefined,
      details
    )
  );
};

/* ──────────────────────────────────────────
 * QuickChat 模式选择 & 模型路由
 * ────────────────────────────────────────── */

/**
 * 可配置的档位：快速 / 平衡 / 质量。
 * 图片档已移除（有图走 flash + 预处理管道）；保留 "image" 在类型里
 * 以兼容旧持久化 dialog 的 stickyTier。
 */
export type QuickChatTier = "flash" | "balanced" | "quality" | "image";
/** 执行策略：自动路由。不是模型档位。 */
export type QuickChatModeType = "auto";
export type QuickChatMode = { mode: QuickChatModeType };
/** 合法策略；legacy `custom` / `code` 读取时归一为 auto。 */
export function normalizeQuickChatMode(value: unknown): QuickChatMode {
  if (value && typeof value === "object") {
    const mode = (value as { mode?: unknown }).mode;
    if (mode === "auto") {
      return { mode: "auto" };
    }
    // 旧 sessionStorage 中的 custom / code / research 已退役，迁移为 auto。
    // code 模式的能力由「意图判定 → 挂载 code-planning skill」自动承接。
    if (mode === "custom" || mode === "code" || mode === "research") {
      return { mode: "auto" };
    }
  }
  return { mode: "auto" };
}

/**
 * Placeholder kind for Quick Chat shell + runtime.
 * `isEmptyState` always wins so mode switches keep the empty-state copy.
 */
export type QuickChatPlaceholderKind = "empty" | "auto";

export function resolveQuickChatPlaceholderKind(
  mode: QuickChatModeType | string,
  isEmptyState: boolean,
): QuickChatPlaceholderKind {
  if (isEmptyState) return "empty";
  return "auto";
}

const QUICK_CHAT_PLACEHOLDER_META: Record<
  QuickChatPlaceholderKind,
  { key: string; defaultValue: string }
> = {
  empty: {
    key: "quickChat.emptyPlaceholder",
    defaultValue: "直接说你的目标，比如「帮我整理一下思路」",
  },
  auto: {
    key: "quickChat.placeholderAuto",
    defaultValue: "输入消息，自动匹配最优模型",
  },
};

/** i18n key + default for shell and runtime placeholders (same priority). */
export function resolveQuickChatPlaceholderMeta(
  mode: QuickChatModeType | string,
  isEmptyState: boolean,
): { key: string; defaultValue: string } {
  return QUICK_CHAT_PLACEHOLDER_META[
    resolveQuickChatPlaceholderKind(mode, isEmptyState)
  ];
}

// 三档内置默认 agentKey 的唯一真相源在 settings/quickChatTierDefaults.ts
// (避免 settings 包反向 import pages 层导致循环依赖);此处 re-export 保持
// 既有调用方不变。
export {
  QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY,
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
} from "app/settings/quickChatTierDefaults";

/**
 * 编码任务意图（实现/修 bug/重构/测试构建，含「先调查再实现」混合句式）。
 * 已随 LLM 分类一并移除（专职能力转系统内置 skill，由 agent 自主 loadSkill）。
 */

/**
 * 选择 quick-chat 目标 agent：纯文本路由。
 * 图片档已移除——有图时仍走 flash 档，vision 预处理管道负责把图片描述成文字。
 * 不再调 LLM 分类器，不再自动切 Kimi。
 */
export interface ResolveQuickChatAgentInput {
  hasImages: boolean;
  /**
   * 返回某档位当前生效的智能体（"flash" / "balanced" / "quality"）。
   * "image" 已移除，但保留在 QuickChatTier 中以兼容旧持久化 dialog。
   */
  resolveTierAgent: (tier: Exclude<QuickChatTier, "image">) => string;
}

/** 选择 quick-chat 目标 agent 的结果。 */
export interface ResolveQuickChatAgentResult {
  agentKey: string;
}

export async function resolveQuickChatAgentKey({
  hasImages: _hasImages,
  resolveTierAgent,
}: ResolveQuickChatAgentInput): Promise<ResolveQuickChatAgentResult> {
  // 有图无图都走 flash 档；图片由预处理管道处理（Qwen 3.7 Flash 描述图片为文字）。
  const agentKey = resolveTierAgent("flash");
  QUICK_CHAT_DEBUG &&
    console.log("[QuickChatRoute] resolveQuickChatAgentKey", { agentKey });
  return { agentKey };
}

export const QUICK_CHAT_MODE_STORAGE_KEY = "quickChatMode";

/** sessionStorage → QuickChatMode；非法/损坏 JSON 回退 auto。导出供测试。 */
export function readStoredQuickChatMode(
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : null,
): QuickChatMode {
  if (!storage) return { mode: "auto" };
  try {
    const stored = storage.getItem(QUICK_CHAT_MODE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const normalized = normalizeQuickChatMode(parsed);
      // 读到 legacy custom 时写回 auto，避免下次仍带无效值。
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { mode?: unknown }).mode === "custom"
      ) {
        persistQuickChatMode(normalized, storage);
      }
      return normalized;
    }
  } catch {
    // ignore parse errors
  }
  return { mode: "auto" };
}

/** 将策略写入 sessionStorage。导出供测试。 */
export function persistQuickChatMode(
  mode: QuickChatMode,
  storage: Pick<Storage, "setItem"> | null = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(QUICK_CHAT_MODE_STORAGE_KEY, JSON.stringify(mode));
  } catch {
    // ignore storage errors
  }
}

/**
 * Quick Chat 发起入口的模式状态 hook。
 * 读写 sessionStorage，仅用于 Quick Chat 新任务入口（非已绑定 agent 的 Dialog 页）。
 */
export function useQuickChatMode(): [QuickChatMode, (mode: QuickChatMode) => void] {
  const [mode, setMode] = useState<QuickChatMode>(() => readStoredQuickChatMode());

  const handleChange = useCallback((nextMode: QuickChatMode) => {
    setMode(nextMode);
    persistQuickChatMode(nextMode);
  }, []);

  return [mode, handleChange];
}
