import React, { useCallback, useState } from "react";
import type { HtmlArtifact } from "core/htmlArtifact";
import {
  LuGlobe,
  LuCircleCheck,
  LuEye,
  LuLoaderCircle,
} from "react-icons/lu";
import {
  openPreviewTarget,
} from "app/appInspector/appInspectorStore";
import { getActiveDialogKey } from "chat/dialog/dialogRuntimeStore";
import { readHtmlArtifact } from "app/appInspector/htmlArtifactClient";
import { toast } from "app/utils/toast";
import { withLiteralClass } from "./toolMessageShared";

export interface HtmlArtifactResultCardProps {
  toolName?: string;
  rawData?: any;
  isError?: boolean;
}

import { htmlArtifactCardStyles as styles } from "./htmlArtifactCardStyles";

export const HtmlArtifactResultCard: React.FC<HtmlArtifactResultCardProps> = ({
  toolName = "createHtmlArtifact",
  rawData,
  isError,
}) => {
  const [loadingLatest, setLoadingLatest] = useState(false);

  const artifact: HtmlArtifact | null =
    rawData?.artifact ?? (rawData?.id && rawData?.html ? rawData : null);
  const id: string = rawData?.id || artifact?.id || "";
  const title: string = artifact?.title || "未命名网页";
  const html: string = artifact?.html || "";
  const dialogKey: string | undefined = rawData?.dialogKey || artifact?.dialogKey;

  // Historical cards never auto-open. Live execution receivers own that action.
  const handleOpenWorkbench = useCallback(async () => {
    if (!id) return;
    setLoadingLatest(true);
    try {
      const latest = await readHtmlArtifact(id);
      if (latest.id !== id || !latest.html || (dialogKey && latest.dialogKey !== dialogKey)) {
        throw new Error("成品读取结果不匹配");
      }
      // Do not let a late read from a previous dialog steal the workbench.
      if (getActiveDialogKey() !== latest.dialogKey) return;
      openPreviewTarget({
        kind: "artifact",
        title: latest.title,
        html: latest.html,
        artifactId: latest.id,
        dialogKey: latest.dialogKey,
      });
    } catch {
      toast.error("读取最新网页失败，请重试。未打开历史快照。");
    } finally {
      setLoadingLatest(false);
    }
  }, [id, dialogKey]);

  const isUpdate = toolName === "updateHtmlArtifact";
  const isRead = toolName === "readHtmlArtifact";

  return (
    <div
      data-testid="html-artifact-result-card"
      {...withLiteralClass("html-artifact-result-card", styles.card)}
    >
      <div {...withLiteralClass("html-artifact-card-header", styles.header)}>
        <div {...withLiteralClass("html-artifact-card-title-row", styles.titleRow)}>
          <LuGlobe size={16} {...withLiteralClass("html-artifact-card-icon", styles.icon)} aria-hidden="true" />
          <span {...withLiteralClass("html-artifact-card-title", styles.title)} title={title}>
            {title}
          </span>
        </div>
        <span {...withLiteralClass("html-artifact-card-badge", styles.badge)}>
          <LuCircleCheck size={12} aria-hidden="true" />
          {isUpdate ? "已更新" : isRead ? "已读取" : "已保存"}
        </span>
      </div>

      <div {...withLiteralClass("html-artifact-card-meta", styles.metaRow)}>
        {id && <span>ID: {id.slice(0, 8)}…</span>}
        {html && <span>{html.length} 字符</span>}
      </div>

      <div {...withLiteralClass("html-artifact-card-actions", styles.actions)}>
        <button
          type="button"
          onClick={handleOpenWorkbench}
          disabled={loadingLatest}
          {...withLiteralClass("html-artifact-open-btn", styles.actionButton)}
        >
          {loadingLatest ? (
            <LuLoaderCircle size={13} aria-hidden="true" />
          ) : (
            <LuEye size={13} aria-hidden="true" />
          )}
          {loadingLatest ? "正在读取最新内容…" : "在工作台打开预览"}
        </button>
      </div>
    </div>
  );
};
