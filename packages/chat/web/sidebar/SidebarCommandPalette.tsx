import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Key } from "react-aria-components";
import { LuBoxes, LuBot, LuLoaderCircle, LuStar } from "react-icons/lu";
import { useNavigate } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId } from "identity";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useFavoriteSidebarItems } from "app/favorite/useFavoriteSidebarItems";
import {
  initFavorites,
  useFavoritesInitialized,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { getSpaceContentTypeLabel } from "create/space/contentLabels";
import {
  changeSpace,
} from "create/space/spaceSlice";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import {
  ITEM_ICONS,
  type ItemType,
} from "create/space/sidebarItemShared";
import { Header, MenuItem, MenuSection } from "render/web/ui/Menu";
import Kbd from "render/web/ui/Kbd";
import * as stylex from "@stylexjs/stylex";
import { commandPaletteStyles as cpStyles } from "./commandPaletteStyles";
import { CommandPalette } from "./CommandPalette";
import {
  buildContentPaletteEntries,
  buildFavoritePaletteEntries,
  buildPublicAgentPaletteEntries,
  buildSpacePaletteEntries,
  collectExcludedContentKeys,
  SIDEBAR_PALETTE_IDLE_LIMITS,
  SIDEBAR_PALETTE_LIMITS,
  type SidebarPaletteEntry,
} from "./sidebarCommandPaletteEntries";

const resolveContentIcon = (entry: Extract<SidebarPaletteEntry, { kind: "content" }>) => {
  const type = (entry.contentType || "").toLowerCase() as ItemType;
  if (type in ITEM_ICONS) return ITEM_ICONS[type];
  if (entry.contentKey.startsWith("dialog-")) return ITEM_ICONS.dialog;
  if (entry.contentKey.startsWith("page-")) return ITEM_ICONS.page;
  if (entry.contentKey.startsWith("meta-")) return ITEM_ICONS.table;
  if (entry.contentKey.startsWith("agent-") || entry.contentKey.startsWith("cybot-")) {
    return ITEM_ICONS.agent;
  }
  if (entry.contentKey.startsWith("app-")) return ITEM_ICONS.app;
  if (entry.contentKey.startsWith("image-")) return ITEM_ICONS.image;
  return ITEM_ICONS.file;
};

const PaletteEntryItem = ({ entry }: { entry: SidebarPaletteEntry }) => {
  if (entry.kind === "space") {
    return (
      <MenuItem id={entry.id} textValue={entry.textValue} data-hook="chat-esc-cp-item">
        <LuBoxes size={16} aria-hidden="true" />
        <span slot="label" {...stylex.props(cpStyles.itemLabel)}>
          {entry.title}
        </span>
        <span {...stylex.props(cpStyles.itemMeta)}>{entry.meta}</span>
      </MenuItem>
    );
  }

  if (entry.kind === "public-agent") {
    return (
      <MenuItem id={entry.id} textValue={entry.textValue} data-hook="chat-esc-cp-item">
        <LuBot size={16} aria-hidden="true" />
        <span slot="label" {...stylex.props(cpStyles.itemLabel)}>
          {entry.title}
        </span>
        <span {...stylex.props(cpStyles.itemMeta)}>{entry.meta}</span>
      </MenuItem>
    );
  }

  const Icon = entry.section === "favorites" ? LuStar : resolveContentIcon(entry);
  return (
    <MenuItem id={entry.id} textValue={entry.textValue} data-hook="chat-esc-cp-item">
      <Icon size={16} aria-hidden="true" />
      <span slot="label" {...stylex.props(cpStyles.itemLabel)}>
        {entry.title}
      </span>
      <span {...stylex.props(cpStyles.itemMeta)}>{entry.meta}</span>
    </MenuItem>
  );
};

type PublicAgentsSnapshot = {
  agents: any[];
  loading: boolean;
};

/** Mounts public-agent fetch only after the palette has been opened once. */
function useLazyPublicAgents(enabled: boolean) {
  const [warmed, setWarmed] = useState(false);
  const [snapshot, setSnapshot] = useState<PublicAgentsSnapshot>({
    agents: [],
    loading: false,
  });

  useEffect(() => {
    if (enabled) setWarmed(true);
  }, [enabled]);

  return { warmed, snapshot, setSnapshot };
}

function PublicAgentsWarmup({
  onSnapshot,
}: {
  onSnapshot: (snapshot: PublicAgentsSnapshot) => void;
}) {
  const { data: publicAgents = [], loading } = usePublicAgents({
    limit: SIDEBAR_PALETTE_LIMITS.publicAgents,
    sortBy: "recommended",
    reloadMode: "catalog",
    summary: true,
  });

  useEffect(() => {
    onSnapshot({ agents: publicAgents, loading });
  }, [publicAgents, loading, onSnapshot]);

  return null;
}

export type SidebarCommandPaletteProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function SidebarCommandPalette({
  isOpen,
  onOpenChange,
}: SidebarCommandPaletteProps) {
  const { t } = useTranslation(["space", "common"]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const favoritesInitialized = useFavoritesInitialized();
  const favoriteDeps = useFavoriteDeps();
  const memberSpaces = useAllMemberSpaces();
  const { items: recentItems } = useMyContentItems();
  const favoriteItems = useFavoriteSidebarItems(recentItems);
  const [query, setQuery] = useState("");
  const {
    warmed: publicAgentsWarmed,
    snapshot: publicAgentsSnapshot,
    setSnapshot: setPublicAgentsSnapshot,
  } = useLazyPublicAgents(isOpen);
  const handlePublicAgentsSnapshot = useCallback((snapshot: PublicAgentsSnapshot) => {
    setPublicAgentsSnapshot(snapshot);
  }, [setPublicAgentsSnapshot]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setQuery("");
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (isOpen && !favoritesInitialized && favoriteDeps?.token) {
      void initFavorites(favoriteDeps);
    }
  }, [favoriteDeps, favoritesInitialized, isOpen]);

  const isIdle = query.trim().length === 0;
  const limits = isIdle ? SIDEBAR_PALETTE_IDLE_LIMITS : SIDEBAR_PALETTE_LIMITS;

  const typeLabel = useCallback(
    (item: Parameters<typeof getSpaceContentTypeLabel>[0]) =>
      getSpaceContentTypeLabel(item, t),
    [t],
  );

  const favoriteEntries = useMemo(
    () => buildFavoritePaletteEntries(favoriteItems, typeLabel, limits.favorites),
    [favoriteItems, typeLabel, limits.favorites],
  );

  // Exclude from the full favorites set, not the capped visible slice.
  const excludedKeys = useMemo(
    () => collectExcludedContentKeys(favoriteItems),
    [favoriteItems],
  );

  const spaceEntries = useMemo(
    () =>
      buildSpacePaletteEntries(
        memberSpaces,
        t("space_list", "空间"),
        t("unnamedSpace", "未命名空间"),
        limits.spaces,
      ),
    [memberSpaces, t, limits.spaces],
  );

  const contentEntries = useMemo(
    () =>
      buildContentPaletteEntries(
        recentItems,
        excludedKeys,
        typeLabel,
        limits.content,
      ),
    [recentItems, excludedKeys, typeLabel, limits.content],
  );

  const publicEntries = useMemo(
    () =>
      buildPublicAgentPaletteEntries(
        publicAgentsSnapshot.agents,
        excludedKeys,
        t("common:homeTabs.aiPlaza", "AI 广场"),
        limits.publicAgents,
      ),
    [publicAgentsSnapshot.agents, excludedKeys, t, limits.publicAgents],
  );

  const showPublicLoading =
    !isIdle &&
    publicAgentsWarmed &&
    publicAgentsSnapshot.loading &&
    publicEntries.length === 0;

  const entryById = useMemo(() => {
    const map = new Map<string, SidebarPaletteEntry>();
    for (const entry of [
      ...favoriteEntries,
      ...spaceEntries,
      ...contentEntries,
      ...publicEntries,
    ]) {
      map.set(entry.id, entry);
    }
    return map;
  }, [favoriteEntries, spaceEntries, contentEntries, publicEntries]);

  const handleAction = useCallback(
    (key: Key) => {
      const entry = entryById.get(String(key));
      if (!entry) return;

      if (entry.kind === "space") {
        void (dispatch as any)((changeSpace as any)(entry.spaceId));
        navigate(`/space/${entry.spaceId}`);
        handleOpenChange(false);
        return;
      }

      if (entry.kind === "public-agent") {
        navigate(`/${entry.agentKey}`);
        handleOpenChange(false);
        return;
      }

      navigate(
        buildRoutableContentPath({
          contentKey: entry.contentKey,
          type: entry.contentType,
          userId: currentUserId ?? undefined,
        }),
      );
      handleOpenChange(false);
    },
    [entryById, dispatch, navigate, currentUserId, handleOpenChange],
  );

  const sections = [
    {
      id: "favorites",
      title: t("allView.favorites", "我的收藏"),
      entries: favoriteEntries,
    },
    {
      id: "spaces",
      title: t("space_list", "空间"),
      entries: spaceEntries,
    },
    {
      id: "content",
      title: t("allView.recent", "最近"),
      entries: contentEntries,
    },
    {
      id: "publicAgents",
      title: t("common:homeTabs.aiPlaza", "AI 广场"),
      entries: publicEntries,
    },
  ] as const;

  return (
    <>
      {publicAgentsWarmed ? (
        <PublicAgentsWarmup onSnapshot={handlePublicAgentsSnapshot} />
      ) : null}
      <CommandPalette
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        onAction={handleAction}
        inputValue={query}
        onInputChange={setQuery}
        placeholder={t(
          "command_palette_placeholder",
          "搜索收藏、空间、最近内容、AI…",
        )}
        searchAriaLabel={t("common:search", "搜索")}
        emptyState={t("search_no_results", "没有找到结果")}
        aria-label={t("common:search", "搜索")}
        footer={
          <>
            <span {...stylex.props(cpStyles.footerHint)} data-hook="chat-esc-cp-footer-hint">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {t("command_palette_hint_navigate", "导航")}
            </span>
            <span {...stylex.props(cpStyles.footerHint)} data-hook="chat-esc-cp-footer-hint">
              <Kbd>Enter</Kbd>
              {t("command_palette_hint_open", "打开")}
            </span>
            <span {...stylex.props(cpStyles.footerHint)} data-hook="chat-esc-cp-footer-hint">
              <Kbd>Esc</Kbd>
              {t("command_palette_hint_close", "关闭")}
            </span>
          </>
        }
      >
        {sections.map((section) => {
          const isPublicSection = section.id === "publicAgents";
          if (section.entries.length === 0 && !(isPublicSection && showPublicLoading)) {
            return null;
          }

          return (
            <MenuSection
              key={section.id}
              id={section.id}
              {...stylex.props(cpStyles.section)}
            >
              <Header data-hook="chat-esc-cp-section-header">
                {section.title}
              </Header>
              {section.entries.map((entry) => (
                <PaletteEntryItem key={entry.id} entry={entry} />
              ))}
              {isPublicSection && showPublicLoading ? (
                <MenuItem
                  id="public-agents-loading"
                  textValue={t("command_palette_loading_plaza", "正在加载 AI 广场")}
                  isDisabled
                  data-hook="chat-esc-cp-item chat-esc-cp-item-status"
                >
                  <LuLoaderCircle
                    size={16}
                    aria-hidden="true"
                    data-hook="chat-esc-cp-spinner"
                    {...stylex.props(cpStyles.spinner)}
                  />
                  <span slot="label" {...stylex.props(cpStyles.itemLabel)}>
                    {t("command_palette_loading_plaza", "正在加载 AI 广场…")}
                  </span>
                </MenuItem>
              ) : null}
            </MenuSection>
          );
        })}
      </CommandPalette>
    </>
  );
}
