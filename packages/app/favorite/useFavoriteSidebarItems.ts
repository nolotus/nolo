// useFavoriteSidebarItems — 让侧边栏「我的收藏」块显示全部收藏内容，
// 不受最近 200 条 recentItems 窗口裁剪。
//
// 只显示显式收藏（key 在 favoriteStore 里）的内容；不做「收藏的 agent 的
// 会话」这类推导（owner 2026-07-29 定：收藏区域只显示收藏数据）。
//
// ── 窗口外收藏的标题：零请求，按类型给诚实占位 ──
// 窗口外的 key 往往从未被读过，db.entities 里没有它，标题就无从解析。补读看起来
// 是拿到真名的唯一办法，但它换不到有界负载，所以这里明确不做：
//  1. `read` thunk 在本地命中时也是「先启动后台 revalidation、再立即返回」，
//     所以「队列槽位释放」≠「远端请求结束」——按在飞槽位算并发上限根本约束不到
//     wire 上的请求数（ce6be26b6 的形态照样能复现）。
//  2. 现有的批量摘要通道只能按 type 取「最近 N 条」，没有按 key 集合过滤的能力：
//     noloQueryRequest 把 condition 原样 POST 给服务端（packages/database/client/
//     queryRequest.ts），而仓库里所有调用点的 condition 都只有 { type, ... }
//     （packages/database/hooks/useUserData.ts:287,311、
//     packages/database/client/ownedDialogPage.ts:40、packages/app/fetchOwnedApps.ts:242），
//     URL 上也只接受 limit / since / dialogPage+cursor。窗口外收藏按定义就落在
//     「最近 N 条」之外，要用这条通道补名就得把该用户的整份内容列表翻出来——
//     那是比单读更大的服务端负载。
// 因此：有本地记录就用与最近列表同一条标题链（resolveUserContentTitle）解析真名；
// 没有本地记录时显示按类型的诚实占位（「对话」/「文档」/「表格」/「AI」/…），
// 既不是「未命名」，也不把原始 dbKey（如 agent-xxx）暴露到界面上。

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "app/store";
import { getSpaceContentTypeLabel } from "create/space/contentLabels";
import { resolveUserContentTitle } from "app/utils/myContentItems";
import {
  useFavoriteAgentIds,
  useFavoriteContentIds,
  useFavoriteFavoritedAtById,
} from "./favoriteStore";
import type { MyContentListItem } from "app/utils/myContentItems";

/** key 前缀 → type 推断表，实体缺 type 时回退用 */
const inferTypeFromKey = (key: string): string => {
  if (key.startsWith("app-")) return "app";
  if (key.startsWith("dialog-")) return "dialog";
  if (key.startsWith("page-")) return "page";
  if (key.startsWith("meta-")) return "table";
  if (key.startsWith("image-")) return "image";
  if (key.startsWith("file-")) return "file";
  if (key.startsWith("agent-") || key.startsWith("cybot-")) return "agent";
  return "file";
};

/**
 * 收藏分区条目：在通用 item 之上携带「详情缺失」这一渲染态。
 *
 * detailMissing = 本地没有这条收藏的实体记录，title 只是按类型的标签占位。
 * 渲染层据此把这一行画成「类型图标 + 类型标签」的完整条目外观，而不是一个
 * 看起来像标题丢失的空壳；它不承诺任何自动加载（本 hook 依旧零请求）。
 */
export type FavoriteSidebarItem = MyContentListItem & { detailMissing?: boolean };

/**
 * 输入调用方已有的 recentItems，输出完整收藏 items（窗口内 + 窗口外）。
 * 按 favoritedAt 降序；缺收藏时间的项排最后。
 *
 * 只读 store / 本地实体，不发任何请求——窗口外收藏没有本地记录时用类型占位。
 */
export const useFavoriteSidebarItems = (
  recentItems: MyContentListItem[],
): FavoriteSidebarItem[] => {
  const { t } = useTranslation("space");
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

  // 窗口外的收藏 key。它们本地通常没有记录，这里也不为它们读任何东西。
  const outsideKeys = useMemo(
    () =>
      Array.from(favoriteKeysSet).filter((key) => !recentContentKeys.has(key)),
    [favoriteKeysSet, recentContentKeys],
  );

  // 读本地已有的实体。用 useAppSelector + useMemo 避免每次渲染返回新对象
  // 导致 useAppSelector 引发无限循环。
  const dbEntities = useAppSelector((s) => s.db.entities) as Record<
    string,
    any
  > | undefined;
  const outsideEntities = useMemo(() => {
    const result: Record<string, any> = {};
    for (const key of outsideKeys) {
      const entity = dbEntities?.[key];
      if (entity) {
        result[key] = entity;
      }
    }
    return result;
  }, [outsideKeys, dbEntities]);

  // ── 窗口内收藏项（只认显式收藏 key，无推导）──
  const insideItems = useMemo(
    () => recentItems.filter((item) => favoriteKeysSet.has(item.contentKey)),
    [recentItems, favoriteKeysSet],
  );

  // ── 窗口外收藏项（本地实体优先，取不到标题时用类型占位）──
  const outsideItems = useMemo<FavoriteSidebarItem[]>(() => {
    const items: FavoriteSidebarItem[] = [];
    for (const key of outsideKeys) {
      const entity = outsideEntities[key];
      const type = entity?.type || inferTypeFromKey(key);
      // 标题优先链与最近列表共用（title → displayName → name）：凡是本地有记录
      // 的（用户已打开过、或最近列表之外的缓存仍在）都能显示真名。
      // 完全没有本地记录时，用「按类型的诚实占位」而不是「未命名」：
      // 用户至少能看出这是一条对话 / 文档 / 表格 / AI，也知道这不是标题丢失。
      const resolvedTitle = resolveUserContentTitle(entity ?? {});
      // 完全没有本地记录时，用「按类型的诚实占位」而不是「未命名」：
      // 用户至少能看出这是一条对话 / 文档 / 表格 / AI，也知道这不是标题丢失。
      // 同时把这一态带给渲染层（detailMissing），由它决定这行画成
      // 「类型图标 + 类型标签」，而不是一个像丢了标题的空壳。
      const detailMissing = !resolvedTitle;
      const title =
        resolvedTitle ||
        getSpaceContentTypeLabel({ type, contentKey: key }, t);
      items.push({
        source: "user-data",
        title,
        type,
        contentKey: key,
        pinned: false,
        createdAt: 0,
        updatedAt: 0,
        spaceId: entity?.spaceId ?? null,
        spaceName: "",
        serverOrigin: entity?.serverOrigin,
        fileCategory: entity?.fileCategory ?? undefined,
        mimeType: entity?.mimeType,
        originalName: entity?.originalName,
        detailMissing: detailMissing || undefined,
      });
    }
    return items;
  }, [outsideKeys, outsideEntities, t]);

  // ── 合并 + 按 favoritedAt 降序 ──
  const allItems = useMemo<FavoriteSidebarItem[]>(() => {
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
