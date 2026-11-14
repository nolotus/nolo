import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, useNavigate, useLocation } from "app/routing";
import { toast } from "app/utils/toast"
import React from "react";

import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector, type RootState } from "app/store";
import { useHasMounted } from "app/hooks/useHasMounted";
import { useCouldEdit, useCurrentUser, useIsLoggedIn } from "identity";
import {
  useDocState,
  getDocState,
  getDocHasPendingChanges,
  toggleReadOnlyDoc,
  saveDocState,
} from "render/page/docStore";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { selectAllMsgs } from "chat/messages/messageSlice";
import { selectById } from "database/dbSlice";
import { DataType } from "create/types";
import { isSystemAdmin } from "core/init";
import { useClickOutside } from "app/hooks/useClickOutside";
import {
  buildAppAssistantSidebarId,
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import {
  resolveDeleteSpaceId,
  resolveDeleteSuccessPath,
} from "./deleteBehavior";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import { useRightSidebar } from "./RightSidebarContext";
import { useShareWorkflow, type SharePayload } from "./useShareWorkflow";
import { resolvePreferredAppRuntimeUrl } from "app/utils/appRuntimeUrl";
import { buildAppSharePayload } from "app/utils/appSharePayload";
import { useAppDetail } from "app/hooks/useAppDetail";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import {
  getObjectAssistantLabels,
  useIsMac,
} from "./topbarUtils";
import { getRouteDescriptor } from "./mainLayoutViewMode";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { openAppEditorPanel } from "app/actions/openAppEditorPanel";
import FileDetailsPanel from "render/page/FileDetailsPanel";
import { useAgentFavorite } from "app/favorite/useAgentFavorite";
import { useContentFavorite } from "app/favorite/useContentFavorite";
import { readAppServerOrigin } from "app/constants/appEditor";
import {
  buildObjectAssistantSidebarId,
  isObjectAssistantSidebarId,
  resolveObjectAssistantKind,
} from "chat/dialog/objectAssistantRegistry";

import { selectDeleteShortcut } from "app/settings/settingSlice";
import { matchShortcut } from "app/settings/shortcutUtils";
import type { TableMeta } from "render/table/types";
import { useTableShareActions } from "render/table/useTableShareActions";

export const useTopBarState = (toggleSidebar?: () => void) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const hasMounted = useHasMounted();
  const isLoggedIn = useIsLoggedIn();
  const user = useCurrentUser();
  const {
    pageKey: rawPageKey,
    appKey: rawAppKey,
    spaceId: rawRouteSpaceId,
  } = useParams<"pageKey" | "appKey" | "spaceId">();
  const location = useLocation();
  const descriptor = useMemo(() => getRouteDescriptor(location.pathname), [location.pathname]);

  const pageKey = descriptor.contentKey || rawPageKey;
  const routeSpaceId = descriptor.spaceId || rawRouteSpaceId;
  const routeAppKey = pageKey?.startsWith("app-") ? pageKey : rawAppKey;
  const [searchParams] = useSearchParams();
  const routeAppServerOrigin = readAppServerOrigin(searchParams);
  const { app: appDetail, refetch: refetchApp } = useAppDetail(routeAppKey, {
    serverOrigin: routeAppServerOrigin,
  });
  const appPrimaryUrl = appDetail
    ? (appDetail.customUrl ?? appDetail.url ?? "")
    : "";
  const isAppEditMode =
    searchParams.get("edit") === "true" ||
    searchParams.get("mode") === "chat" ||
    searchParams.get("mode") === "code" ||
    searchParams.get("sidebar") === "files" ||
    searchParams.get("tab") === "source";
  const appEditorUrl = routeAppKey
    ? buildAppEditorPath(routeAppKey, routeSpaceId, routeAppServerOrigin)
    : "";
  const [showVersionPanel, setShowVersionPanel] = useState(false);

  // doc state now lives in the standalone docStore (peeled out of Redux).
  const page = useDocState();
  const readOnly = page.isReadOnly;
  const saving = page.isSaving;
  const pending = getDocHasPendingChanges();
  const dbSpace = page.dbSpaceId;
  const curSpace = useCurrentSpaceId();
  const currentDialog = useCurrentDialogConfig();
  const deleteShortcut = useAppSelector(selectDeleteShortcut);
  // Do NOT subscribe to selectAllMsgs here — every stream token would re-render
  // the whole TopBar. Share handler reads messages from the store on demand.
  const { currentServer: server, currentToken: token } = useAppSelector(
    selectRuntimeSnapshot,
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOverflowOpen, setIsMobileOverflowOpen] = useState(false);
  const [mobileOverflowPanelStyle, setMobileOverflowPanelStyle] =
    useState<React.CSSProperties>({});
  const [isDeletingFromTopbar, setIsDeletingFromTopbar] = useState(false);
  const mobileOverflowRef = useRef<HTMLDivElement>(null);
  const mobileOverflowButtonRef = useRef<HTMLButtonElement>(null);
  const mobileOverflowPanelRef = useRef<HTMLDivElement>(null);

  const isMac = useIsMac();
  const contentKeyType = useMemo(() => {
    if (descriptor.contentKeyType === "page" && page?.type) {
      if (page.type === "image" || page.type === "file") {
        return page.type;
      }
    }
    return descriptor.contentKeyType;
  }, [descriptor.contentKeyType, page?.type]);

  const pageEntity = useAppSelector((state: any) =>
    contentKeyType === "page" && pageKey ? selectById(state, pageKey) : null,
  );
  const contentEntity = useAppSelector((state: any) =>
    pageKey ? selectById(state, pageKey) : null,
  );
  const tableMeta =
    contentKeyType === "meta" && pageKey
      ? (contentEntity as TableMeta | null)
      : null;
  const tableShareActions = useTableShareActions({
    tableMeta,
    tableKey: pageKey ?? "",
    tenantId: tableMeta?.tenantId ?? user?.userId,
  });
  const dialogEntity = useAppSelector((state: any) =>
    contentKeyType === "dialog" && currentDialog?.dbKey
      ? selectById(state, currentDialog.dbKey)
      : null,
  );

  const canEdit = useCouldEdit(pageKey);
  const entityOwnerId =
    typeof contentEntity?.userId === "string"
      ? contentEntity.userId
      : typeof contentEntity?.ownerId === "string"
        ? contentEntity.ownerId
        : undefined;
  const canEditFromEntity =
    !!entityOwnerId &&
    !!user?.userId &&
    (entityOwnerId === user.userId || isSystemAdmin(user.userId));
  const canEditCurrentContent = canEdit || canEditFromEntity;

  const showEdit = useMemo(() => {
    if (!pageKey || !user?.userId) return false;
    if (contentKeyType === "page")
      return canEditCurrentContent || !page?.creator;
    if (["meta", "file", "image", "agent"].includes(contentKeyType)) {
      return canEditCurrentContent;
    }
    return false;
  }, [
    canEditCurrentContent,
    contentKeyType,
    page?.creator,
    pageKey,
    user?.userId,
  ]);

  // Capability: page is editable (delete / version history still use this).
  const canEditPageContent = showEdit && contentKeyType === "page";
  // Temporary UI hide: ModeToggle + Save. Flip to true to restore topbar actions.
  const SHOW_PAGE_EDIT_TOPBAR_ACTIONS = false;
  const showPageEditActions =
    SHOW_PAGE_EDIT_TOPBAR_ACTIONS && canEditPageContent;
  const showMetaDeleteButton = showEdit && contentKeyType === "meta";
  const isFileContent = contentKeyType === "file" || contentKeyType === "image";
  const showFileDeleteButton = showEdit && isFileContent;
  const showAgentDeleteButton =
    showEdit && contentKeyType === "agent";
  const objectAssistantKind = resolveObjectAssistantKind(contentKeyType);
  const showObjectAssistantAction = objectAssistantKind !== null;
  const showShareButton =
    isLoggedIn &&
    ((contentKeyType === "page" && !!pageEntity) ||
      (contentKeyType === "dialog" && !!dialogEntity));
  const showAgentFavoriteButton =
    isLoggedIn &&
    contentKeyType === "agent" &&
    !!pageKey;
  const showContentFavoriteButton =
    isLoggedIn &&
    (contentKeyType === "page" ||
      contentKeyType === "meta" ||
      contentKeyType === "dialog") &&
    !!pageKey;

  const objectAssistantLabels = useMemo(
    () =>
      getObjectAssistantLabels((key, fallback) => t(key, fallback as string), contentKeyType),
    [contentKeyType, t],
  );

  const {
    isFavorited: isAgentFavorited,
    toggleFavorite: toggleAgentFavorite,
  } = useAgentFavorite(showAgentFavoriteButton ? pageKey! : "");

  const {
    isFavorited: isContentFavorited,
    toggleFavorite: toggleContentFavorite,
  } = useContentFavorite(showContentFavoriteButton ? pageKey! : "");

  // Unified favorite values across agent (agent favorite) and page/meta/dialog
  // (content favorite). Old agent-specific fields kept for source-contract compat.
  const showFavoriteButton = showAgentFavoriteButton || showContentFavoriteButton;
  const isFavorited = isAgentFavorited || isContentFavorited;
  const toggleFavoriteOnPage = showAgentFavoriteButton
    ? toggleAgentFavorite
    : toggleContentFavorite;

  const { open, close, isOpen, currentId } = useRightSidebar();
  const appAssistantId = routeAppKey
    ? buildAppAssistantSidebarId(routeAppKey)
    : null;
  const isObjectAssistantOpen =
    isOpen &&
    (isObjectAssistantSidebarId(currentId) ||
      (!!appAssistantId && currentId === appAssistantId));
  const isFileDetailsOpen = isOpen && currentId === "fileDetails";

  useClickOutside(mobileOverflowRef as any, (event) => {
    // The overflow menu panel is portaled to <body>, so click-outside cannot rely on
    // the trigger wrapper alone. Treat the portaled panel as part of the same menu.
    if (mobileOverflowPanelRef.current?.contains(event.target as Node)) {
      return;
    }
    setIsMobileOverflowOpen(false);
  });

  const sidebarToggleLabel = isSidebarOpen
    ? t("collapseSidebar", "收起侧边栏")
    : t("expandSidebar", "展开侧边栏");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileOverflowOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOverflowOpen(false);
    };
    const handleResize = () => setIsMobileOverflowOpen(false);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileOverflowOpen]);

  // ── delete context ────────────────────────────────────────────────────────
  const contentSpaceId = resolveDeleteSpaceId({
    contentKeyType,
    docSpaceId: dbSpace,
    entitySpaceId:
      typeof contentEntity?.spaceId === "string" ? contentEntity.spaceId : null,
    routeSpaceId,
    currentSpaceId: curSpace,
  });
  const dialogSpaceId = resolveDeleteSpaceId({
    contentKeyType: "dialog",
    entitySpaceId:
      typeof currentDialog?.spaceId === "string" ? currentDialog.spaceId : null,
    routeSpaceId,
    currentSpaceId: curSpace,
  });
  const deleteTitle = page?.title ?? pageKey ?? "";
  const canDeletePageOrMeta =
    !!pageKey &&
    (canEditPageContent ||
      showMetaDeleteButton ||
      showFileDeleteButton ||
      showAgentDeleteButton);
  const canDeleteDialog = contentKeyType === "dialog" && !!currentDialog?.dbKey;
  const deleteContext = canDeletePageOrMeta
    ? "pageOrMeta"
    : canDeleteDialog
      ? "dialog"
      : null;
  const deleteKey =
    deleteContext === "pageOrMeta"
      ? pageKey!
      : deleteContext === "dialog"
        ? currentDialog!.dbKey
        : undefined;
  const deleteServerOrigin =
    deleteContext === "pageOrMeta"
      ? typeof contentEntity?.serverOrigin === "string"
        ? contentEntity.serverOrigin
        : typeof pageEntity?.serverOrigin === "string"
          ? pageEntity.serverOrigin
          : undefined
      : deleteContext === "dialog"
        ? typeof dialogEntity?.serverOrigin === "string"
          ? dialogEntity.serverOrigin
          : typeof (currentDialog as any)?.serverOrigin === "string"
            ? (currentDialog as any).serverOrigin
            : undefined
        : undefined;
  const finalDeleteTitle =
    deleteContext === "pageOrMeta"
      ? deleteTitle
      : deleteContext === "dialog"
        ? (currentDialog?.title ?? "")
        : "";
  const deleteConfirmationMessage =
    contentKeyType === "agent"
      ? t("deleteAgentCurrentCopyConfirmation")
      : t("deleteDialogConfirmation");
  const deleteSpaceId =
    deleteContext === "pageOrMeta"
      ? contentSpaceId
      : deleteContext === "dialog"
        ? dialogSpaceId
        : undefined;
  // Page / dialog / meta deletes inside a space → space home (not history.back).
  const deleteRedirectTo =
    deleteContext === "pageOrMeta" || deleteContext === "dialog"
      ? resolveDeleteSuccessPath({
          contentKey: deleteKey,
          routeSpaceId: routeSpaceId || deleteSpaceId,
        })
      : undefined;
  const hasMobileOverflowActions =
    !!(deleteContext && deleteKey) ||
    showShareButton ||
    showAgentFavoriteButton ||
    showContentFavoriteButton ||
    !!(canEditPageContent && pageKey) ||
    contentKeyType === "meta";

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleToggleSidebar = useCallback(() => {
    if (!toggleSidebar) return;
    toggleSidebar();
    setIsSidebarOpen((prev) => !prev);
  }, [toggleSidebar]);

  const handleToggleEdit = useCallback(() => {
    toggleReadOnlyDoc();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveDocState(
        { pageKey: page.pageKey ?? pageKey!, triggerSource: "topbar-save-button" } as any,
        { dispatch, getState: store.getState },
      );
      toast.success(t("saveSuccess"));
      if (pageKey) {
        fetch(`${server}/api/version/save`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "doc",
            entityId: pageKey,
            snapshot: page,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      if (e instanceof Error && e.message !== "Aborted") {
        toast.error(t("saveFailed"));
      }
    }
  }, [dispatch, store, t, page, pageKey, server, token]);

  // 分享流程的唯一实现在 useShareWorkflow（render/layout/useShareWorkflow.ts）；
  // 这里只负责「当前内容页要分享什么」。
  const buildSharePayload = useCallback(
    (visibility: "private" | "community"): SharePayload | null => {
      void visibility;
      let shareConfig: SharePayload | null = null;

      if (contentKeyType === "page" && pageEntity) {
        shareConfig = {
          type: DataType.DOC,
          data: pageEntity,
          title: pageEntity.title || page?.title || "Shared Page",
        };
      } else if (contentKeyType === "dialog" && dialogEntity) {
        // Snapshot messages at click time — avoids TopBar re-render on every token.
        const dialogMessages = selectAllMsgs(store.getState());

        const hasRunningDialogMessages =
          Array.isArray(dialogMessages) &&
          dialogMessages.some((message: any) => {
            if (!message || typeof message !== "object") return false;
            return (
              message.isStreaming === true ||
              message.toolPayload?.status === "running"
            );
          });
        if (hasRunningDialogMessages) {
          toast.error(t("shareDialogStillRunning", "对话仍在运行，完成后再分享"));
          return null;
        }

        const dialogMessagesSnapshot =
          Array.isArray(dialogMessages) && dialogMessages.length > 0
            ? dialogMessages.map((message: any) => {
                if (!message || typeof message !== "object") return message;
                const { controller, ...rest } = message;
                return rest;
              })
            : undefined;
        shareConfig = {
          type: DataType.DIALOG,
          data:
            dialogMessagesSnapshot && dialogMessagesSnapshot.length > 0
              ? { ...dialogEntity, messages: dialogMessagesSnapshot }
              : dialogEntity,
          title: currentDialog?.title || "Shared Dialog",
        };
      } else if (contentKeyType === "app") {
        // 顶栏分享与详情页共用同一份载荷构造（app/utils/appSharePayload），
        // 不再在这里拼第二份形状；没有运行地址就没有可分享内容。
        // 门控与详情页一致：只有 owner（服务端下发的 canShare）能分享自己的应用。
        shareConfig = appDetail?.canShare
          ? buildAppSharePayload({
              appId: appDetail.appId,
              appKey: appDetail.appKey ?? routeAppKey,
              name: appDetail.userFriendlyName,
              url: resolvePreferredAppRuntimeUrl(appDetail),
            })
          : null;
      }

      return shareConfig;
    },
    [
      appDetail,
      contentKeyType,
      currentDialog?.title,
      dialogEntity,
      page?.title,
      pageEntity,
      store,
      t,
    ]
  );

  const {
    isShareModalOpen,
    shareModalLink,
    shareModalVisibility,
    isShareModalLoading,
    shareModalCopied,
    shareError,
    setIsShareModalOpen,
    handleShare,
    handleOpenShare,
    handlePublishCommunity,
  } = useShareWorkflow(buildSharePayload);

  const navigate = useNavigate();

  const handleToggleObjectAssistant = useCallback(() => {
    if (!objectAssistantKind) return;
    const objectKey = objectAssistantKind === "app" ? routeAppKey : pageKey;
    if (!objectKey) return;
    if (isObjectAssistantOpen) {
      close();
      return;
    }
    if (objectAssistantKind === "app") {
      // app 的「对象助手」与详情页 / 卡片里的「编辑」共用同一个入口和同一个
      // sidebar id（app/actions/openAppEditorPanel），同一 app 只有一个面板。
      openAppEditorPanel({
        open,
        appKey: objectKey,
        onFallback: () => navigate(appEditorUrl),
      });
      return;
    }
    openObjectAssistantSidebar(open, {
      kind: objectAssistantKind,
      contentKey: objectKey,
      sidebarId: buildObjectAssistantSidebarId(objectAssistantKind, objectKey),
    });
  }, [
    appEditorUrl,
    close,
    isObjectAssistantOpen,
    navigate,
    objectAssistantKind,
    open,
    pageKey,
    routeAppKey,
  ]);

  const handleToggleFileDetails = useCallback(() => {
    if (!pageKey || !isFileContent) return;
    if (isFileDetailsOpen) {
      close();
      return;
    }
    open(<FileDetailsPanel pageKey={pageKey} />, {
      closeOnRouteChange: true,
      id: "fileDetails",
    });
  }, [pageKey, isFileContent, isFileDetailsOpen, open, close]);


  // ponytail: topbar 删除按钮直接走删除 + 回收站 toast，不再弹确认。
const handleOpenDeleteConfirm = useCallback(async () => {
    if (!deleteKey) {
      toast.error(t("deleteFailedInfoMissing"));
      return;
    }
    if (isDeletingFromTopbar) return;
    setIsMobileOverflowOpen(false);
    setIsDeletingFromTopbar(true);
    try {
      await dispatch(
        deleteDbKey(
          deleteServerOrigin
            ? {
                contentKey: deleteKey,
                serverOrigin: deleteServerOrigin,
                includeAttachments: deleteContext === "dialog",
              }
            : deleteContext === "dialog"
              ? {
                  contentKey: deleteKey,
                  includeAttachments: true,
                }
              : deleteKey,
          deleteSpaceId,
        ),
      );
      toast.success(t("deleteMovedToTrash", { title: finalDeleteTitle || deleteKey }));

      if (deleteRedirectTo) {
        navigate(deleteRedirectTo, { replace: true });
      } else {
        navigate(-1);
      }
    } catch (err) {
      const message = getDeleteErrorMessage(err, t("deleteFailed"));
      console.error("Failed to delete content:", message, err);
      toast.error(
        message === t("deleteFailed")
          ? message
          : `${t("deleteFailed")}: ${message}`,
      );
    } finally {
      setIsDeletingFromTopbar(false);
    }
  }, [
    deleteKey,
    deleteRedirectTo,
    deleteContext,
    deleteServerOrigin,
    deleteSpaceId,
    dispatch,
    finalDeleteTitle,
    isDeletingFromTopbar,
    navigate,
    t,
  ]);

  const handleConfirmDelete = handleOpenDeleteConfirm;

  const handleDeleteApp = useCallback(async (): Promise<boolean> => {
    if (!routeAppKey) return false;
    try {
      const ok = await (dispatch as any)(deleteDbKey(routeAppKey));
      if (!ok) return false;
      navigate("/");
      return true;
    } catch {
      return false;
    }
  }, [routeAppKey, dispatch, navigate]);

  // 键盘快捷键监听：删除当前会话
  useEffect(() => {
    if (!deleteShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!deleteKey || !deleteContext) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (matchShortcut(e, deleteShortcut)) {
        e.preventDefault();
        handleOpenDeleteConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteShortcut, deleteKey, deleteContext, handleOpenDeleteConfirm]);

  return {
    t,
    hasMounted,
    isLoggedIn,
    user,
    isMac,
    pageKey,
    routeAppKey,
    contentKeyType,
    tableMeta,
    canEditCurrentContent,
    appDetail,
    refetchApp,
    appPrimaryUrl,
    isAppEditMode,
    appEditorUrl,
    showVersionPanel,
    setShowVersionPanel,
    page,
    readOnly,
    saving,
    pending,
    isScrolled,
    isSidebarOpen,
    isMobileOverflowOpen,
    setIsMobileOverflowOpen,
    mobileOverflowPanelStyle,
    setMobileOverflowPanelStyle,
    isDeletingFromTopbar,
    mobileOverflowRef,
    mobileOverflowButtonRef,
    mobileOverflowPanelRef,
    sidebarToggleLabel,
    canEditPageContent,
    showPageEditActions,
    showMetaDeleteButton,
    showFileDeleteButton,
    showAgentDeleteButton,
    objectAssistantKind,
    showObjectAssistantAction,
    showAgentFavoriteButton,
    showContentFavoriteButton,
    showFavoriteButton,
    showShareButton,
    isFileContent,
    objectAssistantLabels,
    isObjectAssistantOpen,
    isAgentFavorited,
    toggleAgentFavorite,
    isFavorited,
    toggleFavoriteOnPage,
    currentDialog,
    isFileDetailsOpen,
    deleteContext,
    deleteKey,
    finalDeleteTitle,
    deleteConfirmationMessage,
    deleteSpaceId,
    deleteRedirectTo,
    showTableShareInOverflow: contentKeyType === "meta",
    tableShareActions,
    hasMobileOverflowActions,
    handleToggleSidebar,
    handleToggleEdit,
    handleSave,
    handleShare,
    isShareModalOpen,
    setIsShareModalOpen,
    shareModalLink,
    shareModalVisibility,
    shareModalCopied,
    isShareModalLoading,
    shareError,
    handleOpenShare,
    handlePublishCommunity,
    handleToggleObjectAssistant,
    handleToggleFileDetails,
    handleOpenDeleteConfirm,
    handleConfirmDelete,
    handleDeleteApp,
  };
};

import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
