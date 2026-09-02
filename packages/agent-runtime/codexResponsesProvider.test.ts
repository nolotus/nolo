import { describe, expect, test } from "bun:test";

import {
  CODEX_CLIENT_VERSION,
  CODEX_OPENAI_BETA,
  CODEX_ORIGINATOR,
  buildCodexRequestBody,
  convertMessagesToCodexInput,
  createCodexRequestIdentity,
  fetchCodexResponsesCompletion,
  isCodexOAuthAgent,
} from "./codexResponsesProvider";

const agent = {
  key: "chatgpt-agent",
  apiKeyRef: "chatgpt",
  provider: "openai",
  model: "gpt-5.6-sol",
  prompt: "Be concise.",
};

describe("Codex Responses adapter", () => {
  test("isCodexOAuthAgent detects apiKeyRef=chatgpt", () => {
    expect(isCodexOAuthAgent({ apiKeyRef: "chatgpt" })).toBe(true);
    expect(isCodexOAuthAgent({ apiKeyRef: "openai" })).toBe(false);
  });

  test("converts historical reasoning to Codex summary blocks", () => {
    const input = convertMessagesToCodexInput([
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: "answer",
        reasoning_content: "private reasoning",
      },
    ]);

    expect(input).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hello" }],
      },
      {
        type: "reasoning",
        summary: [{ type: "summary_text", text: "private reasoning" }],
      },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "answer" }],
      },
    ] as any);
  });

  test("builds Codex input with summary instead of public Responses content", () => {
    const body = buildCodexRequestBody({
      agentConfig: agent,
      accessToken: "token",
      openAiBody: {
        model: agent.model,
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "answer", reasoning_content: "think" },
        ],
      },
    });
    expect(body.input).toContainEqual({
      type: "reasoning",
      summary: [{ type: "summary_text", text: "think" }],
    });
    expect(body.input).not.toContainEqual({
      type: "reasoning",
      content: [{ type: "reasoning_text", text: "think" }],
    });
  });

  test("builds client_metadata and prompt_cache_key fingerprint", () => {
    const identity = createCodexRequestIdentity("install-1");
    const body = buildCodexRequestBody(
      {
        agentConfig: agent,
        accessToken: "token",
        openAiBody: {
          model: "gpt-5.6-sol",
          messages: [
            {
              role: "system",
              content: "System rule\n\nDynamic A",
              stable_prefix_chars: "System rule".length,
            },
            { role: "user", content: "Ping" },
          ],
        },
      },
      identity,
    );

    expect(body.model).toBe("gpt-5.6-sol");
    expect(body.instructions).toContain("Be concise.");
    expect(body.instructions).toContain("System rule");
    expect(body.prompt_cache_key).toMatch(/^nolo-codex-[0-9a-f]{8}$/);
    const otherIdentity = createCodexRequestIdentity("install-1");
    const samePrefixBody = buildCodexRequestBody({
      agentConfig: agent,
      accessToken: "token",
      openAiBody: {
        model: "gpt-5.6-sol",
        messages: [
          {
            role: "system",
            content: "System rule\n\nDynamic B",
            stable_prefix_chars: "System rule".length,
          },
          { role: "user", content: "A different growing turn" },
        ],
      },
    }, otherIdentity);
    expect(samePrefixBody.prompt_cache_key).toBe(body.prompt_cache_key);

    const changedStablePrefix = buildCodexRequestBody({
      agentConfig: agent,
      accessToken: "token",
      openAiBody: {
        model: "gpt-5.6-sol",
        messages: [{ role: "system", content: "Different stable rule" }],
      },
    });
    const changedModel = buildCodexRequestBody({
      agentConfig: { ...agent, model: "gpt-5.6-terra" },
      accessToken: "token",
      openAiBody: {
        model: "gpt-5.6-terra",
        messages: [{ role: "system", content: "System rule" }],
      },
    });
    const changedTools = buildCodexRequestBody({
      agentConfig: agent,
      accessToken: "token",
      openAiBody: {
        model: "gpt-5.6-sol",
        messages: [{ role: "system", content: "System rule" }],
        tools: [{ type: "function", function: { name: "readFile", parameters: { type: "object" } } }],
      },
    });
    expect(changedStablePrefix.prompt_cache_key).not.toBe(body.prompt_cache_key);
    expect(changedModel.prompt_cache_key).not.toBe(body.prompt_cache_key);
    expect(changedTools.prompt_cache_key).not.toBe(body.prompt_cache_key);

    expect((samePrefixBody.client_metadata as Record<string, string>).session_id)
      .not.toBe((body.client_metadata as Record<string, string>).session_id);
    expect(body.client_metadata).toEqual(identity.clientMetadata);
    expect((body.client_metadata as Record<string, string>)["x-codex-installation-id"]).toBe(
      "install-1",
    );
  });

  test("sends deeper Codex SSE fingerprint headers", async () => {
    let capturedHeaders: Headers | undefined;
    let capturedBody: Record<string, unknown> | undefined;

    const result = await fetchCodexResponsesCompletion({
      agentConfig: agent,
      accessToken: [
        "header",
        Buffer.from(
          JSON.stringify({
            "https://api.openai.com/auth": {
              chatgpt_account_id: "acct-123",
            },
          }),
        ).toString("base64"),
        "sig",
      ].join("."),
      openAiBody: {
        model: "gpt-5.6-sol",
        messages: [{ role: "user", content: "Ping" }],
      },
      fetchImpl: (async (_url, init) => {
        capturedHeaders = new Headers(init?.headers as HeadersInit);
        capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return new Response(
          [
            `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "PONG" })}`,
            `data: ${JSON.stringify({
              type: "response.completed",
              response: {
                usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 },
              },
            })}`,
            "",
          ].join("\n\n"),
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      }) as typeof fetch,
    });

    expect(result.status).toBe(200);
    expect((result.body.choices as any[])?.[0]?.message).toEqual({
      role: "assistant",
      content: "PONG",
    });
    expect(capturedHeaders?.get("chatgpt-account-id")).toBe("acct-123");
    expect(capturedHeaders?.get("OpenAI-Beta")).toBe(CODEX_OPENAI_BETA);
    expect(capturedHeaders?.get("originator")).toBe(CODEX_ORIGINATOR);
    expect(capturedHeaders?.get("version")).toBe(CODEX_CLIENT_VERSION);
    expect(capturedHeaders?.get("session_id")).toBeTruthy();
    expect(capturedHeaders?.get("conversation_id")).toBe(capturedHeaders?.get("session_id"));
    expect(capturedHeaders?.get("x-client-request-id")).toBe(capturedHeaders?.get("session_id"));
    expect(capturedHeaders?.get("session-id")).toBe(capturedHeaders?.get("session_id"));
    expect(capturedHeaders?.get("thread-id")).toBeTruthy();
    expect(capturedHeaders?.get("x-codex-window-id")).toBeTruthy();
    expect(capturedHeaders?.get("x-codex-turn-metadata")).toContain("request_kind");
    expect(capturedBody?.client_metadata).toBeTruthy();
    expect(capturedBody?.prompt_cache_key).toMatch(/^nolo-codex-[0-9a-f]{8}$/);
    expect(capturedBody?.prompt_cache_key).not.toBe(capturedHeaders?.get("session_id"));
  });

  // Codex backend 把容量故障塞进 HTTP 200 的 SSE 帧里（2026-08-11 实测 gpt-5.6-luna
  // 半数请求命中）。不识别就会聚合成空 assistant + 伪造 finish_reason "stop"，
  // 上层只能报「本轮输出不完整」，真实原因全丢。
  const overloadedStream = (extra: string[] = []) =>
    [
      ...extra,
      `data: ${JSON.stringify({
        type: "error",
        error: {
          type: "service_unavailable_error",
          code: "server_is_overloaded",
          message: "Our servers are currently overloaded. Please try again later.",
        },
      })}`,
      `data: ${JSON.stringify({
        type: "response.failed",
        response: {
          status: "failed",
          error: { code: "server_is_overloaded", message: "overloaded" },
        },
      })}`,
      "",
    ].join("\n\n");

  const callWithStream = async (
    stream: string | (() => string),
    overrides: Record<string, unknown> = {},
  ) => {
    const calls: number[] = [];
    const slept: number[] = [];
    const result = await fetchCodexResponsesCompletion({
      agentConfig: agent,
      accessToken: "token",
      accountId: "acct-123",
      openAiBody: { model: "gpt-5.6-luna", messages: [{ role: "user", content: "Ping" }] },
      sleep: async (ms: number) => {
        slept.push(ms);
      },
      fetchImpl: (async () => {
        calls.push(calls.length + 1);
        return new Response(typeof stream === "function" ? stream() : stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }) as unknown as typeof fetch,
      ...overrides,
    } as Parameters<typeof fetchCodexResponsesCompletion>[0]);
    return { result, attempts: calls.length, slept };
  };

  test("surfaces in-stream error/response.failed as a real 503 instead of an empty turn", async () => {
    const { result, attempts, slept } = await callWithStream(overloadedStream());

    expect(result.status).toBe(503);
    expect(result.body.error).toEqual({
      message: "Our servers are currently overloaded. Please try again later.",
      code: "server_is_overloaded",
      type: "service_unavailable_error",
    });
    expect(result.body.choices).toBeUndefined();
    // 默认预算：首次 + 2 次重试，指数退避。
    expect(attempts).toBe(3);
    expect(slept).toEqual([500, 1000]);
  });

  test("retries overloaded stream and returns the first healthy response", async () => {
    let call = 0;
    const { result, attempts } = await callWithStream(() => {
      call += 1;
      if (call === 1) return overloadedStream();
      return [
        `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "PONG" })}`,
        `data: ${JSON.stringify({
          type: "response.completed",
          response: { usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 } },
        })}`,
        "",
      ].join("\n\n");
    });

    expect(attempts).toBe(2);
    expect(result.status).toBe(200);
    expect((result.body.choices as any[])?.[0]?.message).toEqual({ role: "assistant", content: "PONG" });
    expect(result.body.usage).toEqual({
      prompt_tokens: 3,
      completion_tokens: 1,
      total_tokens: 4,
    });
  });

  test("partial text before an in-stream failure is not passed off as a complete turn", async () => {
    const { result } = await callWithStream(
      overloadedStream([
        `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "half" })}`,
      ]),
      { maxAttempts: 1 },
    );

    expect(result.status).toBe(503);
    expect(result.body.choices).toBeUndefined();
  });

  test("response.incomplete maps to a non-retryable 502 carrying the reason", async () => {
    const { result, attempts } = await callWithStream(
      [
        `data: ${JSON.stringify({
          type: "response.incomplete",
          response: { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } },
        })}`,
        "",
      ].join("\n\n"),
    );

    expect(result.status).toBe(502);
    expect(result.body.error).toEqual({
      message: "Codex upstream ended incomplete: max_output_tokens.",
      code: "max_output_tokens",
    });
    expect(attempts).toBe(1);
  });
});

describe("upstream error body shape", () => {
  const call = async (status: number, text: string, statusText = "Error") => {
    const fetchImpl = (async () =>
      new Response(text, { status, statusText })) as unknown as typeof fetch;
    return fetchCodexResponsesCompletion({
      agentConfig: agent,
      accessToken: "token",
      accountId: "acct-1",
      openAiBody: { model: "gpt-5.6-sol", messages: [], stream: false },
      fetchImpl,
    });
  };

  // 核心回归：配额冷却时长的唯一准确来源是上游的结构化字段。此前整段
  // 响应被塞进 error.message，resets_at 退化成字符串的一部分，冷却回落到
  // 5 分钟默认值 —— 配额耗尽的凭证 5 分钟后又被撞一次。
  test("preserves structured upstream fields such as resets_at on 429", async () => {
    const upstream = {
      error: {
        type: "usage_limit_reached",
        message: "The usage limit has been reached",
        plan_type: "plus",
        resets_at: 1788140204,
        resets_in_seconds: 562676,
      },
    };
    const result = await call(429, JSON.stringify(upstream));
    expect(result.status).toBe(429);
    expect(result.body).toEqual(upstream);
    // 调用方仍然读得到 message（错误展示路径不变）。
    expect((result.body as any).error.message).toBe(
      "The usage limit has been reached",
    );
  });

  test("keeps the raw text wrapper for a non-JSON error page", async () => {
    const result = await call(502, "<html>bad gateway</html>");
    expect(result.body).toEqual({
      error: { message: "<html>bad gateway</html>" },
    });
  });

  test("falls back to statusText when the body is empty", async () => {
    const result = await call(500, "", "Internal Server Error");
    expect(result.body).toEqual({
      error: { message: "Internal Server Error" },
    });
  });

  test("keeps the wrapper when error is not an object", async () => {
    const result = await call(400, JSON.stringify({ error: "plain string" }));
    expect(result.body).toEqual({
      error: { message: JSON.stringify({ error: "plain string" }) },
    });
  });
});
