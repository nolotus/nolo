import "./AppDetailPage.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  buildAppDetailPath,
  buildAppChatEditorPath,
  buildAppCodeEditorPath,
  readAppServerOrigin,
} from "app/constants/appEditor";
import { useAppDetail } from "app/hooks/useAppDetail";
import { useMyAppActions } from "app/hooks/useMyApps";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { useUserId } from "identity";
import { LuMessagesSquare, LuEllipsisVertical, LuHistory, LuTrash2 } from "react-icons/lu";
import { useAppVersions } from "app/hooks/useAppVersions";


const AppDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    pageKey,
    appKey: legacyAppKey,
    spaceId,
  } = useParams<"pageKey" | "appKey" | "spaceId">();
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : legacyAppKey;
  const routeServerOrigin = readAppServerOrigin(searchParams);
  const { app, loading, error, refetch } = useAppDetail(routeAppKey, {
    serverOrigin: routeServerOrigin,
  });
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { deleteApp } = useMyAppActions({ setApps: () => {} });
  const searchParamsString = searchParams.toString();
  const buildDetailTarget = useCallback((appKey: string) => {
    if (!searchParamsString) {
      return buildAppDetailPath(appKey, spaceId, routeServerOrigin);
    }
    const url = new URL(
      buildAppDetailPath(appKey, spaceId, routeServerOrigin),
      typeof window !== "undefined" ? window.location.origin : "https://nolo.local"
    );
    const params = new URLSearchParams(searchParamsString);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }, [routeServerOrigin, searchParamsString, spaceId]);

  const primaryUrl = useMemo(
    () =>
      app
        ? resolvePreferredAppRuntimeUrl({
            appId: app.appId,
            customUrl: app.customUrl,
            url: app.url,
          })
        : "",
    [app]
  );
  const previewUrlLabel = useMemo(() => {
    if (!primaryUrl) return "";
    try {
      const parsedUrl = new URL(primaryUrl);
      return `${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/$/, "") || parsedUrl.host;
    } catch {
      return primaryUrl.replace(/^https?:\/\//, "");
    }
  }, [primaryUrl]);
  useEffect(() => {
    if (legacyAppKey && !pageKey) {
      navigate(buildDetailTarget(legacyAppKey), { replace: true });
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    navigate(buildDetailTarget(app.appKey), { replace: true });
  }, [app?.appKey, buildDetailTarget, legacyAppKey, navigate, pageKey, routeAppKey]);

  useEffect(() => {
    const handler = () => void refetch();
    window.addEventListener("app-editor-refresh", handler);
    return () => window.removeEventListener("app-editor-refresh", handler);
  }, [refetch]);

  useEffect(() => {
    setFrameLoaded(false);
  }, [primaryUrl]);

  // 点击外部关闭三点菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDelete = useCallback(async () => {
    if (!app) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await deleteApp({
      name: app.userFriendlyName,
      appId: app.appId,
      appKey: app.appKey ?? "",
      serverOrigin: routeServerOrigin ?? undefined,
    });
    setDeleting(false);
    setConfirmDelete(false);
    navigate("/");
  }, [app, confirmDelete, deleteApp, navigate, routeServerOrigin]);

  // 真正的写权限由编辑器页把关；这里只按登录态 + app 已加载显示入口。
  // app.userId 由 useAppDetail 设为当前用户，不是可靠 owner 信号，故不用它判断。
  const currentUserId = useUserId();
  const couldEdit = !!currentUserId && !!app;

  if (!routeAppKey) {
    return (
      <div className="AppDetailPage__status">
        {t("appDetail_missingId")}
        
      </div>
    );
  }

  return (
    <div className="AppDetailPage">
      {loading && !app ? (
        <div className="AppDetailPage__status">{t("loading", "加载中...")}</div>
      ) : error ? (
        <div className="AppDetailPage__status AppDetailPage__status--error">
          <span>{error}</span>
        </div>
      ) : (
        <section className="AppDetailPage__previewSection">
          <div className="AppDetailPage__previewCard">
            {primaryUrl ? (
              <div
                ref={previewViewportRef}
                className="AppDetailPage__frameWrap"
              >
                {!frameLoaded && (
                  <div className="AppDetailPage__loadingOverlay">
                    {t("loading", "加载中...")}
                  </div>
                )}

                  <div
                    className="AppDetailPage__browserShell"
                  >
                    <div className="AppDetailPage__browserBar">
                      <div className="AppDetailPage__browserDots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="AppDetailPage__browserUrl">
                        {previewUrlLabel}
                      </div>
                      <div className="AppDetailPage__browserBadge">
                        {app?.framework ?? "app"}
                      </div>
                      {couldEdit && (
                        <div className="AppDetailPage__topbarActions">
                          <button
                            type="button"
                            className="AppDetailPage__topbarBtn"
                            title={t("edit", "编辑")}
                            onClick={() => {
                              navigate(buildAppChatEditorPath(routeAppKey!, spaceId, routeServerOrigin));
                            }}
                          >
                            <LuMessagesSquare size={18} aria-hidden="true" />
                          </button>
                          <div className="AppDetailPage__menuWrap" ref={menuRef}>
                            <button
                              type="button"
                              className="AppDetailPage__topbarBtn"
                              title={t("moreActions", "更多操作")}
                              onClick={() => setMenuOpen((v) => !v)}
                            >
                              <LuEllipsisVertical size={18} aria-hidden="true" />
                            </button>
                            {menuOpen && (
                              <div className="AppDetailPage__menu">
                                <button
                                  type="button"
                                  className="AppDetailPage__menuItem"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    setShowVersions(true);
                                  }}
                                >
                                  <LuHistory size={16} aria-hidden="true" />
                                  {t("versionManagement", "版本管理")}
                                </button>
                                <button
                                  type="button"
                                  className="AppDetailPage__menuItem AppDetailPage__menuItem--danger"
                                  onClick={handleDelete}
                                  disabled={deleting}
                                >
                                  <LuTrash2 size={16} aria-hidden="true" />
                                  {confirmDelete
                                    ? t("confirmDelete", "再次点击确认删除")
                                    : t("delete", "删除")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <iframe
                      title={app?.userFriendlyName ?? "App Preview"}
                      src={primaryUrl}
                      className="AppDetailPage__frame"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                      onLoad={() => setFrameLoaded(true)}
                    />
                  </div>
              </div>
            ) : (
              <div className="AppDetailPage__status">
                {t("appDetail_preview_unavailable")}
              </div>
            )}
          </div>
        </section>
      )}

      {couldEdit && showVersions && app && (
        <div className="AppDetailPage__modalOverlay" onClick={() => setShowVersions(false)}>
          <div className="AppDetailPage__modal" onClick={(e) => e.stopPropagation()}>
            <div className="AppDetailPage__modalHeader">
              <h3>{t("versionManagement", "版本管理")}</h3>
              <button
                type="button"
                className="AppDetailPage__modalClose"
                onClick={() => setShowVersions(false)}
              >
                ✕
              </button>
            </div>
            <AppVersionList appId={app.appId} serverOrigin={routeServerOrigin} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppDetailPage;

const AppVersionList: React.FC<{ appId: string; serverOrigin?: string | null }> = ({
  appId,
  serverOrigin,
}) => {
  const { t } = useTranslation();
  const { versions, loading, error } = useAppVersions(appId, serverOrigin);

  if (loading) {
    return <div className="AppDetailPage__versionStatus">{t("loading", "加载中...")}</div>;
  }
  if (error) {
    return <div className="AppDetailPage__versionStatus AppDetailPage__versionStatus--error">{error}</div>;
  }
  if (!versions.length) {
    return <div className="AppDetailPage__versionStatus">{t("noVersions", "暂无版本")}</div>;
  }

  return (
    <div className="AppDetailPage__versionList">
      {versions.map((v) => (
        <div key={v.versionId} className="AppDetailPage__versionItem">
          <div className="AppDetailPage__versionInfo">
            <span className="AppDetailPage__versionId">{v.versionId.slice(-12)}</span>
            <span className="AppDetailPage__versionDate">
              {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
            </span>
            {v.pinned && <span className="AppDetailPage__versionPinned">📌</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
