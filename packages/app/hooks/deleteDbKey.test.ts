import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

import {
  AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE,
  setAgentLocalCredentialBrokerFactoryForTests,
} from "../../agent-runtime/deleteAgentLocalCredential";

const deleteContentFromSpaceMock = mock((payload: any) => ({
  type: "deleteContentFromSpace",
  payload,
}));

const brokerDeleteMock = mock(async (_ref: string) => undefined);

let moduleVersion = 0;

const realContentThunks = {
  ...(await import("create/space/content/contentThunks")),
};

afterAll(() => {
  mock.module("create/space/content/contentThunks", () => realContentThunks);
});

const loadDeleteDbKey = async () => {
  const actualContentThunks =
    await import("create/space/content/contentThunks");

  mock.module("create/space/content/contentThunks", () => ({
    ...realContentThunks,
    deleteContentFromSpace: deleteContentFromSpaceMock,
  }));

  const module = await import(`./deleteDbKey.ts`);
  mock.restore();
  return module;
};

const agentStateWithCredential =
  (
    dbKey: string,
    credentialRef?: string | null,
    extra: Record<string, unknown> = {},
  ) =>
  () =>
    ({
      db: {
        ids: [dbKey],
        entities: {
          [dbKey]: {
            dbKey,
            ...(credentialRef != null ? { credentialRef } : {}),
            ...extra,
          },
        },
      },
    }) as any;

describe("deleteDbKey", () => {
  const previousWindow = globalThis.window;
  const previousWarn = console.warn;

  beforeEach(() => {
    deleteContentFromSpaceMock.mockClear();
    brokerDeleteMock.mockClear();
    brokerDeleteMock.mockImplementation(async () => undefined);
    setAgentLocalCredentialBrokerFactoryForTests(() => ({
      get: async () => null,
      put: async () => undefined,
      delete: brokerDeleteMock,
      has: async () => false,
    }));
  });

  afterEach(() => {
    setAgentLocalCredentialBrokerFactoryForTests(null);
    console.warn = previousWarn;
    if (previousWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      globalThis.window = previousWindow;
    }
    mock.restore();
  });

  it("refreshes aggregated user data after deleting space content", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));
    const dispatchEvent = mock(() => true);
    (globalThis as any).window = { dispatchEvent };

    const thunk = deleteDbKey("page-user-1", "space-1");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: "page-user-1",
      spaceId: "space-1",
    });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const dispatched = (dispatchEvent.mock.calls as any[])[0]?.[0];
    expect(dispatched?.type).toBe("nolo-user-data-updated");
    expect(dispatched).toBeInstanceOf(Event);
    expect((dispatched as any).detail?.deletedDbKey).toBe("page-user-1");
  });

  it("removes deleted content from the local favorite projection", async () => {
    const {
      getFavoriteContentIds,
      resetFavoriteStoreForTests,
      seedFavoriteStoreForTests,
    } = await import("app/favorite/favoriteStore");
    resetFavoriteStoreForTests();
    seedFavoriteStoreForTests({ contentIds: ["page-user-1"] });

    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey("page-user-1", "space-1");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(getFavoriteContentIds()).not.toContain("page-user-1");
  });

  it("removes deleted agents from the local favorite projection", async () => {
    const {
      getFavoriteAgentIds,
      resetFavoriteStoreForTests,
      seedFavoriteStoreForTests,
    } = await import("app/favorite/favoriteStore");
    resetFavoriteStoreForTests();
    seedFavoriteStoreForTests({ agentIds: ["agent-user-1-agent-1"] });

    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey("agent-user-1-agent-1");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(getFavoriteAgentIds()).not.toContain("agent-user-1-agent-1");
  });

  it("accepts object-shaped delete keys and resolves canonical db key fields", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey({ contentKey: "page-user-2" }, "space-2");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: "page-user-2",
      spaceId: "space-2",
    });
  });

  it("passes includeAttachments to dialog deletion", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatchedActions: any[] = [];
    const db = {
      get: async () => {
        throw Object.assign(new Error("not found"), { notFound: true });
      },
      iterator: () => ({
        async *[Symbol.asyncIterator]() {},
      }),
      batch: async () => undefined,
    };
    const getState = () =>
      ({
        dialog: {
          currentDialogKey: null,
        },
        db: {
          ids: ["dialog-user-1-dialog-1"],
          entities: {
            "dialog-user-1-dialog-1": {
              dbKey: "dialog-user-1-dialog-1",
              id: "dialog-1",
              type: "dialog",
              title: "Dialog",
              cybots: [],
            },
          },
        },
        settings: {
          currentServer: null,
          syncServers: [],
        },
      }) as any;
    const dispatch = mock((action: any) => {
      if (typeof action === "function") {
        return action(dispatch as any, getState, { db });
      }
      dispatchedActions.push(action);
      return {
        unwrap: async () => action,
      };
    });

    const thunk = deleteDbKey({
      contentKey: "dialog-user-1-dialog-1",
      includeAttachments: true,
    });
    const result = await thunk(dispatch as any, getState);

    expect(result).toBe(true);
    expect(dispatchedActions).toContainEqual(
      expect.objectContaining({
        type: "dialog/deleteDialog/pending",
        meta: expect.objectContaining({
          arg: {
            dialogKey: "dialog-user-1-dialog-1",
            includeAttachments: true,
          },
        }),
      }),
    );
  });

  it("throws when delete input does not contain a canonical key", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey({ title: "Broken object" }, "space-3");

    await expect(thunk(dispatch as any, (() => ({})) as any)).rejects.toThrow(
      "Invalid delete key",
    );
  });

  it("normalizes object-shaped delete failures into readable Error messages", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    // performDirectDelete 自身失败时，error 应被归一化为可读消息
    const dispatch = mock(() => ({
      unwrap: async () => {
        throw { message: "无权修改此空间" };
      },
    }));

    const thunk = deleteDbKey("page-user-3", "space-3");

    await expect(thunk(dispatch as any, (() => ({})) as any)).rejects.toThrow(
      "无权修改此空间",
    );
  });

  it("handles cyclic delete failure payloads without crashing", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const cyclicError: Record<string, unknown> = {};
    cyclicError.data = cyclicError;

    // performDirectDelete 自身失败时，循环引用 error 不能导致崩溃
    const dispatch = mock(() => ({
      unwrap: async () => {
        throw cyclicError;
      },
    }));

    const thunk = deleteDbKey("page-user-4", "space-4");

    await expect(thunk(dispatch as any, (() => ({})) as any)).rejects.toThrow(
      "Delete failed",
    );
  });

  it("space cleanup error does not prevent successful entity deletion", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => {
      if (action?.type === "deleteContentFromSpace") {
        return {
          unwrap: async () => {
            throw { message: "无权修改此空间" };
          },
        };
      }
      return { unwrap: async () => action };
    });

    const thunk = deleteDbKey("page-user-7", "space-7");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
  });

  it("waits for space cleanup before resolving success", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    let cleaned = false;

    const dispatch = mock((action: any) => {
      if (action?.type === "deleteContentFromSpace") {
        return {
          unwrap: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            cleaned = true;
            return action;
          },
        };
      }

      return {
        unwrap: async () => action,
      };
    });

    const thunk = deleteDbKey("page-user-8", "space-8");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(cleaned).toBe(true);
  });

  it("falls back to direct entity deletion when the referenced space is missing", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => {
      if (action?.type === "deleteContentFromSpace") {
        return {
          unwrap: async () => {
            throw new Error(
              'Failed to fetch data for key "space-missing" from all sources.',
            );
          },
        };
      }

      return {
        unwrap: async () => action,
      };
    });

    const thunk = deleteDbKey("page-user-5", "space-missing");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: "page-user-5",
      spaceId: "space-missing",
    });
  });

  it("passes source server origin through the space-detach path", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(
      {
        contentKey: "page-user-6",
        serverOrigin: "https://us.nolo.chat",
      },
      "space-6",
    );
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: "page-user-6",
      spaceId: "space-6",
      sourceServerOrigin: "https://us.nolo.chat",
    });
  });

  it("agent authoritative delete success calls broker.delete once with credentialRef", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-cred";
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(agentKey);
    const result = await thunk(
      dispatch as any,
      agentStateWithCredential(agentKey, "api-key:agent-user-1-agent-cred"),
    );

    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(1);
    expect(brokerDeleteMock).toHaveBeenCalledWith(
      "api-key:agent-user-1-agent-cred",
    );
  });

  it("cold Redux cache still reads credentialRef from DB before delete", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-cold";
    const coldRef = "api-key:agent-user-1-agent-cold";
    let callIndex = 0;

    // Empty entities: selectById misses; first dispatch is authoritative `read`.
    const dispatch = mock((_action: any) => {
      const current = callIndex++;
      return {
        unwrap: async () => {
          if (current === 0) {
            return {
              dbKey: agentKey,
              credentialRef: coldRef,
            };
          }
          return { dbKey: agentKey };
        },
      };
    });

    const getState = () =>
      ({
        db: {
          ids: [],
          entities: {},
        },
      }) as any;

    const thunk = deleteDbKey(agentKey);
    const result = await thunk(dispatch as any, getState);

    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(1);
    expect(brokerDeleteMock).toHaveBeenCalledWith(coldRef);
    // read (cold) then remove
    expect(dispatch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("does not call broker.delete when authoritative DB remove fails", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-dbfail";
    const dispatch = mock(() => ({
      unwrap: async () => {
        throw new Error("DB remove failed");
      },
    }));

    const thunk = deleteDbKey(agentKey);
    await expect(
      thunk(
        dispatch as any,
        agentStateWithCredential(agentKey, "api-key:agent-dbfail"),
      ),
    ).rejects.toThrow("DB remove failed");
    expect(brokerDeleteMock).toHaveBeenCalledTimes(0);
  });

  it("space unlink path does not clear agent broker credentials by itself", async () => {
    // Space detach runs after entity delete for pages; credential cleanup is agent-only.
    // Pure space reference cleanup must never call broker.delete.
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey("page-user-space-unlink", "space-unlink-1");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: "page-user-space-unlink",
      spaceId: "space-unlink-1",
    });
    expect(brokerDeleteMock).toHaveBeenCalledTimes(0);
  });

  it("non-agent delete does not call broker.delete", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey("page-user-no-broker");
    const result = await thunk(dispatch as any, (() => ({})) as any);

    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(0);
  });

  it("broker delete failure after DB success does not resurrect DB and stays sanitized", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-brokerfail";
    const leakedRef = "api-key:must-not-leak-ref";
    const leakedSecret = "sk-live-must-not-appear";
    brokerDeleteMock.mockImplementation(async () => {
      throw new Error(
        `Keychain delete failed for ${leakedRef} ${leakedSecret}`,
      );
    });

    const warnMock = mock(() => undefined);
    console.warn = warnMock as typeof console.warn;

    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(agentKey);
    const result = await thunk(
      dispatch as any,
      agentStateWithCredential(agentKey, leakedRef, { apiKeyRef: "chatgpt" }),
    );

    // Existing delete API: still successful after DB tombstone.
    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(1);

    expect(warnMock).toHaveBeenCalled();
    const warnText = JSON.stringify(warnMock.mock.calls);
    expect(warnText).toContain(AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE);
    expect(warnText).not.toContain(leakedRef);
    expect(warnText).not.toContain(leakedSecret);
    expect(warnText).not.toContain("Keychain");
  });

  it("agent without credentialRef does not call broker.delete", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-noref";
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(agentKey);
    const result = await thunk(
      dispatch as any,
      agentStateWithCredential(agentKey, null, { apiKeyRef: "chatgpt" }),
    );

    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(0);
  });

  it("public agent projection delete does not clear private agent credentials", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const publicKey = "agent-pub-01PUBLICAGENT";
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(publicKey);
    const result = await thunk(
      dispatch as any,
      agentStateWithCredential(publicKey, "api-key:agent-user-1-private"),
    );

    expect(result).toBe(true);
    expect(brokerDeleteMock).toHaveBeenCalledTimes(0);
  });

  it("agent delete with spaceId still cleans credential only once (not via space unlink)", async () => {
    const { deleteDbKey } = await loadDeleteDbKey();
    const agentKey = "agent-user-1-agent-with-space";
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    const thunk = deleteDbKey(agentKey, "space-agent-1");
    const result = await thunk(
      dispatch as any,
      agentStateWithCredential(agentKey, "api-key:agent-with-space"),
    );

    expect(result).toBe(true);
    expect(deleteContentFromSpaceMock).toHaveBeenCalledWith({
      contentKey: agentKey,
      spaceId: "space-agent-1",
    });
    expect(brokerDeleteMock).toHaveBeenCalledTimes(1);
  });
});
