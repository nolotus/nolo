import "../elements.css";
import { Tooltip } from "render/web/ui/Tooltip";
import {
  LuCheck,
  LuCode,
  LuCopy,
  LuEye,
  LuChevronDown,
  LuChevronUp,
  LuMaximize2,
} from "react-icons/lu";

interface CodeBlockToolbarProps {
  language: string;
  filename: string | null;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  isStreaming: boolean;
  isCopied: boolean;
  handleCopy: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onFullscreen: () => void;
}

export function CodeBlockToolbar({
  language,
  filename,
  showPreview,
  setShowPreview,
  isStreaming,
  isCopied,
  handleCopy,
  isCollapsed,
  setIsCollapsed,
  onFullscreen,
}: CodeBlockToolbarProps) {
  return (
    <div className="code-block-actions">
      <div className="code-block-meta">
        <span className="language-tag">{language || "text"}</span>
        {filename && (
          <Tooltip content={filename}>
            <span className="filename-tag">{filename}</span>
          </Tooltip>
        )}
      </div>
      <div className="action-buttons">
        <Tooltip
          content={
            isStreaming
              ? "生成中，预览稍后可用"
              : showPreview
                ? "显示代码"
                : "显示预览"
          }
        >
          <button
            type="button"
            onClick={() => !isStreaming && setShowPreview(!showPreview)}
            className={`action-button ${showPreview ? "active" : ""}`}
            disabled={isStreaming}
            aria-label={
              isStreaming
                ? "生成中，预览稍后可用"
                : showPreview
                  ? "显示代码"
                  : "显示预览"
            }
          >
            {showPreview ? (
              <LuCode size={18} aria-hidden="true" />
            ) : (
              <LuEye size={18} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
        <Tooltip content={isCopied ? "已复制!" : "复制代码"}>
          <button
            type="button"
            onClick={handleCopy}
            className="action-button"
            aria-label={isCopied ? "已复制!" : "复制代码"}
          >
            {isCopied ? (
              <LuCheck size={18} aria-hidden="true" />
            ) : (
              <LuCopy size={18} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
        <Tooltip content={isCollapsed ? "展开代码" : "折叠代码"}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`action-button ${isCollapsed ? "active" : ""}`}
            aria-label={isCollapsed ? "展开代码" : "折叠代码"}
          >
            {isCollapsed ? (
              <LuChevronUp size={18} aria-hidden="true" />
            ) : (
              <LuChevronDown size={18} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
        <Tooltip content="全屏预览">
          <button
            type="button"
            onClick={onFullscreen}
            className="action-button"
            disabled={isStreaming}
            aria-label="全屏预览"
          >
            <LuMaximize2 size={18} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
