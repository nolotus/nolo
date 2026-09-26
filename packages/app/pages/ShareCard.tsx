import "./ShareCard.css";
import { useRef, useState } from "react";
import { NavLink, useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import { toTrimmedString } from "core/toTrimmedString";
import { LuArrowRight, LuBot, LuClock3, LuFileText, LuLayoutDashboard, LuMessagesSquare, LuTable } from "react-icons/lu";
import Avatar from "render/web/ui/Avatar";
import type { ShareSummary } from "share/types";
import { formatShareTime, normalizeAuthorName } from "share/helpers";
import { getShareTypeLabel } from "share/types";
import { DataType } from "create/types";
import MorphDialog, { runMorphDialogTransition } from "render/web/ui/modal/MorphDialog";
import { cardSurfaceViewTransitionName } from "app/viewTransitions";

export interface ShareCardItem extends ShareSummary {
  dbKey: string;
  path: string;
  authorPath?: string;
  agentPath?: string;
}

interface ShareCardProps {
  share: ShareCardItem;
  className?: string;
}

export const ShareCard: React.FC<ShareCardProps> = ({ share, className = "" }) => {
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const { t } = useTranslation();
  const isPage = share.type === DataType.DOC;
  const isApp = share.type === DataType.APP;
  const isTable = share.type === DataType.TABLE;
  const displayAuthorName = normalizeAuthorName(share.authorName);
  const shouldShowAuthor = Boolean(displayAuthorName);
  const displayAgentName = toTrimmedString(share.agentName);
  const shouldShowAgent = Boolean(share.agentKey || displayAgentName);
  const coverImage = share.coverImage || share.coverImageUrl;

  // Surface names only exist during the morph lifecycle, and each snapshot
  // phase must hold the shared name on at most ONE element — a duplicate pair
  // in one snapshot makes the browser skip the morph entirely:
  //   open  — before the old snapshot the card holds the name; once the
  //           dialog is flushed in, the card drops it so the new snapshot
  //           only sees the dialog.
  //   close — the old snapshot only sees the dialog (card is nameless); once
  //           the dialog is flushed out, the card picks the name up so the
  //           new snapshot only sees the card.
  // finished clears the card name either way — resting cards carry no names.
  const stampSurfaceName = () => {
    const node = articleRef.current;
    if (node) {
      node.style.viewTransitionName = cardSurfaceViewTransitionName(share.dbKey);
    }
  };
  const clearSurfaceName = () => {
    const node = articleRef.current;
    if (
      node &&
      node.style.viewTransitionName.startsWith("card-surface-")
    ) {
      node.style.viewTransitionName = "";
    }
  };

  const openShareDetail = () => {
    // Non-APP shares keep the original behaviour: navigate straight to the
    // share detail page (product only approved the preview modal for APP).
    if (!isApp) {
      navigate(share.path);
      return;
    }
    runMorphDialogTransition(() => setPreviewOpen(true), {
      onBeforeUpdate: stampSurfaceName,
      onAfterUpdate: clearSurfaceName,
      onAfterFinished: clearSurfaceName,
    });
  };
  const closePreview = () =>
    runMorphDialogTransition(() => setPreviewOpen(false), {
      onAfterUpdate: stampSurfaceName,
      onAfterFinished: clearSurfaceName,
    });

  const iconClass = isPage
    ? "ShareCard__icon--page"
    : isTable
      ? "ShareCard__icon--table"
      : isApp
        ? "ShareCard__icon--app"
        : "ShareCard__icon--chat";

  const iconNode = isPage
    ? <LuFileText size={20} aria-hidden="true" />
    : isTable
      ? <LuTable size={20} aria-hidden="true" />
      : isApp
        ? <LuLayoutDashboard size={20} aria-hidden="true" />
        : <LuMessagesSquare size={20} aria-hidden="true" />;

  return (
    <article
      ref={articleRef}
      role="link"
      tabIndex={0}
      className={`ShareCard ${className}`}
      onClick={openShareDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openShareDetail();
        }
      }}
    >
      <div className="ShareCard__header">
        <div className="ShareCard__identity">
          {shouldShowAuthor && (
            <div className="ShareCard__userInfo">
              {share.authorPath ? (
                <NavLink
                  to={share.authorPath}
                  className="ShareCard__identityLink"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Avatar
                    name={displayAuthorName}
                    src={share.authorAvatar}
                    size="small"
                    className="ShareCard__userAvatar"
                  />
                  <span className="ShareCard__userName">{displayAuthorName}</span>
                </NavLink>
              ) : (
                <>
                  <Avatar
                    name={displayAuthorName}
                    src={share.authorAvatar}
                    size="small"
                    className="ShareCard__userAvatar"
                  />
                  <span className="ShareCard__userName">{displayAuthorName}</span>
                </>
              )}
            </div>
          )}
          {shouldShowAgent && (
            <div className="ShareCard__agentInfo">
              {share.agentPath ? (
                <NavLink
                  to={share.agentPath}
                  className="ShareCard__identityLink ShareCard__identityLink--agent"
                  onClick={(event) => event.stopPropagation()}
                >
                  <LuBot size={14} aria-hidden="true" />
                  <span>{displayAgentName || "来源 Agent"}</span>
                </NavLink>
              ) : (
                <>
                  <LuBot size={14} aria-hidden="true" />
                  <span>{displayAgentName || "来源 Agent"}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="ShareCard__badges">
          <span className="ShareCard__badge">
            {getShareTypeLabel(share.type)}
          </span>
        </div>
      </div>

      <div className="ShareCard__body">
        {coverImage && (
          <div className="ShareCard__cover">
            <img src={coverImage} alt="" loading="lazy" />
          </div>
        )}

        <div className="ShareCard__mainInfo">
          <div className={`ShareCard__icon ${iconClass}`} aria-hidden="true">
            {iconNode}
          </div>
          <h3 className="ShareCard__title" title={share.title}>
            {share.title}
          </h3>
        </div>

        {share.description && (
          <p className="ShareCard__desc">
            {share.description}
          </p>
        )}
      </div>

      <div className="ShareCard__footer">
        <span className="ShareCard__time">
          <LuClock3 size={12} aria-hidden="true" />
          {formatShareTime(
            share.updatedAt && share.updatedAt > share.createdAt
              ? share.updatedAt
              : share.createdAt
          )}
        </span>

        <span className="ShareCard__arrow" aria-hidden="true">
          <LuArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
      <MorphDialog
        isOpen={isPreviewOpen}
        onClose={closePreview}
        morphKey={share.dbKey}
        title={share.title}
      >
        {coverImage && <img src={coverImage} alt="" className="ShareCard__previewImage" />}
        {share.description && <p>{share.description}</p>}
        <p>{getShareTypeLabel(share.type)}</p>
        {isApp && (
          <p>
            <button
              type="button"
              className="ShareCard__openShare"
              onClick={() =>
                window.open(share.url ?? share.path, "_blank", "noopener,noreferrer")
              }
            >
              {t("open", "打开")}
            </button>
          </p>
        )}
      </MorphDialog>
    </article>
  );
};
