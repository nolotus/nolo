import React, { useEffect, useState } from "react";
import { toErrorMessage } from "core/errorMessage";
import { canRenderMermaid } from "./mermaidPreview";

let mermaidInstancePromise: Promise<any> | null = null;

const getMermaid = async () => {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "default",
      });
      return mermaid;
    });
  }

  return mermaidInstancePromise;
};

interface MermaidContentProps {
  elementId: string;
  content: string;
  showPreview: boolean;
  isCollapsed: boolean;
  children?: React.ReactNode;
  theme?: any;
  codeBlockPadding?: string;
  onPreviewUnavailable?: () => void;
}

const MermaidContent = ({
  elementId,
  content,
  showPreview,
  isCollapsed,
  children, // 用于显示原始代码
  theme, // 传递 theme 对象
  codeBlockPadding, // 传递内边距
  onPreviewUnavailable,
}: MermaidContentProps) => {
  const [renderError, setRenderError] = useState<string | null>(null);

  // --- Mermaid Rendering Effect ---
  useEffect(() => {
    // 仅在预览模式、非折叠状态下运行
    if (showPreview && !isCollapsed) {
      const mermaidContainer = document.getElementById(`mermaid-${elementId}`);
      if (!mermaidContainer) return;

      let cancelled = false;

      async function renderDiagram() {
        const renderable = await canRenderMermaid(content);
        if (cancelled) return;

        if (!renderable) {
          setRenderError("Mermaid content is incomplete or invalid.");
          onPreviewUnavailable?.();
          return;
        }

        try {
          const mermaid = await getMermaid();
          if (cancelled) return;
          setRenderError(null);
          mermaidContainer!.innerHTML = content;
          mermaidContainer!.removeAttribute("data-processed");
          await mermaid.run({
            nodes: [mermaidContainer],
          });
        } catch (e) {
          if (cancelled) return;
          console.error("Error rendering Mermaid diagram:", e);
          setRenderError(toErrorMessage(e));
          onPreviewUnavailable?.();
        }
      }

      void renderDiagram();

      return () => {
        cancelled = true;
      };
    }
    setRenderError(null);
  }, [showPreview, isCollapsed, content, elementId, onPreviewUnavailable]);

  // --- Styles ---
  // 将 Mermaid 相关样式移到这里
  const mermaidStyles = `
    .mermaid-container-${elementId} { /* 使用唯一类名或 ID */
      /* 样式应用在外部容器，内部 mermaid div 由 useEffect 控制 */
    }

    .mermaid { /* 这是 mermaid.run 生成的 SVG 的默认类，或者我们包裹的 div */
        display: ${isCollapsed ? "none" : "flex"};
        justify-content: center; /* Center the diagram */
        align-items: center;
        padding: ${codeBlockPadding}; /* Add some padding around the diagram */
        /* 背景色很重要，因为 SVG 可能是透明的 */
        background: ${theme?.mode === "dark" ? theme.background : "#FFFFFF"};
        border-radius: ${theme?.space?.[1] || "4px"};
        min-height: 100px; /* Ensure some space for rendering */
        line-height: 1; /* 避免继承父级的 line-height 导致多余空间 */
        overflow: auto; /* 如果图表过大，允许滚动 */
    }

    .mermaid svg {
      max-width: 100%; /* Ensure diagram scales down */
      height: auto; /* Maintain aspect ratio */
      display: block; /* 修复可能的底部空隙 */
    }

    /* Prism code view styles (when preview is off) */
    .code-content.language-mermaid {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: var(--fontSize-base);
      line-height: var(--leading-relaxed);
      color: ${theme?.text || "#1F2937"};
      overflow-x: auto;
      display: ${isCollapsed ? "none" : "block"};
    }
  `;

  return (
    <>
      <style>{mermaidStyles}</style>
      {/* 根据 showPreview 和 isCollapsed 决定渲染内容 */}
      {!isCollapsed && showPreview && !renderError ? (
        // Mermaid 图表容器
        <div
          id={`mermaid-${elementId}`} // 唯一的 ID 用于 useEffect 定位
          className={`mermaid mermaid-container-${elementId}`} // 添加唯一类名便于样式隔离
          data-processed="false" // 初始状态
        >
          {/* 内容将在 useEffect 中填充 */}
          {/* 初始可以放一个加载指示器 */}
          Loading diagram...
        </div>
      ) : (
        // 原始 Mermaid 代码（使用 PrismJS 高亮）
        !isCollapsed && (
          <pre className={`code-content language-mermaid`}>
            <code>{children}</code>
          </pre>
        )
      )}
    </>
  );
};

export default MermaidContent;
