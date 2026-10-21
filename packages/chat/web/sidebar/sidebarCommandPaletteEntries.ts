import type { MyContentListItem } from "app/utils/myContentItems";
import { getAgentRecordIdentifiers, getAgentRecordKey } from "ai/agent/utils/agentRecordIdentity";
import { isAllViewDialogImageAttachment } from "./allViewSearch";

export type PaletteSectionId = "favorites" | "spaces" | "content" | "publicAgents";

export type SidebarPaletteEntry =
  | {
      id: string;
      section: "favorites" | "content";
      kind: "content";
      title: string;
      textValue: string;
      meta: string;
      contentKey: string;
      contentType?: string;
    }
  | {
      id: string;
      section: "spaces";
      kind: "space";
      title: string;
      textValue: string;
      meta: string;
      spaceId: string;
    }
  | {
      id: string;
      section: "publicAgents";
      kind: "public-agent";
      title: string;
      textValue: string;
      meta: string;
      agentKey: string;
    };

export type MemberSpaceLike = {
  spaceId: string;
  spaceName?: string;
};

export type PublicAgentLike = {
  dbKey?: string;
  id?: string;
  name?: string;
  introduction?: string;
  description?: string;
  model?: string;
};

const toUpdatedAtMs = (value: string | number | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/** Caps while actively searching (non-empty query). */
export const SIDEBAR_PALETTE_LIMITS = {
  favorites: 30,
  spaces: 40,
  content: 100,
  publicAgents: 40,
} as const;

/**
 * Caps for the idle / empty-query open state.
 * Keep favorites + spaces visible; recent short; plaza hidden until typing.
 */
export const SIDEBAR_PALETTE_IDLE_LIMITS = {
  favorites: 12,
  spaces: 12,
  content: 10,
  publicAgents: 0,
} as const;

const contentTitle = (item: MyContentListItem): string =>
  item.title?.trim() || item.contentKey;

/** Prefer "页面 · Work" so the row itself shows where the item lives. */
export function formatContentMeta(
  typeLabel: string,
  spaceName?: string | null,
): string {
  const space = spaceName?.trim();
  return space ? `${typeLabel} · ${space}` : typeLabel;
}

export function buildFavoritePaletteEntries(
  favoriteItems: MyContentListItem[],
  typeLabel: (item: MyContentListItem) => string,
  limit: number = SIDEBAR_PALETTE_LIMITS.favorites,
): SidebarPaletteEntry[] {
  return favoriteItems.slice(0, limit).map((item) => {
    const title = contentTitle(item);
    const meta = formatContentMeta(typeLabel(item), item.spaceName);
    return {
      id: `favorite:${item.contentKey}`,
      section: "favorites",
      kind: "content",
      title,
      meta,
      contentKey: item.contentKey,
      contentType: item.type,
      textValue: [title, meta, item.spaceName, item.contentKey, "favorite", "收藏"]
        .filter(Boolean)
        .join(" "),
    };
  });
}

export function buildSpacePaletteEntries(
  spaces: readonly MemberSpaceLike[],
  spaceMetaLabel: string,
  unnamedSpaceLabel: string,
  limit: number = SIDEBAR_PALETTE_LIMITS.spaces,
): SidebarPaletteEntry[] {
  return spaces.slice(0, limit).map((space) => {
    const title = space.spaceName?.trim() || space.spaceId || unnamedSpaceLabel;
    return {
      id: `space:${space.spaceId}`,
      section: "spaces",
      kind: "space",
      title,
      meta: spaceMetaLabel,
      spaceId: space.spaceId,
      textValue: [title, space.spaceId, spaceMetaLabel, "space", "空间"]
        .filter(Boolean)
        .join(" "),
    };
  });
}

export function buildContentPaletteEntries(
  recentItems: MyContentListItem[],
  excludeKeys: ReadonlySet<string>,
  typeLabel: (item: MyContentListItem) => string,
  limit: number = SIDEBAR_PALETTE_LIMITS.content,
): SidebarPaletteEntry[] {
  return [...recentItems]
    .filter((item) => !isAllViewDialogImageAttachment(item))
    .filter((item) => !excludeKeys.has(item.contentKey))
    .sort((a, b) => toUpdatedAtMs(b.updatedAt) - toUpdatedAtMs(a.updatedAt))
    .slice(0, limit)
    .map((item) => {
      const title = contentTitle(item);
      const meta = formatContentMeta(typeLabel(item), item.spaceName);
      return {
        id: `content:${item.contentKey}`,
        section: "content",
        kind: "content",
        title,
        meta,
        contentKey: item.contentKey,
        contentType: item.type,
        textValue: [title, meta, item.spaceName, item.contentKey]
          .filter(Boolean)
          .join(" "),
      };
    });
}

export function buildPublicAgentPaletteEntries(
  agents: PublicAgentLike[],
  excludeKeys: ReadonlySet<string>,
  plazaMetaLabel: string,
  limit: number = SIDEBAR_PALETTE_LIMITS.publicAgents,
): SidebarPaletteEntry[] {
  const entries: SidebarPaletteEntry[] = [];

  for (const agent of agents) {
    if (entries.length >= limit) break;
    const agentKey = getAgentRecordKey(agent);
    if (!agentKey) continue;
    const identifiers = getAgentRecordIdentifiers(agent);
    if (identifiers.some((id) => excludeKeys.has(id)) || excludeKeys.has(agentKey)) {
      continue;
    }

    const title = agent.name?.trim() || agentKey;
    entries.push({
      id: `public:${agentKey}`,
      section: "publicAgents",
      kind: "public-agent",
      title,
      meta: plazaMetaLabel,
      agentKey,
      textValue: [
        title,
        plazaMetaLabel,
        agent.introduction,
        agent.description,
        agent.model,
        agentKey,
        "plaza",
        "广场",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  return entries;
}

/**
 * Exclude by the full favorites set, not the visible/capped slice.
 * Otherwise idle/search caps would let a favorited item reappear under recent/plaza.
 */
export function collectExcludedContentKeys(
  favoriteItems: Array<{ contentKey: string }>,
): Set<string> {
  const keys = new Set<string>();
  for (const item of favoriteItems) {
    const key = item.contentKey?.trim();
    if (key) keys.add(key);
  }
  return keys;
}
