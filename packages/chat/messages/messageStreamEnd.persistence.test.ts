import { afterEach, describe, expect, mock, test } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module, and
// live module namespace objects rebind under overrides.
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realAddRef = { ...(await import("chat/dialog/actions/addReferenceKeysAction")) };
import { fileURLToPath } from "node:url";
import { configureStore, createAsyncThunk } from "@reduxjs/toolkit";

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/dialog/actions/addReferenceKeysAction", () => realAddRef);
};

/**
 * messageStreamEnd must not fulfill before the terminal assistant write settles,
 * and must reject when that write rejects (standard thunk rejection path).
 */
describe("messageStreamEnd write settlement", () => {
  const MESSAGE_SLICE_MODULE_URL = new URL(
    "./messageSlice.ts",
    import.meta.url
  ).href;
  const dbSlicePath = fileURLToPath(
    new URL("../../database/dbSlice.ts", import.meta.url)
  );

  afterEach(() => {
    restoreLeakedModuleMocks();
  });

  const loadWithWriteStub = async (
    writeImpl: (args: any) => Promise<any>,
    updateTokensImpl: (args: any) => Promise<any> = async () => undefined,
  ) => {
    const writeStub = createAsyncThunk("test/write", async (args: any) => {
      return writeImpl(args);
    });

    mock.module("database/dbSlice", () => ({
      ...realDbSlice,
      write: writeStub,
      selectById: (state: any, dbKey: string) =>
        (state as any)?.db?.entities?.[dbKey] ?? null,
    }));
    mock.module(dbSlicePath, () => ({
      ...realDbSlice,
      write: writeStub,
      selectById: (state: any, dbKey: string) =>
        (state as any)?.db?.entities?.[dbKey] ?? null,
    }));
    // Prefer state-backed selectUserId so sticky mocks cannot force a fixed user.
    mock.module("auth/authSlice", () => ({
      ...realAuthSlice,
      selectUserId: (state: any) =>
        state?.auth?.currentUser?.userId ?? "user-1",
    }));
    mock.module("chat/dialog/actions/addReferenceKeysAction", () => ({
      addReferenceKeysAction: createAsyncThunk(
        "test/addReferenceKeysAction",
        async () => undefined
      ),
      default: (realAddRef as any).default ?? (() => undefined),
    }));
    mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
      updateDialogTitle: createAsyncThunk(
        "test/updateDialogTitle",
        async () => undefined
      ),
      updateTokens: createAsyncThunk("test/updateTokens", updateTokensImpl),
    }));

    const mod = await import(
      `${MESSAGE_SLICE_MODULE_URL}?stream-end-persist=${Date.now()}-${Math.random()}`
    );
    return mod;
  };

  const basePayload = (overrides: Record<string, unknown> = {}) => {
    const dialogKey = "dialog-user-1-01DIALOG";
    const dialogId = "01DIALOG";
    const messageId = "01MSGASSIST";
    const msgKey = `dialog-${dialogId}-msg-${messageId}`;
    return {
      finalContentBuffer: [{ type: "text", text: "hello from assistant" }],
      totalUsage: null,
      msgKey,
      agentConfig: {
        dbKey: "agent-user-1-01AGENT",
        name: "Agent",
        provider: "custom",
        model: "local-model",
      },
      dialogId,
      dialogKey,
      messageId,
      reasoningBuffer: "",
      toolCalls: [],
      ...overrides,
    };
  };

  const makeStore = (mod: any, dialogKey: string, dialogId: string) =>
    configureStore({
      reducer: {
        message: mod.default as any,
        db: (
          state = {
            ids: [dialogKey],
            entities: {
              [dialogKey]: {
                id: dialogId,
                dbKey: dialogKey,
                userId: "user-1",
              },
            },
          }
        ) => state,
        auth: (state = { currentUser: { userId: "user-1" } }) => state,
      },
    });

  test("stays pending until write settles, then fulfills", async () => {
    let resolveWrite!: (value: unknown) => void;
    const writeGate = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    let writeStarted = false;

    const mod = await loadWithWriteStub(async (args) => {
      writeStarted = true;
      await writeGate;
      return {
        ...(args.data ?? {}),
        dbKey: args.customKey,
        userId: args.userId,
      };
    });

    const payload = basePayload();
    const store = makeStore(mod, payload.dialogKey, payload.dialogId);

    const dispatchPromise = store.dispatch(
      mod.messageStreamEnd(payload) as any
    );

    // Allow the thunk to reach the write gate.
    for (let i = 0; i < 20 && !writeStarted; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(writeStarted).toBe(true);

    let settled = false;
    let fulfilled = false;
    let rejected = false;
    void dispatchPromise
      .then((action: any) => {
        settled = true;
        fulfilled = !action?.error && action?.meta?.requestStatus === "fulfilled";
        rejected = action?.meta?.requestStatus === "rejected";
      })
      .catch(() => {
        settled = true;
        rejected = true;
      });

    await new Promise((r) => setTimeout(r, 25));
    expect(settled).toBe(false);

    resolveWrite(undefined);
    const action = await dispatchPromise;
    expect(settled).toBe(true);
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(fulfilled || action.meta.requestStatus === "fulfilled").toBe(true);
    expect(rejected).toBe(false);

    const msg =
      (store.getState() as any).message.dialogStateById[payload.dialogId]?.msgs
        .entities[payload.messageId];
    expect(msg?.isStreaming).toBe(false);
    expect(msg?.content).toBe("hello from assistant");
  });

  test("rejects when the terminal assistant write rejects", async () => {
    const mod = await loadWithWriteStub(async () => {
      throw new Error("assistant write failed");
    });

    const payload = basePayload({
      messageId: "01MSGFAIL",
      msgKey: "dialog-01DIALOG-msg-01MSGFAIL",
    });
    // Seed a streaming message so rejected handler can append save-failure content.
    let state = mod.default(
      undefined,
      mod.messageStreaming({
        id: payload.messageId,
        dialogId: payload.dialogId,
        dbKey: payload.msgKey,
        role: "assistant",
        content: "partial",
        isStreaming: true,
      })
    );

    const store = configureStore({
      preloadedState: {
        message: state,
        db: {
          ids: [payload.dialogKey],
          entities: {
            [payload.dialogKey]: {
              id: payload.dialogId,
              dbKey: payload.dialogKey,
              userId: "user-1",
            },
          },
        },
        auth: { currentUser: { userId: "user-1" } },
      } as any,
      reducer: {
        message: mod.default as any,
        db: (s = { ids: [], entities: {} }) => s,
        auth: (s = {}) => s,
      } as any,
    });

    const action = await store.dispatch(mod.messageStreamEnd(payload) as any);
    expect(action.meta.requestStatus).toBe("rejected");

    await expect(
      Promise.resolve(action).then((a: any) => {
        if (a.meta.requestStatus === "rejected") {
          throw a.error ?? new Error("rejected");
        }
        return a.payload;
      })
    ).rejects.toBeTruthy();

    const msg =
      (store.getState() as any).message.dialogStateById[payload.dialogId]?.msgs
        .entities[payload.messageId];
    expect(msg?.isStreaming).toBe(false);
    // rejected handler marks save failure on content
    const content = msg?.content;
    const contentText =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? JSON.stringify(content)
          : String(content ?? "");
    expect(contentText.length).toBeGreaterThan(0);
  });

  test("awaits per-call token writes serially before the stream end fulfills", async () => {
    let resolveFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { resolveFirst = resolve; });
    const started: string[] = [];
    const mod = await loadWithWriteStub(
      async (args) => ({ ...args.data, dbKey: args.customKey }),
      async (args) => {
        started.push(args.usageRecord.callId);
        if (args.usageRecord.callId === "call-a") await firstGate;
      },
    );
    const payload = basePayload({
      totalUsage: { input_tokens: 3, output_tokens: 1 },
      billingUsageRecords: [
        { callId: "call-a", usage: { input_tokens: 1, output_tokens: 1 } },
        { callId: "call-b", usage: { input_tokens: 2, output_tokens: 0 } },
      ],
    });
    const store = makeStore(mod, payload.dialogKey, payload.dialogId);
    const completion = store.dispatch(mod.messageStreamEnd(payload) as any);

    for (let i = 0; i < 20 && started.length === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    expect(started).toEqual(["call-a"]);
    resolveFirst();
    const action = await completion;
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(started).toEqual(["call-a", "call-b"]);
  });
});
