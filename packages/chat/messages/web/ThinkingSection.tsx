import * as stylex from "@stylexjs/stylex";
import React, { useMemo, memo } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useAppSelector } from "app/store";
import { selectShowThinking } from "app/settings/settingSlice";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";
import Editor from "create/editor/Editor";
import { useThinkingVisibility } from "../../hooks/useThinkingVisibility";
import { useTranslation } from "react-i18next";
import { thinkingSectionStyles as styles } from "./thinkingSectionStyles";
import "./messagesStylexEscapeHatch.css";

interface ThinkingSectionProps {
  thinkContent?: string;
  messageContent?: any; // 传入消息正文内容，用于辅助判断自动展开逻辑
  role?: string;
  isStreaming?: boolean;
  messageId?: string;
}

export const ThinkingSection = memo(
  ({
    thinkContent,
    messageContent,
    role,
    isStreaming = false,
  }: ThinkingSectionProps) => {
    // 1. 获取全局设置
    const showThinking = useAppSelector(selectShowThinking);
    const { t } = useTranslation("chat");

    // 2. 只有非用户角色、有思考内容、且全局开关开启时才渲染
    // 如果你不希望在这里判断 role，也可以由父组件控制
    const shouldRender = role !== "self" && thinkContent && showThinking;

    // 3. 使用 Hook 管理展开/折叠状态
    const [isExpanded, toggleThinking] = useThinkingVisibility(
      showThinking,
      messageContent,
      thinkContent || ""
    );

    const slate = useMemo(
      () => (thinkContent ? markdownToSlate(thinkContent) : []),
      [thinkContent]
    );

    if (!shouldRender) return null;

    return (
      <>
        <div className="thinking-container" {...stylex.props(styles.container)}>
          <button
            className="thinking-toggle"
            {...stylex.props(styles.toggle)}
            onClick={toggleThinking}
            aria-expanded={isExpanded}
            type="button"
          >
            <div
              className="thinking-icon"
              {...stylex.props(styles.icon)}
              aria-hidden="true"
            >
              {isExpanded ? (
                <LuChevronDown size={14} />
              ) : (
                <LuChevronRight size={14} />
              )}
            </div>
            <span className="thinking-label" {...stylex.props(styles.label)}>
              {t("thinkingProcess")}
            </span>
          </button>
          <div
            className={`thinking-content ${isExpanded ? "expanded" : "collapsed"}`}
            {...stylex.props(
              styles.content,
              isExpanded ? styles.contentExpanded : styles.contentCollapsed
            )}
          >
            {isExpanded && slate && (
              <div
                className="thinking-inner"
                {...stylex.props(styles.inner)}
              >
                <div
                  className="thinking-editor-wrapper"
                  data-hook="messages-esc-thinking-editor-wrapper"
                  {...stylex.props(styles.editorWrapper)}
                >
                  <Editor
                    initialValue={slate}
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);
