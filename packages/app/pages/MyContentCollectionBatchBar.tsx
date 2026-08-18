import React from "react";
import { LuTrash2 } from "react-icons/lu";
import Button from "render/web/ui/Button";

type MyContentCollectionBatchBarProps = {
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  itemNoun: string;
  isDeleting?: boolean;
  onEnterSelection: () => void;
  onExitSelection: () => void;
  onToggleSelectAll: () => void;
  onRequestDelete: () => void;
  allSelected: boolean;
  labels: {
    selectAll: string;
    deselectAll: string;
    selected: string;
    total: string;
    deleteSelected: string;
    cancel: string;
    batchManage: string;
  };
};

export const MyContentCollectionBatchBar: React.FC<
  MyContentCollectionBatchBarProps
> = ({
  isSelectionMode,
  selectedCount,
  totalCount,
  itemNoun,
  isDeleting = false,
  onEnterSelection,
  onExitSelection,
  onToggleSelectAll,
  onRequestDelete,
  allSelected,
  labels,
}) => (
  <div className="MyContentCollection__batch-bar">
    <div className="MyContentCollection__batch-bar-start">
      {isSelectionMode ? (
        <>
          <Button variant="ghost" size="small" onClick={onToggleSelectAll}>
            {allSelected ? labels.deselectAll : labels.selectAll}
          </Button>
          <span className="MyContentCollection__batch-bar-meta">
            {labels.selected.replace("{{count}}", String(selectedCount)).replace(
              "{{noun}}",
              itemNoun
            )}
          </span>
        </>
      ) : (
        <span className="MyContentCollection__batch-bar-meta">
          {labels.total
            .replace("{{count}}", String(totalCount))
            .replace("{{noun}}", itemNoun)}
        </span>
      )}
    </div>
    <div className="MyContentCollection__batch-bar-actions">
      {isSelectionMode ? (
        <>
          <Button
            variant="danger"
            size="small"
            onClick={onRequestDelete}
            disabled={selectedCount === 0 || isDeleting}
            loading={isDeleting}
            icon={<LuTrash2 size={14} aria-hidden="true" />}
          >
            {labels.deleteSelected}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={onExitSelection}
            disabled={isDeleting}
          >
            {labels.cancel}
          </Button>
        </>
      ) : (
        <Button variant="secondary" size="small" onClick={onEnterSelection}>
          {labels.batchManage}
        </Button>
      )}
    </div>
  </div>
);