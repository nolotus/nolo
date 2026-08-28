import { describe, expect, test } from "bun:test";

import { fetchAntigravityCloudCodeCompletion } from "./antigravityCloudCodeProvider";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";

const agentConfig = {
  provider: "google-antigravity",
  model: "gemini-3.1-pro",
  apiKeyRef: "antigravity",
  customProviderUrl: "https://cloudcode-pa.googleapis.com",
} as AgentRuntimeAgentConfig;

describe("fetchAntigravityCloudCodeCompletion", () => {
  test("maps SSE chunks to OpenAI chat completion shape", async () => {
    const sseBody =
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"hello agy"}]}}],"usageMetadata":{"promptTokenCount":2,"candidatesTokenCount":3,"totalTokenCount":5}}}\n\n';

    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = String(url);
      expect(href).toContain("cloudcode-pa.googleapis.com");
      expect(href).toContain("streamGenerateContent");
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer agy-token");
      expect(headers["User-Agent"]).toContain("antigravity/hub/");
      const body = JSON.parse(String(init?.body)) as {
        project: string;
        model: string;
      };
      expect(body.project).toBe("test-project");
      expect(body.model).toBe("gemini-3.1-pro-low");
      return new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };

    const result = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [{ role: "user", content: "ping" }],
      },
      fetchImpl,
    });

    expect(result.status).toBe(200);
    const choice = result.body.choices as Array<{
      message: { content: string };
      finish_reason: string;
    }>;
    expect(choice[0]?.message?.content).toBe("hello agy");
    expect(choice[0]?.finish_reason).toBe("stop");
    const usage = result.body.usage as { total_tokens: number };
    expect(usage.total_tokens).toBe(5);
  });

  test("streams text and reasoning deltas live via onTextDelta and onReasoningDelta", async () => {
    const sseBody = [
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"pondering...","thought":true}]}}]}}',
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}}',
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"streaming "}]}}]}}',
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"world"}]}}],"usageMetadata":{"promptTokenCount":4,"candidatesTokenCount":6,"totalTokenCount":10}}}',
      "",
      "",
    ].join("\n");

    const textDeltas: string[] = [];
    const reasoningDeltas: string[] = [];

    const fetchImpl = async () =>
      new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });

    const result = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [{ role: "user", content: "hi" }],
      },
      onTextDelta: (c) => textDeltas.push(c),
      onReasoningDelta: (c) => reasoningDeltas.push(c),
      fetchImpl,
    });

    expect(result.status).toBe(200);
    const choice = result.body.choices as Array<{
      message: { content: string };
      finish_reason: string;
    }>;
    expect(choice[0]?.message?.content).toBe("Hello streaming world");
    expect(choice[0]?.finish_reason).toBe("stop");
    expect(textDeltas).toEqual(["Hello ", "streaming ", "world"]);
    expect(reasoningDeltas).toEqual(["pondering..."]);
    const usage = result.body.usage as { total_tokens: number };
    expect(usage.total_tokens).toBe(10);
  });

  test("attaches skip_thought_signature sentinel to replayed functionCall parts for gemini-3", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "run checkEnv" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "checkEnv", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "call_1", content: "{}" },
          { role: "user", content: "now echo hi" },
        ],
      },
      fetchImpl,
    });

    const modelTurn = capturedBody.request.contents.find(
      (c: any) => c.role === "model" && c.parts?.some((p: any) => p.functionCall),
    );
    const fnPart = modelTurn.parts.find((p: any) => p.functionCall);
    expect(fnPart.functionCall.name).toBe("checkEnv");
    expect(fnPart.thoughtSignature).toBe("skip_thought_signature_validator");
  });

  test("bridges adjacent assistant text and tool-call history into a valid Gemini turn sequence", async () => {
    let capturedBody: any;
    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "inspect" },
          { role: "assistant", content: "I will inspect first." },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "pwd", arguments: "{}" },
              },
            ],
          },
          { role: "tool", tool_call_id: "call_1", content: "/workspace" },
        ],
      },
      fetchImpl: async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });

    expect(capturedBody.request.contents.map((c: any) => c.role)).toEqual([
      "user",
      "model",
      "user",
    ]);
    expect(capturedBody.request.contents[1].parts).toEqual([
      { text: "I will inspect first." },
      {
        functionCall: { name: "pwd", args: {}, id: "call_1" },
        thoughtSignature: "skip_thought_signature_validator",
      },
    ]);
    expect(capturedBody.request.contents[2].parts[0].functionResponse.response.output).toBe(
      "/workspace",
    );
  });

  test("captures thoughtSignature from stream and replays the real one instead of the sentinel", async () => {
    // 1) 流式响应：functionCall part 自带签名 + 另一个调用只带前置 thought 签名
    const sseBody =
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"想一下","thought":true,"thoughtSignature":"sig-thought-1"},{"functionCall":{"name":"execBash","args":{"command":"ls"},"id":"c1"},"thoughtSignature":"sig-call-1"}]}}]}}\n\n' +
      'data: {"response":{"candidates":[{"content":{"parts":[{"functionCall":{"name":"readFile","args":{"path":"a.ts"},"id":"c2"}}]}}]}}\n\n';

    const first = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [{ role: "user", content: "ls 然后读 a.ts" }],
      },
      fetchImpl: async () =>
        new Response(sseBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    });

    const toolCalls = (first.body.choices as any[])[0].message.tool_calls;
    // 只忠实捕获 part 自身的签名；第二个调用没有签名是正常形状（并行调用只有第一个 part 带）
    expect(toolCalls[0].thought_signature).toBe("sig-call-1");
    expect(toolCalls[1].thought_signature).toBeUndefined();

    // 2) 回放：带真实签名的 tool_calls 不再使用哨兵
    let capturedBody: any;
    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "ls 然后读 a.ts" },
          { role: "assistant", content: "", tool_calls: toolCalls },
          { role: "tool", tool_call_id: "c1", content: "ok" },
          { role: "tool", tool_call_id: "c2", content: "file" },
          { role: "user", content: "继续" },
        ],
      },
      fetchImpl: async (_url: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          'data: {"response":{"candidates":[{"content":{"parts":[{"text":"done"}]}}]}}\n\n',
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });

    const modelTurn = capturedBody.request.contents.find(
      (c: any) => c.role === "model" && c.parts?.some((p: any) => p.functionCall),
    );
    const fnParts = modelTurn.parts.filter((p: any) => p.functionCall);
    expect(fnParts[0].thoughtSignature).toBe("sig-call-1");
    // 没有真实签名的后续 part 不带签名字段（也不塞哨兵）
    expect(fnParts[1].thoughtSignature).toBeUndefined();
    expect(fnParts[0].thoughtSignature).not.toBe("skip_thought_signature_validator");
  });

  test("captures thoughtSignature from preceding thought part for gemini-3-flash-preview", async () => {
    // gemini-3-flash-preview 将 thoughtSignature 放在前置 thought part 上，
    // functionCall part 自身不带签名。
    const sseBody =
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"想一下","thought":true,"thoughtSignature":"sig-from-thought"},{"functionCall":{"name":"loadSkill","args":{"name":"nolo-review"},"id":"c1"}}]}}]}}\n\n';

    const result = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "load review skill" }],
      },
      fetchImpl: async () =>
        new Response(sseBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    });

    const toolCalls = (result.body.choices as any[])[0].message.tool_calls;
    // thought part 的签名应被捕获并附加到 functionCall 上
    expect(toolCalls[0].thought_signature).toBe("sig-from-thought");
  });

  test("replays thought-part signature instead of sentinel for gemini-3-flash-preview", async () => {
    // 验证回放：捕获到的 thought part 签名在后续请求中正确回放
    const sseBody =
      'data: {"response":{"candidates":[{"content":{"parts":[{"text":"think","thought":true,"thoughtSignature":"sig-thought-2"},{"functionCall":{"name":"execBash","args":{"command":"pwd"},"id":"c3"}}]}}]}}\n\n';

    const first = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "run pwd" }],
      },
      fetchImpl: async () =>
        new Response(sseBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    });

    const toolCalls = (first.body.choices as any[])[0].message.tool_calls;
    expect(toolCalls[0].thought_signature).toBe("sig-thought-2");

    // 回放
    let capturedBody: any;
    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3-flash-preview",
        messages: [
          { role: "user", content: "run pwd" },
          { role: "assistant", content: "", tool_calls: toolCalls },
          { role: "tool", tool_call_id: "c3", content: "/home" },
          { role: "user", content: "next" },
        ],
      },
      fetchImpl: async (_url: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });

    const modelTurn = capturedBody.request.contents.find(
      (c: any) => c.role === "model" && c.parts?.some((p: any) => p.functionCall),
    );
    const fnPart = modelTurn.parts.find((p: any) => p.functionCall);
    expect(fnPart.thoughtSignature).toBe("sig-thought-2");
    expect(fnPart.thoughtSignature).not.toBe("skip_thought_signature_validator");
  });

  test("throws when projectId is missing", async () => {
    await expect(
      fetchAntigravityCloudCodeCompletion({
        agentConfig,
        accessToken: "t",
        metadata: {},
        openAiBody: { messages: [{ role: "user", content: "x" }] },
        fetchImpl: async () => new Response("", { status: 500 }),
      }),
    ).rejects.toThrow(/metadata\.projectId/);
  });

  test("converts image_url data URL parts into Gemini inlineData parts", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "评价下这个图" },
              {
                type: "image_url",
                image_url: { url: "data:image/png;base64,QUJD" },
              },
            ],
          },
        ],
      },
      fetchImpl,
    });

    const userContent = capturedBody.request.contents.find(
      (c: any) => c.role === "user",
    );
    expect(userContent).toBeDefined();
    const parts = userContent.parts as any[];
    // 文字 part 保留
    expect(parts.some((p) => p.text === "评价下这个图")).toBe(true);
    // 图片 part 转成 Gemini inlineData（mimeType + base64 data），不是 image_url
    const inline = parts.find((p) => p.inlineData);
    expect(inline).toBeDefined();
    expect(inline.inlineData.mimeType).toBe("image/png");
    expect(inline.inlineData.data).toBe("QUJD");
  });

  test("keeps an image-only user message even when there is no text", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } },
            ],
          },
        ],
      },
      fetchImpl,
    });

    // 修复前：messageText 对纯图片数组返回 ""，整条 user 消息被 `if (!text) continue` 丢弃。
    // 修复后：即使无文字，只要有 inlineData part，消息仍保留。
    const userContent = capturedBody.request.contents.find(
      (c: any) => c.role === "user",
    );
    expect(userContent).toBeDefined();
    const inline = userContent.parts.find((p: any) => p.inlineData);
    expect(inline.inlineData.mimeType).toBe("image/jpeg");
  });

  test("merges adjacent same-role entries and flushes pending functionCall responses for Gemini turns requirement", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "ls 然后读 a.ts" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              { id: "c1", function: { name: "execBash", arguments: "{}" } },
              { id: "c2", function: { name: "readFile", arguments: "{}" } },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "ok" },
          { role: "tool", tool_call_id: "c2", content: "file" },
          { role: "user", content: "继续" },
        ],
      },
      fetchImpl,
    });

    const contents = capturedBody.request.contents;
    // 应当严格是 [user, model, user] 3 个 Turn，并且后一个 user turn 包含了 2 个 functionResponse 和 1 个 text part
    expect(contents.length).toBe(3);
    expect(contents[0].role).toBe("user");
    expect(contents[1].role).toBe("model");
    expect(contents[2].role).toBe("user");
    expect(contents[2].parts.length).toBe(3);
    expect(contents[2].parts[0].functionResponse.name).toBe("execBash");
    expect(contents[2].parts[1].functionResponse.name).toBe("readFile");
    expect(contents[2].parts[2].text).toBe("继续");
  });

  test("auto-flushes missing functionResponse when user sends new message without tool response", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "算下 1+1" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              { id: "c1", function: { name: "calculator", arguments: "{}" } },
            ],
          },
          { role: "user", content: "算了不用算了" },
        ],
      },
      fetchImpl,
    });

    const contents = capturedBody.request.contents;
    expect(contents.length).toBe(3);
    expect(contents[1].role).toBe("model");
    expect(contents[2].role).toBe("user");
    expect(contents[2].parts.length).toBe(2);
    // 自动补全哑响应
    expect(contents[2].parts[0].functionResponse.name).toBe("calculator");
    expect(contents[2].parts[1].text).toBe("算了不用算了");
  });

  test("correctly matches tool responses to pending calls by id when multiple calls share the same function name", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [
          { role: "user", content: "执行两条命令" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              { id: "c1", function: { name: "execBash", arguments: "{\"cmd\":\"pwd\"}" } },
              { id: "c2", function: { name: "execBash", arguments: "{\"cmd\":\"whoami\"}" } },
            ],
          },
          { role: "tool", tool_call_id: "c2", content: "root" },
          { role: "tool", tool_call_id: "c1", content: "/app" },
        ],
      },
      fetchImpl,
    });

    const contents = capturedBody.request.contents;
    expect(contents.length).toBe(3);
    expect(contents[2].parts[0].functionResponse.response.output).toBe("root");
    expect(contents[2].parts[1].functionResponse.response.output).toBe("/app");
  });

  test("claude model keeps Gemini contents wire and functionResponse carries tool_use id", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    const claudeAgentConfig = {
      ...agentConfig,
      model: "claude-opus-4-6-thinking",
      prompt: "You are a careful reviewer.",
      max_tokens: 4096,
    } as AgentRuntimeAgentConfig;

    await fetchAntigravityCloudCodeCompletion({
      agentConfig: claudeAgentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "claude-opus-4-6-thinking",
        messages: [
          { role: "system", content: "system-policy" },
          { role: "user", content: "run pwd" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              { id: "c1", function: { name: "execBash", arguments: "{\"cmd\":\"pwd\"}" } },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "/app" },
        ],
        tools: [
          {
            type: "function",
            function: { name: "execBash", description: "run shell", parameters: { type: "object" } },
          },
        ],
      },
      fetchImpl,
    });

    const request = capturedBody.request;
    // Gateway schema is Gemini proto: contents array, never Claude messages/system.
    expect(Array.isArray(request.contents)).toBe(true);
    expect(request.messages).toBeUndefined();
    expect(request.system).toBeUndefined();

    // systemInstruction collects prompt + system message.
    const systemTexts = request.systemInstruction.parts.map(
      (p: { text: string }) => p.text,
    );
    expect(systemTexts).toEqual(["You are a careful reviewer.", "system-policy"]);

    // assistant functionCall carries id.
    const assistant = request.contents[1];
    expect(assistant.role).toBe("model");
    expect(assistant.parts[0].functionCall.name).toBe("execBash");
    expect(assistant.parts[0].functionCall.id).toBe("c1");
    expect(assistant.parts[0].functionCall.args).toEqual({ cmd: "pwd" });

    // tool result mapped to user functionResponse that carries the tool_use id
    // — the field the gateway needs to build tool_result.tool_use_id.
    const toolResp = request.contents[2];
    expect(toolResp.role).toBe("user");
    expect(toolResp.parts[0].functionResponse.name).toBe("execBash");
    expect(toolResp.parts[0].functionResponse.id).toBe("c1");
    expect(toolResp.parts[0].functionResponse.response.output).toBe("/app");

    // Gemini tools use functionDeclarations; labels still carry claude flags.
    expect(request.tools[0].functionDeclarations[0].name).toBe("execBash");
    expect(request.labels.used_claude).toBe("true");
  });

  test("claude model merges consecutive tool_results into one user message", async () => {
    let capturedBody: any;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        'data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}}\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } },
      );
    };

    const claudeAgentConfig = {
      ...agentConfig,
      model: "claude-opus-4-6-thinking",
    } as AgentRuntimeAgentConfig;

    await fetchAntigravityCloudCodeCompletion({
      agentConfig: claudeAgentConfig,
      accessToken: "agy-token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "claude-opus-4-6-thinking",
        messages: [
          { role: "user", content: "run two commands" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              { id: "c1", function: { name: "execBash", arguments: "{\"cmd\":\"pwd\"}" } },
              { id: "c2", function: { name: "execBash", arguments: "{\"cmd\":\"whoami\"}" } },
            ],
          },
          { role: "tool", tool_call_id: "c1", content: "/app" },
          { role: "tool", tool_call_id: "c2", content: "root" },
        ],
      },
      fetchImpl,
    });

    const request = capturedBody.request;
    // Gemini wire: consecutive tool results merge into one user content
    // (pushOrMergeContent), each functionResponse carrying its tool_use id.
    const toolMsg = request.contents[2];
    expect(toolMsg.role).toBe("user");
    expect(toolMsg.parts.length).toBe(2);
    expect(toolMsg.parts[0].functionResponse.id).toBe("c1");
    expect(toolMsg.parts[0].functionResponse.name).toBe("execBash");
    expect(toolMsg.parts[1].functionResponse.id).toBe("c2");
    expect(toolMsg.parts[1].functionResponse.name).toBe("execBash");
    expect(request.contents.length).toBe(3);
  });
});
describe("upstream error body shape", () => {
  // 与 codex 同源的缺陷：把结构化上游错误压成字符串，会让 429 冷却读不到
  // 重置时间、回落到 5 分钟默认值，配额耗尽的凭证 5 分钟后又被撞一次。
  test("preserves structured upstream fields on 429", async () => {
    const upstream = {
      error: {
        code: 429,
        message: "Resource has been exhausted",
        status: "RESOURCE_EXHAUSTED",
        details: [
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "42s" },
        ],
      },
    };
    const result = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [{ role: "user", content: "ping" }],
        stream: false,
      },
      fetchImpl: (async () =>
        new Response(JSON.stringify(upstream), { status: 429 })) as any,
    } as any);

    expect(result.status).toBe(429);
    expect(result.body).toEqual(upstream);
    expect((result.body as any).error.details[0].retryDelay).toBe("42s");
  });

  test("keeps the text wrapper for a non-JSON error page", async () => {
    const result = await fetchAntigravityCloudCodeCompletion({
      agentConfig,
      accessToken: "token",
      metadata: { projectId: "test-project" },
      openAiBody: {
        model: "gemini-3.1-pro",
        messages: [{ role: "user", content: "ping" }],
        stream: false,
      },
      fetchImpl: (async () =>
        new Response("<html>gateway</html>", { status: 502 })) as any,
    } as any);

    expect(result.body).toEqual({ error: { message: "<html>gateway</html>" } });
  });
});
