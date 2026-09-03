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
    switchDialogAgent,
} from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import {
    initMsgs,
    resetMsgs,
    useIsLoadingInitial,
    useMessageSessionError,
} from "chat/messages/messageSlice";
import { ChatArea } from "chat/web/ChatArea";
import { extractCustomId } from "core/prefix";
import { selectCurrentTable } from "render/table/tableSlice";
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
    const isEmpty =
        isLoggedIn && initialized && !loading && agentKeys.length === 0;

    return {
        agentKeys,
        favoriteAgentKeys,
        isLoading,
        isEmpty,
    };
};

export interface ArtifactAssistantPanelProps {
    panelTitle?: string;
    activePanelTitle?: string;
    loginMessage?: string;
    emptyMessage?: string;
    runtimeOptions?: AgentRuntimeOptions;
    preferredAgentKeys?: string[];
    /** 建对话时写入的对话级引用（如内置对象技能），切换 agent 后仍然生效。 */
    extraReferences?: ReferenceItem[];
}

// --- 主组件：对象助手侧栏 + 对话（agent 切换在 composer 内完成） ---

export const ArtifactAssistantPanel = memo(
    ({
        panelTitle,
        activePanelTitle,
        loginMessage,
        emptyMessage,
        runtimeOptions,
        preferredAgentKeys = [],
        extraReferences,
    }: ArtifactAssistantPanelProps) => {
    const { t } = useTranslation(["ai", "chat"]);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const isLoggedIn = useIsLoggedIn();
    const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
    const [sideDialogKey, setSideDialogKey] = useState<string | null>(null);
    const [isCreatingDialog, setIsCreatingDialog] = useState(false);
    const hasAutoStartedRef = useRef(false);

    const dialogId = sideDialogKey ? extractCustomId(sideDialogKey) : null;
    const isLoadingInitial = useIsLoadingInitial(dialogId);
    const messageError = useMessageSessionError(dialogId);
    const currentDialogConfig = useCurrentDialogConfig();
    const { agentKeys, favoriteAgentKeys, isLoading, isEmpty } = useFavoriteAgentsLogic(
        isLoggedIn,
        preferredAgentKeys
    );

    const isChatActive =
        !!dialogId &&
        !!selectedAgentKey &&
        !!currentDialogConfig &&
        currentDialogConfig.dbKey === sideDialogKey;

    // 首次打开：用默认 agent 创建 dialog + 初始化消息
    const handleSelectAgent = useCallback(
        async (agentKey: string) => {
            if (!isLoggedIn) {
                toast.error(t("chat:loginToUseAssistants", "登录后才能使用页面助手"));
                return;
            }

            // 切换助手前，清理旧对话状态
            dispatch(clearDialogState());
            dispatch(resetMsgs(dialogId ? { dialogId } : undefined));

            setIsCreatingDialog(true);
            try {
                const result = await dispatch(
                    createDialog({
                        cybots: [agentKey],
                        ...(extraReferences?.length ? { extraReferences } : {}),
                    })
                ).unwrap();

                const newDialogKey: string | undefined = result?.dbKey;
                if (!newDialogKey) {
                    throw new Error("Missing dialog key from createDialog result");
                }

                setSelectedAgentKey(agentKey);
                setSideDialogKey(newDialogKey);
                isNewlyCreatedRef.current = true;
            } catch (error) {
                console.error("Failed to create side dialog:", error);
                toast.error(
                    t("chat:createSideDialogFailed", "创建对话失败，请稍后重试")
                );
                setSelectedAgentKey(null);
                setSideDialogKey(null);
            } finally {
                setIsCreatingDialog(false);
            }
        },
        [dialogId, dispatch, extraReferences, isLoggedIn, t]
    );

    // composer 内切换 agent：就地换当前 dialog 的 active agent，
    // 对话记录与 dialog 级 extraReferences（对象技能）保留。
    const handleSwitchAgent = useCallback(
        async (agentKey: string) => {
            try {
                await dispatch(switchDialogAgent({ agentKey })).unwrap();
            } catch (error) {
                console.error("Failed to switch side dialog agent:", error);
                toast.error(
                    t("chat:switchAssistantFailed", "切换助手失败，请重试")
                );
            }
        },
        [dispatch, t]
    );

    const isNewlyCreatedRef = useRef(false);

    useEffect(() => {
        if (
            hasAutoStartedRef.current ||
            !isLoggedIn ||
            isLoading ||
            isCreatingDialog ||
            selectedAgentKey ||
            sideDialogKey ||
            agentKeys.length === 0
        ) {
            return;
        }

        hasAutoStartedRef.current = true;
        void handleSelectAgent(agentKeys[0]);
    }, [
        agentKeys,
        handleSelectAgent,
        isCreatingDialog,
        isLoading,
        isLoggedIn,
        selectedAgentKey,
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

    const goExplore = () => navigate("/explore");
    const goLogin = () => navigate("/login");

    const isShowingChat = !!selectedAgentKey && !!sideDialogKey;
    // picker 的当前 agent 以 dialog 配置为准（composer 切换会更新它）
    const activeAgentKey =
        getActiveDialogAgentId(currentDialogConfig) ?? selectedAgentKey;

    let body: ReactNode;

    if (!isLoggedIn) {
        // 未登录：提示登录
        body = (
                <EmptyState
                    message={t(
                        "chat:loginToUseAssistants",
                        loginMessage ?? "登录后可在侧边栏使用你的常用 AI 助手"
                    )}
                    actionText={t("chat:goLogin", "去登录")}
                    onAction={goLogin}
            />
        );
    } else if (!isShowingChat) {
        // 对话尚未建立：收藏加载完且无可用 agent 才显示空态，其余时间等自动开始
        if (isEmpty) {
            body = (
                <EmptyState
                    message={t(
                        "chat:noFavoriteAgents",
                        emptyMessage ?? "还没有收藏任何 AI 助手，先去逛逛吧"
                    )}
                    actionText={t("chat:goExplore", "去 AI 广场逛逛")}
                    onAction={goExplore}
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
        // 对话界面：header 标题 + ChatArea（agent 切换在 composer 里）
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
                    <ChatDisplayContext.Provider value={{ compactDeployCards: true }}>
                    <ChatArea
                        dialogId={dialogId}
                        scrollContainerSelector=".page-assistant-panel__chat-messages"
                        runtimeOptions={runtimeOptions}
                        messagesClassName={PAP_CHAT_MESSAGES_CLASS}
                        agentPicker={{
                            candidates: agentKeys.map((key) => ({
                                key,
                                isFavorite: favoriteAgentKeys.includes(key),
                                // preferredAgentKeys 是侧栏传入的偏好/技能 agent，
                                // 不等于"用户自己创建"，不标 isOwned 以免 👤 badge 语义错。
                                isOwned: false,
                                isPublic: !preferredAgentKeys.includes(key),
                            })),
                            activeAgentKey,
                            onSelect: handleSwitchAgent,
                        }}
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
                            ? activePanelTitle ?? t("chat:pageAssistant", "页面助手")
                            : panelTitle ?? t("chat:favoriteAssistants", "常用助手")}
                    </span>
                </div>
            </header>

            <div {...stylex.props(dialogPageStyles.papBody)}>{body}</div>


        </aside>
    );
    }
);

// --- 页面默认包装：仅在当前有表格时注入 table 编辑上下文 ---

const PageAssistantPanelBase: React.FC = () => {
    const currentTable = useAppSelector(selectCurrentTable);
    return <ObjectAssistantPanel kind={currentTable ? "table" : "page"} contentKey={currentTable?.dbKey} />;
};

const PageAssistantPanel = memo(PageAssistantPanelBase);

export default PageAssistantPanel;
