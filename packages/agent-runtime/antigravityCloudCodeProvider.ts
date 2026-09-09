import { parseUpstreamErrorBody } from "core/chat/upstreamErrorBody";
import { randomUUID } from "node:crypto";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import type { AgentRuntimeToolCall } from "./types";
import type {
  AntigravityProviderEvent,
  AntigravityProviderFailure,
  AntigravitySemanticResult,
} from "./antigravitySemanticTypes";
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

export type AntigravityProviderCallSnapshot = {
  model: unknown;
  request: {
    contents: unknown;
    systemInstruction?: unknown;
    tools?: unknown;
    toolConfig?: unknown;
    generationConfig?: unknown;
    labels?: Record<string, unknown>;
  };
  requestType: unknown;
};

/**
 * Stable provider-call contract for comparing credential routes.
 *
 * Deliberately keeps model/wire/tool/signature and provider-semantic labels
 * (such as used_claude, used_claude_conservative, model_enum). It removes only
 * per-call or identity/transport entropy: project, requestId, sessionId,
 * trajectory/step entropy (trajectory_id, last_step_index), userAgent, URL host,
 * and Authorization are not provider semantics.
 */
export function snapshotAntigravityProviderCall(
  envelope: Record<string, unknown>,
): AntigravityProviderCallSnapshot {
  const request = envelope.request;
  const requestRecord = request && typeof request === "object"
    ? (request as Record<string, unknown>)
    : {};

  let semanticLabels: Record<string, unknown> | undefined;
  if (requestRecord.labels && typeof requestRecord.labels === "object") {
    const rawLabels = requestRecord.labels as Record<string, unknown>;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawLabels)) {
      if (key === "trajectory_id" || key === "last_step_index") continue;
      filtered[key] = value;
    }
    if (Object.keys(filtered).length > 0) {
      semanticLabels = filtered;
    }
  }

  return {
    model: envelope.model,
    request: {
      contents: requestRecord.contents,
      ...( "systemInstruction" in requestRecord
        ? { systemInstruction: requestRecord.systemInstruction }
        : {}),
      ...( "tools" in requestRecord ? { tools: requestRecord.tools } : {}),
      ...( "toolConfig" in requestRecord ? { toolConfig: requestRecord.toolConfig } : {}),
      ...( "generationConfig" in requestRecord
        ? { generationConfig: requestRecord.generationConfig }
        : {}),
      ...( semanticLabels ? { labels: semanticLabels } : {} ),
    },
    requestType: envelope.requestType,
  };
}

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
export function resolveAntigravityFinishReason(upstream?: string): string {
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

export type {
  AntigravityProviderEvent,
  AntigravityProviderFailure,
  AntigravitySemanticResult,
};

export type AntigravityDecodedCompletion = {
  text: string;
  toolCalls: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
  finishReason?: string;
  reasoningContent?: string;
  events: AntigravityProviderEvent[];
};

/** Normalize decoded Gemini output once, then expose the legacy facade unchanged. */
export function normalizeAntigravityCompletion(
  decoded: AntigravityDecodedCompletion,
): AntigravitySemanticResult {
  const { text, toolCalls, usage, finishReason, reasoningContent, events } = decoded;
  const normalizedFinishReason = (finishReason ?? "").trim().toUpperCase();
  if (!text && !reasoningContent && toolCalls.length === 0 && !finishReason && !usage) {
    const body = {
      error: {
        message:
          "antigravity upstream returned an empty stream (no content, finishReason or usage); channel degradation, not model emptiness",
      },
      provider_events: events,
    };
    return {
      status: 502,
      text: "",
      toolCalls: [],
      providerEvents: events,
      body,
    };
  }
  if (normalizedFinishReason === "MALFORMED_FUNCTION_CALL") {
    const message =
      "antigravity upstream returned MALFORMED_FUNCTION_CALL (model generated an invalid function call or tool arguments were rejected by upstream)";
    const providerFailure: AntigravityProviderFailure = {
      kind: "provider_failure",
      provider: "antigravity",
      code: "MALFORMED_FUNCTION_CALL",
      message,
      providerReason: "MALFORMED_FUNCTION_CALL",
      retryable: false,
      status: 502,
    };
    return {
      status: 502,
      text: "",
      toolCalls: [],
      finishReason,
      providerEvents: events,
      providerFailure,
      runtimeProviderFailure: {
        message: providerFailure.message,
        retryable: providerFailure.retryable,
      },
      body: {
        error: {
          message,
          code: "MALFORMED_FUNCTION_CALL",
          category: "malformed_function_call",
          providerReason: "MALFORMED_FUNCTION_CALL",
          retryable: false,
        },
        provider_failure: providerFailure,
        provider_events: events,
      },
    };
  }
  const message: Record<string, unknown> = {
    role: "assistant",
    content: text || null,
  };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;
  if (reasoningContent) message.reasoning_content = reasoningContent;
  return {
    status: 200,
    text,
    ...(reasoningContent ? { reasoningContent } : {}),
    toolCalls,
    ...(usage ? { usage } : {}),
    ...(finishReason ? { finishReason } : {}),
    providerEvents: events,
    body: {
      choices: [{
        index: 0,
        message,
        finish_reason:
          toolCalls.length > 0
            ? "tool_calls"
            : resolveAntigravityFinishReason(finishReason),
      }],
      ...(usage ? { usage } : {}),
      provider_events: events,
    },
  };
}

export async function fetchAntigravityCloudCodeCompletion(
  args: AntigravityCloudCodeCallArgs,
): Promise<AntigravitySemanticResult> {
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
      text: "",
      toolCalls: [],
      providerEvents: [],
      // 保留上游结构：Antigravity 的限流 body 同样携带结构化的重置信息，
      // 压成字符串会让冷却退化成 5 分钟默认值。
      body: parseUpstreamErrorBody(errorText, response.statusText),
    };
  }

  const chunkStream = streamSseDataValues(response, parseSseDataLineJson);
  const { text, toolCalls, usage, finishReason, reasoningContent, events } =
    await accumulateGeminiStream(chunkStream, {
      onTextDelta: args.onTextDelta,
      onReasoningDelta: args.onReasoningDelta,
    });
  // The decoder produces the semantic result; this call is the compatibility bridge.
  const normalized = normalizeAntigravityCompletion({
    text,
    toolCalls,
    usage,
    finishReason,
    reasoningContent,
    events,
  });
  if (normalized.status !== 200 || (!text && toolCalls.length === 0)) {
    console.warn(
      `[antigravity] empty completion: finishReason=${JSON.stringify(finishReason)} reasoningLen=${reasoningContent?.length ?? 0} usage=${JSON.stringify(usage) ?? "none"} model=${String(envelope.model)} base=${new URL(url).host}`,
    );
  }
  return normalized;
}