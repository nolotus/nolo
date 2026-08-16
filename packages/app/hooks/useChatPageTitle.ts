// 文件路径: app/hooks/useChatPageTitle.ts

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "app/store";
import type { Message } from "chat/messages/types";
import { buildMessageTextPreview } from "chat/messages/extractTextFromContent";
import {
    selectLastAssistantMessage,
    useHasStreamingMessage,
} from "chat/messages/messageSlice";

const BASE_TITLE = "Nolo";

const buildPreview = (msg?: Message, maxLen = 20): string =>
    msg ? buildMessageTextPreview(msg.content, maxLen) : "";

/**
 * 根据消息 streaming 状态和最新回复更新 document.title
 */
export const useChatPageTitle = () => {
    // Wave11: read streaming flag from the session store index via
    // useSyncExternalStore (defaults to the active dialog), not
    // useSelector(selectHasStreamingMessage), so streaming-token mutations
    // re-render without scanning Redux msgs.
    const hasStreaming = useHasStreamingMessage();
    const lastAssistant = useSelector((state: RootState) =>
        selectLastAssistantMessage(state)
    );

    // 记录进入页面时的原始标题
    const originTitleRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (originTitleRef.current == null) {
            originTitleRef.current = document.title || BASE_TITLE;
        }
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;

        const origin = originTitleRef.current || BASE_TITLE;

        if (hasStreaming) {
            // 流式生成中
            document.title = `生成中… · ${origin}`;
            return;
        }

        // 已结束，展示最后一条 assistant 回复的预览
        const preview = buildPreview(lastAssistant);
        if (preview) {
            document.title = `${preview} · ${origin}`;
        } else {
            document.title = origin;
        }
    }, [hasStreaming, lastAssistant]);
};