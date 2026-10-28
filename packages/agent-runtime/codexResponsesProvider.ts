import { resolveToolImagePolicy } from "../ai/llm/agentCapabilities";
import { createHash } from "node:crypto";
import { resolveAgentImageInputSupport } from "../ai/llm/agentCapabilities";
import { deriveStableUuid, isStableSessionIdentityEnabled } from "./sessionIdentity";
import { parseUpstreamErrorBody } from "core/chat/upstreamErrorBody";
import { randomUUID } from "node:crypto";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import {
  createProviderCallTimingTracker,
  finalizeProviderCallTiming,
  observeMeaningfulProviderResponseAt,
  withProviderCallTimingFields,
} from "ai/token/providerCallTiming";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import type { AgentRuntimeToolCall } from "./types";
import {
  convertMessagesToResponsesInput,
  toResponsesTools,
  type ResponseInputItem,
} from "../integrations/openai/responsesHelpers";
import {
  collectStablePromptPrefix,
  stablePromptCacheKey,
} from "./promptCacheKey";
import { parseSseDataLineObject } from "./sseDataLine";
import { readSseFrames } from "./sseFrames";
import {
  createResponsesStreamCollector,
  codexStreamFailureStatus,
  type CodexStreamFailure,
} from "./responsesSseStream";

export { codexStreamFailureStatus, type CodexStreamFailure };

/**
 * ChatGPT Codex (subscription OAuth) provider.
 *
 * uses the ChatGPT backend Responses API at `/backend-api/codex/responses` with
 * the OAuth bearer token plus a `chatgpt-account-id` header. This module
 * translates an OpenAI chat.completions body into a Responses request, calls the
 * Codex endpoint, and aggregates the SSE stream back into an OpenAI
 * chat.completion-shaped body (mirroring antigravityCloudCodeProvider).
 *
 * Wire fingerprint notes (2026-08-04 live check):
 * - Current Plus account returns real `usage_limit_reached`, not Claude-style
 *   policy 429, even with honest/no-originator headers.
 * - We still send Codex-compatible SSE headers + `client_metadata` so the
 *   request shape stays closer to oh-my-pi / codex-rs than a bare bearer call.
 */

export const CODEX_RESPONSES_URL =
  "https://chatgpt.com/backend-api/codex/responses";

/**
 * Pinned Codex client version used by oh-my-pi / recent Codex CLI wire.
 *
 * Upstream gates the `/backend-api/codex/models` whitelist by this value
 * (verified live 2026-09-30): <0.155 hides gpt-6-sol/gpt-6-luna, <0.159 hides
 * gpt-6.1-sol — posting those models below the threshold fails with
 * "model is not supported when using Codex with a ChatGPT account". 0.162.1 is
 * the current stable codex-rs release (npm view, 2026-10-12), so bump this when
 * upstream ships newer models.
 */
export const CODEX_CLIENT_VERSION = "0.162.1";

/** Official Codex login/request originator (Nolo auth flow uses the same value). */
export const CODEX_ORIGINATOR = "codex_cli_rs";

export const CODEX_OPENAI_BETA = "responses=experimental";

const OPENAI_AUTH_CLAIM = "https://api.openai.com/auth";

/** Process-stable installation id for Codex client_metadata. */
const CODEX_INSTALLATION_ID = randomUUID();

/** Extracts chatgpt_account_id from the access-token JWT (namespaced claim). */
export function decodeCodexAccountId(accessToken: string): string | undefined {
  const parts = accessToken.split(".");
  if (parts.length < 2) return undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8"),
    ) as Record<string, unknown>;
    const claim = payload[OPENAI_AUTH_CLAIM];
    const value =
      claim && typeof claim === "object"
        ? (claim as Record<string, unknown>).chatgpt_account_id
        : undefined;
    return typeof value === "string" && value ? value : undefined;
  } catch {
    return undefined;
  }
}

export type CodexResponsesCallArgs = {
  agentConfig: AgentRuntimeAgentConfig;
  accessToken: string;
  accountId?: string;
  openAiBody: Record<string, unknown>;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** 流内 503（server_is_overloaded）的总尝试次数，默认 3（首次 + 2 次重试）。 */
  maxAttempts?: number;
  /** 会话稳定键（dialogId 等）；提供时 session/thread/window/turn id 与 prompt_cache_key 会话内稳定。 */
  sessionKey?: string;
  /** 注入退避等待，便于测试。 */
  sleep?: (ms: number) => Promise<unknown>;
  /** 注入 monotonic clock，便于验证 logical invocation timing。 */
  now?: () => number;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
};

type CodexRequestIdentity = {
  sessionId: string;
  threadId: string;
  windowId: string;
  turnId: string;
  turnMetadataJson: string;
  clientMetadata: Record<string, string>;
};

const turnStartedAtByTurn = new Map<string, number>();

export function createCodexRequestIdentity(
  installationId: string = CODEX_INSTALLATION_ID,
  stable?: { sessionKey?: string; turnToken?: string },
): CodexRequestIdentity {
  const key = stable?.sessionKey && isStableSessionIdentityEnabled() ? stable.sessionKey : undefined;
  const sessionId = key ? deriveStableUuid(key, "session") : randomUUID();
  const threadId = key ? sessionId : randomUUID();
  const windowId = key ? deriveStableUuid(key, "window") : randomUUID();
  const turnId = key ? deriveStableUuid(key, `turn:${stable?.turnToken ?? ""}`) : randomUUID();
  let turnStartedAt = Date.now();
  if (key) {
    const tk = `${key}\0${stable?.turnToken ?? ""}`;
    const prev = turnStartedAtByTurn.get(tk);
    if (prev !== undefined) turnStartedAt = prev;
    else {
      if (turnStartedAtByTurn.size >= 500) {
        turnStartedAtByTurn.delete(turnStartedAtByTurn.keys().next().value as string);
      }
      turnStartedAtByTurn.set(tk, turnStartedAt);
    }
  }
  const turnMetadata = {
    installation_id: installationId,
    session_id: sessionId,
    thread_id: threadId,
    turn_id: turnId,
    window_id: windowId,
    request_kind: "turn",
    turn_started_at_unix_ms: turnStartedAt,
  };
  const turnMetadataJson = JSON.stringify(turnMetadata);
  return {
    sessionId,
    threadId,
    windowId,
    turnId,
    turnMetadataJson,
    clientMetadata: {
      "x-codex-installation-id": installationId,
      session_id: sessionId,
      thread_id: threadId,
      "x-codex-window-id": windowId,
      turn_id: turnId,
      "x-codex-turn-metadata": turnMetadataJson,
    },
  };
}

export function buildCodexCompatibilityHeaders(
  identity: CodexRequestIdentity,
  accountId: string,
): Record<string, string> {
  return {
    Authorization: "", // filled by caller with bearer token
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "chatgpt-account-id": accountId,
    "OpenAI-Beta": CODEX_OPENAI_BETA,
    originator: CODEX_ORIGINATOR,
    version: CODEX_CLIENT_VERSION,
    session_id: identity.sessionId,
    conversation_id: identity.sessionId,
    "x-client-request-id": identity.sessionId,
    "session-id": identity.sessionId,
    "thread-id": identity.threadId,
    "x-codex-window-id": identity.windowId,
    "x-codex-turn-metadata": identity.turnMetadataJson,
  };
}

function collectInstructions(
  messages: unknown[],
  agentPrompt: string | undefined,
): string {
  const systemTexts: string[] = [];
  const prompt = agentPrompt?.trim();
  if (prompt) systemTexts.push(prompt);
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const role = String((raw as { role?: unknown }).role ?? "");
    if (role !== "system" && role !== "developer") continue;
    const content = (raw as { content?: unknown }).content;
    const stringContent = asOptionalTrimmedString(content);
    if (stringContent) {
      systemTexts.push(stringContent);
    } else if (Array.isArray(content)) {
      const text = content
        .filter(
          (p): p is { type: "text"; text: string } =>
            !!p && (p as { type?: unknown }).type === "text",
        )
        .map((p) => p.text)
        .join("\n")
        .trim();
      if (text) systemTexts.push(text);
    }
  }
  return systemTexts.join("\n\n");
}


/**
 * Codex OAuth has a private Responses wire format. Unlike the public OpenAI /
 * DeepSeek Responses APIs, historical reasoning items use `summary` blocks.
 * Keep this conversion at the Codex boundary so the canonical message model
 * and the public Responses adapter remain provider-neutral.
 */
export function convertMessagesToCodexInput(
  messages: Parameters<typeof convertMessagesToResponsesInput>[0],
  // 兼容两种调用形态：布尔（策略解析结果）与 options 对象（既有调用方/测试）
  supportsToolImages: boolean | { supportsToolImages?: boolean; maxImagesPerRequest?: number } = false,
): ResponseInputItem[] {
  const normalizedToolImages =
    typeof supportsToolImages === "boolean"
      ? supportsToolImages
      : supportsToolImages.supportsToolImages === true;
  return convertMessagesToResponsesInput(messages, { supportsToolImages: normalizedToolImages, maxImagesPerRequest: typeof supportsToolImages === "boolean" ? undefined : supportsToolImages.maxImagesPerRequest }).map((item) => {
    if (item.type !== "reasoning") return item;
    return {
      type: "reasoning",
      summary: item.content.map((part) => ({
        type: "summary_text",
        text: part.text,
      })),
    } as unknown as ResponseInputItem;
  });
}

export function buildCodexRequestBody(
  args: CodexResponsesCallArgs,
  identity: CodexRequestIdentity = createCodexRequestIdentity(),
  sessionKey?: string,
): Record<string, unknown> {
  const rawMessages = Array.isArray(args.openAiBody.messages)
    ? (args.openAiBody.messages as unknown[])
    : [];
  // system/developer messages become `instructions`; the rest become `input`.
  const nonSystem = rawMessages.filter((m) => {
    const role = m && typeof m === "object" ? String((m as { role?: unknown }).role) : "";
    return role !== "system" && role !== "developer";
  });
  const input = convertMessagesToCodexInput(nonSystem as any, resolveToolImagePolicy({
    ...args.agentConfig,
    model: typeof args.openAiBody.model === "string" ? args.openAiBody.model : args.agentConfig.model,
    routeKind: "codex/responses",
    legacySupportsToolImages: false,
  }));
  const instructions = collectInstructions(rawMessages, args.agentConfig.prompt);
  const stableInstructions = collectStablePromptPrefix(rawMessages, args.agentConfig.prompt);
  const model =
    asOptionalTrimmedString(args.openAiBody.model) ??
    asOptionalTrimmedString(args.agentConfig.model) ??
    "gpt-5.5";
  const tools = toResponsesTools(
    Array.isArray(args.openAiBody.tools) ? (args.openAiBody.tools as any[]) : undefined,
  );

  const body: Record<string, unknown> = {
    model,
    input,
    stream: true,
    store: false,
    // Keep routing stable across turns and request UUIDs. Growing input/history
    // is intentionally excluded; only stable request-prefix material belongs.
    // 真实 Codex CLI 用 session_id 作 prompt_cache_key（codex-rs/core/src/client.rs
    // prompt_cache_key()）；OpenAI 文档：同 key 超过 ~15 req/min 会溢出到其他机器。
    // 有会话键时按会话分片，无则回退到前缀派生键。
    prompt_cache_key:
      sessionKey && isStableSessionIdentityEnabled()
        ? identity.sessionId
        : stablePromptCacheKey([model, stableInstructions, tools ?? []], "nolo-codex"),
    client_metadata: identity.clientMetadata,
  };
  if (instructions) body.instructions = instructions;
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
    body.parallel_tool_calls = true;
  }
  return body;
}

/** 只有容量抖动值得重试；鉴权/配额/参数错误重试只会浪费一轮。 */
const RETRYABLE_CODEX_STREAM_STATUSES = new Set([503]);

/** 与 localRuntimeFetchRetry 的通用预算一致：首次 + 2 次重试。 */
const CODEX_STREAM_MAX_ATTEMPTS = 3;

const CODEX_STREAM_RETRY_BASE_DELAY_MS = 500;

async function readCodexResponsesStream(
  response: Response,
  args: CodexResponsesCallArgs,
  onMeaningfulEvent: () => void,
  signal?: AbortSignal,
) {
  const collector = createResponsesStreamCollector({
    onTextDelta: args.onTextDelta,
    onReasoningDelta: args.onReasoningDelta,
    onMeaningfulDelta: onMeaningfulEvent,
    fallbackPrefix: "Codex",
  });
  for await (const frame of readSseFrames(response)) {
    throwIfAborted(signal);
    for (const line of frame.split("\n")) {
      const event = parseSseDataLineObject(line);
      if (event && !Array.isArray(event)) collector.processEvent(event);
    }
  }
  throwIfAborted(signal);
  return collector.finalize();
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason;
}

/**
 * 退避等待，可被 signal 中断：abort 时立即以 signal.reason 拒绝并清理定时器，
 * 不等满退避时长。注入的 sleep（测试用）迟到的 resolve/reject 会被吞掉，不产生未处理拒绝。
 */
function waitBackoff(
  ms: number,
  signal: AbortSignal | undefined,
  injectedSleep?: (ms: number) => Promise<unknown>,
): Promise<void> {
  throwIfAborted(signal);
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      if (timer !== undefined) clearTimeout(timer);
    };
    const onAbort = () => {
      cleanup();
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (injectedSleep) {
      injectedSleep(ms).then(
        () => {
          cleanup();
          resolve();
        },
        (error) => {
          cleanup();
          reject(error);
        },
      );
    } else {
      timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);
    }
  });
}

/** 单次 Codex 请求：不含重试，失败以 { status, body.error } 形式返回。 */
async function callCodexResponsesOnce(
  args: CodexResponsesCallArgs,
  accountId: string,
  timingTracker: ReturnType<typeof createProviderCallTimingTracker>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const msgs = Array.isArray(args.openAiBody.messages) ? (args.openAiBody.messages as any[]) : [];
  // 已知取舍：连续两回合 user 内容完全相同时 turnId 复用（仅影响 turn 级元数据，不影响缓存键）。
  // 回合标识 = 本回合起始（最后一条 user）消息内容哈希：同回合多次调用稳定，不受历史压缩影响。
  const lastUser = [...msgs].reverse().find((m) => m && m.role === "user");
  const turnToken = createHash("sha256")
    .update(JSON.stringify(lastUser?.content ?? ""))
    .digest("hex")
    .slice(0, 24);
  const identity = createCodexRequestIdentity(
    undefined,
    args.sessionKey ? { sessionKey: args.sessionKey, turnToken } : undefined,
  );
  const body = buildCodexRequestBody(args, identity, args.sessionKey);
  const headers = buildCodexCompatibilityHeaders(identity, accountId);
  headers.Authorization = `Bearer ${args.accessToken}`;
  const response = await fetchImpl(CODEX_RESPONSES_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: args.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: response.status,
      body: parseUpstreamErrorBody(errorText, response.statusText),
    };
  }

  let firstAcceptedOutputAt: number | undefined;
  const streamed = await readCodexResponsesStream(response, args, () => {
    firstAcceptedOutputAt ??= timingTracker.now();
  }, args.signal);
  const text = streamed.content;
  const toolCalls = streamed.tool_calls ?? [];
  const usage = streamed.usage;
  const failure = streamed.failure;

  // Only commit a first-output timestamp after this attempt is accepted. A
  // failed attempt may have emitted partial output, but that output is not
  // exposed to the caller and must not become the logical invocation's first
  // output observation.
  if (!failure && firstAcceptedOutputAt !== undefined) {
    observeMeaningfulProviderResponseAt(timingTracker, firstAcceptedOutputAt);
  }
  const timingFields = finalizeProviderCallTiming(timingTracker);
  const usageWithTiming = withProviderCallTimingFields(usage, timingFields);

  // 流内失败一律当失败上报，即使已经收到部分 text：半条被上游掐断的回复不该
  // 被当成完整回合喂回循环。调用方拿到的是真实状态码 + 上游原文。
  if (failure) {
    return {
      status: codexStreamFailureStatus(failure),
      body: {
        error: {
          message: failure.message,
          ...(failure.code ? { code: failure.code } : {}),
          ...(failure.type ? { type: failure.type } : {}),
        },
      },
    };
  }

  const message: Record<string, unknown> = {
    role: "assistant",
    content: text || null,
  };
  if (toolCalls.length > 0) message.tool_calls = toolCalls;
  if (streamed.reasoning_content) message.reasoning_content = streamed.reasoning_content;

  return {
    status: 200,
    body: {
      choices: [
        {
          index: 0,
          message,
          finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
        },
      ],
      ...(usageWithTiming ? { usage: usageWithTiming } : {}),
    },
  };
}

/**
 * Call the Codex Responses endpoint and return an OpenAI chat.completion body.
 *
 * 容量抖动（`server_is_overloaded`）在这里就地重试：它藏在 HTTP 200 的 SSE 帧里，
 * 传输层的 fetchWithTransientRetry 看不见，只能由本函数负责。
 */
export async function fetchCodexResponsesCompletion(
  args: CodexResponsesCallArgs,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const accountId = args.accountId?.trim() || decodeCodexAccountId(args.accessToken);
  if (!accountId) {
    return {
      status: 401,
      body: {
        error: {
          message:
            "ChatGPT Codex credential is missing chatgpt_account_id. Re-run `nolo auth chatgpt`.",
        },
      },
    };
  }

  const requestedMaxAttempts = Number(args.maxAttempts);
  const maxAttempts = Number.isFinite(requestedMaxAttempts)
    ? Math.min(10, Math.max(1, Math.floor(requestedMaxAttempts)))
    : CODEX_STREAM_MAX_ATTEMPTS;

  const timingTracker = createProviderCallTimingTracker(args.now);
  let visibleOutputEmitted = false;
  const callArgs: CodexResponsesCallArgs = {
    ...args,
    ...(args.onTextDelta
      ? { onTextDelta: (chunk: string) => { if (chunk.length > 0) visibleOutputEmitted = true; args.onTextDelta?.(chunk); } }
      : {}),
    ...(args.onReasoningDelta
      ? { onReasoningDelta: (chunk: string) => { visibleOutputEmitted = true; args.onReasoningDelta?.(chunk); } }
      : {}),
  };
  let result = await callCodexResponsesOnce(callArgs, accountId, timingTracker);
  for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
    if (!RETRYABLE_CODEX_STREAM_STATUSES.has(result.status)) break;
    if (visibleOutputEmitted) break;
    // 取消不再当作 503 结果返回：抛出 signal.reason（与原生 fetch 取消语义一致），
    // 调用方据此区分取消与真实上游失败，且取消后不再发起下一次 fetch。
    throwIfAborted(args.signal);
    await waitBackoff(
      CODEX_STREAM_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
      args.signal,
      args.sleep,
    );
    throwIfAborted(args.signal);
    result = await callCodexResponsesOnce(callArgs, accountId, timingTracker);
  }
  return result;
}

/** Detects a ChatGPT Codex OAuth agent (apiKeyRef "chatgpt"). */
export function isCodexOAuthAgent(
  agentConfig: Pick<AgentRuntimeAgentConfig, "apiKeyRef" | "provider"> | null | undefined,
): boolean {
  if (!agentConfig) return false;
  const apiKeyRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
  return apiKeyRef === "chatgpt";
}

/** 发起 ChatGPT Codex Responses 上游原生请求，直接返回原始 Response（用于客户端原生直通）。 */
export async function sendCodexResponsesRequest(args: {
  accessToken: string;
  accountId: string;
  body: Record<string, unknown>;
  sessionKey?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<Response> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const identity = createCodexRequestIdentity(
    undefined,
    args.sessionKey ? { sessionKey: args.sessionKey } : undefined,
  );
  const headers = buildCodexCompatibilityHeaders(identity, args.accountId);
  headers.Authorization = `Bearer ${args.accessToken}`;
  const sanitizedBody = { ...args.body };
  delete (sanitizedBody as any).wire;
  return fetchImpl(CODEX_RESPONSES_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(sanitizedBody),
    signal: args.signal,
  });
}

