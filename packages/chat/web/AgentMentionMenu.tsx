// 文件路径: packages/chat/web/AgentMentionMenu.tsx

import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";
import React, { memo, useEffect, useRef } from "react";

export type FavoriteAgentSummary = {
  agentKey: string;
  name: string;
};

interface AgentMentionMenuProps {
  visible: boolean;
  agents: FavoriteAgentSummary[];
  highlightIndex: number;
  headerText?: string;
  onSelect: (agent: FavoriteAgentSummary) => void;
  onHover?: (index: number) => void;
}

/**
 * 只负责展示：收藏 Agent 的 @ 下拉菜单
 * - 不管理任何全局状态
 * - 高亮项由父组件通过 highlightIndex 控制
 */
const AgentMentionMenuComponent: React.FC<AgentMentionMenuProps> = ({
  visible,
  agents,
  highlightIndex,
  headerText,
  onSelect,
  onHover,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * 高亮项变更时，将其尽量滚动到菜单可视区域的中间
   * - 使用 container.scrollTop + getBoundingClientRect 计算相对位置
   * - 只滚动菜单容器本身，不影响页面滚动
   */
  useEffect(() => {
    if (!visible) return;
    if (highlightIndex < 0 || highlightIndex >= agents.length) return;

    const container = containerRef.current;
    if (!container) return;

    const activeItem = container.querySelector<HTMLLIElement>(
      ".message-input__mentions-item.is-active"
    );
    if (!activeItem) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const currentScrollTop = container.scrollTop;
    const itemOffsetTop = itemRect.top - containerRect.top + currentScrollTop;
    const itemHeight = activeItem.offsetHeight;

    // 目标：让 item 的中心接近容器可视区域的中心
    const targetScrollTop =
      itemOffsetTop - container.clientHeight / 2 + itemHeight / 2;

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const nextScrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop);

    container.scrollTo({
      top: nextScrollTop,
      behavior: "auto",
    });
  }, [highlightIndex, visible, agents.length]);

  if (!visible || agents.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        {...withLiteralClass("message-input__mentions", messageInputStyles.mentions)}
      >
        {headerText && (
          <div
            {...withLiteralClass("message-input__mentions-header", messageInputStyles.mentionsHeader)}
          >
            {headerText}
          </div>
        )}

        <ul
          {...withLiteralClass("message-input__mentions-list", messageInputStyles.mentionsList)}
        >
          {agents.map((agent, index) => {
            const isActive = index === highlightIndex;

            return (
              <li
                key={agent.agentKey}
                onMouseDown={(event) => {
                  // 阻止 textarea 失焦
                  event.preventDefault();
                  onSelect(agent);
                }}
                onMouseEnter={() => {
                  if (onHover) onHover(index);
                }}
                {...withLiteralClass(
                  `message-input__mentions-item${isActive ? " is-active" : ""}`,
                  messageInputStyles.mentionsItem,
                  isActive && messageInputStyles.mentionsItemActive
                )}
              >
                <span
                  {...withLiteralClass("message-input__mentions-item-name", messageInputStyles.mentionsItemName)}
                >
                  {agent.name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

const AgentMentionMenu = memo(AgentMentionMenuComponent);
export default AgentMentionMenu;
