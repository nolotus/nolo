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
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId } from "identity";
import { toast } from "app/utils/toast";
import { copyTextToClipboard } from "app/utils/clipboard";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { buildAppSharePayload } from "app/utils/appSharePayload";
import {
  currentWindowOrigin,
  runShare,
} from "render/layout/shareWorkflowCore";
import Button from "render/web/ui/Button";
import { Menu, MenuItem, MenuTrigger } from "render/web/ui/Menu";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import type { AppSummary, AppVisibility, CustomDomain } from "app/types/appSummary";
import {
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import { useOpenAppEditorPanel } from "app/actions/openAppEditorPanel";
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
  const { currentServer } = useAppSelector(selectRuntimeSnapshot);
  const currentUserId = useUserId();
  const openEditorPanel = useOpenAppEditorPanel();
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
  // 「发布到社区」只给 app 的 owner：owner 来自记录里的 userId（服务端真值，见
  // app/types/appSummary.ts 的 toAppSummary），不是客户端推测。非 owner 直接不渲染，
  // 不给「看起来能点、点了 403」的假按钮（review 假按钮）。
  const isOwner = !!app.ownerUserId && app.ownerUserId === currentUserId;
  const canPublish = isManageMode && isOwner && !!app.appId && !!accessUrl;
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
    if (!appRouteKey) return;
    // 编辑 = 滑出右侧对象助手面板（与详情页 / 顶栏对象助手同一个 sidebar id）；
    // 卡片被渲染在没有右侧栏壳的环境时退回原来的整页编辑器路径。
    openEditorPanel(appRouteKey, () =>
      navigate(buildAppEditorPath(appRouteKey, app.spaceId, app.serverOrigin))
    );
  };

  // 「完整编辑器」是显式退路（?edit=true&mode=chat，code 模式与 inspector 走它）。
  const handleOpenFullEditor = () => {
    if (!appRouteKey) return;
    navigate(buildAppEditorPath(appRouteKey, app.spaceId, app.serverOrigin));
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
    // 与详情页「分享」共用同一份载荷构造 + 同一个分发点（render/layout/shareWorkflowCore），
    // 不再自己拼 share({...})：字段一漂移，分享落地页就读不到运行地址/appKey。
    const payload = buildAppSharePayload({
      appId: app.appId,
      appKey: app.appKey,
      name: app.name,
      url: accessUrl,
    });
    if (!payload || publishing) return;
    setPublishing(true);
    try {
      const { webLink } = await runShare({
        dispatch: dispatch as unknown as Parameters<typeof runShare>[0]["dispatch"],
        payload,
        visibility: "community",
        server: currentServer,
        windowOrigin: currentWindowOrigin(),
      });
      // 与 useShareWorkflow 的 community 分支一致：链接进剪贴板 + 同一句成功提示。
      try {
        await copyTextToClipboard(webLink);
        toast.success(t("sharePublished", "已分享到社区，链接已复制"));
      } catch {
        toast.success(
          `${t("shareCopyFailed", "复制链接失败，请手动复制")}: ${webLink}`,
          { duration: 8000 }
        );
      }
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
      case "fullEditor":
        handleOpenFullEditor();
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
              <MenuItem id="fullEditor">
                {t("appEditor_openFullEditor", "打开完整编辑器")}
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
        <Button
          variant="secondary"
          className="AppCard__btn"
          icon={<LuExternalLink size={14} aria-hidden="true" />}
          onClick={handleOpenFullEditor}
          disabled={!appRouteKey}
          title={t("appEditor_openFullEditor", "打开完整编辑器")}
          aria-label={t("appEditor_openFullEditor", "打开完整编辑器")}
        />
        {canPublish && (
          <Button
            variant="secondary"
            className="AppCard__btn AppCard__btn--publish"
            icon={<LuShare2 size={16} aria-hidden="true" />}
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
