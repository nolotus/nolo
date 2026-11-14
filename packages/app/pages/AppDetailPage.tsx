import "./AppDetailPage.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  buildAppChatEditorPath,
  readAppServerOrigin,
} from "app/constants/appEditor";
import {
  buildAppDetailTargetPath,
  isSameAppDetailTarget,
} from "app/constants/appDetailTarget";
import { useAppDetail } from "app/hooks/useAppDetail";
import { useMyAppActions } from "app/hooks/useMyApps";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { useUserId, useIsLoggedIn } from "identity";
import {
  LuMessagesSquare,
  LuEllipsisVertical,
  LuTrash2,
  LuExternalLink,
  LuShare2,
  LuRefreshCw,
  LuCode,
} from "react-icons/lu";
import { useAppVersions } from "app/hooks/useAppVersions";
import { useOpenAppEditorPanel } from "app/actions/openAppEditorPanel";
import { useShareWorkflow, type SharePayload, type ShareVisibility } from "render/layout/useShareWorkflow";
import ShareModal, { type AppShareScope } from "render/web/ui/modal/ShareModal";
import {
  describeAppRuntimeFailure,
  readAppRuntimeErrorText,
} from "app/pages/share/appShareTarget";
import { probeAppRuntime } from "app/pages/share/appRuntimeProbe";
import { buildAppSharePayload } from "app/utils/appSharePayload";
import PageObjectActions from "render/page/PageObjectActions";
import { useSidebarToggleContext } from "render/layout/SidebarToggleContext";


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
  // 预览能不能真跑起来：iframe 对 HTTP 层的 JSON 错误体既不会 onerror、
  // 也照样 onload，所以进 iframe 之前用同一个地址探一次（见 share/appRuntimeProbe）。
  const [runtimeFailure, setRuntimeFailure] = useState<{
    status?: number;
    errorText: string;
  } | null>(null);
  const runtimeProbeIdRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { deleteApp } = useMyAppActions({ setApps: () => {} });
  const searchParamsString = searchParams.toString();
  const buildDetailTarget = useCallback(
    (appKey: string) =>
      buildAppDetailTargetPath(appKey, searchParamsString, spaceId, routeServerOrigin),
    [routeServerOrigin, searchParamsString, spaceId]
  );
  // 详情页 URL 规范化：目标 URL 与当前 URL 等价时不写 history。
  // 少了这道判断，「读 URL → 按 URL 拼目标 → replace 写 URL」会在来源页参数
  // （如空间内容页的 ?types=app）被带进来时反复自我触发，表现为地址栏参数
  // 来回变动而页面不跳转。
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const gotoDetailTarget = useCallback(
    (appKey: string) => {
      const target = buildDetailTarget(appKey);
      if (isSameAppDetailTarget(target, currentPath)) return;
      navigate(target, { replace: true });
    },
    [buildDetailTarget, currentPath, navigate]
  );

  const primaryUrl = useMemo(
    () =>
      app
        ? resolvePreferredAppRuntimeUrl({
            appId: app.appId,
            customUrl: app.customUrl,
            url: app.url,
            versionServerOrigin: app.versionServerOrigin,
            serverOrigin: app.serverOrigin,
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
      gotoDetailTarget(legacyAppKey);
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    gotoDetailTarget(app.appKey);
  }, [app?.appKey, gotoDetailTarget, legacyAppKey, pageKey, routeAppKey]);

  useEffect(() => {
    const handler = () => void refetch();
    window.addEventListener("app-editor-refresh", handler);
    return () => window.removeEventListener("app-editor-refresh", handler);
  }, [refetch]);

  useEffect(() => {
    setFrameLoaded(false);
  }, [primaryUrl]);

  // 预览可用性探针：只探同源地址（跨域读不到响应体，交给 iframe 自己）。
  // 切换 app 时用递增 id 丢弃过期结果，避免把 A 失败态贴到 B 上。
  const runRuntimeProbe = useCallback(async () => {
    const probeId = ++runtimeProbeIdRef.current;
    if (!primaryUrl) {
      setRuntimeFailure(null);
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : null;
    const result = await probeAppRuntime(primaryUrl, { origin });
    if (probeId !== runtimeProbeIdRef.current) return;
    setRuntimeFailure(
      result.state === "failed"
        ? { status: result.status, errorText: result.errorText }
        : null
    );
  }, [primaryUrl]);

  useEffect(() => {
    void runRuntimeProbe();
  }, [runRuntimeProbe]);

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

  // 编辑入口按登录态显示（真正的写权限由编辑器页与服务端把关）；
  // 分享/发布只给 owner —— 信号是服务端下发的 canShare（review C1），
  // 不再用「有人登录」冒充 owner。
  const currentUserId = useUserId();
  const couldEdit = !!currentUserId && !!app;
  const canShare = Boolean(app?.canShare);
  // 分享面板的权限说明按 app 的真实可达范围给，判据是服务端下发的 reachability
  // （产品真值 A 轴，review HIGH-3）；不再由客户端拿 visibility/spaceId 自己推。
  const appShareScope: AppShareScope = app?.reachability ?? "owner";

  // 「编辑」= 滑出右侧对象助手面板（统一入口见 app/actions/openAppEditorPanel）：
  // 与顶栏「对象助手」是同一个 sidebar id，所以同一 app 只会有一个面板；
  // 拿不到右侧栏壳（裸渲染 / 没有 MainLayout）时退回整页编辑器，按钮不会点了没反应。
  const openEditorPanel = useOpenAppEditorPanel();
  const openAppAssistant = useCallback(() => {
    openEditorPanel(routeAppKey, () => {
      if (!routeAppKey) return;
      navigate(buildAppChatEditorPath(routeAppKey, spaceId, routeServerOrigin));
    });
  }, [navigate, openEditorPanel, routeAppKey, routeServerOrigin, spaceId]);

  // 加载中保留最终框架与标题位，值位置用灰条占位（数据到达时不产生布局跳动）。
  const awaitingApp = loading && !app;
  const titleText = app?.userFriendlyName ?? (awaitingApp ? "" : t("appDetail_titleFallback", "应用详情"));
  // 真实运行时信息（域名 + 框架）与标题同一行，12px 次要文字，不是装饰。
  const metaText = app ? [previewUrlLabel, app.framework].filter(Boolean).join(" · ") : "";

  // 失败态：记录读不到（useAppDetail 的 error）或运行时探针判失败，都走同一份人话文案。
  // 原始错误不丢：它只进「技术详情」，默认收起，不再整屏铺 JSON。
  const failureCopy = useMemo(
    () =>
      runtimeFailure || error
        ? describeAppRuntimeFailure(
            runtimeFailure
              ? { status: runtimeFailure.status, error: runtimeFailure.errorText }
              : { error }
          )
        : null,
    [error, runtimeFailure]
  );
  const failureDetail = useMemo(() => {
    if (runtimeFailure) {
      // 技术详情补一个可读标识：探针对 HTML/空响应体故意不给「假原文」，
      // 归因靠 status（review H3），这里才把它显示出来。
      return (
        runtimeFailure.errorText ||
        (typeof runtimeFailure.status === "number" ? `HTTP ${runtimeFailure.status}` : "")
      );
    }
    return error ? readAppRuntimeErrorText(error) : "";
  }, [error, runtimeFailure]);
  const previewFailed = Boolean(failureCopy);
  const retryPreview = useCallback(() => {
    setFrameLoaded(false);
    void refetch();
    void runRuntimeProbe();
  }, [refetch, runRuntimeProbe]);

  // 桌面壳自己的左侧栏已经带着「创建 + 账户」入口：Rail 里的 CreateMenuButton
  // （chat/web/NavigationRail.tsx:136-140）与 MainLayout 的 SidebarUserSection 兜底
  // （render/layout/MainLayout.tsx:763-767）。app 页又不显示对象动作
  // （render/page/PageObjectActions.tsx:28-31 `showObjectActions = contentKeyType !== "app"`），
  // 所以这一行在桌面上只剩一个创建按钮 + 16px padding —— 实测占掉 48px
  // （header.top 68 = padTop 20 + 48）。窄屏抽屉收起时它是唯一入口，游客的主题/
  // 语言/登录也只在这里，所以只在「桌面壳 + 已登录」时不渲染它。
  const sidebarToggle = useSidebarToggleContext();
  const isLoggedIn = useIsLoggedIn();
  const showPageObjectActions = !(sidebarToggle?.isDesktop && isLoggedIn);

  // 分享：与内容页顶栏同一套流程（render/layout/useShareWorkflow）；载荷构造与
  // AppCard「发布到社区」共用一份（app/utils/appSharePayload），字段不会漂。
  // 分享落地页（ShareImportPage → share/AppSharePreview）靠 data.url 才能「打开应用」，
  // 所以没有访问地址时不分享。
  const buildSharePayload = useCallback(
    (_visibility: ShareVisibility): SharePayload | null =>
      buildAppSharePayload({
        appId: app?.appId,
        appKey: app?.appKey ?? routeAppKey,
        name: app?.userFriendlyName,
        url: primaryUrl,
      }),
    [app?.appId, app?.appKey, app?.userFriendlyName, primaryUrl, routeAppKey]
  );
  const {
    isShareModalOpen,
    shareModalLink,
    shareModalVisibility,
    isShareModalLoading,
    shareModalCopied,
    shareError,
    setIsShareModalOpen,
    handleOpenShare,
    handlePublishCommunity,
  } = useShareWorkflow(buildSharePayload);

  if (!routeAppKey) {
    return (
      <div className="AppDetailPage__status">
        {t("appDetail_missingId")}
      </div>
    );
  }

  return (
    <div className="AppDetailPage">
      {showPageObjectActions && <PageObjectActions />}

      <header className="AppDetailPage__header">
        <div className="AppDetailPage__headerText">
          <h1 className="AppDetailPage__title">
            {titleText ? titleText : <span className="AppDetailPage__skeleton AppDetailPage__skeleton--title" />}
          </h1>
          <span className="AppDetailPage__meta">
            {metaText ? (
              metaText
            ) : awaitingApp ? (
              <span className="AppDetailPage__skeleton AppDetailPage__skeleton--meta" />
            ) : null}
          </span>
        </div>
        <div className="AppDetailPage__actions">
          {canShare && (
            <button
              type="button"
              className="AppDetailPage__secondaryBtn"
              onClick={() => void handleOpenShare()}
              disabled={!primaryUrl || isShareModalLoading}
              title={
                primaryUrl
                  ? t("share", "分享")
                  : t("appDetail_shareUnavailable", "应用还没有可分享的访问地址")
              }
              aria-label={t("share", "分享")}
            >
              <LuShare2 size={16} aria-hidden="true" />
              <span>{t("share", "分享")}</span>
            </button>
          )}
          {primaryUrl && !previewFailed ? (
            <a
              className="AppDetailPage__primaryBtn"
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuExternalLink size={14} aria-hidden="true" />
              <span>{t("appDetail_openPreview", "打开预览")}</span>
            </a>
          ) : (
            // 失败态不再给「打开预览」（点开只会看到同一段错误），但保留同宽占位，
            // 页头不跳版；整屏只留预览块里的那一个主按钮。
            <span
              className="AppDetailPage__primaryBtn AppDetailPage__primaryBtn--placeholder"
              aria-hidden="true"
            />
          )}
          {couldEdit && (
            <>
              <button
                type="button"
                className="AppDetailPage__iconBtn"
                title={t("edit", "编辑")}
                aria-label={t("edit", "编辑")}
                onClick={openAppAssistant}
              >
                <LuMessagesSquare size={16} aria-hidden="true" />
              </button>
              <div className="AppDetailPage__menuWrap" ref={menuRef}>
                <button
                  type="button"
                  className="AppDetailPage__iconBtn"
                  title={t("moreActions", "更多操作")}
                  aria-label={t("moreActions", "更多操作")}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <LuEllipsisVertical size={16} aria-hidden="true" />
                </button>
                {menuOpen && (
                  <div className="AppDetailPage__menu">
                    <button
                      type="button"
                      className="AppDetailPage__menuItem"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(buildAppChatEditorPath(routeAppKey, spaceId, routeServerOrigin));
                      }}
                    >
                      <LuExternalLink size={16} aria-hidden="true" />
                      {t("appDetail_openFullEditor", "打开完整编辑器")}
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
            </>
          )}
        </div>
      </header>

      <section className="AppDetailPage__preview" aria-busy={awaitingApp || undefined}>
        {failureCopy ? (
          // 失败态只落在预览块内：一句人话 + 一个主操作 +（能编辑时）修复入口；
          // 原始错误收进默认收起的「技术详情」，不整屏铺 JSON，也不抢页头。
          <div className="AppDetailPage__previewPanel AppDetailPage__previewPanel--notice">
            <div className="AppDetailPage__failure">
              <p className="AppDetailPage__previewNotice">{failureCopy.message}</p>
              <div className="AppDetailPage__failureActions">
                {failureCopy.retryable ? (
                  <button
                    type="button"
                    className="AppDetailPage__primaryBtn"
                    onClick={retryPreview}
                  >
                    <LuRefreshCw size={16} aria-hidden="true" />
                    <span>{t("retry", "重试")}</span>
                  </button>
                ) : (
                  couldEdit &&
                  failureCopy.fixable && (
                    <button
                      type="button"
                      className="AppDetailPage__primaryBtn"
                      onClick={openAppAssistant}
                    >
                      <LuCode size={16} aria-hidden="true" />
                      <span>{t("appDetail_fixCode", "修复代码（高级）")}</span>
                    </button>
                  )
                )}
                {failureCopy.retryable && couldEdit && failureCopy.fixable && (
                  <button
                    type="button"
                    className="AppDetailPage__secondaryBtn"
                    onClick={openAppAssistant}
                  >
                    <LuCode size={16} aria-hidden="true" />
                    <span>{t("appDetail_fixCode", "修复代码（高级）")}</span>
                  </button>
                )}
              </div>
              {failureDetail && (
                <details className="AppDetailPage__techDetails">
                  <summary className="AppDetailPage__techDetailsToggle">
                    {t("appDetail_techDetails", "技术详情")}
                  </summary>
                  <pre className="AppDetailPage__techDetailsBody">{failureDetail}</pre>
                </details>
              )}
            </div>
          </div>
        ) : primaryUrl ? (
          <div className="AppDetailPage__previewPanel" ref={previewViewportRef}>
            {!frameLoaded && (
              <span className="AppDetailPage__frameStatus">
                {t("loading", "加载中...")}
              </span>
            )}
            <iframe
              title={app?.userFriendlyName ?? "App Preview"}
              src={primaryUrl}
              className="AppDetailPage__frame"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              onLoad={() => setFrameLoaded(true)}
            />
          </div>
        ) : (
          // 预览还没落地：保留同样的框与高度，里面是灰块，不留文字噪声。
          <div className="AppDetailPage__previewPanel">
            <span className="AppDetailPage__skeleton AppDetailPage__skeleton--preview" />
          </div>
        )}
      </section>

      {couldEdit && app && (
        <AppVersionsFooter appId={app.appId} serverOrigin={routeServerOrigin} />
      )}

      {canShare && (
        <ShareModal
          isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        webLink={shareModalLink}
        isLoading={isShareModalLoading}
        isCommunity={shareModalVisibility === "community"}
        initialCopied={shareModalCopied}
        onPublishCommunity={handlePublishCommunity}
        errorMessage={shareError}
          onRetry={handleOpenShare}
        itemType="app"
          appScope={appShareScope}
        />
      )}
    </div>
  );
};

export default AppDetailPage;

/**
 * 版本区的紧凑页脚条：静止态只占一行（48px），预览因此能吃掉剩余高度；
 * 展开的列表是锚在页脚条上方的浮层（内部滚动），关闭后页面回到单滚动条。
 */
const AppVersionsFooter: React.FC<{ appId: string; serverOrigin?: string | null }> = ({
  appId,
  serverOrigin,
}) => {
  const { t } = useTranslation();
  const { versions, loading, error } = useAppVersions(appId, serverOrigin);
  const [open, setOpen] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const latest = versions[0];
  const latestId = latest?.versionId ? latest.versionId.slice(-12) : "";
  const latestAt = latest?.createdAt ? new Date(latest.createdAt).toLocaleString() : "";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const summary = loading
    ? t("loading", "加载中...")
    : error
      ? error
      : !versions.length
        ? t("noVersions", "暂无版本")
        : [
            latestId ? `${t("appDetail_latestVersion", "最新")} ${latestId}` : "",
            latestAt,
            t("appDetail_versionCount", "共 {{count}} 个", { count: versions.length }),
          ]
            .filter(Boolean)
            .join(" · ");

  return (
    <section className="AppDetailPage__versions" ref={footerRef}>
      <div className="AppDetailPage__versionBar">
        <span className="AppDetailPage__versionLabel">{t("appDetail_versions", "版本")}</span>
        <span
          className={`AppDetailPage__versionSummary${error ? " AppDetailPage__versionSummary--error" : ""}`}
        >
          {summary}
        </span>
        {versions.length > 0 && (
          <button
            type="button"
            className="AppDetailPage__versionToggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("collapse", "收起") : t("expand", "展开")}
          </button>
        )}
      </div>

      {open && versions.length > 0 && (
        <div className="AppDetailPage__versionPanel">
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
        </div>
      )}
    </section>
  );
};
