import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import { withLiteralClass } from "../withLiteralClass";
import "../chatStylexEscapeHatch.css";
import { useTranslation } from "react-i18next";
import { Tooltip } from "render/web/ui/Tooltip";
import { PiSquaresFour, PiSquaresFourFill } from "react-icons/pi";
import { SIDEBAR_TYPE_ICONS } from "render/web/ui/sidebarTypeIcons";
import type { IconType } from "react-icons";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
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

/**
 * 默认真源：没有明确偏好（首次访问 / 本地存储缺失或非法）时的侧边栏类型视图。
 * SSR 与客户端 fallback 都用它，避免首屏与 hydration 后视图跳变。
 */
export const DEFAULT_SIDEBAR_TYPE_FILTER: SidebarTypeFilterId = "all";

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
    // null = 该类型用自有图标（NoloHeadMark），不走 react-icons 的填充/线性两态
    Icon: IconType | null;
    ActiveIcon: IconType | null;
  }> = [
    { id: "all", label: t("all", "全部"), Icon: PiSquaresFour, ActiveIcon: PiSquaresFourFill },
    { id: "agent", label: t("sidebarTypes.agent", "AI"), ...SIDEBAR_TYPE_ICONS.agent },
    { id: "dialog", label: t("sidebarTypes.dialog", "对话"), ...SIDEBAR_TYPE_ICONS.dialog },
    { id: "page", label: t("sidebarTypes.page", "页面"), ...SIDEBAR_TYPE_ICONS.page },
    { id: "table", label: t("sidebarTypes.table", "表格"), ...SIDEBAR_TYPE_ICONS.table },
    { id: "attachment", label: t("attachments_toggle", "附件"), ...SIDEBAR_TYPE_ICONS.attachment },
    { id: "app", label: t("sidebarTypes.app", "应用"), ...SIDEBAR_TYPE_ICONS.app },
  ];

  return (
    <div
      data-hook="chat-esc-sidebar-type-filter"
      role="group"
      aria-label={ariaLabel || t("allView.recent", "最近")}
      {...withLiteralClass(
        `SidebarTypeFilter${disabled ? " is-disabled" : ""}`,
        sidebarStyles.sidebarTypeFilter,
        disabled && sidebarStyles.sidebarTypeFilterDisabled
      )}
    >
      {items.map(({ id, label, Icon, ActiveIcon }) => {
        const isActive = activeFilter === id;
        const StateIcon = isActive ? ActiveIcon : Icon;
        return (
          <Tooltip key={id} content={label} placement="top">
            <button
              type="button"
              data-hook="chat-esc-sidebar-type-filter-button"
              data-recent-filter={id}
              aria-pressed={isActive}
              aria-label={label}
              onClick={(event) => {
                event.stopPropagation();
                if (!disabled) onChange(id);
              }}
              {...withLiteralClass(
                `SidebarTypeFilter-button${isActive ? " is-active" : ""}`,
                sidebarStyles.sidebarTypeFilterButton,
                isActive && sidebarStyles.sidebarTypeFilterButtonActive
              )}
            >
              {StateIcon ? <StateIcon size={15} aria-hidden="true" /> : <NoloHeadMark size={15} />}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
