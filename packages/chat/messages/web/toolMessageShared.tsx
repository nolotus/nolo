// ToolMessageItem 中可被多处复用的纯函数与纯组件
import React, { useMemo, useState } from "react";
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
  if (status === "running") return <LuCircle className="icon-primary" aria-hidden="true" />;
  if (status === "repairing") return <LuCircle className="icon-warning" aria-hidden="true" />;
  if (status === "failed") return <LuCircleAlert className="icon-error" aria-hidden="true" />;
  if (status === "pending") return <LuCircle className="icon-muted" aria-hidden="true" />;
  return <LuCheck className="icon-success" aria-hidden="true" />;
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
    <div className="tool-text-collapse">
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
