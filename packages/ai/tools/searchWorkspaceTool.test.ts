import { describe, expect, it, mock } from "bun:test";

import {
  setCurrentSpaceBoth,
  setViewMode,
  resetSpaceCurrentState,
} from "create/space/spaceCurrentStore";

import {
  searchAllSpacesFunc,
  searchWorkspaceFunc,
} from "./searchWorkspaceTool";

// Space current-state lives in a module store now (no Redux `space` slice), so
// mirror each fixture's space block into that store before invoking the tool.
const applyStateToSpaceStore = (state: TestState) => {
  resetSpaceCurrentState();
  // viewMode matters: getCurrentSpaceId() hides the space in all-spaces mode.
  setViewMode(state.space.viewMode as "all" | "categories");
  setCurrentSpaceBoth(state.space.currentSpaceId, state.space.currentSpace);
};

type TestState = {
  auth?: {
    currentUser?: {
      userId?: string | null;
    } | null;
  };
  settings?: {
    currentServer?: string;
  };
  db: {
    ids: string[];
    entities: Record<string, unknown>;
  };
  space: {
    currentSpaceId: string | null;
    currentSpace: any;
    memberSpaces: any[];
    loading: boolean;
    initialized: boolean;
    collapsedCategories: Record<string, boolean>;
    viewMode: string;
    dialogStatuses: Record<string, string>;
    unreadDialogIds: Record<string, boolean>;
  };
};

const buildState = (overrides?: Partial<TestState>): TestState =>
  ({
    db: {
      ids: [],
      entities: {},
    },
    auth: {
      currentUser: {
        userId: "user-1",
      },
    },
    settings: {
      currentServer: "http://localhost",
    },
    space: {
      currentSpaceId: "space-1",
      currentSpace: {
        id: "space-1",
        name: "产品空间",
        description: "",
        ownerId: "user-1",
        visibility: "private",
        members: ["user-1"],
        categories: {},
        contents: {
          "page-1": {
            title: "搜索方案",
            type: "page",
            contentKey: "page-1",
            pinned: false,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        createdAt: 1,
        updatedAt: 1,
      },
      memberSpaces: [
        {
          role: "owner",
          joinedAt: 1,
          spaceId: "space-1",
          spaceName: "产品空间",
          ownerId: "user-1",
          visibility: "private",
          spaceCreatedAt: 1,
          spaceUpdatedAt: 1,
        },
        {
          role: "member",
          joinedAt: 2,
          spaceId: "space-2",
          spaceName: "技术空间",
          ownerId: "user-2",
          visibility: "private",
          spaceCreatedAt: 2,
          spaceUpdatedAt: 2,
        },
      ],
      loading: false,
      initialized: true,
      collapsedCategories: {},
      viewMode: "categories",
      dialogStatuses: {},
      unreadDialogIds: {},
    },
    ...overrides,
  }) as TestState;

describe("searchWorkspaceTool", () => {
  it("searches only the current space for search_workspace", async () => {
    const state = buildState();

    applyStateToSpaceStore(state);

    const result = await searchWorkspaceFunc({ query: "搜索" }, {
      getState: () => state,
    } as any);

    expect(result.rawData.contents).toHaveLength(1);
    expect(result.rawData.contents[0]?.spaceId).toBe("space-1");
    expect(result.displayData).toContain("当前空间");
  });

  it("searches synced user data for search_all_spaces, including orphan items", async () => {
    const state = buildState({
      space: {
        ...buildState().space,
        currentSpaceId: null,
        currentSpace: null,
        viewMode: "all",
        memberSpaces: [
          {
            role: "owner",
            joinedAt: 1,
            spaceId: "space-1",
            spaceName: "产品空间",
            ownerId: "user-1",
            visibility: "private",
            spaceCreatedAt: 1,
            spaceUpdatedAt: 1,
          },
        ],
      },
    });

    // fetchUserData scans user-scoped prefixes that end with `-` (e.g. page-user-1-).
    // Mock must honor gte/lte range checks, not exact prefix equality without the dash.
    const records: Array<[string, any]> = [
      [
        "page-user-1-page-1",
        {
          dbKey: "page-user-1-page-1",
          contentKey: "page-1",
          type: "page",
          title: "搜索方案",
          updatedAt: 1,
          createdAt: 1,
          spaceId: "space-1",
        },
      ],
      [
        "page-user-1-page-orphan",
        {
          dbKey: "page-user-1-page-orphan",
          contentKey: "page-orphan",
          type: "page",
          title: "孤儿搜索草稿",
          updatedAt: 3,
          createdAt: 3,
          spaceId: null,
        },
      ],
    ];

    const iterator = mock(({ gte, lte }: { gte: string; lte: string }) => ({
      async *[Symbol.asyncIterator]() {
        for (const entry of records) {
          const [key] = entry;
          if (key < gte) continue;
          if (key > lte) continue;
          yield entry;
        }
      },
    }));

    applyStateToSpaceStore(state);

    const result = await searchAllSpacesFunc(
      { query: "搜索" },
      {
        getState: () => state,
        dispatch: mock(() => undefined),
        extra: {
          db: { iterator },
          tokenManager: null,
        },
      },
    );

    expect(result.rawData.contents).toHaveLength(2);
    expect(result.rawData.contents.map((item) => item.contentKey)).toEqual([
      "page-orphan",
      "page-1",
    ]);
    expect(result.rawData.contents.map((item) => item.spaceName)).toEqual([
      "我的内容",
      "产品空间",
    ]);
    expect(result.displayData).toContain("已同步的全部内容");
  });
});
