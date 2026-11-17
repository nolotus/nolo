/**
 * 当前 turn 的「已持久化用户消息 id」解析。
 *
 * 工作记忆工具（rememberMemory / queryMemory 的 `mode: work`）从
 * `call.runtimeContext.userMessageId` 取宿主事实，并要求它是**已经落库**的用户
 * 消息（`workContextAccess.ts` 会按 `${dialogId}-msg-${id}` 读记录并校验 role /
 * userId）。所以这里只做两件事：
 *
 * 1. 只接受**明确的**来源：批量提交必须有且仅有一个消息 id；普通 turn 只看本轮
 *    随 turn 传来的 `userMessages`（这些是 receipt-backed、已落库的行），不猜
 *    「最新一条」，也不从模型参数里取。
 * 2. 逐个**回读校验**确实存在于该 dialog 下且 role 为 user，才交给运行时。
 *
 * 任一条件不满足就返回 undefined —— 宁可不注入（工具因此拒绝写入），也不把
 * 错误来源写进记忆。
 */
import { resolveWorkContextAccess } from "../../ai/memory/vnext/workContextAccess";
import type { HybridRecordStore } from "./hybridRecordStore";

const messageKey = (dialogId: string, messageId: string) =>
  `dialog-${dialogId}-msg-${messageId}`;

export interface ResolvePersistedTurnUserMessageInput {
  store: Pick<HybridRecordStore, "read">;
  dialogId: string;
  /** 批量提交的显式消息 id（`resolveCliBatchIdentity` 的结果）。 */
  batchMessageIds?: readonly string[] | null;
  /** 本轮随 turn 传入的、已落库的用户消息（receipt-backed）。 */
  userMessages?: readonly { cliMessageId?: string }[] | null;
}

/** 候选 id 必须唯一；0 个或多个都视为「来源不明确」。 */
const singleCandidate = (
  input: ResolvePersistedTurnUserMessageInput,
): string | null => {
  const candidates = input.batchMessageIds?.length
    ? input.batchMessageIds
    : (input.userMessages ?? [])
        .map((message) => message.cliMessageId)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0]! : null;
};

export const resolvePersistedTurnUserMessageId = async (
  input: ResolvePersistedTurnUserMessageInput,
): Promise<string | undefined> => {
  if (!input.dialogId) return undefined;
  const candidate = singleCandidate(input);
  if (!candidate) return undefined;
  try {
    const record = (await input.store.read(messageKey(input.dialogId, candidate), {
      remote: false,
    })) as { id?: unknown; role?: unknown } | null;
    if (!record || record.role !== "user" || record.id !== candidate) return undefined;
    return candidate;
  } catch {
    // 读取失败 = 无法证明已持久化，按「不注入」处理（工具会明确拒绝写入）。
    return undefined;
  }
};

/** Reuse persisted-turn parsing and work-access ownership checks for admitted receipts. */
export async function resolveInjectedTurnUserMessageId(input: ResolvePersistedTurnUserMessageInput & {
  userId: string;
}): Promise<string | undefined> {
  const messages = input.userMessages;
  if (messages?.length !== 1 || !messages[0]?.cliMessageId) return undefined;
  const id = await resolvePersistedTurnUserMessageId(input);
  if (!id) return undefined;
  try {
    await resolveWorkContextAccess(
      { get: (key: string) => input.store.read(key, { remote: false }) },
      input.userId, input.dialogId, id,
    );
    return id;
  } catch {
    return undefined;
  }
}
