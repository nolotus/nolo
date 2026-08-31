/**
 * Shared wire-protocol drain reason.
 *
 * During a single-origin deploy the server rejects new stateful admissions with
 * `503 {"error":"Server draining","reason":"core_draining","retryable":true}`.
 * Both sides of the wire must agree on the exact `reason` string:
 * - server producers: `serverDraining.ts` (drain response), `serverProxyRetry.ts`
 *   (503 classification for upstream retry)
 * - client consumers: TUI platform proxy (`localRuntimeFetchRetry.ts`), Web
 *   background run start (`runAgentBackground.ts`)
 *
 * Keep one definition so the drain protocol string cannot drift across
 * packages. Dependency-free so pure unit tests do not pull CLI/AI modules.
 */
export const CORE_DRAIN_REASON = "core_draining";

/** Server-side alias matching the historical `SERVER_DRAIN_REASON` naming. */
export const SERVER_DRAIN_REASON = CORE_DRAIN_REASON;

/**
 * 用户可见的 drain 耗尽提示（retry 预算用完后给用户看，而非 raw JSON）。
 *
 * 三个入口（web serverProxyRetry / CLI localRuntimeFetchRetry / background
 * runAgentBackground）各自重试 30 次 × 1.5s ≈ 45s 后仍遇到 core_draining，
 * 说明服务端 drain 窗口异常长（正常 deploy ≤ 30s）。此时不应把
 * `{"error":"Server draining",...}` 原样抛给用户，换成一句人话。
 */
export const DRAIN_EXHAUSTED_USER_MESSAGE =
  "服务正在重启中，请稍后重试";

/**
 * 判断一个 503 响应体是否为 core_draining 结构。
 * 供 retry 耗尽后的友好替换逻辑复用，避免各调用方各自 parse。
 */
export function isCoreDrainingBody(body: unknown): body is { reason: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { reason?: unknown }).reason === CORE_DRAIN_REASON
  );
}

/**
 * 构造 drain 耗尽后的友好 503 Response（替换 raw JSON body）。
 * 只保留 Retry-After（重试节奏信号），丢弃 Content-Length/Content-Type 等
 * 指向旧 body 的字段——新 body 长度与旧 JSON 不同，继承会导致客户端按旧
 * Content-Length 截断，读到残缺或乱码。
 */
export function createDrainExhaustedResponse(original: Response): Response {
  const retryAfter = original.headers.get("Retry-After");
  const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };
  if (retryAfter) headers["Retry-After"] = retryAfter;
  return new Response(DRAIN_EXHAUSTED_USER_MESSAGE, {
    status: 503,
    headers,
  });
}

/**
 * 判断响应是否为共享重试层 drain 预算耗尽后的友好替换响应
 * （createDrainExhaustedResponse 的产物：503 + text/plain + DRAIN_EXHAUSTED_USER_MESSAGE 文案）。
 * 读路径调用方据此区分「耗尽」与普通 503：耗尽必须透传友好提示，不得吞成
 * not found / 空结果（那会把基础设施故障伪装成业务事实）。
 *
 * 这是协议判定，不是模糊文案匹配：除 status 外必须先校验 Content-Type
 * media-type（忽略 charset/参数、忽略大小写）为 text/plain——
 * createDrainExhaustedResponse 恒定产出 `text/plain; charset=utf-8`，而普通
 * 应用 503 几乎总是 JSON；即使某个应用 503 的 JSON body 恰好含同样文案，
 * 也不能被误判成共享层产物。全文匹配在 clone 上进行，避免消费调用方要用的
 * 响应体。
 */
export async function isDrainExhaustedResponse(
  response: Response,
): Promise<boolean> {
  if (response.status !== 503) return false;
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "text/plain") return false;
  try {
    return (await response.clone().text()) === DRAIN_EXHAUSTED_USER_MESSAGE;
  } catch {
    return false;
  }
}
