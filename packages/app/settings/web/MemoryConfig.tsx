// packages/app/settings/web/MemoryConfig.tsx
//
// 长期记忆与工作接续管理；历史用户提示词不再编辑或注入。

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuPlus,
  LuTrash2,
  LuRefreshCw,
  LuX,
  LuSearch,
  LuBrain,
  LuBriefcase,
} from "react-icons/lu";
import { toast } from "app/utils/toast";
import { useAppSelector } from "app/store";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { TextArea } from "render/web/form/TextArea";
import SettingSection from "./chat-config/SettingSection";
import "./MemoryConfig.css";

type MemoryKind = "episodic" | "semantic" | "procedural";
type MemorySubjectType = "user" | "agent" | "space" | "project" | "system";
export type WorkContextStatus = "active" | "paused" | "completed" | "cancelled";
export type MemoryConfigView = "memories" | "work";

export interface MemoryItem {
  id: string;
  ownerType: string;
  ownerId: string;
  visibility: string;
  subjectType: MemorySubjectType;
  subjectId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
  updatedAt?: string;
  lastActivatedAt: string;
  activationCount: number;
  importance: number;
  confidence: number;
  tags?: string[];
  facet?: string;
  resident?: boolean;
  provenance?: string;
  sourceKind?: string;
}

export interface WorkContextListItem {
  id: string;
  activityId: string;
  status: WorkContextStatus;
  goal: string;
  constraints: string[];
  openItems: string[];
  nextStep?: string;
  revision: number;
  updatedAt: string;
  createdAt?: string;
  spaceId?: string | null;
}

const MEMORY_KINDS: MemoryKind[] = ["episodic", "semantic", "procedural"];
const MEMORY_SUBJECT_TYPES: MemorySubjectType[] = [
  "user",
  "agent",
  "space",
  "project",
  "system",
];
const MEMORY_FACETS = [
  "explicit-memory",
  "preference",
  "goal",
  "style",
  "tension",
  "unfinished",
] as const;
const WORK_STATUSES: WorkContextStatus[] = [
  "active",
  "paused",
  "completed",
  "cancelled",
];

const isMemoryKind = (value: string): value is MemoryKind =>
  MEMORY_KINDS.some((kind) => kind === value);

const isMemorySubjectType = (value: string): value is MemorySubjectType =>
  MEMORY_SUBJECT_TYPES.some((subjectType) => subjectType === value);

const isWorkContextStatus = (value: string): value is WorkContextStatus =>
  WORK_STATUSES.some((status) => status === value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isMemoryItem = (value: unknown): value is MemoryItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.ownerType === "string" &&
    typeof item.ownerId === "string" &&
    typeof item.visibility === "string" &&
    typeof item.content === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.lastActivatedAt === "string" &&
    typeof item.subjectId === "string" &&
    typeof item.activationCount === "number" &&
    Number.isFinite(item.activationCount) &&
    typeof item.importance === "number" &&
    Number.isFinite(item.importance) &&
    typeof item.confidence === "number" &&
    Number.isFinite(item.confidence) &&
    typeof item.kind === "string" &&
    isMemoryKind(item.kind) &&
    typeof item.subjectType === "string" &&
    isMemorySubjectType(item.subjectType)
  );
};

const isWorkContextListItem = (value: unknown): value is WorkContextListItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.activityId === "string" &&
    typeof item.status === "string" &&
    isWorkContextStatus(item.status) &&
    typeof item.goal === "string" &&
    typeof item.revision === "number" &&
    Number.isFinite(item.revision) &&
    typeof item.updatedAt === "string" &&
    isStringArray(item.constraints) &&
    isStringArray(item.openItems) &&
    (item.nextStep === undefined || typeof item.nextStep === "string")
  );
};

export const parseListResponse = (
  data: unknown
): { items: MemoryItem[]; nextCursor?: string } => {
  if (!data || typeof data !== "object") return { items: [] };
  const payload = data as Record<string, unknown>;
  const rawItems =
    "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.filter(isMemoryItem);
  const nextCursor =
    "nextCursor" in payload && typeof payload.nextCursor === "string"
      ? payload.nextCursor
      : undefined;
  return { items, nextCursor };
};

export const parseWorkListResponse = (
  data: unknown
): { items: WorkContextListItem[]; nextCursor?: string } => {
  if (!data || typeof data !== "object") return { items: [] };
  const payload = data as Record<string, unknown>;
  const rawItems =
    "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.filter(isWorkContextListItem);
  const nextCursor =
    "nextCursor" in payload && typeof payload.nextCursor === "string"
      ? payload.nextCursor
      : undefined;
  return { items, nextCursor };
};

export const resolveMemoryFacetBadge = (
  item: Pick<MemoryItem, "facet" | "sourceKind">,
  t: (key: string, fallback: string) => string
): { label: string; tone: "explicit" | "interpreted" } | null => {
  const facet = typeof item.facet === "string" ? item.facet.trim() : "";
  if (
    facet === "explicit-memory" ||
    (!facet && item.sourceKind === "explicit-user-directive")
  ) {
    return {
      label: t("settings.memory.originExplicit", "显式记录"),
      tone: "explicit",
    };
  }
  if (!facet) return null;

  const facetLabels: Record<string, [string, string]> = {
    preference: ["settings.memory.facetPreference", "自动提炼 · 偏好"],
    goal: ["settings.memory.facetGoal", "自动提炼 · 目标"],
    style: ["settings.memory.facetStyle", "自动提炼 · 风格"],
    tension: ["settings.memory.facetTension", "自动提炼 · 张力"],
    unfinished: ["settings.memory.facetUnfinished", "自动提炼 · 未完项"],
  };
  const known = facetLabels[facet];
  return {
    label: known
      ? t(known[0], known[1])
      : `${t("settings.memory.originInterpreted", "自动提炼")} · ${facet}`,
    tone: "interpreted",
  };
};

export const resolveWorkStatusLabel = (
  status: WorkContextStatus,
  t: (key: string, fallback: string) => string
): string => {
  const labels: Record<WorkContextStatus, [string, string]> = {
    active: ["settings.memory.workStatusActive", "进行中"],
    paused: ["settings.memory.workStatusPaused", "已暂停"],
    completed: ["settings.memory.workStatusCompleted", "已完成"],
    cancelled: ["settings.memory.workStatusCancelled", "已取消"],
  };
  const [key, fallback] = labels[status];
  return t(key, fallback);
};

const formatDateTime = (value: string): string => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function MemoryConfig() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);

  const [activeView, setActiveView] = useState<MemoryConfigView>("memories");

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkContextListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [workNextCursor, setWorkNextCursor] = useState<string | undefined>();

  const [kindFilter, setKindFilter] = useState("");
  const [facetFilter, setFacetFilter] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState("");
  const [workStatusFilter, setWorkStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const hasMemoryFilters = Boolean(
    kindFilter || facetFilter || subjectTypeFilter || searchQuery
  );
  const hasWorkFilters = Boolean(workStatusFilter || searchQuery);

  const clearFilters = useCallback(() => {
    setKindFilter("");
    setFacetFilter("");
    setSubjectTypeFilter("");
    setWorkStatusFilter("");
    setSearchQuery("");
  }, []);

  const [newContent, setNewContent] = useState("");
  const [newKind, setNewKind] = useState<MemoryKind>("semantic");

  const serverBase = useMemo(() => {
    if (!currentServer) return null;
    return currentServer.replace(/\/$/, "");
  }, [currentServer]);

  const authHeaders = useMemo(() => {
    if (!currentToken) return null;
    return { Authorization: `Bearer ${currentToken}` };
  }, [currentToken]);

  const loadMemories = useCallback(
    async (cursor?: string) => {
      if (!currentToken || !serverBase) return;
      setLoading(true);
      try {
        const body: Record<string, unknown> = {
          limit: 50,
          view: "memories",
        };
        if (cursor) body.cursor = cursor;
        if (kindFilter) body.kind = kindFilter;
        if (facetFilter) body.facet = facetFilter;
        if (subjectTypeFilter) body.subjectType = subjectTypeFilter;

        const res = await fetch(`${serverBase}/api/memory/list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to load memories");
        const data = await res.json();
        const { items: fetched, nextCursor: fetchedCursor } =
          parseListResponse(data);
        setItems((prev) => (cursor ? [...prev, ...fetched] : fetched));
        setNextCursor(fetchedCursor);
      } catch {
        toast.error(tRef.current("settings.memory.loadError", "Failed to load memories"));
      } finally {
        setLoading(false);
      }
    },
    [
      currentToken,
      serverBase,
      authHeaders,
      kindFilter,
      facetFilter,
      subjectTypeFilter,
    ]
  );

  const loadWorkItems = useCallback(
    async (cursor?: string) => {
      if (!currentToken || !serverBase) return;
      setLoading(true);
      try {
        const body: Record<string, unknown> = {
          limit: 50,
          view: "work",
        };
        if (cursor) body.cursor = cursor;
        if (workStatusFilter) body.workStatus = workStatusFilter;

        const res = await fetch(`${serverBase}/api/memory/list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to load work contexts");
        const data = await res.json();
        const { items: fetched, nextCursor: fetchedCursor } =
          parseWorkListResponse(data);
        setWorkItems((prev) => (cursor ? [...prev, ...fetched] : fetched));
        setWorkNextCursor(fetchedCursor);
      } catch {
        toast.error(
          tRef.current("settings.memory.workLoadError", "加载工作接续记录失败")
        );
      } finally {
        setLoading(false);
      }
    },
    [currentToken, serverBase, authHeaders, workStatusFilter]
  );

  useEffect(() => {
    if (activeView === "memories") {
      loadMemories();
    } else {
      loadWorkItems();
    }
  }, [activeView, loadMemories, loadWorkItems]);

  const handleAdd = async () => {
    if (!currentToken || !serverBase || !newContent.trim()) return;
    setAdding(true);
    try {
      const body: Record<string, unknown> = {
        content: newContent.trim(),
        kind: newKind,
      };
      const res = await fetch(`${serverBase}/api/memory/remember`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add memory");
      toast.success(t("settings.memory.addSuccess", "Memory added"));
      setNewContent("");
      await loadMemories();
    } catch {
      toast.error(t("settings.memory.addError", "Failed to add memory"));
    } finally {
      setAdding(false);
    }
  };

  const handleRetire = async (id: string, view: MemoryConfigView) => {
    if (!currentToken || !serverBase) return;
    const confirmMsg =
      view === "work"
        ? t(
            "settings.memory.retireWorkConfirm",
            "确定要退休这条工作接续记录吗？（保留审计历史，不再参与对话召回）"
          )
        : t(
            "settings.memory.deleteConfirm",
            "确定要退休这条记忆吗？（保留审计历史，不再参与对话召回）"
          );
    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      const res = await fetch(`${serverBase}/api/memory/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ ids: [id], yes: true }),
      });
      if (!res.ok) throw new Error("Failed to retire memory");
      toast.success(
        view === "work"
          ? t("settings.memory.retireWorkSuccess", "工作接续记录已退休归档")
          : t("settings.memory.deleteSuccess", "Memory deleted")
      );
      if (view === "work") {
        setWorkItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      toast.error(t("settings.memory.deleteError", "Failed to delete memory"));
    }
  };

  const handleKindFilterChange = (value: string) => {
    setKindFilter(isMemoryKind(value) ? value : "");
  };

  const handleFacetFilterChange = (value: string) => {
    setFacetFilter(value.trim());
  };

  const handleSubjectTypeFilterChange = (value: string) => {
    setSubjectTypeFilter(isMemorySubjectType(value) ? value : "");
  };

  const handleWorkStatusFilterChange = (value: string) => {
    setWorkStatusFilter(isWorkContextStatus(value) ? value : "");
  };

  const handleKindChange = (value: string) => {
    setNewKind(isMemoryKind(value) ? value : "semantic");
  };

  const filteredItems = useMemo(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    if (!query) return items;
    return items.filter(
      (item) =>
        item.content.toLowerCase().includes(query) ||
        (item.facet ?? "").toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const filteredWorkItems = useMemo(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    if (!query) return workItems;
    return workItems.filter((item) =>
      [item.goal, item.nextStep ?? "", ...item.openItems, ...item.constraints]
        .join("\n")
        .toLowerCase()
        .includes(query)
    );
  }, [workItems, searchQuery]);

  const canManageMemory = Boolean(currentToken && serverBase);

  return (
    <div className="memory-config-page">
      <div className="memory-config__header">
        <div className="memory-config__header-text">
          <h1 className="page-title">
            {t("settings.memory.title", "记忆")}
          </h1>
          <p className="page-description">
            {t(
              "settings.memory.description",
              "长期记忆与工作接续帮助 Nolo 在互动中保持连续性；清理仅做退休归档，保留审计链。"
            )}
          </p>
        </div>
        {canManageMemory && (
          <Button
            variant="ghost"
            size="small"
            icon={
              <LuRefreshCw
                size={14}
                className={loading ? "memory-spin" : ""}
                aria-hidden="true"
              />
            }
            onClick={() =>
              activeView === "memories" ? loadMemories() : loadWorkItems()
            }
            disabled={loading}
            title={t("settings.memory.refresh", "Refresh")}
          />
        )}
      </div>

      {!canManageMemory ? (
        <div className="memory-config__empty-state">
          <LuBrain
            size={40}
            className="memory-config__empty-icon"
            aria-hidden="true"
          />
          <h2 className="memory-config__empty-title">
            {t("settings.memory.empty", "No memories yet")}
          </h2>
          <p className="memory-config__empty-description">
            {t(
              "settings.memory.loginRequired",
              "Please sign in to manage your memories."
            )}
          </p>
        </div>
      ) : (
        <>
          <div
            className="memory-view-tabs"
            role="tablist"
            aria-label={t("settings.memory.viewSwitcher", "记忆视图切换")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "memories"}
              className={`memory-view-tab ${
                activeView === "memories" ? "memory-view-tab--active" : ""
              }`}
              onClick={() => setActiveView("memories")}
            >
              <LuBrain size={15} aria-hidden="true" />
              <span>{t("settings.memory.viewMemories", "长期记忆")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "work"}
              className={`memory-view-tab ${
                activeView === "work" ? "memory-view-tab--active" : ""
              }`}
              onClick={() => setActiveView("work")}
            >
              <LuBriefcase size={15} aria-hidden="true" />
              <span>{t("settings.memory.viewWork", "工作接续")}</span>
            </button>
          </div>

          {activeView === "memories" ? (
            <>
              <SettingSection
                title={
                  <span className="memory-config__section-title">
                    <LuSearch size={14} aria-hidden="true" />
                    {t("settings.memory.search", "Search memories")}
                  </span>
                }
                description={t(
                  "settings.memory.searchDescription",
                  "按类型、来源/Facet、主体或内容筛选所有活跃长期记忆。"
                )}
              >
                <div className="memory-toolbar">
                  <div className="memory-toolbar__field memory-toolbar__field--grow">
                    <LuSearch
                      size={14}
                      className="memory-toolbar__icon"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      placeholder={t("settings.memory.search", "Search memories")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select
                    selectedKey={kindFilter}
                    onSelectionChange={(key) =>
                      handleKindFilterChange(String(key ?? ""))
                    }
                    aria-label={t("settings.memory.kind", "Kind")}
                  >
                    <SelectItem
                      id=""
                      textValue={t("settings.memory.allKinds", "All kinds")}
                    >
                      {t("settings.memory.allKinds", "All kinds")}
                    </SelectItem>
                    {MEMORY_KINDS.map((kind) => {
                      const label = t(
                        `settings.memory.kind${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
                        kind
                      );
                      return (
                        <SelectItem key={kind} id={kind} textValue={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </Select>
                  <Select
                    selectedKey={facetFilter}
                    onSelectionChange={(key) =>
                      handleFacetFilterChange(String(key ?? ""))
                    }
                    aria-label={t("settings.memory.facet", "Facet")}
                  >
                    <SelectItem
                      id=""
                      textValue={t("settings.memory.allFacets", "全部来源/Facet")}
                    >
                      {t("settings.memory.allFacets", "全部来源/Facet")}
                    </SelectItem>
                    {MEMORY_FACETS.map((facet) => {
                      const badge = resolveMemoryFacetBadge({ facet }, t);
                      const label = badge?.label ?? facet;
                      return (
                        <SelectItem key={facet} id={facet} textValue={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </Select>
                  <Select
                    selectedKey={subjectTypeFilter}
                    onSelectionChange={(key) =>
                      handleSubjectTypeFilterChange(String(key ?? ""))
                    }
                    aria-label={t("settings.memory.subjectType", "Subject type")}
                  >
                    <SelectItem
                      id=""
                      textValue={t(
                        "settings.memory.allSubjectTypes",
                        "All subject types"
                      )}
                    >
                      {t("settings.memory.allSubjectTypes", "All subject types")}
                    </SelectItem>
                    {MEMORY_SUBJECT_TYPES.map((subjectType) => {
                      const label = t(
                        `settings.memory.subjectType${subjectType.charAt(0).toUpperCase() + subjectType.slice(1)}`,
                        subjectType
                      );
                      return (
                        <SelectItem
                          key={subjectType}
                          id={subjectType}
                          textValue={label}
                        >
                          {label}
                        </SelectItem>
                      );
                    })}
                  </Select>
                  {hasMemoryFilters && (
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<LuX size={14} aria-hidden="true" />}
                      onClick={clearFilters}
                      title={t("settings.memory.clearFilters", "Clear filters")}
                    >
                      {t("settings.memory.clearFilters", "Clear")}
                    </Button>
                  )}
                </div>
              </SettingSection>

              <div
                className={`memory-add-card ${
                  isAddOpen ? "memory-add-card--open" : ""
                }`}
              >
                <button
                  type="button"
                  className="memory-add-card__toggle"
                  onClick={() => setIsAddOpen((prev) => !prev)}
                  aria-expanded={isAddOpen}
                >
                  <span className="memory-add-card__toggle-title">
                    <LuPlus size={16} aria-hidden="true" />
                    {t("settings.memory.add", "Add memory")}
                  </span>
                  <span className="memory-add-card__toggle-hint">
                    {t(
                      "settings.memory.addDescription",
                      "Write a new memory directly to your profile."
                    )}
                  </span>
                </button>
                {isAddOpen && (
                  <div className="memory-add-form">
                    <TextArea
                      placeholder={t("settings.memory.content", "Content")}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={3}
                    />
                    <div className="memory-add-form__row">
                      <Select
                        selectedKey={newKind}
                        onSelectionChange={(key) =>
                          handleKindChange(String(key ?? ""))
                        }
                        aria-label={t("settings.memory.kind", "Kind")}
                      >
                        {MEMORY_KINDS.map((kind) => {
                          const label = t(
                            `settings.memory.kind${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
                            kind
                          );
                          return (
                            <SelectItem key={kind} id={kind} textValue={label}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </Select>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleAdd}
                        disabled={adding || !newContent.trim()}
                        loading={adding}
                      >
                        {t("settings.memory.submit", "Add")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="memory-list">
                {filteredItems.length === 0 ? (
                  <div className="memory-empty">
                    <LuBrain
                      size={40}
                      className="memory-empty__icon"
                      aria-hidden="true"
                    />
                    <p className="memory-empty__title">
                      {t("settings.memory.empty", "No memories yet")}
                    </p>
                    <p className="memory-empty__hint">
                      {t(
                        "settings.memory.emptyHint",
                        "Add a memory to help Nolo personalize your experience."
                      )}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const facetBadge = resolveMemoryFacetBadge(item, t);
                    return (
                      <div key={item.id} className="memory-card">
                        <div className="memory-card__header">
                          <div className="memory-card__badges">
                            <span
                              className={`memory-kind memory-kind--${item.kind}`}
                            >
                              {t(
                                `settings.memory.kind${item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}`,
                                item.kind
                              )}
                            </span>
                            {facetBadge && (
                              <span
                                className={`memory-facet memory-facet--${facetBadge.tone}`}
                              >
                                {facetBadge.label}
                              </span>
                            )}
                            {item.resident && (
                              <span className="memory-tag">
                                {t("settings.memory.resident", "常驻")}
                              </span>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              <div className="memory-tags">
                                {item.tags.map((tag) => (
                                  <span key={tag} className="memory-tag">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="small"
                            className="memory-card__delete"
                            icon={<LuTrash2 size={14} aria-hidden="true" />}
                            onClick={() => handleRetire(item.id, "memories")}
                            title={t(
                              "settings.memory.retire",
                              "退休归档这条记忆"
                            )}
                          />
                        </div>
                        <div className="memory-card__content">
                          {item.content}
                        </div>
                        <div className="memory-card__meta">
                          <span className="memory-card__meta-item">
                            <span className="memory-card__meta-label">
                              {t("settings.memory.subjectType", "Subject")}
                            </span>
                            {t(
                              `settings.memory.subjectType${item.subjectType.charAt(0).toUpperCase() + item.subjectType.slice(1)}`,
                              item.subjectType
                            )}
                            /{item.subjectId}
                          </span>
                          <span className="memory-card__meta-item">
                            <span className="memory-card__meta-label">
                              {t("settings.memory.createdAt", "Created")}
                            </span>
                            {formatDateTime(item.updatedAt ?? item.createdAt)}
                          </span>
                          <span className="memory-card__meta-item">
                            <span className="memory-card__meta-label">
                              {t("settings.memory.importance", "Importance")}
                            </span>
                            {item.importance.toFixed(2)}
                          </span>
                          <span className="memory-card__meta-item">
                            <span className="memory-card__meta-label">
                              {t("settings.memory.confidence", "Confidence")}
                            </span>
                            {item.confidence.toFixed(2)}
                          </span>
                          {item.provenance && (
                            <span className="memory-card__meta-item">
                              <span className="memory-card__meta-label">
                                {t("settings.memory.provenance", "来源可信度")}
                              </span>
                              {item.provenance}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {nextCursor && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => loadMemories(nextCursor)}
                  disabled={loading}
                  block
                >
                  {t("settings.memory.more", "Load more")}
                </Button>
              )}
            </>
          ) : (
            <>
              <SettingSection
                title={
                  <span className="memory-config__section-title">
                    <LuBriefcase size={14} aria-hidden="true" />
                    {t("settings.memory.workTitle", "工作接续记录")}
                  </span>
                }
                description={t(
                  "settings.memory.workDescription",
                  "查看进行中、已暂停或已完结的工作目标、待办与下一步；状态仅供接续参考，不代表系统授权或验收。"
                )}
              >
                <div className="memory-toolbar">
                  <div className="memory-toolbar__field memory-toolbar__field--grow">
                    <LuSearch
                      size={14}
                      className="memory-toolbar__icon"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      placeholder={t(
                        "settings.memory.workSearch",
                        "搜索工作目标、待办或下一步"
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select
                    selectedKey={workStatusFilter}
                    onSelectionChange={(key) =>
                      handleWorkStatusFilterChange(String(key ?? ""))
                    }
                    aria-label={t("settings.memory.workStatus", "工作状态")}
                  >
                    <SelectItem
                      id=""
                      textValue={t("settings.memory.allWorkStatuses", "全部状态")}
                    >
                      {t("settings.memory.allWorkStatuses", "全部状态")}
                    </SelectItem>
                    {WORK_STATUSES.map((status) => {
                      const label = resolveWorkStatusLabel(status, t);
                      return (
                        <SelectItem key={status} id={status} textValue={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </Select>
                  {hasWorkFilters && (
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<LuX size={14} aria-hidden="true" />}
                      onClick={clearFilters}
                      title={t("settings.memory.clearFilters", "Clear filters")}
                    >
                      {t("settings.memory.clearFilters", "Clear")}
                    </Button>
                  )}
                </div>
              </SettingSection>

              <div className="memory-list">
                {filteredWorkItems.length === 0 ? (
                  <div className="memory-empty">
                    <LuBriefcase
                      size={40}
                      className="memory-empty__icon"
                      aria-hidden="true"
                    />
                    <p className="memory-empty__title">
                      {t("settings.memory.workEmpty", "暂无工作接续记录")}
                    </p>
                    <p className="memory-empty__hint">
                      {t(
                        "settings.memory.workEmptyHint",
                        "对话中记录的工作目标、待办与下一步会展示在这里。"
                      )}
                    </p>
                  </div>
                ) : (
                  filteredWorkItems.map((item) => (
                    <div
                      key={item.id}
                      className="memory-card memory-work-card"
                    >
                      <div className="memory-card__header">
                        <div className="memory-card__badges">
                          <span
                            className={`memory-work-status memory-work-status--${item.status}`}
                          >
                            {resolveWorkStatusLabel(item.status, t)}
                          </span>
                          <span className="memory-facet">
                            rev {item.revision}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="small"
                          className="memory-card__delete"
                          icon={<LuTrash2 size={14} aria-hidden="true" />}
                          onClick={() => handleRetire(item.id, "work")}
                          title={t(
                            "settings.memory.retireWork",
                            "退休归档这条工作接续"
                          )}
                        />
                      </div>
                      <div className="memory-card__content">{item.goal}</div>
                      {item.nextStep && (
                        <div className="memory-work-section">
                          <span className="memory-work-section__label">
                            {t("settings.memory.workNextStep", "下一步")}
                          </span>
                          <span className="memory-work-section__value">
                            {item.nextStep}
                          </span>
                        </div>
                      )}
                      {item.openItems.length > 0 && (
                        <div className="memory-work-section">
                          <span className="memory-work-section__label">
                            {t("settings.memory.workOpenItems", "待办")}
                          </span>
                          <ul className="memory-work-list">
                            {item.openItems.map((openItem, idx) => (
                              <li key={`${item.id}-open-${idx}`}>{openItem}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.constraints.length > 0 && (
                        <div className="memory-work-section">
                          <span className="memory-work-section__label">
                            {t("settings.memory.workConstraints", "约束")}
                          </span>
                          <div className="memory-tags">
                            {item.constraints.map((constraint, idx) => (
                              <span
                                key={`${item.id}-c-${idx}`}
                                className="memory-tag"
                              >
                                {constraint}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="memory-card__meta">
                        <span className="memory-card__meta-item">
                          <span className="memory-card__meta-label">
                            {t("settings.memory.updatedAt", "Updated")}
                          </span>
                          {formatDateTime(item.updatedAt)}
                        </span>
                        <span className="memory-card__meta-item">
                          <span className="memory-card__meta-label">
                            {t("settings.memory.activityId", "Activity")}
                          </span>
                          {item.activityId}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {workNextCursor && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => loadWorkItems(workNextCursor)}
                  disabled={loading}
                  block
                >
                  {t("settings.memory.more", "Load more")}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
