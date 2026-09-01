// create/space/pages/SpaceContent.tsx
import "./SpaceContent.css";
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "app/routing";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { nanoid } from "nanoid";
import { toast } from "app/utils/toast"
import { useTranslation } from "react-i18next";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { addPendingFile } from "chat/dialog/dialogSlice";
import { useRightSidebar } from "render/layout/RightSidebarContext";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { buildObjectAssistantSidebarId } from "chat/dialog/objectAssistantRegistry";
import { isImageResourceLike } from "app/utils/fileUtils";
import FileDropZone from "../components/FileDropZone";
import { uploadAndAddFileToSpace } from "../content/contentThunks";
import { useSpaceData } from "../hooks/useSpaceData";
import { useAgentFetcher } from "../hooks/useAgentFetcher";
import SpaceContentList from "../components/SpaceContentList";
import Button from "render/web/ui/Button";
import SearchInput from "render/web/ui/SearchInput";
import { ContentType, SpaceContent as SpaceContentType } from "app/types";
import { DataType } from "create/types";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import { buildAppDetailPath } from "app/constants/appEditor";
import {
  buildRoutableContentPath,
  normalizeAppRouteId,
  resolveRoutableContentKey,
} from "create/space/contentKeyUtils";
import { CHAT_SIDEBAR_TYPE_META } from "create/space/contentTypeMeta";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";
import {
  LuChevronDown,
  LuFolderOpen,
  LuLayoutGrid,
  LuList,
  LuPaperclip,
} from "react-icons/lu";
import SpaceContentHeader from "./SpaceContentHeader";
import SpaceContentOverlays from "./SpaceContentOverlays";
import QuickChat from "app/pages/QuickChat";
import {
  areOnlySpaceAttachmentTypes,
  areSidebarVisibleTypesEqual,
  type SidebarVisibleType,
  parseSidebarVisibleTypesSearchParam,
  SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM,
  matchesSidebarVisibleTypes,
  pickSidebarVisibleTypes,
  serializeSidebarVisibleTypesSearchParam,
  SPACE_ALL_CONTENT_TYPES,
  SPACE_ATTACHMENT_SUB_TYPES,
  SPACE_FILE_TOPBAR_VISIBLE_TYPES,
  SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  withExclusiveSidebarVisibleType,
} from "create/space/sidebarVisibleTypes";

const ATTACHMENT_TOGGLE_ID = "attachment_toggle";

type ViewMode = "grid" | "list";
const DELETE_BATCH_CONCURRENCY = 4;
const isAgentContent = (item: SpaceContentType) =>
  item.type === ContentType.AGENT || item.contentKey.startsWith("agent-");
const isDialogContent = (item: SpaceContentType) =>
  item.type === ContentType.DIALOG || item.contentKey.startsWith("dialog-");
const isPageContent = (item: SpaceContentType) =>
  item.type === ContentType.DOC || item.contentKey.startsWith("page-");
const isImageContent = (item: SpaceContentType) =>
  isImageResourceLike({
    kind: item.type,
    fileCategory: item.fileCategory,
    fileName: item.title,
  }) ||
  item.contentKey.startsWith("image-");
const isAppContent = (item: SpaceContentType) =>
  item.type?.toLowerCase() === ContentType.APP || item.contentKey.startsWith("app-");
const isTaskContent = (item: SpaceContentType) =>
  item.type?.toLowerCase() === ContentType.TASK || item.contentKey.startsWith("task-");

const SpaceContent: React.FC = () => {
  const { spaceId } = useParams<"spaceId">();
  const { t } = useTranslation(["space", "common"]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { open } = useRightSidebar();
  const currentUserId = useUserId();
  const { spaceData, loading: spaceLoading } = useSpaceData(spaceId!);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isFilesRoute = useMemo(() => location.pathname.endsWith("/files"), [location.pathname]);
  const isAiRoute = useMemo(() => location.pathname.endsWith("/ai"), [location.pathname]);
  const isHomeRoute = useMemo(
    () => !isFilesRoute && !isAiRoute,
    [isFilesRoute, isAiRoute]
  );
  const routeTypes = useMemo(
    () =>
      parseSidebarVisibleTypesSearchParam(
        searchParams.get(SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM)
      ),
    [searchParams]
  );

  const selectedVisibleTypes = useMemo((): readonly SidebarVisibleType[] => {
    if (isAiRoute) {
      return ["agent"];
    }
    // Unified type universe (My Content style): primary + attachment sub-types.
    // /files defaults to all attachments; home defaults to everything.
    if (isFilesRoute) {
      return pickSidebarVisibleTypes(
        routeTypes,
        SPACE_ALL_CONTENT_TYPES,
        SPACE_FILE_TOPBAR_VISIBLE_TYPES,
      );
    }
    return pickSidebarVisibleTypes(
      routeTypes,
      SPACE_ALL_CONTENT_TYPES,
      SPACE_ALL_CONTENT_TYPES,
    );
  }, [isFilesRoute, isAiRoute, routeTypes]);

  const activeTabForList = useMemo(() => {
    if (isAiRoute) return "ai";
    if (areOnlySpaceAttachmentTypes(selectedVisibleTypes)) return "files";
    return "all";
  }, [isAiRoute, selectedVisibleTypes]);

  const viewMode = (searchParams.get("view") || "grid") as ViewMode;
  const setViewMode = (mode: ViewMode) =>
    setSearchParams((prev) => { prev.set("view", mode); return prev; }, { replace: true });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<SpaceContentType | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{ done: number; total: number } | null>(null);

  const urlSearch = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  useEffect(() => {
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchTerm.trim()) {
          next.set("q", searchTerm.trim());
        } else {
          next.delete("q");
        }
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setSearchParams]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);
  const deleteCancelRef = useRef(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const prevSortedRef = useRef<SpaceContentType[]>([]);

  // 动态更新网页 Document Title
  useEffect(() => {
    if (typeof document === "undefined") return;
    const spaceName = spaceData?.name || spaceId || "";
    let pageName = "";
    if (isFilesRoute) {
      pageName = t("files", "附件");
    } else if (isAiRoute) {
      pageName = t("ai", "AI");
    } else {
      pageName = t("myContent", "我的内容");
    }

    document.title = spaceName ? `${pageName} | ${spaceName} - Nolo` : `${pageName} - Nolo`;
  }, [isFilesRoute, isAiRoute, spaceData?.name, spaceId, t]);

  const baseItems = useMemo(() => {
    if (!spaceData?.contents) return [];

    const filtered = Object.values(spaceData.contents)
      .filter((item): item is SpaceContentType => {
        if (!item) return false;
        return matchesSidebarVisibleTypes(item, selectedVisibleTypes);
      });

    const filteredKeys = new Set(filtered.map((item) => item.contentKey));
    const prev = prevSortedRef.current;
    const prevKeys = new Set(prev.map((item) => item.contentKey));

    // 仅删除时（无新 key 加入），保持原有顺序，只移除已删除项，避免重排序导致闪烁
    const hasNewKeys = filtered.some((item) => !prevKeys.has(item.contentKey));
    if (!hasNewKeys && filteredKeys.size < prevKeys.size && prev.length > 0) {
      const result = prev.filter((item) => filteredKeys.has(item.contentKey));
      return result;
    }

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted;
  }, [selectedVisibleTypes, spaceData]);

  useEffect(() => {
    prevSortedRef.current = baseItems;
  }, [baseItems]);

  // 始终拉取空间里所有 agent 数据，让「空间默认 Agent」section 在任何 tab 下都能找到 agent 实体，
  // 跟当前 selectedVisibleTypes / tab 过滤解耦。baseItems 仍会过滤后传给列表渲染。
  const allAgentItems = useMemo(() => {
    if (!spaceData?.contents) return [];
    return Object.values(spaceData.contents).filter(
      (item): item is SpaceContentType =>
        !!item &&
        (item.type === ContentType.AGENT ||
          item.contentKey.startsWith("agent-"))
    );
  }, [spaceData?.contents]);

  // Use the new hook
  const {
    agentsMap,
    fetchAgents,
  } = useAgentFetcher(allAgentItems);

  const items = useMemo(() => {
    const searchLower = asTrimmedLowercaseString(debouncedSearch);
    if (!searchLower) return baseItems;
    return baseItems.filter((item) => {
      const agent = agentsMap.get(item.contentKey);
      const texts = [
        item.title,
        item.contentKey,
        item.fileCategory,
        agent?.name,
        agent?.introduction,
        ...(agent?.tags || []),
      ];
      return texts.some((t) => (t || "").toLowerCase().includes(searchLower));
    });
  }, [baseItems, agentsMap, debouncedSearch]);

  const hasActiveFilters = useMemo(() => {
    if (isAiRoute) return false;
    if (isFilesRoute) {
      return !areSidebarVisibleTypesEqual(
        selectedVisibleTypes,
        SPACE_FILE_TOPBAR_VISIBLE_TYPES,
      );
    }
    return !areSidebarVisibleTypesEqual(
      selectedVisibleTypes,
      SPACE_ALL_CONTENT_TYPES,
    );
  }, [isFilesRoute, isAiRoute, selectedVisibleTypes]);
  const isSelectionMode = selectedKeys.size > 0;

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleSelectItem = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === items.length
        ? new Set()
        : new Set(items.map((item) => item.contentKey))
    );
  }, [items]);

  const handleExitSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const applyVisibleTypes = useCallback(
    (nextTypes: readonly SidebarVisibleType[], defaultTypes: readonly SidebarVisibleType[]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const serialized = serializeSidebarVisibleTypesSearchParam(nextTypes);
        if (
          !serialized ||
          areSidebarVisibleTypesEqual(nextTypes, defaultTypes)
        ) {
          next.delete(SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM);
        } else {
          next.set(SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM, serialized);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const defaultVisibleTypes = isFilesRoute
    ? SPACE_FILE_TOPBAR_VISIBLE_TYPES
    : SPACE_ALL_CONTENT_TYPES;

  const handleResetFilters = useCallback(() => {
    applyVisibleTypes(defaultVisibleTypes, defaultVisibleTypes);
  }, [applyVisibleTypes, defaultVisibleTypes]);

  const handleToggleRouteVisibleType = useCallback(
    (type: SidebarVisibleType) => {
      const nextTypes = withExclusiveSidebarVisibleType(
        selectedVisibleTypes,
        type,
        SPACE_ALL_CONTENT_TYPES,
        defaultVisibleTypes,
      );
      applyVisibleTypes(nextTypes, defaultVisibleTypes);
    },
    [applyVisibleTypes, defaultVisibleTypes, selectedVisibleTypes]
  );

  // ── Tabs: same pattern as My Content (primary row + collapsible attachment chips) ──
  const primaryTabs = useMemo(() => {
    const order = SPACE_HOME_TOPBAR_VISIBLE_TYPES;
    return CHAT_SIDEBAR_TYPE_META.filter(
      ({ sidebarType }) => sidebarType && order.includes(sidebarType)
    )
      .sort(
        (a, b) =>
          order.indexOf(a.sidebarType as SidebarVisibleType) -
          order.indexOf(b.sidebarType as SidebarVisibleType)
      )
      .map(({ sidebarType, icon: Icon, shortLabelKey, shortDefaultLabel }) => ({
        id: sidebarType as string,
        icon: Icon,
        label: t(shortLabelKey, shortDefaultLabel),
      }));
  }, [t]);

  const attachmentTabs = useMemo(() => {
    const order = SPACE_ATTACHMENT_SUB_TYPES;
    return CHAT_SIDEBAR_TYPE_META.filter(
      ({ sidebarType }) => sidebarType && order.includes(sidebarType)
    )
      .sort(
        (a, b) =>
          order.indexOf(a.sidebarType as SidebarVisibleType) -
          order.indexOf(b.sidebarType as SidebarVisibleType)
      )
      .map(({ sidebarType, icon: Icon, shortLabelKey, shortDefaultLabel }) => ({
        id: sidebarType as string,
        icon: Icon,
        label: t(shortLabelKey, shortDefaultLabel),
      }));
  }, [t]);

  const isAttachmentFilterActive = areOnlySpaceAttachmentTypes(selectedVisibleTypes);
  const activeAttachmentSubType =
    selectedVisibleTypes.length === 1 &&
    areOnlySpaceAttachmentTypes(selectedVisibleTypes)
      ? selectedVisibleTypes[0]
      : null;

  const [showAttachmentTabs, setShowAttachmentTabs] = useState(
    () => isFilesRoute || isAttachmentFilterActive
  );

  useEffect(() => {
    if (isAttachmentFilterActive || isFilesRoute) {
      setShowAttachmentTabs(true);
    }
  }, [isAttachmentFilterActive, isFilesRoute]);

  const activePrimaryTabKey = useMemo(() => {
    if (isAttachmentFilterActive) return ATTACHMENT_TOGGLE_ID;
    if (selectedVisibleTypes.length === 1) return selectedVisibleTypes[0];
    return "all";
  }, [isAttachmentFilterActive, selectedVisibleTypes]);

  const handleSelectPrimaryType = useCallback(
    (type: SidebarVisibleType) => {
      handleToggleRouteVisibleType(type);
      if (!SPACE_ATTACHMENT_SUB_TYPES.includes(type)) {
        setShowAttachmentTabs(false);
      }
    },
    [handleToggleRouteVisibleType]
  );

  const handleAttachmentToggle = useCallback(() => {
    if (!isAttachmentFilterActive) {
      applyVisibleTypes(SPACE_ATTACHMENT_SUB_TYPES, defaultVisibleTypes);
      setShowAttachmentTabs(true);
      return;
    }
    setShowAttachmentTabs((prev) => !prev);
  }, [applyVisibleTypes, defaultVisibleTypes, isAttachmentFilterActive]);

  const handleDataTabChange = useCallback(
    (id: string) => {
      if (id === "all") {
        // "全部" = all content types (My Content style), leave /files if needed
        if (isFilesRoute && spaceId) {
          navigate(`/space/${spaceId}`);
        }
        applyVisibleTypes(SPACE_ALL_CONTENT_TYPES, SPACE_ALL_CONTENT_TYPES);
        setShowAttachmentTabs(false);
        return;
      }
      if (id === ATTACHMENT_TOGGLE_ID) {
        handleAttachmentToggle();
        return;
      }
      handleSelectPrimaryType(id as SidebarVisibleType);
    },
    [
      applyVisibleTypes,
      handleAttachmentToggle,
      handleSelectPrimaryType,
      isFilesRoute,
      navigate,
      spaceId,
    ]
  );

  const handleAttachmentSubTab = useCallback(
    (type: SidebarVisibleType) => {
      applyVisibleTypes([type], defaultVisibleTypes);
      setShowAttachmentTabs(true);
    },
    [applyVisibleTypes, defaultVisibleTypes]
  );

  const handleBackToTop = useCallback(() => {
    contentBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = contentBodyRef.current;
    if (!el) return;

    const onScroll = () => {
      const nextVisible = el.scrollTop > 260;
      setShowBackToTop((prev) => (prev === nextVisible ? prev : nextVisible));
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleBatchOcr = useCallback(async () => {
    const imageKeys = Array.from(selectedKeys).filter(key => {
      const item = items.find(i => i.contentKey === key);
      return item?.type === "image" || item?.fileCategory === "image";
    });

    if (imageKeys.length === 0) {
      toast.error("请选择图片文件");
      return;
    }

    setOcrProgress({ done: 0, total: imageKeys.length });

    // 并发限制：每次最多 5 个
    const CONCURRENCY = 5;
    for (let i = 0; i < imageKeys.length; i += CONCURRENCY) {
      const batch = imageKeys.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (key) => {
          const item = items.find(it => it.contentKey === key);
          try {
            const res = await fetch("/api/olm-ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: key }),
            });
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || "";

            dispatch(addPendingFile({
              id: nanoid(),
              name: item?.title || key,
              type: "ocr_text",
              ocrText: text,
            }));
          } catch (err) {
            console.error(err);
            toast.error(`OCR 失败：${item?.title || key}`);
          } finally {
            setOcrProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null);
          }
        })
      );
    }

    setOcrProgress(null);
    toast.success(`OCR 完成，${imageKeys.length} 张图片已加入对话`);
    handleExitSelection();
    openObjectAssistantSidebar(open, {
      kind: "image",
      sidebarId: buildObjectAssistantSidebarId("image", "selection"),
    });
  }, [selectedKeys, items, dispatch, open]);

  const buildContentRoute = useCallback(
    (item: Pick<SpaceContentType, "contentKey" | "type">) => {
      if (item.type?.toLowerCase() === ContentType.APP || item.contentKey.startsWith("app-")) {
        return buildAppDetailPath(normalizeAppRouteId(item.contentKey), spaceId);
      }
      return buildRoutableContentPath({
        contentKey: item.contentKey,
        type: item.type,
        userId: currentUserId,
        spaceId,
      });
    },
    [spaceId, currentUserId]
  );

  const handleOpen = useCallback(
    (item: SpaceContentType) => {
      if (isSelectionMode) {
        toggleSelectItem(item.contentKey);
        return;
      }

      if (
        isDialogContent(item) ||
        isAgentContent(item) ||
        isPageContent(item) ||
        isImageContent(item) ||
        isAppContent(item) ||
        isTaskContent(item)
      ) {
        navigate(buildContentRoute(item));
        return;
      }

      setPreviewItem(item);
    },
    [isSelectionMode, navigate, buildContentRoute]
  );

  const handlePreview = useCallback(
    (item: SpaceContentType) => {
      if (isSelectionMode) {
        toggleSelectItem(item.contentKey);
        return;
      }

      if (isDialogContent(item) || isAgentContent(item) || isAppContent(item) || isTaskContent(item)) {
        navigate(buildContentRoute(item));
        return;
      }

      setPreviewItem(item);
    },
    [isSelectionMode, navigate, buildContentRoute]
  );

  const handleOpenPreviewPage = useCallback(() => {
    if (!previewItem) return;
    navigate(buildContentRoute(previewItem));
    setPreviewItem(null);
  }, [previewItem, navigate, buildContentRoute]);

  const previewRouteKey = useMemo(
    () =>
      previewItem
        ? resolveRoutableContentKey(
            previewItem.contentKey,
            previewItem.type,
            currentUserId
          )
        : "",
    [previewItem, currentUserId]
  );

  // ponytail: 删除改为直接触发，不再走确认弹窗。
  const runDelete = useCallback(
    async (type: "single" | "multiple", key?: string) => {
      if (!spaceId || isDeleting) return;
      if (type === "multiple") {
        if (selectedKeys.size === 0) return;
      } else if (!key) {
        return;
      }

      setIsDeleting(true);
      try {
        if (type === "multiple") {
          const keys = Array.from(selectedKeys);
          deleteCancelRef.current = false;
          setDeleteProgress({ done: 0, total: keys.length });
          const queue = [...keys];
          const workers = Array.from(
            { length: Math.min(DELETE_BATCH_CONCURRENCY, queue.length) },
            async () => {
              while (queue.length > 0) {
                if (deleteCancelRef.current) return;
                const nextKey = queue.shift();
                if (!nextKey) continue;
                await (dispatch as any)(deleteDbKey(nextKey, spaceId));
                setDeleteProgress((prev) =>
                  prev ? { ...prev, done: prev.done + 1 } : prev
                );
              }
            }
          );
          await Promise.all(workers);
          if (deleteCancelRef.current) {
            toast(t("batchDeleteCancelled", "Batch delete cancelled"));
          } else {
            toast.success(
              t("deleteMovedToTrashBatch", "{{count}} items moved to Recycle Bin", {
                count: selectedKeys.size,
              })
            );
            setSelectedKeys(new Set());
          }
        } else {
          const deletedItem = baseItems.find((it) => it.contentKey === key);
          const safeTitle = deletedItem?.title || key;
          await (dispatch as any)(deleteDbKey(key!, spaceId));
          toast.success(
            t("deleteMovedToTrash", {
              title: safeTitle,
            })
          );
        }
      } catch (err) {
        const message = getDeleteErrorMessage(err, t("deleteFailed"));
        toast.error(message === t("deleteFailed") ? message : `${t("deleteFailed")}: ${message}`);
      } finally {
        deleteCancelRef.current = false;
        setDeleteProgress(null);
        setIsDeleting(false);
      }
    },
    [spaceId, isDeleting, selectedKeys, baseItems, dispatch, t]
  );

  const handleDeleteRequest = useCallback(
    (item: SpaceContentType) => {
      void runDelete("single", item.contentKey);
    },
    [runDelete]
  );

  const handleDeleteSelected = useCallback(() => {
    void runDelete("multiple");
  }, [runDelete]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesAdded = async (files: File[]) => {
    if (!spaceId || files.length === 0) return;
    setUploading(true);
    try {
      // Note:
      // Large files (for example oversized PDFs) should move to a dedicated async ingestion
      // pipeline in the future instead of blocking this immediate upload path.
      const results = await Promise.allSettled(
        files.map((file) =>
          (dispatch as any)(uploadAndAddFileToSpace({ spaceId, file }))
        )
      );
      const failedFiles = files.filter(
        (_, index) => results[index].status === "rejected"
      );
      if (failedFiles.length === 0) {
        toast.success(t("uploadSuccess"));
      } else {
        const succeededCount = files.length - failedFiles.length;
        toast.error(
          <span>
            {succeededCount > 0
              ? t("uploadPartial", {
                  succeeded: succeededCount,
                  failed: failedFiles.length,
                })
              : t("uploadFailed")}
            <button
              type="button"
              onClick={() => void handleFilesAdded(failedFiles)}
              style={{
                marginLeft: 8,
                padding: 0,
                border: "none",
                background: "none",
                color: "inherit",
                font: "inherit",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {t("retry")}
            </button>
          </span>,
          { timeout: 8000 }
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const previewType = (previewItem?.type as string | undefined)?.toLowerCase();
  const previewIsTable = !!previewItem && (previewType === "table" || previewType === DataType.TABLE);
  const previewIsDocx = !!previewItem && (previewItem.title?.toLowerCase?.().endsWith(".docx") ?? false);
  const previewIsImage =
    !!previewItem &&
    (previewType === "image" ||
      previewType === DataType.IMAGE ||
      isImageResourceLike({
        kind: previewItem.type,
        fileCategory: previewItem.fileCategory,
        fileName: previewItem.title,
      }));
  const previewIsPage =
    !!previewItem && (previewType === "page" || previewItem.contentKey.startsWith("page-"));

  return (
    <FileDropZone onFilesAdded={handleFilesAdded}>
      <div className="space-content">
          <SpaceContentHeader
            ocrProgress={ocrProgress}
            isSelectionMode={isSelectionMode}
            selectedCount={selectedKeys.size}
            totalCount={items.length}
            onSelectAll={handleSelectAll}
            onBatchOcr={handleBatchOcr}
            onDeleteSelected={handleDeleteSelected}
            onExitSelection={handleExitSelection}
            t={t}
          />


        <div className="content-body" ref={contentBodyRef}>
          {/* Search is always on: inline in the data-section header (no extra row).
              On /ai (no data section) keep a single compact toolbar only. */}
          {isAiRoute && (
            <div className="content-toolbar content-toolbar--compact">
              <div className="content-toolbar__search">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onSearch={() => {}}
                  onClear={handleSearchClear}
                  placeholder={t("search_placeholder", "搜索内容...")}
                  className="space-content-search"
                  size="small"
                />
              </div>
            </div>
          )}
          {isHomeRoute && spaceId ? (
            <section
              className="space-content__quick-chat"
              data-testid="space-home-quick-chat"
              aria-label={t("quickChat.spaceHomeLabel", "快速对话")}
            >
              <QuickChat surface="space-home-compact" spaceId={spaceId} />
            </section>
          ) : null}
          {!isAiRoute && (
            <section className="space-content__data-section">
              <div className="space-content__data-section-header">
                <h2 className="space-content__data-section-title">
                  {t("spaceData", "空间的数据")}
                </h2>
                <div className="space-content__header-actions">
                  <div className="space-content__header-search">
                    <SearchInput
                      value={searchTerm}
                      onChange={setSearchTerm}
                      onSearch={() => {}}
                      onClear={handleSearchClear}
                      placeholder={t("search_placeholder", "搜索内容...")}
                      className="space-content-search"
                      size="small"
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={handleResetFilters}
                    >
                      {t("clearFilters")}
                    </Button>
                  )}
                  <div className="space-view-toggle" role="group" aria-label={t("viewMode", "视图")}>
                    <button
                      type="button"
                      className={`space-view-btn${viewMode === "grid" ? " is-active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title={t("gridView", "网格视图")}
                      aria-label={t("gridView", "网格视图")}
                      aria-pressed={viewMode === "grid"}
                    >
                      <LuLayoutGrid size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`space-view-btn${viewMode === "list" ? " is-active" : ""}`}
                      onClick={() => setViewMode("list")}
                      title={t("listView", "列表视图")}
                      aria-label={t("listView", "列表视图")}
                      aria-pressed={viewMode === "list"}
                    >
                      <LuList size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <Tabs
                selectedKey={activePrimaryTabKey}
                onSelectionChange={(key) => handleDataTabChange(key as string)}
                className="space-data-tabs react-aria-Tabs"
              >
                <div className="space-data-tabs-wrapper">
                  <TabList
                    aria-label={t("spaceData", "空间的数据")}
                    className="react-aria-TabList space-data-tabs__list"
                  >
                    <Tab
                      id="all"
                      className={`react-aria-Tab space-data-tab${activePrimaryTabKey === "all" ? " is-active" : ""}`}
                    >
                      <LuFolderOpen size={14} aria-hidden="true" />
                      <span>{t("all", "全部")}</span>
                    </Tab>
                    {primaryTabs.map(({ id, icon: Icon, label }) => (
                      <Tab
                        key={id}
                        id={id}
                        className={`react-aria-Tab space-data-tab${activePrimaryTabKey === id ? " is-active" : ""}`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        <span>{label}</span>
                      </Tab>
                    ))}
                    <Tab
                      id={ATTACHMENT_TOGGLE_ID}
                      className={`react-aria-Tab space-data-tab space-data-tab--attachment${isAttachmentFilterActive ? " is-active" : ""}${showAttachmentTabs ? " is-expanded" : ""}`}
                    >
                      <LuPaperclip size={14} aria-hidden="true" />
                      <span>{t("attachments_toggle", "附件")}</span>
                      <LuChevronDown
                        size={12}
                        className={`space-data-tab__chevron${showAttachmentTabs ? " is-open" : ""}`}
                        aria-hidden="true"
                      />
                    </Tab>
                  </TabList>
                  <div
                    className={`space-data-sub-tabs${showAttachmentTabs ? " is-open" : ""}`}
                    aria-hidden={!showAttachmentTabs}
                  >
                    {attachmentTabs.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={`space-data-sub-tab${activeAttachmentSubType === id ? " is-active" : ""}`}
                        onClick={() =>
                          handleAttachmentSubTab(id as SidebarVisibleType)
                        }
                        aria-pressed={activeAttachmentSubType === id}
                      >
                        <Icon size={12} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </Tabs>
            </section>
          )}
          <SpaceContentList
            items={items}
            loading={spaceLoading}
            viewMode={viewMode}
            onPreview={handlePreview}
            onOpen={handleOpen}
            onDelete={handleDeleteRequest}
            isSelectionMode={isSelectionMode}
            selectedKeys={selectedKeys}
            onSelectItem={toggleSelectItem}
            agentsMap={agentsMap}
            activeTab={activeTabForList}
            selectedTypes={selectedVisibleTypes}
            onUploadClick={handleUploadClick}
            searchQuery={debouncedSearch}
          />
        </div>

        <SpaceContentOverlays
          showBackToTop={showBackToTop}
          onBackToTop={handleBackToTop}
          t={t}
          fileInputRef={fileInputRef}
          onFilesAdded={handleFilesAdded}
          previewItem={previewItem}
          previewIsTable={previewIsTable}
          previewIsDocx={previewIsDocx}
          previewIsImage={previewIsImage}
          previewIsPage={previewIsPage}
          previewRouteKey={previewRouteKey}
          onClosePreview={() => setPreviewItem(null)}
          onOpenPreviewPage={handleOpenPreviewPage}
        />

        
      </div >
    </FileDropZone >
  );
};

export default SpaceContent;
