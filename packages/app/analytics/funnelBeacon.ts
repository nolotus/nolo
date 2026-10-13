// 首页漏斗 beacon：POST /api/e（服务端白名单 + 限流 + 按天聚合）。
// 不加载第三方像素；source 由服务端从 nolo_attr cookie 解析，客户端不传。

export type FunnelBeaconEvent =
  | { event: "landing_view" }
  | { event: "signup_view" }
  | { event: "cta_click"; which: "signup" | "download"; position: "hero" | "closing" };

export const FUNNEL_BEACON_PATH = "/api/e";

export function sendFunnelBeacon(payload: FunnelBeaconEvent): void {
  try {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    // 桌面端 / 非 http(s) 环境不上报
    if (!/^https?:$/.test(window.location.protocol)) return;
    const body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(FUNNEL_BEACON_PATH, blob)) return;
    }
    void fetch(FUNNEL_BEACON_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // 统计失败不影响页面
  }
}

/** CTA 位于结语区还是首屏：按 DOM 位置判断，避免改动页面结构。 */
export function resolveCtaPosition(target: EventTarget | null): "hero" | "closing" {
  const el = target as { closest?: (selector: string) => unknown } | null;
  return el?.closest?.(".hl-closing") ? "closing" : "hero";
}
