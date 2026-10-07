// packages/app/settings/serverBootstrap.ts
//
// 单一职责：为 web 首帧推导 currentServer（运行时 origin）。
// 由 settingInitialState.ts（客户端 module load）、web/entry.tsx（hydrate 前覆盖
// preloadedState）与 server/render.tsx（SSR 序列化，origin 由请求 Host + 协议推导）
// 共同调用，保证两端同源、无 hydration mismatch。
//
// 为什么存在：旧逻辑把生产默认写成 SERVERS.MAIN，App.tsx mount effect 才
// dispatch(addHostToCurrentServer(runtimeOrigin)) 改写。在 us.nolo.chat 上
// 首屏会先把一批单服务器请求打到 nolo.chat，改写后对 us.nolo.chat 重发。
// 首帧就用运行时 origin 即可消掉这个窗口。
//
// 判定与旧 effect（App.tsx：`if (hostname === dateUrl || hostname === crmUrl) return;`
// / `if (!isDesktopApp) dispatch(addHostToCurrentServer(runtimeOrigin))`）等价：
//   - desktop shell → undefined（内嵌 origin 的回退规则在 resolveDesktopSafeServer，
//     不许在这里截断）；
//   - date.nolo.chat / crm.nolo.chat 子应用站点 → undefined（其 origin 不是 API
//     server，必须继续走默认 MAIN/US）。排除列由 siteRoutes.hostToSite 派生
//     （NON_API_SITE_HOSTNAMES），本模块不再自带第二份名单；
//   - 其余 host（含局域网 IP / 自定义域名 / localhost 的本地开发）→ 规范化后的
//     运行时 origin。
// 否则返回 undefined，调用方回退到默认（生产 MAIN / 开发 US）。
//
// 白名单闸门 SSR_TRUSTED_SITE_HOSTNAMES 有两个消费点，共用同一真值：
//   - SSR：resolveSsrBootstrapServer 决定是否把「请求头推导出的 origin」序列化进
//     preloadedState；
//   - 客户端：resolveClientHydrateServer 决定是否在 hydrate 前把 preloadedState 的
//     currentServer 覆盖为运行时 origin。
// 两端同闸门 ⇒ hydrate 帧与 SSR HTML 逐字节一致（分享类页面会把 currentServer
// 渲染进 URL，见 render/web/elements/ImageElement.tsx、
// render/web/ui/ReadOnlyMarkdownContent.tsx）。非白名单 host（localhost 开发、
// 局域网、自建域名）两端都保持默认，由 App.tsx 的 mount effect
// dispatch(addHostToCurrentServer(runtimeOrigin)) 在挂载后按运行时 origin 纠正
// （= 本改动之前的路径）。

import { getIsDesktopApp } from "app/utils/env";
import { NON_API_SITE_HOSTNAMES } from "app/web/siteRoutes";

/**
 * SSR 注入白名单：允许把请求推导出的浏览器 origin 写进序列化状态
 * （preloadedState.settings.currentServer）的正式站点主机名。
 *
 * 为什么需要闸门：SSR 只能从 Host / X-Forwarded-Host / X-Forwarded-Proto 猜浏览器
 * 所见 origin，而反代的改写语义不受本仓控制（Host 被改写成内网名、XFH 被设成
 * 异源都可能）。猜错的值会经 ReadOnlyMarkdownContent.tsx / ImageElement.tsx 渲染
 * 进 src 属性，在分享类首帧造成 hydration 属性不匹配（极窄条件下 pre-hydration
 * 图片请求还会打到内网/异源）。收窄到这两个正式站点后，内网名/异源不可能进入
 * 序列化状态；猜错时 preloadedState 保持默认，客户端 entry.tsx 走同一个闸门
 * （resolveClientHydrateServer）也不会覆盖，hydrate 帧两边一致。非白名单 host
 * （局域网开发 / 自建域名）同样两端保持默认，由 App.tsx 的 mount effect 在挂载后
 * 把 currentServer 指回运行时 origin，功能不受影响。
 */
export const SSR_TRUSTED_SITE_HOSTNAMES: ReadonlySet<string> = new Set([
  "nolo.chat",
  "us.nolo.chat",
]);

/** Host 头可能带端口/大写/尾点，比对前统一剥端口、小写化并去尾点。 */
const normalizeHostname = (hostname?: string | null): string =>
  (hostname ?? "").trim().toLowerCase().split(":")[0]?.replace(/\.$/, "") ?? "";

/**
 * 子应用站点判定：该 host 的 origin 不是 API server，首帧 currentServer 必须保持
 * 默认。真值来自 siteRoutes.hostToSite（nolotus.local 标记 servesApi，不在排除集
 * 内）。App.tsx 的 mount effect 与本模块的 resolveCloudBootstrapServer 共用此判定。
 */
export const isNonApiSiteHostname = (hostname?: string | null): boolean =>
  NON_API_SITE_HOSTNAMES.has(normalizeHostname(hostname));

/**
 * 规范化 http(s) origin：去默认端口（:443/:80）、去 path/query、host 小写，
 * 与浏览器 window.location.origin 的序列化口径一致；非法或非 http(s) → undefined。
 */
const resolveHttpOrigin = (origin?: string | null): string | undefined => {
  const raw = typeof origin === "string" ? origin.trim() : "";
  if (raw === "") return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.origin;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * 从 hostname/origin 推 web 首帧 currentServer（客户端与 SSR 共用）。
 * - hostname 命中 date/crm → undefined（调用方保持默认）；
 * - origin 必须是合法 http(s)，返回其规范化 origin（去默认端口 / 去 path /
 *   host 小写，与浏览器 window.location.origin 的序列化口径一致）；
 * - 其余（desktop、非法 origin）→ undefined。
 */
export const resolveCloudBootstrapServer = (input: {
  hostname?: string | null;
  origin?: string | null;
}): string | undefined => {
  if (getIsDesktopApp()) return undefined;
  if (isNonApiSiteHostname(input.hostname)) return undefined;
  return resolveHttpOrigin(input.origin);
};

/** 主机名是否属于「SSR 与客户端共用」的正式站点白名单（归一化后比对）。 */
const isTrustedSiteHostname = (hostname?: string | null): boolean =>
  SSR_TRUSTED_SITE_HOSTNAMES.has(normalizeHostname(hostname));

/**
 * 浏览器端 hydrate 前覆盖 preloadedState.settings.currentServer 的闸门
 * （entry.tsx 消费）：只有运行时 host 命中正式站点白名单才返回运行时 origin；
 * 其余 host 返回 undefined → 调用方保留 SSR 下发的值（= 本改动之前的行为），
 * 由 App.tsx 的 mount effect dispatch(addHostToCurrentServer(runtimeOrigin))
 * 在挂载后纠正。
 *
 * 为什么必须与 SSR 同闸门：SSR 只在白名单站点注入。若客户端对任意非 date/crm/desktop
 * host 都覆盖成运行时 origin，非白名单 host 的 SSR 首帧（默认 MAIN/US）与客户端
 * hydrate 首帧（运行时 origin）就不一致 → 分享类页面（ImageElement /
 * ReadOnlyMarkdownContent 把 currentServer 渲染进 URL）出现 hydration 属性不匹配，
 * 以及指向默认服务器的 pre-hydration 图片请求。
 *
 * 已知残面：正式站点 + 反代改写 Host 且未带 X-Forwarded-Host 时，SSR 推导出的
 * host 不在白名单 → 不注入（首帧为默认），而客户端仍覆盖为运行时 origin → 该场景
 * 下首帧仍可能不匹配；换来的是挂载后/首帧的浏览器权威 origin，且不再先打默认
 * 服务器。此残面依赖反代配置，不在本仓可判范围内。
 */
export const resolveClientHydrateServer = (input: {
  hostname?: string | null;
  origin?: string | null;
}): string | undefined => {
  if (!isTrustedSiteHostname(input.hostname)) return undefined;
  return resolveCloudBootstrapServer(input);
};

/**
 * SSR 侧专用入口：入参是 resolveRequestBrowserOrigin(req) 推导出的「浏览器所见
 * origin」。只有该 origin 的主机名属于 SSR_TRUSTED_SITE_HOSTNAMES 时才返回可注入
 * 值；否则返回 undefined，调用方保持 preloadedState 默认（= 本改动之前的行为）。
 *
 * 与客户端共用一个闸门（resolveClientHydrateServer），保证 SSR 注入值与客户端
 * hydrate 前覆盖值同源。
 *
 * 比较口径：主机名归一化（去端口 / 小写 / 去尾点）后比对；非默认端口（如 :8445
 * 预览）保留在返回的 origin 里。
 */
export const resolveSsrBootstrapServer = (
  requestBrowserOrigin?: string | null,
): string | undefined => {
  const origin = resolveHttpOrigin(requestBrowserOrigin);
  if (!origin) return undefined;
  // origin 已由上一步规范化，可安全重新解析取 hostname。
  return resolveClientHydrateServer({
    hostname: new URL(origin).hostname,
    origin,
  });
};
