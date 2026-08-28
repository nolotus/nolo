/**
 * 把上游的错误响应文本转成 `{ error: … }` body，**保留上游的结构化字段**。
 *
 * 为什么重要：上游 4xx/429 的 body 通常是结构化 JSON，其中
 * `error.resets_at` / `retry_after` / `details[].retryInfo.retryDelay`
 * 是可用性冷却时长的唯一准确来源。若把整段响应文本无条件塞进
 * `error.message`，这些字段就退化成字符串的一部分，
 * `resolveNextAvailableAt` 读不到它们，冷却回落到 5 分钟默认值——
 * 于是配额耗尽的凭证在 5 分钟后又会被重新撞一次，循环往复。
 *
 * 线上实测过一次真实退化：ChatGPT Codex 的配额耗尽 429 携带
 * `resets_at=1788140204`（8 天后），却被记成 now+5min。
 *
 * 解析成功且 `error` 是对象时原样保留上游结构；其余情况一律回退到
 * message 包装，保持既有行为：
 * - 非 JSON（HTML 错误页、网关纯文本）
 * - 空 body（用 statusText）
 * - `{"error":"字符串"}`、`{"error":null}`、顶层数组
 *
 * 调用方常读的 `body.error.message` 在两条路径上都可用——结构化路径下拿到的
 * 是干净的上游描述，而不是整段 JSON 原文。
 */
export function parseUpstreamErrorBody(
  errorText: string,
  statusText: string,
): Record<string, unknown> {
  if (errorText) {
    try {
      const parsed: unknown = JSON.parse(errorText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const error = (parsed as Record<string, unknown>).error;
        if (error && typeof error === "object" && !Array.isArray(error)) {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      // 非 JSON：走下面的文本包装。
    }
  }
  return { error: { message: errorText || statusText } };
}
