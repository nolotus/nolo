import {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { LuEllipsis, LuPencil, LuTrash2, LuStar, LuCloudUpload, LuCheck, LuCopy } from "react-icons/lu";
import { useAgentFavorite } from "app/favorite/useAgentFavorite";
import { useAppDispatch } from "app/store";
import { useIsLoggedIn, useUserId } from "identity";
import { asTrimmedString } from "core/trimmedString";
import {
  getSyncMapping,
  getSyncMappingVersion,
  subscribeSyncMappingVersion,
} from "database/sync/syncMapping";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { toast } from "app/utils/toast";
import { resolveAgentSyncActionVisibility } from "../agentSyncActionVisibility";
import { runSyncStandaloneAgentToAccount } from "../runSyncStandaloneAgentToAccount";
import "./AgentMoreActions.css";

interface AgentMoreActionsProps {
  agentKey: string;
  preloadEditBundle?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onFork?: () => void;
}

const AgentMoreActionsComponent = ({
  agentKey,
  preloadEditBundle,
  onEdit,
  onDelete,
  onFork,
}: AgentMoreActionsProps) => {
  const { t } = useTranslation(["ai"]);
  const dispatch = useAppDispatch();
  const accountUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const { isFavorited, toggleFavorite } = useAgentFavorite(agentKey);

  const mappingVersion = useSyncExternalStore(
    subscribeSyncMappingVersion,
    getSyncMappingVersion,
    () => 0
  );

  const mappedToActiveAccount = useMemo(() => {
    if (!accountUserId || accountUserId === "local") return false;
    return !!getSyncMapping(agentKey, accountUserId);
  }, [agentKey, accountUserId, mappingVersion]);

  const syncVisibility = useMemo(
    () =>
      resolveAgentSyncActionVisibility({
        agentKey,
        accountUserId,
        isLoggedIn,
        mappedToActiveAccount,
      }),
    [agentKey, accountUserId, isLoggedIn, mappedToActiveAccount]
  );

  const [showActions, setShowActions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncInFlightRef = useRef(false);
  const menuAnchorRef = useRef<HTMLDivElement>(null);

  const stopEvent = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMoreClick = useCallback(
    (e: MouseEvent) => {
      stopEvent(e);
      setShowActions((prev) => {
        const next = !prev;
        if (next && preloadEditBundle) {
          preloadEditBundle();
        }
        return next;
      });
    },
    [preloadEditBundle]
  );

  const handleFavoriteClick = (e: MouseEvent) => {
    stopEvent(e);
    setShowActions(false);
    toggleFavorite();
  };
  const handleForkClick = (e: MouseEvent) => {
    stopEvent(e);
    setShowActions(false);
    if (onFork) onFork();
  };

  const handleEditClick = (e: MouseEvent) => {
    stopEvent(e);
    setShowActions(false);
    if (preloadEditBundle) preloadEditBundle();
    if (onEdit) onEdit();
  };

  const handleDeleteMenuClick = async (e: MouseEvent) => {
    stopEvent(e);
    setShowActions(false);
    if (deleting || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncMenuClick = (e: MouseEvent) => {
    stopEvent(e);
    if (syncVisibility.kind !== "sync" || syncInFlightRef.current) return;
    setShowActions(false);
    setSyncConfirmOpen(true);
  };

  const handleSyncConfirmClose = useCallback(() => {
    if (syncing) return;
    setSyncConfirmOpen(false);
  }, [syncing]);

  const handleSyncConfirm = useCallback(async () => {
    if (syncInFlightRef.current) return;
    const account = asTrimmedString(accountUserId);
    if (!account || account === "local") return;

    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      await runSyncStandaloneAgentToAccount(
        { accountUserId: account, localAgentKey: agentKey },
        dispatch as { (action: unknown): { unwrap: () => Promise<unknown> } }
      );
      toast.success(
        t("syncToAccountSuccess", "已同步到当前账号（本机 Agent 仍保留）")
      );
      setSyncConfirmOpen(false);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("syncToAccountError", "同步失败，请稍后重试");
      toast.error(message);
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [accountUserId, agentKey, dispatch, t]);

  useEffect(() => {
    if (!showActions) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuAnchorRef.current?.contains(target)) return;
      setShowActions(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowActions(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActions]);

  const syncConfirmFacts = [
    t(
      "syncToAccountFactLocalRemains",
      "本机 Agent 会继续留在这台设备上。"
    ),
    t(
      "syncToAccountFactSnapshotOnly",
      "本次只上传 Agent 配置快照。"
    ),
    t(
      "syncToAccountFactNoDialogs",
      "不会上传对话、消息、附件。"
    ),
    t(
      "syncToAccountFactNoSecrets",
      "不会上传本机 API 密钥或令牌。"
    ),
    t(
      "syncToAccountFactNoSpaceMembership",
      "不会变更或同步 Space 成员关系。"
    ),
  ];

  return (
    <>
      <div className="agent__menu-anchor" ref={menuAnchorRef}>
        <button
          type="button"
          className={`agent__more ${showActions ? "agent__more--active" : ""}`}
          onPointerEnter={preloadEditBundle}
          onFocus={preloadEditBundle}
          onClick={handleMoreClick}
          title={t("moreActions")}
          aria-label={t("moreActions")}
          aria-expanded={showActions}
        >
          <LuEllipsis size={18} aria-hidden="true" />
        </button>

        {showActions && (
          <div className="agent__actions-menu">
            <button
              type="button"
              className="agent__action-item agent__action-item--favorite"
              onClick={handleFavoriteClick}
            >
              <LuStar
                size={14}
                aria-hidden="true"
                style={{
                  fill: isFavorited ? "var(--primary)" : "transparent",
                  color: isFavorited ? "var(--primary)" : "inherit",
                }}
              />
              <span>{isFavorited ? t("unfavorite", "取消收藏") : t("favorite", "收藏")}</span>
            </button>

            {onFork && (
              <button
                type="button"
                className="agent__action-item agent__action-item--fork"
                onClick={handleForkClick}
              >
                <LuCopy size={14} aria-hidden="true" />
                <span>{t("fork.action", "复制到我的")}</span>
              </button>
            )}

            {syncVisibility.kind === "sync" && (
              <button
                type="button"
                className="agent__action-item agent__action-item--sync"
                onClick={handleSyncMenuClick}
                disabled={syncing}
              >
                <LuCloudUpload size={14} aria-hidden="true" />
                <span>{t("syncToAccount", "同步到 Nolo 账号")}</span>
              </button>
            )}

            {syncVisibility.kind === "synced" && (
              <div
                className="agent__action-item agent__action-item--synced"
                role="status"
                aria-label={t("syncedToAccount", "已同步到当前账号")}
              >
                <LuCheck size={14} aria-hidden="true" />
                <span>{t("syncedToAccount", "已同步到当前账号")}</span>
              </div>
            )}

            {onEdit && (
              <button
                type="button"
                className="agent__action-item agent__action-item--edit"
                onPointerEnter={preloadEditBundle}
                onFocus={preloadEditBundle}
                onClick={handleEditClick}
              >
                <LuPencil size={14} aria-hidden="true" />
                <span>{t("edit")}</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="agent__action-item agent__action-item--delete"
                onClick={handleDeleteMenuClick}
              >
                <LuTrash2 size={14} aria-hidden="true" />
                <span>{t("delete")}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={syncConfirmOpen}
        onClose={handleSyncConfirmClose}
        onConfirm={() => {
          void handleSyncConfirm();
        }}
        title={t("syncToAccountTitle", "同步到 Nolo 账号")}
        message={t(
          "syncToAccountConfirmLead",
          "确认把此本机 Agent 的配置同步到当前 Nolo 账号？"
        )}
        confirmText={t("syncToAccountConfirm", "确认同步")}
        cancelText={t("cancel", "取消")}
        type="info"
        loading={syncing}
        allowCancelWhileLoading={false}
      >
        <ul className="agent__sync-confirm-facts">
          {syncConfirmFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </ConfirmModal>
    </>
  );
};

const AgentMoreActions = memo(AgentMoreActionsComponent);
AgentMoreActions.displayName = "AgentMoreActions";

export default AgentMoreActions;
