import { parseUpstreamErrorBody } from "core/chat/upstreamErrorBody";
import { randomUUID } from "node:crypto";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import {
  getAntigravityUserAgent,
  readAntigravityProjectId,
  resolveAntigravityCloudCodeBaseUrl,
} from "./antigravityOAuth";
import { resolveAntigravityWireModel } from "./antigravityWireModel";
import { parseSseDataLineJson } from "./sseDataLine";
import { readSseDataValues, streamSseDataValues } from "./sseFrames";
import {
  convertOpenAiMessagesToGemini,
  convertOpenAiToolsToGemini,
  accumulateGeminiChunks,
  accumulateGeminiStream,
  resolveGeminiModelQuirks,
  isGemini3Model,
} from "./geminiNativeShared";

const STREAM_PATH = "/v1internal:streamGenerateContent?alt=sse";

/**
 * Gemini 3 rejects any replayed `functionCall` part that has no
 * `thoughtSignature` ("Function call is missing a thought_signature ...", 400
 * INVALID_ARGUMENT), and gemini-3.5 在签名不合法时更隐蔽：不报错，直接返回
 * 空 STOP（0 completion tokens），表现为 agent「沉默」。
 *
 * thought_signature 捕获/回放/哨兵逻辑已提取到 geminiNativeShared.ts，
 * 供 antigravity 路径和 platform proxy native 路径共用。
 */

type AntigravityCloudCodeCallArgs = {
  agentConfig: AgentRuntimeAgentConfig;
  accessToken: string;
  metadata: Record<string, unknown> | null;
  openAiBody: {
    model?: unknown;
    messages: unknown[];
    tools?: unknown[];
  };
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
};

/**
 * Cloud Code Assist 对 Claude 模型期望 Claude Messages wire 格式
 * （messages 数组 + tool_use / tool_result + tool_use_id），而不是 Gemini 的
 * contents/functionCall/functionResponse。此前所有模型统一走 Gemini 格式，
 * 导致 Claude 模型在第二次调用回放 tool 结果时被网关 400 拒绝：
 *   messages.2.content.0.tool_result.tool_use_id: Field required
 *
 * 网关对请求体做严格 schema 校验，因此这里产出纯净的 Claude Messages 结构：
 * 不注入 cache_control、不注入 Claude Code 身份文本，避免未知字段被拒。
 */
/**
 * Cloud Code Assist 网关的 request schema 是 Gemini generateContent proto
 * （contents / systemInstruction / tools.functionDeclarations / generationConfig /
 * labels / sessionId），不认 Claude Messages 字段（messages/system/tools.name/
 * input_schema/max_tokens 都会被 protobuf 校验拒绝，HTTP 400）。
 *
 * Claude 模型也走 Gemini wire；网关内部把 Gemini contents 转成 Claude
 * messages 时，需要 functionResponse → tool_result 的 tool_use_id 关联，
 * 因此 convertOpenAiMessagesToGemini 在 functionResponse 上保留 OpenAI
 * tool_call_id（见 geminiNativeShared.ts）。labels.used_claude 告诉网关
 * 目标模型是 Claude。
 */
function buildCloudCodeAssistPayload(args: AntigravityCloudCodeCallArgs) {
  const projectId = readAntigravityProjectId(args.metadata);
  if (!projectId) {
    throw new Error(
      'Antigravity OAuth credential is missing metadata.projectId. Re-run `nolo auth antigravity`.',
    );
  }

  const logicalModel =
    asOptionalTrimmedString(args.openAiBody.model) ??
    asOptionalTrimmedString(args.agentConfig.model) ??
    "gemini-3.1-pro";
  const { wireModelId: model, profile } = resolveAntigravityWireModel(logicalModel);

  const rawMessages = Array.isArray(args.openAiBody.messages) ? args.openAiBody.messages : [];
  const quirks = resolveGeminiModelQuirks(model);
  const isClaude = quirks.isClaudeCrossModel;

  const { contents, systemTexts } = convertOpenAiMessagesToGemini(rawMessages, {
    attachSkipThoughtSignature: quirks.allowsThoughtSignatureSentinel,
  });
  if (contents.length === 0) {
    throw new Error("Antigravity Cloud Code Assist request has no user/model contents.");
  }

  const prompt = args.agentConfig.prompt?.trim();
  if (prompt) systemTexts.unshift(prompt);

  const request: Record<string, unknown> = { contents };
  if (systemTexts.length > 0) {
    request.systemInstruction = {
      role: "user",
      parts: systemTexts.map((text) => ({ text })),
    };
  }

  const tools = convertOpenAiToolsToGemini(
    Array.isArray(args.openAiBody.tools) ? (args.openAiBody.tools as unknown[]) : undefined,
  );
  if (tools) {
    request.tools = tools;
    request.toolConfig = { functionCallingConfig: { mode: "VALIDATED" } };
  }

  const generationConfig: Record<string, unknown> = {};
  if (profile?.maxOutputTokens) {
    generationConfig.maxOutputTokens = profile.maxOutputTokens;
  } else if (typeof args.agentConfig.max_tokens === "number" && args.agentConfig.max_tokens > 0) {
    generationConfig.maxOutputTokens = args.agentConfig.max_tokens;
  }
  if (typeof args.agentConfig.temperature === "number") {
    generationConfig.temperature = args.agentConfig.temperature;
  }
  if (Object.keys(generationConfig).length > 0) {
    request.generationConfig = generationConfig;
  }

  const agentId = randomUUID();
  const trajectoryId = randomUUID();
  const step = 2;
  const requestId = `agent/${agentId}/${Date.now()}/${trajectoryId}/${step}`;
  const labels: Record<string, string> = {
    trajectory_id: trajectoryId,
    last_step_index: String(step - 1),
    used_claude: String(isClaude),
    used_claude_conservative: String(isClaude),
  };
  if (profile?.modelEnum) {
    labels.model_enum = profile.modelEnum;
  }
  request.labels = labels;
  request.sessionId = `-${Math.floor(Math.random() * 9e15)}`;

  return {
    url: `${resolveAntigravityCloudCodeBaseUrl(args.agentConfig.customProviderUrl)}${STREAM_PATH}`,
    envelope: {
      project: projectId,
      model,
      request,
      requestId,
      requestType: "agent",
      userAgent: "antigravity",
    },
  };
}

async function readSseJsonChunks(response: Response): Promise<unknown[]> {
  return readSseDataValues(response, parseSseDataLineJson);
}

/** Call Cloud Code Assist and return an OpenAI chat.completion-shaped JSON body. */
/**
 * 上游 Gemini finishReason → OpenAI finish_reason。
 *
 * 聚合层此前硬编码推断（有 tool_calls → "tool_calls"，否则一律 "stop"），
 * 丢弃上游真实收尾原因：thinking 模型（gemini-3.8-flash 等）遇到大任务书
 * 时输出预算可能被思考耗尽——上游实际是 MAX_TOKENS 截断、正文零字，循环
 * 却把它判成 empty_completion 反复 repair，最后熔断成「模型连续返回空消
 * 息」（2026-09-05 收藏 OAuth agent 15KB 任务派发的实证根因）。
 * MAX_TOKENS → "length"（空轮兜底走 length_truncated，明确诊断不重试）；
 * SAFETY/RECITATION 类 → "content_filter"；未知/缺省维持 "stop"。
 */
function resolveAntigravityFinishReason(upstream?: string): string {
  const normalized = (upstream ?? "").trim().toUpperCase();
  if (normalized === "MAX_TOKENS") return "length";
  if (
    normalized === "SAFETY" ||
    normalized === "RECITATION" ||
    normalized === "PROHIBITED_CONTENT" ||
    normalized === "BLOCKLIST"
  ) {
    return "content_filter";
  }
  return "stop";
}

export async function fetchAntigravityCloudCodeCompletion(
  args: AntigravityCloudCodeCallArgs,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const { url, envelope } = buildCloudCodeAssistPayload(args);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": getAntigravityUserAgent(),
    },
    body: JSON.stringify(envelope),
    signal: args.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: response.status,
      // 保留上游结构：Antigravity 的限流 body 同样携带结构化的重置信息，
      // 压成字符串会让冷却退化成 5 分钟默认值。
      body: parseUpstreamErrorBody(errorText, response.statusText),
    };
  }

  const chunkStream = streamSseDataValues(response, parseSseDataLineJson);
  const { text, toolCalls, usage, finishReason, reasoningContent } =
    await accumulateGeminiStream(chunkStream, {
      onTextDelta: args.onTextDelta,
      onReasoningDelta: args.onReasoningDelta,
    });
  // 异常轮可观测（2026-09-05 排障教训）：owner 通道出现「200 + usage + 零正文」
  // 微输出轮（out 1-80，finishReason 未知），聚合层此前丢弃全部结构信息，
  // 事后只能从 usage 数字倒推。无正文且无工具时打出关键信号——低频（正常
  // 轮永不触发）、永久保留。
  if (!text && toolCalls.length === 0) {
    console.warn(
      `[antigravity] empty completion: finishReason=${JSON.stringify(finishReason)} reasoningLen=${reasoningContent?.length ?? 0} usage=${JSON.stringify(usage) ?? "none"} model=${String(envelope.model)} base=${new URL(url).host}`,
    );
  }
  // 200 空流防护：正文/思考/工具全空，且 finishReason 与 usage 也缺席——
  // 上游通道级异常（2026-09-05 实证：antigravity 软限流返回空 SSE，无任何
  // candidate 帧）。伪装成 finish_reason="stop" 的空补全会被 emptyAssistantRepair
  // 判成 empty_completion：repair 复调只会继续烧通道配额，最后熔断成误导性的
  // 「模型连续返回空消息」。返回 502 让 loop 直接以 LLM API error 终止——
  // 方向明确、不复调、可观测。finishReason 在场（如 SAFETY/MAX_TOKENS）的
  // 空正文轮不落入：那是上游明确表态，由既有 finish_reason 映射路径处理。
  const emptyStream =
    !text &&
    !reasoningContent &&
    toolCalls.length === 0 &&
    !finishReason &&
    !usage;
  if (emptyStream) {
    return {
      status: 502,
      body: {
        error: {
          message:
            "antigravity upstream returned an empty stream (no content, finishReason or usage); channel degradation, not model emptiness",
        },
      },
    };
  }
  const message: Record<string, unknown> = {
    role: "assistant",
    content: text || null,
  };
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }
  if (reasoningContent) {
    message.reasoning_content = reasoningContent;
  }

  return {
    status: 200,
    body: {
      choices: [
        {
          index: 0,
          message,
          finish_reason:
            toolCalls.length > 0
              ? "tool_calls"
              : resolveAntigravityFinishReason(finishReason),
        },
      ],
      ...(usage ? { usage } : {}),
    },
  };
}