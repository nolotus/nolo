import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realMessageSlice = { ...(await import("chat/messages/messageSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realSpaceSlice = { ...(await import("create/space/spaceSlice")) };
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/messages/messageSlice", () => realMessageSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("create/space/spaceSlice", () => realSpaceSlice);
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
};

// 把一个 Promise/值包装成 redux-thunk 风格的结果对象（带 .unwrap()）。
// dispatch(handleToolCalls({...})) 在真实环境返回带 unwrap 的 thunk 结果；
// 测试里 handleToolCalls 被 mock 成 async 函数，dispatch 收到的是 Promise。
const makeThunkResult = (result: any) => {
  const thenable =
    result && typeof result.then === "function"
      ? result
      : Promise.resolve(result);
  const wrapper: any = (onFulfilled?: any, onRejected?: any) =>
    thenable.then(onFulfilled, onRejected);
  wrapper.then = (onFulfilled?: any, onRejected?: any) =>
    thenable.then(onFulfilled, onRejected);
  wrapper.catch = (onRejected?: any) => thenable.catch(onRejected);
  wrapper.unwrap = async () => {
    const value = await thenable;
    if (value && typeof value === "object" && "error" in value && value.error) {
      throw value.payload ?? value;
    }
    return value;
  };
  return wrapper;
};

const loadModule = async () => {
  const handleToolCallsArgs: any[] = [];
  const streamEndPayloads: any[] = [];
  const dispatchedActions: any[] = [];

  // 这些变量必须先于 fetchUtils 的 mock.module 工厂声明，
  // 工厂闭包通过引用捕获它们（performFetchRequest 写入 capturedBodyData）。
  let capturedBodyData: any = null;
  let fetchResponse: Response = new Response("", {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });

  // handleToolCalls mock：记录入参，返回真实 thunk 的返回结构
  // （finalContentBuffer / hasHandedOff / hasPendingInteraction）
  const handleToolCallsMock = async (args: any) => {
    handleToolCallsArgs.push(args);
    return {
      finalContentBuffer: args.currentContentBuffer ?? [],
      hasHandedOff: false,
      hasPendingInteraction: false,
    };
  };

  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    addActiveController: (payload: any) => ({ type: "dialog/addActiveController", payload }),
    removeActiveController: (payload: any) => ({ type: "dialog/removeActiveController", payload }),
    tokenUsageLiveUpdate: (payload: any) => ({ type: "dialog/tokenUsageLiveUpdate", payload }),
  }));

  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    messageStreaming: (payload: any) => ({ type: "message/messageStreaming", payload }),
    messageStreamEnd: (payload: any) => {
      streamEndPayloads.push(payload);
      return Promise.resolve(payload);
    },
    addToolMessage: (payload: any) => {
      dispatchedActions.push({ type: "message/addToolMessage", payload });
      return { type: "message/addToolMessage", payload };
    },
    updateToolMessage: (payload: any) => ({ type: "message/updateToolMessage", payload }),
  }));

  mock.module("chat/messages/toolThunks", () => ({
    handleToolCalls: handleToolCallsMock,
  }));

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    // 真实 write 是 createAsyncThunk（action type 为 db/write/pending 等，
    // 且会触碰 db extra）。这里 mock 成普通 action creator，让测试 dispatch
    // 能以 { type: "db/write", payload } 形式捕获落库意图。
    write: (payload: any) => ({ type: "db/write", payload }),
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://current-server.test",
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
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
      return fetchResponse;
    },
  }));
  mock.module("../tools/prepareTools", () => ({
    prepareTools: () => [
      {
        type: "function",
        function: {
          name: "appDeploy",
          arguments: "{}",
          parameters: { type: "object", properties: {} },
        },
      },
    ],
  }));

  const module = await import(
    `./sendOpenAICompletionsRequest.ts?guardA=${moduleVersion++}`
  );

  const createThunkApi = () => {
    const state = {};
    const dispatch = (value: any) => {
      if (typeof value === "function") {
        // redux thunk: invoke and wrap result with .unwrap()
        const result = value(dispatch, () => state, undefined);
        return makeThunkResult(result);
      }
      // 非函数（如已被 mock 成 async 函数的 handleToolCalls 直接调用结果，
      // 或 action 对象）
      if (value && typeof value.then === "function") {
        return makeThunkResult(value);
      }
      dispatchedActions.push(value);
      if (value?.type === "db/write") return Promise.resolve({ ok: true });
      return value;
    };
    return { dispatch, getState: () => state, signal: new AbortController().signal };
  };

  return {
    ...module,
    createThunkApi,
    getHandleToolCallsArgs: () => handleToolCallsArgs,
    getStreamEndPayloads: () => streamEndPayloads,
    getDispatchedActions: () => dispatchedActions,
    getCapturedBodyData: () => capturedBodyData,
    setFetchResponse: (r: Response) => {
      fetchResponse = r;
    },
  };
};

describe("sendOpenAICompletionsRequest - tool call arguments guard (Guard A + B)", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("Guard A: a truncated tool_call arguments is NOT executed, replaced with valid JSON, and a self-heal tool result is persisted", async () => {
    const ctx = await loadModule();
    const { sendOpenAICompletionsRequest, setFetchResponse } = ctx;

    const encoder = new TextEncoder();
    // 模拟 appDeploy 被截断：arguments 是无法 JSON.parse 的片段
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "call_truncated",
                        type: "function",
                        function: {
                          name: "appDeploy",
                          arguments: '{"name":"x","files":[{"na',
                        },
                      },
                    ],
                  },
                },
              ],
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [{ delta: {}, finish_reason: "tool_calls" }],
            })}\n\n`
          )
        );
        controller.close();
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "deploy it" }],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-appbuilder",
        provider: "openrouter",
        model: "openai/gpt-4o",
        tools: ["appDeploy"],
      },
      thunkApi: ctx.createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    // A) 该工具不被执行：handleToolCalls 不应收到被截断的 call
    const handleArgs = ctx.getHandleToolCallsArgs();
    const allAccumulated = handleArgs.flatMap((a: any) => a.accumulatedCalls);
    expect(allAccumulated).toHaveLength(0);
    expect(
      allAccumulated.some((c: any) => c?.function?.name === "appDeploy")
    ).toBe(false);

    // A) 持久化的 assistant 消息中该 call 的 arguments 被替换为可 JSON.parse 的合法字符串
    const finalPayload = ctx.getStreamEndPayloads().at(-1);
    expect(finalPayload).toBeDefined();
    const toolCalls = finalPayload?.toolCalls ?? [];
    expect(toolCalls).toHaveLength(1);
    const replacedArgs = toolCalls[0].function.arguments;
    expect(() => JSON.parse(replacedArgs)).not.toThrow();
    const parsed = JSON.parse(replacedArgs);
    expect(parsed._invalid).toBe(true);
    expect(parsed._reason).toContain("truncated");

    // A) 追加了一条对应 call_id 的自愈 tool 结果消息（addToolMessage + db/write）
    const dispatched = ctx.getDispatchedActions();
    const addToolActions = dispatched.filter(
      (a: any) => a?.type === "message/addToolMessage"
    );
    expect(addToolActions.length).toBeGreaterThanOrEqual(1);
    const healMsg = addToolActions.find(
      (a: any) => a.payload?.role === "tool" && a.payload?.toolCallId === "call_truncated"
    );
    expect(healMsg).toBeDefined();
    const healContent = JSON.parse(healMsg.payload.content);
    expect(healContent.error).toBe(true);
    expect(healContent.message).toContain("appFileWrite");
    // 同步落库：db/write 一条 MSG
    const writes = dispatched.filter((a: any) => a?.type === "db/write");
    // DataType.MSG 的枚举值是 "msg"
    expect(writes.some((w: any) => w.payload?.data?.type === "msg")).toBe(true);
  });

  it("Guard A: in the same turn, valid tool calls are still executed alongside the invalid one", async () => {
    const ctx = await loadModule();
    const { sendOpenAICompletionsRequest, setFetchResponse } = ctx;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // 两个 tool call：一个合法，一个被截断
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "call_valid",
                        type: "function",
                        function: {
                          name: "appFileWrite",
                          arguments: '{"path":"/a.ts","content":"x"}',
                        },
                      },
                      {
                        index: 1,
                        id: "call_bad",
                        type: "function",
                        function: {
                          name: "appDeploy",
                          arguments: '{"name":"x","files":[{"na',
                        },
                      },
                    ],
                  },
                },
              ],
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [{ delta: {}, finish_reason: "tool_calls" }],
            })}\n\n`
          )
        );
        controller.close();
      },
    });
    setFetchResponse(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    await sendOpenAICompletionsRequest({
      bodyData: { model: "openai/gpt-4o", messages: [{ role: "user", content: "go" }], stream: true },
      agentConfig: {
        dbKey: "agent-appbuilder",
        provider: "openrouter",
        model: "openai/gpt-4o",
        tools: ["appDeploy", "appFileWrite"],
      },
      thunkApi: ctx.createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    // 合法 call 被执行
    const handleArgs = ctx.getHandleToolCallsArgs();
    const executed = handleArgs.flatMap((a: any) => a.accumulatedCalls);
    expect(executed).toHaveLength(1);
    expect(executed[0].function.name).toBe("appFileWrite");
    expect(executed[0].id).toBe("call_valid");

    // 持久化 assistant 消息保留两个 call，且两者 arguments 都可 parse
    const finalPayload = ctx.getStreamEndPayloads().at(-1);
    const toolCalls = finalPayload?.toolCalls ?? [];
    expect(toolCalls).toHaveLength(2);
    for (const tc of toolCalls) {
      expect(() => JSON.parse(tc.function.arguments)).not.toThrow();
    }
    const bad = toolCalls.find((t: any) => t.id === "call_bad");
    expect(JSON.parse(bad.function.arguments)._invalid).toBe(true);
  });

  it("Guard B: outbound request body sanitizes truncated tool_calls arguments from history", async () => {
    const ctx = await loadModule();
    const { sendOpenAICompletionsRequest, setFetchResponse } = ctx;

    // 一个空的 200 流（本次请求只是触发出站 body 组装）
    setFetchResponse(
      new Response(new ReadableStream<Uint8Array>({
        start(controller) { controller.close(); },
      }), { status: 200, headers: { "Content-Type": "text/event-stream" } })
    );

    await sendOpenAICompletionsRequest({
      bodyData: {
        model: "openai/gpt-4o",
        messages: [
          { role: "user", content: "deploy" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_hist_bad",
                type: "function",
                function: {
                  name: "appDeploy",
                  arguments: '{"name":"x","files":[{"na',
                },
              },
            ],
          },
          // 历史里就缺配对的 tool 结果（截断场景常见）
        ],
        stream: true,
      },
      agentConfig: {
        dbKey: "agent-appbuilder",
        provider: "openrouter",
        model: "openai/gpt-4o",
        tools: ["appDeploy"],
      },
      thunkApi: ctx.createThunkApi(),
      dialogKey: "dialog-user-1-dialog-1",
    });

    const body = ctx.getCapturedBodyData();
    expect(body).toBeDefined();
    // B) 出站 body 中所有 tool_calls arguments 均可 JSON.parse
    for (const msg of body.messages) {
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          expect(() => JSON.parse(tc.function.arguments)).not.toThrow();
        }
      }
    }
    const assistant = body.messages.find((m: any) => m.role === "assistant");
    expect(assistant.tool_calls[0].function.arguments).toBe('{"_invalid":true}');
    // B) 为缺配对结果的 tool_call 补了占位 tool 消息
    const placeholder = body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call_hist_bad"
    );
    expect(placeholder).toBeDefined();
    expect(placeholder.content).toBe('{"error":"tool call was interrupted"}');
  });
});