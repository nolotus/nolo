/**
 * Deterministic helpers for the Nolo Chrome connector compact observation protocol.
 *
 * This module is loaded by the extension service worker (extension/background.js, a MV3 module
 * worker) and by bun tests, so it must stay free of `chrome.*` and DOM globals. Everything here is
 * a pure function of its inputs: budgets, page revisions, element refs, action verification and
 * console/network shaping.
 */

export const CONNECTOR_PROTOCOL_VERSION = "2";

/** Chrome refuses script injection into its own UI and the Web Store; say so instead of failing oddly. */
export const PROTECTED_PAGE_CODE = "PROTECTED_PAGE";

/**
 * Extension-owned pages live under a browser-specific URL scheme: Chrome serves them from
 * `chrome-extension://<id>/`, Firefox from `moz-extension://<uuid>/`. Every judgement that has to
 * recognise "a page this extension owns" must cover both, or Firefox silently loses the guard
 * Chrome has (the approval page in particular).
 *
 * These are full URL schemes, matched with `startsWith` — never a bare `-extension://` substring,
 * which would also swallow unrelated URLs.
 */
export const EXTENSION_URL_PREFIXES = Object.freeze(["chrome-extension://", "moz-extension://"]);

const PROTECTED_URL_PREFIXES = Object.freeze([
  "chrome://",
  "chrome-untrusted://",
  "chrome-search://",
  ...EXTENSION_URL_PREFIXES,
  "devtools://",
  "edge://",
  "about:",
  "view-source:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
]);

/** True for any extension-scheme page (Chrome's or Firefox's), whatever extension owns it. */
export function isExtensionPageUrl(url) {
  const value = typeof url === "string" ? url.trim().toLowerCase() : "";
  if (!value) return false;
  return EXTENSION_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * True for a page served by *this* extension.
 *
 * `ownOrigin` is `chrome.runtime.getURL("")`, which is `chrome-extension://<id>/` on Chrome and
 * `moz-extension://<uuid>/` on Firefox — the browser already knows its own shape, so we ask it
 * instead of guessing. When the runtime does not expose `getURL` (a stripped-down host), fall
 * back to the extension scheme so the extension's own pages still stay out of the way.
 */
export function isOwnExtensionPage(url, ownOrigin = "") {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return false;
  if (typeof ownOrigin === "string" && ownOrigin) return value.startsWith(ownOrigin);
  return isExtensionPageUrl(value);
}

/**
 * Chrome refuses script injection into its own UI, the Web Store and other browser-owned origins;
 * Firefox refuses the same for its own `moz-extension://` pages.
 *
 * `file://` and `data:` are deliberately absent: a file page fails because the extension has no file
 * access (and enabling it is the user's choice), and `data:` URLs are not navigable tabs here. Both
 * report their own, more specific error, so calling them "protected" would be misleading.
 */

export function isProtectedPageUrl(url) {
  const value = typeof url === "string" ? url.trim().toLowerCase() : "";
  if (!value) return false;
  return PROTECTED_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/**
 * Feature names are part of the wire contract between the extension and the desktop app: a published
 * name is never reused or redefined, and unknown names are ignored by the reader. Additive evolution
 * goes here; only breaking changes bump {@link CONNECTOR_PROTOCOL_VERSION}.
 */
export const CONNECTOR_FEATURES = Object.freeze([
  "tabs",
  "compact_observation_v2",
  "action_gate",
  "browser_debug",
  "screenshot",
  "file_upload",
  "prepare_browser_action",
]);

const FEATURE_BY_ACTION = Object.freeze({
  list_tabs: ["tabs"],
  open_tab: ["tabs"],
  close_tab: ["tabs"],
  read_page: ["compact_observation_v2"],
  click: ["compact_observation_v2"],
  type: ["compact_observation_v2"],
  press: ["compact_observation_v2"],
  scroll: ["compact_observation_v2"],
  // screenshot is its own feature because Firefox can capture the visible tab via
  // tabs.captureVisibleTab even though it has no chrome.debugger. Requiring browser_debug
  // here would make the desktop refuse screenshot on Firefox before the call is even tried.
  screenshot: ["screenshot"],
  read_console: ["browser_debug"],
  read_network: ["browser_debug"],
  detach: ["browser_debug"],
  set_files: ["compact_observation_v2", "file_upload"],
  // A native <select> can carry an irreversible choice (a country the account cannot change, a
  // plan, a shipping method), so choosing its option goes through the same name gate as click/type.
  set_select_value: ["compact_observation_v2", "action_gate"],
  prepare_browser_action: ["prepare_browser_action"],
});

/**
 * The capabilities an action depends on. The runtime may require more than the extension declares
 * here (it adds `action_gate` to the clicking actions); the drift test asserts the extension's list is
 * always a subset of the runtime's.
 */
export function requiredFeatureForAction(action) {
  const key = typeof action === "string" ? action : "";
  return FEATURE_BY_ACTION[key] ?? null;
}

export const COMPACT_BUDGET = Object.freeze({
  detail: Object.freeze({
    compact: Object.freeze({ maxChars: 6000, maxElements: 35, maxNameChars: 120, maxHtmlChars: 0 }),
    full: Object.freeze({ maxChars: 6000, maxElements: 35, maxNameChars: 200, maxHtmlChars: 6000 }),
  }),
  defaultDetail: "compact",
  hardMaxChars: 6000,
  hardMaxElements: 35,
  payloadMaxChars: 10000,
  urlMaxChars: 1000,
  regionMaxChars: 500,
  titleMaxChars: 300,
  valueMaxChars: 80,
  textEllipsis: "\u2026[truncated]",
  refs: Object.freeze({ ttlMs: 120000, maxTabs: 8 }),
  console: Object.freeze({ limitDefault: 20, limitMax: 60, textMaxChars: 300, rawTextMaxChars: 2000, rawCap: 200 }),
  network: Object.freeze({ limitDefault: 20, limitMax: 60, urlMaxChars: 300, rawCap: 300 }),
});

const SENSITIVE_NAME_PATTERN =
  /(submit|send|delete|remove|unsubscribe|pay|purchase|buy|checkout|confirm|authorize|allow|grant|deny|revoke|sign ?in|log ?in|提交|发送|删除|移除|支付|付款|购买|确认|授权|登录|同意)/i;

function clampInteger(value, min, max, fallback) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.trunc(numeric);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function truncatePlain(value, maxChars, ellipsis = "\u2026") {
  const text = typeof value === "string" ? value : "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - ellipsis.length))}${ellipsis}`;
}

/** FNV-1a 32 bit, rendered as 8 hex chars. Stable across runtimes and cheap on any page. */
export function hashSignature(value) {
  const text = typeof value === "string" ? value : String(value ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildPageRevision(signature) {
  return hashSignature(signature);
}

/**
 * Refs are revision-scoped by construction: the same element index in a new revision must never
 * reuse the ref string of the previous revision, otherwise a stale call could silently hit the
 * new element. Both the observation payload and the ref registry build refs through this helper.
 */
export function buildElementRef(pageRevision, index) {
  const position = Number.isFinite(index) ? index : 0;
  return `${pageRevision}-e${position + 1}`;
}

export function parseElementRef(ref) {
  if (typeof ref !== "string") return null;
  const match = /^([0-9a-f]{8})-e([0-9]+)$/.exec(ref.trim());
  if (!match) return null;
  return { pageRevision: match[1], index: Number(match[2]) - 1 };
}

export function truncateText(value, maxChars, ellipsis = COMPACT_BUDGET.textEllipsis) {
  const text = typeof value === "string" ? value : "";
  const budget = clampInteger(maxChars, 0, COMPACT_BUDGET.hardMaxChars, COMPACT_BUDGET.detail.compact.maxChars);
  if (budget <= 0) return { text: "", truncated: text.length > 0, omittedChars: text.length };
  if (text.length <= budget) return { text, truncated: false, omittedChars: 0 };
  const available = Math.max(1, budget - ellipsis.length);
  let head = text.slice(0, available);
  const boundary = Math.max(head.lastIndexOf("\n"), head.lastIndexOf(" "));
  if (boundary > available * 0.6) head = head.slice(0, boundary);
  return { text: `${head}${ellipsis}`, truncated: true, omittedChars: text.length - head.length };
}

export function normalizeBudget(input = {}) {
  const requested = input && typeof input === "object" ? input : {};
  const detail = requested.detail === "full" ? "full" : COMPACT_BUDGET.defaultDetail;
  const preset = COMPACT_BUDGET.detail[detail];
  return {
    detail,
    maxChars: clampInteger(requested.maxChars, 200, COMPACT_BUDGET.hardMaxChars, preset.maxChars),
    maxElements: clampInteger(requested.maxElements, 1, COMPACT_BUDGET.hardMaxElements, preset.maxElements),
    maxNameChars: preset.maxNameChars,
    maxHtmlChars: preset.maxHtmlChars,
  };
}

/**
 * Turns a raw page-side snapshot into the bounded payload the model sees. Never returns unbounded
 * page text: `text` is always capped by the resolved budget (compact budget by default).
 */
export function buildCompactObservation(raw, options = {}) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "READ_FAILED", message: "The page observation returned no data." };
  }
  if (raw.ok === false) {
    return {
      ok: false,
      code: typeof raw.code === "string" && raw.code ? raw.code : "READ_FAILED",
      message: typeof raw.message === "string" && raw.message ? raw.message : "Page read failed.",
      ...(typeof raw.region === "string" && raw.region ? { region: raw.region } : {}),
    };
  }

  const budget = normalizeBudget(options);
  const requestedRegion = typeof options.region === "string" && options.region ? options.region : "";
  const region = requestedRegion || (typeof raw.region === "string" ? raw.region : "");
  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
  const elementCount = Number.isFinite(raw.elementCount) ? raw.elementCount : rawElements.length;
  // Invalid or missing offsets read from the start; offsets past the end clamp to the end.
  const offset = Math.min(clampInteger(options.offset, 0, Number.MAX_SAFE_INTEGER, 0), rawElements.length);

  const pageRevision = buildPageRevision(raw.signature);

  function assemble(elementLimit, textLimit, htmlLimit) {
    const text = truncateText(raw.text, textLimit);
    const elements = rawElements.slice(offset, offset + elementLimit).map((element, position) => {
      const ref = buildElementRef(pageRevision, Number.isFinite(element?.index) ? element.index : offset + position);
      const shaped = {
        ref,
        tag: String(element?.tag ?? ""),
        name: truncateText(element?.name, budget.maxNameChars).text,
      };
      if (element?.type) shaped.type = String(element.type);
      if (typeof element?.value === "string" && element.value) {
        shaped.value = truncateText(element.value, COMPACT_BUDGET.valueMaxChars).text;
      }
      if (element?.disabled) shaped.disabled = true;
      if (element?.readonly) shaped.readonly = true;
      // Marked so the model can plan around the gate instead of discovering it by being refused.
      if (isIrreversibleActionName(shaped.name)) shaped.sensitive = true;
      return shaped;
    });
    const pageEnd = offset + elements.length;
    const payload = {
      ok: true,
      url: truncatePlain(raw.url, COMPACT_BUDGET.urlMaxChars),
      title: truncateText(raw.title, COMPACT_BUDGET.titleMaxChars).text,
      pageRevision,
      region: region ? truncatePlain(region, COMPACT_BUDGET.regionMaxChars) : null,
      text: text.text,
      truncated: text.truncated,
      omittedTextChars: text.omittedChars,
      elementCount,
      offset,
      nextOffset: pageEnd < elementCount ? pageEnd : null,
      elements,
      omittedElements: Math.max(0, elementCount - pageEnd),
      budget: {
        detail: budget.detail,
        maxChars: budget.maxChars,
        usedChars: text.text.length,
        maxElements: budget.maxElements,
        maxPayloadChars: COMPACT_BUDGET.payloadMaxChars,
        usedPayloadChars: 0,
      },
    };
    if (budget.detail === "full" && htmlLimit > 0 && typeof raw.html === "string" && raw.html) {
      const html = truncateText(raw.html, htmlLimit);
      payload.html = html.text;
      payload.htmlTruncated = html.truncated;
    }
    return payload;
  }

  let elementLimit = budget.maxElements;
  let textLimit = budget.maxChars;
  let htmlLimit = budget.maxHtmlChars;
  let payload = assemble(elementLimit, textLimit, htmlLimit);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const measured = JSON.stringify(payload).length;
    if (measured <= COMPACT_BUDGET.payloadMaxChars - 16) break;
    const overflow = measured - COMPACT_BUDGET.payloadMaxChars + 32;
    if (elementLimit > 1) {
      elementLimit = Math.floor(elementLimit / 2);
    } else if (htmlLimit > 0) {
      htmlLimit = Math.max(0, htmlLimit - Math.max(512, overflow));
    } else if (textLimit > 200) {
      textLimit = Math.max(200, textLimit - Math.max(512, overflow));
    } else if (elementLimit > 0) {
      elementLimit = 0;
    } else {
      break;
    }
    payload = assemble(elementLimit, textLimit, htmlLimit);
  }
  if (JSON.stringify(payload).length > COMPACT_BUDGET.payloadMaxChars) {
    // Last-resort guarantee: the minimum allowed shape always fits the hard payload budget.
    payload = assemble(0, 200, 0);
  }
  payload.budget.usedPayloadChars = JSON.stringify(payload).length;
  return payload;
}

/**
 * Short-lived, revision-scoped element refs. There is no persistent selector database: refs only
 * resolve while the tab still holds the same page observation.
 */
export function createElementRefRegistry(options = {}) {
  const ttlMs = clampInteger(options.ttlMs, 1000, 3600000, COMPACT_BUDGET.refs.ttlMs);
  const maxTabs = clampInteger(options.maxTabs, 1, 64, COMPACT_BUDGET.refs.maxTabs);
  const now = typeof options.now === "function" ? options.now : () => Date.now();
  const snapshots = new Map();

  function remember(input = {}) {
    const tabId = String(input.tabId ?? "");
    if (!tabId) return null;
    const signature = typeof input.signature === "string" ? input.signature : "";
    const pageRevision =
      typeof input.pageRevision === "string" && input.pageRevision
        ? input.pageRevision
        : buildPageRevision(signature);
    const refs = new Map();
    // A snapshot exposes only its own revision's refs: an older ref is detected by its prefix,
    // never merged into the current revision as if it were still valid.
    const elements = Array.isArray(input.elements) ? input.elements : [];
    elements.forEach((element, position) => {
      const index = Number.isFinite(element?.index) ? element.index : position;
      const ref = buildElementRef(pageRevision, index);
      refs.set(ref, {
        ref,
        index,
        tag: String(element?.tag ?? ""),
        name: typeof element?.name === "string" ? element.name : "",
        disabled: element?.disabled === true,
        readonly: element?.readonly === true,
        pageRevision,
      });
    });
    const snapshot = {
      tabId,
      pageRevision,
      signature,
      region: typeof input.region === "string" ? input.region : "",
      url: typeof input.url === "string" ? input.url : "",
      textLength: Number.isFinite(input.textLength) ? input.textLength : 0,
      elementCount: Number.isFinite(input.elementCount) ? input.elementCount : refs.size,
      observedAt: Number.isFinite(input.observedAt) ? input.observedAt : now(),
      refs,
    };
    snapshots.delete(tabId);
    snapshots.set(tabId, snapshot);
    while (snapshots.size > maxTabs) snapshots.delete(snapshots.keys().next().value);
    return snapshot;
  }

  function snapshot(tabId) {
    return snapshots.get(String(tabId ?? "")) ?? null;
  }

  /** Called after an action returns a fresh page signature: keeps refs but marks them stale. */
  function notePageChanged(input = {}) {
    const tabId = String(input.tabId ?? "");
    const current = snapshots.get(tabId);
    if (!current) return null;
    const signature = typeof input.signature === "string" ? input.signature : "";
    if (!signature || signature === current.signature) return current;
    current.signature = signature;
    current.pageRevision = buildPageRevision(signature);
    current.observedAt = Number.isFinite(input.observedAt) ? input.observedAt : now();
    if (typeof input.url === "string" && input.url) current.url = input.url;
    return current;
  }

  function invalidate(tabId) {
    return snapshots.delete(String(tabId ?? ""));
  }

  function size() {
    return snapshots.size;
  }

  return { ttlMs, maxTabs, now, remember, snapshot, notePageChanged, invalidate, size };
}

/** Disabled (and read-only for typing) targets are rejected before any page-side effect. */
export function getBlockedTargetCode(action, element) {
  if (!element) return null;
  if (element.disabled === true) return "ELEMENT_DISABLED";
  if (action === "type" && element.readonly === true) return "ELEMENT_READONLY";
  return null;
}

/**
 * Single entry point for both action styles: `elementRef` from chrome_read_page, or the legacy CSS
 * `selector`. Ref resolution fails closed with a structured code instead of retrying anything.
 */
export function resolveActionTarget(payload = {}, registry, context = {}) {
  const rawRef =
    typeof payload?.elementRef === "string"
      ? payload.elementRef
      : typeof payload?.ref === "string"
        ? payload.ref
        : "";
  const elementRef = rawRef.trim();
  const selector = typeof payload?.selector === "string" ? payload.selector.trim() : "";

  if (elementRef) {
    const current = registry && typeof registry.snapshot === "function" ? registry.snapshot(context.tabId) : null;
    if (!current) {
      return {
        ok: false,
        code: "ELEMENT_REF_UNKNOWN",
        message: "No cached page observation for this tab; call chrome_read_page and use its elementRefs.",
      };
    }
    const at = Number.isFinite(context.now)
      ? context.now
      : typeof registry?.now === "function"
        ? registry.now()
        : Date.now();
    const ttlMs = Number.isFinite(registry.ttlMs) ? registry.ttlMs : COMPACT_BUDGET.refs.ttlMs;
    if (at - current.observedAt > ttlMs) {
      return {
        ok: false,
        code: "ELEMENT_REF_STALE",
        message: "The cached page observation expired; call chrome_read_page again.",
      };
    }
    const entry = current.refs.get(elementRef);
    if (!entry) {
      const parsed = parseElementRef(elementRef);
      if (parsed && parsed.pageRevision !== current.pageRevision) {
        return {
          ok: false,
          code: "STALE_PAGE_REVISION",
          message: `That elementRef belongs to an older page revision (${parsed.pageRevision}); this tab is at ${current.pageRevision}. Call chrome_read_page again.`,
        };
      }
      return {
        ok: false,
        code: "ELEMENT_REF_UNKNOWN",
        message: `Unknown element ref: ${elementRef}. Call chrome_read_page again.`,
      };
    }
    if (entry.pageRevision !== current.pageRevision) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "That elementRef belongs to an older page revision; call chrome_read_page again.",
      };
    }
    if (typeof context.url === "string" && context.url && current.url && context.url !== current.url) {
      return {
        ok: false,
        code: "STALE_PAGE_REVISION",
        message: "The tab navigated to a different document; call chrome_read_page again.",
      };
    }
    const blocked = getBlockedTargetCode(context.action, entry);
    if (blocked) {
      return {
        ok: false,
        code: blocked,
        message: blocked === "ELEMENT_DISABLED"
          ? `${elementRef} is disabled; the action was not attempted.`
          : `${elementRef} is read-only; the text was not typed.`,
      };
    }
    return {
      ok: true,
      kind: "ref",
      ref: entry.ref,
      expect: {
        signature: current.signature,
        region: current.region,
        url: current.url,
        index: entry.index,
        tag: entry.tag,
        name: entry.name,
        role: entry.role ?? "",
        type: entry.type ?? "",
      },
    };
  }

  if (selector) return { ok: true, kind: "selector", selector };

  return {
    ok: false,
    code: "ELEMENT_TARGET_REQUIRED",
    message: "Provide elementRef from chrome_read_page or a CSS selector.",
  };
}

export function isSensitiveActionName(name) {
  return typeof name === "string" && SENSITIVE_NAME_PATTERN.test(name);
}

/**
 * The irreversible-action gate. Deliberately narrower than SENSITIVE_NAME_PATTERN: the broad pattern
 * drives post-hoc verification, while this one stops the connector from performing an action whose
 * external consequence the agent cannot undo afterwards.
 *
 * Erring towards blocking is intentional. Over-blocking costs the user one manual click; under-blocking
 * can pay, delete or publish something.
 */
const IRREVERSIBLE_ACTION_PATTERN = new RegExp(
  [
    // money
    "\\bpay\\b",
    "pay ?now",
    "\\bpayment\\b",
    "\\bpurchase\\b",
    "\\bbuy\\b",
    "check ?out",
    "place.*order",
    "order ?now",
    "submit.*order",
    "complete ?(purchase|order|payment)",
    "confirm ?(payment|order|purchase)",
    "\\btransfer\\b",
    "\\bdonate\\b",
    // destructive
    "\\bdelete\\b",
    "\\bremove\\b",
    "\\bunsubscribe\\b",
    // publish / send
    "\\bpublish\\b",
    "\\bsend\\b",
    // permissions and security
    "\\brevoke\\b",
    "\\bgrant\\b",
    "\\bauthorize\\b",
    "\\bpermission\\b",
    // Chinese equivalents. 清空 is included (clearing a recycle bin is irreversible) but its plain
    // English counterparts are not: "Clear search" and "Reset zoom" are ordinary local actions, and
    // the Latin side has no equivalent that separates the destructive case.
    "付款",
    "支付",
    "购买",
    "下单",
    "提交订单",
    "结算",
    "结账",
    "转账",
    "汇款",
    "捐赠",
    "提现",
    "退款",
    "预约",
    "删除",
    "移除",
    "退订",
    "取消订阅",
    "清空",
    "发布",
    "公布",
    "发送",
    "授权",
    "撤销授权",
    "权限变更",
    "同意授权",
    "确认支付",
    "确认下单",
    "完成支付",
  ].join("|"),
  "i",
);

export const CONFIRMATION_REQUIRED_CODE = "SENSITIVE_ACTION_REQUIRES_CONFIRMATION";

export function isIrreversibleActionName(name) {
  return typeof name === "string" && IRREVERSIBLE_ACTION_PATTERN.test(name);
}

/**
 * Advisory only: describes how strongly an element *looks* like a control. It is used for the
 * confirmation copy and for statistics, **never** for the release decision.
 *
 * An earlier revision made this predicate the gate itself, which turned the gate fail-open: any real
 * action handler on a `<div onclick>`, an `<a>`, a `contenteditable` or a custom element stopped
 * being gated, so a genuine "发送" moved from "asks the user" to "just sends". The gate therefore
 * keys on the label alone (fail-closed) and this predicate only softens the wording.
 */
export function isOperableControlTarget(input = {}) {
  const tag = String(input.tag ?? "").trim().toLowerCase();
  if (tag === "button" || tag === "input") return true;
  if (String(input.role ?? "").trim().toLowerCase() === "button") return true;
  const type = String(input.type ?? "").trim().toLowerCase();
  // <input type="submit|button"> is covered by the tag rule; this keeps the intent explicit for
  // callers that report only role/type metadata.
  return type === "submit" || type === "button";
}

/**
 * Keys that activate a focused control. Single source of truth: both the decision function below and
 * the connector's press handler use it, because two copies of this list already drifted once (the
 * handler kept its own Enter-only list, which made the Space branch unreachable).
 */
export function isActivationKey(key) {
  const value = typeof key === "string" ? key : "";
  return (
    value === "Enter" ||
    value === "NumpadEnter" ||
    value === "Return" ||
    value === " " ||
    value === "Space" ||
    value === "Spacebar"
  );
}

const CONFIRMATION_REQUIRED_MESSAGE =
  "This control is an irreversible external action (payment, send, delete, publish or permission change). A " +
  "confirmation request has already been opened for the user in the browser: ask the user to click \"Allow once\" " +
  "there, then retry this exact action with the approvalId the connector returned. Nothing has been performed yet; " +
  "do not retry without that approvalId and do not switch to another selector to get around it.";

/**
 * One decision point for the gate, so every action that can trigger an irreversible effect is refused
 * in exactly the same shape. `null` means the action may proceed.
 */
export function decideIrreversibleAction(input = {}) {
  const action = String(input.action ?? "");
  const name = typeof input.name === "string" ? input.name : "";
  if (!name) return null;
  if (action === "click" || action === "type" || action === "set_select_value") {
    if (!isIrreversibleActionName(name)) return null;
  } else if (action === "press") {
    const key = String(input.key ?? "");
    // Space activates a focused button just like Enter, so both are gated through the shared
    // predicate; a keyboard-only path (Tab to focus, then activate) must not bypass the click gate.
    if (!isActivationKey(key) || !isIrreversibleActionName(name)) return null;
  } else {
    return null;
  }
  // Fail-closed by design: a matching label asks the user, no matter which element carries it.
  // Judging by tag/role turned the gate fail-open — `<div onclick="send()">发送</div>`, `<a>`,
  // `contenteditable` and custom elements are ordinary buttons on real sites, so a real action
  // handler stopped being gated entirely. Over-blocking costs one "Allow once" click on a navigation
  // item named 已发送; under-blocking sends, pays or deletes without asking. `isOperableControlTarget`
  // deliberately stays out of this decision; it only softens the confirmation wording.
  return {
    ok: false,
    code: CONFIRMATION_REQUIRED_CODE,
    effect: "confirmation_required",
    action,
    signal: CONFIRMATION_REQUIRED_CODE,
    target: {
      name: name.slice(0, 200),
      ...(input.tag ? { tag: String(input.tag) } : {}),
      ...(input.role ? { role: String(input.role) } : {}),
      ...(input.type ? { type: String(input.type) } : {}),
    },
    // Copy/statistics only (the approval window and logs): never read to decide whether to release.
    operableControl: isOperableControlTarget(input),
    message: CONFIRMATION_REQUIRED_MESSAGE,
  };
}

/**
 * Deterministic, risk-balanced verification. Cheap local signals can prove ordinary effects;
 * anything else is reported as `uncertain` so the model re-reads instead of blindly retrying.
 */
export function verifyActionEffect(input = {}) {
  const action = String(input.action ?? "");
  const result = input.result;
  if (!result || typeof result !== "object") {
    return {
      status: "uncertain",
      signal: "no_result",
      message: "The connector returned no observation for this action.",
    };
  }
  if (result.ok === false) {
    return {
      status: "failed",
      signal: typeof result.code === "string" && result.code ? result.code : "ACTION_FAILED",
      message: typeof result.message === "string" && result.message
        ? result.message
        : "The connector reported a failed action.",
    };
  }

  const before = result.before && typeof result.before === "object" ? result.before : {};
  const after = result.after && typeof result.after === "object" ? result.after : {};
  const element = result.element && typeof result.element === "object" ? result.element : {};
  const sensitive = input.sensitive === true || isSensitiveActionName(input.target?.name);

  if (action === "type") {
    if (element.exists === false) {
      return { status: "failed", signal: "ELEMENT_REMOVED", message: "The target element disappeared while typing." };
    }
    if (element.disabled === true) {
      return { status: "failed", signal: "ELEMENT_DISABLED", message: "The target element is disabled; the text was not applied." };
    }
    if (element.readonly === true) {
      return { status: "failed", signal: "ELEMENT_READONLY", message: "The target element is read-only; the text was not applied." };
    }
    if (element.value === null || element.value === undefined) {
      return {
        status: "uncertain",
        signal: "value_not_readable",
        message: "The element value cannot be read back (for example a password field).",
      };
    }
    const expectedText = typeof input.expected?.text === "string" ? input.expected.text : "";
    const applied = String(element.value);
    const expectedFinal = input.expected?.clearFirst === false
      ? `${typeof before.value === "string" ? before.value : ""}${expectedText}`
      : expectedText;
    if (applied === expectedFinal) return { status: "verified", signal: "value_matches" };
    if (expectedText && applied.includes(expectedText)) {
      return {
        status: "uncertain",
        signal: "value_partial_match",
        message: `Element value is ${JSON.stringify(applied)}; only part of the typed text was applied.`,
      };
    }
    return {
      status: "uncertain",
      signal: "value_mismatch",
      message: `Element value is ${JSON.stringify(applied)} instead of the typed text.`,
    };
  }

  if (action === "scroll") {
    const targetBefore = result.targetBefore;
    const targetAfter = result.targetAfter;
    const movedTarget = targetBefore && targetAfter && (targetBefore.scrollTop !== targetAfter.scrollTop || targetBefore.scrollLeft !== targetAfter.scrollLeft);
    const movedContainer = Array.isArray(after.containers) && after.containers.some(({ before: b, after: a }) => b.scrollTop !== a.scrollTop || b.scrollLeft !== a.scrollLeft);
    const moved = movedTarget || movedContainer || before.scrollX !== after.scrollX || before.scrollY !== after.scrollY;
    return moved
      ? { status: "verified", signal: "scroll_changed" }
      : { status: "uncertain", signal: "no_observable_effect", message: "The scroll position did not change." };
  }

  if (before.url && after.url && before.url !== after.url) return { status: "verified", signal: "navigation" };
  if (
    typeof before.textLength === "number" &&
    typeof after.textLength === "number" &&
    before.textLength !== after.textLength
  ) {
    return { status: "verified", signal: "dom_text_changed" };
  }
  if (before.exists === true && after.exists === false) return { status: "verified", signal: "element_removed" };
  if (sensitive) {
    return {
      status: "uncertain",
      signal: "sensitive_action_not_locally_verifiable",
      message: "A cheap local check cannot prove a sensitive action took effect; confirm the result before continuing.",
    };
  }
  return {
    status: "uncertain",
    signal: "no_observable_effect",
    message: "The action ran but no local effect was observed; re-read the page instead of retrying.",
  };
}

/**
 * Success signal for `set_select_value`. Published as a constant because three sides name it — the
 * extension handler, the desktop feature table and the tests.
 */
export const SELECT_VALUE_SET_SIGNAL = "select_value_set";

/**
 * Failure codes reported for `set_select_value`. The set operation re-raises the page-side codes
 * verbatim so a model can tell "no such option" from "several options" without parsing prose.
 * Two of these are synthesized in the worker because no page ever returns them:
 * `SELECT_VALUE_NOT_APPLIED` (the read-back disagrees with the request) and
 * `SELECT_VALUE_UNVERIFIED` (the read-back never came back at all). Everything else can arrive from
 * the page — including `SELECT_GONE`, `STALE_PAGE_REVISION` and `REGION_NOT_FOUND`, which the
 * read-back still returns when it cannot find the select it set.
 */
export const SELECT_VALUE_CODES = Object.freeze({
  NOT_A_SELECT: "NOT_A_SELECT",
  SELECT_DISABLED: "SELECT_DISABLED",
  SELECT_MULTIPLE_UNSUPPORTED: "SELECT_MULTIPLE_UNSUPPORTED",
  OPTION_TARGET_REQUIRED: "OPTION_TARGET_REQUIRED",
  OPTION_NOT_FOUND: "OPTION_NOT_FOUND",
  OPTION_AMBIGUOUS: "OPTION_AMBIGUOUS",
  OPTION_DISABLED: "OPTION_DISABLED",
  SELECT_VALUE_NOT_APPLIED: "SELECT_VALUE_NOT_APPLIED",
  // The read-back itself failed, so nothing can be claimed about the applied option. The page's own
  // reason is preferred when it has one (`SELECT_GONE`, `STALE_PAGE_REVISION`, `REGION_NOT_FOUND`).
  SELECT_VALUE_UNVERIFIED: "SELECT_VALUE_UNVERIFIED",
  // The set itself refused: the marker written before the set and the element the target resolves
  // to are not the same node (the page moved or swapped the control in between), or the selector
  // names no single control because several elements match it.
  SELECT_TARGET_CONFLICT: "SELECT_TARGET_CONFLICT",
  SELECT_TARGET_AMBIGUOUS: "SELECT_TARGET_AMBIGUOUS",
  // Identity is proven by a token-to-node reference kept in the extension's isolated world, never by
  // a DOM attribute: `cloneNode(true)` copies attributes, so an attribute can be inherited by a
  // different control that then reads back the wrong value and looks verified. These three say the
  // proof was unavailable, so the set is refused rather than written to a guess.
  SELECT_TOKEN_UNAVAILABLE: "SELECT_TOKEN_UNAVAILABLE",
  SELECT_TOKEN_REQUIRED: "SELECT_TOKEN_REQUIRED",
  SELECT_TOKEN_FAILED: "SELECT_TOKEN_FAILED",
  // `type` used to write into a native <select> directly, which bypassed option matching, the
  // identity proof and the read-back. It is refused now and points at `set_select_value`.
  TYPE_ON_SELECT_REFUSED: "TYPE_ON_SELECT_REFUSED",
  SELECT_GONE: "SELECT_GONE",
  STALE_PAGE_REVISION: "STALE_PAGE_REVISION",
  REGION_NOT_FOUND: "REGION_NOT_FOUND",
});

/**
 * Verification for `set_select_value`: the only accepted proof is a read-back taken *after* the
 * `input`/`change` events were dispatched. Dispatching an event proves nothing — a framework
 * listener can re-render the select back to its previous option, and then the page state is what the
 * user would see, not what was asked for. So a mismatch is a failure, never a success.
 *
 * The page reports `requested` (the option it matched) and `after` (what the select reads back
 * once the events settled); both value and visible label must agree.
 */
export function verifySelectValueEffect(input = {}) {
  const result = input.result;
  if (!result || typeof result !== "object") {
    return { status: "uncertain", signal: "no_result", message: "The connector returned no observation for this action." };
  }
  if (result.ok === false) {
    return {
      status: "failed",
      signal: typeof result.code === "string" && result.code ? result.code : "SELECT_FAILED",
      message: typeof result.message === "string" && result.message
        ? result.message
        : "The connector could not set the select value.",
    };
  }

  const requested = result.requested && typeof result.requested === "object" ? result.requested : {};
  const after = result.after && typeof result.after === "object" ? result.after : {};
  if (after.value === null || after.value === undefined) {
    // A read-back is the only accepted proof, so an unreadable select is never `verified` — and the
    // caller must not treat it as ok either. `code` carries the page's own reason (`SELECT_GONE`
    // when the select was removed, `NOT_A_SELECT` when it changed type), falling back to
    // SELECT_VALUE_UNVERIFIED when the read itself never came back.
    const sourceCode = typeof after.code === "string" && after.code ? after.code : "";
    return {
      status: "uncertain",
      signal: "select_value_not_readable",
      code: sourceCode || SELECT_VALUE_CODES.SELECT_VALUE_UNVERIFIED,
      message: sourceCode === SELECT_VALUE_CODES.SELECT_GONE
        ? "The select is no longer in the page, so the applied option could not be verified."
        : "The select value cannot be read back, so the applied option could not be verified.",
    };
  }

  const requestedValue = String(requested.value ?? "");
  const appliedValue = String(after.value);
  if (appliedValue !== requestedValue) {
    return {
      status: "failed",
      signal: SELECT_VALUE_CODES.SELECT_VALUE_NOT_APPLIED,
      message: `The change event was dispatched but the select reads back ${JSON.stringify(
        appliedValue,
      )} instead of ${JSON.stringify(requestedValue)}; a page listener rejected or reverted the selection.`,
    };
  }

  const requestedLabel = typeof requested.label === "string" ? requested.label : "";
  const appliedLabel = typeof after.label === "string" ? after.label : "";
  if (requestedLabel && appliedLabel !== requestedLabel) {
    return {
      status: "failed",
      signal: SELECT_VALUE_CODES.SELECT_VALUE_NOT_APPLIED,
      message: `The select value was applied but the selected option reads ${JSON.stringify(
        appliedLabel,
      )} instead of ${JSON.stringify(requestedLabel)}.`,
    };
  }

  return { status: "verified", signal: SELECT_VALUE_SET_SIGNAL };
}

const LOW_VALUE_NETWORK_TYPES = new Set(["image", "media", "font", "stylesheet", "manifest"]);const LOW_VALUE_NETWORK_URL = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|css|woff2?|ttf|otf|eot|map)([?#]|$)/i;

/** Static assets and inline blobs are low signal for debugging; they are filtered by default. */
export function isLowValueNetworkEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  if (LOW_VALUE_NETWORK_TYPES.has(type)) return true;
  const url = typeof entry.url === "string" ? entry.url : "";
  if (!url) return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  return LOW_VALUE_NETWORK_URL.test(url);
}

export function summarizeConsoleEntries(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const limit = clampInteger(options.limit, 1, COMPACT_BUDGET.console.limitMax, COMPACT_BUDGET.console.limitDefault);
  const textMaxChars = clampInteger(
    options.textMaxChars,
    40,
    COMPACT_BUDGET.console.textMaxChars,
    COMPACT_BUDGET.console.textMaxChars,
  );
  const merged = new Map();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const text = truncatePlain(entry.text, textMaxChars);
    const type = typeof entry.type === "string" && entry.type ? entry.type : "log";
    const key = `${type}\u0000${text}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += 1;
      if (!Number.isFinite(existing.timestamp) && Number.isFinite(entry.timestamp)) existing.timestamp = entry.timestamp;
    } else {
      merged.set(key, {
        type,
        text,
        timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : null,
        count: 1,
      });
    }
  }
  const unique = Array.from(merged.values());
  const shaped = unique.slice(-limit).map((entry) =>
    entry.count > 1
      ? { type: entry.type, text: entry.text, count: entry.count, timestamp: entry.timestamp }
      : { type: entry.type, text: entry.text, timestamp: entry.timestamp }
  );
  return {
    entries: shaped,
    total: list.length,
    returned: shaped.length,
    deduped: list.length - unique.length,
    dropped: Math.max(0, unique.length - shaped.length),
  };
}

export function summarizeNetworkEntries(entries = [], options = {}) {
  const all = Array.isArray(entries) ? entries : [];
  const list = options.includeLowValue === true ? all : all.filter((entry) => !isLowValueNetworkEntry(entry));
  const limit = clampInteger(options.limit, 1, COMPACT_BUDGET.network.limitMax, COMPACT_BUDGET.network.limitDefault);
  const urlMaxChars = clampInteger(
    options.urlMaxChars,
    40,
    COMPACT_BUDGET.network.urlMaxChars,
    COMPACT_BUDGET.network.urlMaxChars,
  );
  const merged = new Map();
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const url = truncatePlain(entry.url, urlMaxChars);
    const method = typeof entry.method === "string" && entry.method ? entry.method.toUpperCase() : "GET";
    const key = `${method} ${url}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += 1;
      if (!Number.isFinite(existing.timestamp) && Number.isFinite(entry.timestamp)) existing.timestamp = entry.timestamp;
    } else {
      merged.set(key, {
        method,
        url,
        type: typeof entry.type === "string" && entry.type ? entry.type : null,
        timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : null,
        count: 1,
      });
    }
  }
  const unique = Array.from(merged.values());
  const shaped = unique.slice(-limit).map((entry) => {
    const shapedEntry = { method: entry.method, url: entry.url, timestamp: entry.timestamp };
    if (entry.type) shapedEntry.type = entry.type;
    if (entry.count > 1) shapedEntry.count = entry.count;
    return shapedEntry;
  });
  return {
    entries: shaped,
    total: all.length,
    returned: shaped.length,
    deduped: list.length - unique.length,
    dropped: Math.max(0, unique.length - shaped.length),
    filtered: all.length - list.length,
  };
}

/**
 * Tab lifecycle: connector-opened tab ownership plus the single close guard. These helpers stay
 * pure (no chrome.*, no DOM) so the bookkeeping and the refusal rules are unit-testable.
 */

/** Session storage key holding the ids of the tabs this connector opened itself. */
export const OPENED_TABS_STORAGE_KEY = "noloConnectorOpenedTabs";

/** Hard cap for tracked ownership entries; a long browser session must not grow unbounded. */
export const OPENED_TABS_MAX = 200;

/** Idle window after the last debugger-backed action before the attachment is released. */
export const DETACH_IDLE_MS = 30000;

/** Frozen close_tab failure codes: neither is a retry hint, and each needs different handling. */
export const CLOSE_TAB_CODES = Object.freeze({
  NOT_FOUND: "TAB_NOT_FOUND",
  PINNED: "TAB_PINNED",
});

/** Chrome tab ids arrive as numbers from chrome.tabs and as strings from the native host. */
export function normalizeTabId(tabId) {
  if (typeof tabId === "number") return Number.isFinite(tabId) ? String(tabId) : "";
  if (typeof tabId === "string") return tabId.trim();
  return "";
}

/**
 * Ownership bookkeeping for tabs opened through open_tab. It stays an explicit set instead of a flag
 * on the tab because ownership has to survive service-worker suspension.
 */
export function createOpenedTabSet(initial = []) {
  const ids = new Set();
  const api = {
    add(tabId) {
      const id = normalizeTabId(tabId);
      if (id) ids.add(id);
      return api;
    },
    remove(tabId) {
      ids.delete(normalizeTabId(tabId));
      return api;
    },
    has(tabId) {
      return ids.has(normalizeTabId(tabId));
    },
    get size() {
      return ids.size;
    },
    toArray() {
      return Array.from(ids).slice(-OPENED_TABS_MAX);
    },
    replace(list) {
      ids.clear();
      for (const entry of Array.isArray(list) ? list : []) api.add(entry);
      return api;
    },
  };
  return api.replace(initial);
}

/** Storage-safe projection: deduplicated, non-empty ids, newest entries kept. */
export function serializeOpenedTabs(source) {
  const list = Array.isArray(source)
    ? source
    : typeof source?.toArray === "function"
      ? source.toArray()
      : [];
  const ids = new Set();
  for (const entry of list) {
    const id = normalizeTabId(entry);
    if (id) ids.add(id);
  }
  return Array.from(ids).slice(-OPENED_TABS_MAX);
}

/** Malformed session state is non-fatal: a lost set only means list_tabs marks nothing. */
export function deserializeOpenedTabs(raw) {
  return serializeOpenedTabs(Array.isArray(raw) ? raw : []);
}

/**
 * Single close guard for close_tab: a missing tab can never be closed, and a pinned tab belongs to
 * the user's own layout, so both are refused before any chrome.tabs.remove call.
 */
export function decideCloseTab(input = {}) {
  if (!input.exists) {
    return {
      ok: false,
      code: CLOSE_TAB_CODES.NOT_FOUND,
      message: "No Chrome tab with this id; it may already be closed.",
    };
  }
  if (input.pinned) {
    return {
      ok: false,
      code: CLOSE_TAB_CODES.PINNED,
      message: "This Chrome tab is pinned; ask the user to close or unpin it.",
    };
  }
  return { ok: true };
}
