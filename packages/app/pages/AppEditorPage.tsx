import "./AppEditorPage.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "app/routing";
import { toast } from "app/utils/toast"
import {
  LuBot,
  LuFileCode2,
  LuExternalLink,
  LuLayoutGrid,
  LuRefreshCw,
  LuSave,
  LuTriangleAlert,
  LuMousePointerClick,
} from "react-icons/lu";
import { useAppDetail } from "app/hooks/useAppDetail";
import {
  APP_EDIT_MODE_SEARCH_PARAM,
  buildAppAssistantSidebarId,
  buildAppChatEditorPath,
  buildAppCodeEditorPath,
  buildAppDetailPath,
  buildAppEditorPath,
  readAppServerOrigin,
} from "app/constants/appEditor";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken } from "identity";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useRightSidebar } from "render/layout/RightSidebarContext";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
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

type WorkspaceMode = "chat" | "code";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AppEditorPage: React.FC = () => {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { open, isOpen, currentId } = useRightSidebar();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const {
    pageKey,
    appKey: legacyAppKey,
    spaceId,
  } = useParams<"pageKey" | "appKey" | "spaceId">();

  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : legacyAppKey;
  const routeServerOrigin = readAppServerOrigin(searchParams);
  const requestedMode = searchParams.get(APP_EDIT_MODE_SEARCH_PARAM);
  const effectiveMode: WorkspaceMode =
    requestedMode === "chat" || requestedMode === "code"
      ? requestedMode
      : searchParams.get("sidebar") === "files" || searchParams.get("tab") === "source"
        ? "code"
        : "chat";

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
  const assistantSidebarId = routeAppKey
    ? buildAppAssistantSidebarId(routeAppKey)
    : undefined;
  const isAppAssistantOpen = isOpen && assistantSidebarId === currentId;
  const assistantAutoOpenKeyRef = useRef<string | null>(null);

  const isInspecting = useAppInspecting();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const unmountInspectorRef = useRef<(() => void) | null>(null);
  const [canInspect, setCanInspect] = useState(true);

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


  const buildEditorTarget = useCallback(
    (appKey: string, mode: WorkspaceMode) => {
      if (mode === "chat") {
        return buildAppChatEditorPath(appKey, spaceId, appServerOrigin);
      }
      if (mode === "code") {
        return buildAppCodeEditorPath(appKey, spaceId, appServerOrigin);
      }
      return buildAppEditorPath(appKey, spaceId, appServerOrigin);
    },
    [appServerOrigin, spaceId]
  );

  useEffect(() => {
    if (legacyAppKey && !pageKey) {
      navigate(buildEditorTarget(legacyAppKey, effectiveMode), { replace: true });
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    navigate(buildEditorTarget(app.appKey, effectiveMode), { replace: true });
  }, [app?.appKey, buildEditorTarget, effectiveMode, legacyAppKey, navigate, pageKey, routeAppKey]);

  useEffect(() => {
    if (effectiveMode !== "chat" || !routeAppKey || !assistantSidebarId) return;
    const openKey = `${routeAppKey}:${effectiveMode}`;
    if (assistantAutoOpenKeyRef.current === openKey) return;
    assistantAutoOpenKeyRef.current = openKey;
    openObjectAssistantSidebar(open, {
      kind: "app",
      contentKey: routeAppKey,
      sidebarId: assistantSidebarId,
    });
  }, [assistantSidebarId, effectiveMode, open, routeAppKey]);

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

  const handleSelectedFileChange = useCallback((nextCode: string) => {
    setDraftFiles((current) =>
      current.map((file) =>
        file.name === selectedFile?.name ? { ...file, code: nextCode } : file
      )
    );
  }, [selectedFile?.name]);

  const handleResetDrafts = useCallback(() => {
    setDraftFiles(sourceFiles);
    setSaveError(null);
    setSaveMessage(null);
  }, [sourceFiles]);

  const handleOpenAssistant = useCallback(() => {
    if (!routeAppKey || !assistantSidebarId) return;
    openObjectAssistantSidebar(open, {
      kind: "app",
      contentKey: routeAppKey,
      sidebarId: assistantSidebarId,
    });
  }, [assistantSidebarId, open, routeAppKey]);

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
            statusJson.error?.message ??
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

  return (
    <div className="AppEditorPage">
      {loading && !app ? (
        <div className="AppEditorPage__status">{t("appEditor_loading", "正在加载应用…")}</div>
      ) : error ? (
        <div className="AppEditorPage__status AppEditorPage__status--error">
          <span>{error}</span>
          <button
            type="button"
            className="AppEditorPage__btn"
            onClick={() => void refetch()}
          >
            <LuRefreshCw size={16} aria-hidden="true" />
            <span>{t("appEditor_retry", "重试")}</span>
          </button>
        </div>
      ) : app ? (
        <>
          <section className="AppEditorPage__hero">
            <div className="AppEditorPage__iconAnchor">
              <button
                type="button"
                className="content-icon-button AppEditorPage__iconButton"
                onClick={() => setIsIconPickerOpen((open) => !open)}
                title={t("contentIcon.change", "Change icon")}
                aria-label={t("contentIcon.change", "Change icon")}
              >
                <ContentIcon icon={app.icon} fallback={LuLayoutGrid} size={32} />
              </button>
              <ContentIconPicker
                open={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={handleAppIconSelect}
              />
            </div>
            <div className="AppEditorPage__heroMain">
              <div className="AppEditorPage__eyebrow">
                {app.userFriendlyName}
              </div>
              <h1 className="AppEditorPage__title">
                {effectiveMode
                  ? effectiveMode === "chat"
                    ? t("appEditor_chatMode_title", "对话编辑")
                    : t("appEditor_codeMode_title", "代码编辑")
                  : t("appEditor_chatMode_title", "对话编辑")}
              </h1>
            </div>

            <div className="AppEditorPage__heroActions">
              <button
                type="button"
                className="AppEditorPage__btn"
                onClick={() =>
                  navigate(buildAppDetailPath(routeAppKey, spaceId, appServerOrigin))
                }
              >
                <span>{t("appDetail_preview", "实时预览")}</span>
              </button>
              {effectiveMode === "chat" ? (
                <button
                  type="button"
                  className="AppEditorPage__btn AppEditorPage__btn--subtle"
                  onClick={() =>
                    navigate(buildAppCodeEditorPath(routeAppKey, spaceId, appServerOrigin))
                  }
                >
                  <LuFileCode2 size={16} aria-hidden="true" />
                  <span>{t("appEditor_switchToCode", "切换到代码编辑")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="AppEditorPage__btn AppEditorPage__btn--subtle"
                  onClick={() =>
                    navigate(buildAppChatEditorPath(routeAppKey, spaceId, appServerOrigin))
                  }
                >
                  <LuBot size={16} aria-hidden="true" />
                  <span>{t("appEditor_backToChat", "返回对话编辑")}</span>
                </button>
              )}
            </div>
          </section>

          {effectiveMode === "chat" && (
            <section className="AppEditorPage__chatMode">
              <div className="AppEditorPage__chatToolbar">
                <button
                  type="button"
                  className={`AppEditorPage__btn AppEditorPage__btn--${isInspecting ? "primary" : "secondary"}`}
                  onClick={handleInspectToggle}
                  disabled={!canInspect}
                  title={canInspect ? t("appEditor_chatMode_inspect", "选择元素") : t("appEditor_chatMode_inspect_disabled", "当前预览地址跨域，暂不支持点选")}
                >
                  <LuMousePointerClick size={16} aria-hidden="true" />
                  <span>{t("appEditor_chatMode_inspect", "选择元素")}</span>
                </button>
                {!isAppAssistantOpen && (
                  <button
                    type="button"
                    className="AppEditorPage__btn AppEditorPage__btn--primary"
                    onClick={handleOpenAssistant}
                  >
                    <LuBot size={16} aria-hidden="true" />
                    <span>{t("appEditor_chatMode_openAssistant", "打开右侧助手")}</span>
                  </button>
                )}
              </div>

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
                             if(unmountInspectorRef.current) {
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
                           } catch(e) {}
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
                    {t("appEditor_missingUrl", "当前应用还没有可访问地址")}
                  </div>
                )}
              </div>
            </section>
          )}

          {effectiveMode === "code" && (
            <section className="AppEditorPage__codeMode">
              <div className="AppEditorPage__warningBanner">
                <LuTriangleAlert size={16} aria-hidden="true" />
                <span>
                  {t(
                    "appEditor_codeMode_warning",
                    "非技术用户请勿随意修改，错误改动可能导致应用无法运行。"
                  )}
                </span>
              </div>

              <div className="AppEditorPage__codeToolbar">
                <div className="AppEditorPage__codeToolbarInfo">
                  <div className="AppEditorPage__panelEyebrow">
                    {t("appEditor_codeMode_title", "代码编辑")}
                  </div>
                  <div className="AppEditorPage__panelTitle">
                    {t("appEditor_codeMode_heading", "直接修改源码并保存")}
                  </div>
                </div>

                <div className="AppEditorPage__codeToolbarActions">
                  <button
                    type="button"
                    className="AppEditorPage__btn"
                    onClick={handleResetDrafts}
                    disabled={!hasDraftChanges || isSaving}
                  >
                    <span>{t("appEditor_resetDrafts", "撤销未保存修改")}</span>
                  </button>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="AppEditorPage__btn"
                    >
                      <LuExternalLink size={16} aria-hidden="true" />
                      <span>{t("appEditor_openApp", "打开应用")}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    className="AppEditorPage__btn AppEditorPage__btn--primary"
                    onClick={() => void handleSaveCode()}
                    disabled={!hasDraftChanges || isSaving}
                  >
                    <LuSave size={16} aria-hidden="true" />
                    <span>
                      {isSaving
                        ? t("appEditor_codeMode_saving", "正在预检并保存源码…")
                        : t("appEditor_saveCode", "保存代码")}
                    </span>
                  </button>
                </div>
              </div>

              {(saveMessage || saveError) && (
                <div
                  className={`AppEditorPage__saveNotice ${
                    saveError ? "is-error" : "is-success"
                  }`}
                >
                  {saveError ?? saveMessage}
                </div>
              )}

              <div className="AppEditorPage__codeLayout">
                <div className="AppEditorPage__fileList">
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
                      <small>{file.code.split("\n").length} lines</small>
                    </button>
                  ))}
                </div>

                <div className="AppEditorPage__editorPanel">
                  <div className="AppEditorPage__editorHeader">
                    <span>{selectedFile?.name ?? "worker.ts"}</span>
                  </div>
                  <textarea
                    className="AppEditorPage__editorTextarea"
                    value={selectedFile?.code ?? ""}
                    onChange={(event) => handleSelectedFileChange(event.target.value)}
                    spellCheck={false}
                    aria-label={selectedFile?.name ?? "worker.ts"}
                  />
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
};

export default AppEditorPage;
