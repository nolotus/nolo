import React, {
  memo,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId } from "identity";
import { useFetchData } from "app/hooks";
import { useCouldEdit } from "identity";
import { useMessageInteraction } from "../../hooks/useMessageInteraction";
import { MessageActions } from "./MessageActions";
import { MessageToolConfirmBar } from "./MessageToolConfirmBar";
import { MessageLayout } from "./MessageLayout";
import { MessageContent } from "./MessageContent";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { useBase64Migration } from "../hooks/useBase64Migration";
import { Dialog } from "render/web/ui/modal/Dialog";
import AgentForm from "ai/agent/web/AgentForm";
import { resolveAvatarUrl } from "ai/agent/avatarUtils";
import { resolveMessageAgentKey } from "../messageAgent";
import { selectLastAssistantMessage } from "../messageSlice";
import { matchContextualFragment } from "../contextualFragment";
import { extractTextFromContent } from "../extractTextFromContent";
import ContextualStatusRow from "./ContextualStatusRow";
import { handleSendMessage } from "../../dialog/dialogSlice";
import { compactDialogAndRetryAction } from "../../dialog/actions/compactDialogAndRetryAction";
import { useCreateDialog } from "../../dialog/useCreateDialog";
import type { SendErrorAction } from "../types";

export type MessageItemProps = {
  message: any;
  readOnly?: boolean;
  /**
   * When provided by the list (preferred), skips a store subscription that
   * would otherwise re-render every row on each stream token. List computes
   * this from last-assistant id only.
   */
  canBranch?: boolean;
  /**
   * When false, skip MessageActions entirely (intermediate tool-loop progress
   * narration). Defaults to true for share / standalone mounts.
   */
  enableActions?: boolean;
  /**
   * List-provided streaming flag (preferred). When omitted, falls back to
   * `message.isStreaming` (rarely set on the entity itself). The list has the
   * authoritative signal from the session store (useHasStreamingMessage).
   */
  isStreaming?: boolean;
};

/**
 * Pure model of MessageItem re-renders under stream updates.
 * Used by FE-01 probe tests — keep in sync with the subscription strategy below.
 */
export function estimateMessageItemRendersOnStreamToken(options: {
  historicalCount: number;
  /** true = baseline bug: each row selects full last-assistant object */
  selectsFullLastAssistant: boolean;
  /** streaming row message entity identity changed (normal per token) */
  streamingMessageEntityChanged?: boolean;
  /** list-lifted canBranch prop: historical props stay stable */
  listProvidesStableCanBranch?: boolean;
}): { historicalRenders: number; streamingRenders: number; total: number } {
  const streamingMessageEntityChanged =
    options.streamingMessageEntityChanged !== false;
  if (options.selectsFullLastAssistant) {
    // Every mounted MessageItem re-renders via useSelector identity change.
    const historicalRenders = options.historicalCount;
    const streamingRenders = 1;
    return {
      historicalRenders,
      streamingRenders,
      total: historicalRenders + streamingRenders,
    };
  }
  // Id-only (or list-provided canBranch): historical rows skip store-driven re-render.
  const historicalRenders = 0;
  const streamingRenders = streamingMessageEntityChanged ? 1 : 0;
  return {
    historicalRenders,
    streamingRenders,
    total: historicalRenders + streamingRenders,
  };
}

function areMessageItemPropsEqual(
  prev: MessageItemProps,
  next: MessageItemProps
): boolean {
  return (
    prev.readOnly === next.readOnly &&
    prev.canBranch === next.canBranch &&
    prev.enableActions === next.enableActions &&
    prev.isStreaming === next.isStreaming &&
    prev.message === next.message
  );
}

// ===================== 主消息组件 =====================

export const MessageItem = memo(
  ({
    message,
    readOnly = false,
    canBranch: canBranchProp,
    enableActions = true,
    isStreaming: isStreamingProp,
  }: MessageItemProps) => {
    const dispatch = useAppDispatch();
    const currentUserId = useUserId();
    const currentServer = useAppSelector(selectRuntimeCurrentServer);
    // 「开新对话」错误卡动作：复用 composer 同一条创建+跳转路径。
    const { createNewDialog } = useCreateDialog();

    const {
      content,
      thinkContent,
      imageGenerationState,
      userId,
      role,
    } = message || {};
    // 列表层传入的 streaming 信号优先（session store 权威）；实体上的
    // isStreaming 极少被写入（messageSlice 不置 true），仅作兜底。
    const isStreaming = isStreamingProp ?? message?.isStreaming ?? false;
    const messageAgentKey = resolveMessageAgentKey(message);
    const errorMeta = message?.errorMeta ?? message?.metadata?.errorMeta;

    const handleRetry = useCallback(() => {
      const dialogKey =
        message?.dialogKey ||
        (message?.dialogId ? `dialog-${message.dialogId}` : undefined);
      dispatch(
        handleSendMessage({
          isRetry: true,
          retryMessageId: message?.id,
          dialogKey,
          targetAgentKey: messageAgentKey || undefined,
        })
      );
    }, [dispatch, message?.dialogKey, message?.dialogId, message?.id, messageAgentKey]);

    const isSelf = role === "user" && (currentUserId === userId || !messageAgentKey);
    const isRobot = role !== "user";
    const type = isSelf ? "self" : "robot";

    // Prefer list-provided canBranch. When absent (standalone / share), select only
    // last-assistant *id* (primitive) so content stream tokens do not re-render rows.
    const lastAssistantMessageId = useAppSelector((state) => {
      if (canBranchProp !== undefined) return null;
      return selectLastAssistantMessage(state)?.id ?? null;
    });
    const isLatestAssistantMessage =
      canBranchProp !== undefined
        ? canBranchProp
        : isRobot && lastAssistantMessageId === message?.id;

    const { data: robotData } = useFetchData(isRobot ? messageAgentKey : null);
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const canEditAgent = useCouldEdit(messageAgentKey || "");

    const isCliAgent = (robotData as any)?.apiSource === "cli";
    const displayName = isRobot
      ? message.agentName || (robotData as any)?.name || "AI Assistant"
      : "User";
    const avatarSrc = useMemo(() => {
      const d = robotData as any;
      const fromFileId = resolveAvatarUrl(d?.avatarFileId, d?.originServer || currentServer);
      if (fromFileId) return fromFileId;
      const raw = d?.avatar || d?.avatarUrl || d?.logoUrl || null;
      return typeof raw === "string" && raw.trim() ? raw : undefined;
    }, [robotData, currentServer]);

    const handleAvatarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!isRobot || !robotData) return;
      setAgentDialogOpen(true);
    }, [isRobot, robotData]);

    const handleCloseAgentDialog = useCallback(() => {
      setAgentDialogOpen(false);
    }, []);

    /**
     * 结构化错误卡动作（ctx-overflow-feedback review 修复 2）。
     *
     * 此前 SendErrorCard 渲染出的三枚按钮是端到端死代码：没有任何调用方传
     * onAction，按钮恒 disabled，errorMeta.actions 也从无生产方设置。现在三个
     * 动作都落在既有、可复用的路径上，不引入新的后端：
     *  - compact-and-retry：一个 thunk 完成「就地压缩历史 → 重发失败消息」，
     *    上下文压回窗口内且不丢用户输入（与文案「压缩并重试」一致）。
     *  - new-dialog：用同一 agent 开新对话并跳过去（干净上下文，旧对话留档），
     *    复用 composer 同一条 createDialog + navigate 路径。
     *  - switch-model：打开 agent 编辑面板（AgentForm）换更大窗口的模型。
     */
    const handleErrorAction = useCallback(
      (action: SendErrorAction) => {
        if (action === "new-dialog") {
          void createNewDialog({
            ...(messageAgentKey ? { agents: [messageAgentKey] } : {}),
          }).catch((error) => {
            console.warn("[MessageItem] new-dialog action failed:", error);
          });
          return;
        }
        if (action === "switch-model") {
          if (isRobot && robotData) setAgentDialogOpen(true);
          return;
        }
        if (action === "compact-and-retry") {
          const dialogKey =
            message?.dialogKey ||
            (message?.dialogId ? `dialog-${message.dialogId}` : undefined);
          if (!dialogKey) return;
          void dispatch(
            compactDialogAndRetryAction({
              dialogKey,
              ...(message?.id ? { retryMessageId: message.id } : {}),
              ...(messageAgentKey ? { targetAgentKey: messageAgentKey } : {}),
            })
          ).catch((error) => {
            console.warn("[MessageItem] compact-and-retry action failed:", error);
          });
          return;
        }
        // "retry" 由卡片自带的重试按钮承载（onRetry），这里不需要重复实现。
      },
      [
        createNewDialog,
        dispatch,
        isRobot,
        message?.dialogId,
        message?.dialogKey,
        message?.id,
        messageAgentKey,
        robotData,
        setAgentDialogOpen,
      ]
    );

    const {
      isTouch,
      showActions,
      setShowActions,
      handleClick,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    } = useMessageInteraction({
      messageId: message?.id,
      onToggleActions: () => setShowActions((v: boolean) => !v),
    });

    const handleDismissActions = useCallback(() => {
      setShowActions(false);
    }, [setShowActions]);

    // 自动迁移 base64 图片为远程文件 URL（只读模式跳过）
    useBase64Migration(readOnly ? null : message);

    // ContextualFragment：系统注入 user role 的上下文片段（后台 run 终态
    // 唤醒等）不进用户气泡，渲染为紧凑状态行（契约见 ../contextualFragment.ts）。
    // 匹配放在 isSelf/isRobot 分支前，且所有 hook 已先执行，无条件调用。
    const contentText = extractTextFromContent(content);
    const fragmentKind = matchContextualFragment(contentText);

    const actionsNode =
      !readOnly && enableActions ? (
        <MessageActions
          isRobot={isRobot}
          isSelf={isSelf}
          isStreaming={isStreaming}
          canBranch={isLatestAssistantMessage}
          message={message}
          showActions={showActions}
          isTouch={isTouch}
          onDismissActions={handleDismissActions}
        />
      ) : undefined;

    const confirmBarNode = isRobot && !readOnly ? (
      <MessageToolConfirmBar messageId={message?.id} isRobot={isRobot} />
    ) : undefined;

    // 命中片段 → 折叠状态行，不走 MessageLayout（无头像/气泡/操作栏）。
    if (fragmentKind) {
      return <ContextualStatusRow text={contentText} kind={fragmentKind} />;
    }

    return (
      <>
        <MessageLayout
          isRobot={isRobot}
          type={type}
          displayName={displayName}
          isTouch={isTouch}
          isStreaming={isStreaming}
          hasVisibleContent={!!content}
          isCliAgent={isCliAgent}
          avatarSrc={avatarSrc}
          onAvatarClick={isRobot ? handleAvatarClick : undefined}
          collapsed={false}
          showActions={showActions}
          messageId={message?.id}
          content={
            <MessageContent
              content={content || ""}
              thinkContent={thinkContent || ""}
              imageGenerationState={imageGenerationState}
              role={isSelf ? "self" : "other"}
              isStreaming={isStreaming}
              messageId={message?.id}
              finishReason={message?.finishReason}
              retryProgress={message?.retryProgress}
              errorMeta={errorMeta}
              onRetry={errorMeta?.retryable ? handleRetry : undefined}
              onAction={errorMeta?.actions?.length ? handleErrorAction : undefined}
            />
          }
          actions={actionsNode}
          confirmBar={confirmBarNode}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {isRobot && (
          <Dialog
            isOpen={agentDialogOpen}
            onClose={handleCloseAgentDialog}
            title={
              canEditAgent
                ? `编辑 ${(robotData as any)?.name || "Agent"}`
                : `${(robotData as any)?.name || "Agent"} (只读)`
            }
            size="large"
          >
            {robotData ? (
              <AgentForm
                mode="edit"
                initialValues={robotData as any}
                onClose={handleCloseAgentDialog}
                readOnly={!canEditAgent}
              />
            ) : null}
          </Dialog>
        )}
      </>
    );
  },
  areMessageItemPropsEqual
);

export default MessageItem;
