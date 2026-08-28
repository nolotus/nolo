import { describe, expect, it } from "bun:test";
import { ContentType } from "app/types";
import { DataType } from "create/types";
import {
  buildOwnedAppContentItems,
  buildMyContentItemsFromUserData,
  buildMyContentPreviewItems,
  deduplicateContentRecords,
  deduplicateContentRecordsWithMappings,
  resolveMyContentTab,
} from "./myContentItems";

describe("myContentItems", () => {
  it("builds owned app items from the dedicated app management source", () => {
    const items = buildOwnedAppContentItems(
      [
        {
          name: "Managed app",
          appId: "managed",
          appKey: "app-u1-managed",
          url: "https://nolo.chat/apps/managed/",
          customUrl: "https://managed.example.test",
          modifiedOn: "2026-03-15T00:00:00.000Z",
          serverOrigin: "https://nolo.chat",
        },
      ],
      "我的应用"
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        source: "owned-app",
        contentKey: "app-u1-managed",
        title: "Managed app",
        spaceId: null,
        spaceName: "我的应用",
        serverOrigin: "https://nolo.chat",
      })
    );
    expect(items[0]?.app.customUrl).toBe("https://managed.example.test");
  });

  it("builds app and document items from a single queried record list", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          name: "Owned app",
          type: ContentType.APP,
          appId: "owned",
          appKey: "app-u1-owned",
          updatedAt: 3,
          spaceId: "space-1",
        },
        {
          title: "Doc 1",
          type: ContentType.DOC,
          dbKey: "page-u1-doc1",
          updatedAt: 2,
          spaceId: "space-1",
        },
      ],
      "https://nolo.chat",
      new Map([["space-1", "Space 1"]]),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.contentKey).toBe("app-u1-owned");
    expect(items[1]?.contentKey).toBe("page-u1-doc1");
    expect(items[1]?.spaceName).toBe("Space 1");
  });

  it("preserves remote server origins for queried records", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          title: "Remote Doc",
          type: ContentType.DOC,
          dbKey: "page-u1-remote",
          updatedAt: 12,
          spaceId: "space-1",
          serverOrigin: "https://us.nolo.chat",
        },
      ],
      "https://nolo.chat",
      new Map([["space-1", "Space 1"]]),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.serverOrigin).toBe("https://us.nolo.chat");
  });

  it("maps table records through meta keys and falls back when no spaceId exists", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          type: DataType.TABLE,
          dbKey: "meta-u1-table1",
          displayName: "Table 1",
          updatedAt: 5,
        },
      ],
      "https://nolo.chat",
      new Map(),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.contentKey).toBe("meta-u1-table1");
    expect(items[0]?.spaceName).toBe("我的内容");
  });

  it("preserves compact file metadata for attachment cards", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          title: "brief.pdf",
          type: ContentType.FILE,
          dbKey: "file-u1-brief",
          fileCategory: "document",
          mimeType: "application/pdf",
          fileSize: 1536,
          originalName: "brief.final.pdf",
          updatedAt: 6,
          spaceId: "space-1",
        },
      ],
      "https://nolo.chat",
      new Map([["space-1", "Space 1"]]),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        type: ContentType.FILE,
        fileCategory: "document",
        mimeType: "application/pdf",
        fileSize: 1536,
        originalName: "brief.final.pdf",
      })
    );
  });

  it("keeps app items when query records only provide canonical dbKey", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          dbKey: "app-u1-owned",
          userId: "u1",
          name: "Owned app from query",
          updatedAt: 7,
        },
      ],
      "https://nolo.chat",
      new Map(),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.contentKey).toBe("app-u1-owned");
    expect(items[0]?.spaceName).toBe("我的应用");
    expect(items[0] && "app" in items[0] ? items[0].app.appKey : null).toBe("app-u1-owned");
  });

  it("keeps app items when remote query records only provide appKey", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          appKey: "app-u1-owned",
          appId: "owned",
          userId: "u1",
          name: "Owned app from remote query",
          updatedAt: 8,
        },
      ],
      "https://nolo.chat",
      new Map(),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.contentKey).toBe("app-u1-owned");
    expect(items[0]?.spaceName).toBe("我的应用");
    expect(items[0] && "app" in items[0] ? items[0].app.appKey : null).toBe("app-u1-owned");
  });

  it("detects app tab from owner-scoped app keys", () => {
    expect(
      resolveMyContentTab({ type: ContentType.APP, contentKey: "app-u1-demo" })
    ).toBe("app");
  });

  it("keeps app previews visible in all-tab limited home previews", () => {
    const items = buildMyContentPreviewItems(
      [
        {
          source: "user-data",
          title: "Newest doc",
          type: ContentType.DOC,
          contentKey: "page-u1-1",
          pinned: false,
          createdAt: 10,
          updatedAt: 10,
          spaceId: "space-1",
          spaceName: "Space 1",
        },
        {
          source: "user-data",
          title: "Newest dialog",
          type: ContentType.DIALOG,
          contentKey: "dialog-u1-1",
          pinned: false,
          createdAt: 9,
          updatedAt: 9,
          spaceId: "space-1",
          spaceName: "Space 1",
        },
        {
          source: "owned-app",
          title: "Older app",
          type: ContentType.APP,
          contentKey: "app-u1-demo",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
          spaceId: null,
          spaceName: "我的应用",
          app: {
            name: "Older app",
            appKey: "app-u1-demo",
            appId: "demo",
            url: "https://nolo.chat/apps/demo/",
          },
        },
      ],
      2,
      "all"
    );

    expect(items).toHaveLength(2);
    expect(items.some((item) => resolveMyContentTab(item) === "app")).toBe(true);
  });

  it("sorts pinned items above unpinned items regardless of updatedAt", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          dbKey: "page-1",
          type: "page",
          title: "Newer unpinned",
          updatedAt: 1000,
        },
        {
          dbKey: "page-2",
          type: "page",
          title: "Older pinned",
          updatedAt: 500,
          pinned: true,
        },
        {
          dbKey: "page-3",
          type: "page",
          title: "Oldest unpinned",
          updatedAt: 100,
        },
      ],
      "https://nolo.chat",
      new Map(),
      "Apps",
      "Content"
    );

    expect(items.map((i) => i.contentKey)).toEqual([
      "page-2", // pinned goes first
      "page-1", // then newer unpinned
      "page-3", // then oldest unpinned
    ]);
  });

  it("drops records whose type is not a string", () => {
    const items = buildMyContentItemsFromUserData(
      [
        {
          dbKey: "page-u1-dirty",
          type: { value: ContentType.DOC } as any,
          title: { text: "Dirty doc title" } as any,
          updatedAt: 11,
          spaceId: "space-1",
        },
      ],
      "https://nolo.chat",
      new Map([["space-1", "Space 1"]]),
      "我的应用",
      "我的内容"
    );

    expect(items).toHaveLength(0);
  });

  it("routes file images into the image tab via fileCategory", () => {
    expect(
      resolveMyContentTab({
        type: ContentType.FILE,
        fileCategory: "image",
        contentKey: "file-u1-image",
      })
    ).toBe("image");
  });

  it("routes attachment subtypes into document/video/audio tabs", () => {
    expect(
      resolveMyContentTab({
        type: ContentType.FILE,
        fileCategory: "document",
        contentKey: "file-u1-doc-attachment",
      })
    ).toBe("document");

    expect(
      resolveMyContentTab({
        type: ContentType.FILE,
        fileCategory: "video",
        contentKey: "file-u1-video-attachment",
      })
    ).toBe("video");

    expect(
      resolveMyContentTab({
        type: ContentType.FILE,
        fileCategory: "audio",
        contentKey: "file-u1-audio-attachment",
      })
    ).toBe("audio");
  });
});

describe("deduplicateContentRecords", () => {
  it("merges records sharing the same stable dbKey", () => {
    const local = { dbKey: "agent-user1-a1", name: "Cached A1", updatedAt: 1 };
    const account = { dbKey: "agent-user1-a1", name: "Account A1", updatedAt: 2 };
    const result = deduplicateContentRecords([local, account]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(account);
  });

  it("keeps both records when keys differ", () => {
    const local = { dbKey: "agent-local-a1", name: "Local A1", updatedAt: 1 };
    const account = { dbKey: "agent-user1-a2", name: "Account A2", updatedAt: 2 };
    const result = deduplicateContentRecords([local, account]);

    expect(result).toHaveLength(2);
  });

  it("prefers the newer timestamp when keys collide", () => {
    const older = { dbKey: "page-user1-doc1", title: "Old", updatedAt: 10 };
    const newer = { dbKey: "page-user1-doc1", title: "New", updatedAt: 20 };
    const result = deduplicateContentRecords([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("New");
  });

  it("keeps the first record when timestamps tie", () => {
    const first = { dbKey: "page-user1-doc1", title: "First", updatedAt: 10 };
    const second = { dbKey: "page-user1-doc1", title: "Second", updatedAt: 10 };
    const result = deduplicateContentRecords([first, second]);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("First");
  });

  it("uses contentKey when dbKey is absent", () => {
    const local = { contentKey: "app-u1-shared", name: "Local App", updatedAt: 1 };
    const account = { contentKey: "app-u1-shared", name: "Account App", updatedAt: 2 };
    const result = deduplicateContentRecords([local, account]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Account App");
  });

  it("does not dedupe by title", () => {
    const local = { dbKey: "agent-local-a1", title: "Same Name", updatedAt: 1 };
    const account = { dbKey: "agent-user1-a2", title: "Same Name", updatedAt: 2 };
    const result = deduplicateContentRecords([local, account]);

    expect(result).toHaveLength(2);
  });
});

describe("deduplicateContentRecordsWithMappings", () => {
  it("collapses local+remote pairs linked by an explicit mapping", () => {
    const local = {
      dbKey: "agent-local-a1",
      name: "Local Agent",
      updatedAt: 1,
    };
    const remote = {
      dbKey: "agent-user1-a1",
      name: "Account Agent",
      updatedAt: 2,
    };
    const unrelated = {
      dbKey: "agent-local-other",
      name: "Other Local",
      updatedAt: 3,
    };

    const result = deduplicateContentRecordsWithMappings(
      [local, remote, unrelated],
      [{ localDbKey: "agent-local-a1", remoteDbKey: "agent-user1-a1" }]
    );

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.dbKey).sort()).toEqual([
      "agent-local-other",
      "agent-user1-a1",
    ]);
    expect(result.find((row) => row.dbKey === "agent-user1-a1")?.name).toBe(
      "Account Agent"
    );
  });

  it("keeps the newer local row when it wins the mapping timestamp", () => {
    const local = {
      dbKey: "dialog-local-d1",
      title: "Local newer",
      updatedAt: 50,
    };
    const remote = {
      dbKey: "dialog-user1-d1",
      title: "Remote older",
      updatedAt: 10,
    };

    const result = deduplicateContentRecordsWithMappings(
      [local, remote],
      [{ localDbKey: "dialog-local-d1", remoteDbKey: "dialog-user1-d1" }]
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.dbKey).toBe("dialog-local-d1");
    expect(result[0]?.title).toBe("Local newer");
  });

  it("does not collapse records when only one side of the mapping is present", () => {
    const local = { dbKey: "agent-local-a1", name: "Local only", updatedAt: 1 };
    const result = deduplicateContentRecordsWithMappings(
      [local],
      [{ localDbKey: "agent-local-a1", remoteDbKey: "agent-user1-a1" }]
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.dbKey).toBe("agent-local-a1");
  });
});
