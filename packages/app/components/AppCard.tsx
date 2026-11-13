// 用于 promotion 实测：无功能影响的注释变更（不改逻辑）
import React, { useState } from "react";
import {
  LuEllipsis,
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
import { Button as RacButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "app/store";
import { share } from "database/dbSlice";
import { DataType } from "create/types";
import { toast } from "app/utils/toast"
import Button from "render/web/ui/Button";
import { Menu, MenuItem, MenuTrigger } from "render/web/ui/Menu";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import type { AppSummary, AppVisibility, CustomDomain } from "app/types/appSummary";
import {
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import { resolveAppRouteKey } from "app/utils/appKeys";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { DomainBindingPanel } from "./DomainBindingPanel";
import AppPreviewFrame from "./AppPreviewFrame";
import ContentIcon from "render/contentIcon/ContentIcon";
import "./AppCard.css";

interface AppCardProps {
  app: AppSummary;
  mode?: "manage" | "browse";
  /**
   * 作品库布局（opt-in）：大图真实预览 + 名称/可见性/更新时间，次要操作收进
   * 「更多」菜单。默认关闭，既有调用方（列表视图）行为不变。
   */
  gallery?: boolean;
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
  gallery = false,
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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
    versionServerOrigin: app.versionServerOrigin,
    serverOrigin: app.serverOrigin,
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
    // 卡片内的真实控件（更多菜单按钮、链接等）自己处理按键，不连带触发「打开详情」。
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select")) return;
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

  /** 「更多」菜单里的删除走显式二次确认弹窗（菜单项按下即关菜单，无法原地二次点击）。 */
  const handleConfirmDeleteFromMenu = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(app);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleMenuAction = (key: React.Key) => {
    switch (String(key)) {
      case "edit":
        handleOpenEditor();
        break;
      case "publish":
        void handlePublish();
        break;
      case "domains":
        setShowDomainPanel((prev) => !prev);
        break;
      case "delete":
        if (canDelete) setConfirmDeleteOpen(true);
        break;
      default:
        break;
    }
  };

  if (gallery) {
    return (
      <div
        className="AppCard AppCard--gallery"
        role={canOpenDetail ? "button" : undefined}
        tabIndex={canOpenDetail ? 0 : undefined}
        onClick={canOpenDetail ? handleOpenDetail : undefined}
        onKeyDown={handleBodyKeyDown}
      >
        <div className="AppCard__preview">
          <AppPreviewFrame url={accessUrl} title={app.name} />
        </div>

        <div className="AppCard__galleryMeta">
          <div className="AppCard__nameWrap">
            <ContentIcon icon={app.icon} fallback={LuLayoutGrid} size={18} />
            <div className="AppCard__name" title={app.name}>
              {app.name}
            </div>
          </div>
          <div className="AppCard__badges">
            {contextLabel && (
              <span className="AppCard__context">{contextLabel}</span>
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
          <div className="AppCard__galleryFoot">
            {app.modifiedOn && (
              <span className="AppCard__date">
                {t("appCard_updated_at", { date: formatDate(app.modifiedOn) })}
              </span>
            )}
            {accessUrl && (
              <span className="AppCard__url" title={accessUrl}>
                {accessUrl.replace(/^https?:\/\//, "")}
              </span>
            )}
          </div>
        </div>

        <div
          className="AppCard__actions AppCard__actions--gallery"
          onClick={(event) => event.stopPropagation()}
        >
          {accessUrl && (
            <Button
              variant="primary"
              size="small"
              className="AppCard__btn"
              icon={<LuExternalLink size={14} aria-hidden="true" />}
              onClick={handleOpenExternal}
            >
              {t("myApps_open")}
            </Button>
          )}
          <MenuTrigger>
            {/* 触发器必须是 react-aria 的可 press 组件：普通 <button> 不消费
                PressResponder，菜单会报 "PressResponder was rendered without a
                pressable child" 并且根本打不开。 */}
            <RacButton
              className="AppCard__moreBtn"
              aria-label={t("appCard_btn_more", "更多操作")}
            >
              <LuEllipsis size={15} aria-hidden="true" />
            </RacButton>
            <Menu onAction={handleMenuAction}>
              <MenuItem id="edit">
                {t("appEditor_chatMode_title", "对话编辑")}
              </MenuItem>
              {canPublish && (
                <MenuItem id="publish">
                  {publishing ? t("appCard_btn_publishing") : t("appCard_btn_publish")}
                </MenuItem>
              )}
              {canManageDomains && (
                <MenuItem id="domains">{t("appCard_btn_domains")}</MenuItem>
              )}
              {canDelete && (
                <MenuItem id="delete">{t("appCard_btn_delete")}</MenuItem>
              )}
            </Menu>
          </MenuTrigger>
        </div>

        {showDomainPanel && app.appId && onBindDomain && onUnbindDomain && onListDomains && (
          <div onClick={(event) => event.stopPropagation()}>
            <DomainBindingPanel
              appId={app.appId}
              onBind={(_appId, hostname) => onBindDomain(app, hostname)}
              onUnbind={(_appId, hostname) => onUnbindDomain(app, hostname)}
              onList={() => onListDomains(app)}
            />
          </div>
        )}

        <ConfirmModal
          isOpen={confirmDeleteOpen}
          onClose={() => {
            if (!deleting) setConfirmDeleteOpen(false);
          }}
          onConfirm={() => void handleConfirmDeleteFromMenu()}
          title={t("appCard_btn_delete")}
          message={t("appCard_delete_confirm", "确认删除该应用？删除后无法恢复。")}
          confirmText={t("appCard_btn_confirm_delete")}
          cancelText={t("myContentBatch.cancel", "取消")}
          type="error"
          loading={deleting}
          allowCancelWhileLoading={false}
        />
      </div>
    );
  }

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
          {t("appEditor_chatMode_title", "对话编辑")}
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
