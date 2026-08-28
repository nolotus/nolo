import { describe, expect, test } from "bun:test";

import {
  buildPlatformChatCompletionRequest,
  executePlatformChatCompletion,
  parsePlatformChatCompletionData,
  parsePlatformChatCompletionResponse,
  readPlatformChatSseCompletion,
  resolvePlatformChatProviderConfig,
  shouldUsePlatformChatProvider,
} from "./platformChatProvider";

function sseResponse(body: string, contentType = "text/event-stream") {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
    { headers: { "content-type": contentType } },
  );
}

describe("platform chat request timeout scope", () => {
  test("requestTimeoutMs only bounds response start — a stream longer than the timeout is not aborted", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-user-1-frontend",
        provider: "nolo",
        model: "kimi-k3",
      },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });

    // 响应头立刻到达，但 body 分三段、总时长远超 requestTimeoutMs(30ms)。
    const chunks = [
      'data: {"choices":[{"delta":{"content":"one "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"two "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"three"}}]}\n\ndata: [DONE]\n\n',
    ];
    let i = 0;
    const slowBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (i >= chunks.length) {
          controller.close();
          return;
        }
        await new Promise((r) => setTimeout(r, 40));
        controller.enqueue(new TextEncoder().encode(chunks[i]));
        i += 1;
      },
    });
    const fetchImpl = (async (_url: any, init: any) => {
      // fetch 立即 resolve（响应头到达）；abort signal 若在读 body 期间触发会让读取抛错
      const signal: AbortSignal | undefined = init?.signal;
      if (signal?.aborted) throw new Error("aborted before start");
      return new Response(slowBody, {
        headers: { "content-type": "text/event-stream" },
      });
    }) as unknown as typeof fetch;

    const deltas: string[] = [];
    const result = await executePlatformChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
      stream: true,
      requestTimeoutMs: 30,
      onTextDelta: (chunk) => deltas.push(chunk),
    });

    expect(deltas).toEqual(["one ", "two ", "three"]);
    expect(result.content).toBe("one two three");
  });

  test("requestTimeoutMs aborts when the response never starts", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-user-1-frontend",
        provider: "nolo",
        model: "deepseek-v4-pro",
      },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });

    const fetchImpl = ((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal.reason ?? new Error("aborted")),
        );
      })) as unknown as typeof fetch;

    const startedAt = Date.now();
    await expect(
      executePlatformChatCompletion({
        providerConfig,
        messages: [{ role: "user", content: "hi" }],
        fetchImpl,
        stream: true,
        requestTimeoutMs: 50,
        onTextDelta: () => {},
      }),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - startedAt).toBeLessThan(2000);
  });
});

describe("platform chat provider config", () => {
  test("normalizes custom OpenAI-compatible base URLs to chat completions endpoints", async () => {
    const config = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-custom",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
      },
      env: { NOLO_SERVER: "https://us.nolo.chat", AUTH_TOKEN: "token" },
    });

    expect(config.endpoint).toBe("https://token-plan-cn.xiaomimimo.com/v1/chat/completions");
  });

  test("keeps full custom chat completions endpoints unchanged", async () => {
    const config = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-custom",
        provider: "custom",
        model: "qwen-coder",
        customProviderUrl: "https://provider.example/v1/chat/completions",
      },
      env: { NOLO_SERVER: "https://us.nolo.chat", AUTH_TOKEN: "token" },
    });

    expect(config.endpoint).toBe("https://provider.example/v1/chat/completions");
  });

  test("preserves custom api key and header for proxy-backed custom agents", async () => {
    const config = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-custom",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        apiKey: "mimo-monthly-key",
        apiKeyHeader: "api-key",
        useServerProxy: true,
      },
      env: { NOLO_SERVER: "https://us.nolo.chat", AUTH_TOKEN: "token" },
    });

    expect(config).toMatchObject({
      endpoint: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      apiKey: "mimo-monthly-key",
      apiKeyHeader: "api-key",
      apiSource: "custom",
    });
  });

  test("does not forward raw credentials for platform agents", async () => {
    const config = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-platform",
        provider: "nolo",
        apiSource: "platform",
        model: "deepseek-v4-flash",
        apiKey: "stale-local-key",
        apiKeyHeader: "x-api-key",
      },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });

    expect(config.apiKey).toBeUndefined();
    expect(config.apiKeyHeader).toBeUndefined();

    const request = buildPlatformChatCompletionRequest({
      providerConfig: config,
      messages: [{ role: "user", content: "hello" }],
    });
    const body = JSON.parse(String(request.init.body));
    expect(body.KEY).toBeUndefined();
    expect(body.apiKeyHeader).toBeUndefined();
  });

  // Billing attribution: without dialogId the server falls back to the
  // "chat-proxy" bucket (chatProxyBilling.ts), collapsing every runtime call
  // of every user into one row in the usage report.
  test("carries dialogId into the proxy payload for billing attribution", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: { key: "agent-pub-x", provider: "nolo", model: "kimi-k2.6" },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });

    const withDialog = JSON.parse(
      String(
        buildPlatformChatCompletionRequest({
          providerConfig,
          messages: [{ role: "user", content: "hi" }],
          dialogId: "01M0ERANJR3DRKSPN5XMSS040V",
        }).init.body
      )
    );
    expect(withDialog.dialogId).toBe("01M0ERANJR3DRKSPN5XMSS040V");

    // Omitted / blank stays absent so the server keeps its own fallback.
    const withoutDialog = JSON.parse(
      String(
        buildPlatformChatCompletionRequest({
          providerConfig,
          messages: [{ role: "user", content: "hi" }],
          dialogId: "   ",
        }).init.body
      )
    );
    expect(withoutDialog.dialogId).toBeUndefined();
  });

  test("does not force platform provider when a custom provider url exists", () => {
    expect(
      shouldUsePlatformChatProvider(
        { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
        {
          key: "agent-local-custom",
          provider: "custom",
          apiSource: "custom",
          model: "qwen-3.6",
          customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
          rawRecord: { useServerProxy: true },
          useServerProxy: true,
        }
      )
    ).toBe(false);
  });

  // "mimo" is no longer a platform provider, but agents still reach MiMo via
  // customProviderUrl — the thinking-disable rule keys off that host too and
  // must keep working for them.
  test("disables thinking for custom-URL mimo requests", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-mimo",
        provider: "custom",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        model: "mimo-v2.5-pro",
      },
      env: { NOLO_SERVER: "https://us.nolo.chat", AUTH_TOKEN: "token" },
    });
    const request = buildPlatformChatCompletionRequest({
      providerConfig,
      messages: [{ role: "user", content: "use tools" }],
      tools: [{
        type: "function",
        function: {
          name: "readFile",
          parameters: { type: "object", properties: {} },
        },
      }],
    });

    // Both MiMo compatibility rules must survive the platform-provider
    // removal: thinking stays off, and the key still rides the api-key header
    // rather than Authorization.
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      provider: "custom",
      thinking: { type: "disabled" },
      apiKeyHeader: "api-key",
    });
  });

  test("builds Responses API requests for OpenAI responses endpoints", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-openai",
        provider: "openai",
        model: "gpt-5.5",
        reasoning_effort: "low",
        max_tokens: 123,
      },
      env: { NOLO_SERVER: "https://us.nolo.chat", AUTH_TOKEN: "token" },
    });
    const request = buildPlatformChatCompletionRequest({
      providerConfig,
      messages: [{ role: "user", content: "read title" }],
      tools: [{
        type: "function",
        function: {
          name: "chrome_open_tab",
          description: "Open a Chrome tab",
          parameters: { type: "object", properties: {} },
        },
      }],
    });
    const body = JSON.parse(String(request.init.body));

    expect(providerConfig.endpoint).toBe("https://api.openai.com/v1/responses");
    expect(body).toMatchObject({
      model: "gpt-5.5",
      stream: false,
      reasoning: { effort: "low" },
      max_output_tokens: 123,
      url: "https://api.openai.com/v1/responses",
      provider: "openai",
      agentKey: "agent-openai",
      input: [{
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "read title" }],
      }],
      tools: [{
        type: "function",
        name: "chrome_open_tab",
        description: "Open a Chrome tab",
        parameters: { type: "object", properties: {} },
      }],
    });
    expect(body.messages).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
  });

  test("routes hosted DeepSeek Flash through Responses wire and preserves reasoning parts", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-deepseek-flash",
        provider: "nolo",
        model: "deepseek-v4-flash",
      },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });
    const request = buildPlatformChatCompletionRequest({
      providerConfig,
      messages: [
        {
          role: "assistant",
          content: "previous answer",
          reasoning_content: "用户想要对比模型性能",
        },
        { role: "user", content: "继续" },
      ],
    });
    const body = JSON.parse(String(request.init.body));
    expect(Array.isArray(body.input)).toBe(true);
    expect(body.messages).toBeUndefined();
  });

  test("keeps DeepSeek Responses input as an array with array-form reasoning parts", () => {
    const request = buildPlatformChatCompletionRequest({
      providerConfig: {
        serverUrl: "https://nolo.chat",
        authToken: "token",
        agentKey: "agent-deepseek-flash",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        endpoint: "https://api.deepseek.com/v1/responses",
        requestOptions: {},
      },
      messages: [
        {
          role: "assistant",
          content: "previous answer",
          reasoning_content: "用户想要对比模型性能",
        },
        { role: "user", content: "继续" },
      ],
    });
    const body = JSON.parse(String(request.init.body));

    expect(Array.isArray(body.input)).toBe(true);
    expect(body.input).toEqual([
      {
        type: "reasoning",
        content: [{ type: "reasoning_text", text: "用户想要对比模型性能" }],
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "previous answer" }],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "继续" }],
      },
    ]);
  });

  test("does not retry a malformed DeepSeek request after an upstream 400", async () => {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig: {
        key: "agent-deepseek-flash",
        provider: "nolo",
        model: "deepseek-v4-flash",
      },
      env: { NOLO_SERVER: "https://nolo.chat", AUTH_TOKEN: "token" },
    });
    const requests: Array<{ url: string; body: any }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      requests.push({ url, body });
      return Response.json(
        {
          error: {
            message:
              "Failed to deserialize the JSON body into the target type: tools[0]: missing field `function`",
            code: "UPSTREAM_400",
          },
        },
        { status: 400 },
      );
    }) as typeof fetch;

    await expect(
      executePlatformChatCompletion({
        providerConfig,
        messages: [{ role: "user", content: "Reply PONG" }],
        tools: [{
          type: "function",
          function: {
            name: "readFile",
            parameters: { type: "object", properties: {} },
          },
        }],
        fetchImpl,
      })
    ).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });

  test("preserves reasoning_content from tool-call responses", () => {
    const result = parsePlatformChatCompletionResponse({
      providerConfig: {
        serverUrl: "https://us.nolo.chat",
        authToken: "token",
        agentKey: "agent-deepseek",
        model: "deepseek-v4-pro",
        provider: "nolo",
        endpoint: "https://api.deepseek.com/chat/completions",
        requestOptions: {},
      },
      data: {
        choices: [{
          message: {
            content: "",
            reasoning_content: "inspect first",
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "readFile", arguments: "{\"path\":\"README.md\"}" },
            }],
          },
        }],
      },
      trace: [],
    });

    expect(result).toMatchObject({
      content: "",
      reasoning_content: "inspect first",
      tool_calls: [{
        id: "call-1",
      }],
    });
  });

  test("parses Responses API output into text and tool calls", () => {
    const result = parsePlatformChatCompletionResponse({
      providerConfig: {
        serverUrl: "https://us.nolo.chat",
        authToken: "token",
        agentKey: "agent-openai",
        model: "gpt-5.5",
        provider: "openai",
        endpoint: "https://api.openai.com/v1/responses",
        requestOptions: {},
      },
      data: {
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "chrome_open_tab",
            arguments: "{\"url\":\"https://nolo.chat/\"}",
          },
          {
            type: "message",
            content: [{ type: "output_text", text: "queued" }],
          },
        ],
        usage: { total_tokens: 12 },
      },
      trace: [],
    });

    expect(result).toMatchObject({
      content: "queued",
      tool_calls: [{
        id: "call-1",
        type: "function",
        function: {
          name: "chrome_open_tab",
          arguments: "{\"url\":\"https://nolo.chat/\"}",
        },
      }],
      usage: { total_tokens: 12 },
    });
  });

  test("parses chat completion JSON from event-stream proxy bodies", () => {
    const data = parsePlatformChatCompletionData(`
{"choices":[{"message":{"role":"assistant","content":"ok"}}],"usage":{"total_tokens":3}}

data: {"usage":{"billing_provider":"openrouter"}}
`);

    expect(data).toMatchObject({
      choices: [{
        message: {
          content: "ok",
        },
      }],
    });
  });

  // nolo provider 上游切换（官方 Responses ↔ DeepInfra chat.completions）的
  // rollout 窗口里，客户端按 /responses endpoint 发请求、代理回传
  // chat.completion body。解析必须按响应体形状路由，否则正文被静默丢弃，
  // localLoop 落进空轮 fallback「模型连续返回空消息」。
  test("parses chat.completions body by shape even when the endpoint says Responses", () => {
    const result = parsePlatformChatCompletionResponse({
      providerConfig: {
        serverUrl: "https://nolo.chat",
        authToken: "token",
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        model: "deepseek-v4-flash",
        provider: "nolo",
        endpoint: "https://api.deepseek.com/responses",
        requestOptions: {},
      },
      data: {
        object: "chat.completion",
        model: "deepseek-ai/DeepSeek-V4-Flash-0731",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "我是DeepSeek，一个由深度求索公司打造的免费AI助手。",
            reasoning_content: "先想一下怎么介绍",
          },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 8, completion_tokens: 32, total_tokens: 40 },
      },
      trace: [],
    });

    expect(result).toMatchObject({
      content: "我是DeepSeek，一个由深度求索公司打造的免费AI助手。",
      reasoning_content: "先想一下怎么介绍",
      finish_reason: "stop",
      usage: { prompt_tokens: 8, completion_tokens: 32, total_tokens: 40 },
      stream_complete: true,
    });
  });

  test("recovers tool calls and finish_reason from a chat.completions body on a Responses endpoint", () => {
    const result = parsePlatformChatCompletionResponse({
      providerConfig: {
        serverUrl: "https://nolo.chat",
        authToken: "token",
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        model: "deepseek-v4-flash",
        provider: "nolo",
        endpoint: "https://api.deepseek.com/responses",
        requestOptions: {},
      },
      data: {
        object: "chat.completion",
        choices: [{
          message: {
            role: "assistant",
            content: "",
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "readFile", arguments: "{\"path\":\"README.md\"}" },
            }],
          },
          finish_reason: "tool_calls",
        }],
      },
      trace: [],
    });

    expect(result).toMatchObject({
      content: "",
      finish_reason: "tool_calls",
      tool_calls: [{ id: "call-1", function: { name: "readFile" } }],
    });
  });
});

describe("platform chat SSE streaming reader (子目标 A)", () => {
  test("reads chat.completions delta chunks and invokes onTextDelta for each chunk", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"!"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["Hel", "lo", "!"]);
    expect(result.content).toBe("Hello!");
  });

  test("reads Responses API output_text deltas and captures completed usage", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"type":"response.output_text.delta","delta":"par"}\n\n' +
        'data: {"type":"response.output_text.delta","delta":"tial"}\n\n' +
        'data: {"type":"response.completed","response":{"output":[{"type":"message","content":[{"type":"output_text","text":"partial"}]}],"usage":{"total_tokens":7}}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["par", "tial"]);
    expect(result.content).toBe("partial");
    expect(result.usage).toEqual({ total_tokens: 7 });
  });

  test("billing frame with independent `billing` key does not overwrite real usage", async () => {
    // 回归护栏：server 端 billing 帧（formatBillingUsageEvent）以前复用顶层
    // `usage` key 注入 billing_*/cost，把客户端刚从 response.completed 解析
    // 到的 input_tokens/output_tokens 覆盖掉，TUI context chip 永远不更新。
    // 修复后 billing 帧走独立 `billing` key，usage 保留 token 数，且 cost
    // 合并进返回的 usage 供 credits chip 使用。
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"type":"response.output_text.delta","delta":"hi"}\n\n' +
        'data: {"type":"response.completed","response":{"usage":{"input_tokens":30,"output_tokens":5,"total_tokens":35}}}\n\n' +
        'data: {"billing":{"billing_provider":"deepseek","billing_model":"deepseek-v4-flash","cost":0.0042}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["hi"]);
    expect(result.usage).toMatchObject({
      input_tokens: 30,
      output_tokens: 5,
      total_tokens: 35,
      cost: 0.0042,
    });
  });

  test("legacy usage-key billing frame still cannot destroy token usage", async () => {
    // 防御护栏：即使上游（旧 server 或第三方代理）仍把 billing 元数据塞在
    // 顶层 `usage` 里，只要没有 token 字段就不算真实 usage 帧，不得覆盖
    // 已解析到的 token 数（extractUsageFromSsePayload 的 hasUsageTokens 门槛）。
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"legacy"}}]}\n\n' +
        'data: {"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}\n\n' +
        'data: {"usage":{"billing_provider":"openrouter","cost":0.001}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
    });
    expect(result.content).toBe("legacy");
    expect(result.usage).toMatchObject({
      prompt_tokens: 12,
      completion_tokens: 3,
      total_tokens: 15,
      cost: 0.001,
    });
  });

  test("billing frame arriving before usage keeps both intact", async () => {
    // 顺序防御：billing 帧若先于 usage 帧到达（上游乱序/代理缓冲差异），
    // usage 帧仍应覆盖 billing-only 占位，最终同时含 token 与 cost。
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"billing":{"billing_provider":"deepseek","cost":0.0042}}\n\n' +
        'data: {"type":"response.completed","response":{"usage":{"input_tokens":30,"output_tokens":5,"total_tokens":35}}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
    });
    expect(result.usage).toMatchObject({
      input_tokens: 30,
      output_tokens: 5,
      total_tokens: 35,
      cost: 0.0042,
    });
  });

  test("parses non-streaming DeepSeek DSML tool-call text", () => {
    const result = parsePlatformChatCompletionResponse({
      providerConfig: {
        serverUrl: "https://nolo.chat",
        authToken: "token",
        agentKey: "deepseek",
        model: "deepseek-v4-flash",
        provider: "nolo",
        endpoint: "https://api.deepseek.com/responses",
        requestOptions: {},
      },
      data: {
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: 'I will inspect. <｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="readFile"><｜｜DSML｜｜parameter name="file" string="true">README.md</｜｜DSML｜｜parameter></｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>',
          }],
        }],
      },
      trace: [],
    });
    expect(result.content).toBe("I will inspect. ");
    expect(result.tool_calls).toEqual([{
      id: "dsml-1",
      type: "function",
      function: { name: "readFile", arguments: '{"path":"README.md"}' },
    }]);
  });

  test("converts DeepSeek DSML tool-call text into a structured tool call", async () => {
    const visible: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"type":"response.output_text.delta","delta":"I will inspect. <｜｜DSML｜｜tool_calls>"}\n\n' +
        'data: {"type":"response.output_text.delta","delta":"<｜｜DSML｜｜invoke name=\\"readFile\\">"}\n\n' +
        'data: {"type":"response.output_text.delta","delta":"<｜｜DSML｜｜parameter name=\\"file\\" string=\\"true\\">README.md</｜｜DSML｜｜parameter>"}\n\n' +
        'data: {"type":"response.output_text.delta","delta":"</｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>"}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
      onTextDelta: (chunk) => visible.push(chunk),
    });
    expect(visible).toEqual(["I will inspect. "]);
    expect(result.content).toBe("I will inspect. ");
    expect(result.tool_calls).toEqual([
      {
        id: "dsml-1",
        type: "function",
        function: { name: "readFile", arguments: '{"path":"README.md"}' },
      },
    ]);
  });

  test("accumulates Responses function-call arguments without completed output", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"type":"response.output_item.added","item":{"id":"item-1","type":"function_call","call_id":"call-1","name":"readFile","arguments":""}}\n\n' +
        'data: {"type":"response.function_call_arguments.delta","item_id":"item-1","delta":"{\\"path\\":\\"README.md\\"}"}\n\n' +
        'data: {"type":"response.function_call_arguments.done","item_id":"item-1","arguments":"{\\"path\\":\\"README.md\\"}"}\n\n' +
        'data: {"type":"response.completed","response":{"usage":{"total_tokens":7}}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
    });
    expect(result.tool_calls).toEqual([
      {
        id: "call-1",
        type: "function",
        function: { name: "readFile", arguments: '{"path":"README.md"}' },
      },
    ]);
    expect(result.usage).toEqual({ total_tokens: 7 });
  });

  test("prefers complete Responses output tool calls when available", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"type":"response.output_item.added","item":{"id":"item-1","type":"function_call","call_id":"call-1","name":"readFile","arguments":""}}\n\n' +
        'data: {"type":"response.function_call_arguments.delta","item_id":"item-1","delta":"{\\"path\\":\\"partial\\"}"}\n\n' +
        'data: {"type":"response.completed","response":{"output":[{"type":"function_call","call_id":"call-1","name":"readFile","arguments":"{\\"path\\":\\"complete\\"}"}]}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
    });
    expect(result.tool_calls).toEqual([
      {
        id: "call-1",
        type: "function",
        function: { name: "readFile", arguments: '{"path":"complete"}' },
      },
    ]);
  });

  test("accumulates reasoning_content from chat.completions reasoning deltas", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"visible","reasoning_content":"think"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["visible"]);
    expect(result.content).toBe("visible");
    expect(result.reasoning_content).toBe("think");
  });

  test("accumulates a single tool call fragmented across name + argument chunks", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"let me check","tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"readFile","arguments":""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"path\\":\\"README.md\\""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"}"}}]}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["let me check"]);
    expect(result.content).toBe("let me check");
    expect(result.tool_calls).toEqual([
      {
        id: "call-1",
        type: "function",
        function: { name: "readFile", arguments: '{"path":"README.md"}' },
      },
    ]);
  });

  test("merges two concurrent tool calls interleaved by index", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-a","type":"function","function":{"name":"readFile","arguments":""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"call-b","type":"function","function":{"name":"globFiles","arguments":""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"{\\"dir\\":\\"src\\"}"}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\"a.ts\\"}"}}]}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onTextDelta: () => {},
    });
    expect(result.tool_calls).toEqual([
      {
        id: "call-a",
        type: "function",
        function: { name: "readFile", arguments: '{"path":"a.ts"}' },
      },
      {
        id: "call-b",
        type: "function",
        function: { name: "globFiles", arguments: '{"dir":"src"}' },
      },
    ]);
  });

  test("pure-text streams are unaffected and omit tool_calls", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"just text"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":" only"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["just text", " only"]);
    expect(result.content).toBe("just text only");
    expect(result.tool_calls).toBeUndefined();
  });

  test("reasoning delta triggers onReasoningDelta and final reasoning_content stays complete", async () => {
    const reasoningDeltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"reasoning_content":"thin"}}]}\n\n' +
        'data: {"choices":[{"delta":{"reasoning_content":"king"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"answer"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
      onReasoningDelta: (chunk) => reasoningDeltas.push(chunk),
    });
    expect(reasoningDeltas).toEqual(["thin", "king"]);
    // 最终 reasoning_content 仍完整
    expect(result.reasoning_content).toBe("thinking");
    expect(result.content).toBe("answer");
  });

  test("inline <think> tags in content deltas are split into reasoning and visible content", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"<think>let me think"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":" more</think>answer"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
    });
    expect(result.reasoning_content).toBe("let me think more");
    expect(result.content).toBe("answer");
  });

  test("inline <think> tag split across chunk boundary is reassembled", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"<think>rea"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"soning</thi"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"nk>visible"}}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: false,
    });
    expect(result.reasoning_content).toBe("reasoning");
    expect(result.content).toBe("visible");
  });

  // 客户端预期 Responses 线（usesResponsesApi=true）但代理回传
  // chat.completions delta 流：帧按形状路由到 applyChatCompletionDelta，
  // 正文 / finish_reason / usage 都不能丢。
  test("routes chat.completions delta frames by shape when the client expected Responses", async () => {
    const deltas: string[] = [];
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"reasoning_content":"思考"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
        'data: {"usage":{"prompt_tokens":8,"completion_tokens":32,"total_tokens":40}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(deltas).toEqual(["你好"]);
    expect(result.content).toBe("你好");
    expect(result.reasoning_content).toBe("思考");
    expect(result.finish_reason).toBe("stop");
    expect(result.usage).toMatchObject({ total_tokens: 40 });
    expect(result.stream_complete).toBe(true);
  });

  test("recovers chat.completions tool-call frames routed under a Responses expectation", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"readFile","arguments":""}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\"README.md\\"}"}}]}}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
    });
    expect(result.tool_calls).toEqual([{
      id: "call-1",
      type: "function",
      function: { name: "readFile", arguments: "{\"path\":\"README.md\"}" },
    }]);
    expect(result.finish_reason).toBe("tool_calls");
  });

  test("proxy error frames still throw on the shape-routed chat.completions path", async () => {
    await expect(readPlatformChatSseCompletion({
      response: sseResponse(
        'data: {"error":{"msg":"服务器紧张","code":"PLATFORM_LLM_BUSY"}}\n\n' +
        'data: [DONE]',
      ),
      usesResponsesApi: true,
    })).rejects.toThrow("PLATFORM_LLM_BUSY");
  });

  // 穿透链路：executePlatformChatCompletion 是 readPlatformChatSseCompletion
  // 的唯一生产消费方，字段（尤其 finish_reason）必须一路透到 AgentRuntimeResult，
  // 否则 localLoop 的空轮/截断判定拿到的是残缺结果。
  test("executePlatformChatCompletion propagates shape-routed stream fields end to end", async () => {
    const result = await executePlatformChatCompletion({
      providerConfig: {
        serverUrl: "https://nolo.chat",
        authToken: "token",
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        model: "deepseek-v4-flash",
        provider: "nolo",
        endpoint: "https://api.deepseek.com/responses",
        requestOptions: {},
      },
      messages: [{ role: "user", content: "hi" }],
      stream: true,
      onTextDelta: () => {},
      fetchImpl: async () =>
        sseResponse(
          'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n' +
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
          'data: {"usage":{"prompt_tokens":8,"completion_tokens":32,"total_tokens":40}}\n\n' +
          'data: [DONE]',
        ),
    });
    expect(result.content).toBe("你好");
    expect(result.finish_reason).toBe("stop");
    expect(result.usage).toMatchObject({ total_tokens: 40 });
    expect(result.stream_complete).toBe(true);
  });
});
