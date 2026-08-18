import { describe, expect, test } from "bun:test";

import {
  buildOpenAiCompatibleChatCompletionRequest,
  executeOpenAiCompatibleChatCompletion,
  parseOpenAiCompatibleChatCompletionResponse,
  readOpenAiCompatibleSseCompletion,
} from "./openAiCompatibleProvider";

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
