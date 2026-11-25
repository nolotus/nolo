import * as stylex from "@stylexjs/stylex";
import { dialogPageStyles } from "./dialogPageStyles";
import "./dialogStylexEscapeHatch.css";

// `.page-assistant-panel__chat-messages` 类名保留在 DOM：运行时
// scrollContainerSelector 与 dialogStylexEscapeHatch.css 的后代覆盖规则
// 依赖该类名；StyleX 原子类经组件 className prop 通道手动拼接。
const PAP_CHAT_MESSAGES_CLASS = `page-assistant-panel__chat-messages ${
  stylex.props(dialogPageStyles.papChatMessages).className ?? ''
}`.trim();
import React, {
    memo,
    useEffect,
    useCallback,
    useState,
    useRef,
    type ReactNode,
} from "react";
import { useNavigate } from "app/routing";
import { LuBot } from "react-icons/lu";
import { toast } from "app/utils/toast"
import { useTranslation } from "react-i18next";

import StreamingIndicator from "render/web/ui/StreamingIndicator";

import { useAppDispatch, useAppSelector } from "app/store";
import { useIsLoggedIn } from "identity";
import type { ReferenceItem } from "app/types";
import {
    useFavoriteAgentIds,
    useFavoritesError,
    useFavoritesInitialized,
    useFavoritesLoading,
} from "app/favorite/favoriteStore";

import {
    createDialog,
    initDialog,
    clearDialogState,
} from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import {
    initMsgs,
    resetMsgs,
    selectAllMsgs,
    useIsLoadingInitial,
    useMessageSessionError,
} from "chat/messages/messageSlice";
import { sendFirstMessage } from "chat/messages/sendFirstMessage";
import { publishChatInputSeed } from "chat/hooks/useChatInputSeed";
import {
    consumeEpubPromptDraft,
    useEpubPromptDraft,
} from "create/space/epub/epubAssistantStore";
import { ChatArea } from "chat/web/ChatArea";
import { extractCustomId } from "core/prefix";
import { useCurrentTable } from "render/table/tableStore";
import ObjectAssistantPanel from "./ObjectAssistantPanel";
import { ChatDisplayContext } from "chat/messages/web/ChatDisplayContext";

// 运行时 Agent 配置（工具 / 编辑上下文）
import type { AgentRuntimeOptions } from "ai/agent/types";

// --- 小组件 ---

type EmptyStateProps = {
    message: string;
    actionText?: string;
    onAction?: () => void;
};

const EmptyState = memo(
    ({ message, actionText, onAction }: EmptyStateProps) => (
        <div {...stylex.props(dialogPageStyles.emptyState)}>
            <div {...stylex.props(dialogPageStyles.emptyStateIcon)} aria-hidden="true">
                <LuBot size={40} aria-hidden="true" />
            </div>
            <p {...stylex.props(dialogPageStyles.emptyStateText)}>{message}</p>

            {actionText && onAction && (
                <button
                    type="button"
                    {...stylex.props(dialogPageStyles.emptyStateBtn)}
                    onClick={onAction}
                >
                    <LuBot size={16} aria-hidden="true" />
                    <span>{actionText}</span>
                </button>
            )}
        </div>
    )
);

// --- 收藏助手逻辑（读 favoriteStore hooks，不再 init）---

const useFavoriteAgentsLogic = (
    isLoggedIn: boolean,
    preferredAgentKeys: string[] = []
) => {
    const { t } = useTranslation();
    const favoriteAgentKeys = useFavoriteAgentIds();
    const loading = useFavoritesLoading();
    const initialized = useFavoritesInitialized();
    const error = useFavoritesError();

    useEffect(() => {
        if (isLoggedIn && error) {
            toast.error(t("loadFavoriteError", "加载收藏失败，请稍后重试"));
        }
    }, [isLoggedIn, error, t]);

    const isLoading =
        isLoggedIn && (!initialized || (loading && favoriteAgentKeys.length === 0));
    const agentKeys = React.useMemo(() => {
        const merged: string[] = [];
        const seen = new Set<string>();

        for (const key of [...preferredAgentKeys, ...favoriteAgentKeys]) {
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push(key);
        }

        return merged;
    }, [favoriteAgentKeys, preferredAgentKeys]);
    return {
        agentKeys,
        isLoading,
    };
};

export interface AssistantQuickPrompt {
    label: string;
    prompt: string;
}

export interface ArtifactAssistantPanelProps {
    panelTitle?: string;
    activePanelTitle?: string;
    skillBadge?: string;
    loginMessage?: string;
    emptyMessage?: string;
    runtimeOptions?: AgentRuntimeOptions;
    preferredAgentKeys?: string[];
    /** 建对话时写入的对话级引用（如内置对象技能），切换 agent 后仍然生效。 */
    extraReferences?: ReferenceItem[];
    /** 仅 kind === "file" 时透传：用于订阅并定向消费对应 EPUB 的引用草稿。 */
    epubContentKey?: string;
    /** 空对话态展示的克制快捷提问芯片（如 EPUB 阅读器 3 个章节快捷提问）。 */
    quickPrompts?: ReadonlyArray<AssistantQuickPrompt>;
}

// --- 主组件：对象助手侧栏 + 对话（agent 切换在 composer 内完成） ---

export const ArtifactAssistantPanel = memo(
    ({
        panelTitle,
        activePanelTitle,
        skillBadge,
        loginMessage,
        emptyMessage,
        runtimeOptions,
        preferredAgentKeys = [],
        extraReferences,
        epubContentKey,
        quickPrompts,
    }: ArtifactAssistantPanelProps) => {
    const { t } = useTranslation(["ai", "chat"]);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const isLoggedIn = useIsLoggedIn();
    const [sideDialogKey, setSideDialogKey] = useState<string | null>(null);
    const [isCreatingDialog, setIsCreatingDialog] = useState(false);
    const [createError, setCreateError] = useState(false);
    const [isSendingQuickPrompt, setIsSendingQuickPrompt] = useState(false);
    const hasAutoStartedRef = useRef(false);

    const dialogId = sideDialogKey ? extractCustomId(sideDialogKey) : null;
    const isLoadingInitial = useIsLoadingInitial(dialogId);
    const messageError = useMessageSessionError(dialogId);
    const currentDialogConfig = useCurrentDialogConfig();
    const messageCount = useAppSelector((state) =>
        dialogId && (state as any)?.message ? selectAllMsgs(state, dialogId).length : 0
    );
    const pendingEpubPromptDraft = useEpubPromptDraft(epubContentKey);
    const { agentKeys, isLoading } = useFavoriteAgentsLogic(
        isLoggedIn,
        preferredAgentKeys
    );

    // 兼容 nolo 默认档（auto 模式，无 primaryAgentKey）与指定 Agent（fixed 模式）
    const isChatActive =
        !!dialogId &&
        !!currentDialogConfig &&
        currentDialogConfig.dbKey === sideDialogKey;

    useEffect(() => {
        if (
            !epubContentKey ||
            !pendingEpubPromptDraft ||
            !isChatActive ||
            !dialogId ||
            isCreatingDialog ||
            isLoadingInitial
        ) {
            return;
        }
        const draft = consumeEpubPromptDraft(epubContentKey);
        if (!draft) return;
        publishChatInputSeed({
            text: draft,
            mode: "append",
            focus: true,
            dialogId,
        });
    }, [
        dialogId,
        epubContentKey,
        isChatActive,
        isCreatingDialog,
        isLoadingInitial,
        pendingEpubPromptDraft,
    ]);

    // 首次打开：优先用收藏/偏好首个 agent，无收藏时直接以 nolo 默认档（auto）建对话
    const handleStartDialog = useCallback(
        async (agentKey: string) => {
            if (!isLoggedIn) {
                toast.error(
                    loginMessage ??
                        t("chat:loginToUseAssistants", "登录后可在侧边栏使用 AI 助手")
                );
                return;
            }

            // 建新对话前，清理旧对话状态
            dispatch(clearDialogState());
            dispatch(resetMsgs(dialogId ? { dialogId } : undefined));

            setIsCreatingDialog(true);
            setCreateError(false);
            try {
                const result = await dispatch(
                    createDialog({
                        ...(agentKey
                            ? { cybots: [agentKey] }
                            : { cybots: [], agentMode: "auto" as const }),
                        ...(extraReferences?.length ? { extraReferences } : {}),
                    })
                ).unwrap();

                const newDialogKey: string | undefined = result?.dbKey;
                if (!newDialogKey) {
                    throw new Error("Missing dialog key from createDialog result");
                }

                setSideDialogKey(newDialogKey);
                isNewlyCreatedRef.current = true;
            } catch (error) {
                console.error("Failed to create side dialog:", error);
                toast.error(
                    t("chat:createSideDialogFailed", "创建对话失败，请稍后重试")
                );
                setSideDialogKey(null);
                setCreateError(true);
            } finally {
                setIsCreatingDialog(false);
            }
        },
        [dialogId, dispatch, extraReferences, isLoggedIn, loginMessage, t]
    );

    const isNewlyCreatedRef = useRef(false);

    useEffect(() => {
        if (
            hasAutoStartedRef.current ||
            !isLoggedIn ||
            isLoading ||
            isCreatingDialog ||
            sideDialogKey
        ) {
            return;
        }

        hasAutoStartedRef.current = true;
        void handleStartDialog(agentKeys[0] ?? "");
    }, [
        agentKeys,
        handleStartDialog,
        isCreatingDialog,
        isLoading,
        isLoggedIn,
        sideDialogKey,
    ]);

    // 选中对话后，初始化 dialog 数据 + 消息（支持 Abort）
    useEffect(() => {
        if (!sideDialogKey || !dialogId) return;

        const initDialogPromise = dispatch(initDialog(sideDialogKey));
        const initMsgsPromise = dispatch(
            initMsgs({
                dialogId,
                dialogKey: sideDialogKey,
                isNew: isNewlyCreatedRef.current,
            })
        );

        // 重置 flag，确保刷新或后续操作能正常加载
        isNewlyCreatedRef.current = false;

        return () => {
            (initDialogPromise as any).abort?.();
            (initMsgsPromise as any).abort?.();
        };
    }, [sideDialogKey, dialogId, dispatch]);

    // 侧栏卸载时清理对话状态 + 消息
    useEffect(
        () => () => {
            dispatch(clearDialogState());
            dispatch(resetMsgs(dialogId ? { dialogId } : undefined));
        },
        [dialogId, dispatch]
    );

    const goLogin = () => navigate("/login");

    const showQuickPrompts = Boolean(
        quickPrompts?.length &&
        sideDialogKey &&
        dialogId &&
        isChatActive &&
        !isCreatingDialog &&
        !isLoadingInitial &&
        !messageError &&
        messageCount === 0
    );

    const handleQuickPromptClick = useCallback(
        async (prompt: string) => {
            if (!sideDialogKey || isSendingQuickPrompt) return;
            setIsSendingQuickPrompt(true);
            try {
                await dispatch(
                    sendFirstMessage({
                        text: prompt,
                        dialogKey: sideDialogKey,
                        runtimeOptions,
                    }) as any
                );
            } catch (error) {
                console.error("Failed to send quick prompt:", error);
                toast.error(t("chat:sendFailMessage", "发送失败，请稍后重试"));
            } finally {
                setIsSendingQuickPrompt(false);
            }
        },
        [dispatch, isSendingQuickPrompt, runtimeOptions, sideDialogKey, t]
    );

    const isShowingChat = !!sideDialogKey;

    let body: ReactNode;

    if (!isLoggedIn) {
        // 未登录：提示登录
        body = (
                <EmptyState
                    message={
                        loginMessage ??
                        t("chat:loginToUseAssistants", "登录后可在侧边栏使用 AI 助手")
                    }
                    actionText={t("chat:goLogin", "去登录")}
                    onAction={goLogin}
            />
        );
    } else if (!isShowingChat) {
        if (createError) {
            body = (
                <EmptyState
                    message={
                        emptyMessage ??
                        t("chat:createSideDialogFailed", "AI 助手暂时不可用，请稍后重试")
                    }
                    actionText={t("chat:retry", "重试")}
                    onAction={() => void handleStartDialog(agentKeys[0] ?? "")}
                />
            );
        } else {
            body = (
                <div {...stylex.props(dialogPageStyles.papLoading)}>
                    <StreamingIndicator />
                </div>
            );
        }
    } else {
        // 对话界面：header 标题 + ChatArea（agent 选择与切换统一复用 MessageInputContainer 默认三层选择器）
        if (isCreatingDialog || isLoadingInitial || !isChatActive) {
            body = (
                <div {...stylex.props(dialogPageStyles.papLoading)}>
                    <StreamingIndicator />
                </div>
            );
        } else if (messageError) {
            body = (
                <EmptyState
                    message={t(
                        "chat:loadSideDialogError",
                        "加载对话失败，请稍后重试"
                    )}
                />
            );
        } else if (!dialogId) {
            body = null;
        } else {
            body = (
                <div data-hook="dialog-esc-pap-chat" {...stylex.props(dialogPageStyles.papChat)}>
                    {showQuickPrompts && quickPrompts && (
                        <div
                            {...stylex.props(dialogPageStyles.papQuickPrompts)}
                            role="group"
                            aria-label={t("chat:quickPrompts", "快捷提问")}
                            data-testid="epub-quick-prompts"
                        >
                            {quickPrompts.map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    disabled={isSendingQuickPrompt}
                                    {...stylex.props(dialogPageStyles.papQuickPromptChip)}
                                    onClick={() => void handleQuickPromptClick(item.prompt)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <ChatDisplayContext.Provider value={{ compactDeployCards: true }}>
                    <ChatArea
                        dialogId={dialogId}
                        scrollContainerSelector=".page-assistant-panel__chat-messages"
                        runtimeOptions={runtimeOptions}
                        messagesClassName={PAP_CHAT_MESSAGES_CLASS}
                    />
                    </ChatDisplayContext.Provider>
                </div>
            );
        }
    }

    return (
        <aside {...stylex.props(dialogPageStyles.pap)}>
            <header {...stylex.props(dialogPageStyles.papHeader)}>
                <div {...stylex.props(dialogPageStyles.papTitle)}>
                    <span {...stylex.props(dialogPageStyles.papTitleIcon)} aria-hidden="true">
                        <LuBot size={14} aria-hidden="true" />
                    </span>
                    <span>
                        {isShowingChat
                            ? activePanelTitle ?? t("chat:aiAssistant", "AI 助手")
                            : panelTitle ?? t("chat:aiAssistant", "AI 助手")}
                    </span>
                    {skillBadge && (
                        <span {...stylex.props(dialogPageStyles.papSkillBadge)}>
                            {skillBadge}
                        </span>
                    )}
                </div>
            </header>

            <div {...stylex.props(dialogPageStyles.papBody)}>{body}</div>


        </aside>
    );
    }
);

// --- 页面默认包装：仅在当前有表格时注入 table 编辑上下文 ---

const PageAssistantPanelBase: React.FC = () => {
    const currentTable = useCurrentTable();
    return <ObjectAssistantPanel kind={currentTable ? "table" : "page"} contentKey={currentTable?.dbKey} />;
};

const PageAssistantPanel = memo(PageAssistantPanelBase);

export default PageAssistantPanel;
