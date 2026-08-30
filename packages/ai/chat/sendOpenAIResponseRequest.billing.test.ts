import { afterEach, describe, expect, it, mock } from "bun:test";
import { dispatchStreamEndBilling } from "chat/messages/messageStreamEndBillingDispatch";
import { resolveStreamEndPostWritePolicy } from "chat/messages/messageStreamEndPostWritePolicy";

const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realMessageSlice = { ...(await import("chat/messages/messageSlice")) };

let moduleVersion = 0;

const hasReportedUsage = (usage: unknown) =>
  !!usage &&
  typeof usage === "object" &&
  (["prompt_tokens", "completion_tokens", "total_tokens", "input_tokens", "output_tokens"].some((field) =>
    Object.prototype.hasOwnProperty.call(usage, field)
  ) ||
    (Object.prototype.hasOwnProperty.call(usage, "cost") && typeof (usage as { cost?: unknown }).cost === "number"));

const loadRequest = async (fetchImpl: () => Promise<Response>) => {
  const streamEndPayloads: any[] = [];
  const updateTokensAction = mock((payload: any) => ({ type: "updateTokens", payload }));
  const billingDispatch = mock(() => ({ unwrap: async () => undefined }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    addActiveController: (payload: any) => ({ type: "addActiveController", payload }),
    removeActiveController: (payload: any) => ({ type: "removeActiveController", payload }),
    tokenUsageLiveUpdate: (payload: any) => ({ type: "tokenUsageLiveUpdate", payload }),
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
  mock.module("chat/messages/toolThunks", () => ({
    handleToolCalls: async () => ({ finalContentBuffer: [], hasHandedOff: false, hasPendingInteraction: false }),
  }));
  mock.module("app/stateViews/runtime", () => ({ selectRuntimeCurrentServer: () => "http://server.test" }));
  mock.module("identity/selectors", () => ({ selectIdentityToken: () => "token-test" }));
  mock.module("core/prefix", () => ({ extractCustomId: () => "dialog-1" }));
  mock.module("./fetchUtils", () => ({ performFetchRequest: fetchImpl }));
  mock.module("../tools/prepareTools", () => ({ prepareTools: () => [] }));

  const module = await import(`./sendOpenAIResponseRequest.ts?billing=${moduleVersion++}`);
  return {
    send: module.sendOpenAIResponseRequest,
    final: () => streamEndPayloads.at(-1),
    updateTokensAction,
  };
};

const thunkApi = () => {
  const state = {};
  return {
    dispatch: (action: any) => action,
    getState: () => state,
    signal: new AbortController().signal,
  };
};

const requestArgs = (send: any) =>
  send({
    bodyData: { model: "gpt-4o-mini", input: [{ role: "user", content: "hi" }] },
    agentConfig: { dbKey: "agent-1", provider: "openai", model: "gpt-4o-mini" },
    thunkApi: thunkApi(),
    dialogKey: "dialog-user-1-dialog-1",
  });

const streamResponse = (events: unknown[], terminalError?: Error) => {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(events[index++])}\n\n`));
        return;
      }
      if (terminalError) controller.error(terminalError);
      else controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
};

describe("sendOpenAIResponseRequest billing terminal semantics", () => {
  afterEach(() => mock.restore());

  it("marks HTTP and SSE upstream errors as failed billing", async () => {
    const http = await loadRequest(async () => new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 }));
    await requestArgs(http.send);
    expect(http.final()).toMatchObject({ billingFailed: true, skipBilling: false });

    const sse = await loadRequest(async () => streamResponse([{ type: "error", error: { message: "socket failed" } }]));
    await requestArgs(sse.send);
    expect(sse.final()).toMatchObject({ billingFailed: true, skipBilling: false });
  });

  it("marks Responses failed and incomplete terminal frames as failed billing", async () => {
    for (const event of [
      { type: "response.failed", response: { error: { message: "provider failed" }, usage: { input_tokens: 4 } } },
      { type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" }, usage: { output_tokens: 4 } } },
    ]) {
      const loaded = await loadRequest(async () => streamResponse([event]));
      await requestArgs(loaded.send);
      expect(loaded.final()).toMatchObject({ billingFailed: true, skipBilling: false });
    }
  });

  it("marks transport failures as failed billing", async () => {
    const loaded = await loadRequest(async () => {
      throw new Error("connection reset");
    });
    await requestArgs(loaded.send);
    expect(loaded.final()).toMatchObject({ billingFailed: true, skipBilling: false });
  });

  it("skips only an abort without observed token/cost usage", async () => {
    const abort = new Error("cancelled");
    abort.name = "AbortError";
    const noUsage = await loadRequest(async () => {
      throw abort;
    });
    await requestArgs(noUsage.send);
    expect(noUsage.final()).toMatchObject({ billingFailed: false, skipBilling: true });

    const usageAbort = new Error("cancelled");
    usageAbort.name = "AbortError";
    const withUsage = await loadRequest(async () =>
      streamResponse([{ usage: { provider_call_id: "call-only" } }, { usage: { input_tokens: 7, provider_call_id: "call-usage" } }], usageAbort),
    );
    await requestArgs(withUsage.send);
    expect(withUsage.final()).toMatchObject({ billingFailed: false, skipBilling: false });
  });

  it("skips billing for a clean EOF with no visible output, tool call, or usage", async () => {
    const loaded = await loadRequest(async () =>
      streamResponse([{ type: "response.completed", response: { status: "completed" } }]),
    );

    await requestArgs(loaded.send);

    expect(loaded.final()).toMatchObject({
      billingFailed: true,
      skipBilling: false,
      billingMode: "skip",
    });
    expect(loaded.updateTokensAction).not.toHaveBeenCalled();
  });

  it("treats provider-call metadata on an empty EOF as unreported and skips billing", async () => {
    const loaded = await loadRequest(async () =>
      streamResponse([
        { usage: { provider_call_id: "pcall-responses-empty-metadata" } },
        { type: "response.completed", response: { status: "completed" } },
      ]),
    );

    await requestArgs(loaded.send);

    expect(loaded.final()).toMatchObject({
      totalUsage: { provider_call_id: "pcall-responses-empty-metadata" },
      billingFailed: true,
      billingMode: "skip",
    });
    expect(loaded.updateTokensAction).not.toHaveBeenCalled();
  });

  it("retains reported billing for a no-text completed response with usage", async () => {
    const loaded = await loadRequest(async () =>
      streamResponse([
        {
          type: "response.completed",
          response: { status: "completed", usage: { input_tokens: 7, output_tokens: 0 } },
        },
      ]),
    );

    await requestArgs(loaded.send);

    expect(loaded.final()).toMatchObject({ billingFailed: false, billingMode: "reported" });
    expect(loaded.updateTokensAction).toHaveBeenCalledTimes(1);
  });
});
