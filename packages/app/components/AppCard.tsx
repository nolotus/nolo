import React, { useState } from "react";
import {
  LuExternalLink,
  LuMessageSquare,
  LuGlobe,
  LuLayoutGrid,
  LuLock,
  LuLink,
  LuShare2,
  LuTrash2,
} from "react-icons/lu";
import { useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "app/store";
import { share } from "database/dbSlice";
import { DataType } from "create/types";
import { toast } from "app/utils/toast"
import Button from "render/web/ui/Button";
import type { AppSummary, AppVisibility, CustomDomain } from "app/types/appSummary";
import {
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import { resolveAppRouteKey } from "app/utils/appKeys";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { DomainBindingPanel } from "./DomainBindingPanel";
import ContentIcon from "render/contentIcon/ContentIcon";
import "./AppCard.css";

interface AppCardProps {
  app: AppSummary;
  mode?: "manage" | "browse";
  contextLabel?: string;
  onOpenDetail?: () => void;
  onOpenEditor?: () => void;
  onDelete?: (app: AppSummary) => Promise<boolean>;
  onShare?: (app: AppSummary, visibility: AppVisibility) => Promise<boolean>;
  onBindDomain?: (
    app: AppSummary,
    hostname: string
  ) => Promise<{
    ok: boolean;
    url?: string;
    error?: string;
    code?: string;
    mode?: string;
    pendingDns?: boolean;
    aRecords?: string[];
  }>;
  onUnbindDomain?: (app: AppSummary, hostname: string) => Promise<{ ok: boolean; error?: string }>;
  onListDomains?: (app: AppSummary) => Promise<CustomDomain[]>;
}

function formatDate(iso?: string | number): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const AppCard: React.FC<AppCardProps> = ({
  app,
  mode = "manage",
  contextLabel,
  onOpenDetail,
  onOpenEditor,
  onDelete,
  onShare,
  onBindDomain,
  onUnbindDomain,
  onListDomains,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showDomainPanel, setShowDomainPanel] = useState(false);

  const VISIBILITY_META: Record<AppVisibility, { icon: React.ReactNode; label: string; next: AppVisibility; tip: string }> = {
    private: { icon: <LuLock size={13} aria-hidden="true" />, label: t("appCard_visibility_private_label"), next: "public", tip: t("appCard_visibility_private_tip") },
    unlisted: { icon: <LuLink size={13} aria-hidden="true" />, label: t("appCard_visibility_unlisted_label"), next: "public", tip: t("appCard_visibility_unlisted_tip") },
    public: { icon: <LuGlobe size={13} aria-hidden="true" />, label: t("appCard_visibility_public_label"), next: "private", tip: t("appCard_visibility_public_tip") },
  };

  const accessUrl = resolvePreferredAppRuntimeUrl({
    appId: app.appId,
    customUrl: app.customUrl,
    url: app.url,
  });
  const appRouteKey = resolveAppRouteKey(app.appKey, app.appId);
  const vis = app.visibility ?? "private";
  const visInfo = VISIBILITY_META[vis];
  const isManageMode = mode === "manage";
  const canOpenDetail = !!appRouteKey || !!onOpenDetail;
  const canToggleVisibility = isManageMode && !!onShare && !!app.appId;
  const canDelete = isManageMode && !!onDelete;
  const canPublish = isManageMode && !!app.appId && !!accessUrl;
  const canManageDomains =
    isManageMode && !!app.appId && !!onBindDomain && !!onUnbindDomain && !!onListDomains;

  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail();
      return;
    }
    if (appRouteKey) {
      navigate(buildAppDetailPath(appRouteKey, app.spaceId, app.serverOrigin));
    }
  };

  const handleOpenEditor = () => {
    if (onOpenEditor) {
      onOpenEditor();
      return;
    }
    if (appRouteKey) {
      navigate(buildAppEditorPath(appRouteKey, app.spaceId, app.serverOrigin));
    }
  };

  const handleBodyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenDetail) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpenDetail();
  };

  const handleVisibilityClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    void handleShare();
  };

  const handleVisibilityKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void handleShare();
  };

  const handleShare = async () => {
    if (!onShare || !app.appId || sharing) return;
    setSharing(true);
    await onShare(app, visInfo.next);
    setSharing(false);
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await onDelete(app);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const handlePublish = async () => {
    if (!app.appId || !accessUrl || publishing) return;
    setPublishing(true);
    try {
      await dispatch(
        share({
          type: DataType.APP,
          data: { appId: app.appId, name: app.name, url: accessUrl },
          title: app.name,
          visibility: "community",
        })
      ).unwrap();
      toast.success(t("appCard_publish_success"));
    } catch {
      toast.error(t("appCard_publish_failed"));
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenExternal = () => {
    if (!accessUrl) return;
    window.open(accessUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="AppCard">
      <div
        className={`AppCard__body${canOpenDetail ? " AppCard__body--interactive" : ""}`}
        onClick={canOpenDetail ? handleOpenDetail : undefined}
        onKeyDown={handleBodyKeyDown}
        role={canOpenDetail ? "button" : undefined}
        tabIndex={canOpenDetail ? 0 : undefined}
      >
        <div className="AppCard__header">
          <div className="AppCard__nameWrap">
            <ContentIcon icon={app.icon} fallback={LuLayoutGrid} size={18} />
            <div className="AppCard__name">{app.name}</div>
          </div>
          <div className="AppCard__badges">
            {contextLabel && (
              <span className="AppCard__context">
                {contextLabel}
              </span>
            )}
            {app.appId && (
              <span
                className={`AppCard__vis AppCard__vis--${vis}`}
                title={visInfo.tip}
                onClick={canToggleVisibility ? handleVisibilityClick : undefined}
                role={canToggleVisibility ? "button" : undefined}
                tabIndex={canToggleVisibility ? 0 : undefined}
                onKeyDown={canToggleVisibility ? handleVisibilityKeyDown : undefined}
              >
                {sharing ? <span className="AppCard__vis-spin">⟳</span> : visInfo.icon}
                {visInfo.label}
              </span>
            )}
          </div>
        </div>
        {app.modifiedOn && (
          <div className="AppCard__date">{t("appCard_updated_at", { date: formatDate(app.modifiedOn) })}</div>
        )}
        {accessUrl && (
          <a
            href={accessUrl}
            target="_blank"
            rel="noreferrer"
            className="AppCard__url"
            title={accessUrl}
            onClick={(event) => event.stopPropagation()}
          >
            {accessUrl.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>

      <div className={`AppCard__actions${!isManageMode ? " AppCard__actions--browse" : ""}`}>
        {accessUrl && (
          <Button
            variant="primary"
            className="AppCard__btn"
            icon={<LuExternalLink size={14} aria-hidden="true" />}
            onClick={handleOpenExternal}
          >
            {t("myApps_open")}
          </Button>
        )}
        <Button
          variant="secondary"
          className="AppCard__btn"
          icon={<LuMessageSquare size={14} aria-hidden="true" />}
          onClick={handleOpenEditor}
          disabled={!appRouteKey && !onOpenEditor}
        >
          {t("appEditor.chatMode_title", "对话编辑")}
        </Button>
        {canPublish && (
          <Button
            variant="secondary"
            className="AppCard__btn AppCard__btn--publish"
            icon={<LuShare2 size={14} aria-hidden="true" />}
            onClick={handlePublish}
            loading={publishing}
            title={t("appCard_btn_publish_tip")}
          >
            {publishing ? t("appCard_btn_publishing") : t("appCard_btn_publish")}
          </Button>
        )}
        {canManageDomains && (
          <Button
            variant="secondary"
            className={`AppCard__btn AppCard__btn--domains ${showDomainPanel ? "is-active" : ""}`}
            icon={<LuGlobe size={14} aria-hidden="true" />}
            onClick={() => setShowDomainPanel((prev) => !prev)}
            title={t("domain_panel_title")}
          >
            {t("appCard_btn_domains")}
          </Button>
        )}
        {canDelete && (
          <Button
            variant={confirmDelete ? "danger" : "secondary"}
            className={`AppCard__btn AppCard__btn--delete ${confirmDelete ? "is-confirm" : ""}`}
            icon={<LuTrash2 size={14} aria-hidden="true" />}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? t("appCard_btn_deleting")
              : confirmDelete
                ? t("appCard_btn_confirm_delete")
                : t("appCard_btn_delete")}
          </Button>
        )}
      </div>

      {showDomainPanel && app.appId && onBindDomain && onUnbindDomain && onListDomains && (
        <DomainBindingPanel
          appId={app.appId}
          onBind={(_appId, hostname) => onBindDomain(app, hostname)}
          onUnbind={(_appId, hostname) => onUnbindDomain(app, hostname)}
          onList={() => onListDomains(app)}
        />
      )}

    </div>
  );
};

export default AppCard;
