// 路径: ai/agent/web/AgentMemoryTab.tsx
//
// "这个 Agent 记得你什么"：按 agent subject 列出当前用户的记忆，
// 支持单条删除和全部清除。隐私入口：用户可见、可删。

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuBrain, LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { toast } from "app/utils/toast";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useToken, useUserId } from "identity";
import { createAgentKey } from "database/keys";
import Button from "render/web/ui/Button";
import * as stylex from "@stylexjs/stylex";
import { agentMemoryTabStyles as styles } from "./agentMemoryTabStyles";
import "./agentPageStylexEscapeHatch.css";

interface AgentMemoryItem {
  id: string;
  ownerType: string;
  ownerId: string;
  subjectId: string;
  kind: "episodic" | "semantic" | "procedural";
  content: string;
  createdAt: string;
  lastActivatedAt: string;
  activationCount: number;
  confidence: number;
  facet?: string;
}

const isAgentMemoryItem = (value: unknown): value is AgentMemoryItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.content === "string" &&
    typeof item.kind === "string" &&
    typeof item.subjectId === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.confidence === "number"
  );
};

/** Per-subject-key page size; list API caps at 200. No pagination in v1 —
 * when any key's response is truncated we surface a "showing recent N" hint. */
const AGENT_MEMORY_PAGE_LIMIT = 100;

const formatDate = (value: string): string => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

type AgentMemoryTabProps = {
  agentId?: string;
  agentKey?: string;
};

const AgentMemoryTab: React.FC<AgentMemoryTabProps> = ({ agentId, agentKey }) => {
  const { t } = useTranslation("ai");
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);
  const userId = useUserId();

  const [items, setItems] = useState<AgentMemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const serverBase = useMemo(
    () => (server ? server.replace(/\/$/, "") : null),
    [server]
  );

  // 对话里 subject 用的是 agent 的 dbKey：私有/公开两种形态都查。
  const subjectKeys = useMemo(() => {
    const keys = new Set<string>();
    if (agentKey) keys.add(agentKey);
    if (agentId) {
      keys.add(createAgentKey.public(agentId));
      if (userId) keys.add(createAgentKey.private(userId, agentId));
    }
    return [...keys];
  }, [agentKey, agentId, userId]);

  const canManage = Boolean(token && serverBase && subjectKeys.length > 0);

  const postJson = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      const res = await fetch(`${serverBase}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${path} failed (${res.status})`);
      return res.json();
    },
    [serverBase, token]
  );

  const loadItems = useCallback(async () => {
    setTruncated(false);
    if (!canManage) return;
    setLoading(true);
    try {
      const responses = await Promise.all(
        subjectKeys.map((subjectId) =>
          postJson("/api/memory/list", {
            limit: AGENT_MEMORY_PAGE_LIMIT,
            subjectType: "agent",
            subjectId,
          }).catch(() => ({ items: [] }))
        )
      );
      const merged = new Map<string, AgentMemoryItem>();
      let anyTruncated = false;
      for (const data of responses) {
        const rawItems = Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
        if ((data as any)?.nextCursor) anyTruncated = true;
        for (const item of rawItems) {
          if (isAgentMemoryItem(item)) merged.set(item.id, item);
        }
      }
      setTruncated(anyTruncated);
      setItems(
        [...merged.values()].sort(
          (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
        )
      );
    } catch {
      toast.error(t("agentMemory.loadError", "记忆加载失败"));
    } finally {
      setLoading(false);
    }
  }, [canManage, subjectKeys, postJson, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (id: string) => {
    try {
      await postJson("/api/memory/delete", { ids: [id] });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(t("agentMemory.deleteSuccess", "已删除这条记忆"));
    } catch {
      toast.error(t("agentMemory.deleteError", "删除失败"));
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        t(
          "agentMemory.clearConfirm",
          "确定清除这个 Agent 记住的全部内容吗？此操作不可恢复。"
        )
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      // allSettled instead of all: per-key deletes are independent server
      // batches, so a mid-flight failure means partial deletion — always
      // resync from the server instead of guessing local state.
      const results = await Promise.allSettled(
        subjectKeys.map((subjectId) =>
          postJson("/api/memory/delete", {
            subjectType: "agent",
            subjectId,
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        setItems([]);
        setTruncated(false);
        toast.success(t("agentMemory.clearSuccess", "已清除全部记忆"));
      } else {
        toast.error(
          t("agentMemory.clearPartialError", "部分清除失败，已刷新列表")
        );
        await loadItems();
      }
    } catch {
      toast.error(t("agentMemory.clearError", "清除失败，请重试"));
      await loadItems();
    } finally {
      setClearing(false);
    }
  };

  // 手动新增一条 agent 记忆：复用 /api/memory/remember，传 agentKey 让后端
  // 把 subject 写成 { subjectType: "agent", subjectId: agentKey }，这样这条
  // 记忆会出现在本 Tab 的列表里（和 understanding memory 同一查询条件）。
  const handleAdd = async () => {
    const content = draft.trim();
    if (!content || !canManage || subjectKeys.length === 0) return;
    setSubmitting(true);
    try {
      const data = await postJson("/api/memory/remember", {
        content,
        scope: "user",
        kind: "episodic",
        agentKey: subjectKeys[0],
      });
      const saved = (data as any)?.savedItems?.[0];
      if (saved && isAgentMemoryItem(saved)) {
        setItems((prev) =>
          [saved, ...prev].sort(
            (left, right) =>
              Date.parse(right.createdAt) - Date.parse(left.createdAt)
          )
        );
      } else {
        await loadItems();
      }
      setDraft("");
      toast.success(t("agentMemory.addSuccess", "已添加这条记忆"));
    } catch {
      toast.error(t("agentMemory.addError", "添加失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const kindLabel = (item: AgentMemoryItem): string => {
    if (item.kind === "semantic")
      return t("agentMemory.kindSemantic", "多次确认");
    if (item.kind === "procedural")
      return t("agentMemory.kindProcedural", "流程");
    return t("agentMemory.kindEpisodic", "单次观察");
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <div>
          <h3 {...stylex.props(styles.title)}>
            {t("agentMemory.title", "这个 Agent 记得你什么")}
          </h3>
          <p {...stylex.props(styles.description)}>
            {t(
              "agentMemory.description",
              "以下内容来自你和这个 Agent 的对话。删除后它将不再记得对应内容；被你纠正过的记忆置信度会降低并停止使用。"
            )}
          </p>
        </div>
        <div {...stylex.props(styles.actions)}>
          <Button
            variant="ghost"
            size="small"
            icon={
              <LuRefreshCw
                size={14}
                {...(loading ? stylex.props(styles.spin) : {})}
                aria-hidden="true"
              />
            }
            onClick={loadItems}
            disabled={loading || !canManage}
            title={t("agentMemory.refresh", "刷新")}
          />
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="small"
              onClick={handleClearAll}
              disabled={clearing}
              loading={clearing}
            >
              {t("agentMemory.clearAll", "全部清除")}
            </Button>
          )}
        </div>
      </div>

      {canManage && (
        <form
          {...stylex.props(styles.add)}
          data-testid="agent-memory-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <textarea
            {...stylex.props(styles.addInput)}
            data-testid="agent-memory-add-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t(
              "agentMemory.addPlaceholder",
              "写一句你想让这个 Agent 记住的话…"
            )}
            rows={2}
            disabled={submitting}
          />
          <Button
            type="submit"
            variant="ghost"
            size="small"
            icon={<LuPlus size={14} aria-hidden="true" />}
            disabled={submitting || draft.trim().length === 0}
            loading={submitting}
          >
            {t("agentMemory.add", "添加记忆")}
          </Button>
        </form>
      )}

      {!canManage || items.length === 0 ? (
        <div {...stylex.props(styles.empty)}>
          <LuBrain size={36} aria-hidden="true" />
          <p>
            {canManage
              ? t("agentMemory.empty", "这个 Agent 还没有关于你的记忆。")
              : t("agentMemory.loginRequired", "登录后可查看和管理记忆。")}
          </p>
        </div>
      ) : (
        <>
          {truncated && (
            <p
              {...stylex.props(styles.truncatedHint)}
              data-testid="agent-memory-truncated-hint"
            >
              {t(
                "agentMemory.truncated",
                "记忆较多，当前显示最近 {{count}} 条；更早内容未展示。",
                { count: items.length }
              )}
            </p>
          )}
          <ul {...stylex.props(styles.list)}>
            {items.map((item) => (
              <li key={item.id} {...stylex.props(styles.item)}>
                <div {...stylex.props(styles.itemMain)}>
                  <div {...stylex.props(styles.itemContent)}>
                    {item.content}
                  </div>
                  <div {...stylex.props(styles.itemMeta)}>
                    <span
                      {...stylex.props(
                        styles.badge,
                        item.kind === "semantic" && styles.badgeSemantic
                      )}
                    >
                      {kindLabel(item)}
                    </span>
                    <span>
                      {t("agentMemory.confidence", "置信度")}{" "}
                      {Math.round((item.confidence ?? 0) * 100)}%
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  icon={<LuTrash2 size={14} aria-hidden="true" />}
                  onClick={() => handleDelete(item.id)}
                  title={t("agentMemory.delete", "删除这条记忆")}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AgentMemoryTab;
