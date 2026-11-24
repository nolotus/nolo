import React from "react";
import { LuChevronUp } from "react-icons/lu";
import { TFunction } from "i18next";
import { SpaceContent as SpaceContentType } from "app/types";
import { Dialog } from "render/web/ui/modal/Dialog";
import FilePage from "render/page/FilePage";
import TablePreviewDialog from "render/web/ui/modal/TablePreviewDialog";
import DocxPreviewDialog from "render/web/ui/modal/DocxPreviewDialog";
import PagePreviewDialog from "render/web/ui/modal/PagePreviewDialog";
import Button from "render/web/ui/Button";
import ImagePreviewFetcher from "../components/ImagePreviewFetcher";
const EpubReaderDialog = React.lazy(() => import("../epub/EpubReaderDialog"));

interface SpaceContentOverlaysProps {
  spaceId?: string;
  showBackToTop: boolean;
  onBackToTop: () => void;
  t: TFunction;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesAdded: (files: File[]) => void;
  previewItem: SpaceContentType | null;
  previewIsTable: boolean;
  previewIsDocx: boolean;
  previewIsEpub: boolean;
  previewIsImage: boolean;
  previewIsPage: boolean;
  previewRouteKey: string;
  onClosePreview: () => void;
  onOpenPreviewPage: () => void;
}

const SpaceContentOverlays: React.FC<SpaceContentOverlaysProps> = ({
  spaceId,
  showBackToTop,
  onBackToTop,
  t,
  fileInputRef,
  onFilesAdded,
  previewItem,
  previewIsTable,
  previewIsDocx,
  previewIsEpub,
  previewIsImage,
  previewIsPage,
  previewRouteKey,
  onClosePreview,
  onOpenPreviewPage,
}) => {
  return (
    <>
      {showBackToTop && (
        <Button
          className="back-to-top-btn"
          variant="secondary"
          size="small"
          onClick={onBackToTop}
          icon={<LuChevronUp size={14} aria-hidden="true" />}
          title={t("backToTop")}
        >
          {t("backToTop")}
        </Button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
        data-testid="space-content-upload-input"
        onChange={(e) => {
          if (e.target.files) {
            onFilesAdded(Array.from(e.target.files));
          }
        }}
      />

      {previewItem && previewIsTable && (
        <TablePreviewDialog
          isOpen={!!previewItem}
          onClose={onClosePreview}
          tableKey={previewItem.contentKey}
          tableName={previewItem.title}
        />
      )}

      {previewItem && previewIsDocx && (
        <DocxPreviewDialog
          isOpen={!!previewItem}
          onClose={onClosePreview}
          pageKey={previewItem.contentKey}
          fileName={previewItem.title}
        />
      )}

      {previewItem && previewIsEpub && (
        <React.Suspense fallback={null}>
          <EpubReaderDialog
            contentKey={previewItem.contentKey}
            title={previewItem.title}
            onClose={onClosePreview}
          />
        </React.Suspense>
      )}

      {previewItem && previewIsImage && (
        <ImagePreviewFetcher
          contentKey={previewItem.contentKey}
          spaceId={spaceId}
          onClose={onClosePreview}
          alt={previewItem.title}
        />
      )}

      {previewItem && previewIsPage && (
        <PagePreviewDialog
          isOpen={!!previewItem}
          onClose={onClosePreview}
          pageKey={previewRouteKey}
          pageTitle={previewItem.title}
          onOpenPage={onOpenPreviewPage}
        />
      )}

      {previewItem && !previewIsDocx && !previewIsEpub && !previewIsTable && !previewIsImage && !previewIsPage && (
        <Dialog
          isOpen={!!previewItem}
          onClose={onClosePreview}
          size="xlarge"
          noPadding
          title={previewItem.title}
        >
          <div style={{ height: "100%", width: "100%" }}>
            <FilePage pageKey={previewItem.contentKey} />
          </div>
        </Dialog>
      )}
    </>
  );
};

export default SpaceContentOverlays;