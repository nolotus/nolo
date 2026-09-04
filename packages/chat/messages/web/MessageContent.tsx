import React, { memo, useState, useMemo, useCallback, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ImageGenerationState } from "../types";

const DocxPreviewDialog = React.lazy(() => import("render/web/ui/modal/DocxPreviewDialog"));
const TablePreviewDialog = React.lazy(() => import("render/web/ui/modal/TablePreviewDialog"));
const ImagePreviewModal = React.lazy(() => import("render/web/ui/modal/ImagePreviewModal"));

import { MessageText } from "./MessageText";
import { ImagePreview } from "./ImagePreview";
import { FileItem } from "./FileItem";
import { ThinkingSection } from "./ThinkingSection";
import { ImageGenerationCard } from "./ImageGenerationCard";
import {
  extractCanvasSnapshotText,
  parseCanvasSnapshotMessage,
} from "render/canvas/canvasSnapshotParser";
import type { CompletionFinishReason, MessageErrorMeta } from "../types";
import * as stylex from "@stylexjs/stylex";
import { messageContentFinishReasonStyles } from "./messageContentFinishReasonStyles";
import CanvasSnapshotMessage from "render/canvas/CanvasSnapshotMessage";
import { SendErrorCard } from "./SendErrorCard";

type MessageContentProps = {
  content: any;
  thinkContent: any;
  imageGenerationState?: ImageGenerationState;
  role: "self" | "other";
  isStreaming?: boolean;
  messageId?: string;
  /**
   * Provider 报告的收尾原因。仅当为 "length"（撞输出上限被截断）时
   * 在 assistant 气泡下方渲染一条克制提示，其余值不展示。
   */
  finishReason?: CompletionFinishReason;
  /** 结构化错误元数据（发送失败卡片） */
  errorMeta?: MessageErrorMeta;
  /** 手动重试回调 */
  onRetry?: () => void;
  /** 自动重试进度（UI 展示「自动重试 N/M · Xs」）。 */
  retryProgress?: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
  };
};

function areMessageContentPropsEqual(
  prev: MessageContentProps,
  next: MessageContentProps
): boolean {
  return (
    prev.content === next.content &&
    prev.thinkContent === next.thinkContent &&
    prev.imageGenerationState === next.imageGenerationState &&
    prev.role === next.role &&
    prev.isStreaming === next.isStreaming &&
    prev.messageId === next.messageId &&
    prev.finishReason === next.finishReason &&
    prev.errorMeta === next.errorMeta &&
    prev.onRetry === next.onRetry &&
    prev.retryProgress === next.retryProgress
  );
}

export const MessageContent = memo(
  ({
    content,
    thinkContent,
    imageGenerationState,
    role,
    isStreaming = false,
    messageId,
    finishReason,
    errorMeta,
    onRetry,
    retryProgress,
  }: MessageContentProps) => {
    const { t } = useTranslation("chat");
    const [filePreview, setFilePreview] = useState<any | null>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);

    const onFile = useCallback((fd: any) => setFilePreview(fd), []);
    const onImg = useCallback((src: string) => setImgPreview(src), []);
    const closeFile = useCallback(() => setFilePreview(null), []);
    const closeImg = useCallback(() => setImgPreview(null), []);
    const [elapsedSeconds, setElapsedSeconds] = useState(() =>
      imageGenerationState?.startedAt
        ? Math.max(0, Math.floor((Date.now() - imageGenerationState.startedAt) / 1000))
        : 0
    );

    const isContentEmpty =
      !content ||
      (typeof content === "string" && content.trim().length === 0) ||
      (Array.isArray(content) && content.length === 0);
    const isEmptyStreaming = isStreaming && isContentEmpty;
    const isImageWaitingState =
      isEmptyStreaming &&
      role !== "self" &&
      imageGenerationState?.kind === "image_generation";
    const isEmptyFinishedAssistant =
      !isStreaming && role !== "self" && isContentEmpty && !isImageWaitingState;
    const canvasSnapshotText = useMemo(
      () => (role !== "self" ? extractCanvasSnapshotText(content) : null),
      [content, role]
    );
    const canvasSnapshot = useMemo(
      () =>
        canvasSnapshotText
          ? parseCanvasSnapshotMessage(canvasSnapshotText)
          : null,
      [canvasSnapshotText]
    );
    const isCanvasSnapshotContent = !!canvasSnapshot;

    useEffect(() => {
      if (!isImageWaitingState || !imageGenerationState?.startedAt) {
        setElapsedSeconds(0);
        return;
      }
      const updateElapsed = () => {
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - imageGenerationState.startedAt) / 1000))
        );
      };
      updateElapsed();
      const timer = window.setInterval(updateElapsed, 1000);
      return () => window.clearInterval(timer);
    }, [imageGenerationState?.startedAt, isImageWaitingState]);

    const imageGenerationStageLabel = useMemo(() => {
      switch (imageGenerationState?.stage) {
        case "saving":
          return "正在保存结果";
        case "submitted":
          return "请求已提交";
        case "generating":
        default:
          return "正在生成中";
      }
    }, [imageGenerationState?.stage]);

    const segments = useMemo(() => {
      if (!Array.isArray(content)) return [];
      const segs: any[] = [];
      let cur: any = null;

      content.forEach((it: any) => {
        const isImg = it.type === "image_url" && it.image_url?.url;
        if (isImg) {
          if (cur?.type === "images") {
            cur.items.push(it);
          } else {
            cur = { type: "images", items: [it] };
            segs.push(cur);
          }
        } else {
          if (cur?.type === "normal") {
            cur.items.push(it);
          } else {
            cur = { type: "normal", items: [it] };
            segs.push(cur);
          }
        }
      });
      return segs;
    }, [content]);

    const renderContent = useMemo(() => {
      if (isContentEmpty) {
        return null;
      }

      if (isCanvasSnapshotContent && canvasSnapshotText) {
        return <CanvasSnapshotMessage content={canvasSnapshotText} messageId={messageId} />;
      }

      if (typeof content === "string") {
        return <MessageText content={content} role={role} isStreaming={isStreaming} />;
      }

      return segments.map((seg: any, i: number) => {
        if (seg.type === "images") {
          if (seg.items.length > 1) {
            const groupKey =
              seg.items.map((it: any) => it.image_url?.url).filter(Boolean).join("|") ||
              `imgs-${i}`;
            return (
              <div key={groupKey} className="msg-images">
                {seg.items.map((it: any, idx: number) => (
                  <ImagePreview
                    key={it.image_url?.url ? `${it.image_url.url}-${idx}` : `img-${idx}`}
                    src={it.image_url.url}
                    alt={it.alt_text}
                    onPreview={onImg}
                  />
                ))}
              </div>
            );
          }
          const it = seg.items[0];
          return (
            <ImagePreview
              key={it.image_url?.url ?? `img-${i}`}
              src={it.image_url.url}
              alt={it.alt_text}
              onPreview={onImg}
            />
          );
        }

        return seg.items.map((it: any, idx: number) => {
          if (it.type === "text" && it.text) {
            // type + leading snippet + idx: stable while streaming appends, remounts if segment is replaced
            return (
              <MessageText
                key={`text-${i}-${idx}-${String(it.text).slice(0, 48)}`}
                content={it.text}
                role={role}
                isStreaming={isStreaming}
              />
            );
          }
          if (it.pageKey && it.type) {
            return (
              <FileItem
                key={it.pageKey}
                file={it}
                variant="message"
                onPreview={() => onFile({ item: it, type: it.type })}
              />
            );
          }
          return null;
        });
      });
    }, [content, role, segments, onImg, onFile, isStreaming, isContentEmpty, isCanvasSnapshotContent, canvasSnapshotText, messageId]);

    return (
      <>
        <div className="msg-content">
          <ThinkingSection
            thinkContent={thinkContent}
            messageContent={content}
            role={role}
            isStreaming={isStreaming}
            messageId={messageId}
          />
          {retryProgress && isStreaming && role !== "self" && (
            <div className="msg-retry-progress" role="status" aria-live="polite">
              {t("retryProgress", {
                attempt: retryProgress.attempt,
                maxAttempts: retryProgress.maxAttempts,
                seconds: Math.ceil(retryProgress.delayMs / 1000),
              })}
            </div>
          )}
          {isImageWaitingState && (
            <ImageGenerationCard
              stageLabel={imageGenerationStageLabel}
              elapsedSeconds={elapsedSeconds}
              waitHint={imageGenerationState?.waitHint}
              profileLabel={imageGenerationState?.profileLabel}
            />
          )}
          {isEmptyStreaming && !isImageWaitingState && (
            <div className="empty-content" aria-hidden="true">
              <span className="empty-content__line empty-content__line--short" />
              <span className="empty-content__line" />
            </div>
          )}
          {isEmptyFinishedAssistant && !errorMeta && (
            <div className="empty-assistant-fallback" role="status">
              未收到回复内容，请重试。
            </div>
          )}
          {errorMeta ? (
            <SendErrorCard errorMeta={errorMeta} onRetry={onRetry} />
          ) : (
            renderContent
          )}
        </div>

        {role !== "self" && finishReason === "length" && (
          <div
            {...stylex.props(messageContentFinishReasonStyles.lengthNotice)}
            role="status"
          >
            {t("finishReasonLengthNotice")}
          </div>
        )}

        <Suspense fallback={null}>
          {filePreview && filePreview.type === "table" ? (
            <TablePreviewDialog
              isOpen
              onClose={closeFile}
              tableKey={filePreview.item.pageKey || ""}
              tableName={filePreview.item.name || ""}
            />
          ) : (
            filePreview && (
              <DocxPreviewDialog
                isOpen
                onClose={closeFile}
                pageKey={filePreview.item.pageKey || ""}
                fileName={filePreview.item.name || ""}
              />
            )
          )}
          <ImagePreviewModal imageUrl={imgPreview} onClose={closeImg} alt="预览图片" />
        </Suspense>
      </>
    );
  },
  areMessageContentPropsEqual
);

export default MessageContent;
