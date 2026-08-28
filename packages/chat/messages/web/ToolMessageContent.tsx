// 文件路径: chat/messages/web/ToolMessageContent.tsx

import "./messages.css";
import React, { useState, useEffect, useMemo } from "react";
import {
  LuFileText,
  LuImage,
  LuExternalLink,
  LuTriangle,
  LuTable,
  LuShieldAlert,
  LuFileWarning,
  LuTerminal,
  LuChevronDown,
  LuChevronUp,
  LuCircle,
  LuCheck,
  LuSave,
  LuVideo,
  LuDownload,
  LuCopy,
  LuUsers,
  LuDatabase,
  LuTrash2,
} from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { useStore } from "react-redux";
import { readFileContent } from "database/dbSlice";
import ImagePreviewModal from "render/web/ui/modal/ImagePreviewModal";
import NoloEditor from "create/editor/Editor";
import CreateAgentToolCard from "./CreateAgentToolCard";
import PrepareAgentDraftToolCard from "./PrepareAgentDraftToolCard";
import UpdateAgentToolCard from "./UpdateAgentToolCard";
import AppDeployCard from "./AppDeployCard";
import TodoCard from "./TodoCard";
import ApplyLineEditsPreviewViewer from "./ApplyLineEditsPreviewViewer";
import { DiffViewer } from "./DiffViewer";
import { ToolProps, guessLanguageFromPath } from "./ToolMessageTypes";
import { handleSendMessage } from "chat/dialog/dialogSlice";
import { useCurrentUser } from "identity";
import { toast } from "app/utils/toast"
import { asOptionalTrimmedString } from "core/optionalString";
import { foldHomePath } from "core/foldHomePath";
import { createDocState } from "render/page/docStore";
import {
  buildZiweiChartDocMarkdown,
  buildZiweiChartDocTitle,
} from "../ziweiChartDoc";
import { CollapsibleToolText } from "./toolMessageShared";
import { shouldPreviewToolText } from "../toolPresentation";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

/* --- 代码文件预览（用于 readFile 等：只看最终文件） --- */

export function formatHomePath(path: string): string {
  if (!path) return "";
  return foldHomePath(path);
}

export const ReadToolTreeViewer: React.FC<{
  items: Array<{ path: string; rangeLabel?: string }>;
}> = ({ items }) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return (
    <div className="read-tool-tree-widget">
      <div className="rtt-header">
        <span className="rtt-bullet">•</span>
        <span className="rtt-title">Read</span>
        <span className="rtt-count">({count})</span>
      </div>
      <div className="rtt-list">
        {items.map((item, index) => {
          const isLast = index === count - 1;
          const connector = isLast ? "└── " : "├── ";
          const formattedPath = formatHomePath(item.path);
          let pathWithRange = formattedPath;
          if (/(:[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)$/.test(pathWithRange)) {
          } else if (item.rangeLabel) {
            pathWithRange = item.rangeLabel.startsWith(":")
              ? `${pathWithRange}${item.rangeLabel}`
              : `${pathWithRange}:${item.rangeLabel}`;
          }
          return (
            <div key={index} className="rtt-item">
              <span className="rtt-connector">{connector}</span>
              <span className="rtt-path">{pathWithRange}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const SearchToolTreeViewer: React.FC<{
  items: Array<{ query: string; path?: string }>;
}> = ({ items }) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return (
    <div className="read-tool-tree-widget">
      <div className="rtt-header">
        <span className="rtt-bullet">•</span>
        <span className="rtt-title">Search</span>
        <span className="rtt-count">({count})</span>
      </div>
      <div className="rtt-list">
        {items.map((item, index) => {
          const isLast = index === count - 1;
          const connector = isLast ? "└── " : "├── ";
          let queryText = (item.query || "").trim();
          if (item.path) {
            const formattedPath = formatHomePath(item.path);
            if (formattedPath) queryText = queryText ? `${queryText} in ${formattedPath}` : formattedPath;
          }
          return (
            <div key={index} className="rtt-item">
              <span className="rtt-connector">{connector}</span>
              <span className="rtt-path">{queryText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FetchToolTreeViewer: React.FC<{ items: Array<{ url: string }> }> = ({
  items,
}) => {
  if (!items || items.length === 0) return null;
  const count = items.length;
  return (
    <div className="read-tool-tree-widget">
      <div className="rtt-header">
        <span className="rtt-bullet">•</span>
        <span className="rtt-title">Fetch</span>
        <span className="rtt-count">({count})</span>
      </div>
      <div className="rtt-list">
        {items.map((item, index) => {
          const isLast = index === count - 1;
          const connector = isLast ? "└── " : "├── ";
          const urlText = (item.url || "").trim() || "webpage";
          return (
            <div key={index} className="rtt-item">
              <span className="rtt-connector">{connector}</span>
              <span className="rtt-path">{urlText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FetchViewer: React.FC<ToolProps> = ({ rawData, isError, toolArgs }) => {
  if (isError || rawData == null) return null;
  let url = "";
  if (typeof rawData === "string") {
    const resolved = rawData.match(/\[Resolved URL\]\s*(\S+)/);
    const inline = rawData.match(/\(URL:\s*([^)\s]+)\)/);
    url = (resolved?.[1] || inline?.[1] || "").trim();
  }
  if (!url) {
    url = asOptionalTrimmedString(toolArgs?.url) ?? "";
  }
  if (!url) return null;
  return <FetchToolTreeViewer items={[{ url }]} />;
};

const SearchViewer: React.FC<ToolProps> = ({ rawData, isError }) => {
  if (isError || rawData == null) return null;
  const data = typeof rawData === "object" ? (rawData as Record<string, any>) : {};
  const query =
    asOptionalTrimmedString(data.query) ||
    asOptionalTrimmedString(data.pattern) ||
    asOptionalTrimmedString(data.glob) ||
    (typeof rawData === "string" ? rawData : "");
  const path = asOptionalTrimmedString(data.path) || asOptionalTrimmedString(data.filePath);

  return <SearchToolTreeViewer items={[{ query, path }]} />;
};
/**
 * Normalize readFile payloads for UI.
 * Chat never dumps file body — agents may read hundreds of files; path + line
 * stats are enough for humans scanning the trajectory.
 */
function normalizeCodePreviewRawData(rawData: unknown): {
  path: string;
  rangeLabel: string;
  hasPayload: boolean;
} {
  const countLines = (text: string) => {
    if (!text) return 0;
    let lines = 1;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) lines += 1;
    }
    return lines;
  };

  if (typeof rawData === "string") {
    const lines = countLines(rawData);
    return {
      path: "",
      rangeLabel: lines > 0 ? `${lines} lines` : "",
      hasPayload: rawData.length > 0,
    };
  }
  if (!rawData || typeof rawData !== "object") {
    return { path: "", rangeLabel: "", hasPayload: false };
  }
  const data = rawData as Record<string, any>;
  const path =
    asOptionalTrimmedString(data.filePath) ||
    asOptionalTrimmedString(data.path) ||
    asOptionalTrimmedString(data.response?.filePath) ||
    asOptionalTrimmedString(data.request?.filePath) ||
    asOptionalTrimmedString(data.request?.path) ||
    "";

  let content = "";
  if (typeof data.content === "string") content = data.content;
  else if (Array.isArray(data.lines)) content = data.lines.join("\n");
  else if (typeof data.response?.content === "string") content = data.response.content;
  else if (typeof data.response?.newContent === "string") content = data.response.newContent;
  else if (typeof data.text === "string") content = data.text;

  const start = data.startLine ?? data.response?.startLine;
  const end = data.endLine ?? data.response?.endLine;
  const total = data.totalLines ?? data.response?.totalLines;
  const rangeParts: string[] = [];
  if (typeof start === "number" && typeof end === "number") {
    rangeParts.push(`L${start}–${end}`);
    if (typeof total === "number" && total > 0) {
      rangeParts.push(`${total} lines`);
    }
  } else if (typeof total === "number" && total > 0) {
    rangeParts.push(`${total} lines`);
  } else if (content) {
    rangeParts.push(`${countLines(content)} lines`);
  }
  if (data.truncated === true) rangeParts.push("truncated");

  return {
    path,
    rangeLabel: rangeParts.join(" · "),
    hasPayload: Boolean(path || content || rangeParts.length),
  };
}

/** readFile UI: tree representation matching spec. */
const CodePreviewViewer: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  if (isError || rawData == null || rawData === "") return null;

  const { path, rangeLabel, hasPayload } = normalizeCodePreviewRawData(rawData);
  if (!hasPayload) return null;

  const formattedPath = formatHomePath(path) || t("codeEdit.unnamedFile", "file");
  if (path) {
    let rangeSpec = "";
    if (rawData && typeof rawData === "object") {
      const data = rawData as Record<string, any>;
      const start = data.startLine ?? data.response?.startLine;
      const end = data.endLine ?? data.response?.endLine;
      if (typeof start === "number" && typeof end === "number") {
        rangeSpec = `${start}-${end}`;
      }
    }
    return (
      <ReadToolTreeViewer
        items={[{ path, rangeLabel: rangeSpec }]}
      />
    );
  }

  return (
    <div
      className="code-preview-widget code-preview-widget--meta"
      title={path || undefined}
    >
      <LuFileText size={13} className="u-dim" aria-hidden="true" />
      <span className="cp-path">{formattedPath}</span>
      {rangeLabel ? (
        <span className="cp-meta u-dim u-text-xs">{rangeLabel}</span>
      ) : null}
    </div>
  );
};

/* --- 代码修改预览（用于 applyLineEdits / writeFile：最终文件 + 可选 diff） --- */

const CodeChangeViewer: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  const [view, setView] = useState<"final" | "diff">("final");

  const path =
    rawData?.filePath ||
    rawData?.request?.filePath ||
    rawData?.response?.filePath ||
    "Unknown";

  const language = useMemo(() => guessLanguageFromPath(path), [path]);

  const newContent: string =
    rawData?.response?.newContent ??
    rawData?.newContent ??
    rawData?.content ??
    rawData?.request?.content ??
    "";

  const finalSlateValue = useMemo(
    () =>
      [
        {
          type: "code-block",
          language,
          children: [{ text: newContent }],
        },
      ] as any,
    [newContent, language]
  );

  if (isError || !rawData) return null;

  const diffPieces: Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
  }> = Array.isArray(rawData.response?.diff)
      ? rawData.response.diff
      : Array.isArray(rawData.diff)
        ? rawData.diff
        : [];

  const isLong = shouldPreviewToolText(newContent);

  const hasDiff = diffPieces.length > 0;

  return (
    <div className="t-content-block code-change-widget">
      <div className="cp-header">
        <div className="u-flex u-items-center u-gap-2 u-flex-1 u-min-w-0">
          <LuFileText size={14} className="u-dim" aria-hidden="true" />
          <span className="cp-path">{path}</span>
        </div>
        <div className="cc-toggle">
          <button
            type="button"
            className={view === "final" ? "on" : ""}
            onClick={() => setView("final")}
          >
            {t("codeEdit.viewFinal") || "Final"}
          </button>
          <button
            type="button"
            className={view === "diff" ? "on" : ""}
            onClick={() => setView("diff")}
            disabled={!hasDiff}
          >
            {t("codeEdit.viewDiff") || "Diff"}
          </button>
        </div>
      </div>

      {view === "diff" ? (
        <DiffViewer parts={diffPieces} filePath={path} />
      ) : isLong ? (
        <div className="editor-scroller compact">
          <CollapsibleToolText text={newContent} className="code-dump" />
        </div>
      ) : (
        <div className="editor-scroller compact">
          <NoloEditor initialValue={finalSlateValue} readOnly />
        </div>
      )}
    </div>
  );
};

/* --- Shell 执行结果 / 危险命令拦截 --- */

const ExecShellViewer: React.FC<ToolProps> = ({
  rawData,
  isError,
  t,
  presentation = "default",
}) => {
  const dispatch = useAppDispatch();
  if (isError || !rawData) return null;

  // Desktop path may leave a plain-text summary before projection; show it as stdout.
  const normalized =
    typeof rawData === "string"
      ? { command: "", cwd: "", stdout: rawData, stderr: "", exitCode: undefined as number | undefined, blocked: false, requireUnsafe: false }
      : rawData;

  const command: string = normalized.command || "";
  const cwd: string = normalized.cwd || "";
  const blocked = !!normalized.blocked;
  const requireUnsafe = !!normalized.requireUnsafe;
  const stdout = normalized.stdout || "";
  const stderr = normalized.stderr || "";
  const exitCode = normalized.exitCode;
  /** Row label already has the command — expand body is result-only. */
  const contentOnly = presentation === "groupDetail";

  const handleUnsafeRun = () => {
    if (!command) return;
    const prefix = cwd ? `在目录 ${cwd} 下，` : "";
    const userInput =
      prefix +
      "请使用 unsafe:true 再次执行刚才的 shell 命令：\n" +
      command;

    dispatch(
      handleSendMessage({
        userInput,
      } as any)
    );
  };

  if (blocked) {
    return (
      <div className="t-content-block code-change-block">
        <div className="t-block-header">
          <div className="t-badge warning">
            <LuShieldAlert size={14} aria-hidden="true" />
          </div>
          <div className="u-flex-col u-flex-1 u-min-w-0">
            <span className="u-font-bold u-text-sm u-error-text">
              {t("bash.blockedTitle", "危险命令已被拦截")}
            </span>
            {command && (
              <span className="u-font-mono u-text-xs u-dim">
                {cwd ? `${cwd} $ ${command}` : command}
              </span>
            )}
          </div>
        </div>

        {requireUnsafe && (
          <>
            <p className="t-block-desc">
              {t("bash.blockedDesc", "该命令被检测为高危操作，默认未执行。如确有必要，请确认风险后继续。")}
            </p>
            <div className="t-btn-row">
              <button type="button" className="btn-primary-sm" onClick={handleUnsafeRun}>
                <LuTerminal size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                {t("bash.runUnsafe", "仍要执行（unsafe）")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const statusColor = exitCode === 0 ? "var(--success)" : exitCode === undefined ? "var(--textQuaternary)" : "var(--error)";
  const outputBody = (
    <>
      {stdout ? <CollapsibleToolText text={String(stdout)} className="term-out" /> : null}
      {stderr ? <CollapsibleToolText text={String(stderr)} className="term-err" /> : null}
      {!stdout && !stderr && (
        <div className="u-dim u-text-xs u-flex u-items-center u-justify-center" style={{ padding: "20px 0", fontStyle: "italic" }}>
          {t("bash.noOutput") || "(No output)"}
        </div>
      )}
    </>
  );

  // Tool-group row already shows "查看历史 · git …" — only mount result text.
  if (contentOnly) {
    return (
      <div className="t-content-block bash-viewer bash-viewer--group-detail">
        {exitCode !== undefined && exitCode !== 0 && (
          <div className="bash-result-meta">
            <span className="shell-exit-code">
              {t("bash.exitCode", { code: exitCode })}
            </span>
            <LuCircle size={8} fill={statusColor} color={statusColor} aria-hidden="true" />
          </div>
        )}
        <div className="bash-output-area bash-output-area--group-detail">
          {outputBody}
        </div>
      </div>
    );
  }

  return (
    <div className="t-content-block bash-viewer professional">
      <div className="bash-terminal-window">
        <div className="bash-prompt-line">
          <span className="bash-prompt-char">&gt;_</span>
          <code className="shell-cmd">{cwd ? `${cwd} $ ${command}` : command}</code>
          <div className="shell-meta-inline">
            {exitCode !== undefined && (
              <span className="shell-exit-code">
                {t("bash.exitCode", { code: exitCode })}
              </span>
            )}
            <LuCircle size={8} fill={statusColor} color={statusColor} aria-hidden="true" />
          </div>
        </div>

        <div className="bash-output-area" style={{ maxHeight: 360 }}>
          {outputBody}
        </div>
      </div>
    </div>
  );
};

/* --- 写文件冲突视图（文件已存在但未覆盖） --- */

const WriteFileConflictViewer: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  const dispatch = useAppDispatch();
  if (isError || !rawData) return null;

  const filePath: string =
    rawData.filePath ||
    rawData.response?.filePath ||
    rawData.request?.filePath ||
    "Unknown";

  const msg: string =
    rawData.serverMessage ||
    "目标文件已存在，且本次调用未允许覆盖，因此没有进行写入。";

  const handleConfirmOverwrite = () => {
    const userInput = t("codeEdit.confirmOverwritePrompt", {
      defaultValue: `刚才尝试写入文件 ${filePath} 时发现文件已存在，且未覆盖。请确认覆盖该文件，并使用你刚才生成的最新内容。`,
      path: filePath
    });

    dispatch(
      handleSendMessage({
        userInput,
      } as any)
    );
  };

  return (
    <div className="t-content-block code-change-block">
      <div className="t-block-header">
        <div className="t-badge warning">
          <LuFileWarning size={14} aria-hidden="true" />
        </div>
        <div className="u-flex-col u-flex-1 u-min-w-0">
          <span className="u-font-bold u-text-sm u-error-text">
            {t("codeEdit.conflictTitle") || "File Conflict"}
          </span>
          <span className="u-font-mono u-text-xs u-dim">{filePath}</span>
        </div>
      </div>

      <p className="t-block-desc">
        {t("codeEdit.conflictMsg") || msg}
      </p>

      <div className="t-btn-row">
        <button type="button" className="btn-primary-sm" onClick={handleConfirmOverwrite}>
          {t("codeEdit.overwrite") || "Overwrite"}
        </button>
      </div>
    </div>
  );
};

/* --- 其他组件保留 --- */

const GeminiImageItem: React.FC<{
  file: any;
  index: number;
  onPreview: any;
  t: any;
}> = ({ file, index, onPreview, t }) => {
  const dispatch = useAppDispatch();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!file?.fileId) {
      setUrl(null);
      setStatus("loading");
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    setUrl(null);
    setStatus("loading");

    dispatch(readFileContent({ fileId: file.fileId }))
      .unwrap()
      .then(({ blob }: { blob: Blob }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setStatus("loaded");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, file?.fileId]);

  const name =
    file?.metadata?.originalName ||
    t("imgOpts.defaultName", `Image ${index + 1}`);

  const cardStyle: React.CSSProperties = {
    margin: 0,
    padding: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    width: "100%",
    appearance: "none",
  };

  if (status === "loaded" && url) {
    return (
      <button
        type="button"
        className="g-img-card loaded"
        style={cardStyle}
        onClick={() => onPreview(url, name)}
        aria-label={name}
      >
        <img src={url} alt="" loading="lazy" />
        <div className="g-img-overlay" aria-hidden="true">
          <span className="u-truncate">{name}</span>
          <LuExternalLink size={14} aria-hidden="true" />
        </div>
      </button>
    );
  }

  return (
    <div className={`g-img-card ${status}`}>
      <div className="g-img-skeleton" />
    </div>
  );
};

const GeminiGallery: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(
    null
  );
  if (isError || !rawData) return null;

  const files = Array.isArray(rawData.files) ? rawData.files : [];
  const count = rawData.imageCount ?? files.length;
  const countLabel = t("gemini.count", `${count} images generated`).replace(
    "{{count}}",
    String(count)
  );

  return (
    <div className="t-content-block">
      <div className="t-block-header">
        <div className="t-badge info">
          <LuImage size={14} aria-hidden="true" />
        </div>
        <div className="u-min-w-0">
          <span className="u-font-bold u-text-sm">
            {t("gemini.title", "Image Generation")}
          </span>
          <span className="u-text-xs u-dim" style={{ marginLeft: 8 }}>
            {countLabel}
          </span>
        </div>
      </div>
      {rawData.text && <p className="t-block-desc">{rawData.text}</p>}
      <div className={`g-grid ${files.length === 1 ? "cols-1" : "cols-fill"}`}>
        {files.map((f: any, i: number) => (
          <GeminiImageItem
            key={f.fileId || i}
            file={f}
            index={i}
            t={t}
            onPreview={(url: string, alt: string) => setPreview({ url, alt })}
          />
        ))}
      </div>
      <ImagePreviewModal
        imageUrl={preview?.url ?? null}
        alt={preview?.alt}
        onClose={() => setPreview(null)}
      />
    </div>
  );
};

const RemotionVideoCard: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  if (isError || !rawData) return null;

  const metadata = rawData.metadata || {};
  const title =
    metadata.originalName ||
    rawData.outputName ||
    t("video.generatedTitle", "Remotion video.mp4");
  const url = rawData.url || rawData.contentUrl || rawData.downloadUrl || "";
  const template = rawData.template || metadata.template;
  const size = typeof metadata.size === "number" ? metadata.size : undefined;
  const sizeLabel =
    size === undefined
      ? ""
      : size > 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(size / 1024)} KB`;

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.copied", "已复制"));
    } catch {
      toast.error(t("common.copyFailed", "复制失败"));
    }
  };

  const handleOpen = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="t-content-block remotion-video-card">
      {url ? (
        <video
          className="rvc-player"
          src={url}
          controls
          preload="metadata"
          playsInline
        />
      ) : (
        <div className="rvc-empty">
          <LuVideo size={24} aria-hidden="true" />
        </div>
      )}
      <div className="rvc-body">
        <div className="rvc-main">
          <div className="icon-badge info">
            <LuVideo size={18} aria-hidden="true" />
          </div>
          <div className="u-flex-1 u-min-w-0">
            <div className="u-font-bold u-truncate u-text-sm">{title}</div>
            <div className="rvc-meta">
              {template ? <span>{template}</span> : null}
              {sizeLabel ? <span>{sizeLabel}</span> : null}
              {rawData.fileId ? <span className="u-font-mono">{rawData.fileId}</span> : null}
            </div>
          </div>
        </div>
        <div className="rvc-actions">
          <button type="button" className="btn-tiny" onClick={handleOpen} disabled={!url}>
            <LuExternalLink size={13} aria-hidden="true" />
            {t("common.open", "Open")}
          </button>
          <button type="button" className="btn-tiny" onClick={handleCopy} disabled={!url}>
            <LuCopy size={13} aria-hidden="true" />
            {t("common.copy", "Copy")}
          </button>
          {url ? (
            <a className="btn-tiny rvc-download" href={url} download={title}>
              <LuDownload size={13} aria-hidden="true" />
              {t("common.download", "Download")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ZiweiChartCard: React.FC<ToolProps> = ({
  rawData,
  isError,
  t,
  navigateToPage,
}) => {
  const dispatch = useAppDispatch();
  const store = useStore();
  const user = useCurrentUser();
  const currentSpaceId = useCurrentSpaceId();
  const [isSaving, setIsSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  if (isError || !rawData?.chart || !rawData?.summary) return null;

  const { chart, summary, input } = rawData;
  const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
  const palaceAliasMap: Record<string, string> = {
    仆役: "交友",
    官禄: "事业",
  };
  const palaceSlotOrder = [
    "子女",
    "夫妻",
    "兄弟",
    "命宫",
    "财帛",
    "父母",
    "疾厄",
    "福德",
    "迁移",
    "仆役",
    "官禄",
    "田宅",
  ];
  const palacesByName = Object.fromEntries(
    palaces.map((palace: any) => [palace.name, palace])
  );
  const mutagenSummary = Array.isArray(chart.mutagenByYear)
    ? chart.mutagenByYear.map((item: any) => `${item.name}化${item.mutagen}`).join("、")
    : "";
  const centerFacts = [
    `阳历：${chart.solarDate} ${chart.time}`,
    `农历：${chart.lunarDate}`,
    `干支：${chart.chineseDate}`,
    `五行局：${chart.fiveElementsClass}`,
    `命主：${chart.soul} 身主：${chart.body}`,
  ];
  const saveTitle = buildZiweiChartDocTitle(rawData);

  const formatMajorStar = (star: any) => {
    const suffix = [star.brightness, star.mutagen ? `化${star.mutagen}` : ""]
      .filter(Boolean)
      .join("/");
    return {
      text: suffix ? `${star.name}/${suffix}` : star.name,
      hasMutagen: Boolean(star.mutagen),
    };
  };

  const renderPalaceCard = (name: string, extraClass = "") => {
    const palace = palacesByName[name];
    if (!palace) return null;

    const classes = [
      "ziwei-card__palace",
      extraClass,
      palace.name === "命宫" ? "is-ming" : "",
      palace.isBodyPalace ? "is-body" : "",
      palace.isOriginalPalace ? "is-origin" : "",
    ].filter(Boolean).join(" ");

    const major = Array.isArray(palace.majorStars) ? palace.majorStars : [];
    const minor = Array.isArray(palace.minorStars) ? palace.minorStars : [];
    const adjective = Array.isArray(palace.adjectiveStars) ? palace.adjectiveStars : [];

    return (
      <div key={name} className={classes}>
        <div className="ziwei-card__palace-head">
          <strong>{palace.heavenlyStem}{palace.earthlyBranch}</strong>
          <span>[{palaceAliasMap[palace.name] || palace.name}宫]</span>
        </div>
        <div className="ziwei-card__palace-limit"><span>大限</span>{palace.decadal.range[0]}-{palace.decadal.range[1]}</div>
        <div className="ziwei-card__palace-limit"><span>小限</span>{palace.ages.join(" ")}</div>
        <div className="ziwei-card__palace-stars">
          <div className="ziwei-card__star-row is-major">
            {major.length > 0 ? (
              major.map((star: any) => {
                const formatted = formatMajorStar(star);
                return (
                  <span
                    key={`${palace.name}-${star.name}`}
                    className={formatted.hasMutagen ? "is-mutagen" : ""}
                  >
                    {formatted.text}
                  </span>
                );
              })
            ) : (
              "空宫"
            )}
          </div>
          {minor.length > 0 && (
            <div className="ziwei-card__star-row is-minor">
              {minor.map((star: string) => (
                <span key={`${palace.name}-${star}`}>{star}</span>
              ))}
            </div>
          )}
          {adjective.length > 0 && (
            <div className="ziwei-card__star-row is-adj">
              {adjective.map((star: string) => (
                <span key={`${palace.name}-${star}`}>{star}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!user?.userId) {
      toast.error(t("userNotAuthenticated", "用户未登录"));
      return;
    }

    setIsSaving(true);
    try {
      const content = buildZiweiChartDocMarkdown(rawData);

      const key = await createDocState(
        {
          title: saveTitle,
          content,
          ...(currentSpaceId ? { spaceId: currentSpaceId } : {}),
        },
        { dispatch, getState: store.getState }
      );

      setSavedKey(key);
      toast.success(t("saveSuccess", "保存成功"));
    } catch {
      toast.error(t("saveFailed", "保存失败"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="t-content-block ziwei-card">
      <div className="ziwei-card__header">
        <div className="u-flex-1 u-min-w-0">
          <div className="ziwei-card__title">紫微斗数本命盘</div>
          <div className="ziwei-card__meta">
            {chart.zodiac} · {chart.sign} · {mutagenSummary || "无"}
          </div>
        </div>
        <button
          type="button"
          className="ziwei-card__save-button-minimal"
          disabled={isSaving}
          onClick={handleSave}
          title={t("ziwei.savePrompt", "保存这张命盘")}
        >
          {savedKey ? <LuCheck size={11} aria-hidden="true" /> : <LuSave size={12} aria-hidden="true" />}
          <span>{savedKey ? t("ziwei.saved", "已保存") : t("ziwei.saveDoc", "保存")}</span>
        </button>
      </div>

      <div className="ziwei-card__toolbar">
        <div className="ziwei-card__toolbar-left">
          <div className="ziwei-card__pill">{summary.fiveElementsClass}</div>
          <div className="ziwei-card__meta">
            {input?.calendarType === "lunar" ? "农历" : "阳历"} {input?.dateStr} {chart.timeRange}
          </div>
        </div>
        <div className="ziwei-card__toolbar-right">
          {savedKey && (
            <button
              type="button"
              className="ziwei-card__open-button"
              onClick={() => navigateToPage(savedKey)}
            >
              <LuExternalLink size={11} aria-hidden="true" />
              {t("ziwei.openDoc", "打开文档")}
            </button>
          )}
        </div>
      </div>

      <div className="ziwei-card__board-scroll">
        <div className="ziwei-card__board">
          {palaceSlotOrder.slice(0, 4).map((name) => renderPalaceCard(name))}

          {palaceSlotOrder.slice(4, 6).map((name) => renderPalaceCard(name, "is-side"))}

          <div className="ziwei-card__center">
            <div className="ziwei-card__center-title">命盘总览</div>

            {centerFacts.map((line) => {
              const [label, value = ""] = line.split("：");
              return (
                <div key={line} className="ziwei-card__center-line">
                  <span>{label}：</span>
                  <strong>{value}</strong>
                </div>
              );
            })}
            <div className="ziwei-card__center-facts">
              <span>命宫 {summary.mingGong}</span>
              <span>身宫 {summary.shenGong}</span>
              <span>{input?.gender}</span>
            </div>
          </div>

          {palaceSlotOrder.slice(6, 8).map((name) => renderPalaceCard(name, "is-side"))}

          {palaceSlotOrder.slice(8).map((name) => renderPalaceCard(name))}
        </div>
      </div>
    </div>
  );
};

/* --- 小红书账号画像 --- */

const unwrapXhsResult = (rawData: any) => {
  if (!rawData) return null;
  if (typeof rawData.ok === "boolean") return rawData;
  if (rawData.rawData && typeof rawData.rawData.ok === "boolean") {
    return rawData.rawData;
  }
  return null;
};

const formatXhsTopNote = (note: any) => {
  if (!note) return "";
  const title = note.title || note.noteId || "";
  const count = typeof note.count === "number" ? note.count.toLocaleString() : "";
  return title ? `${title} (${count})` : count;
};

const ReadXhsProfileCard: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  const dispatch = useAppDispatch();
  const result = unwrapXhsResult(rawData);
  const failed = isError || result?.ok === false;

  const data = result?.data;
  const profile: any = data?.profile || {};
  const notes: any[] = Array.isArray(data?.notes) ? data.notes : [];
  const noteDetails: any[] = Array.isArray(data?.noteDetails) ? data.noteDetails : [];
  const analysis: any = data?.analysis || {};
  const interactionCounts = profile.interactionCounts || {};
  const commentBuckets: any[] = Array.isArray(analysis.commentBuckets)
    ? analysis.commentBuckets
    : [];
  const topLikedComments: any[] = Array.isArray(analysis.topLikedComments)
    ? analysis.topLikedComments
    : [];

  const collectionStatus =
    result?.collectionStatus ||
    data?.collectionStatus ||
    rawData?.collectionStatus ||
    rawData?.data?.collectionStatus;

  const nextSuggestedAction =
    collectionStatus?.nextSuggestedAction ||
    result?.nextSuggestedAction ||
    data?.nextSuggestedAction ||
    rawData?.nextSuggestedAction ||
    rawData?.data?.nextSuggestedAction;

  const diagnostic =
    result?.diagnostic ||
    data?.diagnostic ||
    rawData?.diagnostic ||
    rawData?.data?.diagnostic;

  const formatNum = (n: any) =>
    typeof n === "number" ? n.toLocaleString() : String(n ?? "—");

  const handleSuggestedActionClick = (action: string, label: string) => {
    let cmd = "";
    if (action === "read_more_notes") {
      cmd = "请多读取 1 步更多笔记";
    } else if (action === "read_visible_details") {
      cmd = "请读取公开笔记详情和首屏评论";
    } else if (action === "save_to_table") {
      cmd = "请保存到表格";
    } else if (action === "stop_anonymous_unavailable" || action === "manual_login") {
      cmd = "请说明匿名公开访问不可见的原因";
    } else if (action === "read_comments") {
      cmd = "请基于当前匿名公开快照分析，说明评论未采集";
    } else {
      cmd = label || "执行下一步操作";
    }
    dispatch(
      handleSendMessage({
        userInput: cmd,
      } as any)
    );
  };

  const renderCollectionStatus = () => {
    if (!collectionStatus) return null;
    return (
      <div style={{
        marginTop: 12,
        padding: 10,
        borderRadius: 6,
        background: "var(--bgSecondary, #f5f5f5)",
        border: "1px solid var(--borderSubtle, #e5e5e5)",
        fontSize: 12,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <LuDatabase size={13} aria-hidden="true" />
          <span>采集状态</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "6px 12px", opacity: 0.8 }}>
          <div>模式：{collectionStatus.mode === "assisted" ? "辅助自动化" : "保守读取"}</div>
          <div>当前操作：{
            collectionStatus.action === "snapshot" ? "单页快照" :
            collectionStatus.action === "read_more_notes" ? "读取更多笔记" :
            collectionStatus.action === "read_visible_details" ? "读取公开详情与首屏评论" :
            collectionStatus.action === "read_comments" ? "评论未采集" :
            collectionStatus.action === "stop_anonymous_unavailable" ? "匿名不可见" :
            collectionStatus.action || "—"
          }</div>
          {collectionStatus.assistedStepCount !== undefined && (
            <div>已执行步数：{collectionStatus.assistedStepCount}</div>
          )}
          {collectionStatus.limits && (
            <>
              {collectionStatus.limits.maxAssistedSteps !== undefined && (
                <div>最大步数限制：{collectionStatus.limits.maxAssistedSteps}</div>
              )}
              {collectionStatus.limits.maxScrollPages !== undefined && (
                <div>滚动上限：{collectionStatus.limits.maxScrollPages} 页</div>
              )}
              {collectionStatus.limits.maxCommentPagesPerNote !== undefined && (
                <div>评论上限：{collectionStatus.limits.maxCommentPagesPerNote} 页/篇</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDiagnostic = () => {
    if (!diagnostic || typeof diagnostic !== "object") return null;
    const isErrorDiagnostic = diagnostic.captchaDetected || diagnostic.loginDetected || diagnostic.code === "risk_limit" || diagnostic.code === "login_required";
    return (
      <div style={{
        marginTop: 10,
        padding: 8,
        borderRadius: 6,
        background: isErrorDiagnostic
          ? "rgba(255, 77, 79, 0.08)"
          : "rgba(250, 173, 20, 0.08)",
        border: isErrorDiagnostic
          ? "1px solid rgba(255, 77, 79, 0.2)"
          : "1px solid rgba(250, 173, 20, 0.2)",
        color: isErrorDiagnostic
          ? "var(--error, #ff4d4f)"
          : "var(--warning, #faad14)",
        fontSize: 11,
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
      }}>
        <LuShieldAlert size={14} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
        <div>
          <div style={{ fontWeight: 600 }}>诊断提示：{[diagnostic.code, diagnostic.message].filter(Boolean).join(" - ") || "检测到异常状态"}</div>
          <div style={{ opacity: 0.8, marginTop: 2 }}>
            {[
              diagnostic.loginDetected ? "检测到未登录或需重新登录" : null,
              diagnostic.captchaDetected ? "检测到滑动验证码" : null,
              diagnostic.pageTitle ? `页面标题: ${diagnostic.pageTitle}` : null,
            ].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
    );
  };

  const renderNextSuggestedAction = () => {
    if (!nextSuggestedAction) return null;
    return (
      <div style={{
        marginTop: 12,
        padding: 10,
        borderRadius: 6,
        background: "var(--accentLight, rgba(24, 144, 255, 0.08))",
        border: "1px solid var(--accent, rgba(24, 144, 255, 0.2))",
        fontSize: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: "var(--accent, #1890ff)" }}>建议下一步：</span>
            <span style={{ opacity: 0.85 }}>{nextSuggestedAction.reason || "可以执行建议的操作"}</span>
          </div>
          <button
            type="button"
            className="btn-primary-sm"
            style={{
              background: "var(--accent, #1890ff)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => handleSuggestedActionClick(nextSuggestedAction.action, nextSuggestedAction.label)}
          >
            {nextSuggestedAction.action === "save_to_table" ? <LuSave size={12} aria-hidden="true" /> : <LuDatabase size={12} aria-hidden="true" />}
            {nextSuggestedAction.label || "执行"}
          </button>
        </div>
      </div>
    );
  };

  if (failed) {
    const code = result?.code || "";
    const message =
      result?.message ||
      rawData?.displayData ||
      t("xhs.failed", "读取小红书账号失败");
    const needsLogin = code === "login_required" || code === "not_logged_in";

    return (
      <div className="t-content-block x-post-card is-error">
        <div className="x-post-card__header">
          <div className="x-post-card__badge is-error">
            <LuTriangle size={15} aria-hidden="true" />
          </div>
          <div className="x-post-card__identity">
            <div className="x-post-card__title">
              {t("xhs.failedTitle", "小红书账号读取失败")}
            </div>
            {code ? <div className="x-post-card__meta">{code}</div> : null}
          </div>
        </div>
        <div className="x-post-card__text">{String(message)}</div>
        {needsLogin && (
          <div className="x-post-card__hint">
            {t(
              "xhs.loginRequired",
              "匿名公开访问不可见或暂不可用。当前读取器不会登录、复用账号或使用 cookie。"
            )}
          </div>
        )}
        {renderCollectionStatus()}
        {renderDiagnostic()}
        {renderNextSuggestedAction()}
      </div>
    );
  }

  if (!result?.ok || !result.data) return null;

  return (
    <div className="t-content-block x-post-card">
      <div className="x-post-card__header">
        <div className="x-post-card__avatar">
          {(profile.nickname || "书").slice(0, 1)}
        </div>
        <div className="x-post-card__identity">
          <div className="x-post-card__title">{profile.nickname || "—"}</div>
          <div className="x-post-card__meta">
            {profile.redId ? <span>小红书号 {profile.redId}</span> : null}
          </div>
        </div>
      </div>

      {profile.desc ? (
        <div className="x-post-card__text">{profile.desc}</div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "4px 0 8px", fontSize: 12 }}>
        <span>笔记 {formatNum(notes.length)}</span>
        <span>详情 {formatNum(noteDetails.length)}</span>
        {interactionCounts.follows != null && (
          <span>关注 {formatNum(interactionCounts.follows)}</span>
        )}
        {interactionCounts.fans != null && (
          <span>粉丝 {formatNum(interactionCounts.fans)}</span>
        )}
        {interactionCounts.likesAndCollects != null && (
          <span>赞藏 {formatNum(interactionCounts.likesAndCollects)}</span>
        )}
      </div>

      {analysis.totalNotes != null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "0 0 8px", fontSize: 12, opacity: 0.8 }}>
          <span>分析笔记 {formatNum(analysis.totalNotes)}</span>
          {analysis.highestLikedNote && (
            <span>最高赞 {formatXhsTopNote(analysis.highestLikedNote)}</span>
          )}
          {analysis.highestCommentedNote && (
            <span>最多评论 {formatXhsTopNote(analysis.highestCommentedNote)}</span>
          )}
          {analysis.highestCollectedNote && (
            <span>最多收藏 {formatXhsTopNote(analysis.highestCollectedNote)}</span>
          )}
          {analysis.highestSharedNote && (
            <span>最多分享 {formatXhsTopNote(analysis.highestSharedNote)}</span>
          )}
        </div>
      )}

      {commentBuckets.length > 0 && (
        <div style={{ padding: "0 0 6px", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {t("xhs.commentTopics", "评论主题")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {commentBuckets.map((b: any, i: number) => (
              <span
                key={b.label ?? `bucket-${i}`}
                style={{
                  background: "var(--bgSecondary, #f0f0f0)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 11,
                }}
              >
                {b.label}
                {b.count != null ? ` (${b.count})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {topLikedComments.length > 0 && (
        <div style={{ padding: "0 0 6px", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {t("xhs.topComments", "热门评论")}
          </div>
          {topLikedComments.slice(0, 3).map((c: any, i: number) => (
            <div
              key={c.commentId ?? `comment-${i}`}
              style={{
                padding: "2px 0",
                opacity: 0.85,
                fontSize: 11,
              }}
            >
              ❤ {formatNum(c.likeCount)} — {c.content || ""}
            </div>
          ))}
        </div>
      )}

      {renderCollectionStatus()}
      {renderDiagnostic()}
      {renderNextSuggestedAction()}
    </div>
  );
};

const unwrapXPostResult = (rawData: any) => {
  if (!rawData) return null;
  if (typeof rawData.ok === "boolean") return rawData;
  if (rawData.rawData && typeof rawData.rawData.ok === "boolean") {
    return rawData.rawData;
  }
  return null;
};

const ReadXPostCard: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  const result = unwrapXPostResult(rawData);
  const failed = isError || result?.ok === false;

  const handleCopy = async () => {
    const text =
      result?.ok && result.data?.text
        ? result.data.text
        : typeof rawData?.displayData === "string"
          ? rawData.displayData
          : "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.copied", "已复制"));
    } catch {
      toast.error(t("common.copyFailed", "复制失败"));
    }
  };

  if (failed) {
    const message =
      result?.message ||
      rawData?.error ||
      rawData?.displayData ||
      t("xPost.failed", "读取 X 帖子失败");
    const code = result?.code;
    const nextStep = result?.nextStep;

    return (
      <div className="t-content-block x-post-card is-error">
        <div className="x-post-card__header">
          <div className="x-post-card__badge is-error">
            <LuTriangle size={15} aria-hidden="true" />
          </div>
          <div className="x-post-card__identity">
            <div className="x-post-card__title">
              {t("xPost.failedTitle", "X 帖子读取失败")}
            </div>
            {code ? <div className="x-post-card__meta">{code}</div> : null}
          </div>
        </div>
        <div className="x-post-card__text">{String(message)}</div>
        {nextStep ? <div className="x-post-card__hint">{nextStep}</div> : null}
      </div>
    );
  }

  if (!result?.ok || !result.data) return null;

  const post = result.data;
  const author = post.author || {};
  const handle = author.handle ? `@${author.handle}` : "";
  const displayName = author.displayName || handle || t("xPost.author", "X 用户");
  const backend = result.backend || post.sourceBackend;
  const url = post.url || rawData?.url || "";

  const handleOpen = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="t-content-block x-post-card">
      <div className="x-post-card__header">
        <div className="x-post-card__avatar">
          {(displayName || handle || "X").slice(0, 1).toUpperCase()}
        </div>
        <div className="x-post-card__identity">
          <div className="x-post-card__title">{displayName}</div>
          <div className="x-post-card__meta">
            {handle}
            {backend ? <span>{backend}</span> : null}
          </div>
        </div>
        <div className="x-post-card__actions">
          <button
            type="button"
            className="btn-tiny"
            onClick={handleCopy}
            title={t("common.copy", "Copy")}
            aria-label={t("common.copy", "Copy")}
          >
            <LuCopy size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-tiny"
            onClick={handleOpen}
            disabled={!url}
            title={t("common.open", "Open")}
            aria-label={t("common.open", "Open")}
          >
            <LuExternalLink size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="x-post-card__text">{post.text}</div>
      {url ? (
        <div className="x-post-card__footer">
          <LuFileText size={12} aria-hidden="true" />
          <span>{url}</span>
        </div>
      ) : null}
    </div>
  );
};

const DeleteSpacesCard: React.FC<ToolProps> = ({ rawData, isError, t }) => {
  if (isError || !rawData) return null;

  const deletable = Array.isArray(rawData.deletable) ? rawData.deletable : [];
  const skipped = Array.isArray(rawData.skipped) ? rawData.skipped : [];
  const deletedSpaceIds = Array.isArray(rawData.deletedSpaceIds)
    ? rawData.deletedSpaceIds
    : [];
  const failures = Array.isArray(rawData.failures) ? rawData.failures : [];
  const isExecuted = deletedSpaceIds.length > 0 || failures.length > 0;
  const title = isExecuted
    ? `已删除 ${deletedSpaceIds.length} 个 Space`
    : `待确认删除 ${deletable.length} 个 Space`;

  return (
    <div className={`t-content-block delete-spaces-card ${isExecuted ? "is-done" : "is-preview"}`}>
      <div className="delete-spaces-card__header">
        <div className={`delete-spaces-card__badge ${isExecuted ? "is-done" : "is-warning"}`}>
          <LuTrash2 size={16} aria-hidden="true" />
        </div>
        <div className="delete-spaces-card__title-wrap">
          <div className="delete-spaces-card__title">{title}</div>
          <div className="delete-spaces-card__subtitle">
            只删除 Space 壳和成员关系，不删除其中 doc/dialog/file
          </div>
        </div>
      </div>

      {!isExecuted && deletable.length > 0 ? (
        <div className="delete-spaces-list">
          {deletable.map((item: any) => (
            <div key={item.spaceId} className="delete-spaces-row">
              <div className="delete-spaces-row__main">
                <div className="delete-spaces-row__name">{item.name || item.spaceId}</div>
                <div className="delete-spaces-row__id">{item.spaceId}</div>
              </div>
              <div className="delete-spaces-row__meta">
                <span><LuUsers size={13} aria-hidden="true" />{item.memberCount ?? 0}</span>
                <span><LuDatabase size={13} aria-hidden="true" />{item.contentCount ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isExecuted && deletedSpaceIds.length > 0 ? (
        <div className="delete-spaces-result-list">
          {deletedSpaceIds.map((spaceId: string) => (
            <div key={spaceId} className="delete-spaces-result">
              <LuCheck size={14} aria-hidden="true" />
              <span>{spaceId}</span>
            </div>
          ))}
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <div className="delete-spaces-skipped">
          <div className="delete-spaces-skipped__title">已跳过 {skipped.length} 个</div>
          {skipped.map((item: any) => (
            <div key={`${item.spaceId}-${item.reason}`} className="delete-spaces-skipped__item">
              <span>{item.name || item.spaceId || "未知 Space"}</span>
              <code>{item.reason}</code>
            </div>
          ))}
        </div>
      ) : null}

      {failures.length > 0 ? (
        <div className="delete-spaces-failures">
          {failures.map((item: any) => (
            <div key={item.dbKey}>{item.dbKey}: HTTP {item.status}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Strip the `Skill "<name>" loaded inline. Follow its instructions.` prefix
 * from loadSkill tool content; returns the remaining skill body text.
 */
function extractLoadSkillBody(content: string): string {
  const trimmed = content.trim();
  const prefix =
    /^Skill\s+"[^"]*"\s+loaded inline\.?\s*Follow its instructions\.?\s*/;
  return trimmed.replace(prefix, "").trim();
}

/* --- Renderer Registry --- */

const RENDERERS: Record<string, React.FC<ToolProps>> = {
  createPage: ({ rawData, t, openPreview, navigateToPage }) => {
    const title =
      asOptionalTrimmedString(rawData.title) ??
      t("page.untitled", "Untitled Page");
    return (
      <div className="t-inline-link">
        <button
          type="button"
          onClick={() => openPreview(rawData.id, title)}
          aria-label={title}
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
            appearance: "none",
          }}
        >
          <LuFileText size={14} className="icon-success" aria-hidden="true" />
          <span className="u-font-bold u-truncate u-text-sm u-flex-1">{title}</span>
        </button>
        <button
          type="button"
          className="btn-tiny"
          onClick={() => navigateToPage(rawData.id)}
        >
          {t("common.open", "Open")}
        </button>
      </div>
    );
  },
  createDoc: ({ rawData, t, openPreview, navigateToPage }) => {
    const pageId = rawData.dbKey || rawData.id;
    const title =
      asOptionalTrimmedString(rawData.title) ??
      t("page.untitled", "Untitled Page");
    return (
      <div className="t-inline-link">
        <button
          type="button"
          onClick={() => pageId && openPreview(pageId, title)}
          aria-label={title}
          disabled={!pageId}
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: pageId ? "pointer" : "default",
            appearance: "none",
          }}
        >
          <LuFileText size={14} className="icon-success" aria-hidden="true" />
          <span className="u-font-bold u-truncate u-text-sm u-flex-1">{title}</span>
        </button>
        <button
          type="button"
          className="btn-tiny"
          onClick={() => pageId && navigateToPage(pageId)}
          disabled={!pageId}
        >
          {t("common.open", "Open")}
        </button>
      </div>
    );
  },
  createTable: ({ rawData, t, navigateToPage }) => {
    const title =
      rawData.displayName || t("table.untitled", "Untitled Table");
    return (
      <button
        type="button"
        className="t-card-link"
        onClick={() => rawData.dbKey && navigateToPage(rawData.dbKey)}
        disabled={!rawData.dbKey}
        style={{
          width: "100%",
          margin: 0,
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          appearance: "none",
        }}
      >
        <div className="icon-badge info">
          <LuTable size={18} aria-hidden="true" />
        </div>
        <div className="u-flex-1 u-min-w-0">
          <div className="u-font-bold u-truncate u-text-sm">{title}</div>
          <div className="u-text-xs u-dim u-font-mono">
            ID: {rawData.tableId}
          </div>
        </div>
        <LuExternalLink size={16} className="u-dim" aria-hidden="true" />
      </button>
    );
  },
  addTableRow: ({ rawData, isError, t }) => {
    if (isError || !rawData) return null;
    const rowId = rawData.rowId || rawData.dbKey?.split("-").pop() || "";
    const values = rawData.values || {};
    const hasValues = Object.keys(values).length > 0;
    return (
      <div className="t-row-added">
        <LuTable size={13} className="u-dim" aria-hidden="true" />
        <span className="u-text-xs u-dim">
          {t("table.rowAdded", "已添加一行")}
          {rowId && <span className="u-font-mono" style={{ marginLeft: 6, opacity: 0.5 }}>#{rowId.slice(-6)}</span>}
        </span>
        {hasValues && (
          <span className="u-text-xs u-dim" style={{ marginLeft: 4 }}>
            — {Object.entries(values).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </span>
        )}
      </div>
    );
  },
  prepareAgentDraft: (props) => <PrepareAgentDraftToolCard {...props} />,
  createAgent: (props) => <CreateAgentToolCard {...props} />,
  updateSelf: (props) => <UpdateAgentToolCard {...props} />,
  updateAgent: (props) => <UpdateAgentToolCard {...props} />,
  appDeploy: (props) => <AppDeployCard {...props} />,
  geminiFlashImage: (props) => <GeminiGallery {...props} />,
  openAIGptImage: (props) => <GeminiGallery {...props} />,
  openAIGptImageGenerate: (props) => <GeminiGallery {...props} />,
  chatgptWebImageGenerate: (props) => <GeminiGallery {...props} />,
  openAIGptImageEdit: (props) => <GeminiGallery {...props} />,
  remotionRenderVideo: (props) => <RemotionVideoCard {...props} />,
  ziweiChart: (props) => <ZiweiChartCard {...props} />,
  read_x_post: (props) => <ReadXPostCard {...props} />,
  read_xhs_profile: (props) => <ReadXhsProfileCard {...props} />,
  deleteSpaces: (props) => <DeleteSpacesCard {...props} />,
  loadSkill: ({ rawData, toolArgs }) => {
    const content = typeof rawData === "string" ? rawData : "";
    // Not-found results are plain-text strings sharing the minimal common
    // prefix `Skill "<name>" not found` across all three producers: the
    // executor (packages/agent-runtime/noloWorkspaceTools.ts
    // formatUnknownSkillMessage) appends " in this workspace's skill
    // directories (...)", while the platform (packages/ai/tools/loadSkillTool.ts)
    // and server (noloWorkspaceServerTools.ts) append ". Available skills: ...".
    // The success wording is "loaded inline", which never matches. The
    // renderer must not show the green-check "loaded inline" success state
    // for not-found — it must render a failure surface.
    const notFoundMatch = content.match(/^Skill\s+"([^"]*)"\s+not found/);
    const isNotFound = Boolean(notFoundMatch);
    if (isNotFound) {
      const failedName = notFoundMatch?.[1] ?? "";
      // The available-skills list follows the header line; surface it so the
      // user/agent can pick a real name. Reuse the existing failure coloring
      // (icon-error) without inventing new CSS.
      const lines = content.split(/\n+/).filter(Boolean);
      const availableLine = lines.find((line) =>
        line.startsWith("Available skills:"),
      );
      const noneLine = lines.find((line) =>
        line.startsWith("No skills were discovered"),
      );
      return (
        <div className="load-skill-card">
          <div className="load-skill-line">
            <LuShieldAlert size={13} className="icon-error" aria-hidden="true" />
            <span>
              {failedName
                ? `Skill "${failedName}" not found`
                : "Skill not found"}
            </span>
          </div>
          {availableLine ? (
            <div className="u-text-xs u-dim">
              {availableLine}
            </div>
          ) : noneLine ? (
            <div className="u-text-xs u-dim">{noneLine}</div>
          ) : null}
        </div>
      );
    }
    const name =
      asOptionalTrimmedString(toolArgs?.name) ??
      content.match(/^Skill\s+"([^"]*)"\s+loaded inline/)?.[1] ??
      "";
    const body = extractLoadSkillBody(content);
    return (
      <div className="load-skill-card">
        <div className="load-skill-line">
          <LuCheck size={13} className="icon-success" aria-hidden="true" />
          <span>
            {name ? `Skill "${name}" loaded inline` : "Skill loaded inline"}
          </span>
        </div>
        {body ? (
          <CollapsibleToolText text={body} className="code-dump" />
        ) : null}
      </div>
    );
  },

  // 代码相关工具
  globFiles: (props) => <SearchViewer {...props} />,
  glob_files: (props) => <SearchViewer {...props} />,
  grep: (props) => <SearchViewer {...props} />,
  searchWorkspace: (props) => <SearchViewer {...props} />,
  readFile: (props) => <CodePreviewViewer {...props} />,
  applyLineEdits: (props) =>
    props.rawData?.previewOnly ? (
      <ApplyLineEditsPreviewViewer {...props} />
    ) : (
      <CodeChangeViewer {...props} />
    ),
  writeFile: (props) =>
    props.rawData?.applied === false && props.rawData?.conflict ? (
      <WriteFileConflictViewer {...props} />
    ) : (
      <CodeChangeViewer {...props} />
    ),
  exec_shell: (props) => <ExecShellViewer {...props} />,
  execShell: (props) => <ExecShellViewer {...props} />,
  fetchWebpage: (props) => <FetchViewer {...props} />,
  fetch_webpage: (props) => <FetchViewer {...props} />,
  setTodoList: (props) => <TodoCard {...props} />,
};

type ToolName = keyof typeof RENDERERS;

interface ToolMessageContentProps extends ToolProps {
  toolName?: ToolName;
}

const parseToolRawData = (rawData: unknown) => {
  if (typeof rawData !== "string") return rawData;
  try {
    return JSON.parse(rawData);
  } catch {
    return rawData;
  }
};

/** Fallback dump: stringify once, mount only a preview until expand. */
const LazyJsonDump: React.FC<{ data: unknown }> = ({ data }) => {
  const json = useMemo(() => {
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return <CollapsibleToolText text={json} className="code-dump" />;
};

const ToolMessageContent: React.FC<ToolMessageContentProps> = (props) => {
  const conversationTodoEnabled = props.conversationTodoEnabled !== false;
  const Component = props.toolName ? RENDERERS[props.toolName] : null;
  // Only normalize once; skip JSON.stringify when a specialized renderer exists.
  const normalizedRawData = useMemo(
    () => parseToolRawData(props.rawData),
    [props.rawData]
  );

  if (props.toolName === "setTodoList" && !conversationTodoEnabled) return null;

  return (
    <div className="t-content-root">
      {Component ? (
        <Component {...props} rawData={normalizedRawData} />
      ) : (
        <LazyJsonDump data={normalizedRawData} />
      )}
    </div>
  );
};

export default ToolMessageContent;

/* --- Styles (Cleaned up ALE specific styles) --- */
