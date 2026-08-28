// packages/create/space/hooks/useSpaceEvents.ts
// 订阅 space SSE 频道，实时更新 Redux state。
//
// 核心设计：
// - 整个 space 只需 1 条 SSE 连接，不管有多少个 running dialog
// - space 频道携带 dialog.created / dialog.done / dialog.failed
// - 直接 patch Redux state，不 re-fetch，刷新后 fetchSpace 重新读 DB
//
// 使用：在 SpaceLayout 或 SidebarContent 里调用一次即可
//   useSpaceEvents();

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { applySpaceEvent } from "../spaceSlice";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { subscribeSharedSse } from "app/realtime/sharedSse";

export function useSpaceEvents() {
    const dispatch = useAppDispatch();
    const spaceId = useCurrentSpaceId();
    const { currentServer, currentToken: token } =
        useAppSelector(selectRuntimeSnapshot);

    useEffect(() => {
        if (!spaceId || !currentServer) return;

        const channel = `space-${spaceId}`;
        const dispose = subscribeSharedSse({
            key: `${currentServer}:${channel}`,
            url: `${currentServer}/api/events/${channel}`,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            onEvent: (event) => {
                if (typeof event.type === "string") {
                    dispatch(applySpaceEvent(event as any));
                }
            },
        });

        return () => {
            dispose();
        };
    }, [spaceId, currentServer, token, dispatch]);
}

import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
