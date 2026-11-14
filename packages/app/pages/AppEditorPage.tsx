import "./AppEditorPage.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "app/routing";
import { toast } from "app/utils/toast";
import {
  LuArrowLeft,
  LuBot,
  LuEllipsisVertical,
  LuExternalLink,
  LuFileCode2,
  LuLayoutGrid,
  LuMousePointerClick,
  LuRefreshCw,
  LuSave,
  LuTriangleAlert,
} from "react-icons/lu";
import { useAppDetail } from "app/hooks/useAppDetail";
import {
  buildAppAssistantSidebarId,
  buildAppDetailPath,
  buildAppEditorPath,
  readAppServerOrigin,
} from "app/constants/appEditor";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { useRightSidebarOptional } from "render/layout/RightSidebarContext";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import {
  DEFAULT_APP_EDITOR_VIEW,
  resolveAppEditorEntry,
  type AppEditorView,
} from "./appEditorMode";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import {
  setInspecting,
  setSelectedNode,
  useAppInspecting,
} from "app/appInspector/appInspectorStore";
import { installInspector } from "app/appInspector/installInspector";
import { patch } from "database/dbSlice";
import ContentIcon from "render/contentIcon/ContentIcon";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import PageObjectActions from "render/page/PageObjectActions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface DeployStartResult {
  success: boolean;
  jobId?: string;
  summary?: string;
}

interface DeployStatusResult {
  success: boolean;
  status?: "pending" | "running" | "succeeded" | "failed";
  summary?: string;
  result?: {
    appKey?: string;
    modifiedOn?: string;
    url?: string;
    customUrl?: string;
  };
  error?: {
    message?: string;
  };
}

type PendingConfirm = "leave" | "discardCode";

/**
 * app 编辑页。目标群体是爱好者：一屏只回答「这个 app 现在长什么样、我要怎么改它」。
 *
 * - 主块永远是**预览**，吃满页头以下的剩余高度。
 * - 改 app 的主要方式是**和助手对话**（右侧滑出面板，与 TopBar 的对象助手同一个）。
 * - **代码编辑是急救通道**：入口藏在「更多」菜单里（「修复代码（高级）」），
 *   不占首屏、不做并列视图、不记忆上次进过代码视图——进来永远是预览。
 * - 每屏最多一个主按钮；其余是图标按钮或菜单项，文案用用户语言。
 */
const AppEditorPage: React.FC = () => {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const rightSidebar = useRightSidebarOptional();
  const {
    pageKey,
    appKey: legacyAppKey,
    spaceId,
  } = useParams<"pageKey" | "appKey" | "spaceId">();

  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : legacyAppKey;
  const routeServerOrigin = readAppServerOrigin(searchParams);

  // 视图只活在本页面里：进入编辑器恒为预览，不读 URL、不记忆上次的代码视图。
  const [view, setView] = useState<AppEditorView>(DEFAULT_APP_EDITOR_VIEW);
  const searchKey = searchParams.toString();
  const needsUrlCleanup = useMemo(() => resolveAppEditorEntry(searchKey), [searchKey]);

  const { app, loading, error, refetch } = useAppDetail(routeAppKey, {
    prepareEdit: true,
    serverOrigin: routeServerOrigin,
  });

  const previewUrl = useMemo(
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

  const appServerOrigin = app?.serverOrigin ?? routeServerOrigin;

  const isInspecting = useAppInspecting();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);
  const unmountInspectorRef = useRef<(() => void) | null>(null);
  const [canInspect, setCanInspect] = useState(true);

  // 换 app —— 或者重新进入编辑器 —— 都回到预览（不做视图记忆）。
  useEffect(() => {
    setView(DEFAULT_APP_EDITOR_VIEW);
    setInspecting(false);
    if (unmountInspectorRef.current) {
      unmountInspectorRef.current();
      unmountInspectorRef.current = null;
    }
  }, [routeAppKey]);

  // 历史链接里的视图参数一律清掉，让地址栏和屏幕说同一件事。
  useEffect(() => {
    if (!needsUrlCleanup || !routeAppKey) return;
    navigate(buildAppEditorPath(routeAppKey, spaceId, appServerOrigin), { replace: true });
  }, [appServerOrigin, needsUrlCleanup, navigate, routeAppKey, spaceId]);

  // 别名路由（/space/:spaceId/:appKey）与 dbKey 修正。
  useEffect(() => {
    if (legacyAppKey && !pageKey) {
      navigate(buildAppEditorPath(legacyAppKey, spaceId, appServerOrigin), { replace: true });
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    navigate(buildAppEditorPath(app.appKey, spaceId, appServerOrigin), { replace: true });
  }, [app?.appKey, appServerOrigin, legacyAppKey, navigate, pageKey, routeAppKey, spaceId]);

  // Inspector setup/teardown logic
  const handleInspectToggle = useCallback(() => {
    if (!app?.appKey) return;
    if (isInspecting) {
      setInspecting(false);
      if (unmountInspectorRef.current) {
        unmountInspectorRef.current();
        unmountInspectorRef.current = null;
      }
    } else {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) {
        setCanInspect(false);
        return;
      }
      try {
        // Test access to catch cross-origin issues
        const testAccess = iframeDoc.body;
        if (!testAccess) throw new Error("No body");
        setCanInspect(true);
        setInspecting(true);

        unmountInspectorRef.current = installInspector(iframeDoc, (node) => {
          setSelectedNode({ appKey: app.appKey!, node });
          setInspecting(false);
          if (unmountInspectorRef.current) {
            unmountInspectorRef.current();
            unmountInspectorRef.current = null;
          }
        });
      } catch (e) {
        setCanInspect(false);
      }
    }
  }, [isInspecting, app?.appKey]);

  useEffect(() => {
    return () => {
      setInspecting(false);
      if (unmountInspectorRef.current) {
        unmountInspectorRef.current();
        unmountInspectorRef.current = null;
      }
    };
  }, []);

  const sourceFiles = useMemo(() => {
    if (Array.isArray(app?.files) && app.files.length > 0) {
      return app.files.map((file) => ({ ...file }));
    }
    if (app?.code) {
      return [{ name: "worker.ts", code: app.code }];
    }
    return [];
  }, [app]);

  const [iframeNonce, setIframeNonce] = useState(0);
  useEffect(() => {
    const handler = () => {
      setIframeNonce((prev) => prev + 1);
    };
    window.addEventListener("app-editor-refresh", handler);
    return () => window.removeEventListener("app-editor-refresh", handler);
  }, []);

  const [draftFiles, setDraftFiles] = useState<Array<{ name: string; code: string }>>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftFiles(sourceFiles);
    setSelectedFileName((prev) => {
      if (prev && sourceFiles.some((file) => file.name === prev)) return prev;
      return sourceFiles[0]?.name ?? null;
    });
    setSaveMessage(null);
    setSaveError(null);
  }, [sourceFiles]);

  const selectedFile = useMemo(() => {
    if (draftFiles.length === 0) return null;
    return draftFiles.find((file) => file.name === selectedFileName) ?? draftFiles[0];
  }, [draftFiles, selectedFileName]);

  const hasDraftChanges = useMemo(() => {
    if (draftFiles.length !== sourceFiles.length) return true;
    return draftFiles.some(
      (file, index) =>
        file.name !== sourceFiles[index]?.name || file.code !== sourceFiles[index]?.code
    );
  }, [draftFiles, sourceFiles]);

  const handleSelectedFileChange = useCallback(
    (nextCode: string) => {
      setDraftFiles((current) =>
        current.map((file) =>
          file.name === selectedFile?.name ? { ...file, code: nextCode } : file
        )
      );
    },
    [selectedFile?.name]
  );

  /** 代码区左侧行号：与 textarea 的字体/行高/内边距一致，滚动时同步。 */
  const lineNumbers = useMemo(() => {
    const count = (selectedFile?.code ?? "").split("\n").length;
    return Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  }, [selectedFile?.code]);

  const handleEditorScroll = useCallback(() => {
    if (gutterRef.current && editorRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  const handleResetDrafts = useCallback(() => {
    setDraftFiles(sourceFiles);
    setSaveError(null);
    setSaveMessage(null);
  }, [sourceFiles]);

  const handleAppIconSelect = useCallback(async (nextIcon: ContentIconValue | null) => {
    if (!routeAppKey) return;
    setIsIconPickerOpen(false);
    try {
      await dispatch(
        patch({
          dbKey: routeAppKey,
          changes: {
            icon: nextIcon,
            updatedAt: new Date().toISOString(),
          },
          preferredServerOrigin: appServerOrigin,
        }) as any
      ).unwrap();
      await refetch();
      window.dispatchEvent(new Event("nolo-user-data-updated"));
    } catch {
      toast.error(t("appEditor_updateIconFailed", "更新应用图标失败"));
    }
  }, [appServerOrigin, dispatch, refetch, routeAppKey, t]);

  useClickOutsideMenu(isMenuOpen, menuRef, () => setIsMenuOpen(false));

  const assistantSidebarId = routeAppKey ? buildAppAssistantSidebarId(routeAppKey) : "";
  const isAssistantOpen =
    !!rightSidebar?.isOpen && !!assistantSidebarId && rightSidebar?.currentId === assistantSidebarId;

  const handleToggleAssistant = useCallback(() => {
    if (!rightSidebar || !routeAppKey) return;
    if (isAssistantOpen) {
      rightSidebar.close();
      return;
    }
    openObjectAssistantSidebar(rightSidebar.open, {
      kind: "app",
      contentKey: routeAppKey,
      sidebarId: assistantSidebarId,
    });
  }, [assistantSidebarId, isAssistantOpen, rightSidebar, routeAppKey]);

  const goBackToDetail = useCallback(() => {
    if (!routeAppKey) return;
    navigate(buildAppDetailPath(routeAppKey, spaceId, appServerOrigin));
  }, [appServerOrigin, navigate, routeAppKey, spaceId]);

  // dirty 时不静默丢改动：先确认一次再离开。
  const handleLeaveEditor = useCallback(() => {
    if (hasDraftChanges) {
      setPendingConfirm("leave");
      return;
    }
    goBackToDetail();
  }, [goBackToDetail, hasDraftChanges]);

  const handleDiscardCode = useCallback(() => {
    setPendingConfirm("discardCode");
  }, []);

  const handleSaveCode = useCallback(async () => {
    if (!app?.appId) {
      setSaveError(
        t("appEditor_codeMode_missingAppId", "当前应用缺少 appId，暂时无法直接保存源码。")
      );
      return;
    }
    if (!currentToken) {
      setSaveError(t("appEditor_codeMode_missingToken", "当前登录态失效，请重新登录后再试。"));
      return;
    }

    const targetServer = (appServerOrigin ?? currentServer ?? "").trim();
    if (!targetServer) {
      setSaveError(t("appEditor_codeMode_missingServer", "当前无法确定部署服务器地址。"));
      return;
    }

    const payload =
      Array.isArray(app.files) && app.files.length > 0
        ? {
            appId: app.appId,
            name: app.userFriendlyName,
            framework: app.framework ?? "react-spa",
            files: draftFiles,
          }
        : {
            appId: app.appId,
            name: app.userFriendlyName,
            framework: app.framework ?? "worker",
            code: draftFiles[0]?.code ?? app.code ?? "",
          };

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(t("appEditor_codeMode_saving", "正在预检并保存源码…"));

    try {
      const startResponse = await fetch(`${targetServer}/api/app/deploy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const startJson = (await startResponse.json().catch(() => null)) as DeployStartResult | null;
      if (!startResponse.ok || !startJson?.success || !startJson.jobId) {
        throw new Error(
          startJson?.summary ??
            t("appEditor_codeMode_startFailed", "代码保存请求失败，请稍后重试。")
        );
      }

      let finalSummary = startJson.summary;
      let finished = false;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await sleep(1000);
        const statusResponse = await fetch(`${targetServer}/api/app/deploy/status`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId: startJson.jobId }),
        });
        const statusJson = (await statusResponse.json().catch(() => null)) as DeployStatusResult | null;
        if (!statusResponse.ok || !statusJson?.success) {
          throw new Error(
            statusJson?.summary ??
              t("appEditor_codeMode_statusFailed", "保存状态查询失败，请稍后重试。")
          );
        }

        finalSummary = statusJson.summary ?? finalSummary;
        setSaveMessage(finalSummary ?? t("appEditor_codeMode_saving", "正在预检并保存源码…"));

        if (statusJson.status === "failed") {
          throw new Error(
            statusJson?.error?.message ??
              statusJson.summary ??
              t("appEditor_codeMode_failed", "源码保存失败，请检查代码后重试。")
          );
        }

        if (statusJson.status === "succeeded") {
          finished = true;
          break;
        }
      }

      if (!finished) {
        throw new Error(
          t("appEditor_codeMode_timeout", "源码保存超时了，请稍后刷新确认是否已完成。")
        );
      }

      await refetch();
      window.dispatchEvent(new CustomEvent("app-editor-refresh"));
      setSaveMessage(t("appEditor_codeMode_saved", "源码已保存并重新部署。"));
      toast.success(t("appEditor_codeMode_saved", "源码已保存并重新部署。"));
    } catch (saveErr: any) {
      const message =
        saveErr?.message ??
        t("appEditor_codeMode_failed", "源码保存失败，请检查代码后重试。");
      setSaveError(message);
      setSaveMessage(null);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    app?.appId,
    app?.code,
    app?.files,
    app?.framework,
    app?.userFriendlyName,
    appServerOrigin,
    currentServer,
    currentToken,
    draftFiles,
    refetch,
    t,
  ]);

  if (!routeAppKey) {
    return (
      <div className="AppEditorPage__status">
        {t("appEditor_missingId", "缺少应用标识")}
      </div>
    );
  }

  const isCodeView = view === "code";
  const showPrimarySave = isCodeView || hasDraftChanges;

  return (
    <div className="AppEditorPage" data-view={view}>
      <PageObjectActions />
      {loading && !app ? (
        <div className="AppEditorPage__status">{t("appEditor_loading", "正在加载应用…")}</div>
      ) : error ? (
        <div className="AppEditorPage__status AppEditorPage__status--error">
          <span>{error}</span>
          <button type="button" className="AppEditorPage__back" onClick={() => void refetch()}>
            <LuRefreshCw size={16} aria-hidden="true" />
            <span>{t("appEditor_retry", "重试")}</span>
          </button>
        </div>
      ) : app ? (
        <>
          {/* 一条页头：返回 / 图标+标题 / 一个主按钮 + 更多菜单。 */}
          <header className="AppEditorPage__header">
            {isCodeView ? (
              <button
                type="button"
                className="AppEditorPage__back"
                onClick={() => setView(DEFAULT_APP_EDITOR_VIEW)}
                aria-label={t("appEditor_backToPreview", "返回预览")}
              >
                <LuArrowLeft size={16} aria-hidden="true" />
                <span>{t("appEditor_backToPreview", "返回预览")}</span>
              </button>
            ) : (
              <button
                type="button"
                className="AppEditorPage__back"
                onClick={handleLeaveEditor}
                aria-label={t("appEditor_backToApp", "返回应用")}
              >
                <LuArrowLeft size={16} aria-hidden="true" />
                <span>{t("appEditor_backToApp", "返回应用")}</span>
              </button>
            )}

            <div className="AppEditorPage__titleGroup">
              <span className="AppEditorPage__iconMark" aria-hidden="true">
                <ContentIcon icon={app.icon} fallback={LuLayoutGrid} size={24} />
              </span>
              <h1 className="AppEditorPage__title" title={app.userFriendlyName}>
                {app.userFriendlyName}
              </h1>
            </div>

            <div className="AppEditorPage__headerActions">
              <button
                type="button"
                className="AppEditorPage__iconButton"
                onClick={handleToggleAssistant}
                aria-pressed={isAssistantOpen}
                title={t("appEditor_talkToAssistant", "和助手对话，让它帮你改")}
                aria-label={t("appEditor_talkToAssistant", "和助手对话，让它帮你改")}
              >
                <LuBot size={16} aria-hidden="true" />
              </button>

              {showPrimarySave && (
                <button
                  type="button"
                  className="AppEditorPage__primaryButton"
                  onClick={() => void handleSaveCode()}
                  disabled={!hasDraftChanges || isSaving}
                  title={
                    hasDraftChanges
                      ? t("appEditor_saveCode", "保存")
                      : t("appEditor_saveNothing", "还没有改动")
                  }
                >
                  <LuSave size={16} aria-hidden="true" />
                  <span>
                    {isSaving
                      ? t("appEditor_savingShort", "正在保存…")
                      : t("appEditor_saveCode", "保存")}
                  </span>
                </button>
              )}

              <div className="AppEditorPage__menuAnchor" ref={menuRef}>
                <button
                  type="button"
                  className="AppEditorPage__iconButton"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  title={t("appEditor_more", "更多")}
                  aria-label={t("appEditor_more", "更多")}
                >
                  <LuEllipsisVertical size={16} aria-hidden="true" />
                </button>
                {isMenuOpen && (
                  <div className="AppEditorPage__menu" role="menu">
                    {previewUrl && (
                      <a
                        className="AppEditorPage__menuItem"
                        role="menuitem"
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <LuExternalLink size={16} aria-hidden="true" />
                        <span>{t("appEditor_openApp", "打开应用")}</span>
                      </a>
                    )}
                    <button
                      type="button"
                      className="AppEditorPage__menuItem"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsIconPickerOpen(true);
                      }}
                    >
                      <LuLayoutGrid size={16} aria-hidden="true" />
                      <span>{t("contentIcon.change", "更换图标")}</span>
                    </button>
                    {isCodeView ? (
                      <button
                        type="button"
                        className="AppEditorPage__menuItem"
                        role="menuitem"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleDiscardCode();
                        }}
                        disabled={!hasDraftChanges || isSaving}
                      >
                        <LuRefreshCw size={16} aria-hidden="true" />
                        <span>{t("appEditor_discardCode", "撤销改动")}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="AppEditorPage__menuItem"
                          role="menuitem"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleInspectToggle();
                          }}
                          disabled={!canInspect}
                          title={
                            canInspect
                              ? undefined
                              : t(
                                  "appEditor_pickTargetDisabled",
                                  "这个应用暂时不支持点选（预览地址跨域）"
                                )
                          }
                        >
                          <LuMousePointerClick size={16} aria-hidden="true" />
                          <span>{t("appEditor_pickTarget", "点选要改的地方")}</span>
                        </button>
                        <button
                          type="button"
                          className="AppEditorPage__menuItem"
                          role="menuitem"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setView("code");
                          }}
                        >
                          <LuFileCode2 size={16} aria-hidden="true" />
                          <span>{t("appEditor_openCode", "修复代码（高级）")}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="AppEditorPage__iconAnchor">
                  <ContentIconPicker
                    open={isIconPickerOpen}
                    onClose={() => setIsIconPickerOpen(false)}
                    onSelect={handleAppIconSelect}
                  />
                </div>
              </div>
            </div>
          </header>

          {(saveMessage || saveError) && (
            <p
              className={`AppEditorPage__notice AppEditorPage__notice--status ${
                saveError ? "is-error" : "is-success"
              }`}
              role="status"
            >
              {saveError ?? saveMessage}
            </p>
          )}

          <div className="AppEditorPage__body">
            {!isCodeView ? (
              <section
                className="AppEditorPage__previewPane"
                aria-label={t("appEditor_viewPreview", "预览")}
              >
                <div className="AppEditorPage__previewCard">
                  {previewUrl ? (
                    <iframe
                      key={iframeNonce}
                      ref={iframeRef}
                      onLoad={() => {
                        if (isInspecting && app?.appKey) {
                          // try to re-install if still inspecting
                          const iframeDoc = iframeRef.current?.contentDocument;
                          if (iframeDoc) {
                            try {
                              if (!iframeDoc.body) throw new Error("no body");
                              if (unmountInspectorRef.current) {
                                unmountInspectorRef.current();
                              }
                              unmountInspectorRef.current = installInspector(iframeDoc, (node) => {
                                setSelectedNode({ appKey: app.appKey!, node });
                                setInspecting(false);
                                if (unmountInspectorRef.current) {
                                  unmountInspectorRef.current();
                                  unmountInspectorRef.current = null;
                                }
                              });
                            } catch (e) {}
                          }
                        }
                      }}
                      src={
                        iframeNonce > 0
                          ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}_r=${iframeNonce}`
                          : previewUrl
                      }
                      title={app.userFriendlyName}
                      className="AppEditorPage__frame"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                    />
                  ) : (
                    <div className="AppEditorPage__status">
                      {t("appEditor_missingUrl", "这个应用还没有可以打开的网址")}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section
                className="AppEditorPage__codePane"
                aria-label={t("appEditor_viewCode", "代码")}
              >
                <p className="AppEditorPage__notice">
                  <LuTriangleAlert size={14} aria-hidden="true" />
                  <span>
                    {t(
                      "appEditor_codeMode_warning",
                      "保存会直接替换正在用的版本，改坏了可以撤销改动或重新改回来。"
                    )}
                  </span>
                </p>

                <div className="AppEditorPage__codeLayout">
                  <select
                    className="AppEditorPage__fileSelect"
                    aria-label={t("appEditor_fileList", "文件")}
                    value={selectedFile?.name ?? ""}
                    onChange={(event) => setSelectedFileName(event.target.value)}
                  >
                    {draftFiles.map((file) => (
                      <option key={file.name} value={file.name}>
                        {file.name}
                      </option>
                    ))}
                  </select>

                  <div
                    className="AppEditorPage__fileList"
                    aria-label={t("appEditor_fileList", "文件")}
                  >
                    {draftFiles.map((file) => (
                      <button
                        key={file.name}
                        type="button"
                        className={`AppEditorPage__fileItem ${
                          selectedFile?.name === file.name ? "is-active" : ""
                        }`}
                        onClick={() => setSelectedFileName(file.name)}
                      >
                        <span>{file.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="AppEditorPage__editorPanel">
                    <div className="AppEditorPage__editorHeader">
                      <span>{selectedFile?.name ?? "worker.ts"}</span>
                    </div>
                    <div className="AppEditorPage__editorBody">
                      <pre className="AppEditorPage__gutter" ref={gutterRef} aria-hidden="true">
                        {lineNumbers}
                      </pre>
                      <textarea
                        ref={editorRef}
                        className="AppEditorPage__editorTextarea"
                        value={selectedFile?.code ?? ""}
                        onChange={(event) => handleSelectedFileChange(event.target.value)}
                        onScroll={handleEditorScroll}
                        wrap="off"
                        spellCheck={false}
                        aria-label={selectedFile?.name ?? "worker.ts"}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </>
      ) : null}

      <ConfirmModal
        isOpen={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          const action = pendingConfirm;
          setPendingConfirm(null);
          if (action === "leave") goBackToDetail();
          if (action === "discardCode") handleResetDrafts();
        }}
        title={
          pendingConfirm === "discardCode"
            ? t("appEditor_discardTitle", "撤销这些改动？")
            : t("appEditor_leaveTitle", "先保存再离开？")
        }
        message={
          pendingConfirm === "discardCode"
            ? t("appEditor_discardMessage", "代码会回到上一次保存的样子，撤销后不能找回。")
            : t("appEditor_leaveMessage", "还有没保存的改动，离开后会丢失。")
        }
        confirmText={
          pendingConfirm === "discardCode"
            ? t("appEditor_discardConfirm", "撤销改动")
            : t("appEditor_leaveConfirm", "不保存，离开")
        }
        cancelText={t("appEditor_leaveCancel", "继续编辑")}
        type="warning"
      />
    </div>
  );
};

/** 点击菜单与图标选择器外侧关闭「更多」菜单（两者都挂在同一个锚点上）。 */
function useClickOutsideMenu(
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, isOpen, onClose]);
}

export default AppEditorPage;
