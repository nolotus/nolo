import {
  COMPACT_BUDGET,
  CONNECTOR_PROTOCOL_VERSION,
  buildCompactObservation,
  buildPageRevision,
  createElementRefRegistry,
  resolveActionTarget,
  summarizeConsoleEntries,
  summarizeNetworkEntries,
  verifyActionEffect,
} from "./compactObservation.js";

const HOST_NAME = "com.nolo.chrome_connector";
const consoleByTab = new Map();
const networkByTab = new Map();
const refRegistry = createElementRefRegistry();
let nativePort = null;

function toMessage(error) {
  return error instanceof Error ? error.message : String(error);
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

function pushBounded(store, tabId, entry, cap) {
  const entries = store.get(tabId) || [];
  entries.push(entry);
  if (entries.length > cap) entries.splice(0, entries.length - cap);
  store.set(tabId, entries);
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
    pushBounded(consoleByTab, tabId, {
      type: params.type,
      text: (params.args || [])
        .map((arg) => arg.value ?? arg.description ?? "")
        .join(" ")
        .slice(0, COMPACT_BUDGET.console.rawTextMaxChars),
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.console.rawCap);
  }
  if (method === "Runtime.exceptionThrown") {
    const ex = params.exceptionDetails || {};
    pushBounded(consoleByTab, tabId, {
      type: "error",
      text: `Uncaught: ${ex.text || ex.exception?.description || ex.exception?.value || JSON.stringify(ex)}`.slice(
        0,
        COMPACT_BUDGET.console.rawTextMaxChars,
      ),
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.console.rawCap);
  }
  if (method === "Network.requestWillBeSent") {
    pushBounded(networkByTab, tabId, {
      requestId: params.requestId,
      url: params.request?.url,
      method: params.request?.method,
      type: params.type,
      timestamp: params.timestamp,
    }, COMPACT_BUDGET.network.rawCap);
  }
});

/**
 * Single injected page agent. This function is serialized into the tab, so it must stay
 * self-contained: no closure over service worker state, no imports.
 */
function pageOperation(payload) {
  const MAX_CANDIDATES = 300;
  const INTERACTIVE_SELECTOR =
    'a[href],button,input:not([type="hidden"]),select,textarea,[role],[contenteditable="true"],[tabindex]';

  function isVisible(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") return false;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    if (typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(element);
      if (style && (style.visibility === "hidden" || style.display === "none")) return false;
    }
    return true;
  }

  function labelOf(element) {
    if (!element) return "";
    const attribute = (name) => (typeof element.getAttribute === "function" ? element.getAttribute(name) || "" : "");
    const text =
      attribute("aria-label") ||
      attribute("placeholder") ||
      attribute("title") ||
      attribute("name") ||
      element.innerText ||
      element.textContent ||
      "";
    return String(text).replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function describe(element, index) {
    const tag = String(element.tagName || "").toLowerCase();
    const described = { index, tag, name: labelOf(element) };
    if (element.disabled) described.disabled = true;
    if (element.readOnly) described.readonly = true;
    if (tag === "input" || tag === "textarea" || tag === "select") {
      const inputType = tag === "input" ? String(element.type || "text").toLowerCase() : tag;
      described.type = inputType;
      described.value = inputType === "password" ? null : String(element.value ?? "").slice(0, 120);
    }
    return described;
  }

  function regionRoot(region) {
    if (!region) return document.body || document.documentElement;
    return document.querySelector(region);
  }

  function candidates(region) {
    const root = regionRoot(region);
    if (!root) return null;
    const nodes = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE_SELECTOR));
    const visible = [];
    for (let index = 0; index < nodes.length && visible.length < MAX_CANDIDATES; index += 1) {
      if (isVisible(nodes[index])) visible.push(nodes[index]);
    }
    return { root, list: visible };
  }

  function signatureOf(found) {
    const keys = [];
    for (let index = 0; index < found.list.length && index < 24; index += 1) {
      const element = found.list[index];
      keys.push(`${String(element.tagName || "").toLowerCase()}:${labelOf(element).slice(0, 40)}`);
    }
    return [String(location.href), found.list.length, keys.join("|")].join("\u00a7").slice(0, 1024);
  }

  function textOf(root) {
    if (!root) return "";
    if (typeof root.innerText === "string" && root.innerText) return root.innerText;
    return String(root.textContent || "");
  }

  function readbackOf(element) {
    const tag = String(element.tagName || "").toLowerCase();
    if (tag === "input" && String(element.type || "").toLowerCase() === "password") return null;
    if ("value" in element && element.value != null) return String(element.value);
    return String(element.textContent ?? "");
  }

  function snapshotOf(element) {
    return {
      tag: String((element && element.tagName) || "").toLowerCase(),
      name: labelOf(element),
      exists: Boolean(element),
      disabled: Boolean(element && element.disabled),
      readonly: Boolean(element && element.readOnly),
      value: element ? readbackOf(element) : null,
    };
  }

  function resolveElement(found, target) {
    if (target.selector) {
      const bySelector = document.querySelector(target.selector);
      if (!bySelector) {
        return { code: "ELEMENT_NOT_FOUND", message: `Element not found: ${target.selector}` };
      }
      return { element: bySelector };
    }
    const candidate = typeof target.index === "number" ? found.list[target.index] || null : null;
    if (!candidate) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef no longer matches the page; call chrome_read_page again.",
      };
    }
    if (target.expectedTag && String(candidate.tagName || "").toLowerCase() !== target.expectedTag) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef resolved to a different element; call chrome_read_page again.",
      };
    }
    if (target.expectedName && labelOf(candidate) !== target.expectedName) {
      return {
        code: "STALE_PAGE_REVISION",
        message: "The elementRef target changed on the page; call chrome_read_page again.",
      };
    }
    return { element: candidate };
  }

  const op = String((payload && payload.op) || "");
  const region = String((payload && payload.region) || "");

  if (op === "read") {
    const found = candidates(region);
    if (!found) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    return {
      ok: true,
      url: String(location.href),
      title: String(document.title || ""),
      text: textOf(found.root),
      html: payload.includeHtml ? String(found.root.outerHTML || "").slice(0, 40000) : null,
      elements: found.list.map(describe),
      elementCount: found.list.length,
      signature: signatureOf(found),
    };
  }

  if (op === "click" || op === "type") {
    const found = candidates(region);
    if (!found) {
      return {
        ok: false,
        code: "REGION_NOT_FOUND",
        message: `Region selector matched no element: ${region}`,
        region,
      };
    }
    if (payload.expectedUrl && String(location.href) !== payload.expectedUrl) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    if (payload.expectedSignature && signatureOf(found) !== payload.expectedSignature) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The page revision changed since the elementRef was issued; call chrome_read_page again.",
      };
    }
    const resolved = resolveElement(found, payload);
    if (!resolved.element) {
      return { ok: false, code: resolved.code, message: resolved.message, signature: signatureOf(found) };
    }
    const target = resolved.element;
    if (target.disabled) {
      return {
        ok: false,
        code: "ELEMENT_DISABLED",
        message: "The target element is disabled; the action was not attempted.",
      };
    }
    if (op === "type" && target.readOnly) {
      return {
        ok: false,
        code: "ELEMENT_READONLY",
        message: "The target element is read-only; the text was not typed.",
      };
    }

    if (op === "type") {
      const before = snapshotOf(target);
      try {
        target.focus();
      } catch (error) {
        /* focus is best effort; the value write below is the observable effect */
      }
      const text = String(payload.text || "");
      const wantsClear = payload.clearFirst !== false;
      if ("value" in target) {
        const current = String(target.value ?? "");
        target.value = wantsClear ? text : `${current}${text}`;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const current = String(target.textContent ?? "");
        target.textContent = wantsClear ? text : `${current}${text}`;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const after = snapshotOf(target);
      return {
        ok: true,
        before,
        after,
        element: after,
        signature: signatureOf(found),
        url: String(location.href),
      };
    }

    const before = {
      url: String(location.href),
      textLength: textOf(found.root).length,
      exists: true,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
    target.click();
    const afterRoot = regionRoot(region);
    return {
      ok: true,
      before,
      after: {
        url: String(location.href),
        textLength: textOf(afterRoot).length,
        exists: target.isConnected === false
          ? false
          : typeof document.contains === "function"
            ? document.contains(target)
            : true,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      element: snapshotOf(target),
      signature: signatureOf(found),
      url: String(location.href),
    };
  }

  if (op === "press") {
    const key = String((payload && payload.key) || "");
    const root = document.body || document.documentElement;
    const pressTarget = document.activeElement || root;
    const before = {
      url: String(location.href),
      textLength: textOf(root).length,
      exists: true,
    };
    if (pressTarget && typeof pressTarget.dispatchEvent === "function") {
      pressTarget.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      pressTarget.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    }
    return {
      ok: true,
      before,
      after: { url: String(location.href), textLength: textOf(root).length, exists: true },
      pressed: key,
    };
  }

  if (op === "scroll") {
    const deltaX = Number((payload && payload.deltaX) || 0);
    const deltaY = Number((payload && payload.deltaY) || 0);
    const before = { scrollX: window.scrollX, scrollY: window.scrollY };
    window.scrollBy(deltaX, deltaY);
    return {
      ok: true,
      before,
      after: { scrollX: window.scrollX, scrollY: window.scrollY },
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  return { ok: false, code: "UNSUPPORTED_PAGE_OP", message: `Unsupported page operation: ${op}` };
}

/** Action verdicts are explicit: `effect` (and `verified`) is the authority, never `ok` alone. */
function verdictEnvelope(action, verification, extra = {}) {
  return {
    ok: verification.status !== "failed",
    verified: verification.status === "verified",
    effect: verification.status,
    action,
    signal: verification.signal,
    ...(verification.message ? { message: verification.message } : {}),
    ...extra,
  };
}

async function runTargetedAction(action, payload) {
  const tabId = String(payload.tabId);
  const target = resolveActionTarget(payload, refRegistry, { tabId, action });
  if (!target.ok) {
    return { ok: false, verified: false, effect: "failed", action, signal: target.code, message: target.message };
  }

  const resolveExtra = target.kind === "ref" ? { ref: target.ref } : { selector: target.selector };
  const pageArgs = { op: action };
  if (target.kind === "ref") {
    pageArgs.region = target.expect.region || "";
    pageArgs.expectedUrl = target.expect.url;
    pageArgs.expectedSignature = target.expect.signature;
    pageArgs.index = target.expect.index;
    pageArgs.expectedTag = target.expect.tag;
    pageArgs.expectedName = target.expect.name;
  } else {
    pageArgs.selector = target.selector;
  }
  if (action === "type") {
    pageArgs.text = typeof payload.text === "string" ? payload.text : "";
    pageArgs.clearFirst = payload.clearFirst !== false;
  }

  let result;
  try {
    result = await executeInTab(payload.tabId, pageOperation, [pageArgs]);
  } catch (error) {
    refRegistry.invalidate(tabId);
    return verdictEnvelope(
      action,
      {
        status: "uncertain",
        signal: "page_context_destroyed",
        message: `The page navigated or its frame was replaced while the action ran (${toMessage(
          error,
        )}). Re-read the page before acting again.`,
      },
      resolveExtra,
    );
  }

  const verification = verifyActionEffect({
    action,
    target: target.kind === "ref" ? { name: target.expect.name } : undefined,
    expected: action === "type" ? { text: pageArgs.text, clearFirst: pageArgs.clearFirst } : undefined,
    result,
  });

  if (result && typeof result.signature === "string" && result.signature) {
    refRegistry.notePageChanged({ tabId, signature: result.signature, url: result.url });
  }

  return verdictEnvelope(action, verification, {
    ...resolveExtra,
    ...(result && typeof result.signature === "string" && result.signature
      ? { pageRevision: buildPageRevision(result.signature) }
      : {}),
  });
}

async function handleAction(action, payload = {}) {
  switch (action) {
    case "connector_info": {
      return {
        extensionId: chrome.runtime.id,
        version: chrome.runtime.getManifest().version,
        hostName: HOST_NAME,
        protocolVersion: CONNECTOR_PROTOCOL_VERSION,
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
      const region = String(payload.region || payload.selector || "");
      const raw = await executeInTab(payload.tabId, pageOperation, [
        { op: "read", region, includeHtml: payload.detail === "full" },
      ]);
      const observation = buildCompactObservation(raw, {
        region,
        detail: payload.detail,
        maxChars: payload.maxChars,
        maxElements: payload.maxElements,
      });
      if (!observation.ok) return observation;
      refRegistry.remember({
        tabId: String(payload.tabId),
        pageRevision: observation.pageRevision,
        signature: typeof raw?.signature === "string" ? raw.signature : "",
        region,
        url: observation.url,
        textLength: typeof raw?.text === "string" ? raw.text.length : 0,
        elementCount: observation.elementCount,
        elements: Array.isArray(raw?.elements) ? raw.elements : [],
      });
      return observation;
    }
    case "click":
      return await runTargetedAction("click", payload);
    case "type":
      return await runTargetedAction("type", payload);
    case "press": {
      const result = await executeInTab(payload.tabId, pageOperation, [
        { op: "press", key: String(payload.key || "") },
      ]);
      return verdictEnvelope("press", verifyActionEffect({ action: "press", result }), {
        pressed: String(payload.key || ""),
      });
    }
    case "scroll": {
      const result = await executeInTab(payload.tabId, pageOperation, [
        { op: "scroll", deltaX: payload.deltaX || 0, deltaY: payload.deltaY || 0 },
      ]);
      return verdictEnvelope("scroll", verifyActionEffect({ action: "scroll", result }), {
        scrollX: Number(result?.scrollX || 0),
        scrollY: Number(result?.scrollY || 0),
      });
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
      return summarizeConsoleEntries(entries, { limit: payload.limit });
    }
    case "read_network": {
      await ensureDebugger(payload.tabId);
      const entries = networkByTab.get(String(payload.tabId)) || [];
      return summarizeNetworkEntries(entries, {
        limit: payload.limit,
        includeLowValue: payload.includeAssets === true,
      });
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
          message: toMessage(error),
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
