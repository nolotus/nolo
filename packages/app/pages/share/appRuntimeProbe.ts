/**
 * 预览能不能真的跑起来 —— 详情页 iframe 之前先问一句。
 *
 * 为什么需要探针：`/apps/<id>` 的失败分支在 2026-11 前直接回 JSON，浏览器把它当文档
 * 渲染，详情页预览区整屏就是 `{"error":"沙箱启动失败: …"}` + 一个「美观输出」勾选框。
 * 现在服务端对**导航**请求返回人话失败页（`server/handlers/appSandboxFailure.ts`），
 * 探针仍然有用：它带 `accept: application/json`，拿到的是 JSON 原文，可以在挂 iframe
 * 之前就把失败态换成人话面板（不用等页面里那张卡片），也覆盖跨域前的同源场景。
 * iframe 的 `onerror` 对这种 HTTP 层的失败不会触发，`onload` 又会照常触发，
 * 所以只能自己请求一次同一个地址，按状态码/内容类型判断。
 *
 * 边界（都不猜）：
 * - 跨域目标（自定义域名 / 另一台 server）读不到响应体，直接 `skipped`，保持原来的
 *   iframe 行为 —— 没有证据就不判失败。
 * - 网络异常同样 `skipped`，不把「探测没成功」说成「应用坏了」。
 */

import { readAppRuntimeErrorText } from "./appShareTarget";

export type AppRuntimeProbeResult =
  | { state: "ok" }
  | { state: "failed"; status?: number; errorText: string }
  | { state: "skipped"; reason: "no-url" | "cross-origin" | "network" };

export interface AppRuntimeProbeOptions {
  /** 当前页面的 origin（浏览器里传 `window.location.origin`）：跨域就不探。 */
  origin?: string | null;
  /** 测试注入；默认用全局 fetch。 */
  fetchImpl?: typeof fetch;
}

const readOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isJsonResponse = (response: Response): boolean =>
  (response.headers.get("content-type") ?? "").toLowerCase().includes("json");

/**
 * 200 + JSON 也可能是失败（沙箱把失败当正常响应返回的历史路径）：
 * 只有响应体里带 `error` 字段才算失败，正常 JSON 不当失败。
 */
const readJsonErrorField = (text: string): string | null => {
  if (!text.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const error = parsed?.error;
    return typeof error === "string" && error.trim() ? error : null;
  } catch {
    return null;
  }
};

export const appRuntimeProbeTarget = (
  url: string | null | undefined,
  origin?: string | null
): { ok: true } | { ok: false; reason: "no-url" | "cross-origin" } => {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return { ok: false, reason: "no-url" };
  const targetOrigin = readOrigin(trimmed);
  if (!targetOrigin) return { ok: false, reason: "no-url" };
  if (origin && targetOrigin !== origin) return { ok: false, reason: "cross-origin" };
  return { ok: true };
};

/**
 * 失败响应体的「技术详情」文本：
 * - JSON `{error}` → 剥出内层原文（服务端就是这个形状）；
 * - HTML 错误页 / 空体 → **返回空串**：让归因走 `status`（403 空间门禁 / 404 不存在 /
 *   503 限流各给正确 reason），而不是被一个假原文「HTTP 403」带进 unknown（review H3）。
 *   技术详情里展示用的 `HTTP <status>` 由调用方补，不参与归因。
 * - 其它纯文本 → 原样（截断）。
 */
const readErrorBody = (body: string, response: Response): string => {
  const text = body.trim();
  if (isJsonResponse(response)) {
    return readAppRuntimeErrorText(text);
  }
  if (!text || text.startsWith("<")) return "";
  return readAppRuntimeErrorText(text);
};

export const probeAppRuntime = async (
  url: string | null | undefined,
  options: AppRuntimeProbeOptions = {}
): Promise<AppRuntimeProbeResult> => {
  const target = appRuntimeProbeTarget(url, options.origin);
  if (!target.ok) return { state: "skipped", reason: target.reason };

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") return { state: "skipped", reason: "network" };

  try {
    // 只求「能不能跑」：不要缓存，也不要跟导航请求混在一起（导航请求会拿到 HTML 错误页）。
    const response = await doFetch(url as string, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "follow",
    });

    if (response.ok) {
      if (!isJsonResponse(response)) return { state: "ok" };
      const body = await response.text().catch(() => "");
      const error = readJsonErrorField(body);
      if (!error) return { state: "ok" };
      return {
        state: "failed",
        status: response.status,
        errorText: readAppRuntimeErrorText(error),
      };
    }

    const body = await response.text().catch(() => "");
    return {
      state: "failed",
      status: response.status,
      errorText: readErrorBody(body, response),
    };
  } catch {
    // 跨域被挡 / 断网 / 被 abort：没有证据，交回原来的 iframe 行为。
    return { state: "skipped", reason: "network" };
  }
};
