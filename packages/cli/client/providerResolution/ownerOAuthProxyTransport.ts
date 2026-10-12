/**
 * transport 分支：owner-required 模型代理（分享者 OAuth agent）。
 *
 * 触发条件：ctx.ownerOriginExecution 存在（adapter 判定本机用户不是该 agent
 * 的 credential owner 时注入）。与 platformProxyTransport 的差别在于凭据归属：
 * 模型请求不携带本机任何 OAuth / API key，而是把
 * `ownerOriginExecution` 扩展随 body 发给 /api/v1/chat，由服务端 admission
 * 用「发起方授权 + agent 所有者的订阅凭据」完成转发；本机只负责把模型返回的
 * tool_calls 交给本地工具执行器（cwd / workspace 语义不变）。
 *
 * 安全边界（与 ownerOriginExecution.ts、chatHandler.ts 对齐）：
 * - 任何模型 POST 之前必须先 verifyOwnerRouteAck：缺头 / 版本不符 /
 *   requestId 不一致即 fail-closed，绝不凭 HTTP 200 推断支持。
 * - 本路径不读 apiKeyRefResolver / credentialBroker / syncFetcher —— 本机
 *   OAuth 冷却、broker 计量文件、sync 缓存都不能被分享调用污染。
 * - `ownerOriginExecution` 只在 body 顶层出现一次；服务端把它剥掉后再转发
 *   上游 provider，元数据永不出现在上游 wire body。
 * - 取消信号一路透传到 fetch，且由调用方（localLoop）继续传给本地执行器。
 * - 本路径不产生 result.usage / usageRecords —— 客户端不上报可计费 token
 *   记录；服务端仍按 owner 订阅记账（billingSource=owner_subscription）。
 */
import {
  OWNER_ORIGIN_EXECUTION_VERSION,
  verifyOwnerRouteAck,
} from "../../../agent-runtime/ownerOriginExecution";
import {
  buildPlatformChatCompletionRequest,
  parsePlatformChatCompletionData,
  parsePlatformChatCompletionResponse,
  readPlatformChatSseCompletion,
} from "../../agentRuntimeLocal";
import {
  PlatformStreamInterruptedError,
  type PlatformChatProviderConfig,
} from "../../../agent-runtime/platformChatProvider";
import { logLocalRuntimeDiagnostic, summarizeOpenAiToolNames } from "../localRuntimeDiagnostics";
import { fetchWithTransientRetry } from "../localRuntimeFetchRetry";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import { summarizeEndpoint } from "core/summarizeEndpoint";
import type { ProviderResolver } from "./providerResolutionContext";

/** owner route 的 providerConfig 只承载「发到哪个 server / 用哪根 auth token」，
 * 不解析任何本机 provider 凭据；endpoint 固定指向 chat proxy，model/provider
 * 仅占位（真实值由服务端 admission 覆盖）。
 *
 * wire 线格式由 endpoint 后缀决定（/responses → Responses API，其余 →
 * chat.completions）。分享 agent 两种线格式都可能用（Codex GPT-5 / 其他
 * OpenAI-compatible），所以把 agentConfig 上记录的 endpoint 后缀沿用下来，
 * 客户端按同一套 sanitize/build 逻辑产出正确 wire。endpoint 只参与客户端
 * 本地判定，不进 body、不影响服务端路由。 */
const OWNER_PROXY_ENDPOINT_FALLBACK =
  "https://owner-required.invalid/v1/chat/completions";

export const resolveOwnerOAuthProxyTransport: ProviderResolver = async (ctx) => {
  const {
    agentConfig,
    deps,
    fetchImpl,
    loopbackRequest,
    additionalToolNames,
    buildProviderOpenAiTools,
    serverUrl,
    authToken,
    ownerOriginExecution,
  } = ctx;
  if (!ownerOriginExecution) return null;
  if (!authToken?.trim()) {
    // 与 platform-proxy 相同的 AUTH_NO_TOKEN 语义；没登录态就无法发起 owner-required 派发。
    throw Object.assign(new Error("owner-required proxy failed: AUTH_NO_TOKEN"), {
      code: "AUTH_NO_TOKEN",
      authCode: "AUTH_NO_TOKEN",
      stage: "provider",
    });
  }
  const rawRecord =
    (agentConfig as { rawRecord?: Record<string, unknown> }).rawRecord ?? {};
  const agentEndpoint =
    typeof rawRecord.endpoint === "string" ? rawRecord.endpoint.trim() : "";
  const endpoint = /\/(responses|chat\/completions)$/i.test(agentEndpoint)
    ? agentEndpoint
    : OWNER_PROXY_ENDPOINT_FALLBACK;
  const providerConfig: PlatformChatProviderConfig = {
    serverUrl,
    authToken,
    agentKey: agentConfig.key,
    // 仅占位：服务端 admission 覆盖 model/provider；客户端永不在 body 声称。
    model: agentConfig.model ?? "owner-required",
    provider: agentConfig.provider ?? agentConfig.apiSource ?? "server_agent_oauth",
    endpoint,
    requestOptions: {},
  };
  const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
    agentConfig,
    deps.env,
    buildProviderOpenAiTools,
    additionalToolNames,
  );
  return {
    model: providerConfig.model,
    complete: async (messages, options) => {
      const requestId = crypto.randomUUID();
      const usesResponsesApi = providerConfig.endpoint
        .trim()
        .toLowerCase()
        .endsWith("/responses");
      const stream = Boolean(options?.onTextDelta);
      const request = buildPlatformChatCompletionRequest({
        providerConfig,
        messages,
        tools,
        stream,
        requestId,
        ...(options?.dialogId ? { dialogId: options.dialogId } : {}),
      });
      // 把 owner-required 扩展注入顶层 body；服务端 admission 认这个字段，
      // 其余 wire body（messages/model/stream）与 platform-proxy 完全一致。
      const body = JSON.parse(request.init.body as string) as Record<string, unknown>;
      body.ownerOriginExecution = ownerOriginExecution;
      const init: RequestInit = {
        ...request.init,
        body: JSON.stringify(body),
        ...(options?.signal ? { signal: options.signal } : {}),
      };
      logLocalRuntimeDiagnostic("provider.request.start", {
        agentKey: agentConfig.key,
        transport: "owner-oauth-proxy",
        requestUrl: summarizeEndpoint(request.url) ?? null,
        model: providerConfig.model,
        messageCount: messages.length,
        toolCount: tools.length,
        requestedToolNames,
        openAiToolNames: summarizeOpenAiToolNames(tools),
        stream,
        requestId,
        originMachineId: ownerOriginExecution.origin.machineId,
        originSessionId: ownerOriginExecution.origin.sessionId,
      });
      try {
        const res = await fetchWithTransientRetry(
          fetchImpl,
          request.url,
          init,
          {
            sleep: deps.sleep,
            loopbackRequest,
            // 与 platform-proxy 同口径：仅等服务端显式 draining 准入信号重试，
            // 网络错误不重放（服务端可能已受理，重放会产生重复扣费/重复 tool_calls）。
            retryableStatuses: new Set([503]),
            shouldRetryResponse: async (response) => {
              if (response.status !== 503) return false;
              try {
                const body = (await response.clone().json()) as {
                  reason?: unknown;
                  retryable?: unknown;
                };
                return body?.reason === "core_draining" || body?.retryable === true;
              } catch {
                return false;
              }
            },
            retryNetworkErrors: false,
            onRetry: deps.activityReporter
              ? ({ attempt, maxAttempts, delayMs }) => {
                  deps.activityReporter!(
                    `自动重试 ${attempt}/${maxAttempts} · ${Math.ceil(delayMs / 1000)}s`,
                  );
                }
              : undefined,
          },
        );
        // Fail-closed：缺 ack / 版本不符 / requestId 错位都视为服务端未走
        // owner-only 路径（旧 server、proxy role、或扩展被吞）。此时绝不能
        // 回落到本机凭据，也不能按 200 静默成功。
        const ack = verifyOwnerRouteAck(res.headers, requestId);
        if (!ack.ok) {
          const raw = await res.text().catch(() => "");
          const code = ack.code;
          logLocalRuntimeDiagnostic("provider.request.result", {
            agentKey: agentConfig.key,
            transport: "owner-oauth-proxy",
            status: res.status,
            ok: false,
            ackCode: code,
            responseBytes: raw.length,
          });
          throw new Error(
            `owner-required route not acknowledged (${code}); ` +
              `server must emit ${OWNER_ROUTE_VERSION_HEADER_NAME}=${OWNER_ORIGIN_EXECUTION_VERSION} and echo the request id`,
          );
        }
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          const data = parsePlatformChatCompletionData(raw);
          const rawPreview =
            raw.length > 200 ? `${raw.slice(0, 200)}…(${raw.length}b)` : raw;
          const gatewayHeaders = ["server", "cf-ray", "cf-cache-status", "content-length"]
            .map((h) => {
              const v = res.headers.get(h);
              return v ? `${h}=${v}` : null;
            })
            .filter(Boolean)
            .join(" ");
          throw new Error(
            `owner-required proxy failed: HTTP ${res.status} ${JSON.stringify(data)}` +
              (rawPreview ? ` raw="${rawPreview}"` : "") +
              (gatewayHeaders ? ` headers=[${gatewayHeaders}]` : ""),
          );
        }
        const contentType = res.headers.get("content-type") ?? "";
        const shouldStream = stream && contentType.includes("text/event-stream");
        if (shouldStream && options?.onTextDelta) {
          const streamed = await readPlatformChatSseCompletion({
            response: res,
            usesResponsesApi,
            onTextDelta: options.onTextDelta,
            onReasoningDelta: options.onReasoningDelta,
          });
          if (streamed.streamTruncated) {
            logLocalRuntimeDiagnostic("provider.stream.truncated", {
              phase: "streaming",
              contentChars: streamed.content.length,
              toolCallCount: streamed.tool_calls?.length ?? 0,
              requestId,
              ...(options?.dialogId ? { dialogId: options.dialogId } : {}),
            });
          }
          logLocalRuntimeDiagnostic("provider.request.result", {
            agentKey: agentConfig.key,
            transport: "owner-oauth-proxy",
            ok: true,
            stream: true,
            contentChars: streamed.content.length,
            toolCallCount: streamed.tool_calls?.length ?? 0,
          });
          return {
            content: streamed.content,
            model: providerConfig.model,
            provider: providerConfig.provider,
            ...(streamed.tool_calls ? { tool_calls: streamed.tool_calls } : {}),
            ...(streamed.reasoning_content
              ? { reasoning_content: streamed.reasoning_content }
              : {}),
            // owner_required 不上报 usage：N1 约束，客户端不产生可计费 token 记录。
          };
        }
        const raw = await res.text().catch(() => "");
        logLocalRuntimeDiagnostic("provider.request.result", {
          agentKey: agentConfig.key,
          transport: "owner-oauth-proxy",
          status: res.status,
          ok: res.ok,
          responseBytes: raw.length,
        });
        const data = parsePlatformChatCompletionData(raw);
        const parsed = parsePlatformChatCompletionResponse({
          providerConfig,
          data,
          trace: messages,
        });
        return {
          ...parsed,
          // owner_required 不上报 usage：剥掉上游 usage/billing，杜绝
          // usageLedger → writeLocalTokenRecord 的客户端可计费记录。
          usage: undefined,
          billingSegments: undefined,
        };
      } catch (error) {
        if (error instanceof PlatformStreamInterruptedError) {
          logLocalRuntimeDiagnostic("provider.stream.interrupted", {
            phase: error.phase,
            frameCount: error.frameCount,
            textChars: error.textChars,
            sawDone: error.sawDone,
            sawUsage: error.sawUsage,
            sawFinishReason: error.sawFinishReason,
            elapsedMs: error.elapsedMs,
            requestId,
            ...(options?.dialogId ? { dialogId: options.dialogId } : {}),
            cause:
              error.cause instanceof Error
                ? error.cause.message
                : typeof error.cause === "string"
                  ? error.cause
                  : error.message,
          });
        }
        throw error;
      }
    },
  };
};

// Header 名只在错误文案里用一次，但保持与 ownerOriginExecution 模块同源，
// 避免字符串漂移。
const OWNER_ROUTE_VERSION_HEADER_NAME = "X-Nolo-Owner-Route-Version";
