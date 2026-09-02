// ToolMessageItem 中可被多处复用的纯函数与纯组件
import * as stylex from "@stylexjs/stylex";
import React, { useMemo, useState } from "react";
import { toolMessageStyles } from "./toolMessageStyles";
import { messagesStyles } from "./messagesStyles";
import {
  LuCheck,
  LuCircle,
  LuCircleAlert,
  LuTerminal,
} from "react-icons/lu";
import {
  previewToolText,
  TOOL_OUTPUT_PREVIEW_CHARS,
  TOOL_OUTPUT_PREVIEW_LINES,
} from "../toolPresentation";

/**
 * 保留字面 className 作 DOM/测试锚点，同时叠加 StyleX 原子类。
 *
 * 为什么必须用这个助手而不是直接写 ` {...withLiteralClass("x", s)}`：
 * JSX 展开属性位于 className 之后时，返回对象里的 className 键会**整体覆盖**
 * 字面 className（对象展开同名键后者胜），原类名从 DOM 消失——样式生效但
 * 所有断言 DOM 类名的测试与遗留选择器全部失效（2026-08-31 实测）。
 */
export const withLiteralClass = (
  literal: string,
  ...styles: Array<stylex.StyleXStyles | false | null | undefined>
): { className: string; style?: React.CSSProperties } => {
  const active = styles.filter(Boolean) as stylex.StyleXStyles[];
  if (active.length === 0) return { className: literal };
  const props = stylex.props(...active) as { className?: string; style?: React.CSSProperties };
  return {
    className: props.className ? `${literal} ${props.className}` : literal,
    ...(props.style ? { style: props.style } : {}),
  };
};


export const safeParse = (content: any) => {
  if (typeof content === "object" && content !== null) return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

export const StatusIcon = ({
  status,
  toolName,
}: {
  status: string;
  toolName?: string;
}) => {
  if (status === "running") return <LuCircle {...withLiteralClass("icon-primary", messagesStyles.iconPrimary)} aria-hidden="true" />;
  if (status === "repairing") return <LuCircle {...withLiteralClass("icon-warning", messagesStyles.iconWarning)} aria-hidden="true" />;
  if (status === "failed") return <LuCircleAlert {...withLiteralClass("icon-error", messagesStyles.iconError)} aria-hidden="true" />;
  if (status === "pending") return <LuCircle {...withLiteralClass("icon-muted", messagesStyles.iconMuted)} aria-hidden="true" />;
  return <LuCheck {...withLiteralClass("icon-success", messagesStyles.iconSuccess)} aria-hidden="true" />;
};

/**
 * Long tool body text: default to a char/line-limited preview so huge JSON/logs
 * do not mount into the DOM until the user expands. Full text mounts only after expand.
 */
export const CollapsibleToolText: React.FC<{
  text: string;
  className?: string;
  charLimit?: number;
  lineLimit?: number;
  /** Optional aria/label for the expand control */
  expandLabel?: string;
  collapseLabel?: string;
}> = ({
  text,
  className,
  charLimit = TOOL_OUTPUT_PREVIEW_CHARS,
  lineLimit = TOOL_OUTPUT_PREVIEW_LINES,
  expandLabel,
  collapseLabel = "收起",
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = useMemo(
    () => previewToolText(text ?? "", charLimit, lineLimit),
    [text, charLimit, lineLimit]
  );

  // Only put the full string into React when expanded — keeps virtual DOM / text nodes small.
  const display = expanded || !meta.truncated ? text : meta.preview;
  const defaultExpandLabel = `展开全部 (${meta.totalChars.toLocaleString()} 字符)`;

  return (
    <div  {...withLiteralClass("tool-text-collapse", toolMessageStyles.actionDetail)}>
      <pre
        className={className}
        style={
          !expanded && meta.truncated
            ? { maxHeight: 280, overflow: "hidden", margin: 0 }
            : { margin: 0 }
        }
      >
        {display}
        {!expanded && meta.truncated ? "\n…" : null}
      </pre>
      {meta.truncated ? (
        <button
          type="button"
          className="btn-tiny"
          style={{ marginTop: 8 }}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? collapseLabel : expandLabel || defaultExpandLabel}
        </button>
      ) : null}
    </div>
  );
};
