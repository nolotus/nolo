import { afterEach, describe, expect, it, mock } from "bun:test";
import { dispatchStreamEndBilling } from "chat/messages/messageStreamEndBillingDispatch";
import { resolveStreamEndPostWritePolicy } from "chat/messages/messageStreamEndPostWritePolicy";

const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realMessageSlice = { ...(await import("chat/messages/messageSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };

let moduleVersion = 0;

const hasReportedUsage = (usage: unknown) =>
  !!usage &&
  typeof usage === "object" &&
  (["prompt_tokens", "completion_tokens", "total_tokens", "input_tokens", "output_tokens"].some((field) =>
    Object.prototype.hasOwnProperty.call(usage, field)
  ) ||
    (Object.prototype.hasOwnProperty.call(usage, "cost") && typeof (usage as { cost?: unknown }).cost === "number"));

const loadNativeRequest = async ({
  usage,
  terminal = "abort",
}: {
  usage?: Record<string, unknown>;
  terminal?: "abort" | "done";
}) => {
  const streamEndPayloads: any[] = [];
  const updateTokensAction = mock((payload: any) => ({ type: "updateTokens", payload }));
  const billingDispatch = mock(() => ({ unwrap: async () => undefined }));

  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    addActiveController: (payload: any) => ({ type: "addActiveController", payload }),
    removeActiveController: (payload: any) => ({ type: "removeActiveController", payload }),
  }));
  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    messageStreaming: (payload: any) => ({ type: "messageStreaming", payload }),
    messageStreamEnd: async (payload: any) => {
      const billingMode = resolveStreamEndPostWritePolicy({
        hasReportedUsage: hasReportedUsage(payload.totalUsage),
        billingFailed: payload.billingFailed,
        skipBilling: payload.skipBilling,
        agentProvider: payload.agentConfig?.provider,
        titleEligible: false,
        textContent: "",
        toolCalls: payload.toolCalls,
      }).billingMode;
      await dispatchStreamEndBilling({
        dispatch: billingDispatch,
        updateTokensAction,
        billingMode,
        billedUsage: payload.totalUsage,
        billedEstimatedUsage: { input_tokens: 1, output_tokens: 1 },
        dialogId: payload.dialogId,
        dialogKey: payload.dialogKey,
        agentConfig: payload.agentConfig,
      });
      streamEndPayloads.push({ ...payload, billingMode });
      return payload;
    },
  }));
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://current-server.test",
  }));
  mock.module("./fetchUtils", () => ({
    performSSEFetchRequest: ({ onChunk, onError }: any) => {
      queueMicrotask(async () => {
        if (usage) onChunk(`data: ${JSON.stringify({ usage })}\n\n`);
        const error = new Error(terminal === "done" ? "[DONE]" : "User abort");
        if (terminal === "abort") error.name = "AbortError";
        await onError(error);
      });
      return () => {};
    },
  }));

  const module = await import(
    `./sendOpenAICompletionsRequest.native.ts?abort-behavior=${moduleVersion++}`
  );
  return { sendOpenAICompletionsRequest: module.sendOpenAICompletionsRequest, streamEndPayloads, updateTokensAction };
};

const thunkApi = () => {
  const state = {};
  return {
    dispatch: (action: any) => action,
    getState: () => state,
    signal: new AbortController().signal,
  };
};

describe("native sendOpenAICompletionsRequest user-abort billing", () => {
  afterEach(() => {
    mock.restore();
    mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
    mock.module("chat/messages/messageSlice", () => realMessageSlice);
    mock.module("app/settings/settingSlice", () => realSettingSlice);
  });

  it("marks provider_call_id-only usage followed by AbortError to skip billing", async () => {
    const { sendOpenAICompletionsRequest, streamEndPayloads } = await loadNativeRequest({
      usage: { provider_call_id: "pcall-native-abort-only" },
    });

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: { dbKey: "agent-gpt-4o", provider: "openrouter", model: "openai/gpt-4o" },
      thunkApi: thunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(streamEndPayloads.at(-1)).toMatchObject({
      totalUsage: { provider_call_id: "pcall-native-abort-only" },
      billingFailed: false,
      skipBilling: true,
    });
  });

  it("retains billing after AbortError when provider usage was observed", async () => {
    const { sendOpenAICompletionsRequest, streamEndPayloads } = await loadNativeRequest({
      usage: {
        provider_call_id: "pcall-native-abort-used",
        prompt_tokens: 3,
        completion_tokens: 1,
      },
    });

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: { dbKey: "agent-gpt-4o", provider: "openrouter", model: "openai/gpt-4o" },
      thunkApi: thunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(streamEndPayloads.at(-1)).toMatchObject({
      billingFailed: false,
      skipBilling: false,
    });
  });

  it("marks a clean empty EOF as failed and skips token billing", async () => {
    const { sendOpenAICompletionsRequest, streamEndPayloads, updateTokensAction } = await loadNativeRequest({
      terminal: "done",
    });

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: { dbKey: "agent-gpt-4o", provider: "openrouter", model: "openai/gpt-4o" },
      thunkApi: thunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(streamEndPayloads.at(-1)).toMatchObject({
      billingFailed: true,
      skipBilling: false,
      billingMode: "skip",
    });
    expect(updateTokensAction).not.toHaveBeenCalled();
  });

  it("treats provider-call metadata on an empty EOF as unreported and skips billing", async () => {
    const { sendOpenAICompletionsRequest, streamEndPayloads, updateTokensAction } = await loadNativeRequest({
      usage: { provider_call_id: "pcall-native-empty-metadata" },
      terminal: "done",
    });

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: { dbKey: "agent-gpt-4o", provider: "openrouter", model: "openai/gpt-4o" },
      thunkApi: thunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(streamEndPayloads.at(-1)).toMatchObject({
      totalUsage: { provider_call_id: "pcall-native-empty-metadata" },
      billingFailed: true,
      billingMode: "skip",
    });
    expect(updateTokensAction).not.toHaveBeenCalled();
  });
});
