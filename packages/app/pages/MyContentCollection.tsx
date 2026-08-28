import "./MyContentCollection.css";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  LuCheck,
  LuFile,
  LuChevronDown,
  LuImage,
  LuPaperclip,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";

import { useAppDispatch } from "app/store";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import Button from "render/web/ui/Button";
import { toast } from "app/utils/toast"
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { deleteDbKey, getDeleteErrorMessage } from "app/hooks/deleteDbKey";
import {
  getMyContentBatchDeleteCopy,
  getMyContentBatchItemNoun,
  MY_CONTENT_BATCH_TABS,
  shouldIncludeAttachmentsOnBatchDelete,
} from "./myContentBatchManage";
import { MyContentSelectableCard } from "./MyContentSelectableCard";
import {
  GridList,
  GridListItem,
  Virtualizer,
  GridLayout,
  Size,
} from "react-aria-components";
import ImagePreviewFetcher from "create/space/components/ImagePreviewFetcher";
import { useContentImageSrc } from "create/space/components/useContentImageSrc";
import {
  buildAppDetailPath,
  buildAppEditorPath,
} from "app/constants/appEditor";
import {
  MY_CONTENT_FILTERS,
  PRIMARY_CONTENT_FILTERS,
  ATTACHMENT_SUB_FILTERS,
  ATTACHMENT_SUB_TAB_IDS,
} from "app/constants/mySections";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useFetchData } from "app/hooks";
import AppCard from "app/components/AppCard";
import { useUserId } from "identity";
import {
  buildRoutableContentPath,
  normalizeAppRouteId,
} from "create/space/contentKeyUtils";
import AgentBlock from "ai/agent/web/AgentBlock";
import AgentAvatar from "ai/agent/web/AgentAvatar";
import {
  buildOwnedAppContentItems,
  buildMyContentPreviewItems,
  type ContentTab,
  type MyContentListItem,
  resolveMyContentTab,
} from "app/utils/myContentItems";
import { getCompactFileMetaLabel } from "app/utils/fileUtils";
import type { Agent } from "app/types";
import type { AppSummary } from "app/types/appSummary";
import { useMyAppActions, useMyAppListData } from "app/hooks/useMyApps";
import { getSpaceContentTypeLabel } from "create/space/contentLabels";

/** Space-style selection circle; toggle is also available via card onAction. */
const SelectionCheck = ({
  selected,
  onToggle,
}: {
  selected: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className={`MyContentCollection__selection-check${selected ? " is-checked" : ""}`}
    aria-label={selected ? "deselect" : "select"}
    aria-pressed={selected}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    }}
  >
    {selected ? <LuCheck size={12} strokeWidth={3} aria-hidden="true" /> : null}
  </button>
);

const MyContentImageCard = ({
  item,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: {
  item: MyContentListItem;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) => {
  const { t: tSpace } = useTranslation("space");
  const { imageSrc, loadImageFallback } = useContentImageSrc(item);
  const typeLabel = getSpaceContentTypeLabel(item, tSpace);
  const originalName =
    "originalName" in item ? item.originalName : undefined;
  const mimeType = "mimeType" in item ? item.mimeType : undefined;
  const fileSize = "fileSize" in item ? item.fileSize : undefined;
  const fileMetaLabel = getCompactFileMetaLabel({
    fileName: originalName || item.title,
    mimeType,
    fileSize,
  });

  return (
    <div
      className={`MyContentCollection__card content-block--image${
        isSelectionMode ? " is-selection-mode" : ""
      }${isSelected ? " is-selected" : ""}`}
      data-type="image"
      data-selected={isSelected ? "true" : "false"}
    >
      <div className="content-block__preview">
        {isSelectionMode ? (
          <div className="MyContentCollection__checkbox-wrapper">
            <SelectionCheck
              selected={!!isSelected}
              onToggle={() => onToggleSelect?.()}
            />
          </div>
        ) : null}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.title}
            className="content-block__img"
            loading="lazy"
            draggable={false}
            onError={() => {
              void loadImageFallback();
            }}
          />
        ) : (
          <div className="MyContentCollection__image-fallback">
            <LuImage size={32} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="content-block__info">
        <div className="content-block__title" title={item.title}>
          {item.title || tSpace("unnamed", "未命名")}
        </div>
        <div className="content-block__meta">
          <span>{typeLabel}</span>
          {fileMetaLabel ? <span>{fileMetaLabel}</span> : null}
          <span>{new Date(item.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

interface MyContentCollectionProps {
  limit?: number;
  showSearch?: boolean;
  activeTab?: ContentTab;
  onTabChange?: (tab: ContentTab) => void;
}

const buildFallbackAgent = (item: MyContentListItem): Agent => ({
  id: item.contentKey,
  dbKey: item.contentKey,
  name: item.title,
  userId: "",
  provider: "",
  model: "",
  useServerProxy: true,
  updatedAt: String(item.updatedAt ?? ""),
  createdAt:
    typeof item.createdAt === "number"
      ? item.createdAt
      : Date.parse(String(item.createdAt)) || Date.now(),
  isPublic: false,
});

const MyContentDialogCard = ({
  item,
  contentLabel,
  Icon,
  tSpace,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: {
  item: MyContentListItem;
  contentLabel: string;
  Icon: any;
  tSpace: any;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) => {
  const { t } = useTranslation();
  const agentKey =
    ("primaryAgentKey" in item ? item.primaryAgentKey : undefined) ||
    ("cybots" in item ? item.cybots?.[0] : undefined);
  const { data: agent } = useFetchData<Agent>(agentKey || "");

  // If title looks like an ID or is exactly the contentKey, we can fallback
  let displayTitle = item.title || tSpace("unnamed", "未命名");
  if (displayTitle === item.contentKey) {
    displayTitle = tSpace("unnamed_dialog", "无标题对话");
  }

  return (
    <div
      className={`MyContentCollection__card MyContentCollection__dialog-card${
        isSelectionMode ? " is-selection-mode" : ""
      }${isSelected ? " is-selected" : ""}`}
      data-type="dialog"
      data-selected={isSelected ? "true" : "false"}
    >
      {isSelectionMode ? (
        <div className="MyContentCollection__checkbox-wrapper">
          <SelectionCheck
            selected={!!isSelected}
            onToggle={() => onToggleSelect?.()}
          />
        </div>
      ) : null}
      <div className="MyContentCollection__dialog-header">
        <div className="MyContentCollection__dialog-agent">
          {agent ? (
            <>
              <AgentAvatar
                agent={agent}
                size={24}
                avatarSize="small"
                className="MyContentCollection__dialog-avatar"
              />
              <span
                className="MyContentCollection__dialog-agent-name"
                title={agent.name}
              >
                {agent.name || agentKey}
              </span>
            </>
          ) : (
            <>
              <div className="MyContentCollection__dialog-icon" aria-hidden="true">
                <Icon size={14} />
              </div>
              <span className="MyContentCollection__dialog-agent-name">
                {t("unknown_agent", "未知对话")}
              </span>
            </>
          )}
        </div>
        {item.spaceName &&
          item.spaceName !== t("homeTabs.myContent", "我的内容") && (
            <span className="MyContentCollection__space">{item.spaceName}</span>
          )}
      </div>

      <div
        className="MyContentCollection__title MyContentCollection__dialog-title"
        title={item.title}
      >
        {displayTitle}
      </div>

      <div className="MyContentCollection__meta">
        <div className="MyContentCollection__meta-left">
          <span className="MyContentCollection__type">{contentLabel}</span>
        </div>
        <span className="MyContentCollection__time">
          {new Date(item.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

type SelectableCardProps = Omit<
  React.ComponentProps<typeof MyContentSelectableCard>,
  "dataType"
>;

const MyContentTableCard = (props: SelectableCardProps) => (
  <MyContentSelectableCard {...props} dataType="table" />
);

const MyContentPageCard = (props: SelectableCardProps) => (
  <MyContentSelectableCard {...props} dataType="page" />
);

const MyContentAgentCard = ({ item }: { item: MyContentListItem }) => {
  const {
    data: agent,
    isLoading,
    error,
    reload,
  } = useFetchData<Agent>(item.contentKey);
  const fallbackAgent = buildFallbackAgent(item);

  return (
    <div className="MyContentCollection__agent-card">
      <AgentBlock
        item={agent || fallbackAgent}
        reload={reload ?? (() => Promise.resolve())}
      />
    </div>
  );
};

const MyContentCollection: React.FC<MyContentCollectionProps> = ({
  limit,
  showSearch = false,
  activeTab: controlledActiveTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const { t: tSpace } = useTranslation("space");
  const navigate = useNavigate();
  const userId = useUserId();
  const { items: allItems, loading: itemsLoading } = useMyContentItems();
  const shouldDebugLog =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  const [internalActiveTab, setInternalActiveTab] = useState<ContentTab>(
    controlledActiveTab ?? "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachmentTabs, setShowAttachmentTabs] = useState(
    controlledActiveTab
      ? controlledActiveTab === "attachment" ||
          ATTACHMENT_SUB_TAB_IDS.has(controlledActiveTab)
      : false,
  );

  useEffect(() => {
    if (controlledActiveTab) {
      setInternalActiveTab(controlledActiveTab);
      if (
        controlledActiveTab === "attachment" ||
        ATTACHMENT_SUB_TAB_IDS.has(controlledActiveTab)
      ) {
        setShowAttachmentTabs(true);
      }
    }
  }, [controlledActiveTab]);

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const isAppsManageView = activeTab === "app";

  const dispatch = useAppDispatch();
  // Selection mode + keys co-located so tab reset / exit are one update.
  const [selection, setSelection] = useState<{
    mode: boolean;
    keys: Set<string>;
  }>({ mode: false, keys: new Set() });
  const isSelectionMode = selection.mode;
  const selectedKeys = selection.keys;

  // Reset selection when tab changes
  useEffect(() => {
    setSelection({ mode: false, keys: new Set() });
  }, [activeTab]);

  const {
    apps: managedApps,
    setApps: setManagedApps,
    loading: appsLoading,
  } = useMyAppListData(null, { enabled: isAppsManageView });

  const { deleteApp, shareApp, bindDomain, unbindDomain, listDomains } =
    useMyAppActions({ setApps: setManagedApps });

  const tabs = useMemo(
    () =>
      MY_CONTENT_FILTERS.map((tab) => ({
        ...tab,
        label: tSpace(tab.shortLabelKey, tab.shortDefaultLabel),
      })),
    [tSpace],
  );

  const primaryTabs = useMemo(
    () =>
      PRIMARY_CONTENT_FILTERS.map((tab) => ({
        ...tab,
        label: tSpace(tab.shortLabelKey, tab.shortDefaultLabel),
      })),
    [tSpace],
  );

  const attachmentTabs = useMemo(
    () =>
      ATTACHMENT_SUB_FILTERS.map((tab) => ({
        ...tab,
        label: tSpace(tab.shortLabelKey, tab.shortDefaultLabel),
      })),
    [tSpace],
  );

  const isAttachmentTabActive =
    activeTab === "attachment" ||
    activeTab === "file" ||
    ATTACHMENT_SUB_TAB_IDS.has(activeTab);
  const appManageItems = useMemo(
    () =>
      buildOwnedAppContentItems(
        managedApps,
        t("homeActions.myAppsTitle", "我的应用"),
      ),
    [managedApps, t],
  );
  
  const [previewImage, setPreviewImage] = useState<{ contentKey: string; title: string } | null>(null);

  const sourceItems = isAppsManageView ? appManageItems : allItems;

  const filteredItems = useMemo(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    return sourceItems.filter((item) => {
      const itemTab = resolveMyContentTab(item);
      if (activeTab !== "all") {
        if (activeTab === "attachment") {
          if (!ATTACHMENT_SUB_TAB_IDS.has(itemTab)) {
            return false;
          }
        } else if (itemTab !== activeTab) {
          return false;
        }
      }
      if (!query) return true;

      return (
        item.title?.toLowerCase().includes(query) ||
        item.spaceName?.toLowerCase().includes(query)
      );
    });
  }, [activeTab, searchQuery, sourceItems]);

  const visibleItems = useMemo(
    () => buildMyContentPreviewItems(filteredItems, limit, activeTab),
    [filteredItems, limit, activeTab],
  );

  const supportsBatchManage = MY_CONTENT_BATCH_TABS.includes(activeTab);
  const batchItemNoun = getMyContentBatchItemNoun(activeTab, t);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const visibleContentKeys = useMemo(
    () => visibleItems.map((item) => item.contentKey),
    [visibleItems],
  );
  const allVisibleSelected =
    visibleContentKeys.length > 0 &&
    visibleContentKeys.every((key) => selectedKeys.has(key));

  const exitSelectionMode = useCallback(() => {
    setSelection({ mode: false, keys: new Set() });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      setSelection((current) => ({ ...current, keys: new Set() }));
      return;
    }
    setSelection((current) => ({
      ...current,
      keys: new Set(visibleContentKeys),
    }));
  }, [allVisibleSelected, visibleContentKeys]);

  const batchDeleteCopy = useMemo(
    () => getMyContentBatchDeleteCopy(activeTab, selectedKeys.size, t),
    [activeTab, selectedKeys.size, t],
  );

  const runBatchDelete = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    setIsBatchDeleting(true);
    try {
      for (const contentKey of selectedKeys) {
        await (dispatch as any)(
          deleteDbKey({
            contentKey,
            serverOrigin: visibleItems.find(
              (item) => item.contentKey === contentKey,
            )?.serverOrigin,
            ...(shouldIncludeAttachmentsOnBatchDelete(activeTab)
              ? { includeAttachments: true }
              : {}),
          }),
        );
      }
      toast.success(t("myContentBatch.deleteSuccess", "已删除所选内容"));
      setIsBatchDeleteModalOpen(false);
      exitSelectionMode();
    } catch (err) {
      toast.error(
        getDeleteErrorMessage(
          err,
          t("myContentBatch.deleteFailed", "删除失败，请稍后重试"),
        ),
      );
    } finally {
      setIsBatchDeleting(false);
    }
  }, [activeTab, dispatch, exitSelectionMode, selectedKeys, t, visibleItems]);
  const managedAppByKey = useMemo(
    () =>
      new Map(
        managedApps.map(
          (app) => [app.appKey ?? app.appId ?? app.name, app] as const,
        ),
      ),
    [managedApps],
  );
  const handleDeleteOwnedApp = async (app: AppSummary) => {
    const deleted = await deleteApp(app);
    if (!deleted) return false;
    return true;
  };

  const activeTabLabel = useMemo(
    () =>
      activeTab === "attachment"
        ? tSpace("homeTabs.myAttachments", "附件")
        : (tabs.find((tab) => tab.id === activeTab)?.label ?? tSpace("all")),
    [activeTab, tabs, tSpace],
  );

  const buildContentTarget = (item: MyContentListItem): string => {
    const itemTab = resolveMyContentTab(item);

    if (itemTab === "app") {
      if ("source" in item && item.source === "owned-app") {
        return buildAppDetailPath(
          normalizeAppRouteId(item.contentKey),
          undefined,
          item.serverOrigin ?? item.app.serverOrigin,
        );
      }
      return buildAppDetailPath(
        normalizeAppRouteId(item.contentKey),
        item.spaceId,
        item.serverOrigin,
      );
    }

    return buildRoutableContentPath({
      contentKey: item.contentKey,
      type: item.type,
      userId: userId ?? undefined,
      spaceId: item.spaceId,
    });
  };

  const buildAppEditorTarget = (item: MyContentListItem): string => {
    return buildAppEditorPath(
      normalizeAppRouteId(item.contentKey),
      item.spaceId,
      item.serverOrigin,
    );
  };

  const handleTabChange = useCallback(
    (tab: ContentTab) => {
      if (controlledActiveTab === undefined) {
        setInternalActiveTab(tab);
      }
      onTabChange?.(tab);
      // Selecting a primary tab auto-collapses the attachment row, unless it's the 'file' tab itself
      if (!ATTACHMENT_SUB_TAB_IDS.has(tab) && tab !== "file") {
        setShowAttachmentTabs(false);
      }
    },
    [controlledActiveTab, onTabChange],
  );

  const handleAttachmentClick = useCallback(() => {
    if (!isAttachmentTabActive) {
      handleTabChange("attachment");
      setShowAttachmentTabs(true);
    } else {
      setShowAttachmentTabs((prev) => !prev);
    }
  }, [isAttachmentTabActive, handleTabChange]);

  useEffect(() => {
    if (!shouldDebugLog) return;
    const countByTab = (items: MyContentListItem[]) =>
      items.reduce<Record<string, number>>((acc, item) => {
        const tab = resolveMyContentTab(item);
        acc[tab] = (acc[tab] ?? 0) + 1;
        return acc;
      }, {});

    const payload = {
      activeTab,
      limit: typeof limit === "number" ? limit : null,
      totalItems: sourceItems.length,
      filteredItems: filteredItems.length,
      visibleItems: visibleItems.length,
      allByTab: countByTab(sourceItems),
      filteredByTab: countByTab(filteredItems),
      visibleByTab: countByTab(visibleItems),
    };
    console.debug("[my-content] collection preview", payload);
    (window as any).__myContentDebug = payload;
  }, [
    activeTab,
    filteredItems,
    limit,
    shouldDebugLog,
    sourceItems,
    visibleItems,
  ]);

  const batchLabels = {
    selectAll: t("myContentBatch.selectAll", "全选"),
    deselectAll: t("myContentBatch.deselectAll", "取消全选"),
    selected: t(
      "myContentBatch.selectedCount",
      "已选择 {{count}} 个{{noun}}",
    ),
    total: t("myContentBatch.totalCount", "共 {{count}} 个{{noun}}"),
    deleteSelected: t("myContentBatch.deleteSelected", "删除所选"),
    cancel: t("myContentBatch.cancel", "取消"),
    batchManage: t("myContentBatch.manage", "批量管理"),
  };

  /**
   * RAC Virtualizer caches cells by item identity. Selection must be part of
   * the item so cells re-render when selectedKeys / selection mode flip.
   */
  const gridItems = useMemo(
    () =>
      visibleItems.map((item) => ({
        ...item,
        id: item.contentKey,
        __selecting: isSelectionMode,
        __selected: selectedKeys.has(item.contentKey),
      })),
    [visibleItems, isSelectionMode, selectedKeys],
  );

  const toggleSelectKey = useCallback((key: string) => {
    setSelection((prev) => {
      const next = new Set(prev.keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, keys: next };
    });
  }, []);

  return (
    <div
      className={`MyContentCollection${isSelectionMode ? " is-selecting" : ""}`}
    >
      {/* Row 1: search always full width; 批量管理 only when not selecting */}
      <div className="MyContentCollection__toolbar">
        {showSearch ? (
          <div className="MyContentCollection__search">
            <LuSearch
              size={15}
              className="MyContentCollection__search-icon"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={tSpace("search_placeholder", "搜索内容...")}
              className="MyContentCollection__search-input"
            />
          </div>
        ) : (
          <div className="MyContentCollection__toolbar-spacer" />
        )}

        {supportsBatchManage &&
        visibleItems.length > 0 &&
        !isSelectionMode ? (
          <Button
            variant="secondary"
            size="small"
            className="MyContentCollection__batch-entry"
            onClick={() =>
              setSelection((current) => ({ ...current, mode: true }))
            }
          >
            {batchLabels.batchManage}
          </Button>
        ) : null}
      </div>

      {/* Selection chrome: own full-width row — never squeeze search */}
      {supportsBatchManage && isSelectionMode ? (
        <div className="MyContentCollection__selection-bar" role="toolbar">
          <div className="MyContentCollection__selection-bar-start">
            <Button
              variant="ghost"
              size="small"
              onClick={toggleSelectAllVisible}
            >
              {allVisibleSelected
                ? batchLabels.deselectAll
                : batchLabels.selectAll}
            </Button>
            <span className="MyContentCollection__batch-bar-meta">
              {batchLabels.selected
                .replace("{{count}}", String(selectedKeys.size))
                .replace("{{noun}}", batchItemNoun)}
            </span>
          </div>
          <div className="MyContentCollection__selection-bar-actions">
            <Button
              variant="danger"
              size="small"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              disabled={selectedKeys.size === 0 || isBatchDeleting}
              loading={isBatchDeleting}
              icon={<LuTrash2 size={14} aria-hidden="true" />}
            >
              {batchLabels.deleteSelected}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={exitSelectionMode}
              disabled={isBatchDeleting}
            >
              {batchLabels.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Row 2: primary tabs; attachment chips hang under without an extra "island" */}
      <Tabs
        selectedKey={isAttachmentTabActive ? "attachment_toggle" : activeTab}
        onSelectionChange={(key) => {
          if (key === "attachment_toggle") {
            handleAttachmentClick();
          } else {
            handleTabChange(key as ContentTab);
          }
        }}
      >
        <div className="MyContentCollection__tabs-wrapper">
          <TabList
            aria-label={tSpace("homeTabs.myContent", "我的内容")}
            className="react-aria-TabList MyContentCollection__tabs"
          >
            {primaryTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <Tab
                  key={tab.id}
                  id={tab.id}
                  className={`react-aria-Tab MyContentCollection__tab${activeTab === tab.id ? " is-active" : ""}`}
                >
                  <TabIcon size={14} aria-hidden="true" />
                  {tab.label}
                </Tab>
              );
            })}
            <Tab
              id="attachment_toggle"
              className={`react-aria-Tab MyContentCollection__tab MyContentCollection__tab-attachment${isAttachmentTabActive ? " is-active" : ""}${showAttachmentTabs ? " is-expanded" : ""}`}
            >
              <LuPaperclip size={14} aria-hidden="true" />
              {tSpace("attachments_toggle", "附件")}
              <LuChevronDown
                size={12}
                className={`MyContentCollection__chevron${showAttachmentTabs ? " is-open" : ""}`}
                aria-hidden="true"
              />
            </Tab>
          </TabList>
          <div
            className={`MyContentCollection__sub-tabs${showAttachmentTabs ? " is-open" : ""}`}
            aria-hidden={!showAttachmentTabs}
          >
            {attachmentTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`MyContentCollection__sub-tab${activeTab === tab.id ? " is-active" : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                  aria-pressed={activeTab === tab.id}
                >
                  <TabIcon size={12} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </Tabs>

      <ConfirmModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => {
          if (!isBatchDeleting) setIsBatchDeleteModalOpen(false);
        }}
        onConfirm={() => void runBatchDelete()}
        title={batchDeleteCopy.title}
        message={batchDeleteCopy.message}
        confirmText={batchDeleteCopy.confirmText}
        cancelText={t("myContentBatch.cancel", "取消")}
        type="error"
        loading={isBatchDeleting}
        allowCancelWhileLoading={false}
      />

      {(isAppsManageView ? appsLoading : itemsLoading) &&
      sourceItems.length === 0 ? (
        <div className="MyContentCollection__status">
          {t("loading", "加载中...")}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="MyContentCollection__empty">
          <div className="MyContentCollection__empty-title">
            {activeTab === "all"
              ? t("homeTabs.myContentEmpty", "还没有内容")
              : t("homeTabs.myContentEmptyFiltered", {
                  defaultValue: "还没有{{type}}",
                  type: activeTabLabel,
                })}
          </div>
          <p className="MyContentCollection__empty-hint">
            {t(
              "homeTabs.myContentEmptyHint",
              "任意 space 里的页面、表格、图片和对话，以及你的应用，都会按最近更新时间汇总到这里。",
            )}
          </p>
        </div>
        ) : (
        <Virtualizer
          layout={GridLayout}
          layoutOptions={
            // Image cards are taller (preview + title + meta). Undersized cells
            // recycle as "ghost" meta-only strips when selection rings change size.
            activeTab === "image" ||
            activeTab === "attachment" ||
            activeTab === "document" ||
            activeTab === "video" ||
            activeTab === "audio" ||
            activeTab === "file"
              ? { minItemSize: new Size(240, 248), minSpace: new Size(16, 16) }
              : { minItemSize: new Size(250, 188), minSpace: new Size(16, 16) }
          }
        >
          <GridList
            className="MyContentCollection__grid"
            aria-label={activeTabLabel}
            layout="grid"
            items={gridItems}
            style={{ height: "100%", overflow: "auto" }}
            selectionMode="none"
            onAction={(key) => {
              const contentKey = String(key);
              // Manual multi-select — more reliable than RAC Virtualizer selection.
              if (isSelectionMode) {
                toggleSelectKey(contentKey);
                return;
              }
              const item = visibleItems.find((i) => i.contentKey === contentKey);
              if (!item) return;
              const itemTab = resolveMyContentTab(item);
              if (itemTab === "image") {
                setPreviewImage({
                  contentKey: item.contentKey,
                  title: item.title || "",
                });
                return;
              }
              if (itemTab !== "agent" && itemTab !== "app") {
                navigate(buildContentTarget(item));
              }
            }}
          >
          {(item) => {
            const itemTab = resolveMyContentTab(item);
            const Icon =
              tabs.find((tab) => tab.id === itemTab)?.icon ??
              tabs.find((tab) => tab.id === "file")?.icon ??
              LuFile;

            if (
              itemTab === "app" &&
              "source" in item &&
              item.source === "owned-app"
            ) {
              const appKey =
                item.app.appKey ?? item.app.appId ?? item.contentKey;
              const managedApp = managedAppByKey.get(appKey);
              if (isAppsManageView && !managedApp) {
                return (
                  <GridListItem
                    key={item.contentKey}
                    id={item.contentKey}
                    style={{ display: "none" }}
                  />
                );
              }
              return (
                <GridListItem
                  key={item.contentKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className="MyContentCollection__grid-item"
                >
                  <AppCard
                    app={managedApp ?? item.app}
                    mode={isAppsManageView ? "manage" : "browse"}
                    contextLabel={
                      isAppsManageView
                        ? undefined
                        : item.spaceName !== t("homeTabs.myContent", "我的内容")
                          ? item.spaceName
                          : undefined
                    }
                    onOpenDetail={() => navigate(buildContentTarget(item))}
                    onOpenEditor={() => navigate(buildAppEditorTarget(item))}
                    onDelete={
                      isAppsManageView
                        ? (app) => handleDeleteOwnedApp(app)
                        : undefined
                    }
                    onShare={isAppsManageView ? shareApp : undefined}
                    onBindDomain={isAppsManageView ? bindDomain : undefined}
                    onUnbindDomain={isAppsManageView ? unbindDomain : undefined}
                    onListDomains={isAppsManageView ? listDomains : undefined}
                  />
                </GridListItem>
              );
            }

            if (itemTab === "agent") {
              return (
                <GridListItem
                  key={item.contentKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className="MyContentCollection__grid-item"
                >
                  <MyContentAgentCard item={item} />
                </GridListItem>
              );
            }

            const contentLabel = getSpaceContentTypeLabel(
              {
                type: item.type as any,
                contentKey: item.contentKey,
                fileCategory:
                  "fileCategory" in item ? item.fileCategory : undefined,
              },
              tSpace,
            );
            // Prefer flags on the virtualized item (always fresh); fall back to set.
            const itemSelecting =
              "__selecting" in item ? !!(item as any).__selecting : isSelectionMode;
            const itemSelected =
              "__selected" in item
                ? !!(item as any).__selected
                : selectedKeys.has((item as any).contentKey);
            const itemToggle = () => toggleSelectKey(item.contentKey);
            // Key includes selection so Virtualizer cannot keep a stale cell.
            const itemReactKey = `${item.contentKey}:${itemSelecting ? 1 : 0}:${itemSelected ? 1 : 0}`;
            const itemGridClass = `MyContentCollection__grid-item${
              itemSelected ? " is-selected" : ""
            }${itemSelecting ? " is-selecting" : ""}`;

            if (itemTab === "dialog") {
              return (
                <GridListItem
                  key={itemReactKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className={itemGridClass}
                >
                  <MyContentDialogCard
                    item={item}
                    contentLabel={contentLabel}
                    Icon={Icon}
                    tSpace={tSpace}
                    isSelectionMode={itemSelecting}
                    isSelected={itemSelected}
                    onToggleSelect={itemToggle}
                  />
                </GridListItem>
              );
            }

            if (itemTab === "table") {
              return (
                <GridListItem
                  key={itemReactKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className={itemGridClass}
                >
                  <MyContentTableCard
                    item={item}
                    contentLabel={contentLabel}
                    Icon={Icon}
                    tSpace={tSpace as any}
                    isSelectionMode={itemSelecting}
                    isSelected={itemSelected}
                    onToggleSelect={itemToggle}
                  />
                </GridListItem>
              );
            }

            if (itemTab === "page") {
              return (
                <GridListItem
                  key={itemReactKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className={itemGridClass}
                >
                  <MyContentPageCard
                    item={item}
                    contentLabel={contentLabel}
                    Icon={Icon}
                    tSpace={tSpace as any}
                    isSelectionMode={itemSelecting}
                    isSelected={itemSelected}
                    onToggleSelect={itemToggle}
                  />
                </GridListItem>
              );
            }

            const fileMetaLabel =
              item.type === "file"
                ? getCompactFileMetaLabel({
                    fileName:
                      ("originalName" in item
                        ? item.originalName
                        : undefined) || item.title,
                    mimeType: "mimeType" in item ? item.mimeType : undefined,
                    fileSize: "fileSize" in item ? item.fileSize : undefined,
                  })
                : null;

            if (itemTab === "image") {
              return (
                <GridListItem
                  key={itemReactKey}
                  id={item.contentKey}
                  textValue={item.title || ""}
                  className={itemGridClass}
                >
                  <MyContentImageCard
                    item={item}
                    isSelectionMode={itemSelecting}
                    isSelected={itemSelected}
                    onToggleSelect={itemToggle}
                  />
                </GridListItem>
              );
            }

            return (
              <GridListItem
                key={itemReactKey}
                id={item.contentKey}
                textValue={item.title || ""}
                className={itemGridClass}
              >
                <div
                  className={`MyContentCollection__card${
                    itemSelecting ? " is-selection-mode" : ""
                  }${itemSelected ? " is-selected" : ""}`}
                  data-type={itemTab}
                  data-selected={itemSelected ? "true" : "false"}
                >
                  {itemSelecting ? (
                    <div className="MyContentCollection__checkbox-wrapper">
                      <SelectionCheck
                        selected={itemSelected}
                        onToggle={itemToggle}
                      />
                    </div>
                  ) : null}
                  <div className="MyContentCollection__card-head">
                    <div className="MyContentCollection__icon" aria-hidden="true">
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    {item.spaceName &&
                      item.spaceName !==
                        t("homeTabs.myContent", "我的内容") && (
                        <span className="MyContentCollection__space">
                          {item.spaceName}
                        </span>
                      )}
                  </div>

                  <div
                    className="MyContentCollection__title"
                    title={item.title}
                  >
                    {item.title || tSpace("unnamed", "未命名")}
                  </div>

                  <div className="MyContentCollection__meta">
                    <div className="MyContentCollection__meta-left">
                      <span className="MyContentCollection__type">
                        {contentLabel}
                      </span>
                      {fileMetaLabel ? (
                        <span className="MyContentCollection__file-meta">
                          {fileMetaLabel}
                        </span>
                      ) : null}
                    </div>
                    <span className="MyContentCollection__time">
                      {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </GridListItem>
            );
          }}
          </GridList>
        </Virtualizer>
      )}
      
      {previewImage && (
        <ImagePreviewFetcher
          contentKey={previewImage.contentKey}
          alt={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default MyContentCollection;
