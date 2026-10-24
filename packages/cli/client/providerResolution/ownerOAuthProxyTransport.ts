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

/**
 * owner-required 请求体禁止携带的字段——与服务端 admission 的 OVERRIDES
 * 黑名单逐字对应（packages/server/ownerRequiredModelAdmission.ts）。命中任何
 * 一个，admission 直接 400 owner_origin_invalid：model/provider/凭据类字段
 * 一律由服务端按 agent 记录与 owner OAuth 解析，客户端不得在 body 声称。
 * 这是 fail-closed 的防路由篡改边界，不是可协商的兼容项。
 *
 * 防漂移要求：两侧列表（本常量 / 服务端 OVERRIDES / 测试断言清单）任一方
 * 增删字段时必须同步另外两方，并跑两侧一致性核对——只改一侧会让客户端在
 * 真实链路上再次 400，而现有测试不会自动发现分叉。
 */
const OWNER_PROXY_BODY_FORBIDDEN_KEYS = [
  "KEY",
  "apiKey",
  "url",
  "provider",
  "providerName",
  "apiSource",
  "apiKeyHeader",
  "apiKeyRef",
  "model",
  "ownerUserId",
  "credentialUserId",
  "agentHydratedKey",
  "credentialPolicy",
] as const;

/**
 * 本调用点的可重试状态码集合。**不改** core 的全局默认（{429,503}）——
 * 那个集合影响所有调用方，这里只在 owner-required 这一条链上沿用同样的口径。
 *
 * - 503：服务端明示的排空信号（core_draining / retryable:true），既有语义逐字保留。
 * - 429：与 core 默认口径一致地列在这里，但**是否真的重试由 shouldRetryResponse
 *   决定**，而该钩子只放行 503 的排空信号；所以 429 在本调用点的实际行为与
 *   改动前完全一致（不重试）。
 * - 500：**不在集合里**。500 是服务端兜底码——未知内部错误、代理自身的 TypeError、
 *   上游 fetch 抛错都落在 500 PROXY_FAILED / UPSTREAM_TRANSPORT_ERROR 上
 *   （见 packages/server/handlers/chatHandler.ts 的 PROXY_FAILED 兜底分支），
 *   它表达的是「服务端这次没成」，不是「上游明确没受理、可以安全重放」。
 *   服务端对 UPSTREAM_TRANSPORT_ERROR 刻意保留「服务端是唯一重试所有者」的契约
 *   （leaving the server as the single retry owner），客户端再重放一次只会把
 *   可能已经发往上游的推理重复一遍（重复 token / 重复计费）。所以 500 一律不重试。
 */
const OWNER_PROXY_RETRYABLE_STATUSES = new Set([429, 503]);

/**
 * 单次逻辑请求（一次 complete()）的 **HTTP 尝试总上界**。
 *
 * 内层 core 的 503 core_draining 长预算（core 默认 30 次）与外层 403
 * owner_origin_mismatch 的额外尝试（最多 2 次）**共享同一个总预算**：每次外层
 * 重试前都按「总上界 - 已用尝试」重新计算内层预算，而不是让内层每次从零开始。
 * 因此一次 complete() 的 HTTP 请求数恒 ≤ 30，不会出现「内层 30 次 × 外层 3 轮」
 * 的相乘放大（重置预算的旧实现最坏可达 90 次）。
 *
 * 取 30 的理由：与 core 的 CORE_DRAINING_MAX_ATTEMPTS（30）对齐，让**纯** 503
 * core_draining 的行为与改动前逐字一致（仍能等到排空窗口结束），混合序列不再
 * 额外放大。
 */
const OWNER_PROXY_TOTAL_MAX_ATTEMPTS = 30;

/**
 * 内层 core 的通用尝试预算（普通可重试状态码，如 retryable:true 的 503）。
 * 与 core 默认 TRANSIENT_FETCH_MAX_ATTEMPTS（3）一致；显式写出是为了在剩余
 * 总预算变小时能被同比例裁剪（min(3, remaining)）。
 */
const OWNER_PROXY_GENERIC_MAX_ATTEMPTS = 3;

/**
 * 内层 core 的 503 core_draining 长预算上限。与 core 默认
 * CORE_DRAINING_MAX_ATTEMPTS（30）一致，实际取 min(30, remaining)。
 */
const OWNER_PROXY_CORE_DRAINING_MAX_ATTEMPTS = 30;

/**
 * 读出响应体里的结构化错误码。服务端统一 envelope 是
 * `{"error":{"code":"..."}}`（403 owner_origin_mismatch / 500 PROXY_FAILED /
 * 500 UPSTREAM_TRANSPORT_ERROR 都走它）；顶层 `code` 作为容错分支一并认。
 *
 * 用 clone() 读，绝不消费调用方要用的响应体（错误文案分支还要 res.text()）。
 */
async function readStructuredErrorCode(
  response: Response,
): Promise<string | null> {
  try {
    const body = (await response.clone().json()) as {
      error?: { code?: unknown } | unknown;
      code?: unknown;
    };
    const nested = (body?.error as { code?: unknown } | undefined)?.code;
    if (typeof nested === "string") return nested;
    return typeof body?.code === "string" ? body.code : null;
  } catch {
    // 非 JSON / body 不可读：没有结构化 code → 不可重试。
    return null;
  }
}

/**
 * 本调用点的响应重试闸门。
 *
 * - 503：只重试服务端明示可重试的排空信号（core_draining / retryable:true），
 *   与改动前逐字一致。
 * - 500：**一律不重试**。500 是服务端兜底码（PROXY_FAILED / UPSTREAM_TRANSPORT_ERROR
 *   / 未知内部错误共用），不是「上游没受理、可以安全重放」的信号；服务端自己
 *   保留重试所有权，客户端重放会把可能已发往上游的推理重复一遍。
 * - 其它状态码（含 429）：不放行，行为与改动前一致。
 */
export async function shouldRetryOwnerProxyResponse(
  response: Response,
): Promise<boolean> {
  if (response.status === 503) {
    try {
      const body = (await response.clone().json()) as {
        reason?: unknown;
        retryable?: unknown;
      };
      return body?.reason === "core_draining" || body?.retryable === true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 403 owner_origin_mismatch 的**有界**额外重试预算与退避表。
 *
 * 为什么单独一套（core 的 fetchWithTransientRetry 表达不了这个语义）：
 * core 的重试是「状态码 ∈ retryableStatuses 且 shouldRetryResponse 放行」，
 * 退避固定为 attempt*250ms（上限 2s）。而 owner_origin_mismatch 的真实成因是
 * 服务端**进程内存里的连接器注册表**在 core 重启后被清空
 * （packages/server/ownerRequiredModelAdmission.ts 的 hasConnection），要等本机
 * 连接器的 WS 重连完成才恢复——那是秒级窗口，250ms 级的退避几乎必然全部落空。
 * 所以 403 走本文件内的有界重试：窗口与语义显式掌控，且不影响其它 403。
 *
 * 退避取值依据（5s / 15s）：本机连接器 WS 重连通常在几秒内完成（服务端重启后
 * 客户端会自动重连），5s 盖住一次快速重连，15s 覆盖较慢的一次；两次合计约 20s，
 * 是「等到连接器回来」与「别把用户卡住」之间的折中，且严格有界。
 *
 * maxExtraAttempts=2 → 最多再试 2 次。**真实总上界**（旧注释「总请求数 ≤ 3」是
 * 错的，已更正）：
 * - 纯 403 owner_origin_mismatch 路径（内层一次都没重试过）：总请求数 ≤ 3。
 * - 任意混合序列：一次 complete() 的 HTTP 请求数 ≤ OWNER_PROXY_TOTAL_MAX_ATTEMPTS
 *   （30）——内层 core_draining 长预算与外层 403 额外尝试**共享同一个总预算**，
 *   外层每次重试都按「总上界 - 已用尝试」裁剪内层预算，不会把内层预算重置成
 *   30 次重来（那会让混合序列放大到 90 次）。
 *
 * 耗尽后走既有错误分支，
 * 状态码与文案不变：agentRun.ts 对 owner_origin_mismatch 的提示分支依赖
 * 「HTTP 403 + owner-required proxy failed + owner_origin_mismatch」三要素，
 * 这里只改「重试几次」，不改「最终报什么」。
 *
 * 该对象可变**仅为测试可注入**（测试不该真等 5s+15s）；生产路径只读。
 */
export const OWNER_ORIGIN_MISMATCH_RETRY_BUDGET = {
  /** 额外尝试次数上限（不含首次请求）。 */
  maxExtraAttempts: 2,
  /** 每次额外尝试前的等待时长（ms），按序使用。 */
  delaysMs: [5_000, 15_000] as number[],
};

/**
 * 可被 AbortSignal 中断的等待：abort 立即以 signal.reason 拒绝并清理定时器，
 * 不空等到退避结束（与 packages/agent-runtime/codexResponsesProvider.ts 的
 * waitBackoff 同一形状）。
 */
function waitWithAbort(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? new Error("owner-required proxy aborted"));
  }
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new Error("owner-required proxy aborted"));
    };
    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * owner_origin_mismatch 的有界重试。
 *
 * 只有 `403 + {"error":{"code":"owner_origin_mismatch"}}` 才重试；**其它 403
 * （如 invalid api key）语义完全不变，立即失败**——凭据类 403 重试没有意义，
 * 还会把认证失败伪装成「慢」。
 *
 * 总上界由两条规则共同保证（可证明，见 OWNER_PROXY_TOTAL_MAX_ATTEMPTS）：
 * 1. **共享总尝试预算**：内层 core 的尝试预算按「总上界 - 已用尝试」裁剪，
 *    外层重试不会把内层预算重置成从零开始。
 * 2. **内层已重试过就不再外层重试**：内层一旦发生任何重试（core_draining 等待
 *    排空窗口），本次请求已经消耗掉共享总预算里的多次尝试；再叠加外层重试只会
 *    放大请求数量，而 403 的恢复条件（连接器注册表回填）与排空窗口无关。
 *
 * 于是实际行为分两种：内层从未重试（纯 403）→ 最多再试 2 次、总请求数 ≤ 3；
 * 内层重试过 → 外层不再重试、总请求数 ≤ 30。
 *
 * 幂等性：重试的是同一次模型请求本身（同一 body、同一 requestId），不重复
 * 执行工具调用，因此安全。绝不能把这种重试加到工具执行或写操作路径上。
 */
async function sendWithOwnerOriginMismatchRetry(
  send: () => Promise<{ response: Response; innerRetried: boolean }>,
  signal: AbortSignal | undefined,
  onRetry?: (info: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
  }) => void,
): Promise<Response> {
  let attempt = await send();
  for (let extra = 0; extra < OWNER_ORIGIN_MISMATCH_RETRY_BUDGET.maxExtraAttempts; extra += 1) {
    const response = attempt.response;
    if (response.status !== 403) return response;
    const code = await readStructuredErrorCode(response);
    if (code !== "owner_origin_mismatch") return response;
    // 内层已经重试过 → 不再叠加外层重试（见上方「总上界」说明）。
    if (attempt.innerRetried) return response;
    const delayMs = OWNER_ORIGIN_MISMATCH_RETRY_BUDGET.delaysMs[extra] ?? 0;
    onRetry?.({
      attempt: extra + 1,
      maxAttempts: OWNER_ORIGIN_MISMATCH_RETRY_BUDGET.maxExtraAttempts,
      delayMs,
    });
    // 等待期间 abort 立即打断：不等满退避、不再发下一次请求。
    await waitWithAbort(delayMs, signal);
    attempt = await send();
  }
  return attempt.response;
}

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
      // 把 owner-required 扩展注入顶层 body。注意与 platform-proxy 的差别：
      // 其余 wire 字段只许保留 messages/tools/stream 等中性字段——override
      // 类字段（model/provider/凭据…）必须剥掉，否则服务端 admission 的
      // OVERRIDES 黑名单会以 400 owner_origin_invalid 拒绝（fail-closed）。
      const body = JSON.parse(request.init.body as string) as Record<string, unknown>;
      body.ownerOriginExecution = ownerOriginExecution;
      for (const key of OWNER_PROXY_BODY_FORBIDDEN_KEYS) {
        delete body[key];
      }
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
        // 幂等性说明（为什么这条链上可以重试）：
        // 重试的是**同一次模型请求本身**——同一个 body、同一个 requestId，服务端
        // 因此处理的是同一条 owner-required 派发。重试**不会**重复执行任何工具
        // 调用：工具执行发生在模型响应之后，由本地执行器单独驱动，不在这条重试
        // 路径上。所以 403（连接器注册表暂时为空）重放是安全的。
        // 反过来：绝不能把这类重试加到**工具执行或任何写操作**路径上——那些路径
        // 重放会造成重复副作用（重复写文件、重复下单、重复扣费）。
        // 500 不在此列：500 是服务端兜底码，请求可能已经发往上游并产生推理/计费，
        // 服务端保留重试所有权（single retry owner），客户端不重放。
        //
        // 共享总尝试预算：usedAttempts 跨外层轮次累计，内层预算按剩余额度裁剪，
        // 外层重试**不会**把内层预算重置（见 OWNER_PROXY_TOTAL_MAX_ATTEMPTS）。
        let usedAttempts = 0;
        const send = async () => {
          const remaining = Math.max(
            1,
            OWNER_PROXY_TOTAL_MAX_ATTEMPTS - usedAttempts,
          );
          let innerRetries = 0;
          const response = await fetchWithTransientRetry(
            fetchImpl,
            request.url,
            init,
            {
              sleep: deps.sleep,
              loopbackRequest,
              // 与 platform-proxy 同口径：网络错误不重放（服务端可能已受理，重放会
              // 产生重复扣费/重复 tool_calls）。
              retryableStatuses: OWNER_PROXY_RETRYABLE_STATUSES,
              shouldRetryResponse: shouldRetryOwnerProxyResponse,
              retryNetworkErrors: false,
              // 内层预算按「剩余总额度」裁剪：普通可重试状态码 ≤ 3 次、503
              // core_draining 排空窗口 ≤ 30 次，且都不超过剩余总额度。
              maxAttempts: Math.min(
                OWNER_PROXY_GENERIC_MAX_ATTEMPTS,
                remaining,
              ),
              coreDrainingMaxAttempts: Math.min(
                OWNER_PROXY_CORE_DRAINING_MAX_ATTEMPTS,
                remaining,
              ),
              // 注意：计数必须**无条件**挂在 onRetry 上——若只在有 activityReporter
              // 时才挂，innerRetries / usedAttempts 会漏计，重试预算就形同虚设。
              onRetry: ({ attempt, maxAttempts, delayMs }) => {
                innerRetries += 1;
                usedAttempts += 1;
                deps.activityReporter?.(
                  `自动重试 ${attempt}/${maxAttempts} · ${Math.ceil(delayMs / 1000)}s`,
                );
              },
            },
          );
          // 本次 send 的首次尝试也计入总预算。
          usedAttempts += 1;
          return { response, innerRetried: innerRetries > 0 };
        };
        // 403 owner_origin_mismatch 的有界重试放在 core helper 之外：它需要的是
        // 「等连接器 WS 重连」的秒级窗口，而不是 core 的 attempt*250ms 退避。
        const res = await sendWithOwnerOriginMismatchRetry(
          send,
          init.signal ?? undefined,
          deps.activityReporter
            ? ({ attempt, maxAttempts, delayMs }) => {
                deps.activityReporter!(
                  `自动重试 ${attempt}/${maxAttempts} · ${Math.ceil(delayMs / 1000)}s`,
                );
              }
            : undefined,
        );
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
        // Fail-closed：仅对 2xx 成功响应验证 ack 头。缺 ack / 版本不符 /
        // requestId 错位都视为服务端未走 owner-only 路径（旧 server、proxy role、
        // 或扩展被吞）。此时绝不能回落到本机凭据，也不能按 200 静默成功。
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
