import { describe, expect, it } from "bun:test";
import {
  buildContentPaletteEntries,
  buildFavoritePaletteEntries,
  buildPublicAgentPaletteEntries,
  buildSpacePaletteEntries,
  collectExcludedContentKeys,
  formatContentMeta,
  SIDEBAR_PALETTE_IDLE_LIMITS,
} from "./sidebarCommandPaletteEntries";

const typeLabel = (item: { type?: string }) => item.type || "content";

describe("sidebarCommandPaletteEntries", () => {
  it("builds favorite/space/content/public sections with caps and dedupe", () => {
    const favoriteItems = [
      {
        source: "user-data",
        title: "Pinned Agent",
        type: "agent",
        contentKey: "agent-1",
        pinned: true,
        createdAt: 1,
        updatedAt: 3,
        spaceId: null,
        spaceName: "",
      },
    ] as any;

    const favorites = buildFavoritePaletteEntries(favoriteItems, typeLabel);
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.id).toBe("favorite:agent-1");

    const spaces = buildSpacePaletteEntries(
      [
        { spaceId: "s1", spaceName: "Work" },
        { spaceId: "s2" },
      ],
      "空间",
      "未命名空间",
    );
    expect(spaces.map((entry) => entry.title)).toEqual(["Work", "s2"]);

    const excluded = collectExcludedContentKeys(favoriteItems);
    const content = buildContentPaletteEntries(
      [
        {
          source: "user-data",
          title: "Pinned Agent",
          type: "agent",
          contentKey: "agent-1",
          pinned: true,
          createdAt: 1,
          updatedAt: 3,
          spaceId: null,
          spaceName: "",
        },
        {
          source: "user-data",
          title: "Spec",
          type: "page",
          contentKey: "page-1",
          pinned: false,
          createdAt: 1,
          updatedAt: 9,
          spaceId: "s1",
          spaceName: "Work",
        },
        {
          source: "user-data",
          title: "Sheet",
          type: "table",
          contentKey: "meta-1",
          pinned: false,
          createdAt: 1,
          updatedAt: 8,
          spaceId: "s1",
          spaceName: "Work",
        },
      ] as any,
      excluded,
      typeLabel,
    );
    expect(content.map((entry) => (entry as any).contentKey)).toEqual(["page-1", "meta-1"]);
    expect(content[0]?.meta).toBe("page · Work");

    const publicAgents = buildPublicAgentPaletteEntries(
      [
        { dbKey: "agent-1", name: "Dup Favorite" },
        { dbKey: "agent-pub-2", name: "Plaza Bot", introduction: "hello" },
      ],
      excluded,
      "AI 广场",
    );
    expect(publicAgents).toHaveLength(1);
    expect((publicAgents[0] as any)?.agentKey).toBe("agent-pub-2");
    expect(publicAgents[0]?.textValue).toContain("hello");
  });

  it("excludes favorites beyond the visible slice", () => {
    const favoriteItems = Array.from({ length: 3 }, (_, index) => ({
      source: "user-data",
      title: `Fav ${index}`,
      type: "page",
      contentKey: `page-fav-${index}`,
      pinned: true,
      createdAt: index,
      updatedAt: index,
      spaceId: "s1",
      spaceName: "Work",
    })) as any;

    const visibleFavorites = buildFavoritePaletteEntries(
      favoriteItems,
      typeLabel,
      1,
    );
    expect(visibleFavorites).toHaveLength(1);

    const excluded = collectExcludedContentKeys(favoriteItems);
    expect(excluded.has("page-fav-0")).toBe(true);
    expect(excluded.has("page-fav-2")).toBe(true);

    const content = buildContentPaletteEntries(
      favoriteItems,
      excluded,
      typeLabel,
      10,
    );
    expect(content).toHaveLength(0);
  });

  it("formats content meta with optional space name", () => {
    expect(formatContentMeta("页面", "Work")).toBe("页面 · Work");
    expect(formatContentMeta("页面", "  ")).toBe("页面");
    expect(formatContentMeta("页面")).toBe("页面");
  });

  it("hides plaza and caps recent on idle limits", () => {
    expect(SIDEBAR_PALETTE_IDLE_LIMITS.publicAgents).toBe(0);
    expect(SIDEBAR_PALETTE_IDLE_LIMITS.content).toBe(10);

    const content = buildContentPaletteEntries(
      Array.from({ length: 20 }, (_, index) => ({
        source: "user-data",
        title: `Page ${index}`,
        type: "page",
        contentKey: `page-${index}`,
        pinned: false,
        createdAt: index,
        updatedAt: index,
        spaceId: null,
        spaceName: "",
      })) as any,
      new Set(),
      typeLabel,
      SIDEBAR_PALETTE_IDLE_LIMITS.content,
    );
    expect(content).toHaveLength(10);

    const publicAgents = buildPublicAgentPaletteEntries(
      [{ dbKey: "agent-pub-2", name: "Plaza Bot" }],
      new Set(),
      "AI 广场",
      SIDEBAR_PALETTE_IDLE_LIMITS.publicAgents,
    );
    expect(publicAgents).toHaveLength(0);
  });
});
