import React from "react";
import { useTranslation } from "react-i18next";
import { LuCircleAlert, LuShare2 } from "react-icons/lu";

type TableTopbarOverflowContentProps = {
  shareStatusText: string;
  shareWarningText: string | null;
  isPublishingShare: boolean;
  canPublishCommunityShare: boolean;
  isCommunityShared: boolean;
  onPublishCommunity: () => void;
};

export function TableTopbarOverflowContent({
  shareStatusText,
  shareWarningText,
  isPublishingShare,
  canPublishCommunityShare,
  isCommunityShared,
  onPublishCommunity,
}: TableTopbarOverflowContentProps) {
  const { t } = useTranslation();

  return (
    <div className="topbar__more-table-share" role="group" aria-label={t("tableShare")}>
      <div className="topbar__more-table-share-status">
        <LuShare2 size={16} aria-hidden="true" />
        <div className="topbar__more-table-share-copy">
          <strong>{t("tableShare")}</strong>
          <span>{shareStatusText}</span>
        </div>
      </div>
      {shareWarningText ? (
        <div className="topbar__more-table-share-warning">
          <LuCircleAlert size={14} aria-hidden="true" />
          <span>{shareWarningText}</span>
        </div>
      ) : null}
      <button
        type="button"
        className="topbar__more-item"
        onClick={onPublishCommunity}
        disabled={!canPublishCommunityShare}
        role="menuitem"
      >
        <LuShare2 size={16} aria-hidden="true" />
        <span>
          {isPublishingShare
            ? t("loading")
            : isCommunityShared
              ? t("tableShareRepublish")
              : t("tableSharePublish")}
        </span>
      </button>
    </div>
  );
}