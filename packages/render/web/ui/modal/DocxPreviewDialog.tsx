// 文件路径: render/web/ui/modal/DocxPreviewDialog.tsx

import "./previewShared.css"
import "./DocxPreviewDialog.css"
import React, { useEffect, useMemo, Suspense } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { Dialog } from "render/web/ui/modal/Dialog";
import { useTranslation } from "react-i18next";
import { LuFileText } from "react-icons/lu";
import StreamingIndicator from "render/web/ui/StreamingIndicator";
import {
  initDocState,
  resetDocState,
  useDocState,
  getDocState,
} from "render/page/docStore";
import { EditorContent } from "create/editor/utils/slateUtils";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";

const Editor = React.lazy(() => import("create/editor/Editor"));

interface DocxPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pageKey: string;
  fileName: string;
}

/**
 * 注意：DOCX 预览目前复用了 docSlice 来管理编辑状态
 * 因为预览本质上是将 DOCX 转换为 Slate 模型进行展示
 */
const DocxPreviewDialog: React.FC<DocxPreviewDialogProps> = ({
  isOpen,
  onClose,
  pageKey,
  fileName,
}) => {
  const { t } = useTranslation("chat");
  const dispatch = useAppDispatch();

  // doc state now lives in the standalone docStore (peeled out of Redux).
  const doc = useDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;

  useEffect(() => {
    if (isOpen && pageKey) {
      // 这里的 pageKey 其实是 file 的 key，但我们通过 initDoc 加载其 Slate 表示
      void initDocState(
        { pageKey, isReadOnly: true },
        { dispatch, getState: () => ({ doc: getDocState() }) }
      );
    }
    return () => {
      if (isOpen) {
        resetDocState();
      }
    };
  }, [dispatch, isOpen, pageKey]);

  const initialValue = useMemo<EditorContent>(() => {
    if (!isInitialized || !doc) {
      return [{ type: "paragraph", children: [{ text: "" }] }] as EditorContent;
    }

    const slate = doc.slateData;
    if (Array.isArray(slate) && slate.length > 0) return slate as EditorContent;

    if (doc.content) {
      try {
        return markdownToSlate(doc.content) as EditorContent;
      } catch {
        return [{ type: "paragraph", children: [{ text: "Parse Error" }] }] as EditorContent;
      }
    }

    return [{ type: "paragraph", children: [{ text: "Loading..." }] }] as EditorContent;
  }, [doc, isInitialized]);

  const renderTitle = () => (
    <div className="dialog-title-wrapper">
      <LuFileText size={16} className="title-icon" aria-hidden="true" />
      <span className="title-text" title={fileName}>
        {fileName}
      </span>
    </div>
  );

  const renderLoadingState = () => (
    <div className="loading-state">
      <StreamingIndicator />
      <p className="loading-text">{t("loadingContent")}</p>
    </div>
  );

  const renderDocumentContent = () => (
    <div className="editor-paper">
      <Suspense fallback={<StreamingIndicator />}>
        <Editor
          initialValue={initialValue}
          readOnly={true}
        />
      </Suspense>
    </div>
  );

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={renderTitle()}
        size="xlarge"
        className="docx-preview-modal"
        aria-label={`Preview of ${fileName}`}
      >
        {isOpen && (
          <div className="preview-body-content">
            {isLoading || !isInitialized
              ? renderLoadingState()
              : renderDocumentContent()}
          </div>
        )}
      </Dialog>
    </>
  );
};

export default DocxPreviewDialog;