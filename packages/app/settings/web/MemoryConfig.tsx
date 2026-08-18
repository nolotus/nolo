// packages/app/settings/web/MemoryConfig.tsx
//
// 个性化设置：通用提示词 + 助手行为偏好 + 长期记忆管理。

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
  LuMessageSquareMore,
  LuSparkles,
  LuScanSearch,
} from "react-icons/lu";
import { toast } from "app/utils/toast"
import { useAppDispatch, useAppSelector } from "app/store";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { useToken } from "identity";
import {
  selectCurrentServer,
  selectUserTonePreset,
  selectKnowledgeCaptureLevel,
  selectSpaceContextLevel,
  setUserTonePreset,
  setKnowledgeCaptureLevel,
  setSpaceContextLevel,
} from "app/settings/settingSlice";
import type {
  KnowledgeCaptureLevel,
  SpaceContextLevel,
  TonePreset,
} from "ai/policy/types";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { TextArea } from "render/web/form/TextArea";
import SettingSection from "./chat-config/SettingSection";
import { useAutoSaveGlobalPrompt } from "./chat-config/useAutoSaveGlobalPrompt";
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
  const userTonePreset = useAppSelector(selectUserTonePreset);
  const knowledgeCaptureLevel = useAppSelector(selectKnowledgeCaptureLevel);
  const spaceContextLevel = useAppSelector(selectSpaceContextLevel);
  const { draftPrompt, setDraftPrompt, status: promptSaveStatus } =
    useAutoSaveGlobalPrompt();

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const [kindFilter, setKindFilter] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const hasFilters = kindFilter || subjectTypeFilter || searchQuery;

  const promptSaveHint = (() => {
    if (promptSaveStatus === "saving") {
      return t("chat.globalPrompt.autoSave.saving", "正在保存…");
    }
    if (promptSaveStatus === "saved") {
      return t("chat.globalPrompt.autoSave.saved", "已自动保存");
    }
    if (promptSaveStatus === "error") {
      return t(
        "chat.globalPrompt.autoSave.error",
        "保存失败，将在你继续编辑后重试"
      );
    }
    return t(
      "chat.globalPrompt.autoSave.idle",
      "内容会自动保存，无需手动提交"
    );
  })();

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
            {t("settings.memory.title", "个性化设置")}
          </h1>
          <p className="page-description">
            {t(
              "settings.memory.description",
              "通用提示词、助手行为偏好与长期记忆，帮助 Nolo 更懂你。"
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

      <SettingSection
        title={t("chat.globalPrompt.title", "通用提示词")}
        description={t(
          "chat.globalPrompt.description",
          "用于向不同的 AI 统一介绍你自己、你的偏好和沟通风格，让所有 AI 在理解你时保持一致。"
        )}
      >
        <TextArea
          icon={<LuCircleUserRound size={16} aria-hidden="true" />}
          autoResize
          value={draftPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDraftPrompt(e.target.value)
          }
          placeholder={t(
            "chat.globalPrompt.placeholder",
            "例如：我是一名开发者，喜欢结构清晰、条理分明的回答；代码部分请尽量使用 TypeScript，并附简短说明；当有不确定的地方请先说明假设再给出答案。"
          )}
        />
        <p className="memory-config__save-hint">{promptSaveHint}</p>
      </SettingSection>

      <SettingSection
        title={t("chat.agentBehavior.title", "Agent 自动化边界")}
        description={t(
          "chat.agentBehavior.description",
          "控制默认助手的表达风格，以及它在知识沉淀和当前空间读取上的主动程度。"
        )}
      >
        <div className="ChatConfigSections__stack">
          <label className="ChatConfigSections__subSetting">
            <span className="ChatConfigSections__subSettingHeader">
              <span className="ChatConfigSections__subSettingLabel">
                {t("chat.agentBehavior.tone.label", "偏好语气")}
              </span>
              <span className="ChatConfigSections__subSettingDescription">
                {t(
                  "chat.agentBehavior.tone.description",
                  "影响助手默认怎么和你说话，不会覆盖 agent 自己的核心角色。"
                )}
              </span>
            </span>
            <div className="ChatConfigSections__inputWithIcon">
              <LuMessageSquareMore size={16} aria-hidden="true" />
              <Select
                selectedKey={userTonePreset}
                onSelectionChange={(key) => {
                  if (key == null) return;
                  dispatch(setUserTonePreset(String(key) as TonePreset));
                }}
              >
                <SelectItem id="default" textValue={t("chat.agentBehavior.tone.default", "默认")}>
                  {t("chat.agentBehavior.tone.default", "默认")}
                </SelectItem>
                <SelectItem id="direct" textValue={t("chat.agentBehavior.tone.direct", "直接")}>
                  {t("chat.agentBehavior.tone.direct", "直接")}
                </SelectItem>
                <SelectItem id="pragmatic" textValue={t("chat.agentBehavior.tone.pragmatic", "务实")}>
                  {t("chat.agentBehavior.tone.pragmatic", "务实")}
                </SelectItem>
                <SelectItem id="friendly" textValue={t("chat.agentBehavior.tone.friendly", "友好")}>
                  {t("chat.agentBehavior.tone.friendly", "友好")}
                </SelectItem>
                <SelectItem id="professional" textValue={t("chat.agentBehavior.tone.professional", "专业")}>
                  {t("chat.agentBehavior.tone.professional", "专业")}
                </SelectItem>
              </Select>
            </div>
          </label>

          <label className="ChatConfigSections__subSetting">
            <span className="ChatConfigSections__subSettingHeader">
              <span className="ChatConfigSections__subSettingLabel">
                {t("chat.agentBehavior.knowledge.label", "知识沉淀")}
              </span>
              <span className="ChatConfigSections__subSettingDescription">
                {t(
                  "chat.agentBehavior.knowledge.description",
                  "决定助手什么时候可以把结果沉淀成文档或表格。"
                )}
              </span>
            </span>
            <div className="ChatConfigSections__inputWithIcon">
              <LuSparkles size={16} aria-hidden="true" />
              <Select
                selectedKey={knowledgeCaptureLevel}
                onSelectionChange={(key) => {
                  if (key == null) return;
                  const next = Number(key);
                  if (!Number.isInteger(next) || next < 1) return;
                  dispatch(
                    setKnowledgeCaptureLevel(next as KnowledgeCaptureLevel)
                  );
                }}
              >
                <SelectItem id={1} textValue={t("chat.agentBehavior.knowledge.level1", "1: 不主动创建")}>
                  {t("chat.agentBehavior.knowledge.level1", "1: 不主动创建")}
                </SelectItem>
                <SelectItem id={2} textValue={t("chat.agentBehavior.knowledge.level2", "2: 先问我再创建")}>
                  {t("chat.agentBehavior.knowledge.level2", "2: 先问我再创建")}
                </SelectItem>
                <SelectItem id={3} textValue={t("chat.agentBehavior.knowledge.level3", "3: 回答后建议创建")}>
                  {t("chat.agentBehavior.knowledge.level3", "3: 回答后建议创建")}
                </SelectItem>
                <SelectItem id={4} textValue={t("chat.agentBehavior.knowledge.level4", "4: 高价值结果可自动创建")}>
                  {t("chat.agentBehavior.knowledge.level4", "4: 高价值结果可自动创建")}
                </SelectItem>
              </Select>
            </div>
          </label>

          <label className="ChatConfigSections__subSetting">
            <span className="ChatConfigSections__subSettingHeader">
              <span className="ChatConfigSections__subSettingLabel">
                {t("chat.agentBehavior.space.label", "当前空间读取")}
              </span>
              <span className="ChatConfigSections__subSettingDescription">
                {t(
                  "chat.agentBehavior.space.description",
                  "决定助手是否以及在多大程度上自动读取当前空间内容。"
                )}
              </span>
            </span>
            <div className="ChatConfigSections__inputWithIcon">
              <LuScanSearch size={16} aria-hidden="true" />
              <Select
                selectedKey={spaceContextLevel}
                onSelectionChange={(key) => {
                  if (key == null) return;
                  const next = Number(key);
                  if (!Number.isInteger(next) || next < 1) return;
                  dispatch(setSpaceContextLevel(next as SpaceContextLevel));
                }}
              >
                <SelectItem id={1} textValue={t("chat.agentBehavior.space.level1", "1: 不自动读取")}>
                  {t("chat.agentBehavior.space.level1", "1: 不自动读取")}
                </SelectItem>
                <SelectItem id={2} textValue={t("chat.agentBehavior.space.level2", "2: 只看结构和标题")}>
                  {t("chat.agentBehavior.space.level2", "2: 只看结构和标题")}
                </SelectItem>
                <SelectItem id={3} textValue={t("chat.agentBehavior.space.level3", "3: 轻量读取")}>
                  {t("chat.agentBehavior.space.level3", "3: 轻量读取")}
                </SelectItem>
                <SelectItem id={4} textValue={t("chat.agentBehavior.space.level4", "4: 自适应读取")}>
                  {t("chat.agentBehavior.space.level4", "4: 自适应读取")}
                </SelectItem>
              </Select>
            </div>
          </label>
        </div>
      </SettingSection>

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
