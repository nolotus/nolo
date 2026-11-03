import { extractCustomId } from "core/prefix";
import { asOptionalTrimmedString } from "core/optionalString";
import { parseDialogKey } from "database/dialogKey";
import {
  getSyncMapping,
  getSyncMappingByRemoteDbKey,
} from "database/sync/syncMapping";
import { dialogSummaryUnreadAt, type MyContentListItem } from "app/utils/myContentItems";
import type { UnreadDialogSummaryItem } from "./dialogUnreadSummaryStore";

/**
 * 已读抑制的跨时钟容差（毫秒）。
 *
 * 原因：参与比较的两个时间戳不同源——
 *   - unreadAt 由服务端在写入对话记录时生成（服务端时钟）；
 *   - clearedAt 由本机 clearDialogUnread 在用户点开对话时生成（客户端时钟）。
 * 两钟即使都做了 NTP 同步也存在秒级偏差，服务端 unreadAt 可能略「晚于」客户端 clearedAt，
 * 若严格比较 unreadAt <= clearedAt，则「刚读过的对话」会被旧终态重新点亮（红点熄不掉）。
 * 取 3s（2~5s 区间内）：足以覆盖常见钟差，又远小于真实新终态（一轮生成 ≥ 数秒）的间隔，
 * 不会把真正的新未读误判为已读。
 */
export const UNREAD_CLEAR_CLOCK_TOLERANCE_MS = 3000;

/**
 * 聚合所有存在未读对话的 primary agentKey 集合。
 *
 * 核心设计：
 * 1. 突破截断：优先聚合全量轻量摘要 (GET /api/dialogs/unread-summary)，冷启动 >200 的旧未读绝不漏网；
 * 2. 严格 owner 隔离：只计入当前用户（或 device-local）的 dialog，共享 agent 下他人的对话绝对不跨账号泄露未读；
 * 3. 统一已读抑制：无论 summary 还是 recentItems，只要在本 session 内被 clearDialogUnread 清读过（且未产生新终态），绝不被旧 unreadAt 误复活；
 * 4. 独立未读：多 dialog 场景下读了其中一个只清该对话，同 agent 其他未读依然保留红点；
 * 5. 归属语义：严格遵循 primaryAgentKey 规范（primaryAgentKey || cybots[0]）。
 */
export function collectAgentUnreadKeys(
  items: MyContentListItem[],
  unreadDialogIds: Readonly<Record<string, boolean>>,
  currentUserId?: string | null,
  summaryItems?: readonly UnreadDialogSummaryItem[] | null,
  clearedDialogTimestamps?: Readonly<Record<string, number>>
): Set<string> {
  const result = new Set<string>();

  // 1. 全量轻量摘要：涵盖所有未读对话（无论是否在 recentItems 前 200 条内）
  if (Array.isArray(summaryItems) && summaryItems.length > 0) {
    for (const item of summaryItems) {
      if (!item.primaryAgentKey || item.unreadAt <= 0) continue;

      const ownerId = parseDialogKey(item.dialogKey)?.userId;
      const isOwned =
        ownerId === "local" ||
        (typeof currentUserId === "string" &&
          currentUserId.length > 0 &&
          ownerId === currentUserId);
      if (!isOwned) continue;

      // 统一已读抑制：若本 session 内已清除且未产生新终态，予以抑制
      // （用跨时钟容差比较，避免服务端 unreadAt 略晚于客户端 clearedAt 时红点熄不掉）
      const clearedAt = clearedDialogTimestamps?.[item.dialogId];
      if (
        typeof clearedAt === "number" &&
        item.unreadAt <= clearedAt + UNREAD_CLEAR_CLOCK_TOLERANCE_MS &&
        unreadDialogIds[item.dialogId] !== true
      ) {
        continue;
      }

      if (unreadDialogIds[item.dialogId] === false) {
        continue;
      }

      result.add(item.primaryAgentKey.trim());
    }
  }

  // 2. 本地/近端列表：补充 device-local 对话或尚未写入 summary 的实时未读
  if (items && items.length > 0) {
    for (const item of items) {
      if (item.source !== "user-data" || item.type !== "dialog") continue;

      // owner 隔离：非当前用户且非 local 的 dialog 绝对不计入
      const ownerId = parseDialogKey(item.contentKey)?.userId;
      const isOwned =
        ownerId === "local" ||
        (typeof currentUserId === "string" &&
          currentUserId.length > 0 &&
          ownerId === currentUserId);
      if (!isOwned) continue;

      const dialogId = extractCustomId(item.contentKey);
      const persistedUnreadAt = dialogSummaryUnreadAt(item.unreadAt);

      // 统一已读抑制：无论 recentItems 上的持久化 unreadAt 多旧，只要本 session 标记了已读且无新终态，绝不复活！
      // （同样使用跨时钟容差：服务端 unreadAt 与客户端 clearedAt 不同源）
      const clearedAt = dialogId ? clearedDialogTimestamps?.[dialogId] : undefined;
      if (
        dialogId &&
        typeof clearedAt === "number" &&
        typeof persistedUnreadAt === "number" &&
        persistedUnreadAt <= clearedAt + UNREAD_CLEAR_CLOCK_TOLERANCE_MS &&
        unreadDialogIds[dialogId] !== true
      ) {
        continue;
      }

      const sseUnread = dialogId ? unreadDialogIds[dialogId] : undefined;
      const isUnread =
        sseUnread !== undefined
          ? sseUnread === true
          : typeof persistedUnreadAt === "number" && persistedUnreadAt > 0;

      if (!isUnread) continue;

      // 与系统 primaryAgent 归属规范保持一致（primaryAgentKey || cybots[0]）
      const primaryAgentKey =
        typeof item.primaryAgentKey === "string" && item.primaryAgentKey.trim().length > 0
          ? item.primaryAgentKey.trim()
          : Array.isArray(item.cybots) &&
              typeof item.cybots[0] === "string" &&
              item.cybots[0].trim().length > 0
            ? item.cybots[0].trim()
            : null;

      if (primaryAgentKey) {
        result.add(primaryAgentKey);
      }
    }
  }

  return result;
}

/**
 * agent 行的未读命中判定（供 SidebarItemRow 的调用方使用）。
 *
 * 问题：本地 agent 与账号 agent 会折叠成一行（见 app/utils/myContentItems.ts 的
 * deduplicateContentRecordsWithMappings / ContentSyncMappingLink），行上的 contentKey
 * 可能是账号键 `agent-<uid>-*`，而 dialog 记录里的 primaryAgentKey 仍是本地键
 * `agent-local-*`，直接用 unreadAgentKeys.has(contentKey) 会漏亮红点。
 *
 * 这里不新造键形规则，而是复用仓库既有的配对真源 database/sync/syncMapping
 * （与列表折叠用的是同一份映射）：命中 contentKey 本身，或命中其配对键，即视为未读。
 */
export function isAgentRowUnread(
  unreadAgentKeys: ReadonlySet<string> | undefined,
  contentKey: string,
  accountUserId?: string | null
): boolean {
  if (!unreadAgentKeys || unreadAgentKeys.size === 0) return false;
  const key = asOptionalTrimmedString(contentKey);
  if (!key) return false;
  if (unreadAgentKeys.has(key)) return true;

  const account = asOptionalTrimmedString(accountUserId) ?? undefined;
  // 账号作用域优先，再回退到不限账号（同一本地 agent 只会同步到一个账号，
  // 账号键尚未在映射中落到当前账号时仍需命中）。
  const scopeCandidates = account ? [account, undefined] : [undefined];
  for (const scope of scopeCandidates) {
    const asRemote = getSyncMappingByRemoteDbKey(key, scope);
    const remoteLocalKey = asOptionalTrimmedString(asRemote?.localDbKey);
    if (remoteLocalKey && unreadAgentKeys.has(remoteLocalKey)) return true;

    const asLocal = getSyncMapping(key, scope);
    const localRemoteKey = asOptionalTrimmedString(asLocal?.remoteDbKey);
    if (localRemoteKey && unreadAgentKeys.has(localRemoteKey)) return true;
  }

  return false;
}
