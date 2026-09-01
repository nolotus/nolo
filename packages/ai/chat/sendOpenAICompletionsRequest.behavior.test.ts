import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";
import { EMPTY_ASSISTANT_REPAIR_PROMPT } from "agent-runtime/emptyAssistantRepair";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realMessageSlice = { ...(await import("chat/messages/messageSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realSpaceModule = {
  ...(await import("create/space/spaceCurrentSelectors")),
};
const realAuthSlice = { ...(await import("auth/authSlice")) };

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/messages/messageSlice", () => realMessageSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("create/space/spaceCurrentSelectors", () => realSpaceModule);
  mock.module("auth/authSlice", () => realAuthSlice);
};

afterAll(() => restoreLeakedModuleMocks());

const loadSendOpenAICompletionsRequest = async () => {
  let capturedBodyData: any = null;
  const capturedBodies: any[] = [];
  let fetchResponse: Response = new Response("", {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
  const fetchResponseQueue: Response[] = [];
  const streamEndPayloads: any[] = [];

  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    addActiveController: (payload: any) => ({
      type: "addActiveController",
      payload,
    }),
    removeActiveController: (payload: any) => ({
      type: "removeActiveController",
      payload,
    }),
    tokenUsageLiveUpdate: (payload: any) => ({
      type: "tokenUsageLiveUpdate",
      payload,
    }),
  }));

  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    messageStreaming: (payload: any) => ({ type: "messageStreaming", payload }),
    messageStreamEnd: (payload: any) => {
      streamEndPayloads.push(payload);
      return Promise.resolve(payload);
    },
  }));

  mock.module("chat/messages/toolThunks", () => ({
    handleToolCalls: async (state: any) => ({
      state,
      hasHandedOff: false,
      hasPendingInteraction: false,
    }),
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://current-server.test",
  }));

  mock.module("create/space/spaceCurrentSelectors", () => ({
    ...realSpaceModule,
    selectCurrentSpaceId: () => null,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "token-test",
  }));

  mock.module("core/prefix", () => ({
    extractCustomId: () => "dialog-1",
  }));

  mock.module("./fetchUtils", () => ({
    performFetchRequest: async ({ bodyData }: any) => {
      capturedBodyData = bodyData;
      capturedBodies.push(bodyData);
      return fetchResponseQueue.length > 0
        ? fetchResponseQueue.shift()!
        : fetchResponse;
    },
  }));

  mock.module("../tools/prepareTools", () => ({
    prepareTools: () => [
      {
        type: "function",
        function: {
          name: "ask_user",
          arguments: "{}",
          parameters: { type: "object", properties: {} },
        },
      },
    ],
  }));

  const module = await import(
    `./sendOpenAICompletionsRequest.ts?behavior=${moduleVersion++}`
  );
  return {
    ...module,
    getCapturedBodyData: () => capturedBodyData,
    getCapturedBodies: () => capturedBodies,
    getStreamEndPayloads: () => streamEndPayloads,
    setFetchResponse: (response: Response) => {
      fetchResponse = response;
    },
    queueFetchResponses: (responses: Response[]) => {
      fetchResponseQueue.push(...responses);
    },
  };
};

const createThunkApi = () => {
  const state = {};
  const dispatchedActions: any[] = [];
  const dispatch = (value: any) => {
    if (typeof value === "function") {
      return value(dispatch, () => state, undefined);
    }
    dispatchedActions.push(value);
    return value;
  };

  return {
    dispatch,
    getState: () => state,
    signal: new AbortController().signal,
    dispatchedActions,
  };
};

describe("sendOpenAICompletionsRequest", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("omits tools for image-output agents even when the model is not in the registry", async () => {
    const { sendOpenAICompletionsRequest, getCapturedBodyData } =
      await loadSendOpenAICompletionsRequest();

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "black-forest-labs/flux.2-klein-4b",
        messages: [],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-flux",
        provider: "openrouter",
        model: "black-forest-labs/flux.2-klein-4b",
        useServerProxy: true,
        tools: ["ask_user"],
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(getCapturedBodyData()).not.toHaveProperty("tools");
    expect(getCapturedBodyData()).not.toHaveProperty("tool_choice");
  });

  it("persists provider error details when a streamed choice finishes with error", async () => {
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [
                {
                  delta: {},
                  finish_reason: "error",
                  error: {
                    message:
                      "Image input is not supported by this upstream provider",
                  },
                },
              ],
            })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "minimax/minimax-m3",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "这是什么" },
              {
                type: "image_url",
                image_url: { url: "https://example.com/a.png" },
              },
            ],
          },
        ],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-minimax-m3",
        provider: "openrouter",
        model: "minimax/minimax-m3",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalText = getStreamEndPayloads()
      .at(-1)
      ?.finalContentBuffer?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain(
      "Image input is not supported by this upstream provider",
    );
    expect(finalText).not.toBe("\n[流结束原因: error]");
  });

  it("persists a clear API error when a streamed choice finishes with error without details", async () => {
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [
                {
                  index: 0,
                  delta: { content: "", role: "assistant" },
                  finish_reason: "error",
                },
              ],
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "minimax/minimax-m3",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "这是什么" },
              {
                type: "image_url",
                image_url: { url: "https://example.com/a.png" },
              },
            ],
          },
        ],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-minimax-m3",
        provider: "openrouter",
        model: "minimax/minimax-m3",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalText = getStreamEndPayloads()
      .at(-1)
      ?.finalContentBuffer?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain("模型响应以 error 结束");
    expect(finalText).not.toBe("\n[流结束原因: error]");
  });

  it("marks an empty upstream stream (200 + no deltas) as an error instead of persisting a silent empty message", async () => {
    // 线上事故形态:上游 142ms 内返回 200,流里没有任何 delta/usage 就关闭。
    // 之前会把空消息按"正常说完"落库,UI 只能显示误导性的网络兜底文案。
    // 空轮自动重试落地后:第一次空流会注入 repair prompt 重试一次,
    // 第二次仍空才走错误路径——这里给两次空流,断言最终错误语义不变。
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      queueFetchResponses,
    } = await loadSendOpenAICompletionsRequest();
    const buildEmpty = () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };
    queueFetchResponses([buildEmpty(), buildEmpty()]);

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "你做一个我看看" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-pub-01DSV4PROPUB00000001A9OLZN",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    expect(finalPayload).toBeDefined();
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain("空响应");
    expect(finalPayload?.messageMetadata?.metadata?.error).toBe(true);
  });

  const buildEmptyStreamResponse = () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  const buildContentStreamResponse = (text: string) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  it("retries once with a repair prompt when the stream completes empty, then succeeds", async () => {
    // 空轮自动重试(与 agent-runtime localLoop / server loop 语义对齐):
    // 第一次空流 → 注入 repair prompt 重发一次 → 第二次有内容 → 正常结束。
    const {
      sendOpenAICompletionsRequest,
      getCapturedBodies,
      getStreamEndPayloads,
      queueFetchResponses,
    } = await loadSendOpenAICompletionsRequest();
    queueFetchResponses([
      buildEmptyStreamResponse(),
      buildContentStreamResponse("重试后的正文"),
    ]);

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "写个总结" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-pub-01DSV4PROPUB00000001A9OLZN",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const bodies = getCapturedBodies();
    expect(bodies.length).toBe(2);
    const retryMessages = bodies[1]?.messages ?? [];
    const lastMessage = retryMessages.at(-1);
    // The repair prompt goes in as `user`, not `system`. A trailing system
    // message is exactly what provoked the empty assistant turn this retry
    // exists to recover from — see 99c8c1b9c, which changed the role and left
    // this assertion behind.
    expect(lastMessage?.role).toBe("user");
    // Assert against the exported constant, not a snippet of its wording. The
    // previous substring check drifted the moment the prompt was reworded, which
    // is how this test came to be testing nothing at all.
    expect(lastMessage?.content).toBe(EMPTY_ASSISTANT_REPAIR_PROMPT);

    const finalPayload = getStreamEndPayloads().at(-1);
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain("重试后的正文");
    expect(finalPayload?.messageMetadata?.metadata?.error).not.toBe(true);
  });

  it("marks error after exactly one retry when both attempts return empty streams", async () => {
    // 两次都空:只重试一次(共 2 次请求),然后走既有空响应错误路径。
    const {
      sendOpenAICompletionsRequest,
      getCapturedBodies,
      getStreamEndPayloads,
      queueFetchResponses,
    } = await loadSendOpenAICompletionsRequest();
    queueFetchResponses([
      buildEmptyStreamResponse(),
      buildEmptyStreamResponse(),
      buildContentStreamResponse("不该被用到"),
    ]);

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "写个总结" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-pub-01DSV4PROPUB00000001A9OLZN",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    expect(getCapturedBodies().length).toBe(2);
    const finalPayload = getStreamEndPayloads().at(-1);
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain("空响应");
    expect(finalPayload?.messageMetadata?.metadata?.error).toBe(true);
  });

  it("does not flag a normal completion that streamed visible content", async () => {
    // 对照组:正常有内容的流不受空流守卫影响。
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [{ delta: { content: "hello" }, finish_reason: "stop" }],
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "hi" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-pub-01DSV4PROPUB00000001A9OLZN",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toBe("hello");
    expect(finalPayload?.messageMetadata?.metadata?.error).toBeUndefined();
  });

  it("marks the message with an error flag when the stream is interrupted mid-read (truncation), not as a normal completion", async () => {
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    // 第一次读取吐一段正常文本,第二次读取抛错 ——
    // 等价于流读取超时 / 连接被静默中断导致的截断。
    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!pulled) {
          pulled = true;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                choices: [{ delta: { content: "partial" } }],
              })}\n\n`,
            ),
          );
          return;
        }
        // 模拟 reader.read() 抛出(例如 STREAM_READ_TIMEOUT_MS 超时)
        controller.error(new Error("模型响应流 45 秒内没有返回新内容"));
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-gpt-4o",
        provider: "openrouter",
        model: "openai/gpt-4o",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    expect(finalPayload).toBeDefined();
    // 截断内容应当保留,并附带错误说明。
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    expect(finalText).toContain("partial");
    expect(finalText).toContain("错误");
    // 关键:走的是"异常终止"语义 —— 持久化元数据带 error 标记,
    // 而不是当成正常完成静默落库。
    expect(finalPayload?.messageMetadata?.metadata?.error).toBe(true);
  });

  it("keeps the user-interrupt (AbortError) path without the truncation error flag", async () => {
    // 对照组:用户主动中断(AbortError)不算截断 —— 维持原行为,
    // 不应当打上 metadata.error 标记(只有超时 / 连接中断才标记)。
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!pulled) {
          pulled = true;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                choices: [{ delta: { content: "partial" } }],
              })}\n\n`,
            ),
          );
          return;
        }
        // 用户主动中断:抛出 AbortError。
        const err = new Error("The user aborted a request.");
        err.name = "AbortError";
        controller.error(err);
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-gpt-4o",
        provider: "openrouter",
        model: "openai/gpt-4o",
        useServerProxy: true,
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    expect(finalPayload).toBeDefined();
    const finalText = finalPayload?.finalContentBuffer
      ?.map((part: any) => part.text ?? "")
      .join("");
    // 用户中断显示原来的中断文案,且不携带截断错误标记。
    expect(finalText).toContain("[用户中断]");
    expect(finalPayload?.messageMetadata?.metadata?.error).toBeUndefined();
  });

  it("marks an immediate user AbortError with provider_call_id-only usage to skip billing", async () => {
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!pulled) {
          pulled = true;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ usage: { provider_call_id: "pcall-abort-only" } })}\n\n`,
            ),
          );
          return;
        }
        const error = new Error("User abort");
        error.name = "AbortError";
        controller.error(error);
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: {
        dbKey: "agent-gpt-4o",
        provider: "openrouter",
        model: "openai/gpt-4o",
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    expect(finalPayload?.totalUsage).toEqual({
      provider_call_id: "pcall-abort-only",
    });
    expect(finalPayload?.billingFailed).toBe(false);
    expect(finalPayload?.skipBilling).toBe(true);
  });

  it("keeps billing enabled after a user AbortError with observed provider usage", async () => {
    const {
      sendOpenAICompletionsRequest,
      getStreamEndPayloads,
      setFetchResponse,
    } = await loadSendOpenAICompletionsRequest();
    const encoder = new TextEncoder();
    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!pulled) {
          pulled = true;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ usage: { provider_call_id: "pcall-abort-used", prompt_tokens: 3, completion_tokens: 1 } })}\n\n`,
            ),
          );
          return;
        }
        const error = new Error("User abort");
        error.name = "AbortError";
        controller.error(error);
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
      agentConfig: {
        dbKey: "agent-gpt-4o",
        provider: "openrouter",
        model: "openai/gpt-4o",
      },
      thunkApi: createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const finalPayload = getStreamEndPayloads().at(-1);
    expect(finalPayload?.billingFailed).toBe(false);
    expect(finalPayload?.skipBilling).toBe(false);
  });

  describe("stream throttling behavior", () => {
    it("batches multiple text deltas within one throttling period", async () => {
      const { sendOpenAICompletionsRequest, setFetchResponse } =
        await loadSendOpenAICompletionsRequest();
      const encoder = new TextEncoder();

      const scheduledCallbacks: Array<() => void> = [];
      const customSchedule = (cb: () => void) => {
        scheduledCallbacks.push(cb);
        return scheduledCallbacks.length;
      };

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: "Hello " } }] })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: "world" } }] })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: "!" } }] })}\n\n`,
            ),
          );
          controller.close();
        },
      });

      setFetchResponse(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const thunkApi = createThunkApi();

      await sendOpenAICompletionsRequest({
        bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
        agentConfig: {
          dbKey: "agent-gpt-4o",
          provider: "openrouter",
          model: "openai/gpt-4o",
        },
        thunkApi,
        dialogKey: "dialog-user-1-dialog-1",
        streamThrottlerOptions: {
          schedule: customSchedule,
          cancel: () => {},
        },
      });

      const streamingActions = thunkApi.dispatchedActions.filter(
        (a) => a.type === "messageStreaming",
      );

      // 初始有一条 content="" 的占位,其后在流正常结束 done flush 时进行最终提交
      expect(streamingActions.length).toBeGreaterThan(0);
      const finalStreaming = streamingActions.at(-1);
      const contentText = finalStreaming?.payload?.content
        ?.map((c: any) => c.text ?? "")
        .join("");
      expect(contentText).toBe("Hello world!");
    });

    it("flushes remaining buffered text on stream end ([DONE] / done=true)", async () => {
      const { sendOpenAICompletionsRequest, setFetchResponse } =
        await loadSendOpenAICompletionsRequest();
      const encoder = new TextEncoder();

      const scheduledCallbacks: Array<() => void> = [];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: "Final chunk" } }] })}\n\n`,
            ),
          );
          controller.close();
        },
      });

      setFetchResponse(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const thunkApi = createThunkApi();

      await sendOpenAICompletionsRequest({
        bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
        agentConfig: {
          dbKey: "agent-gpt-4o",
          provider: "openrouter",
          model: "openai/gpt-4o",
        },
        thunkApi,
        dialogKey: "dialog-user-1-dialog-1",
        streamThrottlerOptions: {
          schedule: (cb: () => void) => {
            // 不自动触发回调，测试 stream end 是否会自动 flush
            scheduledCallbacks.push(cb);
            return 1;
          },
          cancel: () => {},
        },
      });

      const streamingActions = thunkApi.dispatchedActions.filter(
        (a) => a.type === "messageStreaming",
      );
      const lastStreaming = streamingActions.at(-1);
      const text = lastStreaming?.payload?.content
        ?.map((c: any) => c.text ?? "")
        .join("");

      expect(text).toBe("Final chunk");
    });

    it("immediately flushes buffered text and does not throttle tool_calls", async () => {
      const { sendOpenAICompletionsRequest, setFetchResponse } =
        await loadSendOpenAICompletionsRequest();
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: "Calling tool... " } }] })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                choices: [
                  {
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          id: "call_123",
                          type: "function",
                          function: { name: "ask_user", arguments: "{}" },
                        },
                      ],
                    },
                    finish_reason: "tool_calls",
                  },
                ],
              })}\n\n`,
            ),
          );
          controller.close();
        },
      });

      setFetchResponse(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const thunkApi = createThunkApi();

      await sendOpenAICompletionsRequest({
        bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
        agentConfig: {
          dbKey: "agent-gpt-4o",
          provider: "openrouter",
          model: "openai/gpt-4o",
        },
        thunkApi,
        dialogKey: "dialog-user-1-dialog-1",
        streamThrottlerOptions: {
          schedule: () => 1, // 回调未手动触发
          cancel: () => {},
        },
      });

      const streamingActions = thunkApi.dispatchedActions.filter(
        (a) => a.type === "messageStreaming",
      );
      const lastStreaming = streamingActions.at(-1);
      const text = lastStreaming?.payload?.content
        ?.map((c: any) => c.text ?? "")
        .join("");

      expect(text).toBe("Calling tool... ");
    });

    it("flushes accumulated text on AbortError without error flag", async () => {
      const {
        sendOpenAICompletionsRequest,
        setFetchResponse,
        getStreamEndPayloads,
      } = await loadSendOpenAICompletionsRequest();
      const encoder = new TextEncoder();

      let pulled = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!pulled) {
            pulled = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: "Unflushed text" } }] })}\n\n`,
              ),
            );
            return;
          }
          const err = new Error("User abort");
          err.name = "AbortError";
          controller.error(err);
        },
      });

      setFetchResponse(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const thunkApi = createThunkApi();

      await sendOpenAICompletionsRequest({
        bodyData: { model: "openai/gpt-4o", messages: [], stream: true },
        agentConfig: {
          dbKey: "agent-gpt-4o",
          provider: "openrouter",
          model: "openai/gpt-4o",
        },
        thunkApi,
        dialogKey: "dialog-user-1-dialog-1",
        streamThrottlerOptions: {
          schedule: () => 1,
          cancel: () => {},
        },
      });

      const finalPayload = getStreamEndPayloads().at(-1);
      const finalText = finalPayload?.finalContentBuffer
        ?.map((part: any) => part.text ?? "")
        .join("");

      expect(finalText).toContain("Unflushed text");
      expect(finalText).toContain("[用户中断]");
      expect(finalPayload?.messageMetadata?.metadata?.error).toBeUndefined();
    });

    it("throttles reasoning/thinking deltas consistently with text deltas", async () => {
      const { sendOpenAICompletionsRequest, setFetchResponse } =
        await loadSendOpenAICompletionsRequest();
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "Thinking step 1... " } }] })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "Thinking step 2" } }] })}\n\n`,
            ),
          );
          controller.close();
        },
      });

      setFetchResponse(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const thunkApi = createThunkApi();

      await sendOpenAICompletionsRequest({
        bodyData: { model: "deepseek/deepseek-r1", messages: [], stream: true },
        agentConfig: {
          dbKey: "agent-deepseek",
          provider: "openrouter",
          model: "deepseek/deepseek-r1",
        },
        thunkApi,
        dialogKey: "dialog-user-1-dialog-1",
      });

      const streamingActions = thunkApi.dispatchedActions.filter(
        (a) => a.type === "messageStreaming",
      );
      const lastStreaming = streamingActions.at(-1);
      expect(lastStreaming?.payload?.thinkContent).toBe(
        "Thinking step 1... Thinking step 2",
      );
    });
  });
});
