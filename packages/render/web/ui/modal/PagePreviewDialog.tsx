import "./PagePreviewDialog.css"
import React, { Suspense, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { Dialog } from "render/web/ui/modal/Dialog";
import { useTranslation } from "react-i18next";
import { LuExternalLink, LuFileText } from "react-icons/lu";
import StreamingIndicator from "render/web/ui/StreamingIndicator";
import Button from "render/web/ui/Button";
import {
  initDocState,
  resetDocState,
  useDocState,
  getDocState,
} from "render/page/docStore";
import { EditorContent } from "create/editor/utils/slateUtils";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";

const Editor = React.lazy(() => import("create/editor/Editor"));

interface PagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pageKey: string;
  pageTitle: string;
  onOpenPage: () => void;
}

const PagePreviewDialog: React.FC<PagePreviewDialogProps> = ({
  isOpen,
  onClose,
  pageKey,
  pageTitle,
  onOpenPage,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  // doc state now lives in the standalone docStore (peeled out of Redux).
  const doc = useDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;

  useEffect(() => {
    if (isOpen && pageKey) {
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
    if (!isInitialized) {
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

    return [{ type: "paragraph", children: [{ text: "" }] }] as EditorContent;
  }, [doc, isInitialized]);

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        size="xlarge"
        className="page-preview-modal"
        title={
          <div className="page-preview-title">
            <LuFileText size={16} aria-hidden="true" />
            <span className="page-preview-title-text" title={pageTitle}>
              {pageTitle}
            </span>
          </div>
        }
      >
        {isOpen && (
          <div className="page-preview-body">
            <div className="page-preview-actions">
              <Button
                variant="secondary"
                size="small"
                onClick={onOpenPage}
                icon={<LuExternalLink size={14} />}
              >
                {t("open")}
              </Button>
            </div>
            {isLoading || !isInitialized ? (
              <div className="page-preview-loading">
                <StreamingIndicator />
              </div>
            ) : (
              <div className="page-preview-content">
                <Suspense fallback={<StreamingIndicator />}>
                  <Editor initialValue={initialValue} readOnly={true} />
                </Suspense>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
};

export default PagePreviewDialog;
