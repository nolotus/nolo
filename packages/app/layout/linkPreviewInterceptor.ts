/**
 * 跨端通用的链接拦截器（Click-to-Preview）。
 *
 * 点击跨域的 http(s) 链接时，拦截并在分栏工作台（WorkbenchSplit）的 iframe
 * 中打开，保持用户在对话界面的心智连续性，避免直接跳离或弹外部浏览器。
 *
 * 始终保留逃生通道：Cmd / Ctrl + 点击（或中键点击）保持浏览器默认在新标签打开。
 */

export function installLinkPreviewInterceptor(
  scope?: Document | HTMLElement
): () => void {
  const targetScope = scope ?? (typeof document !== "undefined" ? document : null);
  if (!targetScope) return () => {};

  const handler = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    let url: URL;
    try {
      const base = typeof window !== "undefined" ? window.location.href : "https://localhost";
      url = new URL(href, base);
    } catch {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (typeof window !== "undefined" && url.origin === window.location.origin) return;
    event.preventDefault();
    void import("app/appInspector/appInspectorStore").then((m) => {
      m.openPreviewTarget({ kind: "url", url: url.toString() });
    });
  };

  targetScope.addEventListener("click", handler as EventListener, true);
  return () => {
    targetScope.removeEventListener("click", handler as EventListener, true);
  };
}
