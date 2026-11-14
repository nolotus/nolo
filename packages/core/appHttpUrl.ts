/**
 * app 访问地址的协议校验（web 与 server 共用）。
 *
 * 为什么单独一层：分享数据里的 `url` 会被
 * 1. 前端渲染成「打开应用」的链接（`app/pages/share/*`、`ShareCard`）；
 * 2. 服务端透出到社区列表（`share/server/helpers.ts` 的 `ShareSummary.url`）。
 * 两处都必须只接受 http(s) 绝对地址——用前缀/regex 判断会把
 * `javascript:alert(1)`、`http://` 这类值当成可用地址（见下方注释），
 * 那是可点的 XSS 面。所以判定只有这一份实现。
 */

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

const normalizeAbsoluteUrl = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

// URL 解析验证：只有能被 URL 解析且协议为 http(s) 的绝对地址才算有效访问地址。
// regex 前缀判断会把 "javascript:alert(1)"、"http://" 这类误判为可用地址。
const parseHttpUrl = (value?: string | null): URL | undefined => {
  const normalized = normalizeAbsoluteUrl(value);
  if (!normalized) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return undefined;
  }
  if (!HTTP_PROTOCOLS.has(parsed.protocol)) return undefined;
  return parsed;
};

/** 合法 http(s) 绝对地址原样返回，否则 `undefined`（调用方决定 null / 丢弃）。 */
export const normalizeAppHttpUrl = (value?: string | null): string | undefined => {
  const normalized = normalizeAbsoluteUrl(value);
  if (!normalized || !parseHttpUrl(normalized)) return undefined;
  return normalized;
};

/** 只取 origin（同样是 http(s) 校验后的结果）。 */
export const normalizeAppHttpOrigin = (value?: string | null): string | undefined =>
  parseHttpUrl(value)?.origin;

/**
 * 从「应用运行地址」里取 appId：只认 `<origin>/apps/<appId>` 这一层。
 *
 * 用途（review HIGH-1）：服务端要能判断「分享里带的 url 是否真的指向同一个 app」，
 * 否则可以用自己的 appId 配一条指向他人应用的 url，让社区卡片的主按钮跑别人的应用。
 * 不是这个形状就返回 null（调用方拒绝或按无地址处理）。
 */
export const appRuntimePathAppId = (value?: string | null): string | null => {
  const parsed = parseHttpUrl(value);
  if (!parsed) return null;
  const match = parsed.pathname.match(/^\/apps\/([^/]+)(?:\/.*)?$/);
  const appId = match?.[1]?.trim();
  return appId ? decodeURIComponent(appId) : null;
};

/** 判断 url 是否指向给定 appId 的运行入口。 */
export const isAppRuntimeUrlFor = (
  value: string | null | undefined,
  appId: string | null | undefined
): boolean => {
  const target = typeof appId === "string" ? appId.trim() : "";
  if (!target) return false;
  return appRuntimePathAppId(value) === target;
};

/**
 * 由 appId + origin 重建运行地址（服务端/前端共用）：
 * `${origin}/apps/${appId}/`。origin 不合法的 http(s) 地址就返回 undefined。
 */
export const buildAppRuntimeUrl = (
  appId?: string | null,
  origin?: string | null
): string | undefined => {
  const id = typeof appId === "string" ? appId.trim() : "";
  const normalizedOrigin = normalizeAppHttpOrigin(origin);
  if (!id || !normalizedOrigin) return undefined;
  return `${normalizedOrigin}/apps/${id}/`;
};
