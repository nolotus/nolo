// 文件路径: packages/chat/messages/web/MessageList.tsx

import * as stylex from "@stylexjs/stylex";
import React, {
  useRef,
  useLayoutEffect,
  useCallback,
  useState,
  useEffect,
  useMemo,
  Component,
} from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectAllMsgs,
  useHasStreamingMessage,
  loadOlderMessages,
  selectLastAssistantMessage,
  useMessagesLoadingState,
  useLastStreamTimestamp,
} from "chat/messages/messageSlice";
import MessageItem from "./MessageItem";
import { ToolMessageItem } from "./ToolMessageItem";
import ToolMessageGroup from "./ToolMessageGroup";
import {
  groupConsecutiveToolEntries,
  type GroupedRenderEntry,
} from "./groupToolEntries";
import ChildRunEventRow, {
  mergeWakeEventsIntoEntries,
  type RenderEntry,
} from "./ChildRunEventRow";
import TopLoadingIndicator from "./TopLoadingIndicator";
import { messagesStyles as styles } from "./messagesStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";
import { ScrollToBottomButton } from "chat/web/ScrollToBottomButton";
import { ScrollToTopButton } from "chat/web/ScrollToTopButton";
import {
  selectShowScrollToTopButton,
  selectShowScrollToBottomButton,
} from "app/settings/settingSlice";

import { useActiveControllers } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { createDialog } from "chat/dialog/dialogSlice";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import {
  getQuickChatFirstMessageText,
  type QuickChatRouteState,
} from "chat/dialog/dialogPageRenderMode";
import { useUserId } from "identity";
import { useLocation, useNavigate } from "app/routing";
import { AppRoutePaths } from "app/constants/routePaths";
import { useLoopStopReason } from "./useLoopStopReason";
import { LoopStopBadge } from "./LoopStopBadge";
import { isHiddenOrchestratorToolMessage } from "../toolPresentation";
import {
  isAssistantToolStub,
  isIntermediateAssistantProgress,
  shouldAutoCollapseToolGroup,
} from "./assistantReplyPendingState";
import { extractCustomId } from "core/prefix";
import { useAllToolRuns } from "ai/tools/toolRunStore";
import { LuBrain } from "react-icons/lu";
import { AssistantReplyPending } from "./AssistantReplyPending";
import { deriveConversationActivity } from "../../runtime/conversationActivity";
import { IntermediateNarrationRow } from "./IntermediateNarrationRow";
import TodoCard from "./TodoCard";
import { selectLatestConversationTodo } from "../todoState";
import { selectSystemBuiltinSkills } from "app/settings/settingSlice";

const LOAD_THRESHOLD = 50;
const DEFAULT_SCROLL_CONTAINER_SELECTOR = ".MainLayout__main";

// 动态计算"接近底部"阈值，适配不同屏幕
const getNearBottomThreshold = () =>
  Math.min(window.innerHeight * 0.15, 200);

interface MessagesListProps {
  dialogId: string;
  scrollContainerSelector?: string;
}

interface MessageRowErrorBoundaryProps {
  children: React.ReactNode;
}

interface MessageRowErrorBoundaryState {
  hasError: boolean;
}

class MessageRowErrorBoundary extends Component<
  MessageRowErrorBoundaryProps,
  MessageRowErrorBoundaryState
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Message row render failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-messages__item-error">
          这条消息加载失败
        </div>
      );
    }
    return this.props.children;
  }
}

type RenderableMessage = any;

const buildMessageRenderEntries = (
  messages: RenderableMessage[]
): GroupedRenderEntry[] => {
  const entries: GroupedRenderEntry[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i];
    if (!msg || typeof msg.id !== "string") continue;
    if (isHiddenOrchestratorToolMessage(msg)) continue;
    if (isAssistantToolStub(msg)) continue;

    entries.push({ type: "single", key: msg.id, message: msg });
  }

  return entries;
};

const MessagesList: React.FC<MessagesListProps> = ({
  dialogId,
  scrollContainerSelector,
}) => {
  const dispatch = useAppDispatch();
  const listRef = useRef<HTMLDivElement>(null);

  const messages = useAppSelector((state) => selectAllMsgs(state, dialogId));
  const location = useLocation();
  const currentUserId = useUserId();
  // 快速对话跳转过来时，首条用户消息是异步落库的，会晚于 AI 流出现。
  // 用路由携带的文本先渲染一条乐观 user 气泡，真实消息落库后（store 里出现
  // 任一 user 消息）自动撤下，避免"先看到 AI，我的消息才补上"的错序闪烁。
  const quickChatFirstMessageText = getQuickChatFirstMessageText(
    location.state as QuickChatRouteState,
  );
  const systemBuiltinSkills = useAppSelector(selectSystemBuiltinSkills);
  const conversationTodoEnabled = systemBuiltinSkills["conversation-todo"] !== false;
  const currentTodo = useMemo(
    () => selectLatestConversationTodo(messages),
    [messages],
  );
  const displayMessages = useMemo(() => {
    if (!quickChatFirstMessageText) return messages;
    if (messages.some((message: any) => message?.role === "user")) {
      return messages;
    }
    const optimisticUserMessage = {
      id: "__optimistic_quickchat_user__",
      role: "user",
      content: quickChatFirstMessageText,
      userId: currentUserId,
      dialogId,
    };
    return [optimisticUserMessage, ...messages];
  }, [messages, quickChatFirstMessageText, currentUserId, dialogId]);
  const { isLoadingOlder, hasMoreOlder } = useMessagesLoadingState(dialogId);
  const lastStreamTimestamp = useLastStreamTimestamp(dialogId);
  // Wave11: read streaming flag from the session store index via
  // useSyncExternalStore, not useAppSelector(selectHasStreamingMessage), so
  // streaming-token mutations re-render without scanning Redux msgs.
  const hasStreamingMessage = useHasStreamingMessage(dialogId);
  // Primitive id only — content stream tokens must not invalidate list-level branch flags.
  const lastAssistantMessageId = useAppSelector(
    (state) => selectLastAssistantMessage(state, dialogId)?.id ?? null
  );

  const currentDialogConfig = useCurrentDialogConfig();
  const activeDialogKey =
    currentDialogConfig?.dbKey &&
    extractCustomId(currentDialogConfig.dbKey) === dialogId
      ? currentDialogConfig.dbKey
      : undefined;
  const activeControllers = useActiveControllers(activeDialogKey);
  const isRunning =
    !!activeDialogKey && Object.keys(activeControllers).length > 0;
  const loopStopReason = useLoopStopReason(isRunning);
  const allToolRuns = useAllToolRuns();
  const currentMessageIds = useMemo(
    () => new Set(messages.map((message: any) => message?.id).filter(Boolean)),
    [messages]
  );
  const hasUnresolvedConfirmRun = useMemo(
    () =>
      allToolRuns.some(
        (run) =>
          currentMessageIds.has(run.messageId) &&
          run.interaction === "confirm" &&
          (run.status === "pending" || run.status === "running")
      ),
    [allToolRuns, currentMessageIds]
  );
  const visibleLoopStopReason =
    loopStopReason === "pending" && !hasUnresolvedConfirmRun
      ? null
      : loopStopReason;
  const navigate = useNavigate();

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const scrollToTopEnabled = useAppSelector(selectShowScrollToTopButton);
  const scrollToBottomEnabled = useAppSelector(selectShowScrollToBottomButton);
  // 首次加载标记：跳过入场动画，避免大量消息时动画过慢
  const [isInitialRender, setIsInitialRender] = useState(true);

  const stateRef = useRef({
    isInitialLoad: true,
    prevMessagesLength: 0,
    isLoadingOlder: false,
    hasMoreOlder: true,
    scrollContainer: null as HTMLElement | null,
    isNearBottom: true,
  });
  // RAF 节流 id
  const rafIdRef = useRef<number | null>(null);
  const wasStreamingRef = useRef(false);
  const forceFollowCurrentTurnRef = useRef(false);

  stateRef.current.isLoadingOlder = isLoadingOlder;
  stateRef.current.hasMoreOlder = hasMoreOlder;

  // NEW: handleCreateNewDialog
  const handleCreateNewDialog = useCallback(async () => {
    if (!currentDialogConfig || !currentDialogConfig.cybots) return;

    try {
      const result = await dispatch(
        createDialog({
          cybots: currentDialogConfig.cybots,
          category: currentDialogConfig.category,
          inheritFromDialogKey: currentDialogConfig.dbKey,
        })
      ).unwrap();

      if (result && result.dbKey) {
        navigate(buildDialogUrl(result.dbKey, result.spaceId), {
          state: { isNew: true },
        });
      }
    } catch (err) {
      console.error("Failed to create inherited dialog:", err);
    }
  }, [dispatch, currentDialogConfig, navigate]);

  // 查找滚动容器
  const getScroller = useCallback(() => {
    const selector =
      scrollContainerSelector ?? DEFAULT_SCROLL_CONTAINER_SELECTOR;

    return listRef.current?.closest(selector) as HTMLElement | null;
  }, [scrollContainerSelector]);

  // 将滚动状态写到容器 dataset 上，CSS 用属性选择器切换 mask-image。
  // 直接写 dataset 不触发 React 重渲染；scroll 事件本身已节流到一帧一次。
  // 1px 阈值规避浮点抖动。标记 data-nolo-chat-scroll-shadow 让 CSS 只在
  // 聊天页面激活渐隐，不污染其它共用 .MainLayout__main 的页面。
  const updateScrollShadowAttrs = useCallback(() => {
    const scroller = stateRef.current.scrollContainer;
    if (!scroller) return;
    const distanceFromBottom =
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    if (scroller.scrollTop > 1) {
      scroller.setAttribute("data-top-scroll", "");
    } else {
      scroller.removeAttribute("data-top-scroll");
    }
    if (distanceFromBottom > 1) {
      scroller.setAttribute("data-bottom-scroll", "");
    } else {
      scroller.removeAttribute("data-bottom-scroll");
    }
  }, []);


  // 使用 rAF 节流的滚到底部方法，避免流式输出时高频 scrollTo
  const scrollToBottomRAF = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (rafIdRef.current) return; // 已有一帧在排队
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const scroller = getScroller() ?? stateRef.current.scrollContainer;
        if (!scroller) return;
        scroller.scrollTo({ top: scroller.scrollHeight, behavior });
      });
    },
    [getScroller]
  );

  const scheduleStreamingFollowScroll = useCallback(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const scroller = getScroller() ?? stateRef.current.scrollContainer;
      if (!scroller) return;
      const distance = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      if (distance <= 1) return;
      if (distance < 120 || stateRef.current.isNearBottom) {
        scroller.scrollTop = scroller.scrollHeight;
        return;
      }
      scroller.scrollTop += distance * 0.35;
    });
  }, [getScroller]);

  // 自动滚动逻辑
  useLayoutEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;

    stateRef.current.scrollContainer = scroller;
    scroller.setAttribute("data-nolo-chat-scroll-shadow", "");
    updateScrollShadowAttrs();

    const prevMessagesLength = stateRef.current.prevMessagesLength;
    const appendedMessages =
      messages.length > prevMessagesLength
        ? messages.slice(prevMessagesLength)
        : [];
    const appendedUserMessage = [...appendedMessages]
      .reverse()
      .find((msg) => msg.role === "user");

    // 首次加载：立即滚到底部（无动画）
    if (stateRef.current.isInitialLoad && messages.length > 0) {
      requestAnimationFrame(() => {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
      });
      stateRef.current.isInitialLoad = false;
      stateRef.current.prevMessagesLength = messages.length;
      requestAnimationFrame(() => setIsInitialRender(false));
      return;
    }

    if (
      wasStreamingRef.current &&
      !hasStreamingMessage &&
      (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current)
    ) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
      forceFollowCurrentTurnRef.current = false;
    }

    // 用户自己发送新消息时，直接进入本轮跟随，直到用户手动上滑退出
    if (appendedUserMessage) {
      forceFollowCurrentTurnRef.current = true;
      scrollToBottomRAF("auto");
    } else if (messages.length > prevMessagesLength) {
      if (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current) {
        if (hasStreamingMessage) {
          scheduleStreamingFollowScroll();
        } else {
          scrollToBottomRAF("smooth");
        }
      }
    } else if (
      (stateRef.current.isNearBottom || forceFollowCurrentTurnRef.current) &&
      lastStreamTimestamp
    ) {
      // 流式输出内容更新（消息数量没变，但内容在增长）
      if (hasStreamingMessage) {
        scheduleStreamingFollowScroll();
      } else {
        scrollToBottomRAF("smooth");
      }
    }

    wasStreamingRef.current = hasStreamingMessage;
    stateRef.current.prevMessagesLength = messages.length;
  }, [
    messages,
    lastStreamTimestamp,
    hasStreamingMessage,
    getScroller,
    scrollToBottomRAF,
    scheduleStreamingFollowScroll,
  ]);

  // 清理 rAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      isInitialLoad: true,
      prevMessagesLength: 0,
      scrollContainer: null,
      isNearBottom: true,
    };
    wasStreamingRef.current = false;
    forceFollowCurrentTurnRef.current = false;
    setIsInitialRender(true);
    setShowScrollToBottom(false);
    setShowScrollToTop(false);
  }, [dialogId]);

  // 加载旧消息
  const handleLoadOlder = useCallback(() => {
    if (
      stateRef.current.isLoadingOlder ||
      !stateRef.current.hasMoreOlder ||
      messages.length === 0
    )
      return;

    const scroller = getScroller();
    if (!scroller) return;

    const prevScrollHeight = scroller.scrollHeight;
    const prevScrollTop = scroller.scrollTop;

    const oldestMessage = messages[0];
    const beforeKey = (oldestMessage as any).dbKey ?? oldestMessage.id;

    if (!beforeKey) return;

    dispatch(
      loadOlderMessages({
        dialogId,
        dialogKey: currentDialogConfig?.dbKey,
        beforeKey,
      })
    ).then(() => {
      const currentScroller = getScroller();
      if (!currentScroller) return;

      const heightDiff = currentScroller.scrollHeight - prevScrollHeight;
      // 恢复旧位置
      currentScroller.scrollTop = prevScrollTop + heightDiff;
      // prepend 后 scrollTop 已改变（已离开顶部），data-top-scroll 也已变；
      // 这里需要主动刷新一次，否则 mask 不会及时出现。
      requestAnimationFrame(updateScrollShadowAttrs);
    });
  }, [dispatch, messages, dialogId, currentDialogConfig?.dbKey, getScroller]);

  // 滚动监听（自适应阈值）
  const handleScroll = useCallback(() => {
    const scroller = stateRef.current.scrollContainer;
    if (!scroller) return;

    if (scroller.scrollTop < LOAD_THRESHOLD) {
      handleLoadOlder();
    }

    const threshold = getNearBottomThreshold();
    const distanceFromBottom =
      scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

    stateRef.current.isNearBottom = distanceFromBottom <= threshold;
    if (
      forceFollowCurrentTurnRef.current &&
      distanceFromBottom > Math.max(140, threshold * 1.5)
    ) {
      forceFollowCurrentTurnRef.current = false;
    }
    setShowScrollToBottom(distanceFromBottom > 100);
    setShowScrollToTop(scroller.scrollTop > 100);
    updateScrollShadowAttrs();
  }, [handleLoadOlder, updateScrollShadowAttrs]);

  // 绑定滚动事件
  useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;

    stateRef.current.scrollContainer = scroller;
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeAttribute("data-nolo-chat-scroll-shadow");
      scroller.removeAttribute("data-top-scroll");
      scroller.removeAttribute("data-bottom-scroll");
      if (stateRef.current.scrollContainer === scroller) {
        stateRef.current.scrollContainer = null;
      }
    };
  }, [handleScroll, getScroller]);

  // 回到底部按钮
  const scrollToBottom = useCallback(() => {
    forceFollowCurrentTurnRef.current = true;
    if (hasStreamingMessage) {
      scheduleStreamingFollowScroll();
    } else {
      scrollToBottomRAF("smooth");
    }
  }, [hasStreamingMessage, scrollToBottomRAF, scheduleStreamingFollowScroll]);

  // 回到顶部按钮
  const scrollToTop = useCallback(() => {
    const scroller = getScroller() ?? stateRef.current.scrollContainer;
    if (!scroller) return;
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  }, [getScroller]);

  // The pinned current snapshot replaces its source tool row. Older snapshots
  // remain in history for replay, while the latest one is shown exactly once.
  const renderMessages = useMemo(() => {
    const sourceId = currentTodo?.sourceMessageId;
    if (!conversationTodoEnabled || !sourceId) return displayMessages;
    return displayMessages.filter((message: any) => message?.id !== sourceId);
  }, [conversationTodoEnabled, currentTodo?.sourceMessageId, displayMessages]);

  // Memoize entry list so map work is skipped when only scroll chrome re-renders.
  // wakeEvents（dialog record 上的后台 run 终态事件）按 createdAt 归并进消息流；
  // 为空/undefined 时 mergeWakeEventsIntoEntries 原样返回 entries（零布局变化）。
  const renderEntries = useMemo(
    () =>
      mergeWakeEventsIntoEntries(
        groupConsecutiveToolEntries(buildMessageRenderEntries(renderMessages)),
        (currentDialogConfig as any)?.wakeEvents
      ),
    [renderMessages, currentDialogConfig]
  );

  // 单一主 working signal：activity 是既有 runtime facts 的纯 projection。
  // 本组件已持有全部订阅（activeControllers / streamingMessageId / 消息尾部
  // 内容 / toolRunStore），组合函数只做纯投影、不再二次订阅 store。
  // starting 之外的阶段由 ThinkingSection / ToolMessageGroup / 正文+cursor
  // 担任主角，AssistantReplyPending 只在 starting 时出现。
  const conversationActivity = useMemo(
    () =>
      deriveConversationActivity({
        messages,
        hasStreamingMessage,
        isRunning,
        toolRuns: allToolRuns,
      }),
    [messages, hasStreamingMessage, isRunning, allToolRuns],
  );

  // Styles live in messagesStyles.ts (avoid rebuilding a large unused style string each stream tick).

  return (
    <div className={`chat-messages__list-wrapper${isInitialRender ? " chat-messages__list-wrapper--initial" : ""}`} ref={listRef}>
      <div className="chat-messages__list" role="log" aria-live="polite">
        {isLoadingOlder && (
          <div className="top-loading">
            <TopLoadingIndicator />
          </div>
        )}

        {/* 顶部压缩提示：当无法加载更多旧消息且存在摘要锚点时显示 */}
        {!hasMoreOlder && currentDialogConfig?.summarizedBeforeId && (
          <div className="summary-divider">
            <span>已归档到摘要</span>
          </div>
        )}

        {conversationTodoEnabled && currentTodo && (
          <div className="chat-messages__todo-current" data-testid="current-conversation-todo">
            <TodoCard rawData={{ todos: currentTodo.todos }} />
          </div>
        )}

        {renderEntries.map((entry, entryIndex) => {
          if (entry.type === "wake-event") {
            // 后台 run 终态系统行：紧凑单行，非用户气泡、非 assistant 消息。
            return (
              <React.Fragment key={entry.key}>
                <div className="chat-messages__item-wrapper">
                  <MessageRowErrorBoundary>
                    <ChildRunEventRow event={entry.event} />
                  </MessageRowErrorBoundary>
                </div>
              </React.Fragment>
            );
          }
          if (entry.type === "tool-group") {
            // Expand/collapse only — header status icons follow each group's tools.
            // Historical groups (user after) fold even while a later turn runs;
            // idle turns without a final reply also fold so chrome can settle.
            const canCollapse = shouldAutoCollapseToolGroup({
              entries: renderEntries,
              groupIndex: entryIndex,
              isRunning,
              hasStreamingMessage,
            });
            return (
              <React.Fragment key={entry.key}>
                <div className="chat-messages__item-wrapper">
                  <MessageRowErrorBoundary>
                    <ToolMessageGroup
                      messages={entry.messages}
                      activityMessages={entry.activityMessages}
                      canCollapse={canCollapse}
                      conversationTodoEnabled={conversationTodoEnabled}
                    />
                  </MessageRowErrorBoundary>
                </div>
              </React.Fragment>
            );
          }

          const msg = entry.message;
          const isTool = msg.role === "tool";
          const isIntermediateNarration =
            !isTool &&
            msg.role === "assistant" &&
            isIntermediateAssistantProgress(renderEntries, entryIndex);
          const isLastSummarized =
            currentDialogConfig?.summarizedBeforeId === msg.id;
          // Stable boolean for non-tool rows: only the current last assistant is true.
          // Historical rows keep canBranch=false across stream tokens → MessageItem memo wins.
          const canBranch =
            !isTool &&
            msg.role !== "user" &&
            typeof msg.id === "string" &&
            msg.id === lastAssistantMessageId;
          // Intermediate tool-loop progress: no copy/save/branch chrome.
          const enableActions =
            isTool ||
            msg.role === "user" ||
            !isIntermediateNarration;

          return (
            <React.Fragment key={entry.key}>
              <div
                className={
                  isIntermediateNarration
                    ? "chat-messages__item-wrapper chat-messages__item-wrapper--narration"
                    : "chat-messages__item-wrapper"
                }
              >
                <MessageRowErrorBoundary>
                  {isTool ? (
                    <ToolMessageItem message={msg} conversationTodoEnabled={conversationTodoEnabled} />
                  ) : isIntermediateNarration ? (
                    <IntermediateNarrationRow message={msg} />
                  ) : (
                    <MessageItem
                      message={msg}
                      canBranch={canBranch}
                      enableActions={enableActions}
                      isStreaming={hasStreamingMessage && msg.id === lastAssistantMessageId}
                    />
                  )}
                </MessageRowErrorBoundary>
              </div>
              {isLastSummarized && (
                <div className="summary-divider">
                  <span>已归档到摘要</span>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {conversationActivity.kind === "starting" && (
          <div className="chat-messages__item-wrapper chat-messages__item-wrapper--pending">
            <AssistantReplyPending activity={conversationActivity} />
          </div>
        )}

        {/* NEW: Compression Hint at Bottom */}
        {(currentDialogConfig?.compressionCount || 0) >= 3 && (
          <div className="compression-hint">
            <span>对话较长，建议</span>
            <button
              type="button"
              className="compression-hint__link"
              onClick={handleCreateNewDialog}
            >
              开启新对话
            </button>
            <span>（可继承当前上下文）</span>
          </div>
        )}

        {/* Memory Saved Indicators */}
        <MemorySavedIndicator dialogConfig={currentDialogConfig} />
      </div>

      <LoopStopBadge reason={visibleLoopStopReason} />
      <div className="scroll-buttons">
        <ScrollToTopButton
          isVisible={scrollToTopEnabled && showScrollToTop}
          onClick={scrollToTop}
        />
        <ScrollToBottomButton
          isVisible={scrollToBottomEnabled && showScrollToBottom}
          onClick={scrollToBottom}
        />
      </div>
    </div>
  );
};

// ========== Memory Saved Indicator Components & Utilities ==========

export interface SavedMemoryItem {
  content: string;
  sourceKind: "explicit-user-directive" | "agent-tool" | "inferred-understanding";
  visibility?: "private" | "shared" | "public";
  id?: string;
  dbKey?: string;
}

const isSavedMemorySourceKind = (value: unknown): value is SavedMemoryItem["sourceKind"] =>
  value === "explicit-user-directive" ||
  value === "agent-tool" ||
  value === "inferred-understanding" ||
  value === "dialog-learning";

export function getSavedMemories(dialogConfig: any): SavedMemoryItem[] {
  if (!dialogConfig) return [];
  const list: any[] = [];
  
  const collect = (arr: any, fromSavedMemories = false) => {
    if (Array.isArray(arr)) {
      if (fromSavedMemories) {
        list.push(...arr.map((item) => {
          if (item && typeof item === "object") {
            return { ...item, type: item.type || "memory.saved" };
          }
          return item;
        }));
      } else {
        list.push(...arr);
      }
    }
  };

  collect(dialogConfig.memoryEvents);
  collect(dialogConfig.artifacts);
  collect(dialogConfig.savedMemories, true);

  const checkpoint = dialogConfig.runtimeCheckpoint;
  if (checkpoint && typeof checkpoint === "object") {
    collect(checkpoint.memoryEvents);
    collect(checkpoint.artifacts);
    collect(checkpoint.savedMemories, true);
  }

  const result: SavedMemoryItem[] = [];
  const seenContent = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;

    if (item.type !== "memory.saved") continue;

    if (typeof item.content !== "string") continue;
    const content = item.content.trim();
    if (!content) continue;

    const sourceKind = item.sourceKind;
    if (typeof sourceKind !== "string") continue;

    const lowerSourceKind = sourceKind.toLowerCase();

    if (
      lowerSourceKind.includes("inferred") || 
      lowerSourceKind.includes("understanding") || 
      lowerSourceKind === "inferred-understanding"
    ) {
      continue;
    }
    
    if (lowerSourceKind !== "explicit-user-directive" && lowerSourceKind !== "agent-tool") {
      continue;
    }

    const normalized = content.toLowerCase().replace(/[\s\p{P}]/gu, "");
    if (!seenContent.has(normalized)) {
      seenContent.add(normalized);
      result.push({
        content,
        sourceKind: lowerSourceKind as SavedMemoryItem["sourceKind"],
        visibility: item.visibility || "private",
        ...(typeof item.id === "string" && item.id ? { id: item.id } : {}),
        ...(typeof item.dbKey === "string" && item.dbKey
          ? { dbKey: item.dbKey }
          : {}),
      });
    }
  }

  return result;
}

export const MemorySavedIndicator: React.FC<{ dialogConfig: any }> = ({ dialogConfig }) => {
  const memories = getSavedMemories(dialogConfig);
  if (memories.length === 0) return null;

  return (
    <div
      {...withLiteralClass("memory-saved-container", styles.memorySavedContainer)}
      data-testid="memory-saved-container"
    >
      {memories.map((mem) => {
        const isExplicit = mem.sourceKind === "explicit-user-directive";
        const prefix = isExplicit ? "已保存记忆" : "助手已保存记忆";
        // Content is unique after getSavedMemories dedupe; prefer explicit id if present.
        const memoryKey = mem.id ?? mem.dbKey ?? `${mem.sourceKind}:${mem.content}`;
        return (
          <div
            key={memoryKey}
            {...withLiteralClass("memory-saved-item", styles.memorySavedItem)}
            data-testid="memory-saved-item"
          >
            <span
              {...withLiteralClass("memory-saved-icon", styles.memorySavedIcon)}
              aria-hidden="true"
            >
              <LuBrain size={14} aria-hidden="true" />
            </span>
            <span
              {...withLiteralClass("memory-saved-prefix", styles.memorySavedPrefix)}
            >
              {prefix}：
            </span>
            <span
              {...withLiteralClass("memory-saved-content", styles.memorySavedContent)}
              title={mem.content}
            >
              {mem.content}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default MessagesList;
