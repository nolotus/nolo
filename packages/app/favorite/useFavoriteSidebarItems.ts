// useFavoriteSidebarItems — 让侧边栏「我的收藏」块显示全部收藏内容，
// 不受最近 200 条 recentItems 窗口裁剪。
//
// 只显示显式收藏（key 在 favoriteStore 里）的内容；不做「收藏的 agent 的
// 会话」这类推导（owner 2026-07-29 定：收藏区域只显示收藏数据）。
// 窗口内的收藏项保留原 filter 行为；窗口外的 key 通过 dispatch(read)
// 补拉 redux 实体后构建 item，加载完自然补上。
//
// 模式照抄 packages/ai/agent/web/FavoritesCollection.tsx 的 selectById + dispatch(read)。

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { read } from "database/dbSlice";
import {
  useFavoriteAgentIds,
  useFavoriteContentIds,
  useFavoriteFavoritedAtById,
} from "./favoriteStore";
import type { MyContentListItem } from "app/utils/myContentItems";

/** key 前缀 → type 推断表，实体缺 type 时回退用 */
const inferTypeFromKey = (key: string): string => {
  if (key.startsWith("dialog-")) return "dialog";
  if (key.startsWith("page-")) return "page";
  if (key.startsWith("meta-")) return "table";
  if (key.startsWith("image-")) return "image";
  if (key.startsWith("file-")) return "file";
  if (key.startsWith("agent-") || key.startsWith("cybot-")) return "agent";
  return "file";
};

/**
 * 输入调用方已有的 recentItems，输出完整收藏 items（窗口内 + 窗口外）。
 * 按 favoritedAt 降序；缺收藏时间的项排最后。
 */
export const useFavoriteSidebarItems = (
  recentItems: MyContentListItem[],
): MyContentListItem[] => {
  const dispatch = useAppDispatch();
  const agentIds = useFavoriteAgentIds();
  const contentIds = useFavoriteContentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();

  const favoriteKeysSet = useMemo(
    () => new Set([...agentIds, ...contentIds]),
    [agentIds, contentIds],
  );

  // recentItems 已有 contentKey 集合，用于判断哪些收藏 key 在窗口外
  const recentContentKeys = useMemo(
    () => new Set(recentItems.map((item) => item.contentKey)),
    [recentItems],
  );

  // 窗口外的 key：在 favoriteKeysSet 但不在 recentContentKeys 中
  const outsideKeys = useMemo(
    () => Array.from(favoriteKeysSet).filter((key) => !recentContentKeys.has(key)),
    [favoriteKeysSet, recentContentKeys],
  );

  // 读所有窗口外 key 的实体。用 useAppSelector + useMemo 避免每次渲染返回新对象
  // 导致 useAppSelector 引发无限循环。
  const dbEntities = useAppSelector((s) => s.db.entities);
  const outsideEntities = useMemo(() => {
    const result: Record<string, any> = {};
    for (const key of outsideKeys) {
      const entity = dbEntities[key];
      if (entity) {
        result[key] = entity;
      }
    }
    return result;
  }, [outsideKeys, dbEntities]);

  // 补拉缺失的实体（实体未到位的 key 暂不出现，加载完自然补上）
  useEffect(() => {
    if (outsideKeys.length === 0) return;
    for (const key of outsideKeys) {
      if (!outsideEntities[key]) {
        void dispatch(read({ dbKey: key }));
      }
    }
    // 依赖 outsideKeys 即可；outsideEntities 随 redux 更新触发重渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsideKeys]);

  // ── 窗口内收藏项（只认显式收藏 key，无推导）──
  const insideItems = useMemo(
    () => recentItems.filter((item) => favoriteKeysSet.has(item.contentKey)),
    [recentItems, favoriteKeysSet],
  );

  // ── 窗口外收藏项（从 redux 实体构建）──
  const outsideItems = useMemo<MyContentListItem[]>(() => {
    const items: MyContentListItem[] = [];
    for (const key of outsideKeys) {
      const entity = outsideEntities[key];
      if (!entity) continue; // 实体未到位前暂不出现
      const type = entity.type || inferTypeFromKey(key);
      // 实体已在 redux（上面的 !entity 挡住了未加载项），但 name/title 字段
      // 可能尚未就绪（如 agent 实体到位但 name 还在 hydrate）。此时 title 留空，
      // 由 SidebarItemRow/SidebarPinnedBlock 兜底显示本地化「未命名」，
      // 避免退化回显示原始 dbKey（如 agent-xxx）导致切换视图时名字/头像闪烁。
      const resolvedTitle =
        type === "agent"
          ? entity.name || entity.title || ""
          : entity.title || "";
      items.push({
        source: "user-data",
        title: resolvedTitle,
        type,
        contentKey: key,
        pinned: false,
        createdAt: 0,
        updatedAt: 0,
        spaceId: entity.spaceId ?? null,
        spaceName: "",
        serverOrigin: entity.serverOrigin,
        fileCategory: entity.fileCategory ?? undefined,
        mimeType: entity.mimeType,
        originalName: entity.originalName,
      } as MyContentListItem);
    }
    return items;
  }, [outsideKeys, outsideEntities]);

  // ── 合并 + 按 favoritedAt 降序 ──
  const allItems = useMemo(() => {
    const combined = [...insideItems, ...outsideItems];
    combined.sort((a, b) => {
      const aTime = favoritedAtById[a.contentKey] ?? 0;
      const bTime = favoritedAtById[b.contentKey] ?? 0;
      return bTime - aTime;
    });
    return combined;
  }, [insideItems, outsideItems, favoritedAtById]);

  return allItems;
};