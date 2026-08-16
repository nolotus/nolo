import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";
import React from "react";

import { MemoryDB } from "database-engine/MemoryDB";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";

import { shouldPruneStalePublicAgentCache } from "./usePublicAgents";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realStore = { ...(await import("app/store")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realCacheMerged = { ...(await import("database/actions/cacheMergedUserData")) };
const realCommon = { ...(await import("database/actions/common")) };
const realClientDb = { ...(await import("database/client/db")) };
const realIdentitySelectors = { ...(await import("identity/selectors")) };
const realReactRedux = { ...(await import("react-redux")) };

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("app/store", () => realStore);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("database/actions/cacheMergedUserData", () => realCacheMerged);
  mock.module("database/actions/common", () => realCommon);
  mock.module("database/client/db", () => realClientDb);
  mock.module("identity/selectors", () => realIdentitySelectors);
  mock.module("react-redux", () => realReactRedux);
};

async function loadUsePublicAgentsForBehaviorTest(options?: {
  localData?: Array<Record<string, any>>;
  currentServer?: string;
  syncServers?: string[];
  currentUserId?: string | null;
}) {
  mock.restore();
  // Toast adapter is a DOM-side concern; noop it in behavior tests.
  mock.module("app/utils/toast", () => ({
    toast: { info: () => {} },
  }));
  const {
    localData = [],
    currentServer = "https://nolo.chat",
    syncServers = [currentServer],
    currentUserId = "viewer-1",
  } = options ?? {};

  const dispatchMock = mock(() => undefined);
  const removeMock = mock((dbKey: string) => ({ type: "remove", payload: dbKey }));
  const cacheMergedUserDataThunkMock = mock((payload: { records: Array<Record<string, any>> }) => ({
    type: "db/cacheMergedUserData",
    payload,
  }));

  // Seed local public-agent rows into a hermetic MemoryDB. Do not mock.module
  // "ai/agent/hooks/fetchPublicAgents": sticky package mocks intercept later
  // relative imports of that SUT under suite isolation.
  const testDb = new MemoryDB();
  for (const agent of localData) {
    const key =
      typeof agent.dbKey === "string" && agent.dbKey.length > 0
        ? agent.dbKey
        : `agent-pub-${agent.id}`;
    await testDb.put(key, agent);
  }

  mock.module("database/client/db", () => ({
    ...realClientDb,
    getDb: () => testDb,
  }));

  mock.module("app/store", () => ({
    ...realStore,
    useAppDispatch: () => dispatchMock,
    useAppSelector: (selector: (state: any) => unknown) =>
      selector({
        settings: {
          currentServer,
          syncServers,
        },
        auth: {
          userId: currentUserId,
        },
      }),
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: (state: any) => state.settings.currentServer,
    selectSyncServers: (state: any) => state.settings.syncServers,
  }));

  const realIdentitySelectors = await import("identity/selectors");
  mock.module("identity/selectors", () => ({
    ...realIdentitySelectors,
    selectIdentityUserId: () => currentUserId,
  }));
  
  const realReactRedux = await import("react-redux");
  mock.module("react-redux", () => ({
    ...realReactRedux,
    useSelector: (selector: (state: any) => any) => selector({
      auth: { currentUser: { userId: currentUserId }, userId: currentUserId },
      settings: { currentServer, syncServers },
    }),
    useDispatch: () => dispatchMock,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth.userId,
  }));

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    remove: removeMock,
  }));

  mock.module("database/actions/cacheMergedUserData", () => ({
    ...realCacheMerged,
    cacheMergedUserDataThunk: cacheMergedUserDataThunkMock,
  }));

  // Spread real common exports. A partial mock that only stubbed
  // `getAllServers: () => syncServers` replaced the whole module surface and
  // leaked into sibling suite files. Capture getAllServers before mock.module
  // so the binding cannot live-recurse into this factory.
  const realGetAllServers = realCommon.getAllServers;
  mock.module("database/actions/common", () => ({
    ...realCommon,
    getAllServers: realGetAllServers,
  }));

  const mod = await import(`./usePublicAgents.ts?behavior=${moduleVersion++}`);
  mock.restore();

  return {
    usePublicAgents: mod.usePublicAgents,
    dispatchMock,
    removeMock,
    cacheMergedUserDataThunkMock,
  };
}

const HookProbe: React.FC<{
  usePublicAgentsImpl: typeof import("./usePublicAgents").usePublicAgents;
  options?: Parameters<typeof import("./usePublicAgents").usePublicAgents>[0];
}> = ({ usePublicAgentsImpl, options }) => {
  const result = usePublicAgentsImpl(
    options ?? {
      limit: 6,
      sortBy: "recommended",
    }
  );

  return React.createElement(
    "pre",
    { "data-testid": "result" },
    JSON.stringify(result.data)
  );
};

afterEach(() => {
  mock.restore();
});

afterAll(() => {
  restoreLeakedModuleMocks();
});

describe("shouldPruneStalePublicAgentCache", () => {
  it("allows stale public-cache pruning for recommended lists without search", () => {
    expect(
      shouldPruneStalePublicAgentCache({
        searchName: "",
      })
    ).toBe(true);
  });

  it("also allows stale public-cache pruning for other list sorts without search", () => {
    expect(
      shouldPruneStalePublicAgentCache({
        searchName: "",
      })
    ).toBe(true);
  });

  it("blocks stale public-cache pruning while a search filter is active", () => {
    expect(
      shouldPruneStalePublicAgentCache({
        searchName: "gpt",
      })
    ).toBe(false);
  });
});

describe("usePublicAgents stale public-cache pruning", () => {
  it("does not flash stale local public cache over clean initial data while remote refresh is pending", async () => {
    const initialAgent = {
      id: "01WEREADAGNT00000001L8OW37",
      dbKey: "agent-pub-01WEREADAGNT00000001L8OW37",
      type: "agent",
      userId: "public",
      isPublic: true,
      name: "微信读书助手",
      introduction: "clean SSR preview",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      tags: [],
      tools: [],
    };
    const staleAgent = {
      id: "01KA0H8CSSWD06ZAEH902YCXJE",
      dbKey: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      type: "agent",
      userId: "viewer-1",
      isPublic: true,
      name: "gpt 5.1",
      introduction: "openai 最新5.1",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      tags: [],
      tools: [],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(
      async () =>
        new Promise<Response>(() => {
          // Keep remote pending to assert the intermediate local phase.
        })
    ) as unknown as typeof fetch;

    const { usePublicAgents } = await loadUsePublicAgentsForBehaviorTest({
      localData: [staleAgent],
      currentUserId: "viewer-1",
    });

    const view = await renderInDom(
      React.createElement(HookProbe, {
        usePublicAgentsImpl: usePublicAgents,
        options: {
          limit: 6,
          sortBy: "recommended",
          initialData: [initialAgent as any],
        },
      })
    );

    try {
      await flushDomUpdates(2);

      expect(view.container.textContent).toContain("微信读书助手");
      expect(view.container.textContent).not.toContain("gpt 5.1");
      expect(view.container.textContent).not.toContain("01KA0H8CSSWD06ZAEH902YCXJE");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("prunes stale public cache for recommended lists using shared identity resolution, not raw inline ids", async () => {
    const staleAgent = {
      id: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      dbKey: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      type: "agent",
      userId: "someone-else",
      isPublic: true,
      name: "gpt 5.1",
      introduction: "openai 最新5.1",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      hasVision: true,
      outputPrice: 90,
      tags: [],
      tools: [],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const { usePublicAgents, dispatchMock, removeMock } =
      await loadUsePublicAgentsForBehaviorTest({
        localData: [staleAgent],
      });

    const view = await renderInDom(
        React.createElement(HookProbe, {
          usePublicAgentsImpl: usePublicAgents,
          options: {
            limit: 6,
            sortBy: "recommended",
          },
        })
      );

    try {
      await flushDomUpdates(3);

      expect(removeMock).toHaveBeenCalledWith("agent-pub-01KA0H8CSSWD06ZAEH902YCXJE");
      expect(dispatchMock).toHaveBeenCalledWith({
        type: "remove",
        payload: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      });
      expect(view.container.textContent).not.toContain("gpt 5.1");
      expect(view.container.textContent).not.toContain("01KA0H8CSSWD06ZAEH902YCXJE");
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("does not prune stale public cache while a search filter is active", async () => {
    const staleAgent = {
      id: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      dbKey: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      type: "agent",
      userId: "someone-else",
      isPublic: true,
      name: "gpt 5.1",
      introduction: "openai 最新5.1",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      hasVision: true,
      outputPrice: 90,
      tags: [],
      tools: [],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const { usePublicAgents, dispatchMock, removeMock } =
      await loadUsePublicAgentsForBehaviorTest({
        localData: [staleAgent],
      });

    const view = await renderInDom(
        React.createElement(HookProbe, {
          usePublicAgentsImpl: usePublicAgents,
          options: {
            limit: 6,
            sortBy: "recommended",
            searchName: "gpt",
          },
        })
      );

    try {
      await flushDomUpdates(3);

      expect(removeMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("hides owner-protected stale public cache without deleting the local copy", async () => {
    const staleAgent = {
      id: "01KA0H8CSSWD06ZAEH902YCXJE",
      dbKey: "agent-pub-01KA0H8CSSWD06ZAEH902YCXJE",
      type: "agent",
      userId: "viewer-1",
      isPublic: true,
      name: "gpt 5.1",
      introduction: "openai 最新5.1",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      hasVision: true,
      outputPrice: 90,
      tags: [],
      tools: [],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const { usePublicAgents, dispatchMock, removeMock } =
      await loadUsePublicAgentsForBehaviorTest({
        localData: [staleAgent],
        currentUserId: "viewer-1",
      });

    const view = await renderInDom(
      React.createElement(HookProbe, {
        usePublicAgentsImpl: usePublicAgents,
        options: {
          limit: 6,
          sortBy: "recommended",
        },
      })
    );

    try {
      await flushDomUpdates(3);

      expect(view.container.textContent).not.toContain("gpt 5.1");
      expect(view.container.textContent).not.toContain("01KA0H8CSSWD06ZAEH902YCXJE");
      expect(removeMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("keeps local public cache visible when every remote public-agent request fails", async () => {
    const localAgent = {
      id: "01LOCALVISIBLE",
      dbKey: "agent-pub-01LOCALVISIBLE",
      type: "agent",
      userId: "viewer-1",
      isPublic: true,
      name: "Local Visible",
      introduction: "local fallback",
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-08-01T00:00:00.000Z",
      tags: [],
      tools: [],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      new Response("server error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    ) as unknown as typeof fetch;

    const { usePublicAgents, dispatchMock, removeMock } =
      await loadUsePublicAgentsForBehaviorTest({
        localData: [localAgent],
        currentUserId: "viewer-1",
      });

    const view = await renderInDom(
      React.createElement(HookProbe, {
        usePublicAgentsImpl: usePublicAgents,
        options: {
          limit: 6,
          sortBy: "recommended",
        },
      })
    );

    try {
      await flushDomUpdates(3);

      expect(view.container.textContent).toContain("Local Visible");
      expect(removeMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("caches newer merged remote public-agent records back into local user data", async () => {
    const localAgent = {
      id: "01GPTIMG2GEN00000000SSEBOS",
      dbKey: "agent-pub-01GPTIMG2GEN00000000SSEBOS",
      type: "agent",
      userId: "public",
      isPublic: true,
      provider: "openai",
      model: "gpt-image-2",
      name: "GPT Image 2 图片生成器",
      introduction: "old local public cache",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      tags: ["image"],
      tools: ["openAIGptImage"],
    };
    const remoteAgent = {
      ...localAgent,
      model: "gpt-5.4",
      imageModel: "gpt-image-2",
      introduction: "new remote public catalog truth",
      updatedAt: "2026-05-02T00:00:00.000Z",
      tools: ["openAIGptImageGenerate"],
    };

    const previousFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ data: [remoteAgent] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const {
      usePublicAgents,
      dispatchMock,
      cacheMergedUserDataThunkMock,
    } = await loadUsePublicAgentsForBehaviorTest({
      localData: [localAgent],
    });

    const view = await renderInDom(
      React.createElement(HookProbe, {
        usePublicAgentsImpl: usePublicAgents,
        options: {
          limit: 6,
          sortBy: "recommended",
          imageOutputOnly: true,
        },
      })
    );

    try {
      await flushDomUpdates(3);

      expect(view.container.textContent).toContain("new remote public catalog truth");
      expect(view.container.textContent).toContain("gpt-5.4");
      expect(cacheMergedUserDataThunkMock).toHaveBeenCalledWith({
        records: [
          expect.objectContaining({
            dbKey: "agent-pub-01GPTIMG2GEN00000000SSEBOS",
            model: "gpt-5.4",
            imageModel: "gpt-image-2",
            originServer: "https://nolo.chat",
          }),
        ],
      });
      expect(dispatchMock).toHaveBeenCalledWith({
        type: "db/cacheMergedUserData",
        payload: {
          records: [
            expect.objectContaining({
              dbKey: "agent-pub-01GPTIMG2GEN00000000SSEBOS",
              model: "gpt-5.4",
            }),
          ],
        },
      });
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });

  it("keeps public-agent list behavior stable when remote summary mode returns lightweight cards", async () => {
    const previousFetch = globalThis.fetch;
    const requestSummaries: Array<boolean | undefined> = [];
    globalThis.fetch = mock(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { summary?: boolean };
      requestSummaries.push(body.summary);
      const data = body.summary
        ? [
            {
              id: "01VISIBLE-NEW",
              dbKey: "agent-pub-01VISIBLE-NEW",
              type: "agent",
              name: "Visible New",
              introduction: "summary-card",
              createdAt: "2025-04-01T00:00:00.000Z",
              updatedAt: "2025-04-01T00:00:00.000Z",
            },
            {
              id: "01VISIBLE-OLD",
              dbKey: "agent-pub-01VISIBLE-OLD",
              type: "agent",
              name: "Visible Old",
              introduction: "summary-card",
              createdAt: "2025-03-01T00:00:00.000Z",
              updatedAt: "2025-03-01T00:00:00.000Z",
            },
            {
              id: "01NOLOAGENTCRT000000000001",
              dbKey: "agent-pub-01NOLOAGENTCRT000000000001",
              type: "agent",
              name: "AI 创建助手",
              introduction: "builtin",
              createdAt: "2025-05-01T00:00:00.000Z",
              updatedAt: "2025-05-01T00:00:00.000Z",
            },
          ]
        : [
            {
              id: "01VISIBLE-NEW",
              dbKey: "agent-pub-01VISIBLE-NEW",
              type: "agent",
              name: "Visible New",
              introduction: "full-card",
              prompt: "full prompt",
              createdAt: "2025-04-01T00:00:00.000Z",
              updatedAt: "2025-04-01T00:00:00.000Z",
            },
            {
              id: "01VISIBLE-OLD",
              dbKey: "agent-pub-01VISIBLE-OLD",
              type: "agent",
              name: "Visible Old",
              introduction: "full-card",
              prompt: "full prompt",
              createdAt: "2025-03-01T00:00:00.000Z",
              updatedAt: "2025-03-01T00:00:00.000Z",
            },
            {
              id: "01NOLOAGENTCRT000000000001",
              dbKey: "agent-pub-01NOLOAGENTCRT000000000001",
              type: "agent",
              name: "AI 创建助手",
              introduction: "builtin",
              prompt: "builtin prompt",
              createdAt: "2025-05-01T00:00:00.000Z",
              updatedAt: "2025-05-01T00:00:00.000Z",
            },
          ];

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { usePublicAgents } = await loadUsePublicAgentsForBehaviorTest({
      localData: [],
      currentUserId: null,
    });

    try {
      const defaultView = await renderInDom(
        React.createElement(HookProbe, {
          usePublicAgentsImpl: usePublicAgents,
        })
      );
      await flushDomUpdates(4);
      const defaultIds = JSON.parse(defaultView.container.textContent ?? "[]").map(
        (agent: Record<string, unknown>) => agent.id
      );
      await defaultView.cleanup();

      const summaryView = await renderInDom(
        React.createElement(HookProbe, {
          usePublicAgentsImpl: usePublicAgents,
          options: {
            limit: 6,
            sortBy: "recommended",
            summary: true,
          },
        })
      );
      await flushDomUpdates(4);
      const summaryData = JSON.parse(summaryView.container.textContent ?? "[]") as Array<
        Record<string, unknown>
      >;
      await summaryView.cleanup();

      expect(defaultIds).toEqual([
        "01NOLOAGENTCRT000000000001",
        "01VISIBLE-NEW",
        "01VISIBLE-OLD",
      ]);
      expect(summaryData.map((agent) => agent.id)).toEqual([
        "01NOLOAGENTCRT000000000001",
        "01VISIBLE-NEW",
        "01VISIBLE-OLD",
      ]);
      expect(
        summaryData.find((agent) => agent.id === "01NOLOAGENTCRT000000000001")
          ?.prompt
      ).toBeUndefined();
      expect(requestSummaries).toContain(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("keeps full remote records for signed-in viewers even when the catalog asks for summaries", async () => {
    const previousFetch = globalThis.fetch;
    const requestBodies: Array<Record<string, unknown>> = [];
    globalThis.fetch = mock(async (_input, init) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")));
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { usePublicAgents } = await loadUsePublicAgentsForBehaviorTest({
      localData: [],
      currentUserId: "viewer-1",
    });

    const view = await renderInDom(
      React.createElement(HookProbe, {
        usePublicAgentsImpl: usePublicAgents,
        options: {
          limit: 6,
          sortBy: "recommended",
          summary: true,
        },
      })
    );

    try {
      await flushDomUpdates(3);

      expect(requestBodies.length).toBeGreaterThan(0);
      expect(requestBodies.every((body) => body.summary === false)).toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
      await view.cleanup();
    }
  });
});
