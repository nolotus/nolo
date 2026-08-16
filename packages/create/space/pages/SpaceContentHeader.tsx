import "./SpaceContentHeader.css";
import React from "react";
import {
  LuScanText,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { TFunction } from "i18next";
import Button from "render/web/ui/Button";

type ViewMode = "grid" | "list";

interface SpaceContentHeaderProps {
  // selection
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onBatchOcr: () => void;
  onDeleteSelected: () => void;
  onExitSelection: () => void;
  ocrProgress: { done: number; total: number } | null;
  t: TFunction;
}

const SpaceContentHeader: React.FC<SpaceContentHeaderProps> = ({
  ocrProgress,
  isSelectionMode,
  selectedCount,
  totalCount,
  onSelectAll,
  onBatchOcr,
  onDeleteSelected,
  onExitSelection,
  t,
}) => {
  return (
    <>
      {isSelectionMode && (
      <header className="space-content-header__header space-content-header__header--selection-active">
          <div className="space-content-header__selection-toolbar">
            <span className="space-content-header__selection-count">
              {t("selectionCount", { count: selectedCount })}
            </span>
            <div className="space-content-header__selection-divider" />
            <div className="space-content-header__selection-actions">
              <Button variant="ghost" size="small" onClick={onSelectAll}>
                {selectedCount === totalCount ? t("deselectAll") : t("selectAll")}
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={selectedCount === 0 || !!ocrProgress}
                loading={!!ocrProgress}
                onClick={onBatchOcr}
                icon={<LuScanText size={15} aria-hidden="true" />}
              >
                <span className="btn-label-full">
                  {ocrProgress
                    ? `OCR ${ocrProgress.done}/${ocrProgress.total}`
                    : t("ocrAddToChat")}
                </span>
                <span className="btn-label-short">OCR</span>
              </Button>
              <Button
                variant="danger"
                size="small"
                disabled={selectedCount === 0}
                onClick={onDeleteSelected}
                icon={<LuTrash2 size={15} aria-hidden="true" />}
              >
                <span className="btn-label-full">{t("delete")}</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={onExitSelection}
              className="space-content-header__selection-exit-btn"
              aria-label={t("cancelSelection", "取消选择")}
            >
              <LuX size={14} aria-hidden="true" />
              <span className="btn-label-full">&nbsp;{t("cancelSelection", "取消选择")}</span>
            </Button>
          </div>
      </header>
      )}

      
    </>
  );
};

export default SpaceContentHeader;
