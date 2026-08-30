import { describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";
import { createTokenKey } from "database/keys";

const realAuthSlice = await import("auth/authSlice");
const realDbSlice = await import("database/dbSlice");

const patchMock = mock((input: any) => ({ kind: "patch", input }));
const readMock = mock((input: any) => ({ kind: "read", input }));
const writeMock = mock((input: any) => ({ kind: "write", input }));
const deductBalanceMock = mock((amount: number) => ({ kind: "deductBalance", amount }));
const createTokenRecordMock = mock((tokenData: any) => ({
  dbKey: `token-record-${tokenData.id}`,
  ...tokenData,
}));
const saveTokenRecordMock = mock(async (tokenData: any) => {
  await new Promise((resolve) =>
    setTimeout(resolve, tokenData.input_tokens === 50 ? 5 : 15)
  );
});

let moduleVersion = 0;
const dbSlicePath = fileURLToPath(
  new URL("../../../database/dbSlice.ts", import.meta.url)
);
const authSlicePath = fileURLToPath(
  new URL("../../../auth/authSlice.ts", import.meta.url)
);

async function loadUpdateTokensAction() {
  const selectByIdMock = (state: any, dbKey: string) => state.dbRecords?.[dbKey] ?? null;

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    patch: patchMock,
    read: readMock,
    write: writeMock,
    selectById: selectByIdMock,
  }));
  mock.module(dbSlicePath, () => ({
    ...realDbSlice,
    patch: patchMock,
    read: readMock,
    write: writeMock,
    selectById: selectByIdMock,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    deductBalance: deductBalanceMock,
  }));
  mock.module(authSlicePath, () => ({
    ...realAuthSlice,
    deductBalance: deductBalanceMock,
  }));
  mock.module("identity/actions", () => ({
    deductBalance: deductBalanceMock,
  }));

  mock.module("ai/token/saveTokenRecord", () => ({
    createTokenRecord: createTokenRecordMock,
    saveTokenRecord: saveTokenRecordMock,
  }));
  mock.module("ai/token/prepareTokenUsageData", () => ({
    prepareTokenUsageData: ({ rawUsage, agentConfig, userId, agentId, dialogId }: any) => {
      const usage = {
        input_tokens: rawUsage?.input_tokens ?? 0,
        output_tokens: rawUsage?.output_tokens ?? 0,
        ...(typeof rawUsage?.provider_call_id === "string"
          ? { provider_call_id: rawUsage.provider_call_id }
          : {}),
      };
      const billedModel = agentConfig?.model ?? "test-model";
      const recordProvider = agentConfig?.provider ?? "test-provider";
      // Mirror the real prepareTokenUsageData server_billed behaviour so the
      // updateTokensAction deductBalance gate can be exercised for the
      // chat-proxy single-billing client hint. Only the server_billed branch
      // diverges from the legacy default (cost 0, no billable field) so the
      // existing concurrent-patch / persistence tests stay unaffected.
      const serverBilled = rawUsage?.server_billed === true;
      if (serverBilled) {
        (usage as Record<string, unknown>).server_billed = true;
      }
      const baseTokenData: Record<string, unknown> = {
        ...usage,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
        pay: 0,
        userId,
        agentId,
        cybotId: agentId,
        dialogId,
        model: billedModel,
        provider: recordProvider,
      };
      if (serverBilled) {
        // The flag is audit-only. Client persistence remains billable and the
        // server ledger dedupes by provider_call_id.
        baseTokenData.cost = 0.5;
        baseTokenData.billable = true;
        baseTokenData.server_billed = true;
        if (typeof rawUsage?.provider_call_id === "string") {
          baseTokenData.provider_call_id = rawUsage.provider_call_id;
        }
      }
      return {
        usage,
        billedModel,
        recordProvider,
        tokenData: baseTokenData,
      };
    },
  }));

  const module = await import(`./updateTokensAction.ts`);
  mock.restore();
  return module.updateTokensAction;
}

describe("updateTokensAction", () => {
  it("retries a later detail write while keeping web stats and dialog projection exactly once", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    saveTokenRecordMock.mockReset();
    saveTokenRecordMock.mockImplementation(async () => undefined);
    const callId = "web-retry-call";
    const tokenKey = createTokenKey.recordForStableCall("user-retry", callId);
    const dialogKey = "dialog-user-retry";
    const state = {
      auth: { currentUser: { userId: "user-retry", username: "tester" } },
      dbRecords: {
        [dialogKey]: { dbKey: dialogKey, inputTokens: 10, outputTokens: 2, totalCost: 0.5 },
        [tokenKey]: { id: tokenKey, provider_call_id: callId },
      },
    } as any;
    const dispatch = mock((action: any) => {
      if (action.kind === "write" || action.kind === "patch") {
        return { unwrap: async () => action.input.data };
      }
      if (action.kind === "deductBalance") return { unwrap: async () => undefined };
      if (action.kind === "read") return { unwrap: async () => null };
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    await updateTokensAction({
      dialogId: "dialog-retry",
      dialogKey,
      usageRecord: {
        callId,
        model: "gpt-5.5",
        provider: "openai",
        usage: { input_tokens: 10, output_tokens: 2, server_billed: true },
      },
      agentConfig: { id: "agent-1", apiSource: "platform", model: "gpt-5.5", provider: "openai" },
    }, { dispatch, getState: () => state } as any);

    expect(saveTokenRecordMock).toHaveBeenCalledTimes(1);
    expect(saveTokenRecordMock.mock.calls[0][3]).toBe(callId);
    expect(writeMock).not.toHaveBeenCalled();
    expect(patchMock).not.toHaveBeenCalled();
    expect(deductBalanceMock).not.toHaveBeenCalled();
  });

  it("preserves per-call evidence for same-millisecond detail, stats, and billing", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockReset();
    saveTokenRecordMock.mockImplementation(async () => undefined);

    const timestamp = 1_786_500_000_000;
    const originalDateNow = Date.now;
    Date.now = () => timestamp;
    const dialogKey = "dialog-user-same-ms";
    const dialogRecord: Record<string, any> = {
      dbKey: dialogKey,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    };
    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return { unwrap: async () => { throw new Error("missing stats"); } };
      }
      if (action.kind === "write") {
        return { unwrap: async () => action.input.data };
      }
      if (action.kind === "patch") {
        Object.assign(dialogRecord, action.input.changes);
        return { unwrap: async () => ({ ...dialogRecord }) };
      }
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });
    const getState = () => ({
      auth: { currentUser: { userId: "user-same-ms", username: "tester" } },
      dbRecords: { [dialogKey]: { ...dialogRecord } },
    });

    try {
      for (const record of [
        { callId: "call-a", model: "model-a", provider: "provider-a", usage: { input_tokens: 5, output_tokens: 1, server_billed: true } },
        { callId: "call-b", model: "model-b", provider: "provider-b", usage: { input_tokens: 7, output_tokens: 2, server_billed: true } },
      ]) {
        await updateTokensAction(
          {
            dialogId: "dialog-same-ms",
            dialogKey,
            usageRecord: record,
            agentConfig: {
              id: "agent-1",
              provider: "agent-provider",
              model: "agent-model",
              apiSource: "platform",
              billingMode: "platform",
            },
          },
          { dispatch, getState } as any,
        );
      }
    } finally {
      Date.now = originalDateNow;
    }

    expect(saveTokenRecordMock).toHaveBeenCalledTimes(2);
    expect(saveTokenRecordMock.mock.calls.map((call) => call[3])).toEqual(["call-a", "call-b"]);
    expect(saveTokenRecordMock.mock.calls.map((call) => call[0].provider_call_id)).toEqual(["call-a", "call-b"]);
    expect(createTokenRecordMock.mock.calls.map((call) => [call[0].model, call[0].provider])).toEqual([
      ["model-a", "provider-a"],
      ["model-b", "provider-b"],
    ]);
    expect(writeMock).toHaveBeenCalledTimes(2);
    expect(deductBalanceMock).toHaveBeenCalledTimes(2);
    expect(dialogRecord).toMatchObject({ inputTokens: 12, outputTokens: 3 });
  });

  it("serializes dialog token patches so concurrent updates accumulate correctly", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockClear();

    const dialogKey = "dialog-user-1";
    const dialogRecords: Record<string, any> = {
      [dialogKey]: {
        dbKey: dialogKey,
        inputTokens: 100,
        outputTokens: 200,
        totalCost: 1,
      },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        const record = dialogRecords[action.input.dbKey];
        return {
          unwrap: async () => {
            if (record) {
              return { ...record };
            }
            throw new Error(`missing record: ${action.input.dbKey}`);
          },
        };
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }

      if (action.kind === "patch") {
        const current = dialogRecords[action.input.dbKey];
        dialogRecords[action.input.dbKey] = {
          ...current,
          ...action.input.changes,
        };
        return {
          unwrap: async () => ({ ...dialogRecords[action.input.dbKey] }),
        };
      }

      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: {
          currentUser: {
            userId: "user-1",
            username: "tester",
          },
        },
        dbRecords: Object.fromEntries(
          Object.entries(dialogRecords).map(([key, value]) => [key, { ...value }])
        ),
      }) as any;

    await Promise.all([
      updateTokensAction(
        {
          dialogId: "dialog-1",
          dialogKey,
          usage: { input_tokens: 50, output_tokens: 5 },
          agentConfig: {
            id: "agent-1",
            provider: "openai",
            model: "gpt-5",
            inputPrice: 0,
            outputPrice: 0,
          },
        },
        { dispatch, getState } as any
      ),
      updateTokensAction(
        {
          dialogId: "dialog-1",
          dialogKey,
          usage: { input_tokens: 30, output_tokens: 7 },
          agentConfig: {
            id: "agent-1",
            provider: "openai",
            model: "gpt-5",
            inputPrice: 0,
            outputPrice: 0,
          },
        },
        { dispatch, getState } as any
      ),
    ]);

    expect(patchMock.mock.calls.map(([input]) => input.changes.inputTokens)).toEqual([
      150,
      180,
    ]);
    expect(dialogRecords[dialogKey]).toEqual(
      expect.objectContaining({
        inputTokens: 180,
        outputTokens: 212,
        totalCost: 1,
      })
    );
  });

  it("does not deduct balance when token record persistence fails", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockReset();
    saveTokenRecordMock.mockImplementation(async () => {
      throw new Error("write failed");
    });

    const dispatch = mock((action: any) => {
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }

      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: {
          currentUser: {
            userId: "user-1",
            username: "tester",
          },
        },
        dbRecords: {},
      }) as any;

    await expect(
      updateTokensAction(
        {
          dialogId: "dialog-1",
          dialogKey: "dialog-user-1",
          usage: { input_tokens: 50, output_tokens: 5 },
          agentConfig: {
            id: "agent-1",
            provider: "openai",
            model: "gpt-5",
            inputPrice: 0,
            outputPrice: 0,
          },
        },
        { dispatch, getState } as any
      )
    ).rejects.toThrow("write failed");

    expect(deductBalanceMock).not.toHaveBeenCalled();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("auth null + local dialog → create/save token and stats write use userId local", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockReset();
    saveTokenRecordMock.mockImplementation(async () => undefined);

    const dialogKey = "dialog-local-01DIALOG";
    const dialogRecords: Record<string, any> = {
      [dialogKey]: {
        dbKey: dialogKey,
        id: "01DIALOG",
        userId: "local",
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return {
          unwrap: async () => {
            throw new Error("no existing stats");
          },
        };
      }
      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }
      if (action.kind === "patch") {
        return {
          unwrap: async () => ({
            ...dialogRecords[action.input.dbKey],
            ...action.input.changes,
          }),
        };
      }
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: { currentUser: null },
        dbRecords: { ...dialogRecords },
      }) as any;

    await updateTokensAction(
      {
        dialogId: "01DIALOG",
        dialogKey,
        usage: { input_tokens: 10, output_tokens: 4 },
        agentConfig: {
          id: "agent-local-1",
          provider: "openai",
          model: "gpt-5",
          inputPrice: 0,
          outputPrice: 0,
        },
      },
      { dispatch, getState } as any
    );

    expect(createTokenRecordMock).toHaveBeenCalled();
    expect(createTokenRecordMock.mock.calls[0][0].userId).toBe("local");
    expect(saveTokenRecordMock).toHaveBeenCalled();
    expect(saveTokenRecordMock.mock.calls[0][0].userId).toBe("local");

    const statsWrite = writeMock.mock.calls
      .map(([input]) => input)
      .find((input) =>
        String(input.customKey).startsWith("token-stats-day-user-local-")
      );
    expect(statsWrite).toBeDefined();
    expect(statsWrite.userId).toBe("local");
    expect(statsWrite.data.userId).toBe("local");
  });

  it("authenticated non-local dialog → create/save token and stats stay account-owned", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockReset();
    saveTokenRecordMock.mockImplementation(async () => undefined);

    const accountUserId = "user-account-99";
    const dialogKey = `dialog-${accountUserId}-01DIALOG`;
    const dialogRecords: Record<string, any> = {
      [dialogKey]: {
        dbKey: dialogKey,
        id: "01DIALOG",
        userId: accountUserId,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return {
          unwrap: async () => {
            throw new Error("no existing stats");
          },
        };
      }
      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }
      if (action.kind === "patch") {
        return {
          unwrap: async () => ({
            ...dialogRecords[action.input.dbKey],
            ...action.input.changes,
          }),
        };
      }
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: {
          currentUser: {
            userId: accountUserId,
            username: "tester",
          },
        },
        dbRecords: { ...dialogRecords },
      }) as any;

    await updateTokensAction(
      {
        dialogId: "01DIALOG",
        dialogKey,
        usage: { input_tokens: 10, output_tokens: 4 },
        agentConfig: {
          id: "agent-1",
          provider: "openai",
          model: "gpt-5",
          inputPrice: 0,
          outputPrice: 0,
        },
      },
      { dispatch, getState } as any
    );

    expect(createTokenRecordMock).toHaveBeenCalled();
    expect(createTokenRecordMock.mock.calls[0][0].userId).toBe(accountUserId);
    expect(saveTokenRecordMock).toHaveBeenCalled();
    expect(saveTokenRecordMock.mock.calls[0][0].userId).toBe(accountUserId);

    const statsWrite = writeMock.mock.calls
      .map(([input]) => input)
      .find((input) =>
        String(input.customKey).startsWith(
          `token-stats-day-user-${accountUserId}-`
        )
      );
    expect(statsWrite).toBeDefined();
    expect(statsWrite.userId).toBe(accountUserId);
    expect(statsWrite.data.userId).toBe(accountUserId);
  });

  it("keeps live/local projection when legacy server_billed is present", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockClear();

    const dialogKey = "dialog-server-billed-1";
    const dialogRecords: Record<string, any> = {
      [dialogKey]: {
        dbKey: dialogKey,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        const record = dialogRecords[action.input.dbKey];
        return {
          unwrap: async () => (record ? { ...record } : null),
        };
      }
      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }
      if (action.kind === "patch") {
        dialogRecords[action.input.dbKey] = {
          ...dialogRecords[action.input.dbKey],
          ...action.input.changes,
        };
        return {
          unwrap: async () => ({ ...dialogRecords[action.input.dbKey] }),
        };
      }
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: {
          currentUser: { userId: "user-1", username: "tester" },
        },
        dbRecords: { ...dialogRecords },
      }) as any;

    // The chat proxy server stamped server_billed + provider_call_id on the
    // usage payload because recordChatProxyTokenUsage already charged the
    // ledger server-side. The client must not persist, project or deduct the
    // same call again.
    const result = await updateTokensAction(
      {
        dialogId: "dialog-server-billed-1",
        dialogKey,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          server_billed: true,
          provider_call_id: "call_server_billed_e2e",
        },
        agentConfig: {
          id: "agent-1",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          apiSource: "platform",
        },
      },
      { dispatch, getState } as any
    );

    expect(result).toEqual({ input_tokens: 100, output_tokens: 50, cost: 0.5 });
    expect(createTokenRecordMock).toHaveBeenCalled();
    expect(saveTokenRecordMock).toHaveBeenCalled();
    expect(writeMock).toHaveBeenCalled();
    expect(deductBalanceMock).toHaveBeenCalledWith(0.5);
    expect(patchMock).toHaveBeenCalled();
    expect(dialogRecords[dialogKey].inputTokens).toBe(100);
    expect(dialogRecords[dialogKey].outputTokens).toBe(50);
  });

  it("recovers stable callId from usageRaw.provider_call_id and passes it to saveTokenRecord and stable projection check", async () => {
    const updateTokensAction = await loadUpdateTokensAction();
    patchMock.mockClear();
    readMock.mockClear();
    writeMock.mockClear();
    deductBalanceMock.mockClear();
    createTokenRecordMock.mockClear();
    saveTokenRecordMock.mockClear();

    const providerCallId = "call-rebound-fallback-999";
    const stableKey = createTokenKey.recordForStableCall("user-1", providerCallId);

    const dialogKey = "dialog-fallback-callid";
    const dialogRecords: Record<string, any> = {
      [dialogKey]: {
        dbKey: dialogKey,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        const record = dialogRecords[action.input.dbKey];
        return {
          unwrap: async () => (record ? { ...record } : null),
        };
      }
      if (action.kind === "write") {
        return {
          unwrap: async () => ({
            dbKey: action.input.customKey ?? action.input.data?.dbKey,
            ...action.input.data,
          }),
        };
      }
      if (action.kind === "patch") {
        dialogRecords[action.input.dbKey] = {
          ...dialogRecords[action.input.dbKey],
          ...action.input.changes,
        };
        return {
          unwrap: async () => ({ ...dialogRecords[action.input.dbKey] }),
        };
      }
      if (action.kind === "deductBalance") {
        return { unwrap: async () => undefined };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const getState = () =>
      ({
        auth: {
          currentUser: { userId: "user-1", username: "tester" },
        },
        dbRecords: { ...dialogRecords },
      }) as any;

    // Test with usageRecord where callId is undefined, but usage.provider_call_id is present
    await updateTokensAction(
      {
        dialogId: "dialog-fallback-callid",
        dialogKey,
        usageRecord: {
          callId: undefined as any,
          usage: {
            input_tokens: 40,
            output_tokens: 20,
            provider_call_id: providerCallId,
          },
        },
        agentConfig: {
          id: "agent-1",
          provider: "deepseek",
          model: "deepseek-v4-flash",
        },
      },
      { dispatch, getState } as any
    );

    // Verify saveTokenRecord received the recovered callId as 4th parameter
    expect(saveTokenRecordMock).toHaveBeenCalled();
    const lastCall = (saveTokenRecordMock.mock.calls as any[])[saveTokenRecordMock.mock.calls.length - 1];
    expect(lastCall[3]).toBe(providerCallId);
  });
});
