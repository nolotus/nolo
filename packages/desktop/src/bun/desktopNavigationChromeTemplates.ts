// packages/desktop/src/bun/desktopNavigationChromeTemplates.ts
//
// Desktop navigation chrome 内联模板字符串——从 bun/index.ts 提取。
// 纯字符串常量：CSS / HTML / JS 注入到 webview 的导航栏 chrome。

export const DESKTOP_NAVIGATION_CHROME_CSS = `
#nolo-desktop-shellbar {
  position: fixed;
  inset: 0 0 auto 0;
  height: 34px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  padding: 0 14px 0 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.94);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  app-region: drag;
  -webkit-app-region: drag;
}
#nolo-desktop-shellbar[data-platform="darwin"] {
  padding-left: 88px;
}
#nolo-desktop-shellbar,
#nolo-desktop-shellbar * {
  box-sizing: border-box;
}
#nolo-desktop-shellbar button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #8a8f98;
  font: inherit;
  cursor: pointer;
  app-region: no-drag;
  -webkit-app-region: no-drag;
}
#nolo-desktop-shellbar svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}
#nolo-desktop-shellbar button:hover {
  background: rgba(15, 23, 42, 0.07);
  color: #0f172a;
}
#nolo-desktop-shellbar button:active {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}
#nolo-desktop-shellbar button:disabled {
  color: #b8bec8;
  cursor: default;
  opacity: 0.62;
}
#nolo-desktop-shellbar button:disabled:hover {
  background: transparent;
  color: #b8bec8;
}
#nolo-desktop-shellbar .desktop-shellbar__brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 168px;
  padding-right: 2px;
  color: #1f2937;
  font: 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}
#nolo-desktop-shellbar .desktop-shellbar__version {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
  letter-spacing: 0.01em;
}
#nolo-desktop-shellbar .desktop-shellbar__channel {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
}
#nolo-desktop-shellbar .desktop-shellbar__channel[data-channel="canary"] {
  color: #d97706;
  background: rgba(217, 119, 6, 0.12);
}
#nolo-desktop-shellbar .desktop-shellbar__channel[data-channel="dev"] {
  color: #7c3aed;
  background: rgba(124, 58, 237, 0.12);
}
#nolo-desktop-shellbar .desktop-shellbar__nav {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
#nolo-desktop-shellbar .desktop-shellbar__updates {
  background: #3b9cff;
  color: #ffffff;
}
#nolo-desktop-shellbar .desktop-shellbar__updates[hidden] {
  display: none;
}
#nolo-desktop-shellbar .desktop-shellbar__updates:disabled {
  opacity: 0.7;
  cursor: default;
}
#nolo-desktop-shellbar .desktop-shellbar__updates:hover {
  background: #278af0;
  color: #ffffff;
}
#nolo-desktop-shellbar .desktop-shellbar__window-controls {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 14px;
}
#nolo-desktop-shellbar .desktop-shellbar__window-control {
  border-radius: 6px;
  color: #475569;
}
#nolo-desktop-shellbar .desktop-shellbar__window-control:hover {
  background: rgba(15, 23, 42, 0.07);
  color: #0f172a;
}
#nolo-desktop-shellbar .desktop-shellbar__close:hover {
  background: #e81123;
  color: #ffffff;
}
#root {
  height: calc(100dvh - 34px) !important;
  margin-top: 34px !important;
  overflow: hidden;
}
#root > .MainLayout {
  height: 100% !important;
}
@media (max-width: 760px) {
  #nolo-desktop-shellbar {
    gap: 10px;
    padding-left: 10px;
  }
}
`;
export const DESKTOP_WINDOW_CONTROLS_HTML = `
<div class="desktop-shellbar__window-controls electrobun-webkit-app-region-no-drag">
  <button class="desktop-shellbar__window-control electrobun-webkit-app-region-no-drag" type="button" data-action="window-minimize" aria-label="Minimize" title="Minimize"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18h12"></path></svg></button>
  <button class="desktop-shellbar__window-control electrobun-webkit-app-region-no-drag" type="button" data-action="window-maximize" aria-label="Maximize" title="Maximize"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"></rect></svg></button>
  <button class="desktop-shellbar__window-control desktop-shellbar__close electrobun-webkit-app-region-no-drag" type="button" data-action="window-close" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10"></path><path d="M17 7 7 17"></path></svg></button>
</div>
`;

export const DESKTOP_NAVIGATION_CHROME_HTML = `
<div class="desktop-shellbar__brand" aria-hidden="true">Nolo Desktop<span class="desktop-shellbar__version" data-version></span></div>
<div class="desktop-shellbar__nav">
  <button class="electrobun-webkit-app-region-no-drag" type="button" data-action="download" aria-label="Downloads" title="Downloads"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
  <button class="electrobun-webkit-app-region-no-drag" type="button" data-action="back" aria-label="Back" title="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></button>
  <button class="electrobun-webkit-app-region-no-drag" type="button" data-action="forward" aria-label="Forward" title="Forward"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>
  <button class="electrobun-webkit-app-region-no-drag" type="button" data-action="open-browser" aria-label="Open browser" title="Open browser"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18"></path><path d="M12 3a14 14 0 0 0 0 18"></path></svg></button>
  <button class="desktop-shellbar__updates electrobun-webkit-app-region-no-drag" type="button" data-action="updates" aria-label="Updates" title="Updates" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path></svg></button>
</div>
${process.platform === "darwin" ? "" : DESKTOP_WINDOW_CONTROLS_HTML}
`;
export const DESKTOP_NAVIGATION_CHROME_SCRIPT = `
(() => {
  const legacyChrome = document.getElementById("nolo-desktop-navigation");
  legacyChrome?.remove?.();

  const chromeId = "nolo-desktop-shellbar";
  const styleId = "nolo-desktop-shellbar-style";
  if (!document.body || document.getElementById(chromeId)) return;

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = ${JSON.stringify(DESKTOP_NAVIGATION_CHROME_CSS)};
    document.head.appendChild(style);
  }

  const chrome = document.createElement("nav");
  chrome.id = chromeId;
  chrome.className = "electrobun-webkit-app-region-drag";
  chrome.dataset.platform = ${JSON.stringify(process.platform)};
  chrome.setAttribute("aria-label", "Desktop shell");
  chrome.innerHTML = ${JSON.stringify(DESKTOP_NAVIGATION_CHROME_HTML)};
  const backButton = chrome.querySelector('[data-action="back"]');
  const forwardButton = chrome.querySelector('[data-action="forward"]');
  const updateButton = chrome.querySelector('[data-action="updates"]');
  const alwaysOnTopButton = chrome.querySelector('[data-action="toggle-always-on-top"]');
  const visibleOnAllWorkspacesButton = chrome.querySelector('[data-action="toggle-visible-on-all-workspaces"]');
  let maxHistoryIndex = typeof globalThis.history?.state?.idx === "number"
    ? globalThis.history.state.idx
    : 0;

  const updateNavigationButtons = () => {
    const currentIndex = typeof globalThis.history?.state?.idx === "number"
      ? globalThis.history.state.idx
      : null;
    if (currentIndex !== null) {
      maxHistoryIndex = Math.max(maxHistoryIndex, currentIndex);
    }
    if (backButton instanceof HTMLButtonElement) {
      backButton.disabled = currentIndex === null || currentIndex <= 0;
    }
    if (forwardButton instanceof HTMLButtonElement) {
      forwardButton.disabled = currentIndex === null || currentIndex >= maxHistoryIndex;
    }
  };

  const originalPushState = globalThis.history?.pushState;
  const originalReplaceState = globalThis.history?.replaceState;
  if (typeof originalPushState === "function" && !globalThis.__noloDesktopHistoryPatched) {
    globalThis.__noloDesktopHistoryPatched = true;
    globalThis.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      updateNavigationButtons();
      return result;
    };
    if (typeof originalReplaceState === "function") {
      globalThis.history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        updateNavigationButtons();
        return result;
      };
    }
    globalThis.addEventListener?.("popstate", updateNavigationButtons);
  }
  updateNavigationButtons();

  const readDesktopUpdateSnapshot = async () => {
    const response = await globalThis.fetch?.("/api/desktop-updater", {
      method: "GET",
      cache: "no-store",
    });
    if (!response?.ok) return null;
    return response.json();
  };

  const brandVersionEl = chrome.querySelector(".desktop-shellbar__version");
  let channelBadgeEl = chrome.querySelector(".desktop-shellbar__channel");
  const applyBrandVersion = (snapshot) => {
    const localInfo = snapshot?.localInfo;
    const version = localInfo?.version;
    const channelVal = localInfo?.channel;
    if (brandVersionEl && version) {
      brandVersionEl.textContent = "v" + version;
    }
    if (channelVal && channelVal !== "stable") {
      if (!channelBadgeEl) {
        channelBadgeEl = document.createElement("span");
        channelBadgeEl.className = "desktop-shellbar__channel";
        brandVersionEl?.after(channelBadgeEl);
      }
      channelBadgeEl.textContent = channelVal;
      channelBadgeEl.dataset.channel = channelVal;
    } else {
      channelBadgeEl?.remove();
      channelBadgeEl = null;
    }
  };
  const applyDesktopUpdateButtonState = (snapshot) => {
    if (!(updateButton instanceof HTMLButtonElement)) return;
    const summary = snapshot?.summary;
    updateButton.hidden = !summary?.showToolbarButton;
    updateButton.title = summary?.toolbarTitle ?? "Updates";
    updateButton.setAttribute("aria-label", updateButton.title);
  };

  const applyDesktopWindowState = (snapshot) => {
    if (!(alwaysOnTopButton instanceof HTMLButtonElement)) return;
    const alwaysOnTop = snapshot?.alwaysOnTop === true;
    alwaysOnTopButton.dataset.active = alwaysOnTop ? "true" : "false";
    alwaysOnTopButton.title = alwaysOnTop ? "Disable Always on Top" : "Always on Top";
    alwaysOnTopButton.setAttribute("aria-label", alwaysOnTopButton.title);
    if (!(visibleOnAllWorkspacesButton instanceof HTMLButtonElement)) return;
    const visibleOnAllWorkspaces = snapshot?.visibleOnAllWorkspaces === true;
    visibleOnAllWorkspacesButton.dataset.active = visibleOnAllWorkspaces ? "true" : "false";
    visibleOnAllWorkspacesButton.title = visibleOnAllWorkspaces
      ? "Disable Show on All Workspaces"
      : "Show on All Workspaces";
    visibleOnAllWorkspacesButton.setAttribute("aria-label", visibleOnAllWorkspacesButton.title);
  };
  const refreshDesktopUpdateButton = async () => {
    try {
      const snapshot = await readDesktopUpdateSnapshot();
      applyDesktopUpdateButtonState(snapshot);
      applyBrandVersion(snapshot);
    } catch {
      applyDesktopUpdateButtonState(null);
      applyBrandVersion(null);
    }
  };
  globalThis.__noloDesktopRefreshUpdateButton = refreshDesktopUpdateButton;
  globalThis.__noloDesktopApplyWindowState = applyDesktopWindowState;

  const waitForDesktopUpdateReady = async () => {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const snapshot = await readDesktopUpdateSnapshot();
      applyDesktopUpdateButtonState(snapshot);
      applyBrandVersion(snapshot);
      if (snapshot?.updateInfo?.updateReady) return snapshot;
      if (attempt > 0 && !snapshot?.activeOperation) return snapshot;
      await new Promise((resolve) => globalThis.setTimeout?.(resolve, 1000));
    }
    const snapshot = await readDesktopUpdateSnapshot();
    applyDesktopUpdateButtonState(snapshot);
    applyBrandVersion(snapshot);
    return snapshot;
  };

  void refreshDesktopUpdateButton();
  const updateRefreshTimer = globalThis.setInterval?.(() => {
    void refreshDesktopUpdateButton();
  }, 30000);

  chrome.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
    const action = target?.getAttribute("data-action");
    if (target instanceof HTMLButtonElement && target.disabled) return;
    if (action === "back") globalThis.history?.back?.();
    if (action === "forward") globalThis.history?.forward?.();
    if (action === "download") globalThis.location?.assign?.("/downloads");
    if (action === "open-browser") {
      globalThis.__electrobunSendToHost?.({ type: "nolo-desktop-browser-action", action: "open" });
    }
    if (action === "reload") globalThis.location?.reload?.();
    if (action === "toggle-always-on-top") {
      globalThis.__electrobunSendToHost?.({ type: "nolo-desktop-window-action", action: "window-toggle-always-on-top" });
    }
    if (action === "toggle-visible-on-all-workspaces") {
      globalThis.__electrobunSendToHost?.({ type: "nolo-desktop-window-action", action: "window-toggle-visible-on-all-workspaces" });
    }
    if (action === "window-minimize" || action === "window-maximize" || action === "window-close") {
      globalThis.__electrobunSendToHost?.({ type: "nolo-desktop-window-action", action });
    }
    if (action === "updates" && target instanceof HTMLButtonElement) {
      event.preventDefault();
      const snapshot = await readDesktopUpdateSnapshot();
      const nextAction = snapshot?.summary?.primaryAction ?? null;
      if (!nextAction) {
        applyDesktopUpdateButtonState(snapshot);
        return;
      }
      target.disabled = true;
      globalThis.fetch?.("/api/desktop-updater", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      })
        .then(async () => {
          if (nextAction === "download") {
            const readySnapshot = await waitForDesktopUpdateReady();
            if (readySnapshot?.updateInfo?.updateReady) {
              await globalThis.fetch?.("/api/desktop-updater", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "apply" }),
              });
            }
          }
          await refreshDesktopUpdateButton();
        })
        .catch(() => {})
        .finally(() => {
          target.disabled = false;
        });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const key = event.key.toLowerCase();
    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      globalThis.history?.back?.();
    }
    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      globalThis.history?.forward?.();
    }
    if ((event.ctrlKey || event.metaKey) && key === "r") {
      event.preventDefault();
      globalThis.location?.reload?.();
    }
  });

  document.body.appendChild(chrome);
  globalThis.addEventListener?.("beforeunload", () => {
    delete globalThis.__noloDesktopRefreshUpdateButton;
    delete globalThis.__noloDesktopApplyWindowState;
    if (updateRefreshTimer) globalThis.clearInterval?.(updateRefreshTimer);
  }, { once: true });
})();
`;
