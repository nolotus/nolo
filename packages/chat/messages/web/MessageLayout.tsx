// 纯布局组件：仅负责 message 的桌面/移动端骨架
// 通过 slots（content / actions / confirmBar）支持不同场景组合
import "./MessageLayout.css";
import React, { memo } from "react";
import { LuTerminal } from "react-icons/lu";
import Avatar from "render/web/ui/Avatar";
import { StreamingPendingIndicator } from "./StreamingPendingIndicator";
import { useActionsHoverPin } from "../../hooks/useActionsHoverPin";

export interface MessageLayoutProps {
  isRobot: boolean;
  /** "self" for user messages, "robot" for AI */
  type: "self" | "robot";
  displayName: string;
  isTouch: boolean;
  isStreaming?: boolean;
  /** True when the assistant message already has visible body text.
   *  Controls the mutual-exclusion model: streaming indicator on the avatar
   *  only shows while there is NO visible content yet (thinking / waiting).
   *  Once body text starts streaming the cursor at the end of text is the
   *  sole "working" signal. */
  hasVisibleContent?: boolean;
  isCliAgent?: boolean;
  collapsed?: boolean;
  showActions?: boolean;
  messageId?: string;

  // ─── Slots ───────────────────────────────────────────────
  /** 消息正文（MessageContent 或自定义内容） */
  content: React.ReactNode;
  /** 操作按钮区（chat 用 MessageActions，share 留空） */
  actions?: React.ReactNode;
  /** 工具确认栏（chat 用 MessageToolConfirmBar，share 留空） */
  confirmBar?: React.ReactNode;

  // ─── Interaction handlers（share 场景全部留空） ───────────
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>;
  onTouchMove?: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  avatarSrc?: string;
  onAvatarClick?: React.MouseEventHandler<HTMLDivElement>;
}

function areMessageLayoutPropsEqual(
  prev: MessageLayoutProps,
  next: MessageLayoutProps
): boolean {
  return (
    prev.isRobot === next.isRobot &&
    prev.type === next.type &&
    prev.displayName === next.displayName &&
    prev.isTouch === next.isTouch &&
    prev.isStreaming === next.isStreaming &&
    prev.hasVisibleContent === next.hasVisibleContent &&
    prev.isCliAgent === next.isCliAgent &&
    prev.collapsed === next.collapsed &&
    prev.showActions === next.showActions &&
    prev.messageId === next.messageId &&
    prev.avatarSrc === next.avatarSrc &&
    prev.content === next.content &&
    prev.actions === next.actions &&
    prev.confirmBar === next.confirmBar &&
    prev.onClick === next.onClick &&
    prev.onTouchStart === next.onTouchStart &&
    prev.onTouchMove === next.onTouchMove &&
    prev.onTouchEnd === next.onTouchEnd &&
    prev.onAvatarClick === next.onAvatarClick
  );
}

export const MessageLayout = memo(
  ({
    isRobot,
    type,
    displayName,
    isTouch,
    isStreaming = false,
    hasVisibleContent = false,
    isCliAgent = false,
    collapsed = false,
    showActions = false,
    messageId,
    content,
    actions,
    confirmBar,
    onClick,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    avatarSrc,
    onAvatarClick,
  }: MessageLayoutProps) => {
    const {
      isActionsHover,
      onMouseEnter: onActionsEnter,
      onMouseLeave: onActionsLeave,
    } = useActionsHoverPin(Boolean(actions) && !isTouch);

    const avatarDesktop = (
      <div className="avatar-area">
        <div className="avatar-wrapper">
          <Avatar
            name={displayName}
            type={isRobot ? "agent" : "user"}
            size="small"
            shape="full"
            src={avatarSrc}
            onClick={isRobot ? (onAvatarClick as any) : undefined}
          />
          {isRobot && isStreaming && !hasVisibleContent && (
            <div className="avatar-indicator-pos">
              <StreamingPendingIndicator size="sm" />
            </div>
          )}
        </div>
      </div>
    );

    const robotName = isRobot && displayName && (
      <div className={`robot-name${isTouch ? " mobile" : ""}`}>
        {displayName}
        {isCliAgent && (
          <span className="cli-badge">
            <LuTerminal size={isTouch ? 10 : 11} aria-hidden="true" />
            CLI
          </span>
        )}
      </div>
    );

    return (
      <>
        <div
          className={[
            "msg",
            type,
            collapsed ? "collapsed" : "",
            showActions ? "actions-visible" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-message-id={messageId}
          onClick={onClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* ── 桌面端 ── */}
          {!isTouch && (
            <div
              className={[
                "msg-inner",
                "desktop",
                "msg-hover-target",
                isActionsHover ? "is-actions-hover" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={onActionsEnter}
              onMouseLeave={onActionsLeave}
            >
              {/* Avatar + bubble only — actions are a sibling BELOW this row
                  so they never participate in avatar vertical alignment. */}
              <div className="msg-bubble-row">
                {avatarDesktop}
                <div className="content-area">
                  {robotName}
                  <div className={`msg-body ${type}`}>
                    {content}
                    {confirmBar}
                  </div>
                </div>
              </div>
              {actions && (
                <div className="msg-actions-below">{actions}</div>
              )}
            </div>
          )}

          {/* ── 移动端 ── */}
          {isTouch && (
            <div className="msg-inner mobile">
              <div className="msg-header">
                <div className="avatar-wrapper">
                  <Avatar
                    name={displayName}
                    type={isRobot ? "agent" : "user"}
                    size="small"
                    shape="full"
                    src={avatarSrc}
                    onClick={isRobot ? (onAvatarClick as any) : undefined}
                  />
                  {isRobot && isStreaming && !hasVisibleContent && (
                    <div className="avatar-indicator-pos mobile">
                      <StreamingPendingIndicator size="sm" />
                    </div>
                  )}
                </div>
                {robotName}
              </div>
              <div className="content-area mobile">
                <div className={`msg-body ${type} mobile`}>
                  {content}
                  {confirmBar}
                </div>
              </div>
            </div>
          )}

          {/* 移动端底部操作区 */}
          {isTouch && actions}
        </div>
      </>
    );
  },
  areMessageLayoutPropsEqual
);

export default MessageLayout;
