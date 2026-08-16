import "./SpaceTypeFilterBar.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { CHAT_SIDEBAR_TYPE_META } from "create/space/contentTypeMeta";
import {
  SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  type SidebarVisibleType,
} from "create/space/sidebarVisibleTypes";

interface SpaceTypeFilterBarProps {
  selectedTypes: readonly SidebarVisibleType[];
  onToggleType: (type: SidebarVisibleType) => void;
  visibleTypes?: readonly SidebarVisibleType[];
}

const SpaceTypeFilterBar: React.FC<SpaceTypeFilterBarProps> = ({
  selectedTypes,
  onToggleType,
  visibleTypes,
}) => {
  const { t } = useTranslation("space");
  const visibleTypeSet = new Set(
    visibleTypes ?? SPACE_HOME_TOPBAR_VISIBLE_TYPES
  );

  return (
    <>
      <div
        className="SpaceTypeFilterBar"
        role="toolbar"
        aria-label={t("filterByType", "按类型筛选")}
      >
        {CHAT_SIDEBAR_TYPE_META.map(({ sidebarType, icon: Icon, shortLabelKey, shortDefaultLabel }) => {
          if (!sidebarType) return null;
          if (!visibleTypeSet.has(sidebarType)) {
            return null;
          }
          const isActive = selectedTypes.includes(sidebarType);
          return (
            <button
              key={sidebarType}
              type="button"
              className={`SpaceTypeFilterBar__item${isActive ? " is-active" : ""}`}
              onClick={() => onToggleType(sidebarType)}
              aria-pressed={isActive}
              title={t(shortLabelKey, shortDefaultLabel)}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="SpaceTypeFilterBar__label">
                {t(shortLabelKey, shortDefaultLabel)}
              </span>
            </button>
          );
        })}
      </div>

      
    </>
  );
};

export default SpaceTypeFilterBar;
