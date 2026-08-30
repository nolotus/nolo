import { describe, expect, test } from "bun:test";

import {
  PLATFORM_HOSTED_KIMI_K3_MODEL,
  PLATFORM_HOSTED_KIMI_K26_MODEL,
} from "ai/llm/kimi";
import {
  buildOpenAiCompatibleChatCompletionRequest,
  executeOpenAiCompatibleChatCompletion,
  parseOpenAiCompatibleChatCompletionResponse,
  readOpenAiCompatibleSseCompletion,
} from "./openAiCompatibleProvider";
import type { OpenAiCompatibleProviderConfig } from "./openAiCompatibleProvider";

function sseResponse(body: string, contentType = "text/event-stream") {
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  }), {
    headers: { "content-type": contentType },
  });
}

describe("OpenAI-compatible provider wire helpers", () => {
  test("builds a chat completion request from runtime messages", () => {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig: {
        model: "custom-coder",
        endpoint: "https://provider.example/v1/chat/completions",
        apiKey: "sk-custom",
        provider: "custom",
        requestOptions: {
          temperature: 0.2,
          max_tokens: 4096,
        },
      },
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "call-1",
            type: "function",
            function: { name: "readFile", arguments: "{}" },
          }],
        },
        { role: "tool", content: "file contents", tool_call_id: "call-1" },
      ],
      tools: [{
        type: "function",
        function: {
          name: "readFile",
          description: "Read a file.",
          parameters: { type: "object" },
        },
      }],
    });

    expect(request).toEqual({
      url: "https://provider.example/v1/chat/completions",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer sk-custom",
        },
        body: JSON.stringify({
          model: "custom-coder",
          messages: [
            { role: "user", content: "hello" },
            {
              role: "assistant",
              content: "",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "readFile", arguments: "{}" },
              }],
            },
            { role: "tool", content: "file contents", tool_call_id: "call-1" },
          ],
          stream: false,
          temperature: 0.2,
          max_tokens: 4096,
          tools: [{
            type: "function",
            function: {
              name: "readFile",
              description: "Read a file.",
              parameters: { type: "object" },
            },
          }],
        }),
      },
    });
  });

  test("strips historical string reasoning_content for direct DeepSeek Flash requests", () => {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig: {
        model: "deepseek-v4-flash",
        endpoint: "https://api.deepseek.com/chat/completions",
        apiKey: "deepseek-key",
        provider: "deepseek",
        requestOptions: {},
      },
      messages: [
        {
          role: "assistant",
          content: "previous answer",
          reasoning_content: "historical reasoning",
        },
        { role: "user", content: "continue" },
      ],
    });
    const body = JSON.parse(String(request.init.body));

    expect(body.messages).toEqual([
      { role: "assistant", content: "previous answer" },
      { role: "user", content: "continue" },
    ]);
  });

  test("parses a chat completion response into runtime result", () => {
    const trace = [{ role: "user" as const, content: "hello" }];

    expect(parseOpenAiCompatibleChatCompletionResponse({
      providerConfig: {
        model: "custom-coder",
        endpoint: "https://provider.example/v1/chat/completions",
        apiKey: "sk-custom",
        provider: "custom",
        requestOptions: {},
      },
      data: {
        choices: [{
          message: {
            content: "done",
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "readFile", arguments: "{}" },
            }],
          },
        }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      },
      trace,
    })).toEqual({
      content: "done",
      model: "custom-coder",
      provider: "custom",
      tool_calls: [{
        id: "call-1",
        type: "function",
        function: { name: "readFile", arguments: "{}" },
      }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
      trace,
      stream_complete: true,
    });
  });

  test("extracts \u003cthink\u003e blocks from non-streaming content", () => {
    const trace = [{ role: "user" as const, content: "hi" }];
    const result = parseOpenAiCompatibleChatCompletionResponse({
      providerConfig: {
        model: "MiniMax-M3",
        endpoint: "https://api.minimaxi.com/v1/chat/completions",
        apiKey: "sk-test",
        provider: "custom",
        requestOptions: {},
      },
      data: {
        choices: [{
          message: {
            content: "<think>\nthink\n</think>\nvisible",
          },
        }],
      },
      trace,
    });
    expect(result.content).toBe("visible");
    expect(result.reasoning_content).toBe("\nthink\n");
  });

  test("reads SSE stream with \u003cthink\u003e tags split into reasoning and content", async () => {
    const deltas: string[] = [];
    const result = await readOpenAiCompatibleSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"<think>"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"reason"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"</think>\\nvisible"}}]}'
      ),
      onTextDelta: (chunk) => deltas.push(chunk),
    });
    expect(result.content).toBe("visible");
    expect(result.reasoning_content).toBe("reason");
    expect(deltas).toEqual(["visible"]);
  });

  test("reads a trailing SSE frame that does not end with a blank line", async () => {
    const deltas: string[] = [];
    const result = await readOpenAiCompatibleSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"lo"}}]}'
      ),
      onTextDelta: (chunk) => deltas.push(chunk),
    });

    expect(result.content).toBe("hello");
    expect(deltas).toEqual(["hel", "lo"]);
  });

  test("falls back to JSON parsing when stream=true but content-type is not SSE", async () => {
    const providerConfig = {
      model: "custom-coder",
      endpoint: "https://provider.example/v1/chat/completions",
      apiKey: "sk-custom",
      provider: "custom",
      requestOptions: {},
    };
    const deltas: string[] = [];
    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hello" }],
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{ message: { content: "json fallback" } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      stream: true,
      onTextDelta: (chunk) => deltas.push(chunk),
    });

    expect(result.content).toBe("json fallback");
    expect(deltas).toEqual([]);
    expect(result.usage).toEqual({ prompt_tokens: 1, completion_tokens: 2 });
  });

  test("exposes finish_reason=length from the last SSE chunk", async () => {
    const result = await readOpenAiCompatibleSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{"content":"hello"},"finish_reason":null}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}'
      ),
    });
    expect(result.content).toBe("hello");
    expect(result.finish_reason).toBe("length");
  });

  test("does not let intermediate null finish_reason clobber a captured value", async () => {
    const result = await readOpenAiCompatibleSseCompletion({
      response: sseResponse(
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"x"},"finish_reason":null}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":null}]}'
      ),
    });
    expect(result.content).toBe("x");
    expect(result.finish_reason).toBe("stop");
  });

  test("exposes finish_reason from a non-streaming chat completion response", () => {
    const trace = [{ role: "user" as const, content: "hi" }];
    const result = parseOpenAiCompatibleChatCompletionResponse({
      providerConfig: {
        model: "custom-coder",
        endpoint: "https://provider.example/v1/chat/completions",
        apiKey: "sk-custom",
        provider: "custom",
        requestOptions: {},
      },
      data: {
        choices: [{ message: { content: "truncated mid-sentence" }, finish_reason: "length" }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      },
      trace,
    });
    expect(result.finish_reason).toBe("length");
  });

  test("passes through finish_reason=tool_calls and finish_reason=stop", () => {
    const trace = [{ role: "user" as const, content: "hi" }];
    const providerConfig = {
      model: "custom-coder",
      endpoint: "https://provider.example/v1/chat/completions",
      apiKey: "sk-custom",
      provider: "custom",
      requestOptions: {},
    };
    const toolCallsResult = parseOpenAiCompatibleChatCompletionResponse({
      providerConfig,
      data: {
        choices: [{
          message: {
            content: "",
            tool_calls: [{ id: "call-1", type: "function", function: { name: "readFile", arguments: "{}" } }],
          },
          finish_reason: "tool_calls",
        }],
      },
      trace,
    });
    expect(toolCallsResult.finish_reason).toBe("tool_calls");

    const stopResult = parseOpenAiCompatibleChatCompletionResponse({
      providerConfig,
      data: {
        choices: [{ message: { content: "done" }, finish_reason: "stop" }],
      },
      trace,
    });
    expect(stopResult.finish_reason).toBe("stop");
  });

  test("executeOpenAiCompatibleChatCompletion forwards finish_reason from streaming", async () => {
    const providerConfig = {
      model: "custom-coder",
      endpoint: "https://provider.example/v1/chat/completions",
      apiKey: "sk-custom",
      provider: "custom",
      requestOptions: {},
    };
    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hello" }],
      fetchImpl: async () => sseResponse(
        'data: {"choices":[{"delta":{"content":"cut off"},"finish_reason":null}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}'
      ),
      stream: true,
    });
    expect(result.content).toBe("cut off");
    expect(result.finish_reason).toBe("length");
  });
});

describe("executeOpenAiCompatibleChatCompletion resolveApiKey", () => {
  const providerConfig = {
    model: "custom-coder",
    endpoint: "https://provider.example/v1/chat/completions",
    apiKey: "sk-static",
    provider: "custom",
    requestOptions: {},
  };

  function jsonResponse(content: string, status = 200): Response {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
      { status, headers: { "content-type": "application/json" } },
    );
  }

  function unauthorizedResponse(): Response {
    return new Response(
      JSON.stringify({ error: { message: "invalid token", type: "invalid_authentication_error" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  test("uses resolveApiKey token in Authorization when provided", async () => {
    const calls: { auth: string }[] = [];
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      calls.push({ auth: headers["Authorization"] });
      return jsonResponse("ok");
    };
    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
      resolveApiKey: async () => "oauth-fresh-token",
    });
    expect(result.content).toBe("ok");
    expect(calls).toHaveLength(1);
    expect(calls[0].auth).toBe("Bearer oauth-fresh-token");
  });

  test("on 401, force-refreshes and retries with new token", async () => {
    let callCount = 0;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      callCount += 1;
      if (callCount === 1) return unauthorizedResponse();
      return jsonResponse("recovered");
    };
    const resolveCalls: { force: boolean }[] = [];
    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
      resolveApiKey: async (opts) => {
        resolveCalls.push({ force: opts.force });
        return opts.force ? "oauth-refreshed-token" : "oauth-stale-token";
      },
    });
    expect(result.content).toBe("recovered");
    expect(callCount).toBe(2);
    expect(resolveCalls).toEqual([{ force: false }, { force: true }]);
  });

  test("on 401 when force-refresh returns same token or null, does not retry", async () => {
    let callCount = 0;
    const fetchImpl = async () => {
      callCount += 1;
      return unauthorizedResponse();
    };
    const resolveCalls: { force: boolean }[] = [];
    await expect(
      executeOpenAiCompatibleChatCompletion({
        providerConfig,
        messages: [{ role: "user", content: "hi" }],
        fetchImpl,
        resolveApiKey: async (opts) => {
          resolveCalls.push({ force: opts.force });
          return "oauth-stale-token"; // same token as initial resolve
        },
      }),
    ).rejects.toThrow(/local provider failed: HTTP 401/);
    expect(callCount).toBe(1);
    expect(resolveCalls).toEqual([{ force: false }, { force: true }]);
  });
});

describe("OpenAI-compatible provider Responses wire support", () => {
  test("does not send Chat Completions stream_options on Responses streams", () => {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig: {
        model: "gpt-5.6-luna",
        endpoint: "https://opencode.ai/zen/v1/responses",
        apiKey: "sk-opencode",
        provider: "custom",
        // usageProvider 命中 STREAM_USAGE_PROVIDERS 白名单（openai），只有
        // !isResponses 守卫能挡住 stream_options——这正是 Luna 通道在
        // platformChatProvider 上翻车的那道闸，这里压测它。
        usageProvider: "openai",
        requestOptions: {},
      },
      messages: [{ role: "user", content: "hello" }],
      stream: true,
    });
    const parsedBody = JSON.parse(String(request.init.body));
    expect(parsedBody.stream).toBe(true);
    expect(parsedBody.stream_options).toBeUndefined();
  });

  test("custom /responses URL converts request body to Responses wire (input instead of messages)", () => {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig: {
        model: "opencode-zen",
        endpoint: "https://opencode.ai/zen/v1/responses",
        apiKey: "sk-opencode",
        provider: "custom",
        requestOptions: {
          temperature: 0.7,
          max_tokens: 2048,
        },
      },
      messages: [
        { role: "user", content: "hello world" },
        {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "call-1",
            type: "function",
            function: { name: "readFile", arguments: "{\"path\":\"README.md\"}" },
          }],
        },
        { role: "tool", content: "file content", tool_call_id: "call-1" },
      ],
      tools: [{
        type: "function",
        function: {
          name: "readFile",
          description: "Read a file.",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        },
      }],
    });

    expect(request.url).toBe("https://opencode.ai/zen/v1/responses");
    expect(request.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-opencode",
    });

    const parsedBody = JSON.parse(String(request.init.body));
    expect(parsedBody.model).toBe("opencode-zen");
    expect(parsedBody.messages).toBeUndefined();
    expect(parsedBody.max_tokens).toBeUndefined();
    expect(parsedBody.max_output_tokens).toBe(2048);
    expect(parsedBody.temperature).toBe(0.7);
    expect(parsedBody.input).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hello world" }],
      },
      {
        type: "function_call",
        call_id: "call-1",
        name: "readFile",
        arguments: "{\"path\":\"README.md\"}",
      },
      {
        type: "function_call_output",
        call_id: "call-1",
        output: "file content",
      },
    ]);
    expect(parsedBody.tools).toEqual([
      {
        type: "function",
        name: "readFile",
        description: "Read a file.",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      },
    ]);
  });

  test("parses a Responses non-streaming JSON response into runtime result", async () => {
    const trace = [{ role: "user" as const, content: "hi" }];
    const providerConfig = {
      model: "opencode-zen",
      endpoint: "https://opencode.ai/zen/v1/responses",
      apiKey: "sk-opencode",
      provider: "custom",
      requestOptions: {},
    };

    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl: async () => new Response(JSON.stringify({
        id: "resp-1",
        output: [
          {
            type: "reasoning",
            content: [{ type: "reasoning_text", text: "thinking..." }],
          },
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "Here is the result." }],
          },
          {
            type: "function_call",
            call_id: "call-99",
            name: "editFile",
            arguments: "{\"path\":\"foo.ts\"}",
          },
        ],
        usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    });

    expect(result).toMatchObject({
      content: "Here is the result.",
      model: "opencode-zen",
      provider: "custom",
      reasoning_content: "thinking...",
      tool_calls: [{
        id: "call-99",
        type: "function",
        function: { name: "editFile", arguments: "{\"path\":\"foo.ts\"}" },
      }],
      finish_reason: "tool_calls",
      stream_complete: true,
      usage: {
        prompt_tokens: 12,
        completion_tokens: 34,
        total_tokens: 46,
      },
    });
  });

  test("parses a Responses SSE stream with content, reasoning, tool_calls, and usage", async () => {
    const providerConfig = {
      model: "opencode-zen",
      endpoint: "https://opencode.ai/zen/v1/responses",
      apiKey: "sk-opencode",
      provider: "custom",
      requestOptions: {},
    };

    const textDeltas: string[] = [];
    const reasoningDeltas: string[] = [];

    const sseBody = [
      `data: ${JSON.stringify({ type: "response.reasoning_text.delta", delta: "deep " })}`,
      `data: ${JSON.stringify({ type: "response.reasoning_text.delta", delta: "thought" })}`,
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "Hello " })}`,
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "from responses!" })}`,
      `data: ${JSON.stringify({
        type: "response.output_item.added",
        item: { id: "item-1", type: "function_call", call_id: "call-abc", name: "globFiles" },
      })}`,
      `data: ${JSON.stringify({
        type: "response.function_call_arguments.delta",
        item_id: "item-1",
        delta: "{\"path\":",
      })}`,
      `data: ${JSON.stringify({
        type: "response.function_call_arguments.delta",
        item_id: "item-1",
        delta: "\".\"}",
      })}`,
      `data: ${JSON.stringify({
        type: "response.completed",
        response: {
          usage: { input_tokens: 15, output_tokens: 25, total_tokens: 40 },
        },
      })}`,
      "",
    ].join("\n\n");

    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "test" }],
      fetchImpl: async () => sseResponse(sseBody),
      stream: true,
      onTextDelta: (chunk) => textDeltas.push(chunk),
      onReasoningDelta: (chunk) => reasoningDeltas.push(chunk),
    });

    expect(result.content).toBe("Hello from responses!");
    expect(result.reasoning_content).toBe("deep thought");
    expect(textDeltas).toEqual(["Hello ", "from responses!"]);
    expect(reasoningDeltas).toEqual(["deep ", "thought"]);
    expect(result.tool_calls).toEqual([
      {
        id: "call-abc",
        type: "function",
        function: { name: "globFiles", arguments: "{\"path\":\".\"}" },
      },
    ]);
    expect(result.finish_reason).toBe("tool_calls");
    expect(result.stream_complete).toBe(true);
    expect(result.usage).toEqual({
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40,
    });
  });

  test("throws on in-stream error in Responses SSE", async () => {
    const providerConfig = {
      model: "opencode-zen",
      endpoint: "https://opencode.ai/zen/v1/responses",
      apiKey: "sk-opencode",
      provider: "custom",
      requestOptions: {},
    };

    const sseBody = [
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "partial" })}`,
      `data: ${JSON.stringify({
        type: "error",
        error: { message: "quota exceeded", code: "insufficient_quota" },
      })}`,
      "",
    ].join("\n\n");

    await expect(
      executeOpenAiCompatibleChatCompletion({
        providerConfig,
        messages: [{ role: "user", content: "test" }],
        fetchImpl: async () => sseResponse(sseBody),
        stream: true,
      }),
    ).rejects.toThrow("quota exceeded");
  });
});

describe("OpenAI-compatible provider availability reporting", () => {
  const providerConfig = {
    model: "custom-coder",
    endpoint: "https://provider.example/v1/chat/completions",
    apiKey: "sk-custom",
    provider: "custom",
    requestOptions: {},
  };

  test("reports a 429 with the parsed body so callers can persist a cooldown", async () => {
    const seen: { status: number; body?: unknown }[] = [];
    await expect(
      executeOpenAiCompatibleChatCompletion({
        providerConfig,
        messages: [{ role: "user", content: "hi" }],
        fetchImpl: async () =>
          new Response(
            JSON.stringify({ error: { code: "1310", message: "Weekly Limit Exhausted" } }),
            { status: 429 },
          ),
        onHttpResult: (result) => {
          seen.push(result);
        },
      }),
    ).rejects.toThrow(/HTTP 429/);
    expect(seen).toEqual([
      { status: 429, body: { error: { code: "1310", message: "Weekly Limit Exhausted" } } },
    ]);
  });

  test("reports success so a stale cooldown can be cleared", async () => {
    const seen: { status: number; body?: unknown }[] = [];
    const result = await executeOpenAiCompatibleChatCompletion({
      providerConfig,
      messages: [{ role: "user", content: "hi" }],
      fetchImpl: async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          headers: { "content-type": "application/json" },
        }),
      onHttpResult: (r) => {
        seen.push(r);
      },
    });
    expect(result.content).toBe("ok");
    expect(seen).toEqual([{ status: 200 }]);
  });
});

describe("OpenAI-compatible provider per-provider body quirk (shared with server loop)", () => {
  function buildSentBody(args: { provider: string; model: string; endpoint?: string }) {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig: {
        model: args.model,
        endpoint: args.endpoint ?? "https://provider.example/v1/chat/completions",
        apiKey: "sk-test",
        provider: args.provider,
        requestOptions: {
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
          max_tokens: 4096,
          reasoning_effort: "medium",
        },
      },
      messages: [{ role: "user", content: "hello" }],
    });
    return JSON.parse(String(request.init.body)) as Record<string, any>;
  }

  test("strips sampling params and renames max_tokens for platform-hosted Kimi K3 (provider=nolo, upstream crof)", () => {
    // 线上事故回归用例：本地直连 crof 调 kimi-k3 时曾原样透传采样参数，
    // 上游中途断流（「上游响应流在收尾前被中断」）且照常扣费。
    const sentBody = buildSentBody({
      provider: "nolo",
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
    });

    expect(sentBody.model).toBe(PLATFORM_HOSTED_KIMI_K3_MODEL);
    expect(sentBody).not.toHaveProperty("temperature");
    expect(sentBody).not.toHaveProperty("top_p");
    expect(sentBody).not.toHaveProperty("frequency_penalty");
    expect(sentBody).not.toHaveProperty("presence_penalty");
    // max_tokens 改名 max_completion_tokens，且不同时存在两个字段。
    expect(sentBody.max_completion_tokens).toBe(4096);
    expect(sentBody).not.toHaveProperty("max_tokens");
    // quirk 只动采样参数与 max_tokens；其余字段（如 reasoning_effort）保留，
    // 与 server 主路径 normalize 后的行为一致。
    expect(sentBody.reasoning_effort).toBe("medium");
  });

  test("applies the same K3 quirk for moonshot direct connections", () => {
    const sentBody = buildSentBody({
      provider: "moonshot",
      endpoint: "https://api.moonshot.cn/v1/chat/completions",
      model: "kimi-k3",
    });

    expect(sentBody).not.toHaveProperty("temperature");
    expect(sentBody).not.toHaveProperty("top_p");
    expect(sentBody).not.toHaveProperty("frequency_penalty");
    expect(sentBody).not.toHaveProperty("presence_penalty");
    expect(sentBody.max_completion_tokens).toBe(4096);
    expect(sentBody).not.toHaveProperty("max_tokens");
  });

  test("keeps sampling params for non-K3 models on the local direct path", () => {
    // 防过度收敛：平台托管非 K3 模型不得被误删采样参数。
    const sentBody = buildSentBody({
      provider: "nolo",
      model: PLATFORM_HOSTED_KIMI_K26_MODEL,
    });

    expect(sentBody.temperature).toBe(0.7);
    expect(sentBody.top_p).toBe(0.9);
    expect(sentBody.frequency_penalty).toBe(0.5);
    expect(sentBody.presence_penalty).toBe(0.3);
    expect(sentBody.max_tokens).toBe(4096);
    expect(sentBody).not.toHaveProperty("max_completion_tokens");
  });
});

describe("OpenAI-compatible provider usage whitelist seam (real upstream name)", () => {
  function buildStreamSentBody(providerConfig: OpenAiCompatibleProviderConfig) {
    const request = buildOpenAiCompatibleChatCompletionRequest({
      providerConfig,
      messages: [{ role: "user", content: "hello" }],
      stream: true,
    });
    return JSON.parse(String(request.init.body)) as Record<string, any>;
  }

  test("platform-hosted K3 stream requests include_usage via the real upstream name (crof)", () => {
    // usageProvider 是本批新增的 seam：查白名单用真实上游名，对外 provider
    // 仍是 "nolo"。缺失时查 "nolo" 不在白名单 → 不发 include_usage → 漏账。
    const sentBody = buildStreamSentBody({
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
      endpoint: "https://crof.ai/v1/chat/completions",
      apiKey: "sk-test",
      provider: "nolo",
      usageProvider: "crof",
      requestOptions: { temperature: 0.7, max_tokens: 4096 },
    });

    expect(sentBody.stream_options).toEqual({ include_usage: true });
    // K3 body quirk 依旧生效（第一批），与 usage seam 互不干扰。
    expect(sentBody).not.toHaveProperty("temperature");
    expect(sentBody.max_completion_tokens).toBe(4096);
    expect(sentBody).not.toHaveProperty("max_tokens");
  });

  test("no usageProvider keeps the whitelist lookup on the configured provider (custom unchanged)", () => {
    const sentBody = buildStreamSentBody({
      model: "custom-coder",
      endpoint: "https://provider.example/v1/chat/completions",
      apiKey: "sk-custom",
      provider: "custom",
      requestOptions: { temperature: 0.2, max_tokens: 4096 },
    });

    // custom 不在白名单：不发 stream_options（与改动前行为一致），采样参数保留。
    expect(sentBody).not.toHaveProperty("stream_options");
    expect(sentBody.temperature).toBe(0.2);
    expect(sentBody.max_tokens).toBe(4096);
  });

  test("oauth-shaped google-antigravity agent gains no usage fields and keeps sampling", () => {
    const sentBody = buildStreamSentBody({
      model: "gemini-3.6-flash",
      endpoint: "https://cloudcode-pa.googleapis.com/v1internal",
      apiKey: "oauth-token",
      provider: "google-antigravity",
      requestOptions: { temperature: 0.5 },
    });

    // OAuth 订阅路径不受平台托管 usage seam 影响：不多发不少发任何字段。
    expect(sentBody).not.toHaveProperty("stream_options");
    expect(sentBody.temperature).toBe(0.5);
  });
});
