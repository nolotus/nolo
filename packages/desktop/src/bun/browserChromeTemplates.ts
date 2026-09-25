// packages/desktop/src/bun/browserChromeTemplates.ts
//
// 浏览器窗口的独立地址栏 chrome。注入到非 sandbox 的 BrowserWindow，
// 提供地址栏、后退、前进、刷新，通过 host-message 与主进程通信。
//
// 视觉与交互对齐主窗口的原生标题栏高度区：同为 34px 浅色玻璃条、28px 控件、
// 同一套 hover/active 反馈。地址栏带站点图标与
// https 提示；注入后给 <html> 顶部补 padding，避免固定条遮住站点头部。
// （2026-09-16 调整：此前条带悬在 top:28px——窗口用原生标题栏时顶部会露出约
// 28px 的页面内容——且不做内容让位，会盖住站点头部。）
//
// 已知边界（review 2026-09-16 记录）：html 的 padding-top 只让位文档流与 sticky
// 元素；站点自己的 `position: fixed; top: 0` 顶栏仍会被条带覆盖——这是注入式
// chrome 的固有限制，真正隔离需要多 webview。html 同时补 box-sizing: border-box，
// 避免 `height: 100%` 的全屏应用因 padding 溢出出滚动条。

export const BROWSER_CHROME_HTML = `
<div id="nolo-browser-shellbar">
  <button type="button" data-action="back" aria-label="Back" title="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
  <button type="button" data-action="forward" aria-label="Forward" title="Forward"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
  <button type="button" data-action="reload" aria-label="Reload" title="Reload"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.4 0 4.6.9 6.3 2.5L21 8"/><path d="M21 3v5h-5"/></svg></button>
  <div id="nolo-browser-addressbox">
    <img id="nolo-browser-favicon" alt="" hidden />
    <svg id="nolo-browser-lock" viewBox="0 0 24 24" aria-hidden="true" hidden><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
    <svg id="nolo-browser-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>
    <input type="text" id="nolo-browser-address" placeholder="输入网址或搜索" spellcheck="false" autocomplete="off" autocapitalize="off" />
  </div>
</div>
`;

export const BROWSER_CHROME_CSS = `
:root { --nolo-browser-chrome-h: 34px; }
html {
  box-sizing: border-box !important;
  padding-top: var(--nolo-browser-chrome-h, 34px) !important;
}
/* Chrome 实测：inline svg 上 hidden 属性/属性赋值都不会隐藏元素（SVGElement 没有
   hidden IDL，UA 的 [hidden] 规则也不作用于 svg），地址栏的三个图标必须显式兜底。 */
#nolo-browser-shellbar [hidden] { display: none !important; }
#nolo-browser-shellbar {
  position: fixed; inset: 0 0 auto 0; height: var(--nolo-browser-chrome-h, 34px);
  z-index: 2147483647; display: flex; align-items: center; gap: 8px;
  box-sizing: border-box; padding: 0 12px;
  border-bottom: 1px solid rgba(15,23,42,0.08);
  background: rgba(248,250,252,0.94); backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  font: 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
}
#nolo-browser-shellbar, #nolo-browser-shellbar * { box-sizing: border-box; }
#nolo-browser-shellbar button {
  width: 28px; height: 28px; display: inline-flex;
  align-items: center; justify-content: center; border: 0;
  border-radius: 999px; background: transparent; color: #8a8f98;
  font: inherit; cursor: pointer;
}
#nolo-browser-shellbar button:hover { background: rgba(15,23,42,0.07); color: #0f172a; }
#nolo-browser-shellbar button:active { background: rgba(37,99,235,0.12); color: #2563eb; }
#nolo-browser-shellbar svg {
  width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round; pointer-events: none;
}
#nolo-browser-addressbox {
  flex: 1; min-width: 0; height: 28px; display: flex; align-items: center; gap: 6px;
  padding: 0 10px; border: 1px solid transparent; border-radius: 999px;
  background: rgba(15,23,42,0.05);
}
#nolo-browser-addressbox:hover { background: rgba(15,23,42,0.07); }
#nolo-browser-addressbox:focus-within {
  background: #fff; border-color: rgba(37,99,235,0.35);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
#nolo-browser-favicon { width: 14px; height: 14px; flex: none; border-radius: 3px; }
#nolo-browser-lock, #nolo-browser-globe { width: 14px; height: 14px; flex: none; color: #94a3b8; }
#nolo-browser-address {
  flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; padding: 0;
  background: transparent; font: inherit; font-size: 12.5px; color: #0f172a;
}
#nolo-browser-address::placeholder { color: #94a3b8; }
`;

export const BROWSER_CHROME_SCRIPT = `
(() => {
  const CHROME_ID = "nolo-browser-shellbar";
  let bar = document.getElementById(CHROME_ID);
  if (!bar) {
    // 用 template 解析出唯一的 shellbar 根节点：此前 createElement + innerHTML 会把
    // 同一个 id 套两层（重复 id、双份玻璃底），这里直接取解析出的第一个元素。
    const template = document.createElement("template");
    template.innerHTML = ${JSON.stringify(BROWSER_CHROME_HTML)};
    bar = template.content.firstElementChild;
    if (!bar) return;
    const styleId = "nolo-browser-shellbar-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ${JSON.stringify(BROWSER_CHROME_CSS)};
      (document.head || document.documentElement).appendChild(style);
    }
    // 早注入可能发生在 <body> 解析之前：允许先行挂到 <html>，body 出现后归位。
    const mount = () => {
      const host = document.body || document.documentElement;
      if (bar.parentNode !== host) host.appendChild(bar);
    };
    mount();
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
    }
  }

  const input = document.getElementById("nolo-browser-address");
  const favicon = document.getElementById("nolo-browser-favicon");
  const lock = document.getElementById("nolo-browser-lock");
  const globe = document.getElementById("nolo-browser-globe");

  // inline SVG 没有 hidden IDL（给 svg 赋 hidden 属性只写一个无效 JS 属性），统一走
  // 属性 + 上面的 CSS 兜底，保证 favicon / lock / globe 恒定只显示一个。
  const setHidden = (el, hidden) => {
    if (!el) return;
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  };
  const syncAddress = () => {
    if (input && document.activeElement !== input) input.value = location.href;
  };
  const syncSecurity = () => {
    const secure = location.protocol === "https:";
    setHidden(lock, !secure);
    setHidden(globe, secure);
  };
  const syncFavicon = () => {
    if (!favicon || !lock || !globe) return;
    const link = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
    const href = link && link.href ? link.href : "";
    if (!href) return; // 没有图标信息：保留 syncSecurity 对 lock/globe 的选择
    const state = favicon.getAttribute("data-nolo-state");
    if (favicon.getAttribute("src") === href && state === "shown") {
      // 重复注入时 syncSecurity 会把 lock/globe 重新显示回来，这里必须重新压掉，
      // 否则 favicon 与安全图标会同时可见（review 第 2 轮 BLOCK 的回归）。
      setHidden(favicon, false);
      setHidden(lock, true);
      setHidden(globe, true);
      return;
    }
    if (favicon.getAttribute("src") === href && state === "error") {
      setHidden(favicon, true);
      syncSecurity();
      return;
    }
    favicon.setAttribute("data-nolo-state", "pending");
    favicon.onload = () => {
      favicon.setAttribute("data-nolo-state", "shown");
      setHidden(favicon, false);
      setHidden(lock, true);
      setHidden(globe, true);
    };
    // 图标加载失败时恢复安全图标，避免三个图标全被隐藏（review MEDIUM）。
    favicon.onerror = () => {
      favicon.setAttribute("data-nolo-state", "error");
      setHidden(favicon, true);
      syncSecurity();
    };
    favicon.src = href;
  };

  // 每次注入（含 dom-ready 的重复注入）都刷新状态：早注入时 <head> 的 icon link
  // 往往尚未解析，重复注入路径此前直接 early-return，导致 favicon 恒定加载不出
  // （review HIGH）。
  syncAddress();
  syncSecurity();
  syncFavicon();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { syncFavicon(); }, { once: true });
  }
  globalThis.addEventListener?.("load", () => { syncFavicon(); }, { once: true });

  // 事件与 history 钩子每个页面只绑定一次；后续重复注入只刷新上面的状态。
  if (globalThis.__noloBrowserChromeBound) return;
  globalThis.__noloBrowserChromeBound = true;

  bar.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && target.closest ? target.closest("button") : null;
    if (!button) {
      const box = target && target.closest ? target.closest("#nolo-browser-addressbox") : null;
      if (box && input) input.focus();
      return;
    }
    const action = button.getAttribute("data-action");
    if (action === "back") history.back();
    if (action === "forward") history.forward();
    if (action === "reload") location.reload();
  });

  if (input) {
    input.addEventListener("focus", () => input.select());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = location.href;
        input.blur();
        return;
      }
      if (event.key !== "Enter") return;
      let value = input.value.trim();
      if (!value) return;
      if (!/^https?:\\/\\//.test(value)) {
        if (/^\\S+\\.\\S+/.test(value)) value = "https://" + value;
        else value = "https://www.google.com/search?q=" + encodeURIComponent(value);
      }
      globalThis.__electrobunSendToHost?.({ type: "nolo-browser-navigate", url: value });
      globalThis.location.href = value;
      input.blur();
    });
  }

  globalThis.addEventListener?.("popstate", syncAddress);
  globalThis.addEventListener?.("hashchange", syncAddress);
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function () {
      const result = original.apply(this, arguments);
      syncAddress();
      return result;
    };
  }
})();
`;
