// 用于 promotion 实测：无功能影响的注释变更（不改逻辑）
import React from "react";
import {
  LuEllipsis,
  LuExternalLink,
  LuMessageSquare,
  LuGlobe,
  LuLayoutGrid,
  LuLock,
  LuLink,
} from "react-icons/lu";
import { useNavigate } from "app/routing";
import { Button as RacButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import Button from "render/web/ui/Button";
import { Menu, MenuItem, MenuTrigger } from "render/web/ui/Menu";
import type { AppSummary, AppVisibility } from "app/types/appSummary";
import {
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import { useOpenAppEditorPanel } from "app/actions/openAppEditorPanel";
import { resolveAppRouteKey } from "app/utils/appKeys";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import AppPreviewFrame from "./AppPreviewFrame";
import ContentIcon from "render/contentIcon/ContentIcon";
import "./AppCard.css";

/**
 * 卡片只负责「展示 + 打开」。
 *
 * 管理职责（可见性切换、自定义域名、发布到社区、删除）已迁到 app 自身页面
 * （`app/pages/AppDetailPage.tsx` 的管理入口），这里不再接收也不再渲染任何
 * 写操作入口：卡片不持有 onShare / onDelete / onBindDomain 之类回调，因此
 * 也不可能出现「看起来能点、点了 403」的假按钮。
 */
interface AppCardProps {
  app: AppSummary;
  /**
   * 作品库布局（opt-in）：大图真实预览 + 名称/可见性/更新时间，次要操作收进
   * 「更多」菜单。默认关闭，既有调用方（列表视图）行为不变。
   */
  gallery?: boolean;
  contextLabel?: string;
  onOpenDetail?: () => void;
  onOpenEditor?: () => void;
}

function formatDate(iso?: string | number): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const AppCard: React.FC<AppCardProps> = ({
  app,
  gallery = false,
  contextLabel,
  onOpenDetail,
  onOpenEditor,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const openEditorPanel = useOpenAppEditorPanel();

  // 可见性徽标只读展示（服务端记录里的值）。切换入口在 app 页面，卡片不提供改值。
  const VISIBILITY_META: Record<AppVisibility, { icon: React.ReactNode; label: string; tip: string }> = {
    private: { icon: <LuLock size={13} aria-hidden="true" />, label: t("appCard_visibility_private_label"), tip: t("appCard_visibility_private_tip") },
    unlisted: { icon: <LuLink size={13} aria-hidden="true" />, label: t("appCard_visibility_unlisted_label"), tip: t("appCard_visibility_unlisted_tip") },
    public: { icon: <LuGlobe size={13} aria-hidden="true" />, label: t("appCard_visibility_public_label"), tip: t("appCard_visibility_public_tip") },
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
  const canOpenDetail = !!appRouteKey || !!onOpenDetail;

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

  const handleOpenExternal = () => {
    if (!accessUrl) return;
    window.open(accessUrl, "_blank", "noopener,noreferrer");
  };

  const handleMenuAction = (key: React.Key) => {
    switch (String(key)) {
      case "edit":
        handleOpenEditor();
        break;
      case "fullEditor":
        handleOpenFullEditor();
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
                data-visibility={vis}
              >
                {visInfo.icon}
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
            </Menu>
          </MenuTrigger>
        </div>
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
                data-visibility={vis}
              >
                {visInfo.icon}
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

      <div className="AppCard__actions">
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
      </div>
    </div>
  );
};

export default AppCard;
