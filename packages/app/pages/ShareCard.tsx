import "./ShareCard.css";
import { NavLink, useNavigate } from "app/routing";
import { toTrimmedString } from "core/toTrimmedString";
import { LuArrowRight, LuBot, LuClock3, LuFileText, LuLayoutDashboard, LuMessagesSquare, LuTable } from "react-icons/lu";
import Avatar from "render/web/ui/Avatar";
import type { ShareSummary } from "share/types";
import { formatShareTime, normalizeAuthorName } from "share/helpers";
import { getShareTypeLabel } from "share/types";
import { DataType } from "create/types";

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
  const navigate = useNavigate();
  const isPage = share.type === DataType.DOC;
  const isApp = share.type === DataType.APP;
  const isTable = share.type === DataType.TABLE;
  const displayAuthorName = normalizeAuthorName(share.authorName);
  const shouldShowAuthor = Boolean(displayAuthorName);
  const displayAgentName = toTrimmedString(share.agentName);
  const shouldShowAgent = Boolean(share.agentKey || displayAgentName);
  const coverImage = share.coverImage || share.coverImageUrl;

  const openShareDetail = () => {
    if (isApp && share.url) {
      window.open(share.url, "_blank", "noopener,noreferrer");
    } else {
      navigate(share.path);
    }
  };

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
    </article>
  );
};
