// packages/app/settings/web/MemoryConfig.tsx
//
// 长期记忆管理；历史用户提示词不再编辑或注入。

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuPlus,
  LuTrash2,
  LuRefreshCw,
  LuX,
  LuSearch,
  LuBrain,
  LuCircleUserRound,
  LuSparkles,
} from "react-icons/lu";
import { toast } from "app/utils/toast"
import { useAppDispatch, useAppSelector } from "app/store";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { useToken } from "identity";
import {
  selectCurrentServer,
} from "app/settings/settingSlice";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { TextArea } from "render/web/form/TextArea";
import SettingSection from "./chat-config/SettingSection";
import { type MemoryScope } from "ai/memory/scope";
import "./MemoryConfig.css";

type MemoryKind = "episodic" | "semantic" | "procedural";
const MEMORY_SCOPES: MemoryScope[] = ["auto", "user", "space"];
type MemorySubjectType = "user" | "agent" | "space" | "project" | "system";

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
  lastActivatedAt: string;
  activationCount: number;
  importance: number;
  confidence: number;
  tags?: string[];
  facet?: string;
}

const MEMORY_KINDS: MemoryKind[] = ["episodic", "semantic", "procedural"];
const MEMORY_SUBJECT_TYPES: MemorySubjectType[] = [
  "user",
  "agent",
  "space",
  "project",
  "system",
];

const isMemoryKind = (value: string): value is MemoryKind =>
  MEMORY_KINDS.some((kind) => kind === value);

const isMemorySubjectType = (value: string): value is MemorySubjectType =>
  MEMORY_SUBJECT_TYPES.some((subjectType) => subjectType === value);

const isMemoryScope = (value: string): value is MemoryScope =>
  MEMORY_SCOPES.some((scope) => scope === value);

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
    typeof item.importance === "number" &&
    typeof item.confidence === "number" &&
    typeof item.kind === "string" &&
    isMemoryKind(item.kind) &&
    typeof item.subjectType === "string" &&
    isMemorySubjectType(item.subjectType)
  );
};

export const parseListResponse = (
  data: unknown
): { items: MemoryItem[]; nextCursor?: string } => {
  if (!data || typeof data !== "object") return { items: [] };
  const payload = data as Record<string, unknown>;
  const rawItems = "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.filter(isMemoryItem);
  const nextCursor =
    "nextCursor" in payload && typeof payload.nextCursor === "string"
      ? payload.nextCursor
      : undefined;
  return { items, nextCursor };
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
  const dispatch = useAppDispatch();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);


  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const [kindFilter, setKindFilter] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const hasFilters = kindFilter || subjectTypeFilter || searchQuery;

  const clearFilters = useCallback(() => {
    setKindFilter("");
    setSubjectTypeFilter("");
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

  const loadItems = useCallback(
    async (cursor?: string) => {
      if (!currentToken || !serverBase) return;
      setLoading(true);
      try {
        const body: Record<string, unknown> = { limit: 50 };
        if (cursor) body.cursor = cursor;
        if (kindFilter) body.kind = kindFilter;
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
        const { items: fetched, nextCursor } = parseListResponse(data);
        setItems((prev) => (cursor ? [...prev, ...fetched] : fetched));
        setNextCursor(nextCursor);
      } catch {
        toast.error(t("settings.memory.loadError", "Failed to load memories"));
      } finally {
        setLoading(false);
      }
    },
    [currentToken, serverBase, authHeaders, kindFilter, subjectTypeFilter, t]
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
      await loadItems();
    } catch {
      toast.error(t("settings.memory.addError", "Failed to add memory"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentToken || !serverBase) return;
    if (!window.confirm(t("settings.memory.deleteConfirm", "确定要删除这条记忆吗？"))) {
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
      if (!res.ok) throw new Error("Failed to delete memory");
      toast.success(t("settings.memory.deleteSuccess", "Memory deleted"));
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error(t("settings.memory.deleteError", "Failed to delete memory"));
    }
  };

  const handleKindFilterChange = (value: string) => {
    setKindFilter(isMemoryKind(value) ? value : "");
  };

  const handleSubjectTypeFilterChange = (value: string) => {
    setSubjectTypeFilter(isMemorySubjectType(value) ? value : "");
  };

  const handleKindChange = (value: string) => {
    setNewKind(isMemoryKind(value) ? value : "semantic");
  };

  const filteredItems = useMemo(() => {
    const query = asTrimmedLowercaseString(searchQuery);
    if (!query) return items;
    return items.filter((item) =>
      item.content.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

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
              "长期记忆帮助 Nolo 在互动中逐步了解你。"
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
            onClick={() => loadItems()}
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
      <SettingSection
        title={
          <span className="memory-config__section-title">
            <LuSearch size={14} aria-hidden="true" />
            {t("settings.memory.search", "Search memories")}
          </span>
        }
        description={t(
          "settings.memory.searchDescription",
          "Filter your memories by kind, subject type, or content."
        )}
      >
        <div className="memory-toolbar">
          <div className="memory-toolbar__field memory-toolbar__field--grow">
            <LuSearch size={14} className="memory-toolbar__icon" aria-hidden="true" />
            <input
              type="search"
              placeholder={t("settings.memory.search", "Search memories")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            selectedKey={kindFilter}
            onSelectionChange={(key) => handleKindFilterChange(String(key ?? ""))}
            aria-label={t("settings.memory.kind", "Kind")}
          >
            <SelectItem id="" textValue={t("settings.memory.allKinds", "All kinds")}>
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
            selectedKey={subjectTypeFilter}
            onSelectionChange={(key) => handleSubjectTypeFilterChange(String(key ?? ""))}
            aria-label={t("settings.memory.subjectType", "Subject type")}
          >
            <SelectItem id="" textValue={t("settings.memory.allSubjectTypes", "All subject types")}>
              {t("settings.memory.allSubjectTypes", "All subject types")}
            </SelectItem>
            {MEMORY_SUBJECT_TYPES.map((subjectType) => {
              const label = t(
                `settings.memory.subjectType${subjectType.charAt(0).toUpperCase() + subjectType.slice(1)}`,
                subjectType
              );
              return (
                <SelectItem key={subjectType} id={subjectType} textValue={label}>
                  {label}
                </SelectItem>
              );
            })}
          </Select>
          {hasFilters && (
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

      <div className={`memory-add-card ${isAddOpen ? "memory-add-card--open" : ""}`}>
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
            {t("settings.memory.addDescription", "Write a new memory directly to your profile.")}
          </span>
        </button>
        {isAddOpen && (
          <div className="memory-add-form">
            <textarea
              placeholder={t("settings.memory.content", "Content")}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
            />
            <div className="memory-add-form__row">
              <Select
                selectedKey={newKind}
                onSelectionChange={(key) => handleKindChange(String(key ?? ""))}
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
                icon={<LuPlus size={14} aria-hidden="true" />}
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
            <LuBrain size={40} className="memory-empty__icon" aria-hidden="true" />
            <p className="memory-empty__title">{t("settings.memory.empty", "No memories yet")}</p>
            <p className="memory-empty__hint">
              {t("settings.memory.emptyHint", "Add a memory to help Nolo personalize your experience.")}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="memory-card">
              <div className="memory-card__header">
                <div className="memory-card__badges">
                  <span className={`memory-kind memory-kind--${item.kind}`}>
                    {t(
                      `settings.memory.kind${item.kind.charAt(0).toUpperCase() + item.kind.slice(1)}`,
                      item.kind
                    )}
                  </span>
                  {item.facet && <span className="memory-facet">{item.facet}</span>}
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
                  onClick={() => handleDelete(item.id)}
                  title={t("settings.memory.delete", "Delete memory")}
                />
              </div>
              <div className="memory-card__content">{item.content}</div>
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
                  {formatDateTime(item.createdAt)}
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
                <span className="memory-card__meta-item">
                  <span className="memory-card__meta-label">
                    {t("settings.memory.activations", "Activations")}
                  </span>
                  {item.activationCount}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {nextCursor && (
        <Button
          variant="secondary"
          size="small"
          onClick={() => loadItems(nextCursor)}
          disabled={loading}
          block
        >
          {t("settings.memory.more", "Load more")}
        </Button>
      )}
        </>
      )}
    </div>
  );
}
