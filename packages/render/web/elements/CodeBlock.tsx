// 文件：render/web/elements/CodeBlock.tsx

import "../elements.css";
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useInsertionEffect,
  lazy,
  Suspense,
} from "react";
import { useTheme } from "app/theme";
import copyToClipboard from "app/utils/clipboard";
import JsonBlock from "./JsonBlock";
import MermaidContent from "./MermaidContent";
import { BaseModal } from "render/web/ui/modal/BaseModal";
import { LuEye, LuMaximize2 } from "react-icons/lu";
import { CodeBlockToolbar } from "./CodeBlockToolbar";
import { canPreviewJson } from "./codeBlockAutoPreview";
import { canRenderMermaid } from "./mermaidPreview";
import { preloadArtifactRuntimeResources } from "./artifactRuntimePreload";

const IframeArtifactBlock = lazy(() => import("./IframeArtifactBlock"));

interface CodeBlockProps {
  attributes: any;
  children: any;
  element: any;
  isStreaming?: boolean;
}

const CodeBlock = ({
  attributes,
  children,
  element,
  isStreaming = false,
}: CodeBlockProps) => {
  const theme = useTheme();

  // 先解析 language，后续所有判断统一用这个值
  const [language, filename] = useMemo(() => {
    const lang = element.language || "";
    const idx = lang.indexOf(":");
    return idx > -1 ? [lang.slice(0, idx), lang.slice(idx + 1)] : [lang, null];
  }, [element.language]);

  const content = useMemo(() => {
    const walk = (nodes: any): string =>
      Array.isArray(nodes)
        ? nodes
          .map((node) => {
            if (!node) return "";
            if (typeof node.text === "string") return node.text;
            if (node.type === "code-line") return walk(node.children) + "\n";
            if (Array.isArray(node.children)) return walk(node.children);
            return "";
          })
          .join("")
        : "";
    try {
      return walk(element.children).replace(/\n$/, "");
    } catch (err) {
      console.error("Extract code error:", err, element.children);
      return "";
    }
  }, [element.children]);

  const isPreviewEnabled = element.preview === "true";
  const isMermaid = language === "mermaid";
  const isReactPreviewArtifact =
    (language === "jsx" || language === "tsx") &&
    isPreviewEnabled &&
    /function\s+Example\s*\(/.test(content);
  const isHtmlPreviewArtifact = language === "html" && isPreviewEnabled;
  const autoPreviewJson = useMemo(
    () => language === "json" && canPreviewJson(content),
    [language, content]
  );
  const syncAutoPreviewEnabled =
    isReactPreviewArtifact ||
    isHtmlPreviewArtifact ||
    isPreviewEnabled ||
    autoPreviewJson;

  useInsertionEffect(() => {
    if (isReactPreviewArtifact) preloadArtifactRuntimeResources();
  }, [isReactPreviewArtifact]);

  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(
    isReactPreviewArtifact || (!isStreaming && syncAutoPreviewEnabled)
  );
  const [isCollapsed, setIsCollapsed] = useState(
    isReactPreviewArtifact ? false : element.collapsed === "true"
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // streaming 结束后自动切预览（preview=true、json、chart/flow）
  useEffect(() => {
    if (isReactPreviewArtifact) {
      setShowPreview(true);
      setIsCollapsed(false);
      return;
    }
    if (!isStreaming && syncAutoPreviewEnabled) {
      setShowPreview(true);
    }
  }, [isStreaming, isReactPreviewArtifact, syncAutoPreviewEnabled]);

  // mermaid 需要按块做可解析检查；只有当前块完整可渲染时才自动切预览
  useEffect(() => {
    if (isStreaming || isPreviewEnabled || !isMermaid) return;

    let cancelled = false;

    async function syncMermaidPreview() {
      const renderable = await canRenderMermaid(content);
      if (cancelled) return;

      if (renderable) {
        setShowPreview(true);
      } else {
        setShowPreview(false);
      }
    }

    void syncMermaidPreview();

    return () => {
      cancelled = true;
    };
  }, [isStreaming, isPreviewEnabled, isMermaid, content]);

  const elementId = useMemo(
    () => element.id || `code-${Math.random().toString(36).slice(2, 11)}`,
    [element.id]
  );

  const handleCopy = () => {
    copyToClipboard(content, {
      onSuccess: () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      onError: (err) => console.error("Failed to copy:", err),
    });
  };

  const handleMermaidPreviewUnavailable = useCallback(() => {
    setShowPreview(false);
  }, []);

  // 占位：预览模式 + 仍在 streaming
  const renderPlaceholder = () => (
    <div className="preview-content preview-placeholder">
      <LuEye size={18} aria-hidden="true" />
      <span>程序生成中，请稍候…</span>
    </div>
  );

  const renderContent = ({
    previewMode = showPreview,
    collapsed = isCollapsed,
    fullscreen = false,
  }: {
    previewMode?: boolean;
    collapsed?: boolean;
    fullscreen?: boolean;
  } = {}) => {
    const wrapperClass = `preview-content${fullscreen ? " preview-content-fullscreen" : ""}`;

    if (previewMode && isStreaming && !isReactPreviewArtifact) {
      return renderPlaceholder();
    }

    if (isMermaid) {
      return (
        <div className={wrapperClass}>
          <MermaidContent
            elementId={elementId}
            content={content}
            showPreview={previewMode}
            isCollapsed={collapsed}
            children={children}
            theme={theme}
            codeBlockPadding="var(--space-4)"
            onPreviewUnavailable={handleMermaidPreviewUnavailable}
          />
        </div>
      );
    }

    if (language === "json" && previewMode && content && !collapsed) {
      return (
        <div className={wrapperClass}>
          <JsonBlock
            rawCode={content}
            showPreview={previewMode}
            codeBlockPadding="var(--space-4)"
          />
        </div>
      );
    }

    if (isReactPreviewArtifact && previewMode && !collapsed) {
      return (
        <div className={wrapperClass}>
          <Suspense fallback={renderPlaceholder()}>
            <IframeArtifactBlock
              rawCode={content}
              className={fullscreen ? "fullscreen-live" : undefined}
              fullscreen={fullscreen}
            />
          </Suspense>
        </div>
      );
    }

    if (isHtmlPreviewArtifact && previewMode && !collapsed) {
      return (
        <div className="html-artifact-card" style={{ padding: "16px", background: "var(--backgroundSecondary, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>📄</span>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>{filename || "即用即弃单页 HTML 制品"}</span>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                void import("app/appInspector/appInspectorStore").then((m) => {
                  m.openPreviewTarget({
                    kind: "artifact",
                    title: filename || "单文件 HTML 制品",
                    html: content,
                  });
                });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--primary, #0284c7)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              在工作台打开
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "var(--textSecondary, #64748b)" }}>
            已生成自包含单文件 Web 制品。点击即可在右侧/分栏工作台中全景交互与修改。
          </div>
        </div>
      );
    }

    if (language === "diff" && !collapsed) {
      const diffLines = content.split("\n");
      return (
        <pre className="code-content language-diff">
          <code className="language-diff">
            {diffLines.map((line, i) => {
              let className = "diff-line diff-line-context";
              if (line.startsWith("@@")) className = "diff-line diff-line-hunk";
              else if (line.startsWith("+") && !line.startsWith("+++")) className = "diff-line diff-line-added";
              else if (line.startsWith("-") && !line.startsWith("---")) className = "diff-line diff-line-deleted";
              return (
                <div key={i} className={className}>
                  <span className="diff-line-content">{line || " "}</span>
                </div>
              );
            })}
          </code>
        </pre>
      );
    }

    if (!collapsed && !isReactPreviewArtifact) {
      const languageClass = `language-${language || "plaintext"}`;
      return (
        <pre className={`code-content ${languageClass}`}>
          <code className={languageClass}>{children}</code>
        </pre>
      );
    }

    return null;
  };

  return (
    <>
      <div {...attributes} className="code-block-wrapper">
        {isReactPreviewArtifact ? (
          <div className="inline-react-artifact-frame">
            <button
              type="button"
              className="inline-react-artifact-fullscreen"
              onClick={() => setIsFullscreenOpen(true)}
              aria-label="全屏查看"
              title="全屏查看"
            >
              <LuMaximize2 size={16} aria-hidden="true" />
            </button>
            {renderContent({ previewMode: true, collapsed: false })}
          </div>
        ) : (
          <>
            <CodeBlockToolbar
              language={language}
              filename={filename}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              isStreaming={isStreaming}
              isCopied={isCopied}
              handleCopy={handleCopy}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              onFullscreen={() => setIsFullscreenOpen(true)}
            />
            {renderContent()}
          </>
        )}
      </div>

      <BaseModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        className="code-block-fullscreen-modal"
      >
        <div className="fullscreen-preview-shell">
          <div className="fullscreen-preview-header">
            <div>
              <span className="fullscreen-preview-title">
                {language || "Preview"}
              </span>
              {filename && (
                <span className="fullscreen-preview-filename">
                  {filename}
                </span>
              )}
            </div>
            <button
              type="button"
              className="fullscreen-close-button"
              onClick={() => setIsFullscreenOpen(false)}
            >
              退出全屏
            </button>
          </div>
          <div className="fullscreen-preview-body">
            {renderContent({ previewMode: true, collapsed: false, fullscreen: true })}
          </div>
        </div>
      </BaseModal>
    </>
  );
};

export default CodeBlock;
