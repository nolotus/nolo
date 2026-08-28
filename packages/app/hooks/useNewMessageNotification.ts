// 文件路径: app/hooks/useNewMessageNotification.ts

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "app/store";
import type { Message } from "chat/messages/types";
import { buildMessageTextPreview } from "chat/messages/extractTextFromContent";
import { selectLastAssistantMessage } from "chat/messages/messageSlice";

const buildBody = (msg?: Message, maxLen = 80): string =>
    msg ? buildMessageTextPreview(msg.content, maxLen) : "";

const canUseNotification = () =>
    typeof window !== "undefined" &&
    typeof Notification !== "undefined";

/**
 * 主动去请求一次权限，在用户点击某个“开启通知”开关时调用
 */
export const requestNotificationPermission = async () => {
    if (!canUseNotification()) return "unsupported" as const;
    if (Notification.permission === "granted") return "granted" as const;
    if (Notification.permission === "denied") return "denied" as const;
    const result = await Notification.requestPermission();
    return result;
};

/**
 * 在页面不可见且有新的 assistant 消息时发送通知
 */
export const useNewMessageNotification = () => {
    const lastAssistant = useSelector((state: RootState) =>
        selectLastAssistantMessage(state)
    );
    const lastNotifiedIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!lastAssistant) return;

        // 防止对同一条消息反复通知
        if (lastNotifiedIdRef.current === lastAssistant.id) return;
        lastNotifiedIdRef.current = lastAssistant.id;

        if (!canUseNotification()) return;
        if (Notification.permission !== "granted") return;

        // 只有在标签页不在前台时才弹通知
        if (typeof document !== "undefined" &&
            document.visibilityState === "visible") {
            return;
        }

        const body = buildBody(lastAssistant);
        if (!body) return;

        new Notification("有新的回复", {
            body,
            tag: lastAssistant.id, // 相同 tag 的通知会合并
        });
    }, [lastAssistant]);
};