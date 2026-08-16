import { memo, useCallback, lazy, Suspense } from "react";
import { useStore } from "react-redux";
import { Link } from "app/routing";
import { useTranslation } from "react-i18next";
import type { Agent } from "app/types";
import { useAppDispatch, useAppSelector, type RootState } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { viewTransitionStyle } from "app/viewTransitions";
import { getAgentCardVTNames, useViewTransitionNavigate } from "app/viewTransitionCoordinator";
import AgentAvatar from "./AgentAvatar";
import { buildAgentNavLocationState } from "./agentNavigationPreview";
import { seedAgentPreviewInStore } from "./seedAgentPreview";
import AgentCardMeta from "./AgentCardMeta";
import AgentCardActions from "./AgentCardActions";
import { isInteractiveAgentCardTarget } from "./agentCardUtils";
import "./AgentBlock.css";

const AgentMoreActionsLazy = lazy(() => import("./AgentMoreActions"));

interface AgentCardProps {
  item: Agent;
}

const AgentCardComponent = ({ item }: AgentCardProps) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const agentKey = item.dbKey || item.id;
  const agentPath = `/${agentKey}`;
  const currentServer = useAppSelector(selectCurrentServer);
  const server = item.authorityServer || item.originServer || currentServer;

  const navigateWithVT = useViewTransitionNavigate();
  const vtNames = getAgentCardVTNames(agentKey);
  const surfaceVt = viewTransitionStyle(vtNames.surface);
  const avatarVt = viewTransitionStyle(vtNames.icon);
  const titleVt = viewTransitionStyle(vtNames.title);

  const prefetchAgent = useCallback(() => {
    seedAgentPreviewInStore(dispatch, store.getState, item);
  }, [dispatch, item, store]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isInteractiveAgentCardTarget(e.target)) {
        e.preventDefault();
        return;
      }
      // Plain left-click → route View Transition (card → AgentPage).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      seedAgentPreviewInStore(dispatch, store.getState, item);
      e.preventDefault();
      navigateWithVT(agentPath, { state: buildAgentNavLocationState(item) });
    },
    [agentPath, dispatch, item, navigateWithVT, store]
  );

  return (
    <Link
      to={agentPath}
      state={buildAgentNavLocationState(item)}
      className="agent"
      style={surfaceVt}
      onClick={handleCardClick}
      onPointerEnter={prefetchAgent}
      onFocus={prefetchAgent}
    >
      <div className="agent__header">
        <div className="agent__avatar" style={avatarVt}>
          <AgentAvatar agent={item} size={40} avatarSize="large" />
        </div>
        <div className="agent__info">
          <div className="agent__title-link">
            <h3 className="agent__title" style={titleVt}>
              {item.name || t("unnamed")}
            </h3>
          </div>
          <AgentCardMeta item={item} />
        </div>
        <div className="agent__actions-top">
          <Suspense fallback={<div className="agent__more-placeholder" />}>
            <AgentMoreActionsLazy agentKey={agentKey} />
          </Suspense>
        </div>
      </div>

      {item.introduction && (
        <div className="agent__desc">{item.introduction}</div>
      )}

      <AgentCardActions item={item} server={server} />
    </Link>
  );
};

const AgentCard = memo(AgentCardComponent);
AgentCard.displayName = "AgentCard";

export default AgentCard;