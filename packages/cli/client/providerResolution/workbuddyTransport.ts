/**
 * transport 分支：WorkBuddy（腾讯工友 / WorkBuddy AI）
 *
 * 两站 apiKeyRef 专用 transport（workbuddy / workbuddy-ai）。
 * 复用 executeOpenAiCompatibleChatCompletion 及其 SSE 聚合器，
 * 在固定 endpoint 上通过 fetch 包装层执行请求 body 适配（adaptWorkBuddyRequest）
 * 与响应 tool 名称还原（restoreWorkBuddyToolNames / wrapWorkBuddySseResponse）。
 */
import type { AgentRuntimeProvider } from "../../../agent-runtime";
import { executeOpenAiCompatibleChatCompletion } from "../../agentRuntimeLocal";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import {
  logLocalRuntimeDiagnostic,
  summarizeOpenAiToolNames,
} from "../localRuntimeDiagnostics";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import {
  readOAuthCredential,
  type OAuthCredential,
} from "../../../agent-runtime/oauthTokenStore";
import {
  getWorkBuddyHeaders,
  type WorkBuddySite,
} from "../../../agent-runtime/workbuddyOAuth";
import {
  adaptWorkBuddyRequest,
  restoreWorkBuddyToolNames,
} from "../../../agent-runtime/workbuddyRequestAdapter";
import type { ProviderResolutionContext, ProviderResolver } from "./providerResolutionContext";

export const WORKBUDDY_ENDPOINTS: Record<WorkBuddySite, string> = {
  workbuddy: "https://copilot.tencent.com/v2/chat/completions",
  "workbuddy-ai": "https://www.workbuddy.ai/v2/chat/completions",
};

export function resolveWorkBuddySite(agentConfig: {
  apiKeyRef?: string | null;
  provider?: string | null;
}): WorkBuddySite | null {
  const ref = agentConfig.apiKeyRef?.trim().toLowerCase();
  const prov = agentConfig.provider?.trim().toLowerCase();

  if (
    ref === "workbuddy-ai" ||
    ref?.startsWith(["api-key", "workbuddy-ai"].join(":")) ||
    prov === "workbuddy-ai"
  ) {
    return "workbuddy-ai";
  }
  if (
    ref === "workbuddy" ||
    ref?.startsWith(["api-key", "workbuddy"].join(":")) ||
    prov === "workbuddy"
  ) {
    return "workbuddy";
  }
  return null;
}

function record(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const QUOTA_EXCEEDED_MESSAGE =
  "WorkBuddy 额度不足 (14018)：WorkBuddy 非无限免费服务，当前账号额度已耗尽。";

/**
 * 还原 SSE 事件流中可能被安全转义的工具调用名。
 * 兼容多字节 UTF-8 跨 chunk 切分、分行切分及工具名增量分片（fragments）。
 */
export function wrapWorkBuddySseResponse(
  response: Response,
  names: Record<string, string>,
): Response {
  if (!response.body) return response;
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let pending = "";
  let lines: string[] = [];
  const fragments = new Map<string, string>();

  const processEvent = (): string => {
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));
    const data = dataLines.join("\n");
    if (!data || data === "[DONE]") {
      const result = lines.join("\n") + "\n\n";
      lines = [];
      return result;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      const result = lines.join("\n") + "\n\n";
      lines = [];
      return result;
    }

    if (record(payload)) {
      if (
        payload.code === 14018 ||
        payload.errcode === 14018 ||
        (record(payload.error) && payload.error.code === 14018)
      ) {
        throw new Error(QUOTA_EXCEEDED_MESSAGE);
      }

      const choices = Array.isArray(payload.choices) ? payload.choices : [];
      for (const choice of choices) {
        if (!record(choice)) continue;
        const delta = record(choice.delta) ? choice.delta : undefined;
        const toolCalls =
          delta && Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
        for (const call of toolCalls) {
          if (
            !record(call) ||
            !record(call.function) ||
            typeof call.function.name !== "string"
          ) {
            continue;
          }
          const key = `${choice.index ?? 0}:${call.index ?? 0}`;
          const accumulated = (fragments.get(key) ?? "") + call.function.name;
          if (Object.prototype.hasOwnProperty.call(names, accumulated)) {
            call.function.name = accumulated;
            fragments.delete(key);
          } else if (
            Object.keys(names).some((safe) => safe.startsWith(accumulated))
          ) {
            fragments.set(key, accumulated);
            call.function.name = "";
          } else {
            call.function.name = accumulated;
            fragments.delete(key);
          }
        }
      }
    }

    const restored = restoreWorkBuddyToolNames(payload, names);
    const nonDataFields = lines.filter((line) => !line.startsWith("data:"));
    lines = [];
    return [...nonDataFields, `data: ${JSON.stringify(restored)}`, "", ""].join(
      "\n",
    );
  };

  const drain = (final: boolean): string => {
    let output = "";
    while (true) {
      const match = /[\r\n]/.exec(pending);
      if (!match) break;
      const i = match.index;
      if (!final && pending[i] === "\r" && i === pending.length - 1) break;
      const line = pending.slice(0, i);
      pending = pending.slice(
        i + (pending[i] === "\r" && pending[i + 1] === "\n" ? 2 : 1),
      );
      if (line === "") {
        output += processEvent();
      } else {
        lines.push(line);
      }
    }
    if (final) {
      if (pending) {
        lines.push(pending);
        pending = "";
      }
      if (lines.length > 0) {
        output += processEvent();
      }
    }
    return output;
  };

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      pending += decoder.decode(chunk, { stream: true });
      const output = drain(false);
      if (output) controller.enqueue(encoder.encode(output));
    },
    flush: (controller) => {
      pending += decoder.decode();
      const output = drain(true);
      if (output) controller.enqueue(encoder.encode(output));
    },
  });

  const body = response.body.pipeThrough(transformStream);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * 还原非流式 JSON 响应中的工具调用名。
 */
export async function wrapWorkBuddyJsonResponse(
  response: Response,
  names: Record<string, string>,
): Promise<Response> {
  const rawText = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return new Response(rawText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  if (
    record(json) &&
    (json.code === 14018 ||
      json.errcode === 14018 ||
      (record(json.error) && json.error.code === 14018) ||
      rawText.includes("14018"))
  ) {
    throw new Error(QUOTA_EXCEEDED_MESSAGE);
  }

  const restored = restoreWorkBuddyToolNames(json, names);
  return new Response(JSON.stringify(restored), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const resolveWorkbuddyTransport: ProviderResolver = async (ctx) => {
  const {
    agentConfig,
    deps,
    fetchImpl,
    additionalToolNames,
    buildProviderOpenAiTools,
    recordLocalAvailability,
    apiKeyRefResolver,
  } = ctx;

  const site = resolveWorkBuddySite(agentConfig);
  if (!site) return null;

  const fixedEndpoint = WORKBUDDY_ENDPOINTS[site];

  // 严禁 customProviderUrl 改写或将凭证发往非官方端点
  if (agentConfig.customProviderUrl) {
    const trimmedUrl = agentConfig.customProviderUrl.trim();
    if (trimmedUrl && trimmedUrl !== fixedEndpoint) {
      throw new Error(
        `Custom provider URL "${trimmedUrl}" is forbidden for WorkBuddy (${site}). Requests must only target ${fixedEndpoint}.`,
      );
    }
  }

  const rawRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
  const isApiKeyRef = rawRef.startsWith("api-key:");
  const providerRef = isApiKeyRef ? rawRef : site;

  // 1. 初次通过 apiKeyRefResolver 解析 token
  const initialToken = await apiKeyRefResolver(providerRef);
  if (!initialToken) {
    throw new Error(
      `OAuth credential for "${site}" not found locally. Run \`nolo auth ${site}\`.`,
    );
  }

  // 2. 本机重读完整 credential 获取 metadata uid / domain
  const legacyCredentialMigration = { enableLegacyMigration: true } as const;
  let currentCredential = readOAuthCredential(
    site,
    undefined,
    legacyCredentialMigration,
  );
  if (!currentCredential || !currentCredential.accessToken) {
    throw new Error(
      `OAuth credential for "${site}" not found locally. Run \`nolo auth ${site}\`.`,
    );
  }

  // 3. 校验 uid（缺 uid 明确失败，不把仅 accessToken 构造假成功）
  const uid =
    (typeof currentCredential.metadata?.uid === "string" &&
      currentCredential.metadata.uid.trim()) ||
    (typeof currentCredential.accountId === "string" &&
      currentCredential.accountId.trim()) ||
    "";

  if (!uid) {
    throw new Error(
      `WorkBuddy credential for "${site}" is missing uid. Re-run \`nolo auth ${site}\`.`,
    );
  }

  // 确保 credential 中携带最新的 accessToken
  if (currentCredential.accessToken !== initialToken) {
    currentCredential = { ...currentCredential, accessToken: initialToken };
  }

  // 4. 工具 bundle 解析（复用 OpenAI-compatible 工具 bundle）
  const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
    agentConfig,
    deps.env,
    buildProviderOpenAiTools,
    additionalToolNames,
  );

  // 5. Token 续期函数（token 续期前后都更新完整 credential）
  const resolveRequestApiKey = async ({
    force,
  }: {
    force: boolean;
  }): Promise<string | null> => {
    if (isApiKeyRef && force) {
      // 非 OAuth API Key ref 不支持强制刷新
      return currentCredential.accessToken;
    }

    // 续期前重读完整 credential
    const before = readOAuthCredential(
      site,
      undefined,
      legacyCredentialMigration,
    );
    if (before) {
      currentCredential = before;
    }

    if (!force) {
      return currentCredential.accessToken;
    }

    // force === true（401 重试路径）
    const refreshedToken = await apiKeyRefResolver(providerRef, {
      force: true,
    });

    // 续期后重读完整 credential
    const after = readOAuthCredential(
      site,
      undefined,
      legacyCredentialMigration,
    );
    if (after) {
      currentCredential = after;
    }
    if (refreshedToken && currentCredential.accessToken !== refreshedToken) {
      currentCredential = {
        ...currentCredential,
        accessToken: refreshedToken,
      };
    }

    return refreshedToken ?? currentCredential.accessToken;
  };

  // 6. 构造封装的 fetch
  const wrappedFetch = async (
    inputUrl: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const targetUrl =
      typeof inputUrl === "string"
        ? inputUrl
        : inputUrl instanceof URL
          ? inputUrl.toString()
          : inputUrl.url;

    // 严格禁止发送 token 到任意非固定端点
    if (targetUrl !== fixedEndpoint) {
      throw new Error(
        `WorkBuddy request blocked: target URL "${targetUrl}" does not match fixed endpoint "${fixedEndpoint}". Token will not be sent.`,
      );
    }

    // 对请求 body 执行 adaptWorkBuddyRequest（工具名安全化、max_tokens 适配等）
    let originalNames: Record<string, string> = {};
    let body = init?.body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        const adapted = adaptWorkBuddyRequest(parsed);
        originalNames = adapted.originalNames;
        body = JSON.stringify(adapted.body);
      } catch {
        // 非 JSON body 原样透传
      }
    }

    // 使用 getWorkBuddyHeaders 注入受控请求头
    const wbHeaders = getWorkBuddyHeaders(currentCredential);
    const mergedHeaders = new Headers(init?.headers);
    for (const [key, value] of Object.entries(wbHeaders)) {
      mergedHeaders.set(key, value);
    }
    mergedHeaders.set("Content-Type", "application/json");

    // 上游请求强制 redirect: "error"，禁止重定向泄露凭证
    const upstreamRes = await fetchImpl(fixedEndpoint, {
      ...init,
      body,
      headers: mergedHeaders,
      redirect: "error",
    });

    // 401 响应直接返回给 executeOpenAiCompatibleChatCompletion 走单次刷新重试逻辑
    if (upstreamRes.status === 401) {
      return upstreamRes;
    }

    // 错误响应检查 14018 额度不足
    if (!upstreamRes.ok) {
      const clone = upstreamRes.clone();
      const errorText = await clone.text().catch(() => "");
      if (errorText.includes("14018")) {
        throw new Error(QUOTA_EXCEEDED_MESSAGE);
      }
      return upstreamRes;
    }

    // 成功响应：对 SSE 或 JSON 响应进行工具名还原
    const contentType = upstreamRes.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return wrapWorkBuddySseResponse(upstreamRes, originalNames);
    } else {
      return wrapWorkBuddyJsonResponse(upstreamRes, originalNames);
    }
  };

  return {
    model: agentConfig.model || "gpt-4o",
    complete: async (messages, options) => {
      logLocalRuntimeDiagnostic("provider.request.start", {
        agentKey: agentConfig.key,
        transport: "workbuddy",
        model: agentConfig.model ?? "gpt-4o",
        messageCount: messages.length,
        toolCount: tools.length,
        requestedToolNames,
        openAiToolNames: summarizeOpenAiToolNames(tools),
        stream: true,
      });

      try {
        const result = await executeOpenAiCompatibleChatCompletion({
          providerConfig: {
            endpoint: fixedEndpoint,
            apiKey: currentCredential.accessToken,
            model: agentConfig.model || "gpt-4o",
            provider: site,
          },
          messages,
          tools,
          fetchImpl: wrappedFetch,
          stream: true,
          sessionId:
            asOptionalTrimmedString(options?.dialogId) ??
            asOptionalTrimmedString(agentConfig.key),
          onTextDelta: options?.onTextDelta,
          onReasoningDelta: options?.onReasoningDelta,
          onHttpResult: ({ status, body }) =>
            recordLocalAvailability(status, body),
          resolveApiKey: resolveRequestApiKey,
        });

        await recordLocalAvailability(200);

        logLocalRuntimeDiagnostic("provider.request.result", {
          agentKey: agentConfig.key,
          transport: "workbuddy",
          ok: true,
          contentChars: result.content.length,
          toolCallCount: result.tool_calls?.length ?? 0,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("14018")) {
          throw new Error(QUOTA_EXCEEDED_MESSAGE);
        }
        throw error;
      }
    },
  };
};
