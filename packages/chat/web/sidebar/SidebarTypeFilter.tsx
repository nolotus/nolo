import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import "../chatStylexEscapeHatch.css";
import { useTranslation } from "react-i18next";
import { Tooltip } from "render/web/ui/Tooltip";
import {
  LuLayoutGrid,
  LuMessageSquare,
  LuBot,
  LuFileText,
  LuTable,
  LuPaperclip,
  LuAppWindow,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import type { SidebarVisibleType } from "create/space/sidebarVisibleTypes";
import {
  resolveMyContentTab,
  type MyContentListItem,
} from "app/utils/myContentItems";

export type SidebarTypeFilterId =
  | "all"
  | "app"
  | "dialog"
  | "page"
  | "table"
  | "agent"
  | "attachment";

export const isSidebarTypeFilterId = (value: string | null | undefined): value is SidebarTypeFilterId =>
  value === "all" ||
  value === "app" ||
  value === "dialog" ||
  value === "page" ||
  value === "table" ||
  value === "agent" ||
  value === "attachment";

export const mapFilterToVisibleTypes = (
  filter: SidebarTypeFilterId,
  baseVisibleTypes: SidebarVisibleType[]
): SidebarVisibleType[] => {
  switch (filter) {
    case "all":
      return baseVisibleTypes;
    case "dialog":
    case "agent":
    case "page":
    case "table":
    case "app":
      return [filter];
    case "attachment":
      return ["image", "document", "video", "audio", "file"];
    default:
      return baseVisibleTypes;
  }
};

/** Content tabs that count as "attachment" (mirrors My Content attachment sub-tabs). */
export const isAttachmentContentTab = (
  tab: ReturnType<typeof resolveMyContentTab>
): boolean =>
  tab === "image" ||
  tab === "document" ||
  tab === "video" ||
  tab === "audio" ||
  tab === "file";

/**
 * Whether a my-content item matches the given sidebar type filter.
 * Shared by the All View recent list and the sidebar favorites block so the
 * filter semantics live in one place.
 */
export const matchesTypeFilter = (
  item: MyContentListItem,
  filter: SidebarTypeFilterId
): boolean => {
  if (filter === "all") return true;
  const tab = resolveMyContentTab(item);
  if (filter === "attachment") return isAttachmentContentTab(tab);
  return tab === filter;
};

export const SidebarTypeFilter: React.FC<{
  activeFilter: SidebarTypeFilterId;
  onChange: (filter: SidebarTypeFilterId) => void;
  ariaLabel?: string;
  disabled?: boolean;
}> = ({ activeFilter, onChange, ariaLabel, disabled }) => {
  const { t } = useTranslation("space");
  const items: Array<{
    id: SidebarTypeFilterId;
    label: string;
    Icon: IconType;
  }> = [
    { id: "all", label: t("all", "全部"), Icon: LuLayoutGrid },
    { id: "dialog", label: t("sidebarTypes.dialog", "对话"), Icon: LuMessageSquare },
    { id: "agent", label: t("sidebarTypes.agent", "AI"), Icon: LuBot },
    { id: "page", label: t("sidebarTypes.page", "页面"), Icon: LuFileText },
    { id: "table", label: t("sidebarTypes.table", "表格"), Icon: LuTable },
    { id: "attachment", label: t("attachments_toggle", "附件"), Icon: LuPaperclip },
    { id: "app", label: t("sidebarTypes.app", "应用"), Icon: LuAppWindow },
  ];

  return (
    <div
      className={`SidebarTypeFilter${disabled ? " is-disabled" : ""}`}
      data-hook="chat-esc-sidebar-type-filter"
      role="group"
      aria-label={ariaLabel || t("allView.recent", "最近")}
      {...stylex.props(
        sidebarStyles.sidebarTypeFilter,
        disabled && sidebarStyles.sidebarTypeFilterDisabled
      )}
    >
      {items.map(({ id, label, Icon }) => {
        const isActive = activeFilter === id;
        return (
          <Tooltip key={id} content={label} placement="top">
            <button
              type="button"
              className={`SidebarTypeFilter-button${isActive ? " is-active" : ""}`}
              data-hook="chat-esc-sidebar-type-filter-button"
              data-recent-filter={id}
              aria-pressed={isActive}
              aria-label={label}
              onClick={(event) => {
                event.stopPropagation();
                if (!disabled) onChange(id);
              }}
              {...stylex.props(
                sidebarStyles.sidebarTypeFilterButton,
                isActive && sidebarStyles.sidebarTypeFilterButtonActive
              )}
            >
              <Icon size={14} aria-hidden="true" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
