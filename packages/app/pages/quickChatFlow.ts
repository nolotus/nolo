import { useState, useCallback } from "react";


import type { PendingFile } from "chat/dialog/dialogSlice";
import type { ReferenceItem } from "app/types";
import { pendingAttachmentsToMessageParts } from "chat/messages/pendingAttachmentParts";
import { asTrimmedString } from "core/trimmedString";
import { BUILTIN_FEEDBACK_AGENT_KEY } from "core/builtinAgents";
import {
  buildSpecialistRuntimeToolGrants,
  buildSpecialistSkillReference,
  type SpecialistSkillSlug,
} from "ai/skills/specialistSkills";
import { QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY } from "app/settings/quickChatTierDefaults";

/**
 * 可以随草稿/入口携带的专职技能 slug（登录往返恢复用）。
 * 刻意**不含 `feedback`**：反馈入口是服务端受控通道，见下方 launch 表。
 */
export type QuickChatSpecialistSkillSlug = Extract<
  SpecialistSkillSlug,
  "app-builder" | "agent-creator"
>;

export const QUICK_CHAT_PENDING_SPECIALIST_SLUGS: readonly QuickChatSpecialistSkillSlug[] =
  ["app-builder", "agent-creator"];

export function isQuickChatPendingSpecialistSlug(
  value: unknown,
): value is QuickChatSpecialistSkillSlug {
  return (
    typeof value === "string" &&
    (QUICK_CHAT_PENDING_SPECIALIST_SLUGS as readonly string[]).includes(value)
  );
}

/**
 * `/chat?launch=<slug>` 与首页芯片支持的专职能力入口。
 *
 * 两种落点，刻意不对称：
 * - `skill`：应用构建 / AI 创建。能力已转内置 skill，Agent 由用户在输入框里的
 *   当前选择决定（无选中走 `QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY` = 内置 nolo），
 *   技能与工具随对话挂载，不再依赖某个专用预置 Agent。
 * - `agent`：反馈入口继续走 `BUILTIN_FEEDBACK_AGENT_KEY`。它是服务端**受控官方
 *   通道**——跨租户写「用户反馈」表与向管理员发紧急通知只豁免这个 key
 *   （tableToolHandlers / modelUsageToolHandlers 的反馈入口白名单）。换成通用
 *   Agent 会让普通用户写反馈 403，而放宽通用 Agent 跨租户写权限是安全降级。
 *
 * 只允许白名单里的 slug，避免 URL 参数能任意指定能力并自动发消息。
 */
export type QuickChatLaunchSpecialist =
  | {
      target: "agent";
      agentKey: string;
      promptKey: string;
      promptFallback: string;
    }
  | {
      target: "skill";
      skillSlug: SpecialistSkillSlug;
      promptKey: string;
      promptFallback: string;
    };

export const QUICK_CHAT_LAUNCH_SPECIALISTS: Record<
  string,
  QuickChatLaunchSpecialist
> = {
  feedback: {
    target: "agent",
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY,
    promptKey: "quickChat.chipFeedbackAgentPrompt",
    promptFallback: "我要反馈",
  },
  "create-app": {
    target: "skill",
    skillSlug: "app-builder",
    promptKey: "quickChat.chipCreateAppPrompt",
    promptFallback: "我想创建一个新应用",
  },
  "create-app-surf": {
    target: "skill",
    skillSlug: "app-builder",
    promptKey: "quickChat.chipCreateAppSurfPrompt",
    promptFallback: "我想用冲浪模板构建我的冲浪工作台，包含实时浪况与风向潮汐数据，并支持添加和管理我的自定义浪点。",
  },
};

export const resolveQuickChatLaunchSpecialist = (
  slug: string | null | undefined
): QuickChatLaunchSpecialist | null => {
  const key = asTrimmedString(slug);
  if (!key) return null;
  return QUICK_CHAT_LAUNCH_SPECIALISTS[key] ?? null;
};

/**
 * 专职入口落到对话上的挂载物：技能引用（说明书）+ 工具授权（能力包）。
 *
 * 两者必须成套：`app-builder` 的工具由能力包持有、skill 侧 `toolNames` 为空
 * （见 builtinSkillRegistry 的 CAPABILITY_SLUG_COLLISIONS 约定），只挂引用
 * 会得到「有说明书没工具」的入口。
 */
export function buildQuickChatSpecialistLaunchArgs(args: {
  skillSlug: SpecialistSkillSlug;
  userId?: string | null;
}): { extraReferences?: ReferenceItem[]; extraTools?: string[] } {
  const userId = asTrimmedString(args.userId ?? "");
  const extraTools = buildSpecialistRuntimeToolGrants(args.skillSlug);
  return {
    // 技能 page key 是 `page-<userId>-<skillId>`：没有 userId 就没有可挂的页，
    // 此时不伪造引用（buildSpecialistSkillReference 会抛错）。
    ...(userId
      ? { extraReferences: [buildSpecialistSkillReference(args.skillSlug, userId)] }
      : {}),
    ...(extraTools.length > 0 ? { extraTools } : {}),
  };
}

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

export type QuickChatExtraPart = import("chat/messages/pendingAttachmentParts").PendingAttachmentMessagePart;

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
): QuickChatExtraPart[] => pendingFiles.flatMap((file) => {
  if (file.type === "ocr_text" && file.ocrText) return [{ type: "text", text: file.ocrText }];
  if (file.type === "media_job") return pendingAttachmentsToMessageParts([file], { currentServer: null });
  return [{ type: file.type, name: file.name, pageKey: file.pageKey, dialogKey: file.dialogKey }];
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

// 快捷对话默认 agentKey 的唯一真相源在 settings/quickChatTierDefaults.ts
// (避免 settings 包反向 import pages 层导致循环依赖);此处 re-export 保持
// 既有调用方不变。
export { QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY } from "app/settings/quickChatTierDefaults";

/**
 * 编码任务意图（实现/修 bug/重构/测试构建，含「先调查再实现」混合句式）。
 * 已随 LLM 分类一并移除（专职能力转系统内置 skill，由 agent 自主 loadSkill）。
 */

/**
 * 选择 quick-chat 目标 agent：纯文本路由。
 * 图片档已移除——有图时仍走默认档，纯文本模型收到图片时仅剥离为占位文本。
 * 不再调 LLM 分类器，不再自动切 Kimi。
 */
/** 选择 quick-chat 目标 agent 的结果。 */
export interface ResolveQuickChatAgentResult {
  agentKey: string;
}

export async function resolveQuickChatAgentKey(): Promise<ResolveQuickChatAgentResult> {
  // 有图无图都走单一默认 agent（内置 nolo 本体）；纯文本模型收到图片时仅剥离为占位文本。
  const agentKey = QUICK_CHAT_AUTO_FALLBACK_AGENT_KEY;
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

export const QUICK_CHAT_PENDING_DRAFT_KEY = "quickChatPendingDraft";

/**
 * 未登录暂存的草稿。
 *
 * `specialistSkillSlug` 必须一起暂存：否则未登录点「创建应用 / 创建 Agent」
 * 跳登录回来后变成普通无技能对话（工具面与说明书全丢）。
 * 白名单见 `QUICK_CHAT_PENDING_SPECIALIST_SLUGS`（不含 feedback：它走受控 Agent）。
 */
export type QuickChatPendingDraft = {
  text: string;
  specialistSkillSlug?: QuickChatSpecialistSkillSlug;
};

/** 新草稿信封的版本标记：只有精确命中它才按新格式解包。 */
export const QUICK_CHAT_PENDING_DRAFT_ENVELOPE_KEY = "__noloQuickChatDraftV2";

/** 未登录发送时暂存输入（含专职技能意图），登录回到 /chat 后恢复。 */
export function savePendingQuickChatDraft(
  text: string,
  specialistSkillSlug?: SpecialistSkillSlug | null,
  storage: Pick<Storage, "setItem"> | null = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : null,
): void {
  if (!storage) return;
  try {
    // 显式信封 + 版本号：不能把用户自己输入的 `{"name":"demo"}` 之类文本
    // 误判成内部格式（见 takePendingQuickChatDraft）。
    const payload = {
      [QUICK_CHAT_PENDING_DRAFT_ENVELOPE_KEY]: 1,
      text,
      ...(isQuickChatPendingSpecialistSlug(specialistSkillSlug)
        ? { specialistSkillSlug }
        : {}),
    };
    storage.setItem(QUICK_CHAT_PENDING_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // 存储不可用时忽略
  }
}

/**
 * 读取并清除暂存草稿；无则返回 null。
 *
 * 只有精确命中信封（`__noloQuickChatDraftV2 === 1` 且 `text` 是字符串）才按
 * 新格式解包；其它一切情况——旧版本写入的裸文本、用户自己输入的 JSON
 *（如 `{"name":"demo"}`）、半截非法 JSON——都原样当作普通草稿返回，绝不返回
 * null 把草稿丢掉。
 */
export function takePendingQuickChatDraft(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof sessionStorage !==
  "undefined"
    ? sessionStorage
    : null,
): QuickChatPendingDraft | null {
  if (!storage) return null;
  let value = "";
  try {
    value = storage.getItem(QUICK_CHAT_PENDING_DRAFT_KEY) ?? "";
    if (!value) return null;
    storage.removeItem(QUICK_CHAT_PENDING_DRAFT_KEY);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // 半截非法 JSON：原样当普通草稿，不能丢。
    return { text: value };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as Record<string, unknown>)[QUICK_CHAT_PENDING_DRAFT_ENVELOPE_KEY] !== 1 ||
    typeof (parsed as { text?: unknown }).text !== "string"
  ) {
    return { text: value };
  }
  const envelope = parsed as {
    text: string;
    specialistSkillSlug?: unknown;
  };
  const specialistSkillSlug = isQuickChatPendingSpecialistSlug(
    envelope.specialistSkillSlug,
  )
    ? envelope.specialistSkillSlug
    : undefined;
  return {
    text: envelope.text,
    ...(specialistSkillSlug ? { specialistSkillSlug } : {}),
  };
}
