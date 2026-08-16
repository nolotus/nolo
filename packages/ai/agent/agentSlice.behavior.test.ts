import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { configureStore, createAsyncThunk } from "@reduxjs/toolkit";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileCredentialBroker } from "../../agent-runtime/fileCredentialBroker";

let moduleVersion = 0;
const writeMock = mock(async (_args?: any) => ({}));
const patchMock = mock(async (_args?: any) => ({}));
const removeMock = mock(async (_dbKey?: string) => ({}));

/**
 * Bun's os.homedir() ignores process.env.HOME, so inject a temp-backed broker
 * via setAgentCredentialBrokerFactoryForTests instead of env override.
 */
const withTempBroker = async <T>(
  load: () => Promise<{
    setAgentCredentialBrokerFactoryForTests: (
      factory: ((opts?: { homeDir?: string }) => ReturnType<typeof createFileCredentialBroker>) | null
    ) => void;
  } & Record<string, unknown>>,
  fn: (args: {
    homeDir: string;
    broker: ReturnType<typeof createFileCredentialBroker>;
    mod: Awaited<ReturnType<typeof load>>;
  }) => Promise<T>
): Promise<T> => {
  const homeDir = mkdtempSync(join(tmpdir(), "nolo-agent-slice-"));
  const broker = createFileCredentialBroker({ homeDir });
  const mod = await load();
  mod.setAgentCredentialBrokerFactoryForTests(() =>
    createFileCredentialBroker({ homeDir })
  );
  try {
    return await fn({ homeDir, broker, mod });
  } finally {
    mod.setAgentCredentialBrokerFactoryForTests(null);
    rmSync(homeDir, { recursive: true, force: true });
  }
};

const loadAgentSlice = async () => {
  mock.module("database/dbSlice", () => {
    const write = createAsyncThunk("test/write", async (args: any) => {
      writeMock(args);
      return { ...(args.data ?? {}), dbKey: args.customKey };
    });
    const patch = createAsyncThunk("test/patch", async (args: any) => {
      patchMock(args);
      return { ...(args.changes ?? {}), dbKey: args.dbKey };
    });
    const remove = createAsyncThunk("test/remove", async (dbKey: string) => {
      removeMock(dbKey);
      return { dbKey };
    });
    return { write, patch, remove };
  });

  const mod = await import(`./agentSlice.ts`);
  mock.restore();
  return mod;
};

beforeEach(() => {
  moduleVersion += 1;
  writeMock.mockClear();
  patchMock.mockClear();
  removeMock.mockClear();
});

afterEach(() => {
  mock.restore();
});

describe("createAgent", () => {
  it("writes local private key and userId when userId is empty", async () => {
    const { default: agentReducer, createAgent } = await loadAgentSlice();
    const store = configureStore({ reducer: { agent: agentReducer } });

    const result = await store
      .dispatch(
        createAgent({
          userId: "",
          formData: { name: "Local Agent", isPublic: false } as any,
          spaceId: undefined,
        }) as any
      )
      .unwrap();

    expect(result.userId).toBe("local");
    expect(result.isPublic).toBe(false);
    expect(writeMock).toHaveBeenCalledTimes(1);

    const writeCall = (writeMock.mock.calls as any[])[0][0];
    expect(writeCall.customKey.startsWith("agent-local-")).toBe(true);
    expect(writeCall.data.userId).toBe("local");
    expect(writeCall.userId).toBe("local");
    expect(writeCall.data.isPublic).toBe(false);
  });

  it("forces local agent private even when isPublic is true", async () => {
    const { default: agentReducer, createAgent } = await loadAgentSlice();
    const store = configureStore({ reducer: { agent: agentReducer } });

    const result = await store
      .dispatch(
        createAgent({
          userId: "",
          formData: { name: "Local Agent", isPublic: true } as any,
          spaceId: undefined,
        }) as any
      )
      .unwrap();

    expect(result.userId).toBe("local");
    expect(result.isPublic).toBe(false);
    expect(writeMock).toHaveBeenCalledTimes(1);

    const writeCall = (writeMock.mock.calls as any[])[0][0];
    expect(writeCall.customKey.startsWith("agent-local-")).toBe(true);
    expect(writeCall.data.isPublic).toBe(false);
  });

  it("writes account private key and preserves public copy when isPublic is true", async () => {
    const { default: agentReducer, createAgent } = await loadAgentSlice();
    const store = configureStore({ reducer: { agent: agentReducer } });

    const result = await store
      .dispatch(
        createAgent({
          userId: "user1",
          formData: { name: "Account Agent", isPublic: true } as any,
          spaceId: undefined,
        }) as any
      )
      .unwrap();

    expect(result.userId).toBe("user1");
    expect(result.isPublic).toBe(true);
    expect(writeMock).toHaveBeenCalledTimes(2);

    const [privateWrite, publicWrite] = writeMock.mock.calls as any[][];
    expect(privateWrite[0].customKey.startsWith("agent-user1-")).toBe(true);
    expect(privateWrite[0].data.userId).toBe("user1");
    expect(privateWrite[0].userId).toBe("user1");
    expect(publicWrite[0].customKey.startsWith("agent-pub-")).toBe(true);
    expect(publicWrite[0].data.userId).toBe("user1");
    expect(publicWrite[0].userId).toBe("user1");
  });

  it("writes only account private key when isPublic is false", async () => {
    const { default: agentReducer, createAgent } = await loadAgentSlice();
    const store = configureStore({ reducer: { agent: agentReducer } });

    await store
      .dispatch(
        createAgent({
          userId: "user1",
          formData: { name: "Account Agent", isPublic: false } as any,
          spaceId: undefined,
        }) as any
      )
      .unwrap();

    expect(writeMock).toHaveBeenCalledTimes(1);
    const writeCall = (writeMock.mock.calls as any[])[0][0];
    expect(writeCall.customKey.startsWith("agent-user1-")).toBe(true);
    expect(writeCall.data.isPublic).toBe(false);
  });

  it("migrates raw apiKey into credential broker and strips it from the write payload", async () => {
    await withTempBroker(loadAgentSlice, async ({ broker, mod }) => {
      const { default: agentReducer, createAgent } = mod as any;
      const store = configureStore({ reducer: { agent: agentReducer } });

      const result = await store
        .dispatch(
          createAgent({
            userId: "",
            formData: {
              name: "Keyed Local Agent",
              isPublic: false,
              apiSource: "custom",
              provider: "custom",
              model: "mimo-v2.5-pro",
              customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
              apiKey: "sk-local-secret-key",
            } as any,
            spaceId: undefined,
          }) as any
        )
        .unwrap();

      expect(writeMock).toHaveBeenCalledTimes(1);
      const writeCall = (writeMock.mock.calls as any[])[0][0];
      expect(writeCall.data.apiKey).toBeUndefined();
      expect(writeCall.data.credentialRef).toMatch(/^api-key:agent-/);
      expect(writeCall.data.apiKeyRef).toMatch(/^api-key:agent-/);
      expect(writeCall.data.credentialMigration).toBe("done");
      expect(writeCall.data.credentialRef).toBe(
        `api-key:${writeCall.customKey}`,
      );
      // Returned agent also must not leak the raw secret.
      expect((result as any).apiKey).toBeUndefined();

      expect(await broker.has(writeCall.data.credentialRef)).toBe(true);
      expect(await broker.get(writeCall.data.credentialRef)).toBe(
        "sk-local-secret-key",
      );
    });
  });

  it("strips raw apiKey for account create as well (same security path)", async () => {
    await withTempBroker(loadAgentSlice, async ({ broker, mod }) => {
      const { default: agentReducer, createAgent } = mod as any;
      const store = configureStore({ reducer: { agent: agentReducer } });

      await store
        .dispatch(
          createAgent({
            userId: "user1",
            formData: {
              name: "Account Keyed Agent",
              isPublic: false,
              apiSource: "custom",
              provider: "custom",
              model: "gpt-4.1-mini",
              customProviderUrl: "https://provider.example/v1",
              apiKey: "sk-account-secret",
            } as any,
            spaceId: undefined,
          }) as any
        )
        .unwrap();

      expect(writeMock).toHaveBeenCalledTimes(1);
      const writeCall = (writeMock.mock.calls as any[])[0][0];
      expect(writeCall.customKey.startsWith("agent-user1-")).toBe(true);
      expect(writeCall.data.apiKey).toBeUndefined();
      expect(writeCall.data.credentialRef).toBe(
        `api-key:${writeCall.customKey}`,
      );
      expect(writeCall.data.credentialMigration).toBe("done");

      expect(await broker.has(writeCall.data.credentialRef)).toBe(true);
    });
  });

  it("preserves OAuth apiKeyRef when no raw apiKey is provided", async () => {
    await withTempBroker(loadAgentSlice, async ({ mod }) => {
      const { default: agentReducer, createAgent } = mod as any;
      const store = configureStore({ reducer: { agent: agentReducer } });

      await store
        .dispatch(
          createAgent({
            userId: "",
            formData: {
              name: "XAI OAuth Agent",
              isPublic: false,
              apiSource: "custom",
              provider: "custom",
              model: "grok-3",
              customProviderUrl: "https://api.x.ai/v1",
              apiKeyRef: "xai",
            } as any,
            spaceId: undefined,
          }) as any
        )
        .unwrap();

      expect(writeMock).toHaveBeenCalledTimes(1);
      const writeCall = (writeMock.mock.calls as any[])[0][0];
      expect(writeCall.data.apiKey).toBeUndefined();
      expect(writeCall.data.apiKeyRef).toBe("xai");
      // No raw key → no forced broker credentialRef.
      expect(writeCall.data.credentialRef).toBeUndefined();
      expect(writeCall.data.credentialMigration).toBeUndefined();
    });
  });

  it("accepts Agent-source descriptor projections (Token Plan / OAuth / CLI) on create", async () => {
    const { projectAgentSourceFormData } = await import("./agentSourceDescriptors");

    await withTempBroker(loadAgentSlice, async ({ broker, mod }) => {
      const { default: agentReducer, createAgent } = mod as any;
      const store = configureStore({ reducer: { agent: agentReducer } });

      // Token Plan → broker migration, no raw key on write.
      await store
        .dispatch(
          createAgent({
            userId: "",
            formData: projectAgentSourceFormData({
              sourceKey: "template:token-plan",
              name: "Descriptor TP",
              apiKey: "sk-descriptor-tp",
            }) as any,
            spaceId: undefined,
          }) as any,
        )
        .unwrap();
      const tpWrite = (writeMock.mock.calls as any[])[0][0];
      expect(tpWrite.data.apiKey).toBeUndefined();
      expect(tpWrite.data.credentialRef).toMatch(/^api-key:agent-/);
      expect(tpWrite.data.useServerProxy).toBe(false);
      expect(await broker.has(tpWrite.data.credentialRef)).toBe(true);

      writeMock.mockClear();

      // OAuth → apiKeyRef store id only (never preset id / raw key).
      await store
        .dispatch(
          createAgent({
            userId: "",
            formData: projectAgentSourceFormData({
              sourceKey: "oauth:xai",
              name: "Descriptor OAuth",
              apiKey: "must-not-persist",
            }) as any,
            spaceId: undefined,
          }) as any,
        )
        .unwrap();
      const oauthWrite = (writeMock.mock.calls as any[])[0][0];
      expect(oauthWrite.data.apiKey).toBeUndefined();
      expect(oauthWrite.data.apiKeyRef).toBe("xai");
      expect(oauthWrite.data.credentialRef).toBeUndefined();
      expect(oauthWrite.data.useServerProxy).toBe(false);

      writeMock.mockClear();

      // CLI → canonical cliProvider, no Nolo secrets.
      await store
        .dispatch(
          createAgent({
            userId: "",
            formData: projectAgentSourceFormData({
              sourceKey: "cli:claude",
              name: "Descriptor CLI",
            }) as any,
            spaceId: undefined,
          }) as any,
        )
        .unwrap();
      const cliWrite = (writeMock.mock.calls as any[])[0][0];
      expect(cliWrite.data.apiSource).toBe("cli");
      expect(cliWrite.data.cliProvider).toBe("claude");
      expect(cliWrite.data.apiKey).toBeUndefined();
      expect(cliWrite.data.apiKeyRef).toBeUndefined();
    });
  });
});

describe("updateAgent", () => {
  it("does not touch public copy for local agents even when previousAgent was public", async () => {
    const { default: agentReducer, updateAgent } = await loadAgentSlice();
    const dbGetMock = mock(async () => ({}));
    const store = configureStore({
      reducer: { agent: agentReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: { extraArgument: { db: { get: dbGetMock } } },
        }),
    });

    const result = await store
      .dispatch(
        updateAgent({
          userId: "",
          agentId: "agent1",
          formData: { name: "Updated Local" },
          previousAgent: {
            id: "agent1",
            type: "agent",
            isPublic: true,
            userId: "old",
          } as any,
        }) as any
      )
      .unwrap();

    expect(result.userId).toBe("local");
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(writeMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();

    const patchCall = (patchMock.mock.calls as any[])[0][0];
    expect(patchCall.dbKey.startsWith("agent-local-")).toBe(true);
  });

  it("removes public copy when account agent is switched from public to private", async () => {
    const { default: agentReducer, updateAgent } = await loadAgentSlice();
    const dbGetMock = mock(async () => ({}));
    const store = configureStore({
      reducer: { agent: agentReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: { extraArgument: { db: { get: dbGetMock } } },
        }),
    });

    await store
      .dispatch(
        updateAgent({
          userId: "user1",
          agentId: "agent1",
          formData: { isPublic: false },
          previousAgent: {
            id: "agent1",
            type: "agent",
            isPublic: true,
            userId: "user1",
          } as any,
        }) as any
      )
      .unwrap();

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(writeMock).not.toHaveBeenCalled();

    const patchCall = (patchMock.mock.calls as any[])[0][0];
    expect(patchCall.dbKey.startsWith("agent-user1-")).toBe(true);

    const removeCall = (removeMock.mock.calls as any[])[0][0];
    expect(removeCall.startsWith("agent-pub-")).toBe(true);
  });

  it("updates public copy when account agent stays public", async () => {
    const { default: agentReducer, updateAgent } = await loadAgentSlice();
    const dbGetMock = mock(async () => ({}));
    const store = configureStore({
      reducer: { agent: agentReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: { extraArgument: { db: { get: dbGetMock } } },
        }),
    });

    await store
      .dispatch(
        updateAgent({
          userId: "user1",
          agentId: "agent1",
          formData: { name: "Still Public" },
          previousAgent: {
            id: "agent1",
            type: "agent",
            isPublic: true,
            userId: "user1",
          } as any,
        }) as any
      )
      .unwrap();

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();

    const publicWrite = (writeMock.mock.calls as any[])[0][0];
    expect(publicWrite.customKey.startsWith("agent-pub-")).toBe(true);
    expect(publicWrite.data.userId).toBe("user1");
    expect(publicWrite.userId).toBe("user1");
  });

  it("migrates raw apiKey on update and patches null apiKey + credentialRef", async () => {
    await withTempBroker(loadAgentSlice, async ({ broker, mod }) => {
      const { default: agentReducer, updateAgent } = mod as any;
      const dbGetMock = mock(async () => ({}));
      const store = configureStore({
        reducer: { agent: agentReducer },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            thunk: { extraArgument: { db: { get: dbGetMock } } },
          }),
      });

      await store
        .dispatch(
          updateAgent({
            userId: "local",
            agentId: "agent1",
            formData: { apiKey: "sk-updated-secret" } as any,
            previousAgent: {
              id: "agent1",
              type: "agent",
              isPublic: false,
              userId: "local",
              apiSource: "custom",
            } as any,
          }) as any
        )
        .unwrap();

      expect(patchMock).toHaveBeenCalledTimes(1);
      const patchCall = (patchMock.mock.calls as any[])[0][0];
      expect(patchCall.dbKey.startsWith("agent-local-")).toBe(true);
      // null deletes prior raw key via patch deepMerge
      expect(patchCall.changes.apiKey).toBeNull();
      expect(patchCall.changes.credentialRef).toBe(
        `api-key:${patchCall.dbKey}`,
      );
      expect(patchCall.changes.credentialMigration).toBe("done");

      expect(await broker.has(patchCall.changes.credentialRef)).toBe(true);
      expect(await broker.get(patchCall.changes.credentialRef)).toBe(
        "sk-updated-secret",
      );
    });
  });

  it("sanitizes pseudo-string model='undefined' to empty on update", async () => {
    const { default: agentReducer, updateAgent } = await loadAgentSlice();
    const dbGetMock = mock(async () => ({}));
    const store = configureStore({
      reducer: { agent: agentReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          thunk: { extraArgument: { db: { get: dbGetMock } } },
        }),
    });

    await store
      .dispatch(
        updateAgent({
          userId: "local",
          agentId: "agent1",
          formData: { model: "undefined" } as any,
          previousAgent: {
            id: "agent1",
            type: "agent",
            isPublic: false,
            userId: "local",
            apiSource: "custom",
          } as any,
        }) as any
      )
      .unwrap();

    expect(patchMock).toHaveBeenCalledTimes(1);
    const patchCall = (patchMock.mock.calls as any[])[0][0];
    expect(patchCall.changes.model).toBe("");
  });

  it("sanitizes pseudo-string model='undefined' to empty on create", async () => {
    const { default: agentReducer, createAgent } = await loadAgentSlice();
    const store = configureStore({ reducer: { agent: agentReducer } });

    await store
      .dispatch(
        createAgent({
          userId: "",
          formData: {
            name: "Dirty Agent",
            isPublic: false,
            model: "undefined",
            provider: "NULL",
          } as any,
          spaceId: undefined,
        }) as any
      )
      .unwrap();

    expect(writeMock).toHaveBeenCalledTimes(1);
    const writeCall = (writeMock.mock.calls as any[])[0][0];
    expect(writeCall.data.model).toBe("");
    expect(writeCall.data.provider).toBe("");
  });
});
