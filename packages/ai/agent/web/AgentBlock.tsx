import React, { memo, useCallback, lazy, Suspense, useState, useRef } from "react";
import { useParams } from "app/routing";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast";
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId, useIsLoggedIn, useCouldEdit } from "identity";
import { Agent } from "app/types";
import { deleteDbKey } from "app/hooks/deleteDbKey";
import { isSystemAdmin } from "core/init";
import { useHasMounted } from "app/hooks/useHasMounted";
import { Dialog } from "render/web/ui/modal/Dialog";
import { selectCurrentServer } from "app/settings/settingSlice";
import { selectCurrentSpaceId, selectViewMode } from "create/space/spaceSlice";
import { normalizeSpaceId } from "create/space/spaceKeys";
import AgentAvatar from "./AgentAvatar";
import { resolveDialogLaunchSpaceId } from "chat/dialog/dialogLaunchScope";
import { resolveAgentBadgeMeta } from "./agentBadges";
import AgentCardMeta from "./AgentCardMeta";
import AgentCardActions from "./AgentCardActions";
import {
  cardIconViewTransitionName,
  cardSurfaceViewTransitionName,
  cardTitleViewTransitionName,
  viewTransitionStyle,
} from "app/viewTransitions";
import "./AgentBlock.css";

const AgentMoreActionsLazy = lazy(() => import("./AgentMoreActions"));
const AgentForkDialogLazy = lazy(() => import("./AgentForkDialog"));

interface AgentBlockProps {
  item: Agent;
  reload?: (excludedAgentIds?: string[]) => void | Promise<void>;
  showCover?: boolean;
  preferCurrentSpaceLaunch?: boolean;
}

const loadAgentForm = () => import("ai/agent/web/AgentForm");
const AgentFormLazy = lazy(loadAgentForm);
const preloadEditBundle = () => {
  loadAgentForm();
};

const AgentBlockComponent = ({
  item,
  reload,
  showCover = false,
  preferCurrentSpaceLaunch = false,
}: AgentBlockProps) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const { spaceId: routeSpaceId } = useParams<"spaceId">();
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const viewMode = useAppSelector(selectViewMode);
  const hasMounted = useHasMounted();
  const agentKey = item.dbKey || item.id;
  const recordSpaceId = item.spaceId || routeSpaceId;
  const deleteSpaceId = routeSpaceId
    ? normalizeSpaceId(routeSpaceId)
    : recordSpaceId
      ? normalizeSpaceId(recordSpaceId)
      : undefined;

  const dialogSpaceId = resolveDialogLaunchSpaceId({
    allowSidebarSpaceFallback: true,
    currentSpaceId,
    recordSpaceId,
    viewMode,
    preferCurrentSpaceOverRecord: preferCurrentSpaceLaunch,
  });

  const badgeMeta = resolveAgentBadgeMeta(item);

  const [editVisible, setEditVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const openEdit = useCallback(() => setEditVisible(true), []);
  const closeEdit = useCallback(() => setEditVisible(false), []);

  const currentUserId = useUserId();
  const currentServer = useAppSelector(selectCurrentServer);
  const server = item.authorityServer || item.originServer || currentServer;
  const allowEditFromKey = useCouldEdit(agentKey);
  const allowEdit =
    hasMounted &&
    (allowEditFromKey ||
      (currentUserId &&
        (item.userId === currentUserId || isSystemAdmin(currentUserId))));

  const isLoggedIn = useIsLoggedIn();
  const canFork =
    hasMounted &&
    item.allowFork === true &&
    isLoggedIn &&
    item.userId !== currentUserId &&
    (!item.apiSource || item.apiSource === "platform");

  const [forkVisible, setForkVisible] = useState(false);
  const openFork = useCallback(() => setForkVisible(true), []);
  const closeFork = useCallback(() => setForkVisible(false), []);

  const handleDelete = useCallback(async () => {
    try {
      cardRef.current?.classList.add("agent-exit");
      await dispatch(
        deleteDbKey({
          contentKey: agentKey,
          preferredServerOrigin: server,
          spaceId: deleteSpaceId,
        })
      );
      toast.success(t("deleteSuccess"));
      void Promise.resolve(reload?.([String(agentKey), String(item.id)])).catch(
        (error) => {
          console.warn("[AgentBlock] Reload after delete failed:", error);
        }
      );
    } catch {
      toast.error(t("deleteError"));
    }
  }, [deleteSpaceId, agentKey, dispatch, item.id, reload, server, t]);

  const handleEdit = useCallback(() => {
    preloadEditBundle();
    openEdit();
  }, [openEdit]);

  return (
    <>
      <div
        ref={cardRef}
        className={`agent${showCover ? " agent--with-cover" : ""}`}
        style={viewTransitionStyle(cardSurfaceViewTransitionName(agentKey))}
      >
        {showCover && item.cover && (
          <div className="agent__cover">
            <img src={item.cover} alt="" loading="lazy" />
          </div>
        )}

        <div className="agent__header">
          <div
            className="agent__avatar"
            style={viewTransitionStyle(cardIconViewTransitionName(agentKey))}
          >
            <AgentAvatar agent={item} size={40} avatarSize="large" />
          </div>

          <div className="agent__info">
            <div className="agent__title-link">
              <h3
                className="agent__title"
                style={viewTransitionStyle(cardTitleViewTransitionName(agentKey))}
              >
                {item.name || t("unnamed")}
              </h3>
            </div>
            <AgentCardMeta item={item} />
          </div>

          <div className="agent__actions-top">
            <Suspense fallback={<div className="agent__more-placeholder" />}>
              <AgentMoreActionsLazy
                agentKey={agentKey}
                preloadEditBundle={allowEdit ? preloadEditBundle : undefined}
                onEdit={allowEdit ? handleEdit : undefined}
                onDelete={allowEdit ? handleDelete : undefined}
                onFork={canFork ? openFork : undefined}
              />
            </Suspense>
          </div>
        </div>

        {item.introduction && (
          <div className="agent__desc">{item.introduction}</div>
        )}

        <AgentCardActions
          item={item}
          dialogSpaceId={dialogSpaceId}
          server={server}
        />
      </div>

      <Dialog
        isOpen={editVisible}
        onClose={closeEdit}
        title={`${t("edit")} ${item.name || t("agent")}`}
        size="large"
      >
        {editVisible && (
          <Suspense
            fallback={
              <div className="agent__dialog-body-fallback">
                <div className="agent__dialog-spinner" />
                <div className="agent__dialog-text">{t("loading")}</div>
              </div>
            }
          >
            <AgentFormLazy mode="edit" initialValues={item} onClose={closeEdit} />
          </Suspense>
        )}
      </Dialog>

      {canFork && forkVisible && (
        <Suspense
          fallback={
            <div className="agent__dialog-body-fallback">
              <div className="agent__dialog-spinner" />
              <div className="agent__dialog-text">{t("loading")}</div>
            </div>
          }
        >
          <AgentForkDialogLazy
            isOpen={forkVisible}
            onClose={closeFork}
            agent={item}
          />
        </Suspense>
      )}
    </>
  );
};

const AgentBlock = memo(AgentBlockComponent);
AgentBlock.displayName = "AgentBlock";

export default AgentBlock;