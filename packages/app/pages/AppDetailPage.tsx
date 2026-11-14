import "./AppDetailPage.css";
import "./AppEditorPage.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  buildAppAssistantSidebarId,
  buildAppChatEditorPath,
  buildAppDetailPath,
  buildAppEditorPath,
  readAppServerOrigin,
} from "app/constants/appEditor";
import {
  buildAppDetailTargetPath,
  isSameAppDetailTarget,
} from "app/constants/appDetailTarget";
import {
  DEFAULT_APP_EDITOR_VIEW,
  resolveAppEditorEntry,
  type AppEditorView,
} from "./appEditorMode";
import { useAppDetail } from "app/hooks/useAppDetail";
import { useMyAppActions } from "app/hooks/useMyApps";
import { useAppVersions } from "app/hooks/useAppVersions";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { useUserId, useIsLoggedIn, useToken } from "identity";
import { useAppDispatch, useAppSelector } from "app/store";
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
import {
  LuArrowLeft,
  LuBot,
  LuCode,
  LuEllipsisVertical,
  LuExternalLink,
  LuFileCode2,
  LuLayoutGrid,
  LuMessagesSquare,
  LuMousePointerClick,
  LuRefreshCw,
  LuSave,
  LuShare2,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";
import { useOpenAppEditorPanel } from "app/actions/openAppEditorPanel";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { useRightSidebarOptional } from "render/layout/RightSidebarContext";
import { useShareWorkflow, type SharePayload, type ShareVisibility } from "render/layout/useShareWorkflow";
import ShareModal, { type AppShareScope } from "render/web/ui/modal/ShareModal";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import {
  describeAppRuntimeFailure,
  readAppRuntimeErrorText,
} from "app/pages/share/appShareTarget";
import { probeAppRuntime } from "app/pages/share/appRuntimeProbe";
import { buildAppSharePayload } from "app/utils/appSharePayload";
import PageObjectActions from "render/page/PageObjectActions";
import { useSidebarToggleContext } from "render/layout/SidebarToggleContext";
import { toast } from "app/utils/toast";

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
 * app 统一页面组件。
 *
 * 内部两种视图态：
 * - view（默认，无 ?edit）：详情页布局（预览 iframe + 分享 + 版本页脚 + 助手面板）。
 * - edit（?edit=true）：编辑器布局（保存 / 部署 / 代码急救 / dirty 离开确认 / 返回应用）。
 *
 * 访客（未登录或非 owner）永远只 view 态，edit 态入口不渲染。
 */
const AppDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const {
    pageKey,
    appKey: legacyAppKey,
    spaceId,
  } = useParams<"pageKey" | "appKey" | "spaceId">();
  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : legacyAppKey;
  const routeServerOrigin = readAppServerOrigin(searchParams);
  const rawEditRequested = searchParams.get("edit") === "true";
  const { app, loading, error, refetch } = useAppDetail(routeAppKey, {
    prepareEdit: rawEditRequested,
    serverOrigin: routeServerOrigin,
  });

  const currentUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectRemoteServer);
  const rightSidebar = useRightSidebarOptional();
  const sidebarToggle = useSidebarToggleContext();

  // 编辑入口与写权限把关：
  // 1. 访客（未登录）永远不能进入 edit 态。
  // 2. 只有 owner（服务端下发 app.canShare === true）或归属空间的应用（app.spaceId 存在，由服务端做空间成员权限校验）才能进入 edit 态。
  // 3. 无空间归属的公开/共享应用，非 owner 不允许进入编辑态，避免 UI 暴露源码编辑界面（即使服务端接口有 member 校验兜底）。
  const couldEdit = Boolean(currentUserId && app && (app.canShare || app.spaceId));
  const canShare = Boolean(app?.canShare);

  const isEditRequested = rawEditRequested;
  const mode: "view" | "edit" = isEditRequested && couldEdit ? "edit" : "view";

  const appServerOrigin = app?.serverOrigin ?? routeServerOrigin;

  // ──────────────────────────────────────────────────────────────────────────
  // 共享数据：运行时 URL 与预览探针
  // ──────────────────────────────────────────────────────────────────────────
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [runtimeFailure, setRuntimeFailure] = useState<{
    status?: number;
    errorText: string;
  } | null>(null);
  const runtimeProbeIdRef = useRef(0);

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
    const handler = () => void refetch();
    window.addEventListener("app-editor-refresh", handler);
    return () => window.removeEventListener("app-editor-refresh", handler);
  }, [refetch]);

  useEffect(() => {
    setFrameLoaded(false);
  }, [primaryUrl]);

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

  // ──────────────────────────────────────────────────────────────────────────
  // 详情页（view 态）独有逻辑
  // ──────────────────────────────────────────────────────────────────────────
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

  // view 态 URL 规范化
  useEffect(() => {
    if (mode !== "view") return;
    if (legacyAppKey && !pageKey) {
      gotoDetailTarget(legacyAppKey);
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    gotoDetailTarget(app.appKey);
  }, [app?.appKey, gotoDetailTarget, legacyAppKey, mode, pageKey, routeAppKey]);

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

  const openEditorPanel = useOpenAppEditorPanel();
  const openAppAssistant = useCallback(() => {
    openEditorPanel(routeAppKey, () => {
      if (!routeAppKey) return;
      navigate(buildAppChatEditorPath(routeAppKey, spaceId, routeServerOrigin));
    });
  }, [navigate, openEditorPanel, routeAppKey, routeServerOrigin, spaceId]);

  const awaitingApp = loading && !app;
  const titleText = app?.userFriendlyName ?? (awaitingApp ? "" : t("appDetail_titleFallback", "应用详情"));
  const metaText = app ? [previewUrlLabel, app.framework].filter(Boolean).join(" · ") : "";

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

  const showPageObjectActions = !(sidebarToggle?.isDesktop && isLoggedIn);

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

  const appShareScope: AppShareScope = app?.reachability ?? "owner";

  // ──────────────────────────────────────────────────────────────────────────
  // 编辑器（edit 态）独有逻辑
  // ──────────────────────────────────────────────────────────────────────────
  const [view, setView] = useState<AppEditorView>(DEFAULT_APP_EDITOR_VIEW);
  const needsUrlCleanup = resolveAppEditorEntry(searchParams);
  const isInspecting = useAppInspecting();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);
  const unmountInspectorRef = useRef<(() => void) | null>(null);
  const [canInspect, setCanInspect] = useState(true);

  // 换 app 或重进编辑器都回到预览
  useEffect(() => {
    setView(DEFAULT_APP_EDITOR_VIEW);
    setInspecting(false);
    if (unmountInspectorRef.current) {
      unmountInspectorRef.current();
      unmountInspectorRef.current = null;
    }
  }, [routeAppKey]);

  // 历史参数清理（老 mode=code 等）
  useEffect(() => {
    if (mode !== "edit" || !needsUrlCleanup || !routeAppKey) return;
    navigate(buildAppEditorPath(routeAppKey, spaceId, appServerOrigin), { replace: true });
  }, [appServerOrigin, mode, needsUrlCleanup, navigate, routeAppKey, spaceId]);

  // edit 态别名与 canonical 路径修正
  useEffect(() => {
    if (mode !== "edit") return;
    if (legacyAppKey && !pageKey) {
      navigate(buildAppEditorPath(legacyAppKey, spaceId, appServerOrigin), { replace: true });
      return;
    }
    if (!app?.appKey || !routeAppKey || app.appKey === routeAppKey) return;
    navigate(buildAppEditorPath(app.appKey, spaceId, appServerOrigin), { replace: true });
  }, [app?.appKey, appServerOrigin, legacyAppKey, mode, navigate, pageKey, routeAppKey, spaceId]);

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
      } catch {
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
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const editorMenuAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftFiles(sourceFiles);
    setSelectedFileName((prev) => {
      if (prev && sourceFiles.some((f) => f.name === prev)) return prev;
      return sourceFiles[0]?.name ?? null;
    });
  }, [sourceFiles]);

  const selectedFile = useMemo(
    () => draftFiles.find((f) => f.name === selectedFileName) ?? draftFiles[0] ?? null,
    [draftFiles, selectedFileName]
  );

  const hasDraftChanges = useMemo(() => {
    if (draftFiles.length !== sourceFiles.length) return true;
    const sourceMap = new Map(sourceFiles.map((file) => [file.name, file.code]));
    return draftFiles.some((draft) => sourceMap.get(draft.name) !== draft.code);
  }, [draftFiles, sourceFiles]);

  const lineNumbers = useMemo(() => {
    const count = (selectedFile?.code ?? "").split("\n").length;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1).join("\n");
  }, [selectedFile?.code]);

  const handleScrollEditor = useCallback(() => {
    if (editorRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  const handleSelectedFileChange = useCallback(
    (code: string) => {
      if (!selectedFile) return;
      setDraftFiles((prev) =>
        prev.map((file) => (file.name === selectedFile.name ? { ...file, code } : file))
      );
    },
    [selectedFile]
  );

  const handleResetDrafts = useCallback(() => {
    setDraftFiles(sourceFiles);
    setSaveError(null);
    setSaveMessage(null);
    toast.success(t("appEditor_codeMode_resetDone", "已恢复到上一次保存的源码"));
  }, [sourceFiles, t]);

  const handleAppIconSelect = useCallback(
    async (nextIcon: ContentIconValue | null) => {
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
    },
    [appServerOrigin, dispatch, refetch, routeAppKey, t]
  );

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

  const resetEditorState = useCallback(() => {
    setDraftFiles(sourceFiles);
    setSelectedFileName(sourceFiles[0]?.name ?? null);
    setSaveError(null);
    setSaveMessage(null);
    setInspecting(false);
    if (unmountInspectorRef.current) {
      unmountInspectorRef.current();
      unmountInspectorRef.current = null;
    }
    setView(DEFAULT_APP_EDITOR_VIEW);
  }, [sourceFiles]);

  // 离开编辑态（或回到 view 态）时重置草稿与 inspector 状态，防止脏代码残留或点选高亮渗入 view 态
  useEffect(() => {
    if (mode === "view") {
      resetEditorState();
    }
  }, [mode, resetEditorState]);

  const goBackToDetail = useCallback(() => {
    resetEditorState();
    if (!routeAppKey) return;
    navigate(buildAppDetailPath(routeAppKey, spaceId, appServerOrigin));
  }, [appServerOrigin, navigate, resetEditorState, routeAppKey, spaceId]);

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

      setIsSaving(false);
      setSaveError(null);
      setSaveMessage(null);
      toast.success(t("appEditor_codeMode_saved", "源码已保存并部署"));
    } catch (saveCatchError) {
      setIsSaving(false);
      setSaveMessage(null);
      setSaveError(
        saveCatchError instanceof Error
          ? saveCatchError.message
          : t("appEditor_codeMode_failed", "源码保存失败，请检查代码后重试。")
      );
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

  useClickOutsideMenu(isEditorMenuOpen || isIconPickerOpen, editorMenuAnchorRef, () => {
    setIsEditorMenuOpen(false);
    setIsIconPickerOpen(false);
  });

  const isCodeView = view === "code";
  const showPrimarySave = isCodeView || hasDraftChanges;

  if (!routeAppKey) {
    return (
      <div className="AppDetailPage__status">
        {t("appDetail_missingId")}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // edit 态渲染
  // ──────────────────────────────────────────────────────────────────────────
  if (mode === "edit") {
    if (error && !app) {
      return (
        <div className="AppDetailPage AppEditorPage">
          {showPageObjectActions && <PageObjectActions />}
          <div className="AppEditorPage__status AppEditorPage__status--error">
            {readAppRuntimeErrorText(error)}
          </div>
        </div>
      );
    }

    if (!app) {
      return (
        <div className="AppDetailPage AppEditorPage">
          {showPageObjectActions && <PageObjectActions />}
          <header className="AppEditorPage__header">
            <button type="button" className="AppEditorPage__back" onClick={goBackToDetail}>
              <LuArrowLeft size={16} aria-hidden="true" />
              <span>{t("appEditor_backToApp", "返回应用")}</span>
            </button>
          </header>
          <div className="AppEditorPage__body">
            <div className="AppEditorPage__status">{t("loading", "加载中...")}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="AppDetailPage AppEditorPage" data-view={view}>
        {showPageObjectActions && <PageObjectActions />}

        <header className="AppEditorPage__header">
          <button
            type="button"
            className="AppEditorPage__back"
            onClick={isCodeView ? () => setView("preview") : handleLeaveEditor}
          >
            <LuArrowLeft size={16} aria-hidden="true" />
            <span>
              {isCodeView
                ? t("appEditor_backToPreview", "返回预览")
                : t("appEditor_backToApp", "返回应用")}
            </span>
          </button>

          <div className="AppEditorPage__titleGroup">
            <span
              className="AppEditorPage__iconMark"
              role="button"
              tabIndex={0}
              onClick={() => setIsIconPickerOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsIconPickerOpen(true);
                }
              }}
              aria-label={t("contentIcon.change", "更换图标")}
              title={t("contentIcon.change", "更换图标")}
            >
              <ContentIcon icon={app.icon} fallback={LuLayoutGrid} size={24} />
            </span>
            <h1 className="AppEditorPage__title">{app.userFriendlyName}</h1>
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
                    ? t("appEditor_saveTooltip", "保存源码并重新部署")
                    : t("appEditor_saveNoChanges", "没有需要保存的改动")
                }
              >
                <LuSave size={16} aria-hidden="true" />
                <span>
                  {isSaving
                    ? t("appEditor_saving", "保存中…")
                    : t("appEditor_saveCode", "保存")}
                </span>
              </button>
            )}

            <div className="AppEditorPage__menuAnchor" ref={editorMenuAnchorRef}>
              <button
                type="button"
                className="AppEditorPage__iconButton"
                onClick={() => setIsEditorMenuOpen((prev) => !prev)}
                aria-label={t("moreActions", "更多操作")}
                title={t("moreActions", "更多操作")}
                aria-haspopup="menu"
                aria-expanded={isEditorMenuOpen}
              >
                <LuEllipsisVertical size={16} aria-hidden="true" />
              </button>
              {isEditorMenuOpen && (
                <div className="AppEditorPage__menu" role="menu">
                  {primaryUrl && (
                    <a
                      className="AppEditorPage__menuItem"
                      role="menuitem"
                      href={primaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsEditorMenuOpen(false)}
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
                      setIsEditorMenuOpen(false);
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
                        setIsEditorMenuOpen(false);
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
                          setIsEditorMenuOpen(false);
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
                          setIsEditorMenuOpen(false);
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
                {primaryUrl ? (
                  <iframe
                    key={iframeNonce}
                    ref={iframeRef}
                    onLoad={() => {
                      if (isInspecting && app?.appKey) {
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
                          } catch {}
                        }
                      }
                    }}
                    src={
                      iframeNonce > 0
                        ? `${primaryUrl}${primaryUrl.includes("?") ? "&" : "?"}_r=${iframeNonce}`
                        : primaryUrl
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
                <LuTriangleAlert size={16} aria-hidden="true" />
                <span>
                  {t(
                    "appEditor_codeNotice",
                    "代码急救通道：只用于预览报错救砖。日常改应用直接和右侧助手对话更省心。"
                  )}
                </span>
              </p>

              <div className="AppEditorPage__codeLayout">
                <select
                  className="AppEditorPage__fileSelect"
                  aria-label={t("appEditor_fileList", "文件")}
                  value={selectedFile?.name ?? ""}
                  onChange={(e) => setSelectedFileName(e.target.value)}
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
                      onChange={(e) => handleSelectedFileChange(e.target.value)}
                      onScroll={handleScrollEditor}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

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
  }

  // ──────────────────────────────────────────────────────────────────────────
  // view 态渲染（默认）
  // ──────────────────────────────────────────────────────────────────────────
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
                      onClick={() => {
                        setMenuOpen(false);
                        void handleDelete();
                      }}
                      disabled={deleting}
                    >
                      <LuTrash2 size={16} aria-hidden="true" />
                      {confirmDelete
                        ? t("appDetail_confirmDelete", "再次点击确认删除")
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
