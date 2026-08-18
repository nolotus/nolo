import { describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

const realDbSlice = await import("database/dbSlice");
const realSpaceSlice = await import("create/space/spaceSlice");
const realMessageSlice = await import("chat/messages/messageSlice");
const realAuthSlice = await import("auth/authSlice");
const realRegistry = await import("../objectAssistantRegistry");

const readAndWaitMock = mock((payload: any) => ({
  kind: "readAndWait",
  ...(typeof payload === "string" ? { dbKey: payload } : payload),
}));
const writeMock = mock((payload: any) => ({
  kind: "write",
  payload,
}));
const removeCachedEntityMock = mock((payload: any) => ({
  kind: "removeCachedEntity",
  payload,
}));
const addContentToSpaceMock = mock((payload: any) => ({
  kind: "addContentToSpace",
  payload,
}));
const prepareAndPersistMessageMock = mock((payload: any) => ({
  kind: "prepareAndPersistMessage",
  payload,
}));

let moduleVersion = 0;
const dbSlicePath = fileURLToPath(
  new URL("../../../database/dbSlice.ts", import.meta.url)
);

const loadCreateDialogAction = async () => {
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    readAndWait: readAndWaitMock,
    write: writeMock,
    removeCachedEntity: removeCachedEntityMock,
  }));
  mock.module(dbSlicePath, () => ({
    ...realDbSlice,
    readAndWait: readAndWaitMock,
    write: writeMock,
    removeCachedEntity: removeCachedEntityMock,
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
    addContentToSpace: addContentToSpaceMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId,
  }));
  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    prepareAndPersistMessage: prepareAndPersistMessageMock,
  }));
  mock.module("../objectAssistantRegistry", () => realRegistry);

  const module = await import(`./createDialogAction.ts?test=${moduleVersion++}`);
  mock.restore();
  return module.createDialogAction;
};

describe("createDialogAction", () => {
  it("creates an auto dialog without reading or persisting an Agent key", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        throw new Error("auto dialog must not read an Agent record");
      }
      if (action.kind === "write") {
        return { unwrap: async () => action.payload.data };
      }
      return { unwrap: async () => ({}) };
    });

    const result = await createDialogAction(
      { agentMode: "auto", cybots: [], title: "新对话", skipGreeting: true },
      {
        dispatch,
        getState: () => ({ auth: { currentUser: { userId: "user-1" } } }) as any,
      },
    );

    expect(result).toMatchObject({
      agentMode: "auto",
      cybots: [],
      title: "新对话",
    });
    expect((result as any).primaryAgentKey).toBeUndefined();
  });

  it("persists extraReferences into the created dialog", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    
    readAndWaitMock.mockResolvedValueOnce({
      dbKey: "agent-fake",
      name: "Fake Agent",
    });

    const mockThunk = {
      getState: () => ({ auth: { currentUser: { userId: "user-123" } } }),
      dispatch: (action: any) => {
        if (action.kind === "readAndWait") {
          return { unwrap: async () => ({ dbKey: "agent-fake", name: "Fake Agent" }) };
        }
        if (action.kind === "write") {
          writeMock(action);
          return { unwrap: async () => action.payload.data };
        }
        return { unwrap: async () => ({}) };
      },
      extra: {},
    };

    const result = await createDialogAction(
      {
        cybots: ["agent-fake"],
        title: "Test Extra Refs",
        extraReferences: [{ dbKey: "ref-1", type: "instruction" } as any],
      },
      mockThunk as any
    );

    expect(result).toBeDefined();
    
    // The second write call usually writes the dialog itself if the agent isn't being upserted.
    // We'll inspect all writeMock calls.
    const writes = writeMock.mock.calls;
    const dialogWrite = writes.find(call => call[0]?.payload?.data?.title === "Test Extra Refs");
    expect(dialogWrite).toBeDefined();
    expect(dialogWrite?.[0]?.payload?.data?.extraReferences).toBeDefined();
    expect(dialogWrite?.[0]?.payload?.data?.extraReferences[0]?.dbKey).toBe("ref-1");
  });

  it("skips agent config reads for titled skip-greeting fast paths", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    removeCachedEntityMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        throw new Error("fast path should not read agent config");
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey: action.payload.customKey,
          }),
        };
      }

      if (action.kind === "addContentToSpace" || action.kind === "prepareAndPersistMessage") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await createDialogAction(
      {
        cybots: ["agent-fast"],
        skipGreeting: true,
        skipAgentConfigRead: true,
        title: "nolo  05-21 14:30",
      },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
      }
    );

    expect(readAndWaitMock).not.toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0]?.[0]?.data?.title).toBe("nolo  05-21 14:30");
    expect(result.dbKey).toContain("dialog-user-1-");
    expect(prepareAndPersistMessageMock).not.toHaveBeenCalled();
  });

  it("returns quick-chat fast path dialogs before the local write resolves", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    let writeResolved = false;
    const dispatch = mock((action: any) => {
      if (action.type === "db/upsertSSREntity") {
        return action;
      }

      if (action.kind === "readAndWait") {
        throw new Error("fast path should not read agent config");
      }

      if (action.kind === "write") {
        return {
          unwrap: () =>
            new Promise((resolve) => {
              setTimeout(() => {
                writeResolved = true;
                resolve({
                  ...action.payload.data,
                  dbKey: action.payload.customKey,
                });
              }, 20);
            }),
        };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await createDialogAction(
      {
        cybots: ["agent-fast"],
        skipGreeting: true,
        skipAgentConfigRead: true,
        optimisticReturnBeforeWrite: true,
        title: "nolo  05-21 14:30",
      },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
      }
    );

    expect(writeResolved).toBe(false);
    expect(result).toMatchObject({
      dbKey: expect.stringContaining("dialog-user-1-"),
      userId: "user-1",
      title: "nolo  05-21 14:30",
    });
    expect(
      dispatch.mock.calls.some(
        ([action]) => action?.type === "db/upsertSSREntity"
      )
    ).toBe(true);
    expect(writeMock).toHaveBeenCalledTimes(1);
    // Successful background write must not reverse the optimistic entity.
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(removeCachedEntityMock).not.toHaveBeenCalled();
  });

  it("reverts the optimistic dialog when the background write fails", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    removeCachedEntityMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    const upsertedKeys: string[] = [];
    const consoleError = mock(() => undefined);
    const originalConsoleError = console.error;
    console.error = consoleError as typeof console.error;

    try {
      const dispatch = mock((action: any) => {
        if (action?.type === "db/upsertSSREntity") {
          const key = action.payload?.dbKey;
          if (typeof key === "string") upsertedKeys.push(key);
          return action;
        }

        if (action.kind === "readAndWait") {
          throw new Error("fast path should not read agent config");
        }

        if (action.kind === "write") {
          return {
            unwrap: () => Promise.reject(new Error("indexeddb write failed")),
          };
        }

        if (action.kind === "removeCachedEntity") {
          return action;
        }

        throw new Error(`unexpected action: ${JSON.stringify(action)}`);
      });

      const result = await createDialogAction(
        {
          cybots: ["agent-fast"],
          skipGreeting: true,
          skipAgentConfigRead: true,
          optimisticReturnBeforeWrite: true,
          title: "nolo  phantom dialog",
        },
        {
          dispatch,
          getState: () =>
            ({
              auth: {
                currentUser: {
                  userId: "user-1",
                },
              },
            }) as any,
        }
      );

      expect(result.dbKey).toContain("dialog-user-1-");
      expect(upsertedKeys).toEqual([result.dbKey]);

      // Background catch must run and reverse the optimistic entity.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(removeCachedEntityMock).toHaveBeenCalledTimes(1);
      expect(removeCachedEntityMock.mock.calls[0]?.[0]).toBe(result.dbKey);
      expect(
        dispatch.mock.calls.some(
          ([action]) => action?.kind === "removeCachedEntity"
        )
      ).toBe(true);
      expect(
        consoleError.mock.calls.some(
          (call: any[]) =>
            typeof call[0] === "string" &&
            call[0].includes("optimistic dialog write failed")
        )
      ).toBe(true);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("recovers deterministic builtin object assistants before creating a dialog", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    const pageAgentKey = realRegistry.getPreferredObjectAssistantKey("page", "user-1")[0];
    const writes: any[] = [];

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        expect(action.dbKey).toBe(pageAgentKey);
        return { unwrap: async () => null };
      }

      if (action.kind === "write") {
        writes.push(action.payload);
        const dbKey = action.payload.customKey;
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey,
          }),
        };
      }

      if (action.kind === "addContentToSpace" || action.kind === "prepareAndPersistMessage") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await createDialogAction(
      {
        cybots: [pageAgentKey],
        skipGreeting: true,
      },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
      }
    );

    expect(readAndWaitMock).toHaveBeenCalledTimes(1);
    expect(writeMock).toHaveBeenCalledTimes(2);
    expect(writes[0]?.customKey).toBe(pageAgentKey);
    expect(writes[0]?.data?.name).toBe("文档助手");
    expect(writes[1]?.customKey).toContain("dialog-user-1-");
    expect(result.dbKey).toBe(writes[1]?.customKey);
    expect(prepareAndPersistMessageMock).not.toHaveBeenCalled();
  });

  it("persists scheduled run metadata for task child dialogs", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        return {
          unwrap: async () => ({
            dbKey: "agent-scheduled",
            name: "定时助手",
            greeting: "你好",
          }),
        };
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey: action.payload.customKey,
          }),
        };
      }

      if (action.kind === "addContentToSpace" || action.kind === "prepareAndPersistMessage") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    await createDialogAction(
      {
        cybots: ["agent-scheduled"],
        skipGreeting: true,
        triggerType: "scheduled_run",
        taskPrompt: "检查今日任务",
      },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
      }
    );

    const dialogWrite = writeMock.mock.calls.at(-1)?.[0];
    expect(dialogWrite?.data?.triggerType).toBe("scheduled_run");
    expect(dialogWrite?.data?.executionMode).toBe("background");
    expect(dialogWrite?.data?.status).toBe("pending");
    expect(dialogWrite?.data?.taskPrompt).toBe("检查今日任务");
  });

  it("reads agent config from the preferred origin server when provided", async () => {
    const createDialogAction = await loadCreateDialogAction();
    readAndWaitMock.mockClear();
    writeMock.mockClear();
    addContentToSpaceMock.mockClear();
    prepareAndPersistMessageMock.mockClear();

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        return {
          unwrap: async () => ({
            dbKey: "agent-pub-cross-server",
            name: "Cross Server Agent",
          }),
        };
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey: action.payload.customKey,
          }),
        };
      }

      if (action.kind === "addContentToSpace" || action.kind === "prepareAndPersistMessage") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await createDialogAction(
      {
        cybots: ["agent-pub-cross-server"],
        preferredServerOrigin: "https://us.nolo.chat",
        skipGreeting: true,
      },
      {
        dispatch,
        getState: () =>
          ({
            auth: {
              currentUser: {
                userId: "user-1",
              },
            },
          }) as any,
      }
    );

    expect(readAndWaitMock).toHaveBeenCalledWith({
      dbKey: "agent-pub-cross-server",
      preferredServerOrigin: "https://us.nolo.chat",
    });
    expect(result.dbKey).toContain("dialog-user-1-");
  });

  // --- M1-C owner: local agent vs account agent ---

  type OwnerCase = {
    name: string;
    cybots: string[];
    currentUserId: string | null;
    agent: { dbKey: string; name: string; greeting?: unknown };
    expectOwner: string;
    expectGreetingUserId?: string;
  };

  const createOwnerDispatch = (agent: OwnerCase["agent"], writes: any[]) =>
    mock((action: any) => {
      if (action.kind === "readAndWait") {
        return { unwrap: async () => agent };
      }
      if (action.kind === "write") {
        writes.push(action.payload);
        return {
          unwrap: async () => ({
            ...action.payload.data,
            dbKey: action.payload.customKey,
          }),
        };
      }
      if (
        action.kind === "addContentToSpace" ||
        action.kind === "prepareAndPersistMessage"
      ) {
        return { unwrap: async () => ({}) };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

  const ownerCases: OwnerCase[] = [
    {
      name: "logged-out local agent → local",
      cybots: ["agent-local-01AGENT"],
      currentUserId: null,
      agent: {
        dbKey: "agent-local-01AGENT",
        name: "Local Agent",
        greeting: "hi",
      },
      expectOwner: "local",
    },
    {
      // greeting dialogConfig.userId is asserted here (logged-in + local agent)
      name: "logged-in local agent → still local (+ greeting userId)",
      cybots: ["agent-local-01AGENT"],
      currentUserId: "user-account-42",
      agent: {
        dbKey: "agent-local-01AGENT",
        name: "Local Agent",
        greeting: { text: "hello" },
      },
      expectOwner: "local",
      expectGreetingUserId: "local",
    },
    {
      name: "logged-in account agent → account",
      cybots: ["agent-user1-01AGENT"],
      currentUserId: "user1",
      agent: {
        dbKey: "agent-user1-01AGENT",
        name: "Account Agent",
        greeting: "hi",
      },
      expectOwner: "user1",
    },
  ];

  for (const tc of ownerCases) {
    it(tc.name, async () => {
      const createDialogAction = await loadCreateDialogAction();
      readAndWaitMock.mockClear();
      writeMock.mockClear();
      addContentToSpaceMock.mockClear();
      prepareAndPersistMessageMock.mockClear();

      const writes: any[] = [];
      const dispatch = createOwnerDispatch(tc.agent, writes);
      const getState = () =>
        ({
          auth: {
            currentUser: tc.currentUserId
              ? { userId: tc.currentUserId }
              : null,
          },
        }) as any;

      const result = await createDialogAction(
        { cybots: tc.cybots },
        { dispatch, getState, extra: {} }
      );

      expect(result.dbKey.startsWith(`dialog-${tc.expectOwner}-`)).toBe(true);
      expect(result.userId).toBe(tc.expectOwner);
      expect(result.spaceId).toBeUndefined();
      expect(addContentToSpaceMock).not.toHaveBeenCalled();

      const dialogWrite = writes.find(
        (p) =>
          typeof p?.customKey === "string" && p.customKey.startsWith("dialog-")
      );
      expect(dialogWrite?.data?.userId).toBe(tc.expectOwner);
      expect(dialogWrite?.userId).toBe(tc.expectOwner);

      if (tc.expectGreetingUserId !== undefined) {
        expect(prepareAndPersistMessageMock).toHaveBeenCalledTimes(1);
        const greetingPayload =
          prepareAndPersistMessageMock.mock.calls[0]?.[0];
        expect(greetingPayload?.dialogConfig?.userId).toBe(
          tc.expectGreetingUserId
        );
        expect(
          greetingPayload?.dialogConfig?.dbKey.startsWith(
            `dialog-${tc.expectOwner}-`
          )
        ).toBe(true);
      }
    });
  }
});

describe("isLocalOwnerDialogAgents", () => {
  const cases: Array<{ cybots: readonly string[]; expected: boolean }> = [
    { cybots: ["agent-local-01AAA"], expected: true },
    // legacy 设备本地前缀仍需识别（存量本地对话）
    { cybots: ["cybot-local-01BBB"], expected: true },
    { cybots: ["agent-local-01AAA", "agent-user1-01CCC"], expected: true },
    { cybots: [], expected: false },
    { cybots: ["agent-user1-01AAA"], expected: false },
    { cybots: ["agent-pub-01AAA"], expected: false },
  ];

  it("table-driven prefix detection", async () => {
    const loaded = await import("./createDialogAction.ts?resolver" as string);
    const resolve = (loaded as any).isLocalOwnerDialogAgents as (
      cybots: readonly string[]
    ) => boolean;
    for (const { cybots, expected } of cases) {
      expect(resolve(cybots)).toBe(expected);
    }
  });
});
