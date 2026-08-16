// packages/desktop/src/bun/browserChromeTemplates.ts
//
// 浏览器窗口的独立地址栏 chrome。注入到非 sandbox 的 BrowserWindow，
// 提供地址栏、后退、前进、刷新，通过 host-message 与主进程通信。

export const BROWSER_CHROME_HTML = `
<div id="nolo-browser-shellbar">
  <button type="button" data-action="back" aria-label="Back" title="Back"><svg viewBox="0 0 24 24" width="16" height="16"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <button type="button" data-action="forward" aria-label="Forward" title="Forward"><svg viewBox="0 0 24 24" width="16" height="16"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <button type="button" data-action="reload" aria-label="Reload" title="Reload"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 12a9 9 0 1 1-9-9c2.4 0 4.6.9 6.3 2.5L21 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <input type="text" id="nolo-browser-address" placeholder="输入网址或搜索" />
</div>
`;

export const BROWSER_CHROME_CSS = `
#nolo-browser-shellbar {
  position: fixed; top: 28px; left: 0; right: 0; height: 34px;
  z-index: 2147483647; display: flex; align-items: center; gap: 6px;
  box-sizing: border-box; padding: 0 12px;
  border-bottom: 1px solid rgba(15,23,42,0.06);
  background: rgba(248,250,252,0.82); backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
#nolo-browser-shellbar * { box-sizing: border-box; }
#nolo-browser-shellbar button {
  width: 26px; height: 26px; display: inline-flex;
  align-items: center; justify-content: center; border: 0;
  border-radius: 999px; background: transparent; color: #475569; cursor: pointer;
}
#nolo-browser-shellbar button:hover { background: rgba(15,23,42,0.07); color: #0f172a; }
#nolo-browser-address {
  flex: 1; min-width: 0; height: 26px; border: 0; outline: 0;
  border-radius: 999px; padding: 0 12px;
  background: rgba(15,23,42,0.05); font-size: 12px; color: #0f172a;
}
#nolo-browser-address:focus { background: #fff; box-shadow: 0 0 0 1px rgba(37,99,235,0.3); }
`;

export const BROWSER_CHROME_SCRIPT = `
(() => {
  if (document.getElementById("nolo-browser-shellbar")) return;
  const bar = document.createElement("div");
  bar.id = "nolo-browser-shellbar";
  bar.innerHTML = ${JSON.stringify(BROWSER_CHROME_HTML)};
  const style = document.createElement("style");
  style.textContent = ${JSON.stringify(BROWSER_CHROME_CSS)};
  (document.head || document.documentElement).appendChild(style);
  (document.body || document.documentElement).appendChild(bar);
  const input = document.getElementById("nolo-browser-address");
  if (input) input.value = location.href;

  bar.addEventListener("click", (e) => {
    const btn = (e.target).closest ? (e.target).closest("button") : null;
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "back") history.back();
    if (action === "forward") history.forward();
    if (action === "reload") location.reload();
  });

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        let val = input.value.trim();
        if (!val) return;
        if (!/^https?:\\/\\//.test(val)) {
          if (/^\\S+\\.\\S+/.test(val)) val = "https://" + val;
          else val = "https://www.google.com/search?q=" + encodeURIComponent(val);
        }
        globalThis.__electrobunSendToHost?.({ type: "nolo-browser-navigate", url: val });
        globalThis.location.href = val;
      }
    });
  }

  const updateAddr = () => { if (input) input.value = location.href; };
  globalThis.addEventListener?.("popstate", updateAddr);
  const origPush = history.pushState;
  history.pushState = function() { const r = origPush.apply(this, arguments); updateAddr(); return r; };
})();
`;