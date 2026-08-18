import { afterEach, describe, expect, it, mock, test } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module, and
// live module namespace objects rebind under overrides.
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realAddRef = { ...(await import("chat/dialog/actions/addReferenceKeysAction")) };
import { fileURLToPath } from "node:url";
import { configureStore, createAsyncThunk } from "@reduxjs/toolkit";
import { resolveMessageOwner } from "./resolveMessageOwner";

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/dialog/actions/addReferenceKeysAction", () => realAddRef);
};

describe("resolveMessageOwner", () => {
  const cases: Array<{
    name: string;
    input: {
      dialogConfigUserId?: string | null;
      dialogKey: string;
      currentAccountUserId?: string | null;
    };
    expected: string;
  }> = [
    {
      name: "logged-in + dialog-local key → local",
      input: {
        dialogKey: "dialog-local-01DIALOG",
        currentAccountUserId: "user-account-99",
      },
      expected: "local",
    },
    {
      name: "logged-out + dialog-local key → local",
      input: {
        dialogKey: "dialog-local-01DIALOG",
        currentAccountUserId: null,
      },
      expected: "local",
    },
    {
      name: "explicit dialogConfig.userId wins over key/account",
      input: {
        dialogConfigUserId: "user-1",
        dialogKey: "dialog-user-account-99-01DIALOG",
        currentAccountUserId: "user-account-99",
      },
      expected: "user-1",
    },
    {
      name: "account dialog + logged in → account (no regression)",
      input: {
        dialogKey: "dialog-user-account-99-01DIALOG",
        currentAccountUserId: "user-account-99",
      },
      expected: "user-account-99",
    },
    {
      name: "blank dialogConfig.userId falls through to key owner",
      input: {
        dialogConfigUserId: "   ",
        dialogKey: "dialog-local-01DIALOG",
        currentAccountUserId: "user-account-99",
      },
      expected: "local",
    },
    {
      name: "no key owner + no account → local fallback",
      input: {
        dialogKey: "dialog-pub-01DIALOG",
        currentAccountUserId: undefined,
      },
      expected: "local",
    },
  ];

  for (const tc of cases) {
    it(tc.name, () => {
      expect(resolveMessageOwner(tc.input)).toBe(tc.expected);
    });
  }
});

/**
 * One minimal real-thunk smoke: write payload carries explicit owner, and the
 * host thunk does not resolve until write's promise resolves.
 */
describe("prepareAndPersistMessage write await + explicit owner", () => {
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

  test("write payload has userId=local and thunk waits for write", async () => {
    let writeCall: any = null;
    const writeResolvers: Array<() => void> = [];

    const writeStub = createAsyncThunk("test/write", (args: any) => {
      writeCall = args;
      return new Promise<void>((resolve) => {
        writeResolvers.push(() => resolve());
      }).then(() => ({ ...(args.data ?? {}), dbKey: args.customKey }));
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
    }));
    mock.module("auth/authSlice", () => ({
      ...realAuthSlice,
      // Logged in account must not win over dialog-local key.
      selectUserId: (state: any) =>
        state?.auth?.currentUser?.userId ?? "user-account-99",
    }));
    mock.module("chat/dialog/actions/addReferenceKeysAction", () => ({
      addReferenceKeysAction: createAsyncThunk(
        "test/addReferenceKeysAction",
        async () => undefined
      ),
      default: (realAddRef as any).default ?? (() => undefined),
    }));

    const mod = await import(
      `${MESSAGE_SLICE_MODULE_URL}?owner-behavior=${Date.now()}`
    );
    const store = configureStore({
      reducer: { message: mod.default as any },
    });

    const promise = store.dispatch(
      mod.prepareAndPersistMessage({
        message: { role: "user", content: "await me" },
        dialogConfig: {
          id: "01DIALOG",
          dbKey: "dialog-local-01DIALOG",
        } as any,
      }) as any
    );

    expect(writeCall).toBeDefined();
    expect(writeCall.userId).toBe("local");
    expect(writeCall.data.userId).toBe("local");

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
    expect(resolved).toBe(false);

    writeResolvers.forEach((r) => r());
    await promise;
    expect(resolved).toBe(true);
  });
});

/**
 * messageStreamEnd must stamp the same resolved owner on the terminal
 * assistant write (logged-out local dialog → userId=local).
 */
describe("messageStreamEnd assistant write carries resolved owner", () => {
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

  test("logged-out local dialog → write has userId=local", async () => {
    let writeCall: any = null;
    const writeStub = createAsyncThunk("test/write", (args: any) => {
      writeCall = args;
      return {
        ...(args.data ?? {}),
        dbKey: args.customKey,
        userId: args.userId,
      };
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
    mock.module("auth/authSlice", () => ({
      ...realAuthSlice,
      selectUserId: (state: any) => state?.auth?.currentUser?.userId ?? null,
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
      updateDialogTitle: createAsyncThunk("test/updateDialogTitle", async () => undefined),
      updateTokens: createAsyncThunk("test/updateTokens", async () => undefined),
    }));

    const mod = await import(
      `${MESSAGE_SLICE_MODULE_URL}?stream-end-owner=${Date.now()}`
    );

    const dialogKey = "dialog-local-01DIALOG";
    const dialogId = "01DIALOG";
    const messageId = "01MSGASSIST";
    const msgKey = `dialog-${dialogId}-msg-${messageId}`;

    const store = configureStore({
      reducer: {
        message: mod.default as any,
        db: (state = { ids: [dialogKey], entities: {
          [dialogKey]: {
            id: dialogId,
            dbKey: dialogKey,
            userId: "local",
          },
        } }) => state,
        auth: (state = { currentUser: null }) => state,
      },
    });

    await store.dispatch(
      mod.messageStreamEnd({
        finalContentBuffer: [{ type: "text", text: "hello from assistant" }],
        totalUsage: null,
        msgKey,
        agentConfig: {
          dbKey: "agent-local-01AGENT",
          name: "Local Agent",
          provider: "custom",
          model: "local-model",
        },
        dialogId,
        dialogKey,
        messageId,
        reasoningBuffer: "",
        toolCalls: [],
      }) as any
    );

    expect(writeCall).toBeDefined();
    expect(writeCall.userId).toBe("local");
    expect(writeCall.data.userId).toBe("local");
    expect(writeCall.customKey).toBe(msgKey);
  });
});
