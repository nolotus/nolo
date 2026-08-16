import React, {
  memo,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAppSelector } from "app/store";
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
  }: MessageItemProps) => {
    const currentUserId = useUserId();
    const currentServer = useAppSelector(selectRuntimeCurrentServer);

    const {
      content,
      thinkContent,
      imageGenerationState,
      userId,
      role,
      isStreaming = false,
    } = message || {};
    const messageAgentKey = resolveMessageAgentKey(message);

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
