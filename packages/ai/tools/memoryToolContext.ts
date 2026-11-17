import { resolveDialogRuntimeAgentKey } from "chat/dialog/dialogAgentPolicy";
import { isDialogRecordKeyForId, parseDialogKey } from "database/dialogKey";
import type { DialogConfig } from "app/types";

/**
 * 工具调用的执行身份。由运行时注入（模型不可见、不可传），来源是「本次调用属于
 * 哪个对话 / 哪个助手在跑」，而不是界面上此刻打开的是哪个对话。
 * 见 packages/ai/tools/index.ts 的 ToolExecutorContext。
 *
 * `dialogKey` 是可信的完整对话键 `dialog-<owner>-<id>`（含 owner），有它时按它
 * 精确定位；只有 `dialogId` 时，若加载中的记录不能唯一确定归属（不同 owner 同
 * id），一律拒绝，不按枚举顺序猜。
 */
export interface MemoryToolExecutionContext {
  /** 本轮绑定的已持久化用户消息，由运行时注入。 */
  userMessageId?: string;
  dialogId?: string;
  dialogKey?: string;
  agentKey?: string;
}

export interface ResolvedMemoryToolContext {
  dialogId: string;
  agentKey: string;
  /** 个人对话没有 Space：这里是 undefined 是「确实没有」，不是「查不到」。 */
  spaceId?: string;
}

const trimmed = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

interface LoadedDialogMatch {
  key: string;
  record: DialogConfig;
}

/**
 * 找已加载的对话记录。
 *
 * 两种模式：
 * - `exactKey` 给定（可信完整键）：只认键完全相同、且记录自身 id 与键里的 id 一致
 *   的那一条。归属由键里的 owner 决定，不再按 id 猜；
 * - 只给 `dialogId`：键后缀与记录自身 id 都必须指向同一对话。这里**不承诺唯一**
 *   —— 不同 owner 可以有同 id 的对话，调用方必须自己拒绝多匹配（见
 *   resolveMemoryToolContext），绝不允许按枚举顺序取第一条。
 */
function findLoadedDialogs(
  state: unknown,
  dialogId: string,
  exactKey?: string
): LoadedDialogMatch[] {
  const entities = (state as any)?.db?.entities;
  if (!entities || typeof entities !== "object") return [];
  const matches: LoadedDialogMatch[] = [];
  for (const key of Object.keys(entities)) {
    if (!isDialogRecordKeyForId(key, dialogId)) continue;
    const record = entities[key] as DialogConfig | undefined;
    if (!record || trimmed((record as any).id) !== dialogId) continue;
    if (exactKey && key !== exactKey) continue;
    matches.push({ key, record });
  }
  return matches;
}

/** 按 dialogId 找**唯一**已加载的对话记录；多匹配或零匹配都返回 null。 */
export function selectLoadedDialogById(
  state: unknown,
  dialogId: string
): DialogConfig | null {
  const matches = findLoadedDialogs(state, dialogId);
  return matches.length === 1 ? matches[0].record : null;
}

/**
 * 解析记忆工具的归属上下文。
 *
 * 规则（缺一即 fail-closed，绝不猜）：
 * - 没有执行上下文 / 既没有 dialogId 也没有完整对话键：报错，不回落到当前对话
 *   或视图 Space；
 * - 完整对话键无法解析、或与 dialogId 指向不同对话：报错（上下文自相矛盾）；
 * - 只带 dialogId 且加载中有多个 owner 的同 id 记录：报错，不按实体枚举顺序取
 *   第一个（那会让归属取决于插入顺序）；
 * - 对话记录未加载：报错，因为无法确认它属于哪个 Space；
 * - 对话有 spaceId 就用它；没有就是个人对话（不借用视图 Space）。
 *
 * agentKey 优先取执行上下文里的助手（真正在跑的那个），缺失时才按对话自身的
 * auto/fixed 策略推导——两者都以 dialogId 为界，不再是「当前界面」。
 */
export function resolveMemoryToolContext(
  state: unknown,
  context?: MemoryToolExecutionContext
): ResolvedMemoryToolContext {
  return resolveToolAttributionContext(state, context);
}

/** Shared attribution resolver; image tools require an explicit executing agent. */
export function resolveToolAttributionContext(
  state: unknown,
  context?: MemoryToolExecutionContext,
  options?: { requireAgentKey: boolean; errorLabel: string }
): ResolvedMemoryToolContext {
  const UNRESOLVED = options?.errorLabel ?? "无法确定记忆归属";
  const agentKey = trimmed(context?.agentKey);
  if (options?.requireAgentKey && !agentKey) {
    throw new Error(`${UNRESOLVED}：执行上下文缺少 agentKey，不会从当前对话推断。`);
  }
  const contextDialogId = trimmed(context?.dialogId);
  const contextDialogKey = trimmed(context?.dialogKey);

  let keyIdentity: { userId: string; dialogId: string } | null = null;
  if (contextDialogKey) {
    keyIdentity = parseDialogKey(contextDialogKey);
    if (!keyIdentity) {
      throw new Error(
        `${UNRESOLVED}：执行上下文里的对话键 ${contextDialogKey} 不是可解析的 dialog-<owner>-<id>，不会按 id 猜归属。`
      );
    }
    if (contextDialogId && keyIdentity.dialogId !== contextDialogId) {
      throw new Error(
        `${UNRESOLVED}：执行上下文自相矛盾——对话键 ${contextDialogKey} 指向 ${keyIdentity.dialogId}，但 dialogId 是 ${contextDialogId}。`
      );
    }
  }

  const dialogId = keyIdentity?.dialogId ?? contextDialogId;
  if (!dialogId) {
    throw new Error(
      `${UNRESOLVED}：本次工具调用缺少所属对话（dialogId），不会改用当前打开的对话或视图 Space。`
    );
  }

  const matches = findLoadedDialogs(state, dialogId, contextDialogKey);
  if (matches.length === 0) {
    throw new Error(
      `${UNRESOLVED}：对话 ${dialogId} 未加载，无法确认它的 Space 归属。`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `${UNRESOLVED}：加载中有 ${matches.length} 个同 id 的对话（${matches
        .map((m) => m.key)
        .join(" / ")}），仅凭 dialogId 无法确定归属；执行上下文需要提供完整对话键。`
    );
  }

  const [dialog] = matches;
  return {
    dialogId,
    agentKey: resolveDialogRuntimeAgentKey(
      dialog.record,
      agentKey
    ),
    spaceId: trimmed((dialog.record as any).spaceId),
  };
}
