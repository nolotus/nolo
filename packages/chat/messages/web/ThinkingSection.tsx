import * as stylex from "@stylexjs/stylex";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useAppSelector } from "app/store";
import { selectShowThinking } from "app/settings/settingSlice";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";
import Editor from "create/editor/Editor";
import { useThinkingVisibility } from "../../hooks/useThinkingVisibility";
import { hasVisibleAssistantContentValue } from "../assistantMessageFacts";
import { OrbActivityIndicator } from "./OrbActivityIndicator";
import { useTranslation } from "react-i18next";
import { thinkingSectionStyles as styles } from "./thinkingSectionStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

interface ThinkingSectionProps {
  thinkContent?: string;
  messageContent?: any; // 传入消息正文内容，用于辅助判断自动展开逻辑
  role?: string;
  isStreaming?: boolean;
  messageId?: string;
}

const MASK_EDGE = 18;

export const ThinkingSection = memo(
  ({
    thinkContent,
    messageContent,
    role,
    isStreaming = false,
    messageId,
  }: ThinkingSectionProps) => {
    // 1. 获取全局设置
    const showThinking = useAppSelector(selectShowThinking);
    const { t } = useTranslation("chat");

    // 2. AICSS thinking-reasoning 行为：思考中默认展开实时流出，结束折叠为摘要
    const [isExpanded, toggleThinking, thinkingSeconds] =
      useThinkingVisibility(
        isStreaming,
        messageContent,
        thinkContent || "",
        messageId
      );

    // 3. 滚动视口：思考中自动吸底，滚动位置决定上下渐隐遮罩
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [fade, setFade] = useState({ top: false, bottom: false });

    const syncFade = useCallback(() => {
      const el = viewportRef.current;
      if (!el) return;
      const scrollable = el.scrollHeight > el.clientHeight + 1;
      setFade({
        top: scrollable && el.scrollTop > 1,
        bottom:
          scrollable && el.scrollTop + el.clientHeight < el.scrollHeight - 1,
      });
    }, []);

    useEffect(() => {
      const el = viewportRef.current;
      if (!el || !isExpanded) return;
      const raf = requestAnimationFrame(() => {
        el.scrollTop = isStreaming ? el.scrollHeight : 0;
        syncFade();
      });
      return () => cancelAnimationFrame(raf);
    }, [thinkContent, isExpanded, isStreaming, syncFade]);

    const viewportMaskStyle = React.useMemo(() => {
      if (!fade.top && !fade.bottom) return undefined;
      const top = fade.top
        ? `transparent 0px, rgba(0,0,0,1) ${MASK_EDGE}px`
        : `rgba(0,0,0,1) 0px, rgba(0,0,0,1) ${MASK_EDGE}px`;
      const bottom = fade.bottom
        ? `rgba(0,0,0,1) calc(100% - ${MASK_EDGE}px), transparent 100%`
        : `rgba(0,0,0,1) calc(100% - ${MASK_EDGE}px), rgba(0,0,0,1) 100%`;
      const image = `linear-gradient(to bottom, ${top}, ${bottom})`;
      return {
        WebkitMaskImage: image,
        maskImage: image,
      } as React.CSSProperties;
    }, [fade]);

    // 4. 只有非用户角色、有思考内容、且全局开关开启时才渲染
    const shouldRender = role !== "self" && thinkContent && showThinking;

    const thinkingLive =
      isStreaming &&
      !!thinkContent &&
      !hasVisibleAssistantContentValue(messageContent);
    const label = thinkingLive
      ? t("thinkingActive")
      : thinkingSeconds != null
        ? t("thinkingDone", { seconds: thinkingSeconds })
        : t("thinkingProcess");

    const slate = useMemo(
      () => (thinkContent ? markdownToSlate(thinkContent) : []),
      [thinkContent]
    );

    if (!shouldRender) return null;

    return (
      <>
        <div {...stylex.props(styles.container)}>
          <button
            type="button"
            onClick={toggleThinking}
            aria-expanded={isExpanded}
            {...withLiteralClass("thinking-toggle", styles.toggle)}
          >
            <div
              {...stylex.props(styles.icon)}
              aria-hidden="true"
            >
              {thinkingLive ? (
                <OrbActivityIndicator variant="s1-thinking" size={14} />
              ) : isExpanded ? (
                <LuChevronDown size={14} />
              ) : (
                <LuChevronRight size={14} />
              )}
            </div>
            <span
              {...stylex.props(
                styles.label,
                thinkingLive && styles.labelShimmer
              )}
            >
              {label}
            </span>
          </button>
          <div
            {...stylex.props(
              styles.content,
              isExpanded ? styles.contentExpanded : styles.contentCollapsed
            )}
          >
            {isExpanded && slate && (
              <div
                {...stylex.props(styles.inner)}
              >
                <div
                  ref={viewportRef}
                  onScroll={syncFade}
                  data-hook="messages-esc-thinking-viewport"
                  {...withLiteralClass("thinking-viewport", styles.viewport)}
                  style={viewportMaskStyle}
                >
                  <div
                    data-hook="messages-esc-thinking-editor-wrapper"
                    {...withLiteralClass("thinking-editor-wrapper", styles.editorWrapper)}
                  >
                    <Editor
                      initialValue={slate}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);
