import React from "react";
import { LuCheck } from "react-icons/lu";
import type { MyContentListItem } from "app/utils/myContentItems";

export type MyContentCardDataType = "dialog" | "table" | "page";

type MyContentSelectableCardProps = {
  item: MyContentListItem;
  dataType: MyContentCardDataType;
  contentLabel: string;
  Icon: React.ComponentType<{ size?: number }>;
  tSpace: (key: string, defaultValue?: string) => string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  /** Dialog tab only: custom body above title */
  header?: React.ReactNode;
  titleClassName?: string;
};

export const MyContentSelectableCard: React.FC<MyContentSelectableCardProps> = ({
  item,
  dataType,
  contentLabel,
  Icon,
  tSpace,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  header,
  titleClassName = "MyContentCollection__title",
}) => {
  const displayTitle = item.title || tSpace("unnamed", "未命名");

  return (
    <div
      className={`MyContentCollection__card MyContentCollection__dialog-card${
        isSelectionMode ? " is-selection-mode" : ""
      }${isSelected ? " is-selected" : ""}`}
      data-type={dataType}
      data-selected={isSelected ? "true" : "false"}
    >
      {isSelectionMode ? (
        <div className="MyContentCollection__checkbox-wrapper">
          <button
            type="button"
            className={`MyContentCollection__selection-check${
              isSelected ? " is-checked" : ""
            }`}
            aria-label={isSelected ? "deselect" : "select"}
            aria-pressed={!!isSelected}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            {isSelected ? (
              <LuCheck size={12} strokeWidth={3} aria-hidden="true" />
            ) : null}
          </button>
        </div>
      ) : null}
      {header ?? (
        <div className="MyContentCollection__card-head">
          <div className="MyContentCollection__icon" aria-hidden="true">
            <Icon size={16} />
          </div>
          {item.spaceName &&
            item.spaceName !== tSpace("homeTabs.myContent", "我的内容") && (
              <span className="MyContentCollection__space">{item.spaceName}</span>
            )}
        </div>
      )}

      <div className={titleClassName} title={item.title}>
        {displayTitle}
      </div>

      <div className="MyContentCollection__meta">
        <div className="MyContentCollection__meta-left">
          <span className="MyContentCollection__type">{contentLabel}</span>
        </div>
        <span className="MyContentCollection__time">
          {new Date(item.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
