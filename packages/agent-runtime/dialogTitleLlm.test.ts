import { BUILTIN_TITLE_LLM_CONFIG } from "../chat/dialog/actions/builtinDialogLlm";
import { describe, expect, test } from "bun:test";

import { generateLocalDialogTitle } from "./dialogTitleLlm";
import { resolveCliOpenAiProviderConfig } from "../cli/client/localProviderResolver";
import type { AgentRuntimeChatMessage } from "./types";

describe("generateLocalDialogTitle", () => {
  const messages: AgentRuntimeChatMessage[] = [
    { role: "user", content: "帮我规划东京四日游" },
    { role: "assistant", content: "好的，我来帮你规划..." },
  ];

  test("returns LLM-generated title on successful platform proxy response", async () => {
    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "东京四日慢旅行" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: ({ data }: { providerConfig: any; data: any }) => ({
        content: data?.choices?.[0]?.message?.content ?? "",
      }),
      fetchImpl: async () => fakeResponse as any,
      fallbackTitle: "fallback title",
    });

    expect(result.source).toBe("llm");
    expect(result.title).toBe("东京四日慢旅行");
  });

  test("passes system prompt and reasoning optimization to buildRequest/fetch on platform proxy path", async () => {
    let capturedMessages: any = null;
    let capturedFetchInit: any = null;
    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "东京四日慢旅行" } }],
        }),
    };

    await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: (args: any) => {
        capturedMessages = args.messages;
        return {
          url: "https://nolo.chat/api/v1/chat",
          init: { method: "POST", headers: {}, body: JSON.stringify({ model: BUILTIN_TITLE_LLM_CONFIG.model }) },
        };
      },
      parseResponse: ({ data }: { providerConfig: any; data: any }) => ({
        content: data?.choices?.[0]?.message?.content ?? "",
      }),
      fetchImpl: async (_url: any, init: any) => {
        capturedFetchInit = init;
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    expect(capturedMessages).toBeArray();
    expect(capturedMessages[0]).toEqual({
      role: "system",
      content: `${BUILTIN_TITLE_LLM_CONFIG.prompt}\n输出格式：返回 JSON 对象 {"title": "<标题>"}，除此之外不要有任何字符。`,
    });
    expect(capturedMessages[1]?.role).toBe("user");
    const parsedBody = JSON.parse(capturedFetchInit?.body as string);
    expect(parsedBody.model).toBe(BUILTIN_TITLE_LLM_CONFIG.model);
    expect(parsedBody.reasoning_effort).toBeUndefined();
    expect(parsedBody.response_format).toEqual({ type: "json_object" });
    expect(parsedBody.max_tokens).toBe(512);
  });

  test("title json mode unwraps {\"title\": ...} payloads before normalization", async () => {
    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "帮我规划上海三日美食旅行" }],
      env: { AUTH_TOKEN: "fake" },
      resolveProviderConfig: async () => ({ authToken: "fake" }),
      buildRequest: ({ messages }: any) => {
        return { url: "https://nolo.chat/api/v1/chat", init: { body: "{}" } };
      },
      parseResponse: () => ({ content: '{"title": "上海三日美食旅行"}' }),
      fetchImpl: async () => ({ ok: true, text: async () => "{}" }) as any,
      fallbackTitle: "fallback title",
    });
    expect(result).toEqual({ title: "上海三日美食旅行", source: "llm" });
  });

  test("title json payload with empty title degrades to fallback instead of leaking the JSON shell", async () => {
    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "hi" }],
      env: { AUTH_TOKEN: "fake" },
      resolveProviderConfig: async () => ({ authToken: "fake" }),
      buildRequest: () => ({ url: "https://nolo.chat/api/v1/chat", init: { body: "{}" } }),
      parseResponse: () => ({ content: '{"title": ""}' }),
      fetchImpl: async () => ({ ok: true, text: async () => "{}" }) as any,
      fallbackTitle: "fallback title",
    });
    expect(result).toEqual({ title: "fallback title", source: "fallback" });
  });


  test("platform existingTitle adds the stability instruction", async () => {
    let capturedMessages: any[] = [];
    await generateLocalDialogTitle({
      messages,
      existingTitle: "东京四日慢旅行",
      env: { AUTH_TOKEN: "fake" },
      resolveProviderConfig: async () => ({ authToken: "fake" }),
      buildRequest: ({ messages }: any) => {
        capturedMessages = messages;
        return { url: "https://nolo.chat/api/v1/chat", init: { body: "{}" } };
      },
      parseResponse: () => ({ content: "东京四日慢旅行" }),
      fetchImpl: async () => ({ ok: true, text: async () => "{}" }) as any,
      fallbackTitle: "fallback",
    });
    expect(capturedMessages[0].content).toContain("当前标题：东京四日慢旅行。如果对话仍在讨论同一主题");
  });

  test("direct existingTitle adds the stability instruction", async () => {
    let capturedBody: any;
    await generateLocalDialogTitle({
      messages,
      existingTitle: "东京四日慢旅行",
      env: { OPENAI_API_KEY: "local" },
      resolveProviderConfig: async () => ({ authToken: "" }),
      resolveDirectProviderConfig: async () => ({ endpoint: "http://localhost:11434/v1/chat/completions", apiKey: "local", model: "llama3" }),
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: "标题" } }] }) } as any;
      },
      fallbackTitle: "fallback",
    });
    expect(capturedBody.messages[0].content).toContain("当前标题：东京四日慢旅行。如果对话仍在讨论同一主题");
  });

  test("omits stability instruction without existingTitle and sends plain transcript", async () => {
    let capturedMessages: any[] = [];
    await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake" },
      resolveProviderConfig: async () => ({ authToken: "fake" }),
      buildRequest: ({ messages }: any) => {
        capturedMessages = messages;
        return { url: "https://nolo.chat/api/v1/chat", init: { body: "{}" } };
      },
      parseResponse: () => ({ content: "标题" }),
      fetchImpl: async () => ({ ok: true, text: async () => "{}" }) as any,
      fallbackTitle: "fallback",
    });
    expect(capturedMessages[0].content).toBe(
      `${BUILTIN_TITLE_LLM_CONFIG.prompt}\n输出格式：返回 JSON 对象 {"title": "<标题>"}，除此之外不要有任何字符。`,
    );
    expect(capturedMessages[1].content).toContain("User: ");
    expect(capturedMessages[1].content).not.toStartWith("[");
  });

  test("falls back when platform provider config has no authToken (logged out)", async () => {
    const result = await generateLocalDialogTitle({
      messages,
      env: {},
      resolveProviderConfig: async () => ({
        authToken: "",
        serverUrl: "",
        model: "",
        provider: "",
        endpoint: "",
      }),
      buildRequest: () => ({ url: "", init: {} as any }),
      parseResponse: () => ({ content: "" }),
      fetchImpl: async () => ({}) as any,
      fallbackTitle: "帮我规划东京四日游".slice(0, 80),
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("帮我规划东京四日游".slice(0, 80));
  });

  test("falls back when fetch fails (network error)", async () => {
    const result = await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: () => ({ content: "" }),
      fetchImpl: async () => {
        throw new Error("network error");
      },
      fallbackTitle: "network fallback",
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("network fallback");
  });

  test("falls back when LLM returns empty content", async () => {
    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "   " } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: ({ data }: { providerConfig: any; data: any }) => ({
        content: data?.choices?.[0]?.message?.content ?? "",
      }),
      fetchImpl: async () => fakeResponse as any,
      fallbackTitle: "empty content fallback",
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("empty content fallback");
  });

  test("falls back when HTTP response is not ok", async () => {
    const fakeResponse = {
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    };

    const result = await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: () => ({ content: "" }),
      fetchImpl: async () => fakeResponse as any,
      fallbackTitle: "403 fallback",
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("403 fallback");
  });

  test("falls back when no user/assistant messages exist", async () => {
    const result = await generateLocalDialogTitle({
      messages: [{ role: "system", content: "system prompt only" }],
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
      }),
      buildRequest: () => ({ url: "", init: {} as any }),
      parseResponse: () => ({ content: "" }),
      fetchImpl: async () => ({}) as any,
      fallbackTitle: "no messages fallback",
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("no messages fallback");
  });

  test("normalizes LLM output (strips extra formatting, truncates)", async () => {
    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: "## 标题\n**东京旅行规划讨论**\n\n",
              },
            },
          ],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages,
      env: { AUTH_TOKEN: "fake.jwt.token" },
      resolveProviderConfig: async () => ({
        authToken: "fake.jwt.token",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: ({ data }: { providerConfig: any; data: any }) => ({
        content: data?.choices?.[0]?.message?.content ?? "",
      }),
      fetchImpl: async () => fakeResponse as any,
      fallbackTitle: "fallback",
    });

    expect(result.source).toBe("llm");
    // normalizeDialogTitle strips markdown headers/bold and truncates to 36 chars
    expect(result.title).toContain("标题");
    expect(result.title).not.toContain("##");
    expect(result.title).not.toContain("**");
  });

  test("generates a title with a machine key (non-JWT bearer) — no local API key required", async () => {
    // Regression: a machine key (NOLO_MACHINE_API_KEY) is a valid server-proxy
    // bearer for the builtin title LLM. The TUI must not require a local user
    // API key or a JWT session for server-side title generation.
    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "机器学习模型选型" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages,
      // Only a machine key, no JWT AUTH_TOKEN, no OPENAI_API_KEY.
      env: { NOLO_MACHINE_API_KEY: "sk_machine_test" },
      resolveProviderConfig: async () => ({
        authToken: "sk_machine_test",
        serverUrl: "https://nolo.chat",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        endpoint: "https://api.deepseek.com/chat/completions",
      }),
      buildRequest: () => ({
        url: "https://nolo.chat/api/v1/chat",
        init: { method: "POST", headers: {}, body: "{}" },
      }),
      parseResponse: ({ data }: { providerConfig: any; data: any }) => ({
        content: data?.choices?.[0]?.message?.content ?? "",
      }),
      fetchImpl: async () => fakeResponse as any,
      fallbackTitle: "fallback title",
    });

    expect(result.source).toBe("llm");
    expect(result.title).toBe("机器学习模型选型");
  });

  test("supports direct local OpenAI-compatible provider when platform auth is missing", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "本地模型评估" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages,
      env: { OPENAI_API_KEY: "sk-local-test" },
      resolveProviderConfig: async () => ({
        authToken: "",
      }),
      resolveDirectProviderConfig: async () => ({
        endpoint: "http://localhost:11434/v1/chat/completions",
        apiKey: "sk-local-test",
        model: "llama3",
      }),
      fetchImpl: async (url: any, init: any) => {
        capturedUrl = url.toString();
        capturedBody = JSON.parse(init.body as string);
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    expect(result.source).toBe("llm");
    expect(result.title).toBe("本地模型评估");
    expect(capturedUrl).toBe("http://localhost:11434/v1/chat/completions");
    expect(capturedBody.model).toBe("llama3");
  });

  test("selects early 1-2 user turns + recent turns and formats image parts with [图片]", async () => {
    let capturedPromptContent = "";

    const multiTurnMessages: AgentRuntimeChatMessage[] = [
      { role: "user", content: "第一条早期用户提问关于数据库选型" },
      { role: "assistant", content: "推荐使用 PostgreSQL..." },
      { role: "user", content: "第二条早期用户问题关于索引" },
      { role: "assistant", content: "建立 B-tree 索引..." },
      { role: "user", content: "第三条中间提问" },
      { role: "assistant", content: "回复..." },
      { role: "user", content: [{ type: "text", text: "请分析这张架构图" }, { type: "image_url", image_url: { url: "https://ex.com/img.png" } }] as any },
      { role: "assistant", content: "分析结果如下..." },
    ];

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "数据库架构分析" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages: multiTurnMessages,
      env: { OPENAI_API_KEY: "sk-test" },
      resolveDirectProviderConfig: async () => ({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "deepseek-v4-flash",
      }),
      fetchImpl: async (_url: any, init: any) => {
        const body = JSON.parse(init.body as string);
        capturedPromptContent = body.messages[1].content;
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    expect(result.source).toBe("llm");
    expect(result.title).toBe("数据库架构分析");
    expect(capturedPromptContent).toContain("第一条早期用户提问关于数据库选型");
    expect(capturedPromptContent).toContain("第二条早期用户问题关于索引");
    expect(capturedPromptContent).toContain("[图片]");
    expect(capturedPromptContent).toContain("请分析这张架构图");
  });

  test("works with real resolveCliOpenAiProviderConfig direct resolution", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: any = null;
    let capturedHeaders: Record<string, string> | undefined;

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "直连解析生成的标题" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "测试真实直连解析器" }],
      env: { OPENAI_API_KEY: "sk-real-test-key" },
      resolveDirectProviderConfig: (args) =>
        resolveCliOpenAiProviderConfig({
          agentConfig: args.agentConfig,
          env: args.env,
        }),
      fetchImpl: async (url: any, init: any) => {
        capturedUrl = url.toString();
        capturedMethod = init.method;
        capturedBody = JSON.parse(init.body as string);
        capturedHeaders = init.headers as Record<string, string>;
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    // Real direct resolution chain: fetch is actually issued over the direct
    // branch (not swallowed by a platform-proxy throw), returns source:llm.
    expect(result.source).toBe("llm");
    expect(result.title).toBe("直连解析生成的标题");
    expect(capturedUrl).toContain("/v1/chat/completions");
    expect(capturedMethod).toBe("POST");
    // F5: the request body model comes from the resolved provider config
    // (BUILTIN glm-5-3-flash via the patched custom config), not a
    // hardcoded constant unrelated to resolution.
    expect(capturedBody.model).toBe("glm-5-3-flash");
    // HIGH-1(c): the env OPENAI_API_KEY must propagate through the custom
    // branch as a Bearer Authorization header — without it a real OpenAI
    // endpoint would 401. Previously the synthesized directAgentConfig carried
    // no apiKey, so the custom branch resolved apiKey:"" and sent no header.
    expect(capturedHeaders?.Authorization).toBe("Bearer sk-real-test-key");
  });

  test("uses the resolved model from a custom agentConfig, not the BUILTIN default", async () => {
    let capturedBody: any = null;

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "自定义模型标题" } }],
        }),
    };

    // A custom agentConfig carrying its own model + endpoint. The direct
    // branch must read the model from the resolved config, proving the body
    // model is driven by resolution rather than a hardcoded BUILTIN value.
    const customAgentConfig = {
      key: "custom-title-llm",
      apiSource: "custom" as const,
      useServerProxy: false,
      provider: "openai-compatible",
      model: "qwen2.5-72b",
      customProviderUrl: "http://localhost:11434/v1/chat/completions",
      apiKey: "sk-custom-key",
    };

    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "测试自定义模型" }],
      env: { OPENAI_API_KEY: "sk-custom-key" },
      agentConfig: customAgentConfig,
      resolveDirectProviderConfig: (args) =>
        resolveCliOpenAiProviderConfig({
          agentConfig: args.agentConfig,
          env: args.env,
        }),
      fetchImpl: async (_url: any, init: any) => {
        capturedBody = JSON.parse(init.body as string);
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    expect(result.source).toBe("llm");
    expect(result.title).toBe("自定义模型标题");
    // The body model is the resolved custom model, NOT the BUILTIN default.
    expect(capturedBody.model).toBe("qwen2.5-72b");
    expect(capturedBody.model).not.toBe("glm-5-3-flash");
  });

  test("OPENAI_API_KEY + local base URL → carries Authorization header (local ollama not skipped)", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    let fetchCalled = false;

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "本地带 key 标题" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "本地 ollama 带 key" }],
      env: {
        OPENAI_API_KEY: "sk-local-key",
        OPENAI_BASE_URL: "http://localhost:11434/v1",
      },
      resolveDirectProviderConfig: (args) =>
        resolveCliOpenAiProviderConfig({
          agentConfig: args.agentConfig,
          env: args.env,
        }),
      fetchImpl: async (_url: any, init: any) => {
        fetchCalled = true;
        capturedHeaders = init.headers as Record<string, string>;
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    // Local endpoint with a key: must still fetch (not skipped) and carry the
    // Bearer header — proves the env key propagates on the local path too.
    expect(fetchCalled).toBe(true);
    expect(result.source).toBe("llm");
    expect(result.title).toBe("本地带 key 标题");
    expect(capturedHeaders?.Authorization).toBe("Bearer sk-local-key");
  });

  test("doomed 401 combo (remote auth endpoint, no key) → fetch not called, returns fallback", async () => {
    let fetchCallCount = 0;

    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "注定 401" }],
      // No OPENAI_API_KEY, default base URL resolves to https://api.openai.com/v1
      // → remote auth endpoint with no key → must skip fetch entirely.
      env: {},
      resolveDirectProviderConfig: async () => ({
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4.1-mini",
        apiKey: "",
      }),
      fetchImpl: async () => {
        fetchCallCount += 1;
        return { ok: true, text: async () => "" } as any;
      },
      fallbackTitle: "注定 401 降级标题",
    });

    expect(fetchCallCount).toBe(0);
    expect(result.source).toBe("fallback");
    expect(result.title).toBe("注定 401 降级标题");
  });

  test("local ollama with no key is NOT skipped (legitimate no-auth local endpoint)", async () => {
    let fetchCallCount = 0;

    const fakeResponse = {
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "无 key 本地标题" } }],
        }),
    };

    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "本地无 key" }],
      env: { OPENAI_BASE_URL: "http://localhost:11434/v1" },
      resolveDirectProviderConfig: async () => ({
        endpoint: "http://localhost:11434/v1/chat/completions",
        model: "llama3",
        apiKey: "",
      }),
      fetchImpl: async () => {
        fetchCallCount += 1;
        return fakeResponse as any;
      },
      fallbackTitle: "fallback title",
    });

    // Local ollama with no key must NOT be flagged as doomed — it legitimately
    // serves without auth, so fetch is issued and the LLM title is returned.
    expect(fetchCallCount).toBe(1);
    expect(result.source).toBe("llm");
    expect(result.title).toBe("无 key 本地标题");
  });

  test("degrades to fallback when direct resolution throws, without bubbling", async () => {
    const result = await generateLocalDialogTitle({
      messages: [{ role: "user", content: "解析失败场景" }],
      env: { OPENAI_API_KEY: "sk-test" },
      resolveDirectProviderConfig: async () => {
        throw new Error("resolution blew up");
      },
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
      fallbackTitle: "安全降级标题",
    });

    expect(result.source).toBe("fallback");
    expect(result.title).toBe("安全降级标题");
  });
});