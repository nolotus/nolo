const HOST_NAME = "com.nolo.chrome_connector";
const consoleByTab = new Map();
const networkByTab = new Map();
let nativePort = null;

function callbackPromise(fn) {
  return new Promise((resolve, reject) => {
    fn((value) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(value);
    });
  });
}

function tabTarget(tabId) {
  return { tabId: Number(tabId) };
}

async function executeInTab(tabId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: tabTarget(tabId),
    func,
    args,
  });
  return result?.result;
}

function serializeTab(tab) {
  return {
    id: String(tab.id),
    title: tab.title || "",
    url: tab.url || "",
    active: Boolean(tab.active),
    windowId: tab.windowId,
  };
}

async function ensureDebugger(tabId) {
  const target = tabTarget(tabId);
  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (error) {
    if (!String(error?.message || error).includes("Another debugger is already attached")) {
      throw error;
    }
  }
  await chrome.debugger.sendCommand(target, "Runtime.enable");
  await chrome.debugger.sendCommand(target, "Network.enable");
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = String(source.tabId || "");
  if (!tabId) return;
  if (method === "Runtime.consoleAPICalled") {
    const entries = consoleByTab.get(tabId) || [];
    entries.push({
      type: params.type,
      text: (params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" "),
      timestamp: params.timestamp,
    });
    consoleByTab.set(tabId, entries.slice(-100));
  }
  if (method === "Runtime.exceptionThrown") {
    const entries = consoleByTab.get(tabId) || [];
    const ex = params.exceptionDetails || {};
    entries.push({
      type: "error",
      text: `Uncaught: ${ex.text || ex.exception?.description || ex.exception?.value || JSON.stringify(ex)}`,
      timestamp: params.timestamp,
    });
    consoleByTab.set(tabId, entries.slice(-100));
  }
  if (method === "Network.requestWillBeSent") {
    const entries = networkByTab.get(tabId) || [];
    entries.push({
      requestId: params.requestId,
      url: params.request?.url,
      method: params.request?.method,
      type: params.type,
      timestamp: params.timestamp,
    });
    networkByTab.set(tabId, entries.slice(-200));
  }
});

async function handleAction(action, payload = {}) {
  switch (action) {
    case "connector_info": {
      return {
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
        hostName: HOST_NAME,
      };
    }
    case "list_tabs": {
      const tabs = await chrome.tabs.query({});
      return { tabs: tabs.map(serializeTab) };
    }
    case "open_tab": {
      const tab = await chrome.tabs.create({
        url: String(payload.url || "about:blank"),
        active: payload.active !== false,
      });
      return { tab: serializeTab(tab) };
    }
    case "read_page": {
      return await executeInTab(payload.tabId, (selector) => {
        const root = selector ? document.querySelector(selector) : document.body;
        if (!root) return { text: "", html: "", title: document.title, url: location.href };
        return {
          title: document.title,
          url: location.href,
          text: root.innerText || "",
          html: root.outerHTML || "",
        };
      }, [payload.selector || ""]);
    }
    case "click": {
      return await executeInTab(payload.tabId, (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Element not found: ${selector}`);
        element.click();
        return { clicked: true };
      }, [payload.selector]);
    }
    case "type": {
      return await executeInTab(payload.tabId, (selector, text, clearFirst) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Element not found: ${selector}`);
        element.focus();
        if (clearFirst !== false && "value" in element) {
          element.value = "";
        }
        if ("value" in element) {
          element.value = `${element.value || ""}${text}`;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          element.textContent = `${element.textContent || ""}${text}`;
        }
        return { typed: true };
      }, [payload.selector, payload.text || "", payload.clearFirst]);
    }
    case "press": {
      return await executeInTab(payload.tabId, (key) => {
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
        return { pressed: key };
      }, [payload.key]);
    }
    case "scroll": {
      return await executeInTab(payload.tabId, (deltaX, deltaY) => {
        window.scrollBy(Number(deltaX || 0), Number(deltaY || 0));
        return { scrollX: window.scrollX, scrollY: window.scrollY };
      }, [payload.deltaX || 0, payload.deltaY || 0]);
    }
    case "screenshot": {
      const target = tabTarget(payload.tabId);
      await ensureDebugger(payload.tabId);
      const result = await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
        captureBeyondViewport: Boolean(payload.fullPage),
        format: "png",
      });
      return { dataUrl: `data:image/png;base64,${result.data}` };
    }
    case "read_console": {
      await ensureDebugger(payload.tabId);
      const entries = consoleByTab.get(String(payload.tabId)) || [];
      return { entries: entries.slice(-Number(payload.limit || 50)) };
    }
    case "read_network": {
      await ensureDebugger(payload.tabId);
      const entries = networkByTab.get(String(payload.tabId)) || [];
      return { entries: entries.slice(-Number(payload.limit || 50)) };
    }
    default:
      throw new Error(`Unknown Chrome connector action: ${action}`);
  }
}

function connectNativeHost() {
  nativePort = chrome.runtime.connectNative(HOST_NAME);
  nativePort.onMessage.addListener(async (message) => {
    if (!message || typeof message.id !== "string") return;
    try {
      const result = await handleAction(message.action, message.payload || {});
      nativePort.postMessage({ id: message.id, ok: true, result });
    } catch (error) {
      nativePort.postMessage({
        id: message.id,
        ok: false,
        error: {
          code: "CHROME_EXTENSION_ACTION_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
  nativePort.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.warn(`[nolo chrome connector] native host disconnected: ${error.message}`);
    }
    nativePort = null;
    setTimeout(connectNativeHost, 1000);
  });
}

connectNativeHost();
