/**
 * Gemini Native generateContent 共享协议与模型怪癖适配器（Google/Antigravity Quirk Matrix）。
 *
 * 遵循 Agent Harness Playbook 原则：将 Google/Gemini 专有的线格式、状态机与怪癖隔离在共享层。
 *
 * 核心调用路径（三条共用）：
 * - 路径A: antigravityCloudCodeProvider（Google Cloud Code Assist / Antigravity OAuth）
 * - 路径B: server chatHandler → googleNativeChat（平台托管代理直连 Google AI API）
 * - 路径C: googleNativeChat image（多模态视觉图像专属路径）
 *
 * 核心模型怪癖与契约（Gemini Specific Quirks）：
 * 1. 【Thought Signature 签名不变式】：
 *    - 捕获：从流式响应中提取 `thoughtSignature`（存在于 `functionCall` part 自身或前置 `thought` part 中）；
 *    - 回放：多轮历史重放时必须将签名原样挂载回 `functionCall` part；
 *    - 失败模式：gemini-3 缺失签名报错 400（INVALID_ARGUMENT）；而 gemini-3.5 / flash-preview 更为隐蔽——
 *      若签名不合法直接返回空 STOP 帧（0 completion tokens，模型假死沉默）；
 *    - 哨兵兼容：`SKIP_THOUGHT_SIGNATURE`（"skip_thought_signature_validator"）仅 gemini-3 允许兜底，3.5 必须真实签名。
 *
 * 2. 【严格的角色交替与 Tool 响应闭合（Turn Alternation & Auto-Flush）】：
 *    - Gemini API 强制要求 `user` 与 `model` 严格交替出现，相邻同角色消息必须合并；
 *    - 每个 `functionCall` 必须紧随对应的 `functionResponse`。若用户未回传 tool 输出即发送新指令，
 *      必须自动 flush 补齐占位 `functionResponse`，否则 API 报 400 拒绝。
 *
 * 3. 【Cloud Code 网关跨模型（Claude on Cloud Code）映射】：
 *    - 网关 request schema 为 Gemini proto，但后端运行 Claude 时需借助 `functionResponse.id`
 *      建立 `tool_result` 关联，并打上 `labels.used_claude` 标签。
 */

import type { AgentRuntimeChatMessage, AgentRuntimeToolCall } from "./types";

/** 哨兵：gemini-3 可用，gemini-3.5/flash-preview 不接受。 */
export const SKIP_THOUGHT_SIGNATURE = "skip_thought_signature_validator";

/** Gemini / Google 模型的显式怪癖特征（Quirk Matrix） */
export type GeminiModelQuirks = {
  /** 是否需要 Thought Signature 签名回放（Gemini 3 家族） */
  requiresThoughtSignature: boolean;
  /** 当缺失真实签名时，是否允许使用哨兵兜底（gemini-3 允许；3.5 / flash-preview 必须真实签名） */
  allowsThoughtSignatureSentinel: boolean;
  /** 是否是经由 Gemini Wire 代理的 Claude 跨模型 */
  isClaudeCrossModel: boolean;
};

/** 解析 Gemini 家族模型及跨模型代理的特征矩阵 */
export function resolveGeminiModelQuirks(modelId: string): GeminiModelQuirks {
  const lower = modelId.toLowerCase();
  const isGemini3 = lower.includes("gemini-3");
  const isStrictSignatureModel =
    lower.includes("gemini-3.5") || lower.includes("flash-preview");
  const isClaude = lower.includes("claude");

  return {
    requiresThoughtSignature: isGemini3,
    allowsThoughtSignatureSentinel: isGemini3 && !isStrictSignatureModel,
    isClaudeCrossModel: isClaude,
  };
}

/** Gemini 3 family gates the thought_signature requirement. (保持兼容别名) */
export function isGemini3Model(modelId: string): boolean {
  return resolveGeminiModelQuirks(modelId).requiresThoughtSignature;
}

// ---- Types ----

export type GeminiPart =
  | { text: string }
  | {
      functionCall: {
        name: string;
        args: Record<string, unknown>;
        id?: string;
      };
      thoughtSignature?: string;
    }
  | { functionResponse: { name: string; response: { output: string }; id?: string } }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type GeminiFunctionDeclaration = {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
};

// ---- Message conversion (OpenAI → Gemini) ----

function messageText(
  content: AgentRuntimeChatMessage["content"],
): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (part): part is { type: "text"; text: string } => part?.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function parseDataUrlToInlineData(
  url: string,
): { mimeType: string; data: string } | null {
  const match =
    /^data:([A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]*)$/.exec(
      url,
    );
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractInlineDataParts(
  content: AgentRuntimeChatMessage["content"],
): { inlineData: { mimeType: string; data: string } }[] {
  if (!Array.isArray(content)) return [];
  const parts: { inlineData: { mimeType: string; data: string } }[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    if (part.type !== "image_url") continue;
    const url = (part as { image_url?: { url?: string } }).image_url?.url;
    if (typeof url !== "string" || !url.trim()) continue;
    const inline = parseDataUrlToInlineData(url);
    if (inline) parts.push({ inlineData: inline });
  }
  return parts;
}

/**
 * Convert OpenAI-format messages to Gemini generateContent contents.
 *
 * Handles thoughtSignature replay:
 * - If a tool_call has a real thought_signature, it's attached to the
 *   functionCall part.
 * - If not, and attachSkipThoughtSignature is true, the sentinel is attached
 *   to the first functionCall part in each assistant turn (gemini-3 fallback).
 * - Subsequent functionCall parts in the same turn never get the sentinel
 *   (matches Gemini's native shape where only the first part carries it).
 */
export function convertOpenAiMessagesToGemini(
  messages: unknown[],
  options: { attachSkipThoughtSignature: boolean },
): { contents: GeminiContent[]; systemTexts: string[] } {
  const contents: GeminiContent[] = [];
  const systemTexts: string[] = [];
  let toolCallIndex = 0;
  let pendingFunctionCalls: Array<{ name: string; id: string }> = [];

  const pushOrMergeContent = (role: "user" | "model", parts: GeminiPart[]) => {
    if (parts.length === 0) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  };

  const flushPendingFunctionCalls = () => {
    if (pendingFunctionCalls.length === 0) return;
    const dummyResponses: GeminiPart[] = pendingFunctionCalls.map(
      ({ name, id }) => ({
        functionResponse: {
          name,
          response: { output: "{}" },
          ...(id ? { id } : {}),
        },
      }),
    );
    pendingFunctionCalls = [];
    pushOrMergeContent("user", dummyResponses);
  };

  for (const raw of messages) {
    if (!raw || typeof raw !== "object" || !("role" in raw)) continue;
    const role = String((raw as { role: unknown }).role);
    const content =
      "content" in raw ? (raw as { content: unknown }).content : null;

    if (role === "system") {
      const text = messageText(
        content as AgentRuntimeChatMessage["content"],
      );
      if (text) systemTexts.push(text);
      continue;
    }

    if (role === "user") {
      flushPendingFunctionCalls();
      const text = messageText(
        content as AgentRuntimeChatMessage["content"],
      );
      const imageParts = extractInlineDataParts(
        content as AgentRuntimeChatMessage["content"],
      );
      if (!text && imageParts.length === 0) continue;
      const parts: GeminiPart[] = [];
      if (text) parts.push({ text });
      for (const img of imageParts) parts.push(img);
      pushOrMergeContent("user", parts);
      continue;
    }

    if (role === "assistant") {
      flushPendingFunctionCalls();
      const text = messageText(
        content as AgentRuntimeChatMessage["content"],
      );

      const toolCalls =
        "tool_calls" in raw &&
        Array.isArray((raw as { tool_calls: unknown }).tool_calls)
          ? ((raw as { tool_calls: AgentRuntimeToolCall[] }).tool_calls ?? [])
          : [];

      // Gemini 原生 generateContent 支持在同一个 model turn 内同时包含 text 和 functionCall。
      // 历史上的 commit (0cf98483c) 曾尝试用空 user 轮 `{ role: "user", parts: [{ text: "" }] }` 桥接，
      // 但 Google Antigravity / Gemini 网关会过滤掉空文本 user turn，导致连续两个 model turn 直接相撞，
      // 触发 HTTP 400 "Please ensure that function call turn comes immediately after a user turn..."。
      // 因此将 text 与 tool_calls 统一放入当前 model turn，由 pushOrMergeContent 保持标准 user ↔ model 交替。
      const parts: GeminiPart[] = [];
      if (text) {
        parts.push({ text });
      }

      for (const call of toolCalls) {
        const name = call?.function?.name?.trim();
        if (!name) continue;
        const id = call.id?.trim() || `${name}_${toolCallIndex++}`;
        pendingFunctionCalls.push({ name, id });

        const realSignature =
          typeof call.thought_signature === "string" &&
          call.thought_signature
            ? call.thought_signature
            : undefined;
        const isFirstFunctionCallPart = !parts.some(
          (p) => "functionCall" in p,
        );
        const signature =
          realSignature ??
          (options.attachSkipThoughtSignature && isFirstFunctionCallPart
            ? SKIP_THOUGHT_SIGNATURE
            : undefined);

        const part: GeminiPart = {
          functionCall: {
            name,
            args: parseToolArgs(call.function?.arguments),
            ...(id ? { id } : {}),
          },
          ...(signature ? { thoughtSignature: signature } : {}),
        };
        parts.push(part);
      }
      pushOrMergeContent("model", parts);
      continue;
    }

    if (role === "tool") {
      const toolCallId =
        "tool_call_id" in raw &&
        typeof (raw as { tool_call_id: unknown }).tool_call_id === "string"
          ? (raw as { tool_call_id: string }).tool_call_id
          : "";
      const rawName =
        "name" in raw &&
        typeof (raw as { name: unknown }).name === "string"
          ? (raw as { name: string }).name.trim()
          : "";
      // A tool result is only valid immediately after its matching function
      // call. Partial syncs and retries can leave orphaned/duplicate tool
      // messages in TUI history; forwarding them creates a Gemini user turn
      // with no preceding functionCall and Cloud Code Assist rejects it.
      const pendingIndex = pendingFunctionCalls.findIndex((p) =>
        toolCallId ? p.id === toolCallId : rawName ? p.name === rawName : true,
      );
      if (pendingIndex === -1) continue;
      const [{ name, id }] = pendingFunctionCalls.splice(pendingIndex, 1);

      const output =
        messageText(content as AgentRuntimeChatMessage["content"]) || "{}";
      pushOrMergeContent("user", [
        {
          functionResponse: {
            name,
            response: { output },
            // 保留 OpenAI tool_call_id：antigravity Cloud Code Assist 网关把
            // Gemini contents 转成 Claude messages 时需要 functionResponse →
            // tool_result 的 tool_use_id；缺 id 时网关报
            // "tool_result.tool_use_id: Field required"（HTTP 400）。
            ...(id ? { id } : {}),
          },
        },
      ]);
    }
  }

  flushPendingFunctionCalls();

  // Gemini API 约束：contents 数组必须以 user 角色起始。
  // 若传入的历史消息首条为 assistant（例如历史摘要 projectDialogHistoryWithSummary 截断至
  // assistant tool_call，或 preset 初始化时），contents[0] 为 model。若该 model 轮包含 functionCall，
  // Google Cloud Code Assist / Gemini 原生网关会校验失败并返回 HTTP 400：
  // "Please ensure that function call turn comes immediately after a user turn or after a function response turn."。
  // 此处在前置自动注入占位 user 轮，确保交替状态机与首轮约束始终满足。
  if (contents.length > 0 && contents[0]?.role === "model") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Continue the conversation." }],
    });
  }

  return { contents, systemTexts };
}

function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Convert OpenAI-format tools to Gemini functionDeclarations.
 */
export function convertOpenAiToolsToGemini(
  tools: unknown[] | undefined,
): GeminiFunctionDeclaration[] | undefined {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  const declarations: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }[] = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== "object" || !("function" in tool)) continue;
    const fn = (tool as { function: Record<string, unknown> }).function;
    const name = typeof fn.name === "string" ? fn.name : "";
    if (!name) continue;
    declarations.push({
      name,
      description: typeof fn.description === "string" ? fn.description : "",
      parameters: (fn.parameters ?? { type: "object", properties: {} }) as Record<string, unknown>,
    });
  }
  if (declarations.length === 0) return undefined;
  return [{ functionDeclarations: declarations }];
}

// ---- Response accumulation (Gemini SSE → OpenAI tool_calls) ----

export type GeminiChunkAccumulatorOptions = {
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
};

export type GeminiAccumulatorState = {
  text: string;
  toolCalls: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
  pendingThoughtSignature?: string;
};

export function createGeminiAccumulatorState(): GeminiAccumulatorState {
  return {
    text: "",
    toolCalls: [],
  };
}

/**
 * Apply a single Gemini SSE chunk to the accumulator state, invoking stream callbacks.
 */
export function applyGeminiChunk(
  chunk: unknown,
  state: GeminiAccumulatorState,
  options?: GeminiChunkAccumulatorOptions,
): void {
  if (!chunk || typeof chunk !== "object") return;
  const response: Record<string, unknown> =
    "response" in chunk && chunk.response && typeof chunk.response === "object"
      ? (chunk.response as Record<string, unknown>)
      : (chunk as Record<string, unknown>);

  if (
    "usageMetadata" in response &&
    response.usageMetadata &&
    typeof response.usageMetadata === "object"
  ) {
    const meta = response.usageMetadata as Record<string, unknown>;
    const prompt =
      typeof meta.promptTokenCount === "number" ? meta.promptTokenCount : 0;
    const candidates =
      typeof meta.candidatesTokenCount === "number"
        ? meta.candidatesTokenCount
        : 0;
    const total =
      typeof meta.totalTokenCount === "number"
        ? meta.totalTokenCount
        : prompt + candidates;
    // Gemini implicit context caching: cachedContentTokenCount is a subset of
    // promptTokenCount, matching our canonical `input_tokens` = total-input
    // semantics (normalizeUsage reads cache_read_input_tokens directly).
    const cached =
      typeof meta.cachedContentTokenCount === "number" &&
      Number.isFinite(meta.cachedContentTokenCount)
        ? // cached ⊆ prompt；对畸形上游防御性钳位，避免 cache_read > input 破坏归一化与计费
          Math.min(Math.max(0, Math.floor(meta.cachedContentTokenCount)), prompt)
        : 0;
    state.usage = {
      prompt_tokens: prompt,
      completion_tokens: candidates,
      total_tokens: total,
      ...(cached > 0 ? { cache_read_input_tokens: cached } : {}),
    };
  }

  const candidates = Array.isArray(response.candidates)
    ? response.candidates
    : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const parts = Array.isArray(
      (candidate as { content?: { parts?: unknown[] } }).content?.parts,
    )
      ? (candidate as { content: { parts: unknown[] } }).content.parts
      : [];
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const partSignature = (part as { thoughtSignature?: unknown })
        .thoughtSignature;
      const isThought = Boolean((part as { thought?: boolean }).thought);
      if (
        "text" in part &&
        typeof (part as { text: unknown }).text === "string"
      ) {
        const piece = (part as { text: string }).text;
        if (!isThought) {
          state.text += piece;
          if (piece && options?.onTextDelta) {
            options.onTextDelta(piece);
          }
        } else {
          if (piece && options?.onReasoningDelta) {
            options.onReasoningDelta(piece);
          }
        }
      }
      // Capture thoughtSignature from thought parts (gemini-3-flash-preview)
      if (
        isThought &&
        typeof partSignature === "string" &&
        partSignature
      ) {
        state.pendingThoughtSignature = partSignature;
      }
      if (
        "functionCall" in part &&
        (part as { functionCall: unknown }).functionCall
      ) {
        const call = (part as { functionCall: Record<string, unknown> })
          .functionCall;
        const name = typeof call.name === "string" ? call.name : "tool";
        const id =
          typeof call.id === "string"
            ? call.id
            : `${name}_${state.toolCalls.length}`;
        const argsObj =
          call.args && typeof call.args === "object"
            ? (call.args as Record<string, unknown>)
            : {};
        const resolvedSignature =
          typeof partSignature === "string" && partSignature
            ? partSignature
            : state.pendingThoughtSignature;
        state.pendingThoughtSignature = undefined;
        state.toolCalls.push({
          id,
          type: "function",
          function: { name, arguments: JSON.stringify(argsObj) },
          ...(typeof resolvedSignature === "string" && resolvedSignature
            ? { thought_signature: resolvedSignature }
            : {}),
        });
      }
    }
  }
}

/**
 * Accumulate Gemini generateContent SSE chunks into text + tool_calls.
 *
 * Captures thoughtSignature from:
 * 1. functionCall part's own thoughtSignature field
 * 2. Preceding thought part's thoughtSignature (gemini-3-flash-preview pattern)
 *
 * The pending signature from a thought part is passed to the immediately
 * following functionCall part, then cleared.
 */
export function accumulateGeminiChunks(
  chunks: unknown[],
  options?: GeminiChunkAccumulatorOptions,
): {
  text: string;
  toolCalls: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
} {
  const state = createGeminiAccumulatorState();
  for (const chunk of chunks) {
    applyGeminiChunk(chunk, state, options);
  }
  return {
    text: state.text,
    toolCalls: state.toolCalls,
    usage: state.usage,
  };
}

/**
 * Streamingly accumulate Gemini generateContent SSE chunks from an async iterable.
 */
export async function accumulateGeminiStream(
  stream: AsyncIterable<unknown>,
  options?: GeminiChunkAccumulatorOptions,
): Promise<{
  text: string;
  toolCalls: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
}> {
  const state = createGeminiAccumulatorState();
  for await (const chunk of stream) {
    applyGeminiChunk(chunk, state, options);
  }
  return {
    text: state.text,
    toolCalls: state.toolCalls,
    usage: state.usage,
  };
}

// ---- Route decision + request builder (shared by all three paths) ----

/**
 * 判断是否应该走 Gemini native generateContent 路径。
 * 三条路径（loopUpstream / chatHandler / localRuntimeAdapter）共用此判断，
 * 避免路由条件分散在三处导致不一致。
 *
 * 条件：provider=google + Gemini 3 系列 + 非 image 模型 + 请求包含 tools。
 * Image 模型优先级更高（由 isGoogleNativeImageModel 单独判断）。
 */
export function shouldUseGeminiNativeToolRoute(
  provider: string,
  model: string,
  tools: unknown[] | undefined,
  isImageModel: (model: string) => boolean,
): boolean {
  return (
    provider === "google" &&
    !isImageModel(model) &&
    isGemini3Model(model) &&
    Array.isArray(tools) &&
    tools.length > 0
  );
}

/**
 * 构建 Gemini generateContent 请求体（含 tools + thoughtSignature 回放）。
 * antigravity / server native / CLI native 三条路径共用。
 */
export function buildGeminiGenerateContentRequest(args: {
  messages: unknown[];
  tools?: unknown[];
  maxTokens?: number;
  temperature?: number;
  attachSkipThoughtSignature: boolean;
}): Record<string, unknown> {
  const { contents, systemTexts } = convertOpenAiMessagesToGemini(
    args.messages,
    { attachSkipThoughtSignature: args.attachSkipThoughtSignature },
  );

  const request: Record<string, unknown> = { contents };

  if (systemTexts.length > 0) {
    request.systemInstruction = {
      role: "user",
      parts: systemTexts.map((text) => ({ text })),
    };
  }

  const toolsResult = convertOpenAiToolsToGemini(args.tools);
  if (toolsResult) {
    request.tools = toolsResult;
    request.toolConfig = { functionCallingConfig: { mode: "VALIDATED" } };
  }

  const generationConfig: Record<string, unknown> = {};
  if (typeof args.maxTokens === "number" && args.maxTokens > 0) {
    generationConfig.maxOutputTokens = args.maxTokens;
  }
  if (typeof args.temperature === "number") {
    generationConfig.temperature = args.temperature;
  }
  if (Object.keys(generationConfig).length > 0) {
    request.generationConfig = generationConfig;
  }

  return request;
}