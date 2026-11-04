// packages/chat/web/sidebar/useAgentUnreadSummary.ts
//
// 侧边栏 Agent 未读生命周期与聚合 Hook
// 在顶层 ChatSidebar 统一挂载一次，驱动 WorkDialogHistory、AllViewSidebar 与收藏分支

import React, { useMemo, useRef, useEffect } from "react";
import type { MyContentListItem } from "app/utils/myContentItems";
import { useUnreadDialogIds, useClearedDialogTimestamps } from "create/space/spaceDialogStore";
import { collectAgentUnreadKeys } from "./agentUnread";
import {
  useDialogUnreadSummary,
  refreshDialogUnreadSummary,
  setupVisibilityRefresh,
  registerTerminalDialogEvent,
  type DialogUnreadSummaryState,
} from "./dialogUnreadSummaryStore";

export function useAgentUnreadSummaryLifecycle({
  userId,
  authToken,
  serverOrigin,
  items,
}: {
  userId?: string | null;
  authToken?: string | null;
  serverOrigin?: string | null;
  items?: readonly MyContentListItem[];
}): {
  unreadAgentKeys: Set<string>;
  unreadSummaryState: DialogUnreadSummaryState;
} {
  const unreadSummaryState = useDialogUnreadSummary();
  const unreadDialogIds = useUnreadDialogIds();
  const clearedDialogTimestamps = useClearedDialogTimestamps();

  // 1. 冷启动 / 用户切换 / 登出 / serverOrigin 切换：触发未读摘要拉取或登出清理
  useEffect(() => {
    void refreshDialogUnreadSummary({
      userId: userId ?? null,
      authToken,
      serverOrigin,
    });
  }, [userId, authToken, serverOrigin]);

  // 2. 回到前台（visibilitychange）失效重拉（节流 >= 2s，无定时器轮询）
  useEffect(() => {
    if (!userId) return;
    return setupVisibilityRefresh(() => {
      void refreshDialogUnreadSummary({
        userId,
        authToken,
        serverOrigin,
      });
    });
  }, [userId, authToken, serverOrigin]);

  // 3. 处理 unknown dialog 实时未读：仅在 dialog 首次变为 true 时增量处理，避免重放旧 map 误清已读抑制
  const prevHandledUnreadDialogIdsRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const prev = prevHandledUnreadDialogIdsRef.current;
    let hasNewlyUnreadUnknown = false;

    for (const [dialogId, isUnread] of Object.entries(unreadDialogIds)) {
      if (isUnread && !prev[dialogId]) {
        const needsRefresh = registerTerminalDialogEvent(dialogId);
        if (needsRefresh) {
          hasNewlyUnreadUnknown = true;
        }
      }
    }
    prevHandledUnreadDialogIdsRef.current = { ...unreadDialogIds };

    if (hasNewlyUnreadUnknown && userId) {
      void refreshDialogUnreadSummary({
        userId,
        authToken,
        serverOrigin,
      });
    }
  }, [unreadDialogIds, userId, authToken, serverOrigin]);

  // 4. Render 层严格 scope 隔离：只有当 summary 的 userId 与 serverOrigin 与当前完全匹配时才消费
  const isSummaryScoped =
    unreadSummaryState.status === "ok" &&
    unreadSummaryState.userId === userId &&
    (unreadSummaryState.serverOrigin ?? "") === (serverOrigin ?? "");

  const scopedSummaryDialogs = isSummaryScoped
    ? unreadSummaryState.unreadDialogs
    : null;

  const unreadAgentKeys = useMemo(
    () =>
      collectAgentUnreadKeys(
        (items as MyContentListItem[]) ?? [],
        unreadDialogIds,
        userId,
        scopedSummaryDialogs,
        clearedDialogTimestamps
      ),
    [items, unreadDialogIds, userId, scopedSummaryDialogs, clearedDialogTimestamps]
  );

  return {
    unreadAgentKeys,
    unreadSummaryState,
  };
}
